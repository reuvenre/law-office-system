import { db } from "@/lib/db";
import { clients, cases, notes, users } from "@/lib/db/schema";
import { and, desc, eq, ilike, or } from "drizzle-orm";
import { caseScope, clientScope, withScope } from "@/lib/auth/scope";

type Ids = string[] | null;

export async function listClients(allowedIds: Ids, search?: string) {
  const searchCond =
    search && search.trim()
      ? or(
          ilike(clients.fullName, `%${search.trim()}%`),
          ilike(clients.idNumber, `%${search.trim()}%`),
          ilike(clients.phone, `%${search.trim()}%`)
        )
      : undefined;
  const where = withScope(searchCond, clientScope(allowedIds));
  const q = db.select().from(clients);
  return (where ? q.where(where) : q).orderBy(desc(clients.createdAt));
}

export async function getClient(id: string, allowedIds: Ids) {
  const where = withScope(eq(clients.id, id), clientScope(allowedIds));
  const rows = await db.select().from(clients).where(where).limit(1);
  return rows[0] ?? null;
}

export async function getClientNotes(clientId: string) {
  return db
    .select({
      id: notes.id,
      body: notes.body,
      createdAt: notes.createdAt,
      authorName: users.fullName,
    })
    .from(notes)
    .leftJoin(users, eq(notes.authorId, users.id))
    .where(eq(notes.clientId, clientId))
    .orderBy(desc(notes.createdAt));
}

export async function getClientCases(clientId: string, allowedIds: Ids) {
  const where = withScope(eq(cases.clientId, clientId), caseScope(allowedIds));
  return db
    .select()
    .from(cases)
    .where(where)
    .orderBy(desc(cases.createdAt));
}

/**
 * Conflict-of-interest check (spec §6.8) — intentionally firm-wide regardless
 * of the viewer's scope, so conflicts are never missed.
 */
export async function checkNameConflicts(name: string) {
  const q = `%${name.trim()}%`;
  const [clientMatches, opposingMatches] = await Promise.all([
    db
      .select({ id: clients.id, fullName: clients.fullName })
      .from(clients)
      .where(ilike(clients.fullName, q))
      .limit(5),
    db
      .select({ id: cases.id, title: cases.title, opposingParty: cases.opposingParty })
      .from(cases)
      .where(and(ilike(cases.opposingParty, q)))
      .limit(5),
  ]);
  return { clientMatches, opposingMatches };
}
