import type { UiCopy } from "../copy";
import type {
  Answer,
  ChoiceAnswer,
  Question,
  TextAnswer,
} from "../types";
import { getQuestionOptions } from "../utils/answers";

interface QuestionCardProps {
  question: Question;
  answer: Answer;
  copy: UiCopy;
  disabled: boolean;
  error?: string;
  onChange: (answer: Answer) => void;
}

function TextQuestionControl({
  question,
  answer,
  copy,
  onChange,
}: Omit<QuestionCardProps, "disabled" | "error">) {
  const textAnswer: TextAnswer =
    answer.kind === "text" ? answer : { kind: "text", text: "" };
  return (
    <textarea
      className="text-answer"
      aria-label={question.question}
      value={textAnswer.text}
      placeholder={question.placeholder ?? copy.textPlaceholder}
      rows={3}
      onChange={(event) =>
        onChange({ ...textAnswer, text: event.target.value })
      }
    />
  );
}

function ChoiceQuestionControl({
  question,
  answer,
  copy,
  onChange,
}: Omit<QuestionCardProps, "disabled" | "error">) {
  if (question.type === "text") return null;
  const choice: ChoiceAnswer =
    answer.kind === "choice"
      ? answer
      : {
          kind: "choice",
          optionIds: [],
          optionNotes: {},
          otherSelected: false,
          otherText: "",
        };
  const multiple = question.type === "multi_select";
  const options = getQuestionOptions(question, copy);

  const selectOption = (optionId: string, checked: boolean) => {
    const optionIds = multiple
      ? checked
        ? [...new Set([...choice.optionIds, optionId])]
        : choice.optionIds.filter((id) => id !== optionId)
      : [optionId];
    onChange({
      ...choice,
      optionIds,
      otherSelected: multiple ? choice.otherSelected : false,
    });
  };

  const selectOther = (checked: boolean) => {
    onChange({
      ...choice,
      optionIds: multiple ? choice.optionIds : [],
      otherSelected: checked,
    });
  };

  return (
    <div className="options">
      {options.map((option) => {
        const selected = choice.optionIds.includes(option.id);
        return (
          <div className="option" data-selected={selected || undefined} key={option.id}>
            <label className="option-choice">
              <input
                type={multiple ? "checkbox" : "radio"}
                name={question.id}
                checked={selected}
                onChange={(event) => selectOption(option.id, event.target.checked)}
              />
              <strong>{option.label}</strong>
            </label>
            {option.description ? <small>{option.description}</small> : null}
            <input
              className="note-input"
              aria-label={`${option.label} — ${copy.notePlaceholder}`}
              disabled={!selected}
              value={choice.optionNotes[option.id] ?? ""}
              placeholder={copy.notePlaceholder}
              onChange={(event) =>
                onChange({
                  ...choice,
                  optionNotes: {
                    ...choice.optionNotes,
                    [option.id]: event.target.value,
                  },
                })
              }
            />
          </div>
        );
      })}
      {question.allow_other ? (
        <div className="option" data-selected={choice.otherSelected || undefined}>
          <label className="option-choice">
            <input
              type={multiple ? "checkbox" : "radio"}
              name={question.id}
              checked={choice.otherSelected}
              onChange={(event) => selectOther(event.target.checked)}
            />
            <strong>{copy.other}</strong>
          </label>
          {choice.otherSelected ? (
            <input
              className="other-input"
              aria-label={`${question.question} — ${copy.other}`}
              autoFocus
              value={choice.otherText}
              placeholder={question.placeholder ?? copy.otherPlaceholder}
              onChange={(event) =>
                onChange({ ...choice, otherText: event.target.value })
              }
            />
          ) : null}
        </div>
      ) : null}
    </div>
  );
}

export function QuestionCard({
  question,
  answer,
  copy,
  disabled,
  error,
  onChange,
}: QuestionCardProps) {
  const errorId = `${question.id}-error`;

  return (
    <fieldset disabled={disabled} aria-describedby={error ? errorId : undefined}>
      <legend>
        {question.question}
        {question.required ? <span aria-label="required"> *</span> : null}
      </legend>
      {question.description ? (
        <p className="question-description">{question.description}</p>
      ) : null}
      {question.type === "text" ? (
        <TextQuestionControl
          question={question}
          answer={answer}
          copy={copy}
          onChange={onChange}
        />
      ) : (
        <ChoiceQuestionControl
          question={question}
          answer={answer}
          copy={copy}
          onChange={onChange}
        />
      )}
      {error ? (
        <p className="error" id={errorId} role="alert">
          {error}
        </p>
      ) : null}
    </fieldset>
  );
}
