import { and, eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { firms, users } from "@/lib/db/schema";
import type { ModuleMap } from "@/lib/plans";

export type FirmRow = {
  id: string;
  name: string;
  licensePlan: string;
  modules: Partial<ModuleMap>;
};

/** Load a firm by id. */
export async function getFirm(firmId: string): Promise<FirmRow> {
  const [row] = await db.select().from(firms).where(eq(firms.id, firmId)).limit(1);
  if (!row) {
    // The firm row should always exist (seeded); degrade to safe defaults.
    return { id: firmId, name: "המשרד", licensePlan: "basic", modules: {} };
  }
  return {
    id: row.id,
    name: row.name,
    licensePlan: row.licensePlan,
    modules: (row.modules ?? {}) as Partial<ModuleMap>,
  };
}

/**
 * Count active users in a firm (for seat-limit checks). Deactivated users do
 * not occupy a seat — otherwise a firm that lets someone go could never hire
 * their replacement without buying a tier up.
 */
export async function countActiveSeats(firmId: string): Promise<number> {
  const rows = await db
    .select({ id: users.id })
    .from(users)
    .where(and(eq(users.firmId, firmId), eq(users.isActive, true)));
  return rows.length;
}
