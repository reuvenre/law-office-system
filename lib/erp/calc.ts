/**
 * Pure billing arithmetic — no DB, no I/O — so it can be unit-tested in
 * isolation. billing.ts and the retainer cron delegate all money/date math
 * here. Amounts are handled as numbers; callers stringify for numeric columns.
 */

export const VAT_RATE = 18.0; // per-row on charges/invoices; update per law

/** Round to 2 decimals (agorot), avoiding binary float drift. */
export const round2 = (n: number) => Math.round((n + Number.EPSILON) * 100) / 100;

/** Subtotal + VAT + total for a set of pre-VAT amounts. */
export function computeInvoiceTotals(amounts: number[], vatRate: number = VAT_RATE) {
  const subtotal = round2(amounts.reduce((s, a) => s + a, 0));
  const vatAmount = round2((subtotal * vatRate) / 100);
  const total = round2(subtotal + vatAmount);
  return { subtotal, vatAmount, total };
}

/** Fee for billable minutes at an hourly rate. */
export function feeFromMinutes(durationMin: number, hourlyRate: number): number {
  return round2((durationMin / 60) * hourlyRate);
}

/** Sum of a list of {durationMin, rate} time entries → fee amount. */
export function feeFromEntries(entries: { durationMin: number; rate: number | string }[]): number {
  return round2(entries.reduce((s, e) => s + (e.durationMin / 60) * Number(e.rate), 0));
}

/** Retainer overage: hours beyond the included allotment, billed at overageRate. */
export function retainerOverage(
  totalHours: number,
  includedHours: number,
  overageRate: number
) {
  const overageHours = Math.max(0, round2(totalHours - includedHours));
  const overageAmount = round2(overageHours * overageRate);
  return { overageHours, overageAmount };
}

export type RetainerChargePayload = {
  firmId: string;
  clientId: string;
  chargeType: "retainer" | "fee";
  description: string;
  amount: string;
  vatRate: string;
};

/**
 * Charge payloads for a monthly retainer given the month's billable minutes.
 * Always a base retainer charge; a second overage charge when hours exceed
 * the included allotment. Pure — the caller supplies totalMinutes from the DB.
 */
export function buildRetainerCharges(
  agreement: {
    id: string;
    firmId: string;
    clientId: string;
    retainerAmount: number | string | null;
    retainerHours: number | string | null;
    overageRate: number | string | null;
    hourlyRate: number | string | null;
  },
  totalMinutes: number,
  month: string
): { totalHours: number; overageHours: number; charges: RetainerChargePayload[] } {
  const totalHours = totalMinutes / 60;
  const included = Number(agreement.retainerHours ?? 0);
  const overageRate = Number(agreement.overageRate ?? agreement.hourlyRate ?? 0);
  const { overageHours, overageAmount } = retainerOverage(totalHours, included, overageRate);

  const charges: RetainerChargePayload[] = [
    {
      firmId: agreement.firmId,
      clientId: agreement.clientId,
      chargeType: "retainer",
      description: `ריטיינר חודשי ${month} (${included} שעות כלולות)`,
      amount: String(agreement.retainerAmount ?? 0),
      vatRate: String(VAT_RATE),
    },
  ];
  if (overageAmount > 0) {
    charges.push({
      firmId: agreement.firmId,
      clientId: agreement.clientId,
      chargeType: "fee",
      description: `שעות חורגות ${month}: ${overageHours.toFixed(2)} שעות`,
      amount: String(overageAmount),
      vatRate: String(VAT_RATE),
    });
  }
  return { totalHours, overageHours, charges };
}

/** Invoice status after payments: fully paid vs partial. */
export function paymentStatus(
  totalPaid: number,
  invoiceTotal: number
): "paid" | "partially_paid" {
  return totalPaid >= invoiceTotal ? "paid" : "partially_paid";
}

/**
 * Whether an agreement's retainer billing day fires "today". A billing day
 * beyond the current month's length (e.g. 31 in April/February) is clamped to
 * the month's last day.
 */
export function retainerFiresToday(
  billingDay: number,
  day: number,
  lastDayOfMonth: number
): boolean {
  return billingDay === day || (day === lastDayOfMonth && billingDay > lastDayOfMonth);
}

/** Last calendar day of the month for a given year (1-based) month. */
export function lastDayOfMonth(year: number, month1based: number): number {
  return new Date(Date.UTC(year, month1based, 0)).getUTCDate();
}
