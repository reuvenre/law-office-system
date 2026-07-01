import { db } from "@/lib/db";
import { activityLog, users } from "@/lib/db/schema";
import { desc, eq, inArray } from "drizzle-orm";

type Ids = string[] | null;

/** Recent activity. Scoped viewers see only actions by users they can see. */
export async function getRecentActivity(limit = 20, allowedIds: Ids = null) {
  const q = db
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
    .leftJoin(users, eq(activityLog.actorId, users.id));

  const scoped =
    allowedIds === null
      ? q
      : q.where(inArray(activityLog.actorId, allowedIds));

  return scoped.orderBy(desc(activityLog.createdAt)).limit(limit);
}
