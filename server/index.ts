import { readFile } from "node:fs/promises";
import { createServer } from "node:http";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { StreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/streamableHttp.js";
import { createQuestionServer } from "./app.js";
import { normalizeAppOrigin, normalizeListenHost } from "./config.js";

const currentDirectory = dirname(fileURLToPath(import.meta.url));
const widgetPath = resolve(currentDirectory, "../ui/index.html");
const widgetHtml = await readFile(widgetPath, "utf8");
const port = Number(process.env.PORT ?? 8787);
const host = normalizeListenHost(process.env.MCP_LISTEN_HOST);
const appOrigin = normalizeAppOrigin(process.env.APP_ORIGIN);
const mcpPath = "/mcp";

const httpServer = createServer(async (request, response) => {
  if (!request.url) {
    response.writeHead(400).end("Missing URL");
    return;
  }

  const url = new URL(
    request.url,
    `http://${request.headers.host ?? "localhost"}`,
  );

  if (request.method === "OPTIONS" && url.pathname === mcpPath) {
    response.writeHead(204, {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "POST, GET, DELETE, OPTIONS",
      "Access-Control-Allow-Headers": "content-type, mcp-session-id",
      "Access-Control-Expose-Headers": "Mcp-Session-Id",
    });
    response.end();
    return;
  }

  if (request.method === "GET" && url.pathname === "/") {
    response
      .writeHead(200, { "content-type": "text/plain; charset=utf-8" })
      .end("Ask User Question MCP server");
    return;
  }

  const mcpMethods = new Set(["POST", "GET", "DELETE"]);
  if (
    url.pathname === mcpPath &&
    request.method &&
    mcpMethods.has(request.method)
  ) {
    response.setHeader("Access-Control-Allow-Origin", "*");
    response.setHeader("Access-Control-Expose-Headers", "Mcp-Session-Id");

    const server = createQuestionServer(widgetHtml, appOrigin);
    const transport = new StreamableHTTPServerTransport({
      sessionIdGenerator: undefined,
      enableJsonResponse: true,
    });

    response.on("close", () => {
      void transport.close();
      void server.close();
    });

    try {
      await server.connect(transport);
      await transport.handleRequest(request, response);
    } catch (error) {
      console.error("Error handling MCP request:", error);
      if (!response.headersSent) {
        response.writeHead(500).end("Internal server error");
      }
    }
    return;
  }

  response.writeHead(404).end("Not Found");
});

httpServer.listen(port, host, () => {
  console.log(
    `Ask User Question MCP server listening on http://${host}:${port}${mcpPath}`,
  );
});
