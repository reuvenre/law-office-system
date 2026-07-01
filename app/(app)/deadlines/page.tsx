import Link from "next/link";
import { listOpenDeadlines } from "@/lib/data/events";
import { PageHeader } from "@/components/shared/page-header";
import { EmptyState } from "@/components/shared/empty-state";
import { PriorityBadge } from "@/components/shared/status-badge";
import { Card, CardContent } from "@/components/ui/card";
import { formatDateTime } from "@/lib/format";
import type { Priority } from "@/lib/constants";

export const dynamic = "force-dynamic";

export default async function DeadlinesPage() {
  const rows = await listOpenDeadlines();

  return (
    <div>
      <PageHeader title="מועדים" description="כל המועדים הפתוחים" />
      {rows.length === 0 ? (
        <EmptyState title="אין מועדים מתקרבים" />
      ) : (
        <Card>
          <CardContent className="pt-6">
            <ul className="divide-y">
              {rows.map((d) => (
                <li key={d.id} className="flex items-center justify-between gap-3 py-3">
                  <div>
                    <p className="text-sm font-medium">{d.title}</p>
                    <p className="text-xs text-muted-foreground" dir="ltr">
                      {formatDateTime(d.dueAt)}
                    </p>
                  </div>
                  <div className="flex items-center gap-3">
                    <PriorityBadge priority={d.priority as Priority} />
                    <Link
                      href={`/cases/${d.caseId}`}
                      className="text-sm text-primary hover:underline"
                    >
                      {d.caseTitle}
                    </Link>
                  </div>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
