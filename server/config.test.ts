import { describe, expect, it } from "vitest";
import { normalizeAppOrigin } from "./config.js";

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
