import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { registerAskUserQuestions } from "./tools/askUserQuestions.js";

export function createQuestionServer(
  widgetHtml: string,
  appOrigin?: string,
): McpServer {
  const server = new McpServer({
    name: "ask-user-question-server",
    version: "0.1.0",
  });

  registerAskUserQuestions(server, widgetHtml, appOrigin);
  return server;
}
