import Link from "next/link";
import { Plus, Search } from "lucide-react";
import { listCases } from "@/lib/data/cases";
import { getViewer } from "@/lib/auth/viewer";
import { PageHeader } from "@/components/shared/page-header";
import { EmptyState } from "@/components/shared/empty-state";
import { CaseStatusBadge } from "@/components/shared/status-badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Card } from "@/components/ui/card";
import { PRACTICE_AREAS, type PracticeArea, type CaseStatus } from "@/lib/constants";

export const dynamic = "force-dynamic";

export default async function CasesPage({
  searchParams,
}: {
  searchParams: { q?: string };
}) {
  const q = searchParams.q ?? "";
  const viewer = await getViewer();
  const rows = await listCases(viewer.allowedIds, q);

  return (
    <div>
      <PageHeader
        title="תיקים"
        description="ניהול תיקים לפי תחום, סטטוס ולקוח"
        action={
          <Button asChild>
            <Link href="/cases/new">
              <Plus className="h-4 w-4" />
              תיק חדש
            </Link>
          </Button>
        }
      />

      <form method="get" className="mb-4 flex max-w-sm items-center gap-2">
        <div className="relative flex-1">
          <Search className="absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            name="q"
            defaultValue={q}
            placeholder="חיפוש לפי כותרת / מספר / צד שכנגד / לקוח"
            className="pr-9"
          />
        </div>
        <Button type="submit" variant="secondary">
          חיפוש
        </Button>
      </form>

      {rows.length === 0 ? (
        <EmptyState
          title="אין תיקים להצגה"
          description={q ? "לא נמצאו תוצאות." : "התחל בפתיחת תיק ראשון."}
          action={
            <Button asChild>
              <Link href="/cases/new">תיק חדש</Link>
            </Button>
          }
        />
      ) : (
        <>
          <Card className="hidden md:block">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>כותרת</TableHead>
                  <TableHead>לקוח</TableHead>
                  <TableHead>תחום</TableHead>
                  <TableHead>סטטוס</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {rows.map((c) => (
                  <TableRow key={c.id}>
                    <TableCell>
                      <Link href={`/cases/${c.id}`} className="font-medium text-primary hover:underline">
                        {c.title}
                      </Link>
                    </TableCell>
                    <TableCell>{c.clientName || "—"}</TableCell>
                    <TableCell>{PRACTICE_AREAS[c.practiceArea as PracticeArea]}</TableCell>
                    <TableCell>
                      <CaseStatusBadge status={c.status as CaseStatus} />
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </Card>

          <div className="space-y-3 md:hidden">
            {rows.map((c) => (
              <Link key={c.id} href={`/cases/${c.id}`}>
                <Card className="space-y-2 p-4">
                  <div className="flex items-start justify-between gap-2">
                    <p className="font-medium text-primary">{c.title}</p>
                    <CaseStatusBadge status={c.status as CaseStatus} />
                  </div>
                  <p className="text-sm text-muted-foreground">
                    {c.clientName} · {PRACTICE_AREAS[c.practiceArea as PracticeArea]}
                  </p>
                </Card>
              </Link>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
