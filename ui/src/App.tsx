import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type FormEvent,
  type KeyboardEvent as ReactKeyboardEvent,
} from "react";
import { useApp } from "@modelcontextprotocol/ext-apps/react";
import { Button } from "@openai/apps-sdk-ui/components/Button";
import { QuestionCard } from "./components/QuestionCard";
import { getCopy, type UiCopy } from "./copy";
import type { Answer, Answers, Question, QuestionFormData } from "./types";
import {
  createEmptyAnswer,
  createInitialAnswers,
  formatAnswerMessage,
  formatQuestionAnswer,
} from "./utils/answers";
import { validateAnswers } from "./utils/validation";

type SubmitStatus = "editing" | "submitting" | "submitted" | "error";
type FocusControl = "first" | "answer" | "choice" | "other";

interface FocusRequest {
  control: FocusControl;
  nonce: number;
}

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

function getErrorControl(question: Question, answer: Answer): FocusControl {
  if (question.type === "text") return "answer";
  if (
    answer.kind === "choice" &&
    answer.otherSelected &&
    !answer.otherText.trim()
  ) {
    return "other";
  }
  return "choice";
}

export function QuestionForm({ data, copy, sendMessage }: QuestionFormProps) {
  const [answers, setAnswers] = useState<Answers>(() =>
    createInitialAnswers(data.questions),
  );
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [status, setStatus] = useState<SubmitStatus>("editing");
  const [pageIndex, setPageIndex] = useState(0);
  const [focusRequest, setFocusRequest] = useState<FocusRequest | null>(null);
  const submittingRef = useRef(false);
  const retryRequestedRef = useRef(false);
  const compositionActiveRef = useRef(false);
  const lastCompositionEndRef = useRef(0);
  const focusNonceRef = useRef(0);
  const questionCardRef = useRef<HTMLFieldSetElement>(null);

  const questionCount = data.questions.length;
  const safePageIndex = Math.min(pageIndex, Math.max(questionCount - 1, 0));
  const currentQuestion = data.questions[safePageIndex];
  const multiple = questionCount > 1;
  const isLastQuestion = safePageIndex === questionCount - 1;

  useEffect(() => {
    if (!focusRequest || !questionCardRef.current) return;
    const root = questionCardRef.current;
    const control =
      focusRequest.control === "first"
        ? (root.querySelector<HTMLElement>(
            "[data-focus-control='choice']:checked",
          ) ??
          root.querySelector<HTMLElement>(
            "[data-focus-control='answer'], [data-focus-control='choice']",
          ))
        : root.querySelector<HTMLElement>(
            `[data-focus-control='${focusRequest.control}']`,
          );
    control?.focus();
    setFocusRequest(null);
  }, [focusRequest]);

  if (!currentQuestion) {
    return <p role="status">{copy.noQuestions}</p>;
  }

  const requestFocus = (control: FocusControl) => {
    focusNonceRef.current += 1;
    setFocusRequest({ control, nonce: focusNonceRef.current });
  };

  const updateAnswer = (questionId: string, answer: Answer) => {
    setAnswers((current) => ({ ...current, [questionId]: answer }));
    setErrors((current) => {
      if (!current[questionId]) return current;
      const next = { ...current };
      delete next[questionId];
      return next;
    });
  };

  const showPreviousQuestion = () => {
    if (status === "submitting" || safePageIndex === 0) return;
    setPageIndex(safePageIndex - 1);
    requestFocus("first");
  };

  const validateCurrentQuestion = () => {
    const nextErrors = validateAnswers([currentQuestion], answers, copy);
    setErrors(nextErrors);
    const error = nextErrors[currentQuestion.id];
    if (error) {
      requestFocus(
        getErrorControl(
          currentQuestion,
          answers[currentQuestion.id] ?? createEmptyAnswer(currentQuestion),
        ),
      );
      return false;
    }
    return true;
  };

  const sendAnswers = async () => {
    if (
      submittingRef.current ||
      status === "submitting" ||
      status === "submitted"
    ) {
      return;
    }

    const nextErrors = validateAnswers(data.questions, answers, copy);
    setErrors(nextErrors);
    const firstInvalidIndex = data.questions.findIndex(
      (question) => nextErrors[question.id],
    );
    if (firstInvalidIndex !== -1) {
      const firstInvalidQuestion = data.questions[firstInvalidIndex];
      setPageIndex(firstInvalidIndex);
      requestFocus(
        getErrorControl(
          firstInvalidQuestion,
          answers[firstInvalidQuestion.id] ??
            createEmptyAnswer(firstInvalidQuestion),
        ),
      );
      return;
    }

    const message = formatAnswerMessage(data, answers, copy);
    submittingRef.current = true;
    setStatus("submitting");
    try {
      await sendMessage(message);
      setStatus("submitted");
    } catch {
      submittingRef.current = false;
      setStatus("error");
    }
  };

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (status === "submitting" || status === "submitted") return;

    if (retryRequestedRef.current) {
      retryRequestedRef.current = false;
      void sendAnswers();
      return;
    }

    if (!isLastQuestion) {
      if (!validateCurrentQuestion()) return;
      setPageIndex(safePageIndex + 1);
      requestFocus("first");
      return;
    }

    void sendAnswers();
  };

  const handleKeyDown = (event: ReactKeyboardEvent<HTMLFormElement>) => {
    if (event.key !== "Enter" || event.shiftKey) return;
    if ((event.target as HTMLElement).tagName !== "TEXTAREA") return;

    const nativeEvent = event.nativeEvent;
    const composing =
      nativeEvent.isComposing ||
      event.keyCode === 229 ||
      nativeEvent.keyCode === 229 ||
      compositionActiveRef.current ||
      Date.now() - lastCompositionEndRef.current < 350;
    if (composing) return;

    event.preventDefault();
    event.currentTarget.requestSubmit();
  };

  const disabled = status === "submitting";
  const primaryLabel =
    status === "submitting"
      ? copy.submitting
      : isLastQuestion
        ? multiple
          ? copy.submitAll
          : copy.submit
        : copy.next;

  return (
    <main className="question-app">
      {status !== "submitted" ? (
        <form
          className="question-card"
          aria-label={data.title ?? copy.formLabel}
          onSubmit={handleSubmit}
          onKeyDown={handleKeyDown}
          onCompositionStart={() => {
            compositionActiveRef.current = true;
          }}
          onCompositionEnd={() => {
            compositionActiveRef.current = false;
            lastCompositionEndRef.current = Date.now();
          }}
        >
          {data.title ? (
            <p className="question-set-title">{data.title}</p>
          ) : null}
          <header className="question-header">
            <h1 id={`question-${currentQuestion.id}-title`}>
              {currentQuestion.question}
              {currentQuestion.required ? (
                <>
                  <span aria-hidden="true"> *</span>
                  <span className="sr-only">{copy.required}</span>
                </>
              ) : null}
            </h1>
            {multiple ? (
              <nav className="pager" aria-label={copy.pagination}>
                <button
                  className="pager-button"
                  type="button"
                  aria-label={copy.previousQuestion}
                  disabled={disabled || safePageIndex === 0}
                  onClick={showPreviousQuestion}
                >
                  <span aria-hidden="true">←</span>
                </button>
                <span className="page-count" aria-live="polite">
                  {safePageIndex + 1} / {questionCount}
                </span>
                <button
                  className="pager-button"
                  type="submit"
                  aria-label={copy.nextQuestion}
                  disabled={disabled || isLastQuestion}
                >
                  <span aria-hidden="true">→</span>
                </button>
              </nav>
            ) : null}
          </header>

          <div className="question-content">
            <QuestionCard
              ref={questionCardRef}
              question={currentQuestion}
              answer={answers[currentQuestion.id]}
              copy={copy}
              disabled={disabled}
              error={errors[currentQuestion.id]}
              titleId={`question-${currentQuestion.id}-title`}
              onChange={(answer) => updateAnswer(currentQuestion.id, answer)}
            />
          </div>

          <footer className="form-footer">
            <span className="keyboard-hint">{copy.keyboardHint}</span>
            <Button type="submit" color="primary" disabled={disabled}>
              {primaryLabel}
            </Button>
          </footer>

          {status === "error" ? (
            <section className="send-error" role="alert">
              <p>{copy.sendFailed}</p>
              <pre tabIndex={0} aria-label={copy.copyableAnswers}>
                {formatAnswerMessage(data, answers, copy)}
              </pre>
              <Button
                type="submit"
                color="secondary"
                disabled={disabled}
                onClick={() => {
                  retryRequestedRef.current = true;
                }}
              >
                {copy.retry}
              </Button>
            </section>
          ) : null}
        </form>
      ) : null}

      {status === "submitted" ? (
        <section className="answer-summary" aria-label={copy.summaryLabel}>
          {data.questions.map((question) => (
            <article className="answer-pair" key={question.id}>
              <p className="summary-question">{question.question}</p>
              <p className="summary-answer">
                {formatQuestionAnswer(
                  question,
                  answers[question.id] ?? createEmptyAnswer(question),
                  copy,
                )}
              </p>
            </article>
          ))}
        </section>
      ) : null}
    </main>
  );
}

export function AskUserQuestionsApp() {
  const [data, setData] = useState<QuestionFormData | null>(null);
  const [locale, setLocale] = useState<string>();
  const [toolFailure, setToolFailure] = useState<"failed" | "cancelled" | null>(
    null,
  );

  const onAppCreated = useCallback((app: AppInstance) => {
    let terminated = false;
    const stop = (reason: "failed" | "cancelled") => {
      terminated = true;
      setData(null);
      setToolFailure(reason);
    };
    const updateData = (candidate: unknown) => {
      if (terminated) return;
      const value = candidate as QuestionFormData | undefined;
      if (value?.questions) setData(normalizeToolData(value));
    };

    app.ontoolinput = (input) => updateData(input.arguments);
    app.ontoolresult = (result) => {
      if (terminated) return;
      if (result.isError) stop("failed");
      else updateData(result.structuredContent);
    };
    app.ontoolcancelled = () => {
      if (!terminated) stop("cancelled");
    };
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
  if (toolFailure) {
    return (
      <p role="alert">
        {toolFailure === "failed" ? copy.toolFailed : copy.toolCancelled}
      </p>
    );
  }
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
