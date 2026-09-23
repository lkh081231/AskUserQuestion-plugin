import { test } from "node:test";
import assert from "node:assert/strict";
import { parseCounts, filterEvents, compareCounts } from "./diagnose-clients.mjs";

const metric = (method, count, latency = 'enqueue_to_response') => `command_end_to_end_latency_milliseconds_count{request_method="${method}",tunnel_service_status="200",latency_type="${latency}",tunnel_id="private-id"} ${count}`;
const time = "2026-09-23T16:04:17.286788946Z";
const snapshot = (count, started = "2026-09-22T06:48:01Z") => ({ schemaVersion: 1, capturedAt: "2026-09-23T16:06:00Z", tunnelStartedAt: started, counts: [{ method: 'tools/call', status: '200', count }] });

test('counts exclude duplicate latency buckets and unknown labels', () => {
  assert.deepEqual(parseCounts([metric('tools/call', 4), metric('tools/call', 4, 'poll_to_response'), metric('secret-data', 100)].join('\n')), [{ method: 'tools/call', status: '200', count: 4 }]);
  assert.equal(parseCounts('unrecognized response'), null);
});
test('events retain only diagnostic fields, never payloads or free-form messages', () => {
  const logs = { events: [
    { time, message: 'dispatcher forwarded command to MCP server', attrs: { request_id: 'cmd_123', cmd_request_id: 'ad6149a3-e990-450f-9d01-b74cb6daa362/test', rpc_request_id: 0, Authorization: 'Bearer secret', body: { answer: 'private' } } },
    { time, message: 'secret raw response', attrs: { failure_source: 'target_http', request_id: 'Bearer secret' } },
    { time: '2026-09-23T15:00:00Z', message: 'dispatcher forwarded command to MCP server' },
    { time, message: 'private answer content' },
  ] };
  const events = JSON.parse(JSON.stringify(filterEvents(logs, '2026-09-23T16:00:00Z', '2026-09-23T16:05:00Z')));
  assert.deepEqual(events, [
    { time, kind: 'forwarded', requestId: 'cmd_123', commandRequestId: 'ad6149a3-e990-450f-9d01-b74cb6daa362/test', rpcRequestId: 0 },
    { time, kind: 'target_http_failure' },
  ]);
});
test('comparison accepts same-process increments and rejects restart/reset', () => {
  assert.deepEqual(compareCounts(snapshot(7), snapshot(6)), { state: 'comparable', counts: [{ method: 'tools/call', status: '200', count: 1 }] });
  assert.equal(compareCounts(snapshot(7), snapshot(6, '2026-09-21T00:00:00Z')).state, 'process-changed');
  assert.equal(compareCounts(snapshot(5), snapshot(6)).state, 'counter-reset-or-missing');
});
test('incomplete and malformed baselines cannot report valid zero deltas', () => {
  assert.equal(compareCounts(snapshot(7), null).state, 'no-baseline');
  assert.equal(compareCounts(snapshot(7), { ...snapshot(6), counts: null }).state, 'unavailable');
  assert.equal(compareCounts(snapshot(7), { ...snapshot(6), counts: [{method:'secret',status:'200',count:6}] }).state, 'invalid-baseline');
  assert.equal(compareCounts(snapshot(7), { ...snapshot(6), capturedAt: '2026-09-24T00:00:00Z' }).state, 'invalid-baseline');
  assert.equal(compareCounts({...snapshot(7),counts:[]},snapshot(6)).state,'counter-reset-or-missing');
});
