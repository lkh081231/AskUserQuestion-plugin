import { z } from "zod";

export const optionSchema = z.object({
  id: z.string().trim().min(1, "Option id cannot be empty."),
  label: z.string().trim().min(1, "Option label cannot be empty."),
  description: z.string().trim().min(1).optional(),
});

const singleSelectQuestionSchema = z.object({
  id: z.string().trim().min(1, "Question id cannot be empty."),
  question: z.string().trim().min(1, "Question text cannot be empty."),
  description: z.string().trim().min(1).optional(),
  type: z.literal("single_select"),
  options: z
    .array(optionSchema)
    .min(2, "Single-select questions need at least 2 options.")
    .max(5, "Single-select questions support at most 5 options."),
  required: z.boolean().optional().default(true),
  allow_other: z.boolean().optional().default(true),
  placeholder: z.string().trim().min(1).optional(),
});

export const askUserQuestionsInputSchema = z
  .object({
    title: z.string().trim().min(1).optional(),
    questions: z
      .array(singleSelectQuestionSchema)
      .length(1, "The initial version accepts exactly one question."),
  })
  .superRefine((input, context) => {
    const question = input.questions[0];
    if (!question) return;

    const seenOptionIds = new Set<string>();
    question.options.forEach((option, index) => {
      if (seenOptionIds.has(option.id)) {
        context.addIssue({
          code: "custom",
          message: `Duplicate option id: ${option.id}`,
          path: ["questions", 0, "options", index, "id"],
        });
      }
      seenOptionIds.add(option.id);
    });
  });

export type AskUserQuestionsInput = z.input<typeof askUserQuestionsInputSchema>;
export type NormalizedAskUserQuestions = z.output<
  typeof askUserQuestionsInputSchema
>;

export const askUserQuestionsOutputSchema = z.object({
  title: z.string().optional(),
  questions: z.array(
    z.object({
      id: z.string(),
      question: z.string(),
      description: z.string().optional(),
      type: z.literal("single_select"),
      options: z.array(optionSchema),
      required: z.boolean(),
      allow_other: z.boolean(),
      placeholder: z.string().optional(),
    }),
  ),
});

export function normalizeQuestions(
  input: AskUserQuestionsInput,
): NormalizedAskUserQuestions {
  return askUserQuestionsInputSchema.parse(input);
}

export function formatQuestionsForText(
  input: NormalizedAskUserQuestions,
): string {
  const lines = input.questions.flatMap((question, index) => {
    const options = question.options.map(
      (option) =>
        `   - ${option.label}${option.description ? `: ${option.description}` : ""}`,
    );
    if (question.allow_other) options.push("   - Other (type your answer)");
    return [
      `${index + 1}. ${question.question}`,
      ...(question.description ? [`   ${question.description}`] : []),
      ...options,
    ];
  });

  return [
    input.title ?? "Please answer the following question",
    "",
    ...lines,
    "",
    "Wait for the user's answer before continuing.",
  ].join("\n");
}
