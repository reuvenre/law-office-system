import { del } from "@vercel/blob";
import { eq, type SQL } from "drizzle-orm";
import { db } from "@/lib/db";
import { documents } from "@/lib/db/schema";

/**
 * Delete the stored files belonging to a case or client before the rows cascade
 * away.
 *
 * Deleting a case cascades to its document *rows*, but the blobs themselves are
 * only removed by the single-document delete action — so without this every
 * cascade left privileged client files in storage forever, with no row pointing
 * at them. That is both a cost leak and, more seriously, an erasure request the
 * firm cannot honour.
 *
 * Best-effort per file: one already-deleted blob must not abort the rest.
 */
async function deleteBlobsWhere(condition: SQL) {
  const rows = await db
    .select({ storagePath: documents.storagePath })
    .from(documents)
    .where(condition);

  await Promise.all(
    rows.map(async (row) => {
      if (!row.storagePath) return;
      try {
        await del(row.storagePath);
      } catch (e) {
        // The row is about to disappear either way; losing the blob is
        // recoverable, failing the user's delete is not.
        console.error("blob cleanup failed", row.storagePath, e);
      }
    })
  );
}

export function deleteCaseBlobs(caseId: string) {
  return deleteBlobsWhere(eq(documents.caseId, caseId));
}

export function deleteClientBlobs(clientId: string) {
  return deleteBlobsWhere(eq(documents.clientId, clientId));
}
