import Link from "next/link";
import { notFound } from "next/navigation";
import { getInvoice } from "@/lib/data/billing";
import { getViewer } from "@/lib/auth/viewer";
import { getFirm } from "@/lib/data/firm";
import { isModuleEnabled } from "@/lib/plans";
import { cancelInvoiceAction } from "@/app/(app)/billing/actions";
import { PageHeader } from "@/components/shared/page-header";
import { EmptyState } from "@/components/shared/empty-state";
import { InvoiceStatusBadge } from "@/components/shared/status-badge";
import { ConfirmDeleteButton } from "@/components/shared/confirm-delete-button";
import { RecordPaymentForm } from "@/components/billing/record-payment-form";
import { IssueInvoiceDialog } from "@/components/billing/issue-invoice-dialog";
import { PrintInvoiceButton } from "@/components/billing/print-invoice-button";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { formatDate, formatDateTime, formatCurrency } from "@/lib/format";
import {
  DOC_TYPES,
  PAYMENT_METHODS,
  type DocType,
  type InvoiceStatus,
  type PaymentMethod,
} from "@/lib/constants";

export const dynamic = "force-dynamic";

function Detail({
  label,
  value,
  ltr,
}: {
  label: string;
  value?: string | null;
  ltr?: boolean;
}) {
  return (
    <div>
      <dt className="text-xs text-muted-foreground">{label}</dt>
      <dd className="text-sm" dir={ltr ? "ltr" : undefined}>
        {value || "—"}
      </dd>
    </div>
  );
}

