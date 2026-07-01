import { db } from "@/lib/db";
import { clients, cases } from "@/lib/db/schema";
import { eq, ilike, or } from "drizzle-orm";
import { caseScope, clientScope, withScope } from "@/lib/auth/scope";

type Ids = string[] | null;

export async function globalSearch(q: string, allowedIds: Ids) {
  const like = `%${q.trim()}%`;
  const clientWhere = withScope(
    or(ilike(clients.fullName, like), ilike(clients.idNumber, like)),
    clientScope(allowedIds)
  );
  const caseWhere = withScope(
    or(
      ilike(cases.title, like),
      ilike(cases.caseNumber, like),
      ilike(cases.opposingParty, like),
      ilike(clients.fullName, like)
    ),
    caseScope(allowedIds)
  );

  const [clientRows, caseRows] = await Promise.all([
    db
      .select({ id: clients.id, fullName: clients.fullName, idNumber: clients.idNumber })
      .from(clients)
      .where(clientWhere)
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
      .where(caseWhere)
      .limit(20),
  ]);
  return { clientRows, caseRows };
}
