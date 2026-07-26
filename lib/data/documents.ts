import { db } from "@/lib/db";
import { documents } from "@/lib/db/schema";
import { desc, eq } from "drizzle-orm";
import { documentScope, withScope, type ViewerScope } from "@/lib/auth/scope";

type Ids = ViewerScope;

export async function getDocument(id: string, allowedIds: Ids) {
  const where = withScope(eq(documents.id, id), documentScope(allowedIds));
  const rows = await db.select().from(documents).where(where).limit(1);
  return rows[0] ?? null;
}

export async function getClientDocuments(clientId: string) {
  return db
    .select()
    .from(documents)
    .where(eq(documents.clientId, clientId))
    .orderBy(desc(documents.createdAt));
}

/**
 * Stream a stored document back to the caller without ever revealing the blob
 * URL. Authorization is the caller's job — the staff route and the portal route
 * apply different checks, then share this transport half so a confidentiality
 * header added for one can't silently go missing on the other.
 */
export function streamStoredDocument(doc: {
  storagePath: string;
  mimeType: string | null;
  fileName: string;
}): Promise<Response> {
  return fetch(doc.storagePath).then((upstream) => {
    if (!upstream.ok || !upstream.body) {
      return new Response("Not found", { status: 404 });
    }
    const headers = new Headers();
    headers.set("Content-Type", doc.mimeType || "application/octet-stream");
    headers.set(
      "Content-Disposition",
      `inline; filename*=UTF-8''${encodeURIComponent(doc.fileName)}`
    );
    // Preserve the size so browsers can show progress and seek in large PDFs.
    const len = upstream.headers.get("content-length");
    if (len) headers.set("Content-Length", len);
    headers.set("Cache-Control", "private, no-store");
    headers.set("Referrer-Policy", "no-referrer");
    return new Response(upstream.body, { headers });
  });
}
