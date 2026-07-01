import { db } from "@/lib/db";
import { activityLog } from "@/lib/db/schema";

type EntityType =
  | "client"
  | "case"
  | "document"
  | "hearing"
  | "deadline"
  | "task"
  | "note";

type Action = "create" | "update" | "delete" | "send_reminder" | "drive_sync";

/**
 * Append to the immutable activity_log (spec §4.10 / §3.3).
 * Every meaningful mutation records who did what, when.
 */
export async function logActivity(params: {
  actorId: string;
  entityType: EntityType;
  entityId?: string;
  action: Action;
  metadata?: Record<string, unknown>;
}) {
  await db.insert(activityLog).values({
    actorId: params.actorId,
    entityType: params.entityType,
    entityId: params.entityId,
    action: params.action,
    metadata: params.metadata ?? {},
  });
}
