/**
 * Notify the Make scenario that a document was uploaded (spec §9.3 flow A).
 * Best-effort and non-blocking — if MAKE_WEBHOOK_URL is unset, no-op.
 * Make creates the Drive folders, uploads the file, then writes back the
 * drive fields via /api/integrations/drive-callback.
 */
export async function notifyMakeDocumentUploaded(payload: {
  documentId: string;
  clientId: string;
  caseId: string | null;
  fileName: string;
  downloadUrl: string;
}) {
  const url = process.env.MAKE_WEBHOOK_URL;
  if (!url) return;
  try {
    await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
  } catch {
    // Sync is derived/eventual; the document already lives in Vercel Blob.
  }
}
