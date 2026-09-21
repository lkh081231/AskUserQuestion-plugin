import { describe, expect, it } from "vitest";
import {
  formatQuestionsForText,
  normalizeQuestions,
} from "./questions.js";

const options = [
  { id: "docker", label: "Docker" },
  { id: "native", label: "Native Linux", description: "No container" },
];

const singleQuestion = {
  id: "target",
  question: "Where should this run?",
  type: "single_select" as const,
  options,
};

describe("normalizeQuestions", () => {
  it("normalizes all four question types and defaults", () => {
    const result = normalizeQuestions({
      title: "Setup",
      questions: [
        singleQuestion,
        {
          id: "features",
          question: "Which features?",
          type: "multi_select",
          options,
        },
        {
          id: "notes",
          question: "Anything else?",
          type: "text",
          allow_other: true,
        },
        {
          id: "proceed",
          question: "Proceed?",
          type: "confirm",
        },
      ],
    });

    expect(result.questions).toMatchObject([
      { required: true, allow_other: true },
      { required: true, allow_other: true },
      { required: true, allow_other: false },
      { required: true, allow_other: true },
    ]);
  });

  it("preserves explicit false values", () => {
    const result = normalizeQuestions({
      questions: [
        { ...singleQuestion, required: false, allow_other: false },
      ],
    });
    expect(result.questions[0]).toMatchObject({
      required: false,
      allow_other: false,
    });
  });

  it("trims identifiers and visible strings", () => {
    const result = normalizeQuestions({
      title: "  Setup  ",
      questions: [
        {
          ...singleQuestion,
          id: " target ",
          question: " Where? ",
          options: [
            { id: " a ", label: " A " },
            { id: " b ", label: " B " },
          ],
        },
      ],
    });
    expect(result).toMatchObject({
      title: "Setup",
      questions: [
        {
          id: "target",
          question: "Where?",
          options: [
            { id: "a", label: "A" },
            { id: "b", label: "B" },
          ],
        },
      ],
    });
  });

  it("rejects duplicate question ids", () => {
    expect(() =>
      normalizeQuestions({
        questions: [
          singleQuestion,
          { id: "target", question: "Again?", type: "text" },
        ],
      }),
    ).toThrow(/Duplicate question id/);
  });

  it("rejects duplicate option ids", () => {
    expect(() =>
      normalizeQuestions({
        questions: [
          {
            ...singleQuestion,
            options: [
              { id: "same", label: "One" },
              { id: "same", label: "Two" },
            ],
          },
        ],
      }),
    ).toThrow(/Duplicate option id/);
  });

  it("rejects zero or more than five questions", () => {
    expect(() => normalizeQuestions({ questions: [] })).toThrow(
      /At least one question/,
    );
    expect(() =>
      normalizeQuestions({
        questions: Array.from({ length: 6 }, (_, index) => ({
          id: `q-${index}`,
          question: "Question?",
          type: "text" as const,
        })),
      }),
    ).toThrow(/At most 5 questions/);
  });

  it("rejects invalid option counts", () => {
    expect(() =>
      normalizeQuestions({
        questions: [{ ...singleQuestion, options: [] }],
      }),
    ).toThrow(/at least 2 options/);
    expect(() =>
      normalizeQuestions({
        questions: [
          {
            ...singleQuestion,
            options: Array.from({ length: 6 }, (_, index) => ({
              id: `o-${index}`,
              label: `Option ${index}`,
            })),
          },
        ],
      }),
    ).toThrow(/at most 5 options/);
  });

  it("rejects options on text and confirm questions", () => {
    expect(() =>
      normalizeQuestions({
        questions: [
          {
            id: "text",
            question: "Text?",
            type: "text",
            options,
          } as never,
        ],
      }),
    ).toThrow();
    expect(() =>
      normalizeQuestions({
        questions: [
          {
            id: "confirm",
            question: "Confirm?",
            type: "confirm",
            options,
          } as never,
        ],
      }),
    ).toThrow();
  });
});

describe("formatQuestionsForText", () => {
  it("renders UI-independent prompts for every type", () => {
    const text = formatQuestionsForText(
      normalizeQuestions({
        title: "Questions",
        questions: [
          singleQuestion,
          {
            id: "features",
            question: "Which features?",
            type: "multi_select",
            options,
            allow_other: false,
          },
          {
            id: "notes",
            question: "Notes?",
            type: "text",
            placeholder: "Add notes",
          },
          { id: "confirm", question: "Proceed?", type: "confirm" },
        ],
      }),
    );

    expect(text).toContain("Native Linux: No container");
    expect(text).toContain("[Add notes]");
    expect(text).toContain("- Yes");
    expect(text).toContain("- No");
    expect(text.match(/Other \(type your answer\)/g)).toHaveLength(2);
    expect(text).toContain("Wait for the user's answer before continuing.");
  });
});
