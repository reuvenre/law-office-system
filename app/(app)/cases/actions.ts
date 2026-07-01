"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { cases, caseStatusHistory } from "@/lib/db/schema";
import { requireLawyer } from "@/lib/auth/guards";
import { logActivity } from "@/lib/activity";
import { caseBaseSchema, CASE_STATUS_VALUES } from "@/lib/validations/case";
import { collectTypeFields } from "@/lib/practice-areas";
import type { PracticeArea } from "@/lib/constants";

export type CaseFormState = {
  errors?: Record<string, string[]>;
  error?: string;
} | undefined;

function parseBase(formData: FormData) {
  return caseBaseSchema.safeParse({
    clientId: formData.get("clientId"),
    title: formData.get("title"),
    practiceArea: formData.get("practiceArea"),
    caseNumber: formData.get("caseNumber") ?? "",
    opposingParty: formData.get("opposingParty") ?? "",
    court: formData.get("court") ?? "",
    responsibleLawyerId: formData.get("responsibleLawyerId") ?? "",
  });
}

export async function createCaseAction(
  _prev: CaseFormState,
  formData: FormData
): Promise<CaseFormState> {
  const user = await requireLawyer();
  const parsed = parseBase(formData);
  if (!parsed.success) {
    return { errors: parsed.error.flatten().fieldErrors };
  }

  const data = parsed.data;
  const typeFields = collectTypeFields(
    data.practiceArea as PracticeArea,
    formData
  );

  let newId: string;
  try {
    const [row] = await db
      .insert(cases)
      .values({
        clientId: data.clientId,
        title: data.title,
        practiceArea: data.practiceArea,
        caseNumber: data.caseNumber || null,
        opposingParty: data.opposingParty || null,
        court: data.court || null,
        responsibleLawyerId: data.responsibleLawyerId || null,
        typeFields,
        status: "new",
        createdBy: user.id,
      })
      .returning({ id: cases.id });
    newId = row.id;

    // Record the initial status (spec §6.3 — status changes are audited).
    await db.insert(caseStatusHistory).values({
      caseId: newId,
      fromStatus: null,
      toStatus: "new",
      changedBy: user.id,
    });

    await logActivity({
      actorId: user.id,
      entityType: "case",
      entityId: newId,
      action: "create",
      metadata: { title: data.title },
    });
  } catch {
    return { error: "יצירת התיק נכשלה" };
  }

  revalidatePath("/cases");
  redirect(`/cases/${newId}`);
}

export async function updateCaseAction(
  caseId: string,
  _prev: CaseFormState,
  formData: FormData
): Promise<CaseFormState> {
  const user = await requireLawyer();
  const parsed = parseBase(formData);
  if (!parsed.success) {
    return { errors: parsed.error.flatten().fieldErrors };
  }
  const data = parsed.data;
  const typeFields = collectTypeFields(
    data.practiceArea as PracticeArea,
    formData
  );

  try {
    await db
      .update(cases)
      .set({
        clientId: data.clientId,
        title: data.title,
        practiceArea: data.practiceArea,
        caseNumber: data.caseNumber || null,
        opposingParty: data.opposingParty || null,
        court: data.court || null,
        responsibleLawyerId: data.responsibleLawyerId || null,
        typeFields,
      })
      .where(eq(cases.id, caseId));

    await logActivity({
      actorId: user.id,
      entityType: "case",
      entityId: caseId,
      action: "update",
    });
  } catch {
    return { error: "עדכון התיק נכשל" };
  }

  revalidatePath(`/cases/${caseId}`);
  redirect(`/cases/${caseId}`);
}

/**
 * Dedicated, audited status change (spec §6.3 / §6.6).
 * Update + history insert run atomically via db.batch.
 */
export async function changeCaseStatusAction(caseId: string, formData: FormData) {
  const user = await requireLawyer();
  const toStatus = String(formData.get("status"));
  const note = (formData.get("note") as string)?.trim() || null;

  if (!CASE_STATUS_VALUES.includes(toStatus as (typeof CASE_STATUS_VALUES)[number])) {
    return;
  }

  const [current] = await db
    .select({ status: cases.status })
    .from(cases)
    .where(eq(cases.id, caseId))
    .limit(1);
  if (!current || current.status === toStatus) return;

  await db.batch([
    db
      .update(cases)
      .set({ status: toStatus as (typeof CASE_STATUS_VALUES)[number] })
      .where(eq(cases.id, caseId)),
    db.insert(caseStatusHistory).values({
      caseId,
      fromStatus: current.status,
      toStatus: toStatus as (typeof CASE_STATUS_VALUES)[number],
      changedBy: user.id,
      note,
    }),
  ]);

  await logActivity({
    actorId: user.id,
    entityType: "case",
    entityId: caseId,
    action: "update",
    metadata: { statusFrom: current.status, statusTo: toStatus },
  });

  revalidatePath(`/cases/${caseId}`);
}

export async function deleteCaseAction(caseId: string) {
  const user = await requireLawyer();
  await db.delete(cases).where(eq(cases.id, caseId));
  await logActivity({
    actorId: user.id,
    entityType: "case",
    entityId: caseId,
    action: "delete",
  });
  revalidatePath("/cases");
  redirect("/cases");
}
