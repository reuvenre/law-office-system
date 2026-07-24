import { describe, it, expect } from "vitest";
import { renderTemplate } from "./templates";
import { normalizeIsraeliPhone } from "./types";

describe("renderTemplate", () => {
  it("substitutes known placeholders", () => {
    const out = renderTemplate("שלום {client_name}, דיון בתאריך {date}", {
      client_name: "דנה",
      date: "01/08/2026",
    });
    expect(out).toBe("שלום דנה, דיון בתאריך 01/08/2026");
  });
  it("replaces an unknown placeholder with empty string (no leak)", () => {
    expect(renderTemplate("א {missing} ב", {})).toBe("א  ב");
  });
  it("supports repeated placeholders", () => {
    expect(renderTemplate("{x}-{x}", { x: "7" })).toBe("7-7");
  });
  it("leaves text without placeholders untouched", () => {
    expect(renderTemplate("ללא תבנית", { a: "1" })).toBe("ללא תבנית");
  });
});

describe("normalizeIsraeliPhone", () => {
  it("converts a local 05x number to 972…", () => {
    expect(normalizeIsraeliPhone("0501234567")).toBe("972501234567");
  });
  it("keeps an already-international number", () => {
    expect(normalizeIsraeliPhone("972501234567")).toBe("972501234567");
  });
  it("strips spaces, dashes and punctuation", () => {
    expect(normalizeIsraeliPhone("050-123-4567")).toBe("972501234567");
    expect(normalizeIsraeliPhone("+972 50 123 4567")).toBe("972501234567");
  });
});
