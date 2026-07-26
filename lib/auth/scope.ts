import { and, eq, inArray, isNull, or, sql, type SQL } from "drizzle-orm";
import { db } from "@/lib/db";
import { cases, clients, tasks, documents, invoices } from "@/lib/db/schema";

/**
 * Tenant + visibility scoping. Every scoped query is bounded to the viewer's
 * firm (tenant isolation) AND to the ids the viewer may see:
 *   - allowedIds === null  → the whole firm (admin / 'all' scope)
 *   - allowedIds = [...]    → only those users' responsibility/creations
 *   - allowedIds = []       → nothing
 * The firm filter is ALWAYS applied, including the null case — this is what
 * stops an 'all'-scope user from seeing other firms' data.
 */
export type ViewerScope = { firmId: string; allowedIds: string[] | null };

export function caseScope(s: ViewerScope): SQL | undefined {
  const firm = eq(cases.firmId, s.firmId);
  if (s.allowedIds === null) return firm;
  if (s.allowedIds.length === 0) return sql`false`;
  return and(
    firm,
    or(
      inArray(cases.responsibleLawyerId, s.allowedIds),
      inArray(cases.createdBy, s.allowedIds)
    )
  );
}

export function clientScope(s: ViewerScope): SQL | undefined {
  const firm = eq(clients.firmId, s.firmId);
  if (s.allowedIds === null) return firm;
  if (s.allowedIds.length === 0) return sql`false`;
  const visibleCaseClientIds = db
    .select({ id: cases.clientId })
    .from(cases)
    .where(caseScope(s));
  return and(
    firm,
    or(
      inArray(clients.createdBy, s.allowedIds),
      inArray(clients.id, visibleCaseClientIds)
    )
  );
}

export function taskScope(s: ViewerScope): SQL | undefined {
  const firm = eq(tasks.firmId, s.firmId);
  if (s.allowedIds === null) return firm;
  if (s.allowedIds.length === 0) return sql`false`;
  const visibleCaseIds = db
    .select({ id: cases.id })
    .from(cases)
    .where(caseScope(s));
  return and(
    firm,
    or(
      inArray(tasks.caseId, visibleCaseIds),
      and(
        isNull(tasks.caseId),
        or(
          inArray(tasks.createdBy, s.allowedIds),
          inArray(tasks.assignedTo, s.allowedIds)
        )
      )
    )
  );
}

export function documentScope(s: ViewerScope): SQL | undefined {
  const firm = eq(documents.firmId, s.firmId);
  if (s.allowedIds === null) return firm;
  if (s.allowedIds.length === 0) return sql`false`;
  const visibleCaseIds = db
    .select({ id: cases.id })
    .from(cases)
    .where(caseScope(s));
  const visibleClientIds = db
    .select({ id: clients.id })
    .from(clients)
    .where(clientScope(s));
  return and(
    firm,
    or(
      inArray(documents.caseId, visibleCaseIds),
      inArray(documents.clientId, visibleClientIds)
    )
  );
}

/** An invoice is visible when it's in the firm and its client is visible. */
export function invoiceScope(s: ViewerScope): SQL | undefined {
  const firm = eq(invoices.firmId, s.firmId);
  if (s.allowedIds === null) return firm;
  if (s.allowedIds.length === 0) return sql`false`;
  const visibleClientIds = db
    .select({ id: clients.id })
    .from(clients)
    .where(clientScope(s));
  return and(firm, inArray(invoices.clientId, visibleClientIds));
}

/** Combine an existing filter with a scope condition. */
export function withScope(
  base: SQL | undefined,
  scope: SQL | undefined
): SQL | undefined {
  if (base && scope) return and(base, scope);
  return base ?? scope;
}

/* ------------------------------------------------------------------ */
/* Write-side guards — verify a specific entity is visible (in-firm +  */
/* allowed) before a mutation. Return true when the viewer may act.    */
/* ------------------------------------------------------------------ */
export async function canAccessCase(caseId: string, s: ViewerScope) {
  const rows = await db
    .select({ id: cases.id })
    .from(cases)
    .where(withScope(eq(cases.id, caseId), caseScope(s)))
    .limit(1);
  return rows.length > 0;
}

export async function canAccessClient(clientId: string, s: ViewerScope) {
  const rows = await db
    .select({ id: clients.id })
    .from(clients)
    .where(withScope(eq(clients.id, clientId), clientScope(s)))
    .limit(1);
  return rows.length > 0;
}

export async function canAccessDocument(docId: string, s: ViewerScope) {
  const rows = await db
    .select({ id: documents.id })
    .from(documents)
    .where(withScope(eq(documents.id, docId), documentScope(s)))
    .limit(1);
  return rows.length > 0;
}

export async function canAccessTask(taskId: string, s: ViewerScope) {
  const rows = await db
    .select({ id: tasks.id })
    .from(tasks)
    .where(withScope(eq(tasks.id, taskId), taskScope(s)))
    .limit(1);
  return rows.length > 0;
}

export async function canAccessInvoice(invoiceId: string, s: ViewerScope) {
  const rows = await db
    .select({ id: invoices.id })
    .from(invoices)
    .where(withScope(eq(invoices.id, invoiceId), invoiceScope(s)))
    .limit(1);
  return rows.length > 0;
}

export { eq };
