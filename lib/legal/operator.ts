/**
 * Operator identity shown on the policy pages.
 *
 * Kept in one place because these strings must match the entity that actually
 * signs the customer agreement — a privacy policy naming the wrong legal person
 * is worse than none. Fill the placeholders before publishing the pages as
 * binding documents.
 */
export const OPERATOR = {
  legalName: process.env.OPERATOR_LEGAL_NAME || "win-solutions",
  companyNumber: process.env.OPERATOR_COMPANY_NUMBER || "ח.פ. [להשלמה]",
  address: process.env.OPERATOR_ADDRESS || "[כתובת להשלמה], ישראל",
  privacyEmail: process.env.OPERATOR_PRIVACY_EMAIL || "privacy@win-solutions.co.il",
  supportEmail: process.env.OPERATOR_SUPPORT_EMAIL || "support@win-solutions.co.il",
  site: "https://win-solutions.co.il",
} as const;

/** Bump when the policy text changes materially. */
export const LEGAL_LAST_UPDATED = "27.7.2026";
