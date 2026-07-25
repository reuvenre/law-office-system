import { withPortalSession } from "@/lib/portal/session";
import { portalDocumentForDownload } from "@/lib/portal/data";
import { streamStoredDocument } from "@/lib/data/documents";

export const dynamic = "force-dynamic";

type Ctx = { params: Promise<{ docId: string }> };

/**
 * Portal download proxy. The session gate is applied by withPortalSession; the
 * document must additionally belong to that client, in that firm, and be
 * explicitly marked shared_with_client. Transport is shared with the staff route.
 */
export const GET = withPortalSession<Ctx>(async (session, _req, { params }) => {
  const { docId } = await params;
  const doc = await portalDocumentForDownload(docId, session.clientId, session.firmId);
  if (!doc?.storagePath) {
    return new Response("Not found", { status: 404 });
  }
  return streamStoredDocument(doc);
});
