import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import { once } from "node:events";
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StreamableHTTPClientTransport } from "@modelcontextprotocol/sdk/client/streamableHttp.js";

const port = 19000 + Math.floor(Math.random() * 1000);
const origin = `http://127.0.0.1:${port}`;
const endpoint = new URL("/mcp", origin);
const server = spawn(process.execPath, ["dist/server/index.js"], {
  env: { ...process.env, PORT: String(port) },
  stdio: ["ignore", "pipe", "pipe"],
});

let serverOutput = "";
server.stdout.setEncoding("utf8");
server.stderr.setEncoding("utf8");
server.stdout.on("data", (chunk) => {
  serverOutput += chunk;
});
server.stderr.on("data", (chunk) => {
  serverOutput += chunk;
});

const checks = [];
const pass = (name) => {
  checks.push(name);
  console.log(`✓ ${name}`);
};

async function waitForHealth() {
  const deadline = Date.now() + 10_000;
  while (Date.now() < deadline) {
    if (server.exitCode !== null) {
      throw new Error(`MCP server exited early (${server.exitCode}).\n${serverOutput}`);
    }

    try {
      const response = await fetch(origin);
      if (response.ok) return response;
    } catch {
      // The process can take a moment to begin listening after it is spawned.
    }

    await new Promise((resolve) => setTimeout(resolve, 50));
  }

  throw new Error(`Timed out waiting for ${origin}.\n${serverOutput}`);
}

async function stopServer() {
  if (server.exitCode !== null) return;
  server.kill("SIGTERM");
  await Promise.race([
    once(server, "exit"),
    new Promise((resolve) => setTimeout(resolve, 2_000)),
  ]);
  if (server.exitCode === null) server.kill("SIGKILL");
}

const client = new Client({
  name: "ask-user-question-local-acceptance",
  version: "0.1.0",
});
const transport = new StreamableHTTPClientTransport(endpoint);

try {
  const healthResponse = await waitForHealth();
  assert.equal(await healthResponse.text(), "Ask User Question MCP server");
  pass("GET / health endpoint");

  const optionsResponse = await fetch(endpoint, { method: "OPTIONS" });
  assert.equal(optionsResponse.status, 204);
  assert.match(optionsResponse.headers.get("access-control-allow-methods") ?? "", /POST/);
  assert.match(optionsResponse.headers.get("access-control-allow-headers") ?? "", /mcp-session-id/i);
  pass("OPTIONS /mcp CORS preflight");

  await client.connect(transport);
  assert.deepEqual(client.getServerVersion(), {
    name: "ask-user-question-server",
    version: "0.1.0",
  });
  pass("MCP initialize");

  const listedTools = await client.listTools();
  assert.equal(listedTools.tools.length, 1);
  const tool = listedTools.tools[0];
  assert.equal(tool.name, "ask_user_questions");
  assert.equal(tool.annotations?.readOnlyHint, true);
  assert.equal(tool.annotations?.destructiveHint, false);
  assert.equal(tool.annotations?.openWorldHint, false);
  assert.equal(tool._meta?.ui?.resourceUri, "ui://ask-user-questions/v1.html");
  assert.equal(tool.inputSchema.type, "object");
  assert.equal(tool.outputSchema?.type, "object");
  pass("tools/list metadata, schemas, annotations, and UI binding");

  const result = await client.callTool({
    name: "ask_user_questions",
    arguments: {
      title: "Local MCP acceptance",
      questions: [
        {
          id: "deployment",
          question: "Where should this run?",
          type: "single_select",
          options: [
            { id: "docker", label: "Docker" },
            { id: "native", label: "Native Linux" },
          ],
        },
        {
          id: "features",
          question: "Which features are required?",
          type: "multi_select",
          required: false,
          allow_other: false,
          options: [
            { id: "ui", label: "UI", description: "Interactive card" },
            { id: "fallback", label: "Text fallback" },
          ],
        },
        {
          id: "notes",
          question: "Anything else?",
          type: "text",
          placeholder: "Optional details",
        },
        {
          id: "confirm",
          question: "Proceed?",
          type: "confirm",
        },
      ],
    },
  });
  assert.equal(result.isError, undefined);
  assert.equal(result.structuredContent?.questions?.length, 4);
  assert.equal(result.structuredContent.questions[0].allow_other, true);
  assert.equal(result.structuredContent.questions[0].required, true);
  assert.equal(result.structuredContent.questions[1].allow_other, false);
  assert.equal(result.structuredContent.questions[1].required, false);
  assert.equal(result.structuredContent.questions[2].allow_other, false);
  assert.equal(result.structuredContent.questions[3].allow_other, true);
  assert.match(result.content[0]?.text ?? "", /Wait for the user's answer before continuing\./);
  pass("tools/call four question types, defaults, structured output, and text fallback");

  const invalidResult = await client.callTool({
    name: "ask_user_questions",
    arguments: {
      questions: [
        { id: "duplicate", question: "First?", type: "text" },
        { id: "duplicate", question: "Second?", type: "text" },
      ],
    },
  });
  assert.equal(invalidResult.isError, true);
  assert.match(invalidResult.content[0]?.text ?? "", /Duplicate question id: duplicate/);
  pass("tools/call rejects invalid duplicate question IDs");

  const resources = await client.listResources();
  assert.equal(resources.resources.length, 1);
  assert.equal(resources.resources[0].uri, "ui://ask-user-questions/v1.html");
  assert.equal(resources.resources[0].mimeType, "text/html;profile=mcp-app");
  const resource = await client.readResource({
    uri: "ui://ask-user-questions/v1.html",
  });
  assert.equal(resource.contents.length, 1);
  assert.equal(resource.contents[0].mimeType, "text/html;profile=mcp-app");
  assert.match(resource.contents[0].text ?? "", /<html/i);
  assert.equal(resource.contents[0]._meta?.ui?.domain, undefined);
  pass("resources/list and resources/read return the local MCP App HTML");

  console.log(`\nLocal MCP acceptance passed: ${checks.length} checks at ${endpoint}`);
} finally {
  await transport.close().catch(() => {});
  await stopServer();
}
