import { act, cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { useApp } from "@modelcontextprotocol/ext-apps/react";
import { AskUserQuestionsApp } from "./App";
import { getCopy } from "./copy";

vi.mock("@modelcontextprotocol/ext-apps/react", () => ({ useApp: vi.fn() }));
type AppInstance = Parameters<NonNullable<Parameters<typeof useApp>[0]["onAppCreated"]>>[0];
const data = { questions: [{ id: "diagnostic", question: "Diagnostic answer?", type: "text", required: true, allow_other: false }] };

function mount(locale = "en-US") {
  const host = {
    getHostContext: () => ({ locale }),
    sendMessage: vi.fn().mockResolvedValue({}),
  } as unknown as AppInstance;
  let created = false;
  vi.mocked(useApp).mockImplementation((options) => {
    if (!created) {
      created = true;
      options.onAppCreated?.(host);
    }
    return { app: host, isConnected: true, error: null };
  });
  render(<AskUserQuestionsApp />);
  return host;
}
afterEach(() => { cleanup(); vi.clearAllMocks(); });

describe("host tool lifecycle", () => {
  it("shows the form from a successful result without requiring an input event", () => {
    const host = mount();
    act(() => host.ontoolresult?.({ structuredContent: data, content: [] }));
    expect(screen.getByLabelText("Diagnostic answer?")).toBeTruthy();
    expect(screen.getByRole("button", { name: "Submit" })).toBeTruthy();
  });

  it("rejects error results even when they contain data and ignores late inputs", () => {
    const host = mount();
    act(() => host.ontoolresult?.({ isError: true, structuredContent: data, content: [] }));
    act(() => host.ontoolinput?.({ arguments: data }));
    expect(screen.getByRole("alert").textContent).toBe(getCopy("en-US").toolFailed);
    expect(screen.queryByRole("button", { name: "Submit" })).toBeNull();
    expect(host.sendMessage).not.toHaveBeenCalled();
  });

  it("removes an input-based form on error and does not revive it on a late result", () => {
    const host = mount();
    act(() => host.ontoolinput?.({ arguments: data }));
    expect(screen.getByLabelText("Diagnostic answer?")).toBeTruthy();
    act(() => host.ontoolresult?.({ isError: true, content: [] }));
    act(() => host.ontoolresult?.({ structuredContent: data, content: [] }));
    expect(screen.getByRole("alert").textContent).toBe(getCopy("en-US").toolFailed);
    expect(screen.queryByRole("textbox")).toBeNull();
    expect(host.sendMessage).not.toHaveBeenCalled();
  });

  it("removes cancelled forms, localizes the message and ignores late notifications", () => {
    const host = mount("zh-CN");
    act(() => host.ontoolinput?.({ arguments: data }));
    act(() => host.ontoolcancelled?.({ reason: "Synthetic cancellation" }));
    act(() => host.ontoolinput?.({ arguments: data }));
    act(() => host.ontoolresult?.({ isError: true, content: [] }));
    expect(screen.getByRole("alert").textContent).toBe(getCopy("zh-CN").toolCancelled);
    expect(screen.queryByRole("button")).toBeNull();
    expect(host.sendMessage).not.toHaveBeenCalled();
  });
});
