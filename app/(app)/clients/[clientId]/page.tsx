import Link from "next/link";
import { notFound } from "next/navigation";
import { Plus, Pencil, ExternalLink } from "lucide-react";
import { getClient, getClientCases, getClientNotes } from "@/lib/data/clients";
import { getClientDocuments } from "@/lib/data/documents";
import { deleteClientAction } from "@/app/(app)/clients/actions";
import { deleteDocumentAction } from "@/app/(app)/documents/actions";
import { PageHeader } from "@/components/shared/page-header";
import { ConfirmDeleteButton } from "@/components/shared/confirm-delete-button";
import { CaseStatusBadge } from "@/components/shared/status-badge";
import { EmptyState } from "@/components/shared/empty-state";
import { AuthorStamp } from "@/components/shared/author-stamp";
import { InlineDelete } from "@/components/shared/inline-delete";
import { NoteComposer } from "@/components/notes/note-composer";
import { DocumentUploader } from "@/components/documents/document-uploader";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  CLIENT_TYPES,
  REMINDER_CHANNELS,
  PRACTICE_AREAS,
  DOCUMENT_CATEGORIES,
  SYNC_STATUSES,
  type ClientType,
  type ReminderChannel,
  type PracticeArea,
  type CaseStatus,
  type DocumentCategory,
  type SyncStatus,
} from "@/lib/constants";

export const dynamic = "force-dynamic";

function Detail({ label, value, ltr }: { label: string; value?: string | null; ltr?: boolean }) {
  return (
    <div>
      <dt className="text-xs text-muted-foreground">{label}</dt>
      <dd className="text-sm" dir={ltr ? "ltr" : undefined}>
        {value || "—"}
      </dd>
    </div>
  );
}

export default async function ClientCardPage({
  params,
}: {
  params: { clientId: string };
}) {
  const client = await getClient(params.clientId);
  if (!client) notFound();

  const [clientCases, clientNotes, clientDocs] = await Promise.all([
    getClientCases(client.id),
    getClientNotes(client.id),
    getClientDocuments(client.id),
  ]);
  const del = deleteClientAction.bind(null, client.id);

  return (
    <div>
      <PageHeader
        title={client.fullName}
        description={CLIENT_TYPES[client.clientType as ClientType]}
        action={
          <div className="flex gap-2">
            {client.driveFolderId && (
              <Button asChild variant="outline" size="sm">
                <a
                  href={`https://drive.google.com/drive/folders/${client.driveFolderId}`}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  <ExternalLink className="h-4 w-4" />
                  פתח בדרייב
                </a>
              </Button>
            )}
            <Button asChild variant="outline" size="sm">
              <Link href={`/clients/${client.id}/edit`}>
                <Pencil className="h-4 w-4" />
                עריכה
              </Link>
            </Button>
            <ConfirmDeleteButton action={del} />
          </div>
        }
      />

      <div className="grid gap-4 lg:grid-cols-3">
        <Card className="lg:col-span-1">
          <CardHeader>
            <CardTitle className="text-base">פרטי לקוח</CardTitle>
          </CardHeader>
          <CardContent>
            <dl className="grid grid-cols-2 gap-4">
              <Detail label="ת״ז / ח״פ" value={client.idNumber} ltr />
              <Detail label="טלפון" value={client.phone} ltr />
              <Detail label="אימייל" value={client.email} ltr />
              <Detail label="כתובת" value={client.address} />
              <Detail
                label="ערוץ תזכורות"
                value={
                  client.reminderChannel
                    ? REMINDER_CHANNELS[client.reminderChannel as ReminderChannel]
                    : null
                }
              />
              <Detail
                label="הסכמה לתזכורות"
                value={client.reminderConsent ? "כן" : "לא"}
              />
              {client.notes && (
                <div className="col-span-2">
                  <Detail label="הערות" value={client.notes} />
                </div>
              )}
            </dl>
          </CardContent>
        </Card>

        <Card className="lg:col-span-2">
          <CardHeader className="flex-row items-center justify-between space-y-0">
            <CardTitle className="text-base">תיקים</CardTitle>
            <Button asChild size="sm" variant="secondary">
              <Link href={`/cases/new?clientId=${client.id}`}>
                <Plus className="h-4 w-4" />
                תיק חדש
              </Link>
            </Button>
          </CardHeader>
          <CardContent>
            {clientCases.length === 0 ? (
              <EmptyState title="אין תיקים ללקוח זה" />
            ) : (
              <ul className="divide-y">
                {clientCases.map((c) => (
                  <li key={c.id} className="flex items-center justify-between gap-3 py-3">
                    <Link href={`/cases/${c.id}`} className="min-w-0 flex-1">
                      <p className="truncate font-medium text-primary hover:underline">
                        {c.title}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {PRACTICE_AREAS[c.practiceArea as PracticeArea]}
                        {c.caseNumber && <span dir="ltr"> · {c.caseNumber}</span>}
                      </p>
                    </Link>
                    <CaseStatusBadge status={c.status as CaseStatus} />
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>
      </div>

      <div className="mt-4 grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">הערות</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <NoteComposer clientId={client.id} />
            {clientNotes.length === 0 ? (
              <EmptyState title="אין הערות" />
            ) : (
              <ul className="space-y-3">
                {clientNotes.map((n) => (
                  <li key={n.id} className="rounded-lg border p-3">
                    <p className="whitespace-pre-wrap text-sm">{n.body}</p>
                    <div className="mt-2">
                      <AuthorStamp name={n.authorName} at={n.createdAt} />
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">מסמכים</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <DocumentUploader clientId={client.id} />
            {clientDocs.length === 0 ? (
              <EmptyState title="אין מסמכים" />
            ) : (
              <ul className="divide-y">
                {clientDocs.map((doc) => (
                  <li key={doc.id} className="flex flex-wrap items-center justify-between gap-2 py-2">
                    <div className="min-w-0">
                      <a
                        href={`/api/documents/${doc.id}/download`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-sm font-medium text-primary hover:underline"
                      >
                        {doc.fileName}
                      </a>
                      <p className="text-xs text-muted-foreground">
                        {DOCUMENT_CATEGORIES[doc.category as DocumentCategory]}
                        {" · "}
                        {SYNC_STATUSES[doc.syncStatus as SyncStatus]}
                      </p>
                    </div>
                    <InlineDelete
                      action={deleteDocumentAction.bind(null, doc.id, doc.caseId, client.id)}
                    />
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
