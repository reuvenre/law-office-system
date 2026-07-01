import { and, eq, inArray, isNull, or, sql, type SQL } from "drizzle-orm";
import { db } from "@/lib/db";
import { cases, clients, tasks, documents } from "@/lib/db/schema";

/**
 * SQL visibility conditions derived from a viewer's allowedIds
 * (null = see everything). A case is visible if the viewer is its responsible
 * lawyer or its creator; a client is visible if the viewer created it or it has
 * any visible case; a task is visible via its case, or (if standalone) if the
 * viewer created it or it's assigned to them.
 */

export function caseScope(allowedIds: string[] | null): SQL | undefined {
  if (allowedIds === null) return undefined;
  if (allowedIds.length === 0) return sql`false`;
  return or(
    inArray(cases.responsibleLawyerId, allowedIds),
    inArray(cases.createdBy, allowedIds)
  );
}

export function clientScope(allowedIds: string[] | null): SQL | undefined {
  if (allowedIds === null) return undefined;
  if (allowedIds.length === 0) return sql`false`;
  const visibleCaseClientIds = db
    .select({ id: cases.clientId })
    .from(cases)
    .where(caseScope(allowedIds));
  return or(
    inArray(clients.createdBy, allowedIds),
    inArray(clients.id, visibleCaseClientIds)
  );
}

export function taskScope(allowedIds: string[] | null): SQL | undefined {
  if (allowedIds === null) return undefined;
  if (allowedIds.length === 0) return sql`false`;
  const visibleCaseIds = db
    .select({ id: cases.id })
    .from(cases)
    .where(caseScope(allowedIds));
  return or(
    inArray(tasks.caseId, visibleCaseIds),
    and(
      isNull(tasks.caseId),
      or(
        inArray(tasks.createdBy, allowedIds),
        inArray(tasks.assignedTo, allowedIds)
      )
    )
  );
}

export function documentScope(allowedIds: string[] | null): SQL | undefined {
  if (allowedIds === null) return undefined;
  if (allowedIds.length === 0) return sql`false`;
  const visibleCaseIds = db
    .select({ id: cases.id })
    .from(cases)
    .where(caseScope(allowedIds));
  const visibleClientIds = db
    .select({ id: clients.id })
    .from(clients)
    .where(clientScope(allowedIds));
  return or(
    inArray(documents.caseId, visibleCaseIds),
    inArray(documents.clientId, visibleClientIds)
  );
}

/** Combine an existing filter with a scope condition. */
export function withScope(
  base: SQL | undefined,
  scope: SQL | undefined
): SQL | undefined {
  if (base && scope) return and(base, scope);
  return base ?? scope;
}

export { eq };
