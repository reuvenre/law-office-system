import { requirePortalSession } from "@/lib/portal/session";
import {
  portalCases,
  portalHearings,
  portalInvoices,
  portalDocuments,
} from "@/lib/portal/data";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { CaseStatusBadge, InvoiceStatusBadge } from "@/components/shared/status-badge";
import { EmptyState } from "@/components/shared/empty-state";
import { formatDate, formatDateTime, formatCurrency } from "@/lib/format";
import { isPaymentsEnabled } from "@/lib/payments/providers";
import { isPayableInvoiceStatus } from "@/lib/erp/calc";
import {
  PRACTICE_AREAS,
  DOC_TYPES,
  DOCUMENT_CATEGORIES,
  type PracticeArea,
  type CaseStatus,
  type DocType,
  type InvoiceStatus,
  type DocumentCategory,
} from "@/lib/constants";

export const dynamic = "force-dynamic";

export default async function PortalPage() {
  const session = await requirePortalSession();
  const [cases, hearings, invoices, docs] = await Promise.all([
    portalCases(session.clientId, session.firmId),
    portalHearings(session.clientId, session.firmId),
    portalInvoices(session.clientId, session.firmId),
    portalDocuments(session.clientId, session.firmId),
  ]);

  // No configured provider means no working pay button — don't offer one.
  const canPayOnline = isPaymentsEnabled();
  const hasPayable = invoices.some((i) => isPayableInvoiceStatus(i.status));

  return (
    <div className="space-y-4">
      <div className="py-2">
        <h1 className="font-heading text-xl font-bold text-primary">
          שלום {session.clientName}
        </h1>
        <p className="text-sm text-muted-foreground">
          כאן תוכלו לעקוב אחר התיקים שלכם, דיונים קרובים, מסמכים ותשלומים.
        </p>
      </div>

      {/* Cases */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">התיקים שלי ({cases.length})</CardTitle>
        </CardHeader>
        <CardContent>
          {cases.length === 0 ? (
            <EmptyState title="אין תיקים להצגה" />
          ) : (
            <ul className="divide-y">
              {cases.map((c) => (
                <li key={c.id} className="flex items-center justify-between gap-3 py-3">
                  <div className="min-w-0">
                    <p className="text-sm font-medium">{c.title}</p>
                    <p className="text-xs text-muted-foreground">
                      {PRACTICE_AREAS[c.practiceArea as PracticeArea]} · נפתח{" "}
                      {formatDate(c.openedAt)}
                    </p>
                  </div>
                  <CaseStatusBadge status={c.status as CaseStatus} />
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>

      {/* Upcoming hearings */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">דיונים קרובים ({hearings.length})</CardTitle>
        </CardHeader>
        <CardContent>
          {hearings.length === 0 ? (
            <EmptyState title="אין דיונים קרובים" />
          ) : (
            <ul className="divide-y">
              {hearings.map((h) => (
                <li key={h.id} className="py-3">
                  <p className="text-sm font-medium" dir="ltr">
                    {formatDateTime(h.hearingAt)}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {h.caseTitle}
                    {h.location ? ` · ${h.location}` : ""}
                  </p>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>

      {/* Payments */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">תשלומים</CardTitle>
        </CardHeader>
        <CardContent>
          {invoices.length === 0 ? (
            <EmptyState title="אין מסמכי חיוב" />
          ) : (
            <ul className="divide-y">
              {invoices.map((inv) => {
                const payable = canPayOnline && isPayableInvoiceStatus(inv.status);
                return (
                  <li
                    key={inv.id}
                    className="flex flex-wrap items-center justify-between gap-3 py-3"
                  >
                    <div className="min-w-0">
                      <p className="text-sm font-medium">
                        {DOC_TYPES[inv.docType as DocType]} #{inv.docNumber}
                      </p>
                      <p className="text-xs text-muted-foreground" dir="ltr">
                        {formatCurrency(Number(inv.total))} ·{" "}
                        {formatDate(inv.issuedAt ?? inv.createdAt)}
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      <InvoiceStatusBadge status={inv.status as InvoiceStatus} />
                      {payable && (
                        <Button asChild size="sm">
                          <a href={`/portal/pay/${inv.id}`}>תשלום</a>
                        </Button>
                      )}
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
          {canPayOnline && hasPayable && (
            <p className="mt-3 text-xs text-muted-foreground">
              התשלום מתבצע בעמוד מאובטח של חברת הסליקה.
            </p>
          )}
        </CardContent>
      </Card>

      {/* Shared documents */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">מסמכים ({docs.length})</CardTitle>
        </CardHeader>
        <CardContent>
          {docs.length === 0 ? (
            <EmptyState
              title="אין מסמכים משותפים"
              description="מסמכים שהמשרד ישתף איתכם יופיעו כאן."
            />
          ) : (
            <ul className="divide-y">
              {docs.map((d) => (
                <li key={d.id} className="flex items-center justify-between gap-3 py-3">
                  <div className="min-w-0">
                    <a
                      href={`/portal/documents/${d.id}/download`}
                      className="text-sm font-medium text-primary hover:underline"
                    >
                      {d.fileName}
                    </a>
                    <p className="text-xs text-muted-foreground">
                      {DOCUMENT_CATEGORIES[d.category as DocumentCategory]} ·{" "}
                      {formatDate(d.createdAt)}
                    </p>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
