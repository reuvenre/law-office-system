import { auth } from "@/auth";
import { getDocument } from "@/lib/data/documents";

/**
 * Auth-gated download proxy. The Vercel Blob URL is never exposed to the
 * client — the file is streamed through this route after a session check,
 * preserving attorney-client confidentiality (spec §11).
 */
export async function GET(
  _req: Request,
  { params }: { params: { docId: string } }
) {
  const session = await auth();
  if (!session?.user) {
    return new Response("Unauthorized", { status: 401 });
  }

  const doc = await getDocument(params.docId);
  if (!doc?.storagePath) {
    return new Response("Not found", { status: 404 });
  }

  const upstream = await fetch(doc.storagePath);
  if (!upstream.ok || !upstream.body) {
    return new Response("Not found", { status: 404 });
  }

  const headers = new Headers();
  headers.set("Content-Type", doc.mimeType || "application/octet-stream");
  headers.set(
    "Content-Disposition",
    `inline; filename*=UTF-8''${encodeURIComponent(doc.fileName)}`
  );
  headers.set("Cache-Control", "private, no-store");

  return new Response(upstream.body, { headers });
}
