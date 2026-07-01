import { db } from "@/lib/db";
import { hearings, deadlines, tasks, cases, clients, users } from "@/lib/db/schema";
import { and, asc, desc, eq, gte, lte, ne } from "drizzle-orm";

/** Hearings within [now, now+days], scheduled, with case/client labels. */
export async function getUpcomingHearings(days = 14) {
  const now = new Date();
  const until = new Date(now.getTime() + days * 86400000);
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
    .where(
      and(
        eq(hearings.status, "scheduled"),
        gte(hearings.hearingAt, now),
        lte(hearings.hearingAt, until)
      )
    )
    .orderBy(asc(hearings.hearingAt));
}

/** Open deadlines within [now, now+days]. */
export async function getUpcomingDeadlines(days = 14) {
  const now = new Date();
  const until = new Date(now.getTime() + days * 86400000);
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
    .where(
      and(
        eq(deadlines.isDone, false),
        gte(deadlines.dueAt, now),
        lte(deadlines.dueAt, until)
      )
    )
    .orderBy(asc(deadlines.dueAt));
}

/** All scheduled hearings (no date cap) — the global agenda for the side nav. */
export async function listScheduledHearings() {
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
    .where(eq(hearings.status, "scheduled"))
    .orderBy(asc(hearings.hearingAt));
}

/** All open deadlines (no date cap). */
export async function listOpenDeadlines() {
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
    .where(eq(deadlines.isDone, false))
    .orderBy(asc(deadlines.dueAt));
}

export async function listTasks(assigneeId?: string) {
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
  return rows.orderBy(desc(tasks.createdAt));
}
