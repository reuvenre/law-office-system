import { db } from "@/lib/db";
import { activityLog, users } from "@/lib/db/schema";
import { desc, eq } from "drizzle-orm";

export async function getRecentActivity(limit = 20) {
  return db
    .select({
      id: activityLog.id,
      action: activityLog.action,
      entityType: activityLog.entityType,
      entityId: activityLog.entityId,
      metadata: activityLog.metadata,
      createdAt: activityLog.createdAt,
      actorName: users.fullName,
    })
    .from(activityLog)
    .leftJoin(users, eq(activityLog.actorId, users.id))
    .orderBy(desc(activityLog.createdAt))
    .limit(limit);
}
