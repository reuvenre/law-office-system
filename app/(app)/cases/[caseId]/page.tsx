import Link from "next/link";
import { notFound } from "next/navigation";
import { Pencil, ExternalLink } from "lucide-react";
import {
  getCase,
  getCaseStatusHistory,
  getCaseHearings,
  getCaseDeadlines,
  getCaseTasks,
  getCaseNotes,
  getCaseDocuments,
} from "@/lib/data/cases";
import {
  changeCaseStatusAction,
  deleteCaseAction,
} from "@/app/(app)/cases/actions";
import { PageHeader } from "@/components/shared/page-header";
import { ConfirmDeleteButton } from "@/components/shared/confirm-delete-button";
import { AuthorStamp } from "@/components/shared/author-stamp";
import { EmptyState } from "@/components/shared/empty-state";
import {
  CaseStatusBadge,
  PriorityBadge,
  HearingStatusBadge,
  TaskStatusBadge,
} from "@/components/shared/status-badge";
import { StatusChanger } from "@/components/cases/status-changer";
import { NoteComposer } from "@/components/notes/note-composer";
import { HearingComposer } from "@/components/hearings/hearing-composer";
import { HearingEditDialog } from "@/components/hearings/hearing-edit-dialog";
import { DeadlineComposer } from "@/components/deadlines/deadline-composer";
import { DeadlineEditDialog } from "@/components/deadlines/deadline-edit-dialog";
import { TaskComposer } from "@/components/tasks/task-composer";
import { TaskEditDialog } from "@/components/tasks/task-edit-dialog";
import { DocumentUploader } from "@/components/documents/document-uploader";
import { deleteDocumentAction } from "@/app/(app)/documents/actions";
import { InlineDelete } from "@/components/shared/inline-delete";
import { listActiveLawyers } from "@/lib/data/users";
import { getViewer } from "@/lib/auth/viewer";
import { deleteHearingAction } from "@/app/(app)/hearings/actions";
import {
  toggleDeadlineAction,
  deleteDeadlineAction,
} from "@/app/(app)/deadlines/actions";
import { deleteTaskAction } from "@/app/(app)/tasks/actions";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { formatDate, formatDateTime } from "@/lib/format";
import { PRACTICE_AREA_FIELDS } from "@/lib/practice-areas";
import {
  PRACTICE_AREAS,
  DOCUMENT_CATEGORIES,
  SYNC_STATUSES,
  type PracticeArea,
  type CaseStatus,
  type Priority,
  type HearingStatus,
  type TaskStatus,
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

export default async function CaseCardPage({
  params,
}: {
  params: { caseId: string };
}) {
  const viewer = await getViewer();
  const caseRow = await getCase(params.caseId, viewer.allowedIds);
  if (!caseRow) notFound();

  const [history, hearings, deadlines, tasks, notes, documents, lawyers] =
    await Promise.all([
      getCaseStatusHistory(caseRow.id),
      getCaseHearings(caseRow.id),
      getCaseDeadlines(caseRow.id),
      getCaseTasks(caseRow.id),
      getCaseNotes(caseRow.id),
      getCaseDocuments(caseRow.id),
      listActiveLawyers(),
    ]);

  const changeStatus = changeCaseStatusAction.bind(null, caseRow.id);
  const del = deleteCaseAction.bind(null, caseRow.id);
  const tf = (caseRow.typeFields ?? {}) as Record<string, unknown>;

  function tfDisplay(value: unknown, type: string) {
    if (value === null || value === undefined || value === "") return "—";
    if (type === "checkbox") return value ? "כן" : "לא";
    return String(value);
  }

  return (
    <div>
      <PageHeader
        title={caseRow.title}
        description={`${PRACTICE_AREAS[caseRow.practiceArea as PracticeArea]} · ${caseRow.clientName ?? ""}`}
        action={
          <div className="flex flex-wrap gap-2">
            <CaseStatusBadge status={caseRow.status as CaseStatus} />
            {caseRow.onedriveUrl && (
              <Button asChild variant="outline" size="sm">
                <a href={caseRow.onedriveUrl} target="_blank" rel="noopener noreferrer">
                  <ExternalLink className="h-4 w-4" />
                  פתח ב-OneDrive
                </a>
              </Button>
            )}
            <Button asChild variant="outline" size="sm">
              <Link href={`/cases/${caseRow.id}/edit`}>
                <Pencil className="h-4 w-4" />
                עריכה
              </Link>
            </Button>
            <ConfirmDeleteButton action={del} />
          </div>
        }
      />

      <Tabs defaultValue="details">
        <TabsList className="mb-4 flex w-full flex-wrap justify-start">
          <TabsTrigger value="details">פרטים</TabsTrigger>
          <TabsTrigger value="hearings">דיונים ({hearings.length})</TabsTrigger>
          <TabsTrigger value="deadlines">מועדים ({deadlines.length})</TabsTrigger>
          <TabsTrigger value="tasks">משימות ({tasks.length})</TabsTrigger>
          <TabsTrigger value="documents">מסמכים ({documents.length})</TabsTrigger>
          <TabsTrigger value="notes">הערות ({notes.length})</TabsTrigger>
          <TabsTrigger value="history">היסטוריה</TabsTrigger>
        </TabsList>

        {/* Details */}
        <TabsContent value="details">
          <div className="grid gap-4 lg:grid-cols-3">
            <Card className="lg:col-span-2">
              <CardHeader>
                <CardTitle className="text-base">פרטי התיק</CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                <dl className="grid grid-cols-2 gap-4 sm:grid-cols-3">
                  <Detail label="לקוח" value={caseRow.clientName} />
                  <Detail label="מספר תיק" value={caseRow.caseNumber} ltr />
                  <Detail label="עו״ד אחראית" value={caseRow.lawyerName} />
                  <Detail label="בית משפט / לשכה" value={caseRow.court} />
                  <Detail label="צד שכנגד" value={caseRow.opposingParty} />
                  <Detail label="נפתח בתאריך" value={formatDate(caseRow.openedAt)} />
                </dl>

                <div>
                  <p className="mb-2 text-sm font-medium">
                    שדות ייעודיים — {PRACTICE_AREAS[caseRow.practiceArea as PracticeArea]}
                  </p>
                  <dl className="grid grid-cols-2 gap-4 sm:grid-cols-3">
                    {PRACTICE_AREA_FIELDS[caseRow.practiceArea as PracticeArea].map(
                      (f) => (
                        <Detail
                          key={f.key}
                          label={f.label}
                          value={tfDisplay(tf[f.key], f.type)}
                          ltr={f.type === "number"}
                        />
                      )
                    )}
                  </dl>
                </div>
              </CardContent>
            </Card>

            <Card className="lg:col-span-1">
              <CardHeader>
                <CardTitle className="text-base">שינוי סטטוס</CardTitle>
              </CardHeader>
              <CardContent>
                <StatusChanger action={changeStatus} current={caseRow.status as CaseStatus} />
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Hearings */}
        <TabsContent value="hearings">
          <Card>
            <CardContent className="space-y-4 pt-6">
              <HearingComposer caseId={caseRow.id} />
              {hearings.length === 0 ? (
                <EmptyState title="אין דיונים" />
              ) : (
                <ul className="divide-y">
                  {hearings.map((h) => (
                    <li key={h.id} className="flex flex-wrap items-center justify-between gap-3 py-3">
                      <div>
                        <p className="text-sm font-medium" dir="ltr">
                          {formatDateTime(h.hearingAt)}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {h.hearingType || "דיון"} {h.location ? `· ${h.location}` : ""}
                        </p>
                      </div>
                      <div className="flex items-center gap-2">
                        <HearingStatusBadge status={h.status as HearingStatus} />
                        <HearingEditDialog
                          hearing={{
                            id: h.id,
                            caseId: caseRow.id,
                            hearingAt: h.hearingAt,
                            location: h.location,
                            hearingType: h.hearingType,
                            status: h.status,
                            outcome: h.outcome,
                          }}
                        />
                        <InlineDelete action={deleteHearingAction.bind(null, h.id, caseRow.id)} />
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Deadlines */}
        <TabsContent value="deadlines">
          <Card>
            <CardContent className="space-y-4 pt-6">
              <DeadlineComposer caseId={caseRow.id} />
              {deadlines.length === 0 ? (
                <EmptyState title="אין מועדים" />
              ) : (
                <ul className="divide-y">
                  {deadlines.map((d) => (
                    <li key={d.id} className="flex flex-wrap items-center justify-between gap-3 py-3">
                      <div>
                        <p className={`text-sm font-medium ${d.isDone ? "text-muted-foreground line-through" : ""}`}>
                          {d.title}
                        </p>
                        <p className="text-xs text-muted-foreground" dir="ltr">
                          {formatDateTime(d.dueAt)}
                        </p>
                      </div>
                      <div className="flex items-center gap-2">
                        <PriorityBadge priority={d.priority as Priority} />
                        <form
                          action={toggleDeadlineAction.bind(null, d.id, caseRow.id, !d.isDone)}
                        >
                          <Button type="submit" size="sm" variant={d.isDone ? "ghost" : "secondary"}>
                            {d.isDone ? "בטל סימון" : "סמן בוצע"}
                          </Button>
                        </form>
                        <DeadlineEditDialog
                          deadline={{
                            id: d.id,
                            caseId: caseRow.id,
                            title: d.title,
                            dueAt: d.dueAt,
                            priority: d.priority,
                          }}
                        />
                        <InlineDelete action={deleteDeadlineAction.bind(null, d.id, caseRow.id)} />
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Tasks */}
        <TabsContent value="tasks">
          <Card>
            <CardContent className="space-y-4 pt-6">
              <TaskComposer caseId={caseRow.id} lawyers={lawyers} />
              {tasks.length === 0 ? (
                <EmptyState title="אין משימות" />
              ) : (
                <ul className="divide-y">
                  {tasks.map(({ t, assigneeName }) => (
                    <li key={t.id} className="flex flex-wrap items-center justify-between gap-3 py-3">
                      <div>
                        <p className="text-sm font-medium">{t.title}</p>
                        <p className="text-xs text-muted-foreground">
                          {assigneeName || "ללא שיוך"}
                          {t.dueAt ? ` · ${formatDate(t.dueAt)}` : ""}
                        </p>
                      </div>
                      <div className="flex items-center gap-2">
                        <TaskStatusBadge status={t.status as TaskStatus} />
                        <TaskEditDialog
                          task={{
                            id: t.id,
                            caseId: caseRow.id,
                            title: t.title,
                            assignedTo: t.assignedTo,
                            dueAt: t.dueAt,
                            status: t.status,
                          }}
                          lawyers={lawyers}
                        />
                        <InlineDelete action={deleteTaskAction.bind(null, t.id, caseRow.id)} />
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Documents */}
        <TabsContent value="documents">
          <Card>
            <CardContent className="space-y-4 pt-6">
              <DocumentUploader clientId={caseRow.clientId} caseId={caseRow.id} />
              {documents.length === 0 ? (
                <EmptyState title="אין מסמכים" />
              ) : (
                <ul className="divide-y">
                  {documents.map((doc) => (
                    <li key={doc.id} className="flex flex-wrap items-center justify-between gap-3 py-3">
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
                      <div className="flex items-center gap-2">
                        {doc.driveUrl && (
                          <a
                            href={doc.driveUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-xs text-primary hover:underline"
                          >
                            פתח בדרייב
                          </a>
                        )}
                        <InlineDelete
                          action={deleteDocumentAction.bind(null, doc.id, caseRow.id, caseRow.clientId)}
                        />
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Notes */}
        <TabsContent value="notes">
          <Card>
            <CardContent className="space-y-4 pt-6">
              <NoteComposer caseId={caseRow.id} />
              {notes.length === 0 ? (
                <EmptyState title="אין הערות" />
              ) : (
                <ul className="space-y-4">
                  {notes.map((n) => (
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
        </TabsContent>

        {/* History */}
        <TabsContent value="history">
          <Card>
            <CardContent className="pt-6">
              {history.length === 0 ? (
                <EmptyState title="אין היסטוריית סטטוס" />
              ) : (
                <ul className="space-y-4">
                  {history.map((h) => (
                    <li key={h.id} className="flex flex-col gap-1 border-r-2 border-border pr-3">
                      <div className="flex items-center gap-2 text-sm">
                        {h.fromStatus && (
                          <>
                            <CaseStatusBadge status={h.fromStatus as CaseStatus} />
                            <span aria-hidden>←</span>
                          </>
                        )}
                        <CaseStatusBadge status={h.toStatus as CaseStatus} />
                      </div>
                      {h.note && <p className="text-xs text-muted-foreground">{h.note}</p>}
                      <AuthorStamp name={h.changedByName} at={h.changedAt} />
                    </li>
                  ))}
                </ul>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
