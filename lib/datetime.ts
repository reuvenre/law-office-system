/**
 * Timezone-correct handling of <input type="datetime-local"> values.
 * The office works in Asia/Jerusalem; the server may run in UTC (Vercel).
 * These helpers treat the input as wall-clock Jerusalem time regardless of
 * server timezone, so legal dates never shift by the DST offset.
 */

export const OFFICE_TZ = "Asia/Jerusalem";

/** Milliseconds the given instant is offset from UTC in `tz`. */
function tzOffsetMs(date: Date, tz: string): number {
  const dtf = new Intl.DateTimeFormat("en-US", {
    timeZone: tz,
    hour12: false,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  });
  const parts = dtf.formatToParts(date);
  const m: Record<string, number> = {};
  for (const p of parts) if (p.type !== "literal") m[p.type] = Number(p.value);
  const asUTC = Date.UTC(m.year, m.month - 1, m.day, m.hour, m.minute, m.second);
  return asUTC - date.getTime();
}

/**
 * Parse a "YYYY-MM-DDTHH:mm" datetime-local string as Jerusalem wall time and
 * return the corresponding UTC Date. Returns null if empty/invalid.
 */
export function parseLocalDateTime(input: unknown): Date | null {
  if (typeof input !== "string" || !input.trim()) return null;
  const m = input.match(/^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})/);
  if (!m) return null;
  const [, y, mo, d, h, mi] = m.map(Number);
  const utcGuess = Date.UTC(y, mo - 1, d, h, mi);
  const offset = tzOffsetMs(new Date(utcGuess), OFFICE_TZ);
  return new Date(utcGuess - offset);
}

/**
 * Format a Date as a "YYYY-MM-DDTHH:mm" string in Jerusalem time, for
 * pre-filling a datetime-local input.
 */
export function toDatetimeLocalValue(value: Date | string | null | undefined): string {
  if (!value) return "";
  const d = typeof value === "string" ? new Date(value) : value;
  const dtf = new Intl.DateTimeFormat("en-CA", {
    timeZone: OFFICE_TZ,
    hour12: false,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
  const m: Record<string, string> = {};
  for (const p of dtf.formatToParts(d)) if (p.type !== "literal") m[p.type] = p.value;
  // en-CA gives YYYY-MM-DD for date parts.
  return `${m.year}-${m.month}-${m.day}T${m.hour}:${m.minute}`;
}
