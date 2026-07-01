import { db } from "@/lib/db";
import { clients, cases } from "@/lib/db/schema";
import { eq, ilike, or } from "drizzle-orm";

export async function globalSearch(q: string) {
  const like = `%${q.trim()}%`;
  const [clientRows, caseRows] = await Promise.all([
    db
      .select({ id: clients.id, fullName: clients.fullName, idNumber: clients.idNumber })
      .from(clients)
      .where(or(ilike(clients.fullName, like), ilike(clients.idNumber, like)))
      .limit(20),
    db
      .select({
        id: cases.id,
        title: cases.title,
        caseNumber: cases.caseNumber,
        opposingParty: cases.opposingParty,
        clientName: clients.fullName,
      })
      .from(cases)
      .leftJoin(clients, eq(cases.clientId, clients.id))
      .where(
        or(
          ilike(cases.title, like),
          ilike(cases.caseNumber, like),
          ilike(cases.opposingParty, like),
          ilike(clients.fullName, like)
        )
      )
      .limit(20),
  ]);
  return { clientRows, caseRows };
}
