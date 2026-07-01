import { db } from "@/lib/db";
import { appSettings } from "@/lib/db/schema";

/** Fetch the singleton settings row, creating defaults on first access. */
export async function getSettings() {
  const rows = await db.select().from(appSettings).limit(1);
  if (rows[0]) return rows[0];
  const [created] = await db.insert(appSettings).values({}).returning();
  return created;
}
