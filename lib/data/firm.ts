import { eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { firms, users } from "@/lib/db/schema";
import { DEFAULT_FIRM_ID } from "@/lib/db/schema";
import type { ModuleMap } from "@/lib/plans";

export type FirmRow = {
  id: string;
  name: string;
  licensePlan: string;
  modules: Partial<ModuleMap>;
};

/** Load a firm by id (defaults to the single seeded firm). */
export async function getFirm(firmId: string = DEFAULT_FIRM_ID): Promise<FirmRow> {
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

/** Count active users in a firm (for seat-limit checks). */
export async function countActiveSeats(firmId: string = DEFAULT_FIRM_ID): Promise<number> {
  const rows = await db
    .select({ id: users.id })
    .from(users)
    .where(eq(users.firmId, firmId));
  return rows.length;
}
