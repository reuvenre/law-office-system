import { eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { documents, cases, clients } from "@/lib/db/schema";

export const dynamic = "force-dynamic";

/**
 * Write-back endpoint for the Make scenario (spec §9.3). Make calls this after
 * creating Drive folders / uploading a file to record drive_* ids and flip
 * sync_status. Protected by a shared secret held only in Make.
 */
export async function POST(req: Request) {
  const secret = process.env.MAKE_CALLBACK_SECRET;
  if (!secret || req.headers.get("authorization") !== `Bearer ${secret}`) {
    return new Response("Unauthorized", { status: 401 });
  }

  let body: Record<string, string | undefined>;
  try {
    body = await req.json();
  } catch {
    return Response.json({ ok: false, error: "invalid json" }, { status: 400 });
  }

  const { type, id } = body;
  if (!type || !id) {
    return Response.json({ ok: false, error: "missing type/id" }, { status: 400 });
  }

  try {
    if (type === "document") {
      const set: Record<string, string> = {};
      if (body.driveFileId) set.driveFileId = body.driveFileId;
      if (body.driveUrl) set.driveUrl = body.driveUrl;
      set.syncStatus = body.syncStatus === "failed" ? "failed" : "synced";
      await db.update(documents).set(set).where(eq(documents.id, id));
    } else if (type === "case") {
      const set: Record<string, string> = {};
      if (body.driveFolderId) set.driveFolderId = body.driveFolderId;
      if (body.driveUrl) set.driveUrl = body.driveUrl;
      await db.update(cases).set(set).where(eq(cases.id, id));
    } else if (type === "client") {
      const set: Record<string, string> = {};
      if (body.driveFolderId) set.driveFolderId = body.driveFolderId;
      await db.update(clients).set(set).where(eq(clients.id, id));
    } else {
      return Response.json({ ok: false, error: "unknown type" }, { status: 400 });
    }
    return Response.json({ ok: true });
  } catch (e) {
    return Response.json({ ok: false, error: String(e) }, { status: 500 });
  }
}
