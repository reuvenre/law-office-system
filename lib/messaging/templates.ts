/**
 * Reminder template rendering (spec §8.5). Templates use {placeholder} tokens.
 * Minimal info only — no debt / opposing-party details (spec §8.6 privacy).
 */
export function renderTemplate(
  template: string,
  vars: Record<string, string>
): string {
  return template.replace(/\{(\w+)\}/g, (_, key) => vars[key] ?? "");
}
