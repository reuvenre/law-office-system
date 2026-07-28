/**
 * SaaS plan model (win-solutions). A firm has a `licensePlan` and an explicit
 * `modules` map (jsonb on the firms row). The plan defines default module
 * access and a seat cap; the per-firm `modules` map is the effective source of
 * truth (lets support toggle a single module without changing the plan).
 *
 * Pure module — no DB — so it is unit-testable and shared by UI + guards.
 *
 * Only ship modules that exist. "הוצאה לפועל" and "הנהלת חשבונות" were priced
 * into the tiers and tickable in Settings while no route, screen or guard for
 * either was ever built — selling a tier on a feature that does not exist is a
 * refund waiting to happen. They come back when they are real.
 *
 * `ai` is off by default on every tier, including enterprise's implicit
 * defaults, because turning it on sends privileged case material to a
 * third-party API. That is a decision each firm makes deliberately.
 */

export const MODULES = {
  billing: "חיוב וגבייה",
  documents: "מסמכים",
  ai: "עוזר AI",
} as const;
export type ModuleKey = keyof typeof MODULES;

export type ModuleMap = Record<ModuleKey, boolean>;

export type Plan = {
  key: string;
  label: string;
  priceHint: string;
  maxSeats: number | null; // null = unlimited
  modules: ModuleMap;
};

export const PLANS: Record<string, Plan> = {
  basic: {
    key: "basic",
    label: "בסיסי",
    priceHint: "עד 3 משתמשים",
    maxSeats: 3,
    modules: { billing: false, documents: true, ai: false },
  },
  pro: {
    key: "pro",
    label: "מקצועי",
    priceHint: "עד 15 משתמשים · חיוב וגבייה",
    maxSeats: 15,
    modules: { billing: true, documents: true, ai: false },
  },
  enterprise: {
    key: "enterprise",
    label: "ארגוני",
    priceHint: "ללא הגבלת משתמשים · כל המודולים",
    maxSeats: null,
    modules: { billing: true, documents: true, ai: true },
  },
};

export const DEFAULT_PLAN = "basic";

/** The plan record for a firm's licensePlan (falls back to basic). */
export function planFor(licensePlan: string | null | undefined): Plan {
  return PLANS[licensePlan ?? ""] ?? PLANS[DEFAULT_PLAN];
}

/**
 * Effective module access for a firm: the explicit per-firm `modules` map wins;
 * any module the map doesn't mention falls back to the plan default.
 */
export function isModuleEnabled(
  firm: { licensePlan?: string | null; modules?: Partial<ModuleMap> | null },
  moduleKey: ModuleKey
): boolean {
  const explicit = firm.modules?.[moduleKey];
  if (typeof explicit === "boolean") return explicit;
  return planFor(firm.licensePlan).modules[moduleKey];
}

/** Whether adding another active user would exceed the plan's seat cap. */
export function seatLimitReached(
  licensePlan: string | null | undefined,
  activeSeats: number
): boolean {
  const max = planFor(licensePlan).maxSeats;
  return max !== null && activeSeats >= max;
}
