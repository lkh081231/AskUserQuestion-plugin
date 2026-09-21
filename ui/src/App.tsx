import { useCallback, useEffect, useRef, useState } from "react";
import { useApp } from "@modelcontextprotocol/ext-apps/react";
import { Button } from "@openai/apps-sdk-ui/components/Button";
import { QuestionCard } from "./components/QuestionCard";
import { getCopy, type UiCopy } from "./copy";
import type { Answer, QuestionFormData } from "./types";
import {
  createInitialAnswers,
  formatAnswerMessage,
} from "./utils/answers";
import { validateAnswers } from "./utils/validation";

type SubmitStatus = "editing" | "submitting" | "submitted" | "error";

type AppInstance = Parameters<
  NonNullable<Parameters<typeof useApp>[0]["onAppCreated"]>
>[0];

interface QuestionFormProps {
  data: QuestionFormData;
  copy: UiCopy;
  sendMessage: (message: string) => Promise<void>;
}

function normalizeToolData(candidate: QuestionFormData): QuestionFormData {
  return {
    ...candidate,
    questions: candidate.questions.map((question) => ({
      ...question,
      required: question.required ?? true,
      allow_other:
        question.type === "text" ? false : (question.allow_other ?? true),
    })),
  } as QuestionFormData;
}

export function QuestionForm({ data, copy, sendMessage }: QuestionFormProps) {
  const [answers, setAnswers] = useState(() =>
    createInitialAnswers(data.questions),
  );
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [status, setStatus] = useState<SubmitStatus>("editing");
  const [fallbackMessage, setFallbackMessage] = useState("");
  const submittingRef = useRef(false);

  if (data.questions.length === 0) {
    return <p role="status">{copy.noQuestions}</p>;
  }

  const updateAnswer = (questionId: string, answer: Answer) => {
    setAnswers((current) => ({ ...current, [questionId]: answer }));
    setErrors((current) => {
      if (!current[questionId]) return current;
      const next = { ...current };
      delete next[questionId];
      return next;
    });
    if (status === "error") setStatus("editing");
  };

  const submit = async () => {
    if (submittingRef.current || status === "submitted") return;
    const nextErrors = validateAnswers(data.questions, answers, copy);
    setErrors(nextErrors);
    if (Object.keys(nextErrors).length > 0) return;

    const message = formatAnswerMessage(data, answers, copy);
    submittingRef.current = true;
    setStatus("submitting");
    setFallbackMessage("");
    try {
      await sendMessage(message);
      setStatus("submitted");
    } catch {
      setFallbackMessage(message);
      setStatus("error");
      submittingRef.current = false;
    }
  };

  const disabled = status === "submitting" || status === "submitted";
  const buttonLabel =
    status === "submitting"
      ? copy.submitting
      : status === "submitted"
        ? copy.submitted
        : status === "error"
          ? copy.retry
          : copy.submit;

  return (
    <main className="question-app">
      {data.title ? <h1>{data.title}</h1> : null}
      {data.questions.map((question) => (
        <QuestionCard
          key={question.id}
          question={question}
          answer={answers[question.id]}
          copy={copy}
          disabled={disabled}
          error={errors[question.id]}
          onChange={(answer) => updateAnswer(question.id, answer)}
        />
      ))}

      <Button
        type="button"
        color="primary"
        block
        disabled={disabled}
        onClick={() => void submit()}
      >
        {buttonLabel}
      </Button>

      {status === "error" ? (
        <section className="send-error" role="alert">
          <p>{copy.sendFailed}</p>
          <pre tabIndex={0}>{fallbackMessage}</pre>
        </section>
      ) : null}
    </main>
  );
}

export function AskUserQuestionsApp() {
  const [data, setData] = useState<QuestionFormData | null>(null);
  const [locale, setLocale] = useState<string>();

  const onAppCreated = useCallback((app: AppInstance) => {
    const updateData = (candidate: unknown) => {
      const value = candidate as QuestionFormData | undefined;
      if (value?.questions) setData(normalizeToolData(value));
    };

    app.ontoolinput = (input) => updateData(input.arguments);
    app.ontoolresult = (result) => updateData(result.structuredContent);
    app.onhostcontextchanged = (context) => {
      if (context.locale) setLocale(context.locale);
    };
  }, []);

  const { app, isConnected, error } = useApp({
    appInfo: { name: "ask-user-questions-ui", version: "0.1.0" },
    capabilities: {},
    onAppCreated,
    autoResize: true,
  });

  useEffect(() => {
    if (isConnected && app) setLocale(app.getHostContext()?.locale);
  }, [app, isConnected]);

  const copy = getCopy(locale);
  if (error) return <p role="alert">{copy.connectionFailed}</p>;
  if (!isConnected || !app || !data) {
    return <p role="status">{copy.loading}</p>;
  }

  const formKey = data.questions.map((question) => question.id).join("\u0000");
  return (
    <QuestionForm
      key={formKey}
      data={data}
      copy={copy}
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
