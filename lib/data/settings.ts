import { eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { appSettings } from "@/lib/db/schema";

/**
 * Fetch a firm's settings row, creating defaults on first access.
 *
 * Per firm, not global: these templates are the text a firm's own clients
 * receive by WhatsApp/SMS, so one firm editing them must never change what
 * another firm's clients are sent.
 */
export async function getSettings(firmId: string) {
  const rows = await db
    .select()
    .from(appSettings)
    .where(eq(appSettings.firmId, firmId))
    .limit(1);
  if (rows[0]) return rows[0];
  const [created] = await db.insert(appSettings).values({ firmId }).returning();
  return created;
}
