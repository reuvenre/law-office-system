"use server";

import { revalidatePath } from "next/cache";
import { eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { deadlines } from "@/lib/db/schema";
import { requireLawyer } from "@/lib/auth/guards";
import { logActivity } from "@/lib/activity";
import { parseLocalDateTime } from "@/lib/datetime";

export type EventFormState = { error?: string } | undefined;

type Priority = "low" | "normal" | "high" | "critical";

function revalidate(caseId?: string | null) {
  if (caseId) revalidatePath(`/cases/${caseId}`);
  revalidatePath("/deadlines");
  revalidatePath("/dashboard");
}

export async function addDeadlineAction(
  _prev: EventFormState,
  formData: FormData
): Promise<EventFormState> {
  const user = await requireLawyer();
  const caseId = String(formData.get("caseId") || "");
  const title = (formData.get("title") as string)?.trim();
  const dueAt = parseLocalDateTime(formData.get("dueAt"));
  if (!caseId || !title || !dueAt) return { error: "כותרת, מועד ותיק הם חובה" };

  const [row] = await db
    .insert(deadlines)
    .values({
      caseId,
      title,
      dueAt,
      priority: String(formData.get("priority") || "normal") as Priority,
      createdBy: user.id,
    })
    .returning({ id: deadlines.id });

  await logActivity({
    actorId: user.id,
    entityType: "deadline",
    entityId: row.id,
    action: "create",
    metadata: { caseId },
  });
  revalidate(caseId);
  return undefined;
}

export async function updateDeadlineAction(
  deadlineId: string,
  caseId: string,
  _prev: EventFormState,
  formData: FormData
): Promise<EventFormState> {
  const user = await requireLawyer();
  const title = (formData.get("title") as string)?.trim();
  const dueAt = parseLocalDateTime(formData.get("dueAt"));
  if (!title || !dueAt) return { error: "כותרת ומועד הם חובה" };

  await db
    .update(deadlines)
    .set({
      title,
      dueAt,
      priority: String(formData.get("priority") || "normal") as Priority,
    })
    .where(eq(deadlines.id, deadlineId));

  await logActivity({
    actorId: user.id,
    entityType: "deadline",
    entityId: deadlineId,
    action: "update",
  });
  revalidate(caseId);
  return undefined;
}

export async function toggleDeadlineAction(
  deadlineId: string,
  caseId: string,
  nextDone: boolean
) {
  const user = await requireLawyer();
  await db
    .update(deadlines)
    .set({ isDone: nextDone, doneBy: nextDone ? user.id : null })
    .where(eq(deadlines.id, deadlineId));
  await logActivity({
    actorId: user.id,
    entityType: "deadline",
    entityId: deadlineId,
    action: "update",
    metadata: { isDone: nextDone },
  });
  revalidate(caseId);
}

export async function deleteDeadlineAction(deadlineId: string, caseId: string) {
  const user = await requireLawyer();
  await db.delete(deadlines).where(eq(deadlines.id, deadlineId));
  await logActivity({
    actorId: user.id,
    entityType: "deadline",
    entityId: deadlineId,
    action: "delete",
  });
  revalidate(caseId);
}
