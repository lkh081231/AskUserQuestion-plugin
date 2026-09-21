import { describe, expect, it } from "vitest";
import {
  formatQuestionsForText,
  normalizeQuestions,
} from "./questions.js";

const validInput = {
  title: "Deployment",
  questions: [
    {
      id: "target",
      question: "Where should this run?",
      type: "single_select" as const,
      options: [
        { id: "docker", label: "Docker" },
        { id: "native", label: "Native Linux", description: "No container" },
      ],
    },
  ],
};

describe("normalizeQuestions", () => {
  it("applies required and allow_other defaults", () => {
    const result = normalizeQuestions(validInput);
    expect(result.questions[0]).toMatchObject({
      required: true,
      allow_other: true,
    });
  });

  it("preserves explicit false values", () => {
    const result = normalizeQuestions({
      questions: [
        {
          ...validInput.questions[0],
          required: false,
          allow_other: false,
        },
      ],
    });
    expect(result.questions[0]).toMatchObject({
      required: false,
      allow_other: false,
    });
  });

  it("rejects duplicate option ids", () => {
    expect(() =>
      normalizeQuestions({
        questions: [
          {
            ...validInput.questions[0],
            options: [
              { id: "same", label: "One" },
              { id: "same", label: "Two" },
            ],
          },
        ],
      }),
    ).toThrow(/Duplicate option id/);
  });

  it("rejects invalid option counts", () => {
    expect(() =>
      normalizeQuestions({
        questions: [{ ...validInput.questions[0], options: [] }],
      }),
    ).toThrow(/at least 2 options/);
  });
});

describe("formatQuestionsForText", () => {
  it("includes options, descriptions, Other, and wait guidance", () => {
    const text = formatQuestionsForText(normalizeQuestions(validInput));
    expect(text).toContain("1. Where should this run?");
    expect(text).toContain("Native Linux: No container");
    expect(text).toContain("Other (type your answer)");
    expect(text).toContain("Wait for the user's answer before continuing.");
  });
});
