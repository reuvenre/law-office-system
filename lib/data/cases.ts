import { db } from "@/lib/db";
import {
  cases,
  clients,
  users,
  hearings,
  deadlines,
  tasks,
  notes,
  documents,
  caseStatusHistory,
} from "@/lib/db/schema";
import { asc, desc, eq, ilike, or } from "drizzle-orm";
import { caseScope, withScope } from "@/lib/auth/scope";

type Ids = string[] | null;

export async function listCases(allowedIds: Ids, search?: string) {
  const rows = db
    .select({
      id: cases.id,
      title: cases.title,
      caseNumber: cases.caseNumber,
      practiceArea: cases.practiceArea,
      status: cases.status,
      openedAt: cases.openedAt,
      clientName: clients.fullName,
    })
    .from(cases)
    .leftJoin(clients, eq(cases.clientId, clients.id));

  const searchCond =
    search && search.trim()
      ? or(
          ilike(cases.title, `%${search.trim()}%`),
          ilike(cases.caseNumber, `%${search.trim()}%`),
          ilike(cases.opposingParty, `%${search.trim()}%`),
          ilike(clients.fullName, `%${search.trim()}%`)
        )
      : undefined;
  const where = withScope(searchCond, caseScope(allowedIds));
  return (where ? rows.where(where) : rows).orderBy(desc(cases.createdAt));
}

export async function getCase(id: string, allowedIds: Ids) {
  const rows = await db
    .select({
      c: cases,
      clientName: clients.fullName,
      lawyerName: users.fullName,
    })
    .from(cases)
    .leftJoin(clients, eq(cases.clientId, clients.id))
    .leftJoin(users, eq(cases.responsibleLawyerId, users.id))
    .where(withScope(eq(cases.id, id), caseScope(allowedIds)))
    .limit(1);
  if (!rows[0]) return null;
  return {
    ...rows[0].c,
    clientName: rows[0].clientName,
    lawyerName: rows[0].lawyerName,
  };
}

export async function getCaseStatusHistory(caseId: string) {
  return db
    .select({
      id: caseStatusHistory.id,
      fromStatus: caseStatusHistory.fromStatus,
      toStatus: caseStatusHistory.toStatus,
      changedAt: caseStatusHistory.changedAt,
      note: caseStatusHistory.note,
      changedByName: users.fullName,
    })
    .from(caseStatusHistory)
    .leftJoin(users, eq(caseStatusHistory.changedBy, users.id))
    .where(eq(caseStatusHistory.caseId, caseId))
    .orderBy(desc(caseStatusHistory.changedAt));
}

export async function getCaseHearings(caseId: string) {
  return db
    .select()
    .from(hearings)
    .where(eq(hearings.caseId, caseId))
    .orderBy(desc(hearings.hearingAt));
}

export async function getCaseDeadlines(caseId: string) {
  return db
    .select()
    .from(deadlines)
    .where(eq(deadlines.caseId, caseId))
    .orderBy(asc(deadlines.dueAt));
}

export async function getCaseTasks(caseId: string) {
  return db
    .select({
      t: tasks,
      assigneeName: users.fullName,
    })
    .from(tasks)
    .leftJoin(users, eq(tasks.assignedTo, users.id))
    .where(eq(tasks.caseId, caseId))
    .orderBy(desc(tasks.createdAt));
}

export async function getCaseNotes(caseId: string) {
  return db
    .select({
      id: notes.id,
      body: notes.body,
      createdAt: notes.createdAt,
      authorName: users.fullName,
    })
    .from(notes)
    .leftJoin(users, eq(notes.authorId, users.id))
    .where(eq(notes.caseId, caseId))
    .orderBy(desc(notes.createdAt));
}

export async function getCaseDocuments(caseId: string) {
  return db
    .select()
    .from(documents)
    .where(eq(documents.caseId, caseId))
    .orderBy(desc(documents.createdAt));
}

/** Active (non-closed) cases for dashboards/pickers. */
export async function countActiveCases(allowedIds: Ids) {
  const activeCond = or(
    eq(cases.status, "new"),
    eq(cases.status, "in_progress"),
    eq(cases.status, "waiting_client"),
    eq(cases.status, "waiting_court"),
    eq(cases.status, "hearing_scheduled"),
    eq(cases.status, "on_hold")
  );
  const rows = await db
    .select({ id: cases.id })
    .from(cases)
    .where(withScope(activeCond, caseScope(allowedIds)));
  return rows.length;
}
