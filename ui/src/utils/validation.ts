import type { Answers, Question } from "../types";
import type { UiCopy } from "../copy";

export function validateAnswers(
  questions: Question[],
  answers: Answers,
  copy: UiCopy,
): Record<string, string> {
  const errors: Record<string, string> = {};

  for (const question of questions) {
    const answer = answers[question.id];
    if (question.type === "text") {
      const text = answer?.kind === "text" ? answer.text.trim() : "";
      if (question.required && !text) errors[question.id] = copy.answerRequired;
      continue;
    }

    const hasSelection = answer?.kind === "choice" && answer.optionIds.length > 0;
    const hasOther = answer?.kind === "choice" && answer.otherSelected;
    if (question.required && !hasSelection && !hasOther) {
      errors[question.id] = copy.answerRequired;
      continue;
    }
    if (hasOther && answer.kind === "choice" && !answer.otherText.trim()) {
      errors[question.id] = copy.otherRequired;
    }
  }

  return errors;
}
