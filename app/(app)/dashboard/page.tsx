import Link from "next/link";
import { getViewer } from "@/lib/auth/viewer";
import {
  getUpcomingHearings,
  getUpcomingDeadlines,
  listTasks,
} from "@/lib/data/events";
import { countActiveCases } from "@/lib/data/cases";
import { getRecentActivity } from "@/lib/data/activity";
import { PageHeader } from "@/components/shared/page-header";
import { ActivityFeed } from "@/components/shared/activity-feed";
import { PriorityBadge } from "@/components/shared/status-badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formatDate, formatDateTime } from "@/lib/format";
import type { Priority } from "@/lib/constants";

export const dynamic = "force-dynamic";

function StatCard({ label, value }: { label: string; value: number | string }) {
  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-medium text-muted-foreground">
          {label}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <p className="font-heading text-3xl font-bold text-primary">{value}</p>
      </CardContent>
    </Card>
  );
}

export default async function DashboardPage() {
  const viewer = await getViewer();
  const [weekHearings, deadlines14, activeCases, myTasks, activity] =
    await Promise.all([
      getUpcomingHearings(7, viewer.allowedIds),
      getUpcomingDeadlines(14, viewer.allowedIds),
      countActiveCases(viewer.allowedIds),
      listTasks(viewer.id),
      getRecentActivity(15, viewer.allowedIds),
    ]);

  return (
    <div>
      <PageHeader title={`שלום, ${viewer.name}`} description="מבט מהיר על המשרד" />

      <div className="mb-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard label="דיונים השבוע" value={weekHearings.length} />
        <StatCard label="מועדים מתקרבים" value={deadlines14.length} />
        <StatCard label="תיקים פעילים" value={activeCases} />
        <StatCard label="המשימות שלי" value={myTasks.length} />
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">דיונים השבוע</CardTitle>
          </CardHeader>
          <CardContent>
            {weekHearings.length === 0 ? (
              <p className="text-sm text-muted-foreground">אין דיונים השבוע</p>
            ) : (
              <ul className="divide-y">
                {weekHearings.map((h) => (
                  <li key={h.id} className="flex items-center justify-between gap-3 py-2">
                    <Link href={`/cases/${h.caseId}`} className="text-sm text-primary hover:underline">
                      {h.caseTitle}
                    </Link>
                    <span className="text-xs text-muted-foreground" dir="ltr">
                      {formatDateTime(h.hearingAt)}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">מועדים מתקרבים (14 יום)</CardTitle>
          </CardHeader>
          <CardContent>
            {deadlines14.length === 0 ? (
              <p className="text-sm text-muted-foreground">אין מועדים מתקרבים</p>
            ) : (
              <ul className="divide-y">
                {deadlines14.map((d) => (
                  <li
                    key={d.id}
                    className={`flex items-center justify-between gap-3 py-2 ${
                      d.priority === "critical" ? "rounded bg-destructive/5 px-2" : ""
                    }`}
                  >
                    <Link href={`/cases/${d.caseId}`} className="min-w-0 text-sm text-primary hover:underline">
                      {d.title}
                    </Link>
                    <div className="flex items-center gap-2">
                      <PriorityBadge priority={d.priority as Priority} />
                      <span className="text-xs text-muted-foreground" dir="ltr">
                        {formatDate(d.dueAt)}
                      </span>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">המשימות שלי</CardTitle>
          </CardHeader>
          <CardContent>
            {myTasks.length === 0 ? (
              <p className="text-sm text-muted-foreground">אין משימות פתוחות</p>
            ) : (
              <ul className="divide-y">
                {myTasks.map(({ t }) => (
                  <li key={t.id} className="flex items-center justify-between gap-3 py-2">
                    <span className="text-sm">{t.title}</span>
                    {t.dueAt && (
                      <span className="text-xs text-muted-foreground" dir="ltr">
                        {formatDate(t.dueAt)}
                      </span>
                    )}
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">פעילות אחרונה</CardTitle>
          </CardHeader>
          <CardContent>
            <ActivityFeed items={activity} />
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
