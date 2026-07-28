import { and, desc, eq, gte, ne } from "drizzle-orm";
import { db } from "@/lib/db";
import { cases, documents, invoices, hearings } from "@/lib/db/schema";
import { isPayableInvoiceStatus } from "@/lib/erp/calc";
import { getFirm } from "@/lib/data/firm";
import { isModuleEnabled } from "@/lib/plans";

/**
 * The portal must respect the firm's licensing exactly like the staff UI: if
 * the billing module is off, clients can neither see nor pay invoices. Gating
 * here (rather than in each page) means any future portal surface inherits it.
 */
async function billingEnabled(firmId: string): Promise<boolean> {
  return isModuleEnabled(await getFirm(firmId), "billing");
}

/**
 * Read models for the client portal. Every query is filtered by BOTH the
 * portal session's clientId and firmId.
 *
 * Deliberately NOT exposed to the portal: internal notes, the activity log,
 * tasks, time entries, charges, opposing-party details, and any document not
 * explicitly marked shared_with_client. The portal is a narrow read surface —
 * attorney work product stays inside the firm.
 */

export async function portalCases(clientId: string, firmId: string) {
  return db
    .select({
      id: cases.id,
      title: cases.title,
      practiceArea: cases.practiceArea,
      status: cases.status,
      openedAt: cases.openedAt,
    })
    .from(cases)
    .where(and(eq(cases.clientId, clientId), eq(cases.firmId, firmId)))
    .orderBy(desc(cases.createdAt));
}

/** Upcoming scheduled hearings across the client's cases (date/place only). */
export async function portalHearings(clientId: string, firmId: string) {
  return db
    .select({
      id: hearings.id,
      hearingAt: hearings.hearingAt,
      location: hearings.location,
      caseTitle: cases.title,
    })
    .from(hearings)
    .innerJoin(cases, eq(hearings.caseId, cases.id))
    .where(
      and(
        eq(cases.clientId, clientId),
        eq(cases.firmId, firmId),
        eq(hearings.status, "scheduled"),
        gte(hearings.hearingAt, new Date())
      )
    )
    .orderBy(hearings.hearingAt);
}

/** Issued billing documents — drafts are never shown to the client. */
export async function portalInvoices(clientId: string, firmId: string) {
  if (!(await billingEnabled(firmId))) return [];
  return db
    .select({
      id: invoices.id,
      docType: invoices.docType,
      docNumber: invoices.docNumber,
      status: invoices.status,
      total: invoices.total,
      paymentLink: invoices.paymentLink,
      issuedAt: invoices.issuedAt,
      createdAt: invoices.createdAt,
    })
    .from(invoices)
    .where(
      and(
        eq(invoices.clientId, clientId),
        eq(invoices.firmId, firmId),
        ne(invoices.status, "draft")
      )
    )
    .orderBy(desc(invoices.createdAt));
}

/** Only documents the firm explicitly shared with this client. */
export async function portalDocuments(clientId: string, firmId: string) {
  return db
    .select({
      id: documents.id,
      fileName: documents.fileName,
      category: documents.category,
      createdAt: documents.createdAt,
    })
    .from(documents)
    .where(
      and(
        eq(documents.clientId, clientId),
        eq(documents.firmId, firmId),
        eq(documents.sharedWithClient, true)
      )
    )
    .orderBy(desc(documents.createdAt));
}

/**
 * Fetch a shared document for portal download. Returns null unless the document
 * belongs to this client, this firm, AND is marked shared.
 */
export async function portalDocumentForDownload(
  docId: string,
  clientId: string,
  firmId: string
) {
  const rows = await db
    .select({
      storagePath: documents.storagePath,
      mimeType: documents.mimeType,
      fileName: documents.fileName,
    })
    .from(documents)
    .where(
      and(
        eq(documents.id, docId),
        eq(documents.clientId, clientId),
        eq(documents.firmId, firmId),
        eq(documents.sharedWithClient, true)
      )
    )
    .limit(1);
  return rows[0] ?? null;
}

/** An invoice the client may pay — must be theirs, issued, and not settled. */
export async function portalPayableInvoice(
  invoiceId: string,
  clientId: string,
  firmId: string
) {
  if (!(await billingEnabled(firmId))) return null;
  const rows = await db
    .select({
      id: invoices.id,
      docType: invoices.docType,
      docNumber: invoices.docNumber,
      status: invoices.status,
      total: invoices.total,
      currency: invoices.currency,
      paymentLink: invoices.paymentLink,
    })
    .from(invoices)
    .where(
      and(
        eq(invoices.id, invoiceId),
        eq(invoices.clientId, clientId),
        eq(invoices.firmId, firmId)
      )
    )
    .limit(1);
  const inv = rows[0];
  if (!inv || !isPayableInvoiceStatus(inv.status)) return null;
  return inv;
}
