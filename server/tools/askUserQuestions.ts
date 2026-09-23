import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import {
  registerAppResource,
  registerAppTool,
  RESOURCE_MIME_TYPE,
} from "@modelcontextprotocol/ext-apps/server";
import {
  askUserQuestionsInputSchema,
  askUserQuestionsOutputSchema,
  formatQuestionsForText,
  normalizeQuestions,
  type AskUserQuestionsInput,
} from "../schemas/questions.js";

export const QUESTION_RESOURCE_URI = "ui://ask-user-questions/v1.html";

export function createQuestionResult(input: AskUserQuestionsInput) {
  const normalized = normalizeQuestions(input);

  return {
    structuredContent: normalized,
    content: [{ type: "text" as const, text: formatQuestionsForText(normalized) }],
  };
}

export function registerAskUserQuestions(
  server: McpServer,
  widgetHtml: string,
  appOrigin?: string,
): void {
  registerAppResource(
    server,
    "ask-user-questions-ui",
    QUESTION_RESOURCE_URI,
    {},
    async () => ({
      contents: [
        {
          uri: QUESTION_RESOURCE_URI,
          mimeType: RESOURCE_MIME_TYPE,
          text: widgetHtml,
          _meta: {
            ui: {
              prefersBorder: false,
              csp: { connectDomains: [], resourceDomains: [] },
              ...(appOrigin ? { domain: appOrigin } : {}),
            },
          },
        },
      ],
    }),
  );

  registerAppTool(
    server,
    "ask_user_questions",
    {
      title: "Ask user questions",
      description:
        "Ask 1–5 concise clarification questions when unknown goals, scope, constraints, deliverables, or preferences materially affect the user's requested outcome. Reuse known context, do not repeat answered questions, and continue without asking only when all remaining choices are minor and low-cost to change. After this tool succeeds, end the current turn immediately: do not explain, assume answers, continue the task, or call more tools. Wait for the user's next message, whether submitted through the UI or typed in chat.",
      inputSchema: askUserQuestionsInputSchema,
      outputSchema: askUserQuestionsOutputSchema,
      annotations: {
        readOnlyHint: true,
        destructiveHint: false,
        openWorldHint: false,
      },
      _meta: {
        ui: { resourceUri: QUESTION_RESOURCE_URI },
        "openai/outputTemplate": QUESTION_RESOURCE_URI,
        "openai/toolInvocation/invoking": "Preparing questions…",
        "openai/toolInvocation/invoked": "Waiting for your answer",
      },
    },
    async (input: AskUserQuestionsInput) => createQuestionResult(input),
  );
}
