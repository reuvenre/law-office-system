"use server";

import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { notes } from "@/lib/db/schema";
import { getViewer } from "@/lib/auth/viewer";
import { canAccessCase, canAccessClient } from "@/lib/auth/scope";
import { logActivity } from "@/lib/activity";

export type NoteState = { ok?: boolean; error?: string } | undefined;

/**
 * Add a note (spec §4.8 / §6.6) — author + timestamp recorded for audit.
 * Pass either caseId or clientId (or both).
 *
 * Returns a result rather than failing silently: the composer clears the
 * textarea on success, so a swallowed authorization failure would look like a
 * saved note while the lawyer's typing was thrown away.
 */
export async function addNoteAction(formData: FormData): Promise<NoteState> {
  const user = await getViewer();
  const body = (formData.get("body") as string)?.trim();
  const caseId = (formData.get("caseId") as string) || null;
  const clientId = (formData.get("clientId") as string) || null;

  if (!body) return { error: "ההערה ריקה" };
  if (caseId && !(await canAccessCase(caseId, user))) {
    return { error: "אין הרשאה לתיק זה" };
  }
  if (clientId && !(await canAccessClient(clientId, user))) {
    return { error: "אין הרשאה ללקוח זה" };
  }

  const [row] = await db
    .insert(notes)
    .values({ firmId: user.firmId, body, caseId, clientId, authorId: user.id })
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
  return { ok: true };
}
