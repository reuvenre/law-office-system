"use server";

import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { notes } from "@/lib/db/schema";
import { getViewer } from "@/lib/auth/viewer";
import { canAccessCase, canAccessClient } from "@/lib/auth/scope";
import { logActivity } from "@/lib/activity";

/**
 * Add a note (spec §4.8 / §6.6) — author + timestamp recorded for audit.
 * Pass either caseId or clientId (or both).
 */
export async function addNoteAction(formData: FormData) {
  const user = await getViewer();
  const body = (formData.get("body") as string)?.trim();
  const caseId = (formData.get("caseId") as string) || null;
  const clientId = (formData.get("clientId") as string) || null;

  if (!body) return;
  if (caseId && !(await canAccessCase(caseId, user.allowedIds))) return;
  if (clientId && !(await canAccessClient(clientId, user.allowedIds))) return;

  const [row] = await db
    .insert(notes)
    .values({ body, caseId, clientId, authorId: user.id })
    .returning({ id: notes.id });

  await logActivity({
    actorId: user.id,
    entityType: "note",
    entityId: row.id,
    action: "create",
    metadata: { caseId, clientId },
  });

  if (caseId) revalidatePath(`/cases/${caseId}`);
  if (clientId) revalidatePath(`/clients/${clientId}`);
}
