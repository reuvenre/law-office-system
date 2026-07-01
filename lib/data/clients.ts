import { db } from "@/lib/db";
import { clients, cases, notes, users } from "@/lib/db/schema";
import { and, desc, eq, ilike, or } from "drizzle-orm";

export async function listClients(search?: string) {
  const base = db.select().from(clients);
  if (search && search.trim()) {
    const q = `%${search.trim()}%`;
    return base
      .where(
        or(
          ilike(clients.fullName, q),
          ilike(clients.idNumber, q),
          ilike(clients.phone, q)
        )
      )
      .orderBy(desc(clients.createdAt));
  }
  return base.orderBy(desc(clients.createdAt));
}

export async function getClient(id: string) {
  const rows = await db
    .select()
    .from(clients)
    .where(eq(clients.id, id))
    .limit(1);
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

export async function getClientCases(clientId: string) {
  return db
    .select()
    .from(cases)
    .where(eq(cases.clientId, clientId))
    .orderBy(desc(cases.createdAt));
}

/**
 * Conflict-of-interest check (spec §6.8): does this name already appear as a
 * client, or as the opposing party in any case? Non-blocking — returns matches
 * for a warning.
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
