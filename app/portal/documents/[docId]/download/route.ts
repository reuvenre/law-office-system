import { getPortalSession } from "@/lib/portal/session";
import { portalDocumentForDownload } from "@/lib/portal/data";

export const dynamic = "force-dynamic";

/**
 * Portal download proxy. Mirrors the staff-side proxy: the blob URL is never
 * exposed. Access requires a valid portal session AND the document must belong
 * to that client, in that firm, and be explicitly marked shared_with_client.
 */
export async function GET(
  _req: Request,
  { params }: { params: Promise<{ docId: string }> }
) {
  const session = await getPortalSession();
  if (!session) {
    return new Response("Unauthorized", { status: 401 });
  }

  const { docId } = await params;
  const doc = await portalDocumentForDownload(docId, session.clientId, session.firmId);
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
  headers.set("Referrer-Policy", "no-referrer");

  return new Response(upstream.body, { headers });
}
