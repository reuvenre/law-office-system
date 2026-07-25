import Link from "next/link";
import { listInvoices } from "@/lib/data/billing";
import { getViewer } from "@/lib/auth/viewer";
import { getFirm } from "@/lib/data/firm";
import { isModuleEnabled } from "@/lib/plans";
import { PageHeader } from "@/components/shared/page-header";
import { EmptyState } from "@/components/shared/empty-state";
import { ModuleLocked } from "@/components/billing/module-locked";
import { InvoiceStatusBadge } from "@/components/shared/status-badge";
import { Card } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { formatDate, formatCurrency } from "@/lib/format";
import { DOC_TYPES, type DocType, type InvoiceStatus } from "@/lib/constants";

export const dynamic = "force-dynamic";

export default async function BillingPage() {
  const viewer = await getViewer();
  const firm = await getFirm(viewer.firmId);

  if (!isModuleEnabled(firm, "billing")) {
    return (
      <div>
        <PageHeader title="חיוב וגבייה" description="מודול החיוב אינו כלול בתוכנית" />
        <ModuleLocked
          title="מודול החיוב אינו פעיל"
          description="מודול החיוב והגבייה (חשבוניות, תשלומים, רישום שעות וריטיינרים) זמין בתוכנית מקצועי ומעלה."
        />
      </div>
    );
  }

  const rows = await listInvoices(viewer.allowedIds);

  return (
    <div>
      <PageHeader title="חיוב וגבייה" description="חשבונות עסקה, חשבוניות ותשלומים" />

      {rows.length === 0 ? (
        <EmptyState
          title="אין מסמכי חיוב"
          description="חשבונות עסקה נוצרים מתוך חיובים בכרטיס התיק."
        />
      ) : (
        <>
          <Card className="hidden md:block">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>מסמך</TableHead>
                  <TableHead>לקוח</TableHead>
                  <TableHead>תיק</TableHead>
                  <TableHead>סכום</TableHead>
                  <TableHead>סטטוס</TableHead>
                  <TableHead>תאריך</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {rows.map((r) => (
                  <TableRow key={r.id}>
                    <TableCell>
                      <Link
                        href={`/billing/${r.id}`}
                        className="font-medium text-primary hover:underline"
                      >
                        {DOC_TYPES[r.docType as DocType]} #{r.docNumber}
                      </Link>
                    </TableCell>
                    <TableCell>{r.clientName || "—"}</TableCell>
                    <TableCell>{r.caseTitle || "—"}</TableCell>
                    <TableCell dir="ltr">{formatCurrency(Number(r.total))}</TableCell>
                    <TableCell>
                      <InvoiceStatusBadge status={r.status as InvoiceStatus} />
                    </TableCell>
                    <TableCell dir="ltr">{formatDate(r.createdAt)}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </Card>

          <div className="space-y-3 md:hidden">
            {rows.map((r) => (
              <Link key={r.id} href={`/billing/${r.id}`}>
                <Card className="space-y-2 p-4">
                  <div className="flex items-start justify-between gap-2">
                    <p className="font-medium text-primary">
                      {DOC_TYPES[r.docType as DocType]} #{r.docNumber}
                    </p>
                    <InvoiceStatusBadge status={r.status as InvoiceStatus} />
                  </div>
                  <p className="text-sm text-muted-foreground">
                    {r.clientName} · <span dir="ltr">{formatCurrency(Number(r.total))}</span>
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
