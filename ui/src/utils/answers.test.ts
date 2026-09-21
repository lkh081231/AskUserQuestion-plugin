import { describe, expect, it } from "vitest";
import { getCopy } from "../copy";
import type { Answers, QuestionFormData } from "../types";
import {
  createInitialAnswers,
  formatAnswerMessage,
  formatQuestionAnswer,
} from "./answers";

const copy = getCopy("en-US");
const form: QuestionFormData = {
  questions: [
    {
      id: "runtime",
      question: "Which runtime?",
      type: "single_select",
      options: [
        { id: "docker", label: "Docker", description: "Model-only hint" },
        { id: "native", label: "Native Linux" },
      ],
      required: true,
      allow_other: true,
    },
    {
      id: "features",
      question: "Which features?",
      type: "multi_select",
      options: [
        { id: "web", label: "Web UI" },
        { id: "auth", label: "Authentication" },
      ],
      required: true,
      allow_other: true,
    },
    {
      id: "notes",
      question: "Notes?",
      type: "text",
      required: false,
      allow_other: false,
    },
    {
      id: "proceed",
      question: "Proceed?",
      type: "confirm",
      required: true,
      allow_other: true,
    },
  ],
};

describe("answer formatting", () => {
  it("formats option notes without including model descriptions", () => {
    const question = form.questions[0];
    const answer = {
      kind: "choice" as const,
      optionIds: ["docker"],
      optionNotes: { docker: "  Use Compose  " },
      otherSelected: false,
      otherText: "",
    };
    expect(formatQuestionAnswer(question, answer, copy)).toBe(
      "Docker — Use Compose",
    );
    expect(formatQuestionAnswer(question, answer, copy)).not.toContain(
      "Model-only hint",
    );
  });

  it("formats multi-select choices and Other as bullets", () => {
    const question = form.questions[1];
    expect(
      formatQuestionAnswer(
        question,
        {
          kind: "choice",
          optionIds: ["web", "auth"],
          optionNotes: { web: "Dark mode" },
          otherSelected: true,
          otherText: " Cloudflare Tunnel ",
        },
        copy,
      ),
    ).toBe(
      "\n- Web UI — Dark mode\n- Authentication\n- Cloudflare Tunnel",
    );
  });

  it("localizes optional unanswered values and confirmation labels", () => {
    const answers = createInitialAnswers(form.questions);
    const chinese = getCopy("zh-CN");
    expect(formatQuestionAnswer(form.questions[2], answers.notes, chinese)).toBe(
      "未回答",
    );
    expect(
      formatQuestionAnswer(
        form.questions[3],
        {
          kind: "choice",
          optionIds: ["no"],
          optionNotes: {},
          otherSelected: false,
          otherText: "",
        },
        chinese,
      ),
    ).toBe("否");
  });

  it("creates readable Q/A text without protocol identifiers", () => {
    const answers: Answers = createInitialAnswers(form.questions);
    answers.runtime = {
      kind: "choice",
      optionIds: [],
      optionNotes: {},
      otherSelected: true,
      otherText: " Podman ",
    };
    const message = formatAnswerMessage(form, answers, copy);
    expect(message).toContain("Q: Which runtime?\nA: Podman");
    expect(message).not.toContain("runtime:");
  });
});
