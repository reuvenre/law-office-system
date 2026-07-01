import Link from "next/link";
import { listScheduledHearings } from "@/lib/data/events";
import { PageHeader } from "@/components/shared/page-header";
import { EmptyState } from "@/components/shared/empty-state";
import { Card, CardContent } from "@/components/ui/card";
import { formatDateTime } from "@/lib/format";

export const dynamic = "force-dynamic";

export default async function HearingsPage() {
  const rows = await listScheduledHearings();

  return (
    <div>
      <PageHeader title="דיונים" description="כל הדיונים המתוכננים" />
      {rows.length === 0 ? (
        <EmptyState title="אין דיונים מתוכננים" />
      ) : (
        <Card>
          <CardContent className="pt-6">
            <ul className="divide-y">
              {rows.map((h) => (
                <li key={h.id} className="flex items-center justify-between gap-3 py-3">
                  <div>
                    <p className="text-sm font-medium" dir="ltr">
                      {formatDateTime(h.hearingAt)}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {h.clientName} · {h.hearingType || "דיון"}
                      {h.location ? ` · ${h.location}` : ""}
                    </p>
                  </div>
                  <Link
                    href={`/cases/${h.caseId}`}
                    className="text-sm text-primary hover:underline"
                  >
                    {h.caseTitle}
                  </Link>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
