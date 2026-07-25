import { auth } from "@/auth";
import { getViewer } from "@/lib/auth/viewer";
import { getDocument, streamStoredDocument } from "@/lib/data/documents";

/**
 * Auth-gated download proxy. The Vercel Blob URL is never exposed to the
 * client — the file is streamed through this route after a session check,
 * preserving attorney-client confidentiality (spec §11).
 */
export async function GET(
  _req: Request,
  { params }: { params: Promise<{ docId: string }> }
) {
  const session = await auth();
  if (!session?.user) {
    return new Response("Unauthorized", { status: 401 });
  }

  const { docId } = await params;
  const viewer = await getViewer();
  const doc = await getDocument(docId, viewer);
  if (!doc?.storagePath) {
    return new Response("Not found", { status: 404 });
  }

  return streamStoredDocument(doc);
}
