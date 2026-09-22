import { describe, expect, it } from "vitest";
import { normalizeAppOrigin, normalizeListenHost } from "./config.js";

describe("normalizeListenHost", () => {
  it("defaults to loopback", () => {
    expect(normalizeListenHost(undefined)).toBe("127.0.0.1");
  });

  it("allows an explicit container bind address", () => {
    expect(normalizeListenHost(" 0.0.0.0 ")).toBe("0.0.0.0");
  });

  it("rejects an empty value", () => {
    expect(() => normalizeListenHost(" ")).toThrow(/MCP_LISTEN_HOST/);
  });
});

describe("normalizeAppOrigin", () => {
  it("allows an omitted value for local development", () => {
    expect(normalizeAppOrigin(undefined)).toBeUndefined();
  });

  it("normalizes an HTTPS origin", () => {
    expect(normalizeAppOrigin("https://questions.example.com/")).toBe(
      "https://questions.example.com",
    );
  });

  it.each([
    "http://questions.example.com",
    "https://questions.example.com/path",
    "https://user@questions.example.com",
    "not a URL",
  ])("rejects a non-origin value: %s", (value) => {
    expect(() => normalizeAppOrigin(value)).toThrow(/APP_ORIGIN/);
  });
});
