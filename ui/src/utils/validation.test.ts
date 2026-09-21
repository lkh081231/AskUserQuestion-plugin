import { describe, expect, it } from "vitest";
import { getCopy } from "../copy";
import type { Question } from "../types";
import { createInitialAnswers } from "./answers";
import { validateAnswers } from "./validation";

const copy = getCopy("en-US");
const questions: Question[] = [
  {
    id: "single",
    question: "Single?",
    type: "single_select",
    options: [
      { id: "a", label: "A" },
      { id: "b", label: "B" },
    ],
    required: true,
    allow_other: true,
  },
  {
    id: "multi",
    question: "Multi?",
    type: "multi_select",
    options: [
      { id: "a", label: "A" },
      { id: "b", label: "B" },
    ],
    required: true,
    allow_other: true,
  },
  {
    id: "text",
    question: "Text?",
    type: "text",
    required: true,
    allow_other: false,
  },
  {
    id: "confirm",
    question: "Confirm?",
    type: "confirm",
    required: true,
    allow_other: true,
  },
];

describe("validateAnswers", () => {
  it("rejects every unanswered required question", () => {
    const errors = validateAnswers(
      questions,
      createInitialAnswers(questions),
      copy,
    );
    expect(Object.keys(errors)).toEqual(["single", "multi", "text", "confirm"]);
  });

  it("rejects selected Other with whitespace only, even when optional", () => {
    const optional = [{ ...questions[0], required: false }] as Question[];
    const answers = createInitialAnswers(optional);
    answers.single = {
      kind: "choice",
      optionIds: [],
      optionNotes: {},
      otherSelected: true,
      otherText: "   ",
    };
    expect(validateAnswers(optional, answers, copy)).toEqual({
      single: copy.otherRequired,
    });
  });

  it("accepts No and ignores notes on unselected options", () => {
    const confirm = [questions[3]];
    const answers = createInitialAnswers(confirm);
    answers.confirm = {
      kind: "choice",
      optionIds: ["no"],
      optionNotes: { yes: "draft" },
      otherSelected: false,
      otherText: "draft",
    };
    expect(validateAnswers(confirm, answers, copy)).toEqual({});
  });
});
