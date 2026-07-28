/**
 * Billing engine (ported from _integration-kit/src/services/billing.ts to
 * Drizzle + Neon). Flow: time entries → charges → proforma → payment.
 * Invoices are never deleted — only cancelled (cancelInvoice).
 */
import { and, eq, gte, inArray, lte, sql } from "drizzle-orm";
import { db } from "@/lib/db";
import {
  cases,
  charges,
  invoices,
  invoiceLines,
  payments,
  timeEntries,
  firmCounters,
} from "@/lib/db/schema";
import type { FeeAgreement } from "@/lib/erp/types";
import {
  VAT_RATE,
  round2,
  computeInvoiceTotals,
  feeFromEntries,
  buildRetainerCharges,
  paymentStatus as calcPaymentStatus,
  docCounterName,
  isImplausiblePayment,
} from "@/lib/erp/calc";

export { VAT_RATE };

/** Atomic per-firm sequential counter (mirrors the next_counter() SQL fn). */
export async function nextCounter(firmId: string, name: string): Promise<number> {
  const [row] = await db
    .insert(firmCounters)
    .values({ firmId, counterName: name, currentValue: 1 })
    .onConflictDoUpdate({
      target: [firmCounters.firmId, firmCounters.counterName],
      set: { currentValue: sql`${firmCounters.currentValue} + 1` },
    })
    .returning({ v: firmCounters.currentValue });
  return Number(row.v);
}

/**
 * Monthly retainer: billable hours in the month across the agreement's cases
 * vs included hours; overage billed at overage_rate. Returns charge payloads
 * (caller inserts + creates the proforma).
 */
export async function computeMonthlyRetainer(agreement: FeeAgreement, month: string) {
  const from = `${month}-01`;
  const d = new Date(from);
  const to = new Date(d.getFullYear(), d.getMonth() + 1, 0).toISOString().slice(0, 10);

  const entries = await db
    .select({ durationMin: timeEntries.durationMin })
    .from(timeEntries)
    .innerJoin(cases, eq(timeEntries.caseId, cases.id))
    .where(
      and(
        eq(cases.feeAgreementId, agreement.id),
        eq(timeEntries.billable, true),
        gte(timeEntries.entryDate, from),
        lte(timeEntries.entryDate, to)
      )
    );

  const totalMinutes = entries.reduce((s, e) => s + e.durationMin, 0);
  return buildRetainerCharges(agreement, totalMinutes, month);
}

/** Turn un-invoiced billable time entries of a case into a single fee charge. */
export async function chargesFromTimeEntries(
  firmId: string,
  caseId: string,
  createdBy?: string
) {
  const entries = await db
    .select()
    .from(timeEntries)
    .where(
      and(
        eq(timeEntries.firmId, firmId),
        eq(timeEntries.caseId, caseId),
        eq(timeEntries.billable, true),
        eq(timeEntries.invoiced, false)
      )
    );
  if (!entries.length) return null;

  const amount = feeFromEntries(entries);
  const totalMin = entries.reduce((s, e) => s + e.durationMin, 0);
  const [caseRow] = await db
    .select({ clientId: cases.clientId })
    .from(cases)
    .where(eq(cases.id, caseId))
    .limit(1);
  if (!caseRow) return null;

  const [charge] = await db
    .insert(charges)
    .values({
      firmId,
      caseId,
      clientId: caseRow.clientId,
      chargeType: "fee",
      description: `שכ"ט לפי שעות — ${(totalMin / 60).toFixed(2)} שעות`,
      amount: String(amount),
      vatRate: String(VAT_RATE),
      sourceTimeEntryIds: entries.map((e) => e.id),
      createdBy: createdBy ?? null,
    })
    .returning();
  return charge;
}

