"use server";

import { put, del } from "@vercel/blob";
import { revalidatePath } from "next/cache";
import { eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { documents } from "@/lib/db/schema";
import { requireLawyer } from "@/lib/auth/guards";
import { logActivity } from "@/lib/activity";
import { notifyMakeDocumentUploaded } from "@/lib/drive/notify-make";
import type { DocumentCategory } from "@/lib/constants";

export type DocFormState = { error?: string } | undefined;

export async function uploadDocumentAction(
  _prev: DocFormState,
  formData: FormData
): Promise<DocFormState> {
  const user = await requireLawyer();
  const file = formData.get("file") as File | null;
  const clientId = (formData.get("clientId") as string) || "";
  const caseId = (formData.get("caseId") as string) || null;
  const category = ((formData.get("category") as string) ||
    "other") as DocumentCategory;

  if (!file || file.size === 0) return { error: "לא נבחר קובץ" };
  if (!clientId) return { error: "חסר שיוך ללקוח" };

  const safeName = file.name.replace(/[^\w.\-]+/g, "_");
  const path = `clients/${clientId}/${caseId ?? "general"}/${crypto.randomUUID()}_${safeName}`;

  let blobUrl: string;
  try {
    const blob = await put(path, file, {
      access: "public",
      addRandomSuffix: false,
    });
    blobUrl = blob.url;
  } catch {
    return { error: "העלאת הקובץ נכשלה" };
  }

  const [row] = await db
    .insert(documents)
    .values({
      caseId,
      clientId,
      fileName: file.name,
      storagePath: blobUrl,
      mimeType: file.type || null,
      sizeBytes: file.size,
      category,
      uploadedBy: user.id,
      syncStatus: "pending",
    })
    .returning({ id: documents.id });

  await logActivity({
    actorId: user.id,
    entityType: "document",
    entityId: row.id,
    action: "create",
    metadata: { caseId, clientId, category },
  });

  // Phase 7b: hand off to Make to sync the file to Google Drive.
  await notifyMakeDocumentUploaded({
    documentId: row.id,
    clientId,
    caseId,
    fileName: file.name,
    downloadUrl: blobUrl,
  });

  if (caseId) revalidatePath(`/cases/${caseId}`);
  revalidatePath(`/clients/${clientId}`);
  return undefined;
}

export async function deleteDocumentAction(
  docId: string,
  caseId: string | null,
  clientId: string
) {
  const user = await requireLawyer();
  const [doc] = await db
    .select({ storagePath: documents.storagePath })
    .from(documents)
    .where(eq(documents.id, docId))
    .limit(1);

  if (doc?.storagePath) {
    try {
      await del(doc.storagePath);
    } catch {
      // Blob may already be gone; proceed to remove the row.
    }
  }

  await db.delete(documents).where(eq(documents.id, docId));
  await logActivity({
    actorId: user.id,
    entityType: "document",
    entityId: docId,
    action: "delete",
  });

  if (caseId) revalidatePath(`/cases/${caseId}`);
  revalidatePath(`/clients/${clientId}`);
}
