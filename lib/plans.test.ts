import { describe, it, expect } from "vitest";
import { planFor, isModuleEnabled, seatLimitReached, PLANS } from "./plans";

describe("planFor", () => {
  it("returns the matching plan", () => {
    expect(planFor("pro").key).toBe("pro");
    expect(planFor("enterprise").key).toBe("enterprise");
  });
  it("falls back to basic for unknown/empty", () => {
    expect(planFor(undefined).key).toBe("basic");
    expect(planFor("nonsense").key).toBe("basic");
  });
});

describe("isModuleEnabled", () => {
  it("uses the plan default when the firm has no explicit map", () => {
    expect(isModuleEnabled({ licensePlan: "basic" }, "billing")).toBe(false);
    expect(isModuleEnabled({ licensePlan: "pro" }, "billing")).toBe(true);
    expect(isModuleEnabled({ licensePlan: "pro" }, "accounting")).toBe(false);
    expect(isModuleEnabled({ licensePlan: "enterprise" }, "accounting")).toBe(true);
  });
  it("lets an explicit per-firm toggle override the plan default", () => {
    // basic plan excludes billing, but this firm has it switched on.
    expect(
      isModuleEnabled({ licensePlan: "basic", modules: { billing: true } }, "billing")
    ).toBe(true);
    // pro includes enforcement, but this firm turned it off.
    expect(
      isModuleEnabled({ licensePlan: "pro", modules: { enforcement: false } }, "enforcement")
    ).toBe(false);
  });
  it("falls back to plan default for modules the map omits", () => {
    expect(
      isModuleEnabled({ licensePlan: "pro", modules: { billing: true } }, "enforcement")
    ).toBe(true);
  });
});

describe("seatLimitReached", () => {
  it("caps basic at 3 seats", () => {
    expect(seatLimitReached("basic", 2)).toBe(false);
    expect(seatLimitReached("basic", 3)).toBe(true);
  });
  it("treats enterprise (null cap) as unlimited", () => {
    expect(seatLimitReached("enterprise", 9999)).toBe(false);
  });
  it("every plan is internally consistent (enterprise has all modules)", () => {
    expect(Object.values(PLANS.enterprise.modules).every(Boolean)).toBe(true);
  });
});
