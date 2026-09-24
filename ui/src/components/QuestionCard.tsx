import type { RefObject } from "react";
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
  titleId: string;
  ref?: RefObject<HTMLFieldSetElement | null>;
  onChange: (answer: Answer) => void;
}

function TextQuestionControl({
  question,
  answer,
  copy,
  disabled,
  onChange,
}: Pick<
  QuestionCardProps,
  "question" | "answer" | "copy" | "disabled" | "onChange"
>) {
  const textAnswer: TextAnswer =
    answer.kind === "text" ? answer : { kind: "text", text: "" };
  return (
    <textarea
      className="text-answer"
      data-focus-control="answer"
      disabled={disabled}
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
  disabled,
  onChange,
}: Pick<
  QuestionCardProps,
  "question" | "answer" | "copy" | "disabled" | "onChange"
>) {
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
      {options.map((option, index) => {
        const selected = choice.optionIds.includes(option.id);
        return (
          <div
            className="option"
            data-selected={selected || undefined}
            key={option.id}
          >
            <label className="option-choice">
              <input
                className="choice-input"
                data-focus-control="choice"
                disabled={disabled}
                type={multiple ? "checkbox" : "radio"}
                name={question.id}
                checked={selected}
                onChange={(event) =>
                  selectOption(option.id, event.target.checked)
                }
              />
              <span className="option-number" aria-hidden="true">
                {index + 1}
              </span>
              <span className="option-label">{option.label}</span>
              <span className="option-tick" aria-hidden="true">
                ✓
              </span>
            </label>
            {option.description ? (
              <p className="option-description">{option.description}</p>
            ) : null}
            {selected ? (
              <textarea
                className="note-input"
                disabled={disabled}
                aria-label={`${option.label} — ${copy.notePlaceholder}`}
                value={choice.optionNotes[option.id] ?? ""}
                placeholder={copy.notePlaceholder}
                rows={2}
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
            ) : null}
          </div>
        );
      })}
      {question.allow_other ? (
        <div
          className="option option-other"
          data-selected={choice.otherSelected || undefined}
        >
          <label className="option-choice">
            <input
              className="choice-input"
              data-focus-control="choice"
              disabled={disabled}
              type={multiple ? "checkbox" : "radio"}
              name={question.id}
              checked={choice.otherSelected}
              onChange={(event) => selectOther(event.target.checked)}
            />
            <span className="option-number" aria-hidden="true">
              +
            </span>
            <span className="option-label">{copy.other}</span>
            <span className="option-tick" aria-hidden="true">
              ✓
            </span>
          </label>
          {choice.otherSelected ? (
            <textarea
              className="other-input"
              data-focus-control="other"
              disabled={disabled}
              aria-label={`${question.question} — ${copy.other}`}
              value={choice.otherText}
              placeholder={question.placeholder ?? copy.otherPlaceholder}
              rows={2}
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
  titleId,
  ref,
  onChange,
}: QuestionCardProps) {
  const descriptionId = `${question.id}-description`;
  const errorId = `${question.id}-error`;
  const describedBy = [
    question.description ? descriptionId : null,
    error ? errorId : null,
  ]
    .filter(Boolean)
    .join(" ");

  return (
    <fieldset
      ref={ref}
      disabled={disabled}
      aria-labelledby={titleId}
      aria-describedby={describedBy || undefined}
    >
      <legend className="sr-only">{question.question}</legend>
      {question.description ? (
        <p className="question-description" id={descriptionId}>
          {question.description}
        </p>
      ) : null}
      {question.type === "text" ? (
        <TextQuestionControl
          question={question}
          answer={answer}
          copy={copy}
          disabled={disabled}
          onChange={onChange}
        />
      ) : (
        <ChoiceQuestionControl
          question={question}
          answer={answer}
          copy={copy}
          disabled={disabled}
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
