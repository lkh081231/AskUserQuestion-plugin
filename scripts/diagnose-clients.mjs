import { readFile } from "node:fs/promises";
import { pathToFileURL } from "node:url";

const methods = new Set([
  "initialize", "tools/list", "tools/call", "resources/list", "resources/read",
  "notifications/initialized", "server/discover",
]);
const safeId = (value) => typeof value === "string" && value.length <= 160 &&
  /^(?:cmd_[a-zA-Z0-9_]+|req_[a-zA-Z0-9_-]+|[a-f0-9]{8}(?:-[a-f0-9]{4}){3}-[a-f0-9]{12})(?:\/[a-zA-Z0-9_-]{1,32})?$/.test(value)
  ? value : undefined;
const safeTime = (value) => typeof value === "string" && /^\d{4}-\d{2}-\d{2}T[\d:.]+(?:Z|[+-]\d{2}:\d{2})$/.test(value) && Number.isFinite(Date.parse(value)) ? value : null;

export function parseCounts(metrics) {
  if (typeof metrics !== "string") return null;
  const counts = new Map();
  for (const line of metrics.split("\n")) {
    if (!line.startsWith("command_end_to_end_latency_milliseconds_count{")) continue;
    const labels = Object.fromEntries([...line.matchAll(/(\w+)="([^"\n]*)"/g)].map((match) => [match[1], match[2]]));
    if (labels.latency_type !== "enqueue_to_response") continue;
    const method = labels.request_method;
    const status = labels.tunnel_service_status;
    const count = Number(line.slice(line.lastIndexOf(" ") + 1));
    if (!methods.has(method) || !/^\d{3}$/.test(status ?? "") || !Number.isSafeInteger(count) || count < 0) continue;
    const key = `${method} ${status}`;
    const entry = counts.get(key) ?? { method, status, count: 0 };
    entry.count += count;
    counts.set(key, entry);
  }
  return counts.size ? [...counts.values()].sort((a, b) => `${a.method} ${a.status}`.localeCompare(`${b.method} ${b.status}`)) : null;
}

export function filterEvents(logs, since, until) {
  const entries = Array.isArray(logs?.events) ? logs.events : [];
  return entries.flatMap((event) => {
    const time = safeTime(event?.time);
    if (!time || Date.parse(time) < Date.parse(since) || Date.parse(time) > Date.parse(until)) return [];
    const attrs = event.attrs ?? {};
    const kind = event.message === "dispatcher forwarded command to MCP server" ? "forwarded"
      : attrs.failure_source === "target_http" ? "target_http_failure" : null;
    if (!kind) return [];
    return [{ time, kind, requestId: safeId(attrs.request_id), commandRequestId: safeId(attrs.cmd_request_id),
      ...(typeof attrs.rpc_request_id === "number" && Number.isSafeInteger(attrs.rpc_request_id) ? { rpcRequestId: attrs.rpc_request_id } : {}),
    }];
  });
}

export function compareCounts(current, baseline) {
  if (!baseline) return { state: "no-baseline" };
  if (baseline.schemaVersion !== 1 || !safeTime(baseline.capturedAt) || Date.parse(baseline.capturedAt) > Date.parse(current.capturedAt)) return { state: "invalid-baseline" };
  if (!current.tunnelStartedAt || !baseline.tunnelStartedAt || !current.counts || !Array.isArray(baseline.counts)) return { state: "unavailable" };
  if (current.tunnelStartedAt !== baseline.tunnelStartedAt) return { state: "process-changed" };
  const previous = new Map();
  for (const row of baseline.counts) {
    if (!methods.has(row?.method) || !/^\d{3}$/.test(row.status ?? "") || !Number.isSafeInteger(row.count) || row.count < 0) return { state: "invalid-baseline" };
    const key = `${row.method} ${row.status}`;
    if (previous.has(key)) return { state: "invalid-baseline" };
    previous.set(key, row.count);
  }
  const deltas = current.counts.map((row) => {
    const key = `${row.method} ${row.status}`;
    const delta = row.count - (previous.get(key) ?? 0);
    previous.delete(key);
    return { method: row.method, status: row.status, count: delta };
  });
  if (previous.size || deltas.some((row) => row.count < 0)) return { state: "counter-reset-or-missing" };
  return { state: "comparable", counts: deltas };
}

async function readEndpoint(path, json = false) {
  try {
    const response = await fetch(`http://127.0.0.1:8081${path}`, { signal: AbortSignal.timeout(5000), redirect: "error" });
    if (!response.ok) return { ok: false, status: response.status };
    return { ok: true, status: response.status, value: json ? await response.json() : await response.text() };
  } catch { return { ok: false, status: null }; }
}

async function main() {
  const args = process.argv.slice(2);
  if (args.length === 1 && args[0] === "--help") {
    console.log('Usage: npm run diagnose:clients -- --since <ISO timestamp with timezone> [--baseline <snapshot.json>]\nFor JSON redirection use npm run --silent diagnose:clients -- ...');
    return;
  }
  const options = {};
  for (let i = 0; i < args.length; i += 2) {
    if (!["--since", "--baseline"].includes(args[i]) || !args[i + 1] || options[args[i]]) throw new Error("Invalid arguments; use --help.");
    options[args[i]] = args[i + 1];
  }
  const since = safeTime(options["--since"]);
  if (!since || Date.parse(since) > Date.now()) throw new Error("--since must be a past ISO timestamp with timezone.");
  let baseline;
  if (options["--baseline"]) {
    try { baseline = JSON.parse(await readFile(options["--baseline"], "utf8")); }
    catch { throw new Error("Cannot read baseline JSON."); }
    if (!baseline || typeof baseline !== "object" || Array.isArray(baseline)) throw new Error("Invalid baseline JSON object.");
  }
  const samplingStartedAt = new Date().toISOString();
  const [status, health, ready, metrics, logs] = await Promise.all([
    readEndpoint("/api/status", true), readEndpoint("/healthz"), readEndpoint("/readyz"),
    readEndpoint("/metrics"), readEndpoint("/api/logs?limit=2000", true),
  ]);
  if (health.ok && health.value.trim() !== "live") health.ok = false;
  if (ready.ok && ready.value.trim() !== "ready") ready.ok = false;
  if (logs.ok && !Array.isArray(logs.value?.events)) logs.ok = false;
  const capturedAt = new Date().toISOString();
  const entries = Array.isArray(logs.value?.events) ? logs.value.events : [];
  const times = entries.map((event) => safeTime(event?.time)).filter(Boolean).sort((a,b) => Date.parse(a)-Date.parse(b));
  const snapshot = {
    schemaVersion: 1, samplingStartedAt, capturedAt, since,
    tunnelStartedAt: safeTime(status.value?.started_at),
    endpoints: Object.fromEntries(Object.entries({ status, health, ready, metrics, logs }).map(([key, result]) => [key, { ok: result.ok, httpStatus: result.status }])),
    counts: parseCounts(metrics.value),
    logWindow: { availableEntries: entries.length, requestedLimit: 2000, oldestAvailableEventAt: times[0] ?? null },
    events: filterEvents(logs.value, since, capturedAt),
  };
  console.log(JSON.stringify({ ...snapshot, comparison: compareCounts(snapshot, baseline),
    limitations: ["Counts have no client labels; HTTP 200 does not establish tool isError=false.", "Snapshots are not atomic; requests may complete while sampling.", "Local log retention is bounded; no matching event is not proof of no upstream request."],
  }, null, 2));
  if (![status, health, ready, metrics, logs].every((result) => result.ok) || !snapshot.counts || !snapshot.tunnelStartedAt) process.exitCode = 1;
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  main().catch((error) => { console.error(error.message); process.exitCode = 1; });
}
