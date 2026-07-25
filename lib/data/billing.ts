import { and, desc, eq, or } from "drizzle-orm";
import { db } from "@/lib/db";
import {
  invoices,
  invoiceLines,
  payments,
  charges,
  timeEntries,
  clients,
  cases,
  users,
} from "@/lib/db/schema";
import { invoiceScope, withScope, type ViewerScope } from "@/lib/auth/scope";

type Ids = ViewerScope;

/** Invoices visible to the viewer (scoped by client), newest first. */
export async function listInvoices(allowedIds: Ids) {
  const rows = db
    .select({
      id: invoices.id,
      docType: invoices.docType,
      docNumber: invoices.docNumber,
      status: invoices.status,
      total: invoices.total,
      currency: invoices.currency,
      issuedAt: invoices.issuedAt,
      createdAt: invoices.createdAt,
      clientName: clients.fullName,
      caseTitle: cases.title,
    })
    .from(invoices)
    .leftJoin(clients, eq(invoices.clientId, clients.id))
    .leftJoin(cases, eq(invoices.caseId, cases.id));

  const scope = invoiceScope(allowedIds);
  return (scope ? rows.where(scope) : rows).orderBy(desc(invoices.createdAt));
}

/** A single invoice with its client/case, lines and payments (scoped). */
export async function getInvoice(id: string, allowedIds: Ids) {
  const [inv] = await db
    .select({
      i: invoices,
      clientName: clients.fullName,
      caseTitle: cases.title,
      createdByName: users.fullName,
    })
    .from(invoices)
    .leftJoin(clients, eq(invoices.clientId, clients.id))
    .leftJoin(cases, eq(invoices.caseId, cases.id))
    .leftJoin(users, eq(invoices.createdBy, users.id))
    .where(withScope(eq(invoices.id, id), invoiceScope(allowedIds)))
    .limit(1);
  if (!inv) return null;

  const [lines, paid, related] = await Promise.all([
    db.select().from(invoiceLines).where(eq(invoiceLines.invoiceId, id)),
    db
      .select()
      .from(payments)
      .where(eq(payments.invoiceId, id))
      .orderBy(desc(payments.receivedAt)),
    // Documents linked to this one: those issued from it (children) and, if
    // this is an issued document, its source proforma (parent).
    db
      .select({
        id: invoices.id,
        docType: invoices.docType,
        docNumber: invoices.docNumber,
        status: invoices.status,
      })
      .from(invoices)
      .where(
        or(
          eq(invoices.sourceInvoiceId, id),
          inv.i.sourceInvoiceId ? eq(invoices.id, inv.i.sourceInvoiceId) : undefined
        )
      ),
  ]);

  const totalPaid = paid.reduce((s, p) => s + Number(p.amount), 0);
  return {
    ...inv.i,
    clientName: inv.clientName,
    caseTitle: inv.caseTitle,
    createdByName: inv.createdByName,
    lines,
    payments: paid,
    relatedDocs: related,
    totalPaid,
    balance: Number(inv.i.total) - totalPaid,
  };
}

/** Pending (un-invoiced) charges for a client — the proforma candidates. */
export async function listPendingCharges(clientId: string) {
  return db
    .select()
    .from(charges)
    .where(and(eq(charges.clientId, clientId), eq(charges.status, "pending")))
    .orderBy(desc(charges.chargeDate));
}

/** Time entries for a case (billing tab), newest first. */
export async function listTimeEntries(caseId: string) {
  return db
    .select({
      t: timeEntries,
      userName: users.fullName,
    })
    .from(timeEntries)
    .leftJoin(users, eq(timeEntries.userId, users.id))
    .where(eq(timeEntries.caseId, caseId))
    .orderBy(desc(timeEntries.entryDate));
}

/** Invoices linked to a case (billing tab). */
export async function listCaseInvoices(caseId: string) {
  return db
    .select({
      id: invoices.id,
      docType: invoices.docType,
      docNumber: invoices.docNumber,
      status: invoices.status,
      total: invoices.total,
    })
    .from(invoices)
    .where(eq(invoices.caseId, caseId))
    .orderBy(desc(invoices.createdAt));
}
