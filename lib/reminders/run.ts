import { and, eq, gt, gte, lte } from "drizzle-orm";
import { db } from "@/lib/db";
import {
  hearings,
  deadlines,
  cases,
  clients,
  messageLog,
} from "@/lib/db/schema";
import { getSettings } from "@/lib/data/settings";
import { getChannel } from "@/lib/messaging/providers";
import { renderTemplate } from "@/lib/messaging/templates";
import { formatDate } from "@/lib/format";

type ReminderChannel = "whatsapp" | "sms" | "email";

function daysUntil(date: Date | string): number {
  const ms = new Date(date).getTime() - Date.now();
  return Math.floor(ms / 86400000);
}

function timeHM(date: Date | string): string {
  return new Intl.DateTimeFormat("he-IL", {
    hour: "2-digit",
    minute: "2-digit",
    timeZone: "Asia/Jerusalem",
  }).format(new Date(date));
}

type Summary = { processed: number; sent: number; skipped: number; failed: number };

async function dispatch(
  params: {
    clientId: string;
    caseId: string | null;
    phone: string | null;
    email: string | null;
    consent: boolean;
    channel: ReminderChannel;
    triggerType: "hearing" | "deadline";
    triggerRefId: string;
    text: string;
  },
  summary: Summary
) {
  summary.processed++;
  if (!params.consent) return void summary.skipped++;
  const recipient = params.channel === "email" ? params.email : params.phone;
  if (!recipient) return void summary.skipped++;

  const cutoff = new Date(Date.now() - 20 * 3600 * 1000);
  const existing = await db
    .select({ id: messageLog.id })
    .from(messageLog)
    .where(
      and(
        eq(messageLog.triggerType, params.triggerType),
        eq(messageLog.triggerRefId, params.triggerRefId),
        gt(messageLog.sentAt, cutoff)
      )
    )
    .limit(1);
  if (existing.length > 0) return void summary.skipped++;

  const [row] = await db
    .insert(messageLog)
    .values({
      clientId: params.clientId,
      caseId: params.caseId,
      triggerType: params.triggerType,
      triggerRefId: params.triggerRefId,
      channel: params.channel,
      renderedText: params.text,
      status: "queued",
    })
    .returning({ id: messageLog.id });

  const result = await getChannel(params.channel).send(recipient, params.text);

  await db
    .update(messageLog)
    .set({
      status: result.status,
      providerResponse: result.providerResponse as object,
      sentAt: new Date(),
    })
    .where(eq(messageLog.id, row.id));

  if (result.status === "sent") summary.sent++;
  else summary.failed++;
}

/** Daily reminder scan (spec §8 / appendix ג'), configurable via app_settings. */
export async function runDailyReminders(): Promise<Summary> {
  const summary: Summary = { processed: 0, sent: 0, skipped: 0, failed: 0 };
  const settings = await getSettings();
  const now = new Date();
  const horizon = new Date(now.getTime() + 10 * 86400000);

  const upcomingHearings = await db
    .select({
      id: hearings.id,
      hearingAt: hearings.hearingAt,
      caseId: hearings.caseId,
      caseTitle: cases.title,
      court: cases.court,
      clientId: clients.id,
      clientName: clients.fullName,
      phone: clients.phone,
      email: clients.email,
      consent: clients.reminderConsent,
      channel: clients.reminderChannel,
    })
    .from(hearings)
    .leftJoin(cases, eq(hearings.caseId, cases.id))
    .leftJoin(clients, eq(cases.clientId, clients.id))
    .where(
      and(
        eq(hearings.status, "scheduled"),
        gte(hearings.hearingAt, now),
        lte(hearings.hearingAt, horizon)
      )
    );

  for (const h of upcomingHearings) {
    if (!settings.hearingDaysBefore.includes(daysUntil(h.hearingAt))) continue;
    if (!h.clientId) continue;
    const text = renderTemplate(settings.hearingTemplate, {
      client_name: h.clientName ?? "",
      case_title: h.caseTitle ?? "",
      date: formatDate(h.hearingAt),
      time: timeHM(h.hearingAt),
      court: h.court ? `, ב${h.court}` : "",
    });
    await dispatch(
      {
        clientId: h.clientId,
        caseId: h.caseId,
        phone: h.phone,
        email: h.email,
        consent: h.consent ?? false,
        channel: (h.channel ?? settings.defaultChannel) as ReminderChannel,
        triggerType: "hearing",
        triggerRefId: h.id,
        text,
      },
      summary
    );
  }

  const upcomingDeadlines = await db
    .select({
      id: deadlines.id,
      title: deadlines.title,
      dueAt: deadlines.dueAt,
      priority: deadlines.priority,
      caseId: deadlines.caseId,
      caseTitle: cases.title,
      clientId: clients.id,
      clientName: clients.fullName,
      phone: clients.phone,
      email: clients.email,
      consent: clients.reminderConsent,
      channel: clients.reminderChannel,
    })
    .from(deadlines)
    .leftJoin(cases, eq(deadlines.caseId, cases.id))
    .leftJoin(clients, eq(cases.clientId, clients.id))
    .where(
      and(
        eq(deadlines.isDone, false),
        gte(deadlines.dueAt, now),
        lte(deadlines.dueAt, horizon)
      )
    );

  for (const dl of upcomingDeadlines) {
    const d = daysUntil(dl.dueAt);
    const windows =
      dl.priority === "critical"
        ? settings.deadlineCriticalDays
        : dl.priority === "high"
          ? settings.deadlineHighDays
          : [];
    if (!windows.includes(d) || !dl.clientId) continue;
    const text = renderTemplate(settings.deadlineTemplate, {
      client_name: dl.clientName ?? "",
      case_title: dl.caseTitle ?? "",
      title: dl.title,
      date: formatDate(dl.dueAt),
    });
    await dispatch(
      {
        clientId: dl.clientId,
        caseId: dl.caseId,
        phone: dl.phone,
        email: dl.email,
        consent: dl.consent ?? false,
        channel: (dl.channel ?? settings.defaultChannel) as ReminderChannel,
        triggerType: "deadline",
        triggerRefId: dl.id,
        text,
      },
      summary
    );
  }

  return summary;
}
