import Link from "next/link";
import { listTasks } from "@/lib/data/events";
import { listActiveLawyers } from "@/lib/data/users";
import { getViewer } from "@/lib/auth/viewer";
import { deleteTaskAction } from "@/app/(app)/tasks/actions";
import { PageHeader } from "@/components/shared/page-header";
import { EmptyState } from "@/components/shared/empty-state";
import { TaskStatusBadge } from "@/components/shared/status-badge";
import { InlineDelete } from "@/components/shared/inline-delete";
import { TaskComposer } from "@/components/tasks/task-composer";
import { TaskEditDialog } from "@/components/tasks/task-edit-dialog";
import { Card, CardContent } from "@/components/ui/card";
import { formatDate } from "@/lib/format";
import { type TaskStatus } from "@/lib/constants";

export const dynamic = "force-dynamic";

export default async function TasksPage() {
  const viewer = await getViewer();
  const [rows, lawyers] = await Promise.all([
    listTasks(undefined, viewer.allowedIds),
    listActiveLawyers(),
  ]);

  return (
    <div>
      <PageHeader title="משימות" description="כל המשימות במשרד" />
      <div className="mb-4">
        <TaskComposer lawyers={lawyers} />
      </div>
      {rows.length === 0 ? (
        <EmptyState title="אין משימות" />
      ) : (
        <Card>
          <CardContent className="pt-6">
            <ul className="divide-y">
              {rows.map(({ t, assigneeName, caseTitle }) => (
                <li key={t.id} className="flex flex-wrap items-center justify-between gap-3 py-3">
                  <div>
                    <p className="text-sm font-medium">{t.title}</p>
                    <p className="text-xs text-muted-foreground">
                      {assigneeName || "ללא שיוך"}
                      {t.dueAt ? ` · ${formatDate(t.dueAt)}` : ""}
                      {caseTitle ? " · " : ""}
                      {caseTitle && t.caseId && (
                        <Link href={`/cases/${t.caseId}`} className="text-primary hover:underline">
                          {caseTitle}
                        </Link>
                      )}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <TaskStatusBadge status={t.status as TaskStatus} />
                    <TaskEditDialog
                      task={{
                        id: t.id,
                        caseId: t.caseId,
                        title: t.title,
                        assignedTo: t.assignedTo,
                        dueAt: t.dueAt,
                        status: t.status,
                      }}
                      lawyers={lawyers}
                    />
                    <InlineDelete action={deleteTaskAction.bind(null, t.id, t.caseId)} />
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
