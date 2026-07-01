import { db } from "@/lib/db";
import { documents } from "@/lib/db/schema";
import { desc, eq } from "drizzle-orm";

export async function getDocument(id: string) {
  const rows = await db
    .select()
    .from(documents)
    .where(eq(documents.id, id))
    .limit(1);
  return rows[0] ?? null;
}

export async function getClientDocuments(clientId: string) {
  return db
    .select()
    .from(documents)
    .where(eq(documents.clientId, clientId))
    .orderBy(desc(documents.createdAt));
}