export default async function InvoiceDetailPage({
  params,
}: {
  params: Promise<{ invoiceId: string }>;
}) {
  const { invoiceId } = await params;
  const viewer = await getViewer();
  const firm = await getFirm(viewer.firmId);
  if (!isModuleEnabled(firm, "billing")) notFound();
  const inv = await getInvoice(invoiceId, viewer);
  if (!inv) notFound();

  const canManage =
    viewer.isAdmin || viewer.role === "admin" || viewer.role === "accountant";
  const status = inv.status as InvoiceStatus;
  const isCancelled = status === "cancelled";
  const isPaid = status === "paid";
  const isProforma = inv.docType === "proforma";

  return (
    <div>
      <PageHeader
        title={`${DOC_TYPES[inv.docType as DocType]} #${inv.docNumber}`}
        description={inv.clientName ?? ""}
        action={
          <div className="flex flex-wrap items-center gap-2">
            <InvoiceStatusBadge status={status} />
            <PrintInvoiceButton />
            <Button asChild variant="outline" size="sm" className="print-hide">
              <Link href="/billing">חזרה לרשימה</Link>
            </Button>
            {canManage && isProforma && !isCancelled && (
              <span className="print-hide">
                <IssueInvoiceDialog proformaId={inv.id} />
              </span>
            )}
            {canManage && !isCancelled && (
              <span className="print-hide">
                <ConfirmDeleteButton
                  action={cancelInvoiceAction.bind(null, inv.id)}
                  triggerLabel="ביטול מסמך"
                  title="ביטול מסמך"
                  description="המסמך יסומן כמבוטל (לא נמחק — כללי מס). הפעולה תתועד."
                />
              </span>
            )}
          </div>
        }
      />

      <div className="grid gap-4 lg:grid-cols-3 print-stack">
        <Card className="lg:col-span-2 print-flat">
          <CardHeader>
            <CardTitle className="text-base">שורות</CardTitle>
          </CardHeader>
          <CardContent>
            {inv.lines.length === 0 ? (
              <EmptyState title="אין שורות" />
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>תיאור</TableHead>
                    <TableHead>כמות</TableHead>
                    <TableHead>מחיר יח׳</TableHead>
                    <TableHead>סה״כ</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {inv.lines.map((l) => (
                    <TableRow key={l.id}>
                      <TableCell>{l.description}</TableCell>
                      <TableCell dir="ltr">{Number(l.quantity)}</TableCell>
                      <TableCell dir="ltr">
                        {formatCurrency(Number(l.unitPrice))}
                      </TableCell>
                      <TableCell dir="ltr">
                        {formatCurrency(Number(l.lineTotal))}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}

            <dl className="mt-4 space-y-1 border-t pt-4 text-sm">
              <div className="flex justify-between">
                <dt className="text-muted-foreground">לפני מע״מ</dt>
                <dd dir="ltr">{formatCurrency(Number(inv.subtotal))}</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-muted-foreground">
                  מע״מ ({Number(inv.vatRate)}%)
                </dt>
                <dd dir="ltr">{formatCurrency(Number(inv.vatAmount))}</dd>
              </div>
              <div className="flex justify-between text-base font-semibold">
                <dt>סה״כ לתשלום</dt>
                <dd dir="ltr">{formatCurrency(Number(inv.total))}</dd>
              </div>
              <div className="flex justify-between text-success">
                <dt>שולם</dt>
                <dd dir="ltr">{formatCurrency(inv.totalPaid)}</dd>
              </div>
              {inv.balance > 0 && !isCancelled && (
                <div className="flex justify-between font-medium text-warning">
                  <dt>יתרה</dt>
                  <dd dir="ltr">{formatCurrency(inv.balance)}</dd>
                </div>
              )}
            </dl>
          </CardContent>
        </Card>

        <Card className="lg:col-span-1">
          <CardHeader>
            <CardTitle className="text-base">פרטים</CardTitle>
          </CardHeader>
          <CardContent>
            <dl className="grid grid-cols-2 gap-4">
              <Detail label="לקוח" value={inv.clientName} />
              <Detail label="תיק" value={inv.caseTitle} />
              <Detail label="הופק ע״י" value={inv.createdByName} />
              <Detail label="נוצר" value={formatDate(inv.createdAt)} ltr />
              {inv.allocationNumber && (
                <Detail label="מספר הקצאה" value={inv.allocationNumber} ltr />
              )}
              {inv.issuedAt && (
                <Detail label="הופק ב" value={formatDate(inv.issuedAt)} ltr />
              )}
              {inv.dueDate && (
                <Detail label="לתשלום עד" value={formatDate(inv.dueDate)} ltr />
              )}
              {inv.paidAt && (
                <Detail label="שולם ב" value={formatDate(inv.paidAt)} ltr />
              )}
            </dl>

            {inv.relatedDocs.length > 0 && (
              <div className="mt-4 border-t pt-4">
                <p className="mb-2 text-xs text-muted-foreground">
                  מסמכים מקושרים
                </p>
                <ul className="space-y-1">
                  {inv.relatedDocs.map((d) => (
                    <li key={d.id}>
                      <Link
                        href={`/billing/${d.id}`}
                        className="text-sm text-primary hover:underline"
                      >
                        {DOC_TYPES[d.docType as DocType]} #{d.docNumber}
                      </Link>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <Card className="mt-4">
        <CardHeader>
          <CardTitle className="text-base">
            תשלומים ({inv.payments.length})
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {canManage && !isCancelled && !isPaid && (
            <RecordPaymentForm invoiceId={inv.id} defaultAmount={inv.balance} />
          )}
          {inv.payments.length === 0 ? (
            <EmptyState title="טרם התקבלו תשלומים" />
          ) : (
            <ul className="divide-y">
              {inv.payments.map((p) => (
                <li
                  key={p.id}
                  className="flex items-center justify-between gap-3 py-3"
                >
                  <div>
                    <p className="text-sm font-medium" dir="ltr">
                      {formatCurrency(Number(p.amount))}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {PAYMENT_METHODS[p.method as PaymentMethod]}
                      {p.reference ? ` · ${p.reference}` : ""}
                      {p.provider ? ` · ${p.provider}` : ""}
                    </p>
                  </div>
                  <p className="text-xs text-muted-foreground" dir="ltr">
                    {formatDateTime(p.receivedAt)}
                  </p>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
