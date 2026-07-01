import { db } from "@/lib/db";
import { hearings, deadlines, tasks, cases, clients, users } from "@/lib/db/schema";
import { and, asc, desc, eq, gte, lte, ne } from "drizzle-orm";
import { caseScope, taskScope, withScope } from "@/lib/auth/scope";

type Ids = string[] | null;

export async function getUpcomingHearings(days = 14, allowedIds: Ids = null) {
  const now = new Date();
  const until = new Date(now.getTime() + days * 86400000);
  const where = withScope(
    and(
      eq(hearings.status, "scheduled"),
      gte(hearings.hearingAt, now),
      lte(hearings.hearingAt, until)
    ),
    caseScope(allowedIds)
  );
  return db
    .select({
      id: hearings.id,
      caseId: hearings.caseId,
      hearingAt: hearings.hearingAt,
      location: hearings.location,
      hearingType: hearings.hearingType,
      status: hearings.status,
      caseTitle: cases.title,
      clientName: clients.fullName,
    })
    .from(hearings)
    .leftJoin(cases, eq(hearings.caseId, cases.id))
    .leftJoin(clients, eq(cases.clientId, clients.id))
    .where(where)
    .orderBy(asc(hearings.hearingAt));
}

export async function getUpcomingDeadlines(days = 14, allowedIds: Ids = null) {
  const now = new Date();
  const until = new Date(now.getTime() + days * 86400000);
  const where = withScope(
    and(
      eq(deadlines.isDone, false),
      gte(deadlines.dueAt, now),
      lte(deadlines.dueAt, until)
    ),
    caseScope(allowedIds)
  );
  return db
    .select({
      id: deadlines.id,
      caseId: deadlines.caseId,
      title: deadlines.title,
      dueAt: deadlines.dueAt,
      priority: deadlines.priority,
      isDone: deadlines.isDone,
      caseTitle: cases.title,
      clientName: clients.fullName,
    })
    .from(deadlines)
    .leftJoin(cases, eq(deadlines.caseId, cases.id))
    .leftJoin(clients, eq(cases.clientId, clients.id))
    .where(where)
    .orderBy(asc(deadlines.dueAt));
}

export async function listScheduledHearings(allowedIds: Ids = null) {
  const where = withScope(eq(hearings.status, "scheduled"), caseScope(allowedIds));
  return db
    .select({
      id: hearings.id,
      caseId: hearings.caseId,
      hearingAt: hearings.hearingAt,
      location: hearings.location,
      hearingType: hearings.hearingType,
      status: hearings.status,
      caseTitle: cases.title,
      clientName: clients.fullName,
    })
    .from(hearings)
    .leftJoin(cases, eq(hearings.caseId, cases.id))
    .leftJoin(clients, eq(cases.clientId, clients.id))
    .where(where)
    .orderBy(asc(hearings.hearingAt));
}

export async function listOpenDeadlines(allowedIds: Ids = null) {
  const where = withScope(eq(deadlines.isDone, false), caseScope(allowedIds));
  return db
    .select({
      id: deadlines.id,
      caseId: deadlines.caseId,
      title: deadlines.title,
      dueAt: deadlines.dueAt,
      priority: deadlines.priority,
      isDone: deadlines.isDone,
      caseTitle: cases.title,
      clientName: clients.fullName,
    })
    .from(deadlines)
    .leftJoin(cases, eq(deadlines.caseId, cases.id))
    .leftJoin(clients, eq(cases.clientId, clients.id))
    .where(where)
    .orderBy(asc(deadlines.dueAt));
}

export async function listTasks(assigneeId?: string, allowedIds: Ids = null) {
  const rows = db
    .select({
      t: tasks,
      assigneeName: users.fullName,
      caseTitle: cases.title,
    })
    .from(tasks)
    .leftJoin(users, eq(tasks.assignedTo, users.id))
    .leftJoin(cases, eq(tasks.caseId, cases.id));

  if (assigneeId) {
    return rows
      .where(and(eq(tasks.assignedTo, assigneeId), ne(tasks.status, "done")))
      .orderBy(asc(tasks.dueAt));
  }
  const scope = taskScope(allowedIds);
  return (scope ? rows.where(scope) : rows).orderBy(desc(tasks.createdAt));
}
