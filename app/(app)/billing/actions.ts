"use server";

import { revalidatePath } from "next/cache";
import { eq } from "drizzle-orm";
import { db } from "@/lib/db";
import {
  timeEntries,
  charges,
  users,
  invoices,
  DEFAULT_FIRM_ID,
} from "@/lib/db/schema";
import { getViewer, requireFinanceRole, requireModule } from "@/lib/auth/viewer";
import { canAccessCase, canAccessInvoice } from "@/lib/auth/scope";
import { logActivity } from "@/lib/activity";
import {
  createProforma,
  recordPayment,
  cancelInvoice,
  chargesFromTimeEntries,
  issueTaxInvoice,
} from "@/lib/erp/billing";
import { isValidAllocationNumber } from "@/lib/erp/calc";

export type BillingFormState = { error?: string; ok?: boolean } | undefined;

type PaymentMethod = "bank_transfer" | "credit_card" | "bit" | "check" | "cash";

/** Finance mutation gate: correct role AND the billing module licensed. */
async function requireBilling() {
  await requireModule("billing");
  return requireFinanceRole();
}

/* -------------------- time entries (case-access users) -------------------- */

/** Log billable time on a case. Rate defaults to the user's hourly rate. */
export async function addTimeEntryAction(
  caseId: string,
  _prev: BillingFormState,
  formData: FormData
): Promise<BillingFormState> {
  const viewer = await getViewer();
  if (!(await canAccessCase(caseId, viewer))) {
    return { error: "אין הרשאה לתיק זה" };
  }

  const description = String(formData.get("description") || "").trim();
  const durationMin = Number(formData.get("durationMin") || 0);
  if (!description) return { error: "תיאור הוא שדה חובה" };
  if (!durationMin || durationMin <= 0) return { error: "יש להזין משך בדקות" };

  const rateInput = formData.get("rate");
  let rate = Number(rateInput || 0);
  if (!rate) {
    const [u] = await db
      .select({ hourlyRate: users.hourlyRate })
      .from(users)
      .where(eq(users.id, viewer.id))
      .limit(1);
    rate = Number(u?.hourlyRate ?? 0);
  }
  if (!rate) return { error: "לא הוגדר תעריף שעתי — יש להזין תעריף" };

  // Unchecked checkboxes submit nothing; checked submits "on".
  const billable = formData.get("billable") === "on";

  await db.insert(timeEntries).values({
    caseId,
    userId: viewer.id,
    durationMin,
    rate: String(rate),
    description,
    billable,
  });

  await logActivity({
    actorId: viewer.id,
    entityType: "case",
    entityId: caseId,
    action: "create",
    metadata: { kind: "time_entry", durationMin },
  });
  revalidatePath(`/cases/${caseId}`);
  return { ok: true };
}

/* -------------------- billing prep + money ops (finance only) ------------- */

/** Convert a case's un-invoiced billable time into a single fee charge. */
export async function createChargesFromTimeAction(caseId: string) {
  const viewer = await requireBilling();
  const charge = await chargesFromTimeEntries(DEFAULT_FIRM_ID, caseId, viewer.id);
  revalidatePath(`/cases/${caseId}`);
  return charge ? { ok: true } : { error: "אין שעות לחיוב" };
}

/** Create a proforma (חשבון עסקה) from the given pending charge ids. */
export async function createProformaAction(
  clientId: string,
  chargeIds: string[],
  caseId?: string
) {
  const viewer = await requireBilling();
  if (!chargeIds.length) return { error: "לא נבחרו חיובים" };
  try {
    const invoice = await createProforma(clientId, chargeIds, viewer.id);
    if (caseId) revalidatePath(`/cases/${caseId}`);
    revalidatePath("/billing");
    return { ok: true, invoiceId: invoice.id };
  } catch (e) {
    return { error: e instanceof Error ? e.message : "יצירת החשבון נכשלה" };
  }
}

/** Record a manual payment against an invoice and recompute its status. */
export async function recordPaymentAction(
  invoiceId: string,
  _prev: BillingFormState,
  formData: FormData
): Promise<BillingFormState> {
  const viewer = await requireBilling();
  if (!(await canAccessInvoice(invoiceId, viewer))) {
    return { error: "אין הרשאה לחשבונית זו" };
  }
  const amount = Number(formData.get("amount") || 0);
  if (!amount || amount <= 0) return { error: "יש להזין סכום תקין" };
  const method = String(formData.get("method") || "bank_transfer") as PaymentMethod;
  const reference = String(formData.get("reference") || "").trim() || undefined;

  try {
    await recordPayment(invoiceId, { method, amount, reference });
  } catch (e) {
    return { error: e instanceof Error ? e.message : "רישום התשלום נכשל" };
  }

  const [inv] = await db
    .select({ caseId: invoices.caseId })
    .from(invoices)
    .where(eq(invoices.id, invoiceId))
    .limit(1);
  await logActivity({
    actorId: viewer.id,
    entityType: inv?.caseId ? "case" : "client",
    entityId: inv?.caseId ?? undefined,
    action: "update",
    metadata: { kind: "payment", invoiceId, amount },
  });
  revalidatePath(`/billing/${invoiceId}`);
  revalidatePath("/billing");
  return { ok: true };
}

/** Issue an official tax document (חשבונית מס / מס-קבלה / קבלה) from a proforma. */
export async function issueInvoiceAction(
  proformaId: string,
  _prev: BillingFormState,
  formData: FormData
): Promise<BillingFormState> {
  const viewer = await requireBilling();
  if (!(await canAccessInvoice(proformaId, viewer))) {
    return { error: "אין הרשאה לחשבונית זו" };
  }
  const docType = String(formData.get("docType") || "tax_invoice") as
    | "tax_invoice"
    | "invoice_receipt"
    | "receipt";
  const allocationRaw = String(formData.get("allocationNumber") || "").trim();
  if (allocationRaw && !isValidAllocationNumber(allocationRaw)) {
    return { error: "מספר הקצאה חייב להיות 9 ספרות" };
  }

  try {
    const issued = await issueTaxInvoice(
      proformaId,
      { docType, allocationNumber: allocationRaw || undefined },
      viewer.id
    );
    revalidatePath(`/billing/${proformaId}`);
    revalidatePath(`/billing/${issued.id}`);
    revalidatePath("/billing");
    return { ok: true };
  } catch (e) {
    return { error: e instanceof Error ? e.message : "הפקת המסמך נכשלה" };
  }
}

/** Cancel an invoice (never delete — tax rules). */
export async function cancelInvoiceAction(invoiceId: string) {
  const viewer = await requireBilling();
  if (!(await canAccessInvoice(invoiceId, viewer))) return;
  await cancelInvoice(invoiceId);
  revalidatePath(`/billing/${invoiceId}`);
  revalidatePath("/billing");
}

/** Delete an un-invoiced pending charge. */
export async function deleteChargeAction(chargeId: string, caseId?: string) {
  await requireBilling();
  const [row] = await db
    .select({ status: charges.status })
    .from(charges)
    .where(eq(charges.id, chargeId))
    .limit(1);
  if (!row || row.status !== "pending") return;
  await db.delete(charges).where(eq(charges.id, chargeId));
  if (caseId) revalidatePath(`/cases/${caseId}`);
}
