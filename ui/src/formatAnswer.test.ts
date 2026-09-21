import { describe, expect, it } from "vitest";
import { formatAnswerMessage, formatSingleSelectAnswer } from "./formatAnswer";
import type { SingleSelectQuestion } from "./types";

const question: SingleSelectQuestion = {
  id: "runtime",
  question: "Which runtime?",
  type: "single_select",
  options: [
    { id: "docker", label: "Docker" },
    { id: "native", label: "Native Linux" },
  ],
  required: true,
  allow_other: true,
};

describe("formatSingleSelectAnswer", () => {
  it("formats a selected option", () => {
    expect(
      formatSingleSelectAnswer(question, {
        optionId: "docker",
        otherSelected: false,
        otherText: "",
      }),
    ).toBe("Docker");
  });

  it("formats trimmed Other text without a prefix", () => {
    expect(
      formatSingleSelectAnswer(question, {
        otherSelected: true,
        otherText: "  Podman  ",
      }),
    ).toBe("Podman");
  });
});

describe("formatAnswerMessage", () => {
  it("uses readable Q/A text", () => {
    const message = formatAnswerMessage(
      { questions: [question] },
      {
        runtime: {
          optionId: "docker",
          otherSelected: false,
          otherText: "",
        },
      },
    );
    expect(message).toBe("Q: Which runtime?\nA: Docker");
  });
});
