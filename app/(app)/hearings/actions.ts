"use server";

import { revalidatePath } from "next/cache";
import { eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { hearings } from "@/lib/db/schema";
import { requireLawyer } from "@/lib/auth/guards";
import { logActivity } from "@/lib/activity";
import { parseLocalDateTime } from "@/lib/datetime";

export type EventFormState = { error?: string } | undefined;

type HearingStatus = "scheduled" | "completed" | "postponed" | "cancelled";

function revalidate(caseId?: string | null) {
  if (caseId) revalidatePath(`/cases/${caseId}`);
  revalidatePath("/hearings");
  revalidatePath("/dashboard");
}

export async function addHearingAction(
  _prev: EventFormState,
  formData: FormData
): Promise<EventFormState> {
  const user = await requireLawyer();
  const caseId = String(formData.get("caseId") || "");
  const hearingAt = parseLocalDateTime(formData.get("hearingAt"));
  if (!caseId || !hearingAt) return { error: "תאריך/שעה ותיק הם שדות חובה" };

  const [row] = await db
    .insert(hearings)
    .values({
      caseId,
      hearingAt,
      location: (formData.get("location") as string)?.trim() || null,
      hearingType: (formData.get("hearingType") as string)?.trim() || null,
      createdBy: user.id,
    })
    .returning({ id: hearings.id });

  await logActivity({
    actorId: user.id,
    entityType: "hearing",
    entityId: row.id,
    action: "create",
    metadata: { caseId },
  });
  revalidate(caseId);
  return undefined;
}

export async function updateHearingAction(
  hearingId: string,
  caseId: string,
  _prev: EventFormState,
  formData: FormData
): Promise<EventFormState> {
  const user = await requireLawyer();
  const hearingAt = parseLocalDateTime(formData.get("hearingAt"));
  if (!hearingAt) return { error: "תאריך/שעה חובה" };

  await db
    .update(hearings)
    .set({
      hearingAt,
      location: (formData.get("location") as string)?.trim() || null,
      hearingType: (formData.get("hearingType") as string)?.trim() || null,
      status: String(formData.get("status")) as HearingStatus,
      outcome: (formData.get("outcome") as string)?.trim() || null,
    })
    .where(eq(hearings.id, hearingId));

  await logActivity({
    actorId: user.id,
    entityType: "hearing",
    entityId: hearingId,
    action: "update",
  });
  revalidate(caseId);
  return undefined;
}

export async function updateHearingStatusAction(
  hearingId: string,
  caseId: string,
  formData: FormData
) {
  const user = await requireLawyer();
  const status = String(formData.get("status")) as HearingStatus;
  await db.update(hearings).set({ status }).where(eq(hearings.id, hearingId));
  await logActivity({
    actorId: user.id,
    entityType: "hearing",
    entityId: hearingId,
    action: "update",
    metadata: { status },
  });
  revalidate(caseId);
}

export async function deleteHearingAction(hearingId: string, caseId: string) {
  const user = await requireLawyer();
  await db.delete(hearings).where(eq(hearings.id, hearingId));
  await logActivity({
    actorId: user.id,
    entityType: "hearing",
    entityId: hearingId,
    action: "delete",
  });
  revalidate(caseId);
}
