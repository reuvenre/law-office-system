import { db } from "@/lib/db";
import { users } from "@/lib/db/schema";
import { eq, asc } from "drizzle-orm";

export async function listActiveLawyers() {
  return db
    .select({ id: users.id, fullName: users.fullName })
    .from(users)
    .where(eq(users.isActive, true))
    .orderBy(asc(users.fullName));
}

export async function listUsersForSettings() {
  return db
    .select({
      id: users.id,
      fullName: users.fullName,
      email: users.email,
      phone: users.phone,
      role: users.role,
      isActive: users.isActive,
    })
    .from(users)
    .orderBy(asc(users.createdAt));
}
