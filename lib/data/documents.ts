import { db } from "@/lib/db";
import { documents } from "@/lib/db/schema";
import { desc, eq } from "drizzle-orm";
import { documentScope, withScope, type ViewerScope } from "@/lib/auth/scope";

type Ids = ViewerScope;

export async function getDocument(id: string, allowedIds: Ids) {
  const where = withScope(eq(documents.id, id), documentScope(allowedIds));
  const rows = await db.select().from(documents).where(where).limit(1);
  return rows[0] ?? null;
}

export async function getClientDocuments(clientId: string) {
  return db
    .select()
    .from(documents)
    .where(eq(documents.clientId, clientId))
    .orderBy(desc(documents.createdAt));
}
