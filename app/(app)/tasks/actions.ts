"use server";

import { revalidatePath } from "next/cache";
import { eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { tasks } from "@/lib/db/schema";
import { requireLawyer } from "@/lib/auth/guards";
import { logActivity } from "@/lib/activity";
import { parseLocalDateTime } from "@/lib/datetime";

export type EventFormState = { error?: string } | undefined;

type TaskStatus = "open" | "in_progress" | "done";

function revalidate(caseId?: string | null) {
  if (caseId) revalidatePath(`/cases/${caseId}`);
  revalidatePath("/tasks");
  revalidatePath("/dashboard");
}

export async function addTaskAction(
  _prev: EventFormState,
  formData: FormData
): Promise<EventFormState> {
  const user = await requireLawyer();
  const title = (formData.get("title") as string)?.trim();
  if (!title) return { error: "כותרת היא שדה חובה" };

  const caseId = (formData.get("caseId") as string) || null;
  const assignedTo = (formData.get("assignedTo") as string) || null;
  const dueAt = parseLocalDateTime(formData.get("dueAt"));

  const [row] = await db
    .insert(tasks)
    .values({ caseId, title, assignedTo, dueAt, createdBy: user.id })
    .returning({ id: tasks.id });

  await logActivity({
    actorId: user.id,
    entityType: "task",
    entityId: row.id,
    action: "create",
    metadata: { caseId },
  });
  revalidate(caseId);
  return undefined;
}

export async function updateTaskAction(
  taskId: string,
  caseId: string | null,
  _prev: EventFormState,
  formData: FormData
): Promise<EventFormState> {
  const user = await requireLawyer();
  const title = (formData.get("title") as string)?.trim();
  if (!title) return { error: "כותרת היא שדה חובה" };

  await db
    .update(tasks)
    .set({
      title,
      assignedTo: (formData.get("assignedTo") as string) || null,
      dueAt: parseLocalDateTime(formData.get("dueAt")),
      status: String(formData.get("status") || "open") as TaskStatus,
    })
    .where(eq(tasks.id, taskId));

  await logActivity({
    actorId: user.id,
    entityType: "task",
    entityId: taskId,
    action: "update",
  });
  revalidate(caseId);
  return undefined;
}

export async function setTaskStatusAction(
  taskId: string,
  caseId: string | null,
  formData: FormData
) {
  const user = await requireLawyer();
  const status = String(formData.get("status")) as TaskStatus;
  await db.update(tasks).set({ status }).where(eq(tasks.id, taskId));
  await logActivity({
    actorId: user.id,
    entityType: "task",
    entityId: taskId,
    action: "update",
    metadata: { status },
  });
  revalidate(caseId);
}

export async function deleteTaskAction(taskId: string, caseId: string | null) {
  const user = await requireLawyer();
  await db.delete(tasks).where(eq(tasks.id, taskId));
  await logActivity({
    actorId: user.id,
    entityType: "task",
    entityId: taskId,
    action: "delete",
  });
  revalidate(caseId);
}
