import { sql } from "drizzle-orm";
import { db } from "@/lib/db";

export const dynamic = "force-dynamic";

/**
 * Liveness + database reachability, for uptime monitoring.
 *
 * Deliberately says nothing about the deployment beyond up/down: an unauth'd
 * endpoint that reported versions, row counts or which integrations are
 * configured would be free reconnaissance.
 */
export async function GET() {
  try {
    await db.execute(sql`select 1`);
    return Response.json(
      { ok: true },
      { headers: { "Cache-Control": "no-store" } }
    );
  } catch (e) {
    console.error("health check failed", e);
    return Response.json(
      { ok: false },
      { status: 503, headers: { "Cache-Control": "no-store" } }
    );
  }
}
