import {
  act,
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
  within,
} from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";
import { QuestionForm } from "./App";
import { getCopy } from "./copy";
import type { QuestionFormData } from "./types";
import { formatAnswerMessage } from "./utils/answers";

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

const multiForm: QuestionFormData = {
  title: "Project questions",
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
      placeholder: "Add constraints...",
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

const expectedMultiMessage = [
  "Q: Which runtime?\nA: Docker — Use Compose",
  "Q: Which features?\nA: \n- Web UI\n- Cloudflare Tunnel",
  "Q: Notes?\nA: Before Friday",
  "Q: Proceed?\nA: No",
].join("\n\n");

afterEach(cleanup);

describe("QuestionForm", () => {
  it("selects through the full option row and keeps details outside the label", async () => {
    const user = userEvent.setup();
    render(
      <QuestionForm
        data={singleForm}
        copy={copy}
        sendMessage={vi.fn().mockResolvedValue(undefined)}
      />,
    );

    const radio = screen.getByRole("radio", {
      name: "Docker",
    }) as HTMLInputElement;
    const optionRow = radio.closest("label");
    expect(optionRow).not.toBeNull();
    await user.click(optionRow as HTMLElement);
    expect(radio.checked).toBe(true);

    const description = screen.getByText("Containerized");
    expect(description.closest("label")).toBeNull();
    await user.click(description);
    expect(radio.checked).toBe(true);

    const note = screen.getByLabelText(
      "Docker — Additional details (optional)",
    ) as HTMLTextAreaElement;
    expect(note.closest("label")).toBeNull();
    await user.type(note, "Use Compose");
    expect(radio.checked).toBe(true);
    expect(note.value).toBe("Use Compose");
  });

  it("submits a single question directly and replaces the form with a read-only summary", async () => {
    const user = userEvent.setup();
    const sendMessage = vi.fn().mockResolvedValue(undefined);
    render(
      <QuestionForm data={singleForm} copy={copy} sendMessage={sendMessage} />,
    );

    expect(
      screen.queryByRole("navigation", { name: "Question pagination" }),
    ).toBeNull();
    await user.click(screen.getByRole("radio", { name: "Docker" }));
    await user.click(screen.getByRole("button", { name: "Submit" }));

    await waitFor(() => expect(sendMessage).toHaveBeenCalledTimes(1));
    expect(sendMessage).toHaveBeenCalledWith(
      "Q: Which runtime?\nA: Docker",
    );
    const summary = screen.getByRole("region", {
      name: "Question and answer summary",
    });
    expect(within(summary).getByText("Which runtime?").textContent).toBe(
      "Which runtime?",
    );
    expect(within(summary).getByText("Docker").textContent).toBe("Docker");
    expect(screen.queryByRole("button")).toBeNull();
    expect(screen.queryByRole("textbox")).toBeNull();
    expect(screen.queryByRole("radio")).toBeNull();
  });

  it("shows one question at a time and restores every draft when moving backward", async () => {
    const user = userEvent.setup();
    const sendMessage = vi.fn().mockResolvedValue(undefined);
    render(
      <QuestionForm data={multiForm} copy={copy} sendMessage={sendMessage} />,
    );

    expect(screen.getByText("1 / 4")).toBeTruthy();
    expect(screen.queryByText("Which features?")).toBeNull();
    await user.click(screen.getByRole("radio", { name: "Docker" }));
    await user.type(
      screen.getByLabelText("Docker — Additional details (optional)"),
      "Use Compose",
    );
    await user.click(screen.getByRole("button", { name: "Next" }));

    expect(screen.getByText("2 / 4")).toBeTruthy();
    await user.click(screen.getByRole("checkbox", { name: "Web UI" }));
    await user.click(screen.getByRole("checkbox", { name: "Other" }));
    await user.type(
      screen.getByLabelText("Which features? — Other"),
      "Cloudflare Tunnel",
    );
    await user.click(screen.getByRole("button", { name: "Next" }));

    await user.type(screen.getByRole("textbox", { name: "Notes?" }), "Before Friday");
    await user.click(screen.getByRole("button", { name: "Next" }));

    expect(screen.queryByText("Other")).toBeNull();
    await user.click(screen.getByRole("radio", { name: "No" }));

    await user.click(
      screen.getByRole("button", { name: "Previous question" }),
    );
    expect(
      (screen.getByRole("textbox", { name: "Notes?" }) as HTMLTextAreaElement)
        .value,
    ).toBe("Before Friday");
    await user.click(
      screen.getByRole("button", { name: "Previous question" }),
    );
    expect(
      (
        screen.getByRole("checkbox", {
          name: "Web UI",
        }) as HTMLInputElement
      ).checked,
    ).toBe(true);
    expect(
      (
        screen.getByRole("checkbox", { name: "Other" }) as HTMLInputElement
      ).checked,
    ).toBe(true);
    expect(
      (
        screen.getByLabelText("Which features? — Other") as HTMLTextAreaElement
      ).value,
    ).toBe("Cloudflare Tunnel");
    await user.click(
      screen.getByRole("button", { name: "Previous question" }),
    );
    expect(
      (
        screen.getByRole("radio", { name: "Docker" }) as HTMLInputElement
      ).checked,
    ).toBe(true);
    expect(
      (
        screen.getByLabelText(
          "Docker — Additional details (optional)",
        ) as HTMLTextAreaElement
      ).value,
    ).toBe("Use Compose");

    await user.click(screen.getByRole("button", { name: "Next" }));
    expect(
      (
        screen.getByLabelText("Which features? — Other") as HTMLTextAreaElement
      ).value,
    ).toBe("Cloudflare Tunnel");
    await user.click(screen.getByRole("button", { name: "Next" }));
    await user.click(screen.getByRole("button", { name: "Next" }));
    expect(
      (screen.getByRole("radio", { name: "No" }) as HTMLInputElement).checked,
    ).toBe(true);

    await user.click(screen.getByRole("button", { name: "Submit all" }));
    await waitFor(() => expect(sendMessage).toHaveBeenCalledTimes(1));
    expect(sendMessage).toHaveBeenCalledWith(expectedMultiMessage);
  });

  it("allows optional questions to remain empty", async () => {
    const user = userEvent.setup();
    const sendMessage = vi.fn().mockResolvedValue(undefined);
    const data: QuestionFormData = {
      questions: [
        {
          id: "choice",
          question: "Choose?",
          type: "single_select",
          options: [{ id: "a", label: "A" }],
          required: false,
          allow_other: false,
        },
        {
          id: "details",
          question: "Details?",
          type: "text",
          required: false,
          allow_other: false,
        },
      ],
    };
    render(<QuestionForm data={data} copy={copy} sendMessage={sendMessage} />);

    await user.click(screen.getByRole("button", { name: "Next" }));
    expect(screen.getByText("2 / 2")).toBeTruthy();
    expect(screen.queryByRole("alert")).toBeNull();
    await user.click(screen.getByRole("button", { name: "Submit all" }));

    await waitFor(() => expect(sendMessage).toHaveBeenCalledTimes(1));
    expect(sendMessage).toHaveBeenCalledWith(
      "Q: Choose?\nA: Unanswered\n\nQ: Details?\nA: Unanswered",
    );
  });

  it("uses Enter to advance or submit while Shift+Enter inserts a new line", async () => {
    const user = userEvent.setup();
    const sendMessage = vi.fn().mockResolvedValue(undefined);
    const data: QuestionFormData = {
      questions: [
        {
          id: "first",
          question: "First?",
          type: "text",
          required: true,
          allow_other: false,
        },
        {
          id: "second",
          question: "Second?",
          type: "text",
          required: true,
          allow_other: false,
        },
      ],
    };
    render(<QuestionForm data={data} copy={copy} sendMessage={sendMessage} />);

    const first = screen.getByRole("textbox", {
      name: "First?",
    }) as HTMLTextAreaElement;
    await user.type(first, "line one{Shift>}{Enter}{/Shift}line two");
    expect(first.value).toBe("line one\nline two");
    expect(sendMessage).not.toHaveBeenCalled();

    await user.keyboard("{Enter}");
    expect(screen.getByText("2 / 2")).toBeTruthy();
    await user.type(screen.getByRole("textbox", { name: "Second?" }), "done");
    await user.keyboard("{Enter}");
    await waitFor(() => expect(sendMessage).toHaveBeenCalledTimes(1));
    expect(sendMessage).toHaveBeenCalledWith(
      "Q: First?\nA: line one\nline two\n\nQ: Second?\nA: done",
    );
  });

  it("ignores composition and legacy IME Enter events without blocking later Enter", async () => {
    const sendMessage = vi.fn().mockResolvedValue(undefined);
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
    const textarea = screen.getByRole("textbox", {
      name: "Notes?",
    }) as HTMLTextAreaElement;
    fireEvent.change(textarea, { target: { value: "候选答案" } });

    fireEvent.keyDown(textarea, { key: "Enter", isComposing: true });
    fireEvent.keyDown(textarea, { key: "Enter", keyCode: 229 });
    const now = vi.spyOn(Date, "now").mockReturnValue(1_000);
    fireEvent.compositionStart(textarea);
    fireEvent.compositionEnd(textarea);
    fireEvent.keyDown(textarea, { key: "Enter", keyCode: 13 });
    expect(sendMessage).not.toHaveBeenCalled();

    now.mockReturnValue(1_400);
    fireEvent.keyDown(textarea, { key: "Enter", keyCode: 13 });
    now.mockRestore();
    await waitFor(() => expect(sendMessage).toHaveBeenCalledTimes(1));
    expect(sendMessage).toHaveBeenCalledWith("Q: Notes?\nA: 候选答案");
  });

  it("validates the full form and moves to the first invalid question", async () => {
    const user = userEvent.setup();
    const sendMessage = vi.fn().mockResolvedValue(undefined);
    const looseData: QuestionFormData = {
      questions: [
        {
          id: "first",
          question: "First?",
          type: "single_select",
          options: [{ id: "a", label: "First option" }],
          required: false,
          allow_other: false,
        },
        {
          id: "second",
          question: "Second?",
          type: "text",
          required: false,
          allow_other: false,
        },
      ],
    };
    const strictData: QuestionFormData = {
      questions: [{ ...looseData.questions[0], required: true }, looseData.questions[1]],
    };
    const view = render(
      <QuestionForm data={looseData} copy={copy} sendMessage={sendMessage} />,
    );

    await user.click(screen.getByRole("button", { name: "Next" }));
    expect(screen.getByText("2 / 2")).toBeTruthy();
    view.rerender(
      <QuestionForm data={strictData} copy={copy} sendMessage={sendMessage} />,
    );
    await user.click(screen.getByRole("button", { name: "Submit all" }));

    expect(screen.getByText("1 / 2")).toBeTruthy();
    expect(screen.getByRole("alert").textContent).toContain(
      "Please answer this question.",
    );
    const firstOption = screen.getByRole("radio", {
      name: "First option",
    }) as HTMLInputElement;
    expect(document.activeElement).toBe(firstOption);
    expect(sendMessage).not.toHaveBeenCalled();
  });

  it("focuses the Other text box when its required value is blank", async () => {
    const user = userEvent.setup();
    const sendMessage = vi.fn().mockResolvedValue(undefined);
    render(
      <QuestionForm data={singleForm} copy={copy} sendMessage={sendMessage} />,
    );

    await user.click(screen.getByRole("radio", { name: "Other" }));
    await user.type(
      screen.getByLabelText("Which runtime? — Other"),
      "   ",
    );
    await user.click(screen.getByRole("button", { name: "Submit" }));

    expect(screen.getByRole("alert").textContent).toContain(
      "Please type your answer.",
    );
    expect(document.activeElement).toBe(
      screen.getByLabelText("Which runtime? — Other"),
    );
    expect(sendMessage).not.toHaveBeenCalled();
  });

  it("locks editing and pagination while sending and blocks duplicate submission", async () => {
    const user = userEvent.setup();
    let resolveSend: (() => void) | undefined;
    const sendMessage = vi.fn(
      () =>
        new Promise<void>((resolve) => {
          resolveSend = resolve;
        }),
    );
    render(
      <QuestionForm data={multiForm} copy={copy} sendMessage={sendMessage} />,
    );

    await user.click(screen.getByRole("radio", { name: "Docker" }));
    await user.click(screen.getByRole("button", { name: "Next" }));
    await user.click(screen.getByRole("checkbox", { name: "Web UI" }));
    await user.click(screen.getByRole("button", { name: "Next" }));
    await user.type(screen.getByRole("textbox", { name: "Notes?" }), "Soon");
    await user.click(screen.getByRole("button", { name: "Next" }));
    await user.click(screen.getByRole("radio", { name: "No" }));

    const submit = screen.getByRole("button", {
      name: "Submit all",
    }) as HTMLButtonElement;
    act(() => {
      submit.click();
      submit.click();
    });
    expect(sendMessage).toHaveBeenCalledTimes(1);
    await waitFor(() => {
      expect(submit.disabled).toBe(true);
      expect(
        (
          screen.getByRole("radio", { name: "No" }) as HTMLInputElement
        ).matches(":disabled"),
      ).toBe(true);
      expect(
        (
          screen.getByRole("button", {
            name: "Previous question",
          }) as HTMLButtonElement
        ).disabled,
      ).toBe(true);
      expect((document.querySelector("fieldset") as HTMLFieldSetElement).disabled).toBe(
        true,
      );
    });

    act(() => resolveSend?.());
    await screen.findByRole("region", {
      name: "Question and answer summary",
    });
  });

  it("keeps drafts and selectable Q/A on failure, then retries only manually", async () => {
    const user = userEvent.setup();
    const sendMessage = vi
      .fn()
      .mockRejectedValueOnce(new Error("offline"))
      .mockResolvedValueOnce(undefined);
    render(
      <QuestionForm data={singleForm} copy={copy} sendMessage={sendMessage} />,
    );

    await user.click(screen.getByRole("radio", { name: "Docker" }));
    await user.type(
      screen.getByLabelText("Docker — Additional details (optional)"),
      "Use Compose",
    );
    await user.click(screen.getByRole("button", { name: "Submit" }));

    await screen.findByText(/Could not send your answer/);
    expect(sendMessage).toHaveBeenCalledTimes(1);
    await new Promise((resolve) => setTimeout(resolve, 0));
    expect(sendMessage).toHaveBeenCalledTimes(1);
    expect(
      (
        screen.getByLabelText(
          "Docker — Additional details (optional)",
        ) as HTMLTextAreaElement
      ).value,
    ).toBe("Use Compose");
    expect(
      screen.getByLabelText("Selectable Q/A text").textContent,
    ).toBe("Q: Which runtime?\nA: Docker — Use Compose");
    expect(
      screen.queryByRole("region", {
        name: "Question and answer summary",
      }),
    ).toBeNull();

    await user.click(screen.getByRole("button", { name: "Try again" }));
    await waitFor(() => expect(sendMessage).toHaveBeenCalledTimes(2));
    expect(sendMessage).toHaveBeenLastCalledWith(
      formatAnswerMessage(
        singleForm,
        {
          runtime: {
            kind: "choice",
            optionIds: ["docker"],
            optionNotes: { docker: "Use Compose" },
            otherSelected: false,
            otherText: "",
          },
        },
        copy,
      ),
    );
    const summary = await screen.findByRole("region", {
      name: "Question and answer summary",
    });
    expect(within(summary).getByText("Docker — Use Compose").textContent).toBe(
      "Docker — Use Compose",
    );
    expect(screen.queryByRole("button")).toBeNull();
    expect(screen.queryByRole("textbox")).toBeNull();
    expect(screen.queryByRole("radio")).toBeNull();
    expect(
      screen.queryByRole("navigation", { name: "Question pagination" }),
    ).toBeNull();
  });
});
