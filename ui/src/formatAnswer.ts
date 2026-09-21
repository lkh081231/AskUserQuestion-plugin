import type {
  QuestionFormData,
  SingleSelectAnswer,
  SingleSelectQuestion,
} from "./types";

export function formatSingleSelectAnswer(
  question: SingleSelectQuestion,
  answer: SingleSelectAnswer,
): string {
  if (answer.otherSelected) return answer.otherText.trim();
  const option = question.options.find((item) => item.id === answer.optionId);
  return option?.label ?? "Unanswered";
}

export function formatAnswerMessage(
  form: QuestionFormData,
  answers: Record<string, SingleSelectAnswer>,
): string {
  return form.questions
    .map((question) => {
      const answer = answers[question.id] ?? {
        otherSelected: false,
        otherText: "",
      };
      return `Q: ${question.question}\nA: ${formatSingleSelectAnswer(question, answer)}`;
    })
    .join("\n\n");
}
