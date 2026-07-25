import { createHash, randomBytes, timingSafeEqual } from "node:crypto";
import { and, eq, gt, isNull } from "drizzle-orm";
import { db } from "@/lib/db";
import { clientPortalTokens, clients, DEFAULT_FIRM_ID } from "@/lib/db/schema";

/**
 * Client-portal access tokens (win-solutions).
 *
 * Security model:
 *  - 256 bits of entropy per token (randomBytes(32)).
 *  - Only the SHA-256 hash is persisted; the raw token is returned exactly once
 *    at creation and is unrecoverable afterwards. A database leak therefore does
 *    not yield usable portal credentials.
 *  - Every token is bound to one client, carries an expiry, and can be revoked.
 *  - Lookup is by hash (unique index), so no secret-dependent scan occurs.
 */

export const PORTAL_COOKIE = "portal_token";
const DEFAULT_TTL_DAYS = 30;

function hashToken(raw: string): string {
  return createHash("sha256").update(raw).digest("hex");
}

/** Create a portal token for a client. Returns the raw token — show it once. */
export async function createPortalToken(params: {
  clientId: string;
  firmId?: string;
  createdBy?: string | null;
  ttlDays?: number;
}): Promise<{ raw: string; expiresAt: Date }> {
  const raw = randomBytes(32).toString("base64url");
  const ttl = params.ttlDays ?? DEFAULT_TTL_DAYS;
  const expiresAt = new Date(Date.now() + ttl * 86400000);

  await db.insert(clientPortalTokens).values({
    clientId: params.clientId,
    firmId: params.firmId ?? DEFAULT_FIRM_ID,
    tokenHash: hashToken(raw),
    expiresAt,
    createdBy: params.createdBy ?? null,
  });

  return { raw, expiresAt };
}

export type PortalSession = {
  clientId: string;
  firmId: string;
  clientName: string;
  tokenId: string;
};

/**
 * Resolve a raw token to a portal session. Returns null for unknown, expired,
 * or revoked tokens. The comparison is a hash lookup plus a constant-time
 * confirmation, so a partial-match timing signal can't be mined.
 */
export async function verifyPortalToken(
  raw: string | undefined | null
): Promise<PortalSession | null> {
  if (!raw || typeof raw !== "string" || raw.length < 20) return null;
  const hash = hashToken(raw);

  const rows = await db
    .select({
      id: clientPortalTokens.id,
      clientId: clientPortalTokens.clientId,
      firmId: clientPortalTokens.firmId,
      tokenHash: clientPortalTokens.tokenHash,
      clientName: clients.fullName,
    })
    .from(clientPortalTokens)
    .innerJoin(clients, eq(clientPortalTokens.clientId, clients.id))
    .where(
      and(
        eq(clientPortalTokens.tokenHash, hash),
        isNull(clientPortalTokens.revokedAt),
        gt(clientPortalTokens.expiresAt, new Date())
      )
    )
    .limit(1);

  const row = rows[0];
  if (!row) return null;

  // Defense in depth: confirm the stored hash matches in constant time.
  const a = Buffer.from(row.tokenHash, "utf8");
  const b = Buffer.from(hash, "utf8");
  if (a.length !== b.length || !timingSafeEqual(a, b)) return null;

  return {
    clientId: row.clientId,
    firmId: row.firmId,
    clientName: row.clientName,
    tokenId: row.id,
  };
}

/** Record use of a token (best-effort; never blocks the request). */
export async function touchPortalToken(tokenId: string): Promise<void> {
  try {
    await db
      .update(clientPortalTokens)
      .set({ lastUsedAt: new Date() })
      .where(eq(clientPortalTokens.id, tokenId));
  } catch (e) {
    console.error("touchPortalToken failed", e);
  }
}

/** Revoke a single token. */
export async function revokePortalToken(tokenId: string): Promise<void> {
  await db
    .update(clientPortalTokens)
    .set({ revokedAt: new Date() })
    .where(eq(clientPortalTokens.id, tokenId));
}

/** Revoke every active token for a client. */
export async function revokeAllForClient(clientId: string): Promise<void> {
  await db
    .update(clientPortalTokens)
    .set({ revokedAt: new Date() })
    .where(
      and(eq(clientPortalTokens.clientId, clientId), isNull(clientPortalTokens.revokedAt))
    );
}
