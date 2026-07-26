import { db } from "@/lib/db";
import { activityLog, users } from "@/lib/db/schema";
import { desc, eq, inArray } from "drizzle-orm";
import type { ViewerScope } from "@/lib/auth/scope";

/**
 * Recent activity. Always bounded to the firm's users (activity_log has no
 * firm_id, so tenant isolation goes through actorId); scoped viewers see only
 * actions by users they may see.
 */
export async function getRecentActivity(limit = 20, scope: ViewerScope) {
  const firmUserIds = db
    .select({ id: users.id })
    .from(users)
    .where(eq(users.firmId, scope.firmId));

  const actorCond =
    scope.allowedIds === null
      ? inArray(activityLog.actorId, firmUserIds)
      : inArray(activityLog.actorId, scope.allowedIds);

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
    .where(actorCond)
    .orderBy(desc(activityLog.createdAt))
    .limit(limit);
}
