import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { QuestionForm } from "./App";
import { getCopy } from "./copy";
import type { QuestionFormData } from "./types";

const copy = getCopy("en-US");

const singleForm: QuestionFormData = {
  title: "Runtime",
  questions: [
    {
      id: "runtime",
      question: "Which runtime?",
      type: "single_select",
      options: [
        { id: "docker", label: "Docker", description: "Containerized" },
        { id: "native", label: "Native Linux" },
      ],
      required: true,
      allow_other: true,
    },
  ],
};

afterEach(cleanup);

describe("QuestionForm", () => {
  it("blocks an unanswered required question", async () => {
    const sendMessage = vi.fn();
    render(
      <QuestionForm data={singleForm} copy={copy} sendMessage={sendMessage} />,
    );

    await userEvent.click(screen.getByRole("button", { name: "Submit" }));

    expect(screen.getByRole("alert").textContent).toContain(
      "Please answer this question.",
    );
    expect(sendMessage).not.toHaveBeenCalled();
  });

  it("submits all question types with notes and Other", async () => {
    const sendMessage = vi.fn().mockResolvedValue(undefined);
    const data: QuestionFormData = {
      questions: [
        singleForm.questions[0],
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
          allow_other: false,
        },
      ],
    };
    render(<QuestionForm data={data} copy={copy} sendMessage={sendMessage} />);

    await userEvent.click(screen.getByRole("radio", { name: "Docker" }));
    await userEvent.type(
      screen.getByLabelText("Docker — Additional details (optional)"),
      "Use Compose",
    );
    await userEvent.click(screen.getByRole("checkbox", { name: "Web UI" }));
    await userEvent.click(screen.getByRole("checkbox", { name: "Other" }));
    await userEvent.type(
      screen.getByLabelText("Which features? — Other"),
      "Cloudflare Tunnel",
    );
    await userEvent.click(screen.getByRole("radio", { name: "No" }));
    await userEvent.click(screen.getByRole("button", { name: "Submit" }));

    await waitFor(() => expect(sendMessage).toHaveBeenCalledTimes(1));
    expect(sendMessage).toHaveBeenCalledWith(
      [
        "Q: Which runtime?\nA: Docker — Use Compose",
        "Q: Which features?\nA: \n- Web UI\n- Cloudflare Tunnel",
        "Q: Notes?\nA: Unanswered",
        "Q: Proceed?\nA: No",
      ].join("\n\n"),
    );
    expect(screen.getByRole("button", { name: "Submitted" })).toBeTruthy();
  });

  it("keeps drafts on failure and allows a manual retry", async () => {
    const sendMessage = vi
      .fn()
      .mockRejectedValueOnce(new Error("offline"))
      .mockResolvedValueOnce(undefined);
    const data: QuestionFormData = {
      questions: [
        {
          id: "notes",
          question: "Notes?",
          type: "text",
          required: true,
          allow_other: false,
        },
      ],
    };
    render(<QuestionForm data={data} copy={copy} sendMessage={sendMessage} />);

    await userEvent.type(screen.getByRole("textbox", { name: "Notes?" }), "Keep me");
    await userEvent.click(screen.getByRole("button", { name: "Submit" }));

    await screen.findByText(/Could not send your answer/);
    expect(screen.getByText(/Q: Notes\?/).textContent).toContain("Keep me");
    expect(
      (screen.getByRole("textbox", { name: "Notes?" }) as HTMLTextAreaElement)
        .value,
    ).toBe("Keep me");

    await userEvent.click(screen.getByRole("button", { name: "Try again" }));
    await waitFor(() => expect(sendMessage).toHaveBeenCalledTimes(2));
    expect(screen.getByRole("button", { name: "Submitted" })).toBeTruthy();
  });

  it("locks synchronously against duplicate submits", async () => {
    let resolveSend: (() => void) | undefined;
    const sendMessage = vi.fn(
      () =>
        new Promise<void>((resolve) => {
          resolveSend = resolve;
        }),
    );
    render(
      <QuestionForm data={singleForm} copy={copy} sendMessage={sendMessage} />,
    );
    await userEvent.click(screen.getByRole("radio", { name: "Docker" }));
    const submit = screen.getByRole("button", { name: "Submit" });

    submit.click();
    submit.click();
    expect(sendMessage).toHaveBeenCalledTimes(1);

    resolveSend?.();
    await waitFor(() =>
      expect(screen.getByRole("button", { name: "Submitted" })).toBeTruthy(),
    );
  });

  it("retains an option note draft when deselected and reselected", async () => {
    render(
      <QuestionForm
        data={singleForm}
        copy={copy}
        sendMessage={vi.fn().mockResolvedValue(undefined)}
      />,
    );
    await userEvent.click(screen.getByRole("radio", { name: "Docker" }));
    const note = screen.getByLabelText(
      "Docker — Additional details (optional)",
    ) as HTMLInputElement;
    await userEvent.type(note, "draft");
    await userEvent.click(screen.getByRole("radio", { name: "Native Linux" }));
    expect(note.disabled).toBe(true);
    await userEvent.click(screen.getByRole("radio", { name: "Docker" }));
    expect(note.value).toBe("draft");
  });
});
