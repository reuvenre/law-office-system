import { listScheduledHearings, listOpenDeadlines } from "@/lib/data/events";
import { getViewer } from "@/lib/auth/viewer";
import { PageHeader } from "@/components/shared/page-header";
import {
  OfficeCalendar,
  type CalendarEvent,
} from "@/components/hearings/office-calendar";

export const dynamic = "force-dynamic";

export default async function HearingsPage() {
  const viewer = await getViewer();
  const [hearings, deadlines] = await Promise.all([
    listScheduledHearings(viewer.allowedIds),
    listOpenDeadlines(viewer.allowedIds),
  ]);

  const events: CalendarEvent[] = [
    ...hearings.map((h) => ({
      id: `h-${h.id}`,
      at: new Date(h.hearingAt).toISOString(),
      title: h.hearingType || "דיון",
      subtitle: [h.clientName, h.caseTitle, h.location]
        .filter(Boolean)
        .join(" · "),
      href: `/cases/${h.caseId}`,
      kind: "hearing" as const,
      hasTime: true,
    })),
    ...deadlines.map((d) => ({
      id: `d-${d.id}`,
      at: new Date(d.dueAt).toISOString(),
      title: d.title,
      subtitle: [d.clientName, d.caseTitle].filter(Boolean).join(" · "),
      href: `/cases/${d.caseId}`,
      kind: "deadline" as const,
      hasTime: false,
    })),
  ];

  return (
    <div>
      <PageHeader title="יומן המשרד" description="דיונים ומועדים — יומן משותף לכל המשרד" />
      <OfficeCalendar events={events} />
    </div>
  );
}
