import { z } from "zod";

export const questionTypeSchema = z.enum([
  "single_select",
  "multi_select",
  "text",
  "confirm",
]);

export const optionSchema = z
  .object({
    id: z.string().trim().min(1, "Option id cannot be empty."),
    label: z.string().trim().min(1, "Option label cannot be empty."),
    description: z.string().trim().min(1).optional(),
  })
  .strict();

const baseQuestionFields = {
  id: z.string().trim().min(1, "Question id cannot be empty."),
  question: z.string().trim().min(1, "Question text cannot be empty."),
  description: z.string().trim().min(1).optional(),
  required: z.boolean().optional().default(true),
  placeholder: z.string().trim().min(1).optional(),
};

const selectionFields = {
  ...baseQuestionFields,
  options: z
    .array(optionSchema)
    .min(2, "Selection questions need at least 2 options.")
    .max(5, "Selection questions support at most 5 options."),
  allow_other: z.boolean().optional().default(true),
};

export const singleSelectQuestionSchema = z
  .object({
    ...selectionFields,
    type: z.literal("single_select"),
  })
  .strict();

export const multiSelectQuestionSchema = z
  .object({
    ...selectionFields,
    type: z.literal("multi_select"),
  })
  .strict();

export const textQuestionSchema = z
  .object({
    ...baseQuestionFields,
    type: z.literal("text"),
    allow_other: z.boolean().optional(),
  })
  .strict()
  .transform((question) => ({ ...question, allow_other: false as const }));

export const confirmQuestionSchema = z
  .object({
    ...baseQuestionFields,
    type: z.literal("confirm"),
    allow_other: z.boolean().optional().default(true),
  })
  .strict();

export const questionSchema = z.discriminatedUnion("type", [
  singleSelectQuestionSchema,
  multiSelectQuestionSchema,
  textQuestionSchema,
  confirmQuestionSchema,
]);

export const askUserQuestionsInputSchema = z
  .object({
    title: z.string().trim().min(1).optional(),
    questions: z
      .array(questionSchema)
      .min(1, "At least one question is required.")
      .max(5, "At most 5 questions are supported."),
  })
  .strict()
  .superRefine((input, context) => {
    const seenQuestionIds = new Set<string>();

    input.questions.forEach((question, questionIndex) => {
      if (seenQuestionIds.has(question.id)) {
        context.addIssue({
          code: "custom",
          message: `Duplicate question id: ${question.id}`,
          path: ["questions", questionIndex, "id"],
        });
      }
      seenQuestionIds.add(question.id);

      if (question.type !== "single_select" && question.type !== "multi_select") {
        return;
      }

      const seenOptionIds = new Set<string>();
      question.options.forEach((option, optionIndex) => {
        if (seenOptionIds.has(option.id)) {
          context.addIssue({
            code: "custom",
            message: `Duplicate option id: ${option.id}`,
            path: ["questions", questionIndex, "options", optionIndex, "id"],
          });
        }
        seenOptionIds.add(option.id);
      });
    });
  });

export type AskUserQuestionsInput = z.input<typeof askUserQuestionsInputSchema>;
export type NormalizedAskUserQuestions = z.output<
  typeof askUserQuestionsInputSchema
>;
export type NormalizedQuestion = NormalizedAskUserQuestions["questions"][number];

const normalizedBaseQuestionFields = {
  id: z.string(),
  question: z.string(),
  description: z.string().optional(),
  required: z.boolean(),
  placeholder: z.string().optional(),
};

export const askUserQuestionsOutputSchema = z.object({
  title: z.string().optional(),
  questions: z.array(
    z.discriminatedUnion("type", [
      z.object({
        ...normalizedBaseQuestionFields,
        type: z.literal("single_select"),
        options: z.array(optionSchema),
        allow_other: z.boolean(),
      }),
      z.object({
        ...normalizedBaseQuestionFields,
        type: z.literal("multi_select"),
        options: z.array(optionSchema),
        allow_other: z.boolean(),
      }),
      z.object({
        ...normalizedBaseQuestionFields,
        type: z.literal("text"),
        allow_other: z.literal(false),
      }),
      z.object({
        ...normalizedBaseQuestionFields,
        type: z.literal("confirm"),
        allow_other: z.boolean(),
      }),
    ]),
  ),
});

export function normalizeQuestions(
  input: AskUserQuestionsInput,
): NormalizedAskUserQuestions {
  return askUserQuestionsInputSchema.parse(input);
}

function formatQuestionForText(
  question: NormalizedQuestion,
  index: number,
): string[] {
  const heading = `${index + 1}. ${question.question}`;
  const description = question.description ? [`   ${question.description}`] : [];

  if (question.type === "text") {
    return [heading, ...description, `   [${question.placeholder ?? "Type your answer..."}]`];
  }

  const options =
    question.type === "confirm"
      ? ["   - Yes", "   - No"]
      : question.options.map(
          (option) =>
            `   - ${option.label}${option.description ? `: ${option.description}` : ""}`,
        );
  if (question.allow_other) options.push("   - Other (type your answer)");
  return [heading, ...description, ...options];
}

export function formatQuestionsForText(
  input: NormalizedAskUserQuestions,
): string {
  const lines = input.questions.flatMap(formatQuestionForText);

  return [
    input.title ?? "Please answer the following questions",
    "",
    ...lines,
    "",
    "Wait for the user's answer before continuing.",
  ].join("\n");
}