/** Create a proforma (חשבון עסקה) from pending charges. Sequential numbering. */
export async function createProforma(
  clientId: string,
  chargeIds: string[],
  createdBy: string | null,
  firmId: string
) {
  const rows = await db
    .select()
    .from(charges)
    .where(
      and(
        eq(charges.firmId, firmId),
        inArray(charges.id, chargeIds),
        eq(charges.status, "pending")
      )
    );
  if (!rows.length) throw new Error("אין חיובים פתוחים");
  const pendingIds = rows.map((c) => c.id);

  const { subtotal, vatAmount, total } = computeInvoiceTotals(
    rows.map((c) => Number(c.amount))
  );
  const docNumber = await nextCounter(firmId, "proforma");

  // Invoice + lines + charge flips in one atomic batch (Neon runs a batch as
  // a single transaction), so a mid-flight failure can't leave a proforma
  // without lines or charges half-invoiced. The id is generated client-side
  // so the dependent statements can reference it inside the same batch.
  const invoiceId = crypto.randomUUID();
  const [inserted] = await db.batch([
    db
      .insert(invoices)
      .values({
        id: invoiceId,
        firmId,
        clientId,
        docType: "proforma",
        docNumber,
        subtotal: String(subtotal),
        vatRate: String(VAT_RATE),
        vatAmount: String(vatAmount),
        total: String(total),
        status: "draft",
        createdBy,
      })
      .returning(),
    db.insert(invoiceLines).values(
      rows.map((c) => ({
        invoiceId,
        chargeId: c.id,
        description: c.description,
        quantity: "1",
        unitPrice: String(c.amount),
        lineTotal: String(c.amount),
      }))
    ),
    db
      .update(charges)
      .set({ status: "invoiced", invoiceId })
      .where(and(inArray(charges.id, pendingIds), eq(charges.status, "pending"))),
  ]);

  return inserted[0];
}

/** Record a payment and recompute invoice status. Called by the payment webhook. */
export async function recordPayment(
  invoiceId: string,
  payment: {
    method: "bank_transfer" | "credit_card" | "bit" | "check" | "cash";
    amount: number;
    reference?: string;
    provider?: string;
    providerTxnId?: string;
  },
  /**
   * The firm the caller is acting for. Staff actions pass their own firm, so a
   * mistargeted invoice id cannot cross tenants. The webhook passes null: there
   * the invoice id comes back from the provider echoing the value we sent, so
   * the firm is derived from the invoice row itself.
   */
  firmId: string | null
) {
  const [invoice] = await db
    .select()
    .from(invoices)
    .where(
      firmId
        ? and(eq(invoices.id, invoiceId), eq(invoices.firmId, firmId))
        : eq(invoices.id, invoiceId)
    )
    .limit(1);
  if (!invoice) throw new Error("חשבונית לא נמצאה");

  // A cancelled invoice must not be resurrected to "paid" by a late callback —
  // under Israeli bookkeeping rules a cancelled document stays cancelled.
  if (invoice.status === "cancelled") {
    throw new Error("החשבונית בוטלה — לא ניתן לרשום תשלום");
  }

  // Refuse instead of recording when the amount cannot be what it claims: the
  // likely cause is a provider reporting agorot, and marking the invoice paid
  // for 100x the real sum is far worse than a webhook the provider retries.
  if (isImplausiblePayment(payment.amount, Number(invoice.total))) {
    console.error(
      `refusing implausible payment on invoice ${invoiceId}: ` +
        `amount=${payment.amount} invoiceTotal=${invoice.total} ` +
        `provider=${payment.provider ?? "manual"}`
    );
    throw new Error("סכום התשלום אינו תואם את החשבונית");
  }

  // Idempotency: payment providers retry webhooks. A transaction we already
  // recorded must not be inserted twice or flip the invoice status again.
  if (payment.providerTxnId) {
    const dup = await db
      .select({ id: payments.id })
      .from(payments)
      .where(
        and(
          eq(payments.provider, payment.provider ?? ""),
          eq(payments.providerTxnId, payment.providerTxnId)
        )
      )
      .limit(1);
    if (dup.length > 0) {
      const paid = await db
        .select({ amount: payments.amount })
        .from(payments)
        .where(eq(payments.invoiceId, invoiceId));
      const totalPaid = paid.reduce((s, p) => s + Number(p.amount), 0);
      return { status: invoice.status, totalPaid, duplicate: true as const };
    }
  }

  await db.insert(payments).values({
    firmId: invoice.firmId,
    invoiceId,
    clientId: invoice.clientId,
    method: payment.method,
    amount: String(payment.amount),
    reference: payment.reference,
    provider: payment.provider,
    providerTxnId: payment.providerTxnId,
  });

  const paid = await db
    .select({ amount: payments.amount })
    .from(payments)
    .where(eq(payments.invoiceId, invoiceId));
  const totalPaid = round2(paid.reduce((s, p) => s + Number(p.amount), 0));

  const status = calcPaymentStatus(totalPaid, Number(invoice.total));
  await db
    .update(invoices)
    .set({ status, ...(status === "paid" ? { paidAt: new Date() } : {}) })
    .where(eq(invoices.id, invoiceId));

  return { status, totalPaid };
}

