import Link from "next/link";
import { Search } from "lucide-react";
import { globalSearch } from "@/lib/data/search";
import { PageHeader } from "@/components/shared/page-header";
import { EmptyState } from "@/components/shared/empty-state";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export const dynamic = "force-dynamic";

export default async function SearchPage({
  searchParams,
}: {
  searchParams: { q?: string };
}) {
  const q = (searchParams.q ?? "").trim();
  const results = q ? await globalSearch(q) : null;

  return (
    <div>
      <PageHeader title="חיפוש גלובלי" description="לקוחות, תיקים, מספרי תיק וצדדים שכנגד" />

      <form method="get" className="mb-6 flex max-w-lg items-center gap-2">
        <div className="relative flex-1">
          <Search className="absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input name="q" defaultValue={q} placeholder="הקלד לחיפוש..." className="pr-9" autoFocus />
        </div>
        <Button type="submit">חיפוש</Button>
      </form>

      {!results ? (
        <p className="text-sm text-muted-foreground">הזן מונח חיפוש כדי להתחיל.</p>
      ) : results.clientRows.length === 0 && results.caseRows.length === 0 ? (
        <EmptyState title="לא נמצאו תוצאות" description={`עבור "${q}"`} />
      ) : (
        <div className="grid gap-4 lg:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">לקוחות ({results.clientRows.length})</CardTitle>
            </CardHeader>
            <CardContent>
              {results.clientRows.length === 0 ? (
                <p className="text-sm text-muted-foreground">—</p>
              ) : (
                <ul className="divide-y">
                  {results.clientRows.map((c) => (
                    <li key={c.id} className="py-2">
                      <Link href={`/clients/${c.id}`} className="text-sm text-primary hover:underline">
                        {c.fullName}
                      </Link>
                      {c.idNumber && (
                        <span className="text-xs text-muted-foreground" dir="ltr">
                          {" "}
                          · {c.idNumber}
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
              <CardTitle className="text-base">תיקים ({results.caseRows.length})</CardTitle>
            </CardHeader>
            <CardContent>
              {results.caseRows.length === 0 ? (
                <p className="text-sm text-muted-foreground">—</p>
              ) : (
                <ul className="divide-y">
                  {results.caseRows.map((c) => (
                    <li key={c.id} className="py-2">
                      <Link href={`/cases/${c.id}`} className="text-sm text-primary hover:underline">
                        {c.title}
                      </Link>
                      <p className="text-xs text-muted-foreground">
                        {c.clientName}
                        {c.opposingParty ? ` · נגד ${c.opposingParty}` : ""}
                      </p>
                    </li>
                  ))}
                </ul>
              )}
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}
