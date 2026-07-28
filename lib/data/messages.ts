import { and, desc, eq, gte } from "drizzle-orm";
import { db } from "@/lib/db";
import { clients, messageLog } from "@/lib/db/schema";

/**
 * Reminders that failed to reach a client in the last N days.
 *
 * These were being written to message_log and read by nothing: a client who
 * never got their hearing reminder was invisible in the UI. For a law office
 * that is the failure mode with actual consequences — a missed court date.
 *
 * Scoped through clients, since message_log carries no firm_id of its own.
 */
export async function recentFailedReminders(firmId: string, days = 7) {
  const since = new Date(Date.now() - days * 86400000);
  return db
    .select({
      id: messageLog.id,
      clientId: messageLog.clientId,
      clientName: clients.fullName,
      channel: messageLog.channel,
      triggerType: messageLog.triggerType,
      sentAt: messageLog.sentAt,
      createdAt: messageLog.createdAt,
    })
    .from(messageLog)
    .innerJoin(clients, eq(messageLog.clientId, clients.id))
    .where(
      and(
        eq(clients.firmId, firmId),
        eq(messageLog.status, "failed"),
        gte(messageLog.createdAt, since)
      )
    )
    .orderBy(desc(messageLog.createdAt))
    .limit(20);
}
