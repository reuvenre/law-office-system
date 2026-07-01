import Link from "next/link";
import { Plus, Search } from "lucide-react";
import { listClients } from "@/lib/data/clients";
import { PageHeader } from "@/components/shared/page-header";
import { EmptyState } from "@/components/shared/empty-state";
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
import { CLIENT_TYPES, type ClientType } from "@/lib/constants";

export const dynamic = "force-dynamic";

export default async function ClientsPage({
  searchParams,
}: {
  searchParams: { q?: string };
}) {
  const q = searchParams.q ?? "";
  const rows = await listClients(q);

  return (
    <div>
      <PageHeader
        title="לקוחות"
        description="ניהול לקוחות, חיפוש ופתיחת כרטיס"
        action={
          <Button asChild>
            <Link href="/clients/new">
              <Plus className="h-4 w-4" />
              לקוח חדש
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
            placeholder="חיפוש לפי שם / ת״ז / טלפון"
            className="pr-9"
          />
        </div>
        <Button type="submit" variant="secondary">
          חיפוש
        </Button>
      </form>

      {rows.length === 0 ? (
        <EmptyState
          title="אין לקוחות להצגה"
          description={q ? "לא נמצאו תוצאות לחיפוש." : "התחל בהוספת לקוח ראשון."}
          action={
            <Button asChild>
              <Link href="/clients/new">לקוח חדש</Link>
            </Button>
          }
        />
      ) : (
        <>
          {/* Desktop table */}
          <Card className="hidden md:block">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>שם</TableHead>
                  <TableHead>סוג</TableHead>
                  <TableHead>ת״ז / ח״פ</TableHead>
                  <TableHead>טלפון</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {rows.map((c) => (
                  <TableRow key={c.id} className="cursor-pointer">
                    <TableCell>
                      <Link href={`/clients/${c.id}`} className="font-medium text-primary hover:underline">
                        {c.fullName}
                      </Link>
                    </TableCell>
                    <TableCell>{CLIENT_TYPES[c.clientType as ClientType]}</TableCell>
                    <TableCell dir="ltr" className="text-right">{c.idNumber || "—"}</TableCell>
                    <TableCell dir="ltr" className="text-right">{c.phone || "—"}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </Card>

          {/* Mobile cards */}
          <div className="space-y-3 md:hidden">
            {rows.map((c) => (
              <Link key={c.id} href={`/clients/${c.id}`}>
                <Card className="p-4">
                  <p className="font-medium text-primary">{c.fullName}</p>
                  <p className="mt-1 text-sm text-muted-foreground">
                    {CLIENT_TYPES[c.clientType as ClientType]}
                    {c.phone && (
                      <>
                        {" · "}
                        <span dir="ltr">{c.phone}</span>
                      </>
                    )}
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
