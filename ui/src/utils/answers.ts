import type {
  Answer,
  Answers,
  ChoiceAnswer,
  Option,
  Question,
  QuestionFormData,
} from "../types";
import type { UiCopy } from "../copy";

export function createEmptyAnswer(question: Question): Answer {
  if (question.type === "text") return { kind: "text", text: "" };
  return {
    kind: "choice",
    optionIds: [],
    optionNotes: {},
    otherSelected: false,
    otherText: "",
  };
}

export function createInitialAnswers(questions: Question[]): Answers {
  return Object.fromEntries(
    questions.map((question) => [question.id, createEmptyAnswer(question)]),
  );
}

export function getQuestionOptions(question: Question, copy: UiCopy): Option[] {
  if (question.type === "single_select" || question.type === "multi_select") {
    return question.options;
  }
  if (question.type === "confirm") {
    return [
      { id: "yes", label: copy.yes },
      { id: "no", label: copy.no },
    ];
  }
  return [];
}

export function formatChoiceItem(option: Option, answer: ChoiceAnswer): string {
  const note = answer.optionNotes[option.id]?.trim();
  return note ? `${option.label} — ${note}` : option.label;
}

export function formatQuestionAnswer(
  question: Question,
  answer: Answer,
  copy: UiCopy,
): string {
  if (question.type === "text") {
    return answer.kind === "text" && answer.text.trim()
      ? answer.text.trim()
      : copy.unanswered;
  }

  if (answer.kind !== "choice") return copy.unanswered;
  const optionMap = new Map(
    getQuestionOptions(question, copy).map((option) => [option.id, option]),
  );
  const items = answer.optionIds.flatMap((optionId) => {
    const option = optionMap.get(optionId);
    return option ? [formatChoiceItem(option, answer)] : [];
  });
  if (answer.otherSelected && answer.otherText.trim()) {
    items.push(answer.otherText.trim());
  }
  if (items.length === 0) return copy.unanswered;
  if (question.type === "multi_select") {
    return `\n${items.map((item) => `- ${item}`).join("\n")}`;
  }
  return items[0] ?? copy.unanswered;
}

export function formatAnswerMessage(
  form: QuestionFormData,
  answers: Answers,
  copy: UiCopy,
): string {
  return form.questions
    .map((question) => {
      const answer = answers[question.id] ?? createEmptyAnswer(question);
      return `Q: ${question.question}\nA: ${formatQuestionAnswer(question, answer, copy)}`;
    })
    .join("\n\n");
}
