import { db } from "@/lib/db";
import { users } from "@/lib/db/schema";
import { eq, and, asc } from "drizzle-orm";

export async function listActiveLawyers(firmId: string) {
  return db
    .select({ id: users.id, fullName: users.fullName })
    .from(users)
    .where(and(eq(users.firmId, firmId), eq(users.isActive, true)))
    .orderBy(asc(users.fullName));
}

/**
 * True when the target user belongs to the caller's firm. Every user-management
 * action must pass this before writing: `isAdmin` only says "an admin of some
 * firm", never "an admin of the firm that owns this row".
 */
export async function isSameFirmUser(userId: string, firmId: string) {
  const [row] = await db
    .select({ id: users.id })
    .from(users)
    .where(and(eq(users.id, userId), eq(users.firmId, firmId)))
    .limit(1);
  return Boolean(row);
}

export async function listUsersForSettings(firmId: string) {
  return db
    .select({
      id: users.id,
      fullName: users.fullName,
      email: users.email,
      phone: users.phone,
      role: users.role,
      isActive: users.isActive,
      isAdmin: users.isAdmin,
      accessScope: users.accessScope,
      visibleUserIds: users.visibleUserIds,
    })
    .from(users)
    .where(eq(users.firmId, firmId))
    .orderBy(asc(users.createdAt));
}