/**
 * Issue an official tax document (חשבונית מס / חשבונית מס-קבלה / קבלה) from a
 * proforma. Creates a NEW invoice row in its own number series — the proforma
 * is preserved (Israeli bookkeeping keeps both). Lines are copied; the new
 * document links back via source_invoice_id and stores the Tax Authority
 * allocation number (מספר הקצאה) when supplied.
 */
export async function issueTaxInvoice(
  proformaId: string,
  opts: {
    docType: "tax_invoice" | "invoice_receipt" | "receipt";
    allocationNumber?: string;
  },
  createdBy: string | null,
  firmId: string
) {
  const [proforma] = await db
    .select()
    .from(invoices)
    .where(and(eq(invoices.id, proformaId), eq(invoices.firmId, firmId)))
    .limit(1);
  if (!proforma) throw new Error("חשבון עסקה לא נמצא");
  if (proforma.docType !== "proforma") {
    throw new Error("ניתן להפיק מסמך רשמי רק מחשבון עסקה");
  }
  if (proforma.status === "cancelled") {
    throw new Error("לא ניתן להפיק מסמך מחשבון שבוטל");
  }

  const lines = await db
    .select()
    .from(invoiceLines)
    .where(eq(invoiceLines.invoiceId, proformaId));

  const docNumber = await nextCounter(firmId, docCounterName(opts.docType));
  const newId = crypto.randomUUID();

  const [inserted] = await db.batch([
    db
      .insert(invoices)
      .values({
        id: newId,
        firmId,
        clientId: proforma.clientId,
        caseId: proforma.caseId,
        docType: opts.docType,
        docNumber,
        subtotal: proforma.subtotal,
        vatRate: proforma.vatRate,
        vatAmount: proforma.vatAmount,
        total: proforma.total,
        currency: proforma.currency,
        status: "sent",
        allocationNumber: opts.allocationNumber ?? null,
        sourceInvoiceId: proformaId,
        issuedAt: new Date(),
        createdBy,
      })
      .returning(),
    db.insert(invoiceLines).values(
      lines.map((l) => ({
        invoiceId: newId,
        chargeId: l.chargeId,
        description: l.description,
        quantity: l.quantity,
        unitPrice: l.unitPrice,
        lineTotal: l.lineTotal,
      }))
    ),
    // Mark the proforma as sent so it's clear it has been acted upon.
    db
      .update(invoices)
      .set({ status: proforma.status === "draft" ? "sent" : proforma.status })
      .where(eq(invoices.id, proformaId)),
  ]);

  return inserted[0];
}

/** Cancel an invoice — never delete (tax rules): set cancelled_at + status. */
export async function cancelInvoice(invoiceId: string, firmId: string) {
  await db
    .update(invoices)
    .set({ status: "cancelled", cancelledAt: new Date() })
    .where(and(eq(invoices.id, invoiceId), eq(invoices.firmId, firmId)));
}
