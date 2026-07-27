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
 * MIME types we are willing to render in the browser tab. The stored mimeType
 * comes from the uploader's multipart header and is therefore attacker-chosen —
 * serving it back verbatim as `inline` would let an uploaded text/html or
 * image/svg+xml file execute script on our own origin, with the viewer's
 * session. Anything outside this list downloads as an opaque attachment.
 */
const INLINE_SAFE_TYPES = new Set([
  "application/pdf",
  "image/png",
  "image/jpeg",
  "image/gif",
  "image/webp",
  "text/plain",
]);

/**
 * Decide how a stored document may be served. Pure so the allow-list can be
 * tested directly — this is the boundary that keeps an uploaded HTML or SVG
 * file from scripting on our origin.
 */
export function documentDisposition(mimeType: string | null): {
  contentType: string;
  disposition: "inline" | "attachment";
} {
  // Strip any charset/boundary parameters before matching the allow-list.
  const declared = (mimeType ?? "").split(";")[0].trim().toLowerCase();
  return INLINE_SAFE_TYPES.has(declared)
    ? { contentType: declared, disposition: "inline" }
    : { contentType: "application/octet-stream", disposition: "attachment" };
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
    const { contentType, disposition } = documentDisposition(doc.mimeType);

    const headers = new Headers();
    headers.set("Content-Type", contentType);
    headers.set(
      "Content-Disposition",
      `${disposition}; filename*=UTF-8''${encodeURIComponent(doc.fileName)}`
    );
    // Never let the browser second-guess the type we just pinned down.
    headers.set("X-Content-Type-Options", "nosniff");
    // Defence in depth: even a type that slips through renders inert.
    headers.set("Content-Security-Policy", "default-src 'none'; sandbox");
    // Preserve the size so browsers can show progress and seek in large PDFs.
    const len = upstream.headers.get("content-length");
    if (len) headers.set("Content-Length", len);
    headers.set("Cache-Control", "private, no-store");
    headers.set("Referrer-Policy", "no-referrer");
    return new Response(upstream.body, { headers });
  });
}
