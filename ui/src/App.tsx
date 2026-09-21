import { useCallback, useState } from "react";
import { useApp } from "@modelcontextprotocol/ext-apps/react";
import { Button } from "@openai/apps-sdk-ui/components/Button";
import { formatAnswerMessage } from "./formatAnswer";
import type { QuestionFormData, SingleSelectAnswer } from "./types";

type SubmitStatus = "editing" | "submitting" | "submitted" | "error";

const emptyAnswer: SingleSelectAnswer = {
  otherSelected: false,
  otherText: "",
};

interface QuestionFormProps {
  data: QuestionFormData;
  sendMessage: (message: string) => Promise<void>;
}

export function QuestionForm({ data, sendMessage }: QuestionFormProps) {
  const [answers, setAnswers] = useState<Record<string, SingleSelectAnswer>>({});
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [status, setStatus] = useState<SubmitStatus>("editing");
  const [fallbackMessage, setFallbackMessage] = useState("");

  const question = data.questions[0];
  // Tool input may arrive after the iframe initializes on approval-gated hosts.
  if (!question) return <p role="status">No question was provided.</p>;
  const answer = answers[question.id] ?? emptyAnswer;

  const updateAnswer = (next: SingleSelectAnswer) => {
    setAnswers((current) => ({ ...current, [question.id]: next }));
    setErrors((current) => ({ ...current, [question.id]: "" }));
    if (status === "error") setStatus("editing");
  };

  const chooseOption = (optionId: string) => {
    updateAnswer({ ...answer, optionId, otherSelected: false });
  };

  const chooseOther = () => {
    updateAnswer({ ...answer, optionId: undefined, otherSelected: true });
  };

  const validate = (): boolean => {
    if (question.required && !answer.optionId && !answer.otherSelected) {
      setErrors({ [question.id]: "Please answer this question." });
      return false;
    }
    if (answer.otherSelected && !answer.otherText.trim()) {
      setErrors({ [question.id]: "Please type your answer." });
      return false;
    }
    setErrors({});
    return true;
  };

  const submit = async () => {
    if (status === "submitting" || status === "submitted" || !validate()) return;
    const message = formatAnswerMessage(data, {
      ...answers,
      [question.id]: answer,
    });
    setStatus("submitting");
    setFallbackMessage("");
    try {
      await sendMessage(message);
      setStatus("submitted");
    } catch {
      setFallbackMessage(message);
      setStatus("error");
    }
  };

  const disabled = status === "submitting" || status === "submitted";

  return (
    <main className="question-app">
      {data.title ? <h1>{data.title}</h1> : null}
      <fieldset disabled={disabled} aria-describedby={`${question.id}-error`}>
        <legend>
          {question.question}
          {question.required ? <span aria-label="required"> *</span> : null}
        </legend>
        {question.description ? (
          <p className="question-description">{question.description}</p>
        ) : null}
        <div className="options">
          {question.options.map((option) => (
            <label className="option" key={option.id}>
              <span>
                <input
                  type="radio"
                  name={question.id}
                  checked={!answer.otherSelected && answer.optionId === option.id}
                  onChange={() => chooseOption(option.id)}
                />
                <strong>{option.label}</strong>
              </span>
              {option.description ? <small>{option.description}</small> : null}
            </label>
          ))}
          {question.allow_other ? (
            <label className="option">
              <span>
                <input
                  type="radio"
                  name={question.id}
                  checked={answer.otherSelected}
                  onChange={chooseOther}
                />
                <strong>Other</strong>
              </span>
              {answer.otherSelected ? (
                <input
                  className="other-input"
                  aria-label="Other answer"
                  autoFocus
                  value={answer.otherText}
                  placeholder={question.placeholder ?? "Type your answer..."}
                  onChange={(event) =>
                    updateAnswer({ ...answer, otherText: event.target.value })
                  }
                />
              ) : null}
            </label>
          ) : null}
        </div>
        {errors[question.id] ? (
          <p className="error" id={`${question.id}-error`} role="alert">
            {errors[question.id]}
          </p>
        ) : null}
      </fieldset>

      <Button
        color="primary"
        block
        disabled={disabled}
        onClick={() => void submit()}
      >
        {status === "submitting"
          ? "Submitting…"
          : status === "submitted"
            ? "Submitted"
            : status === "error"
              ? "Try again"
              : "Submit"}
      </Button>

      {status === "error" ? (
        <section className="send-error" role="alert">
          <p>Could not send your answer. Try again or copy this text into chat:</p>
          <pre tabIndex={0}>{fallbackMessage}</pre>
        </section>
      ) : null}
    </main>
  );
}

export function AskUserQuestionsApp() {
  const [data, setData] = useState<QuestionFormData | null>(null);

  const onAppCreated = useCallback(
    (app: Parameters<
      NonNullable<Parameters<typeof useApp>[0]["onAppCreated"]>
    >[0]) => {
      app.ontoolinput = (input) => {
        const candidate = input.arguments as QuestionFormData | undefined;
        if (candidate?.questions) setData(candidate);
      };
      app.ontoolresult = (result) => {
        const candidate = result.structuredContent as QuestionFormData | undefined;
        if (candidate?.questions) setData(candidate);
      };
    },
    [],
  );

  const { app, isConnected, error } = useApp({
    appInfo: { name: "ask-user-questions-ui", version: "0.1.0" },
    capabilities: {},
    onAppCreated,
    autoResize: true,
  });

  if (error) return <p role="alert">Unable to connect to the chat host.</p>;
  if (!isConnected || !app || !data) {
    return <p role="status">Loading questions…</p>;
  }

  return (
    <QuestionForm
      data={data}
      sendMessage={async (message) => {
        const result = await app.sendMessage({
          role: "user",
          content: [{ type: "text", text: message }],
        });
        if (result.isError) throw new Error("The host rejected the message.");
      }}
    />
  );
}
