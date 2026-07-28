import { createHash, randomBytes } from "node:crypto";
import { and, eq, gt, isNull } from "drizzle-orm";
import { db } from "@/lib/db";
import { passwordResetTokens, users } from "@/lib/db/schema";

/**
 * Self-service password reset.
 *
 * Same model as the client-portal tokens: 256 bits of entropy, only the SHA-256
 * is stored, and expiry plus single-use are enforced inside the lookup query
 * rather than checked afterwards. The window is deliberately short — an email
 * inbox is a weaker place to leave a credential than a browser cookie.
 */

export const RESET_TTL_MINUTES = 60;

function hashToken(raw: string): string {
  return createHash("sha256").update(raw).digest("hex");
}

/**
 * Issue a reset token for an email address.
 *
 * Returns null when no active user matches — the caller must still report
 * success to the visitor, or the form becomes an account-enumeration oracle.
 */
export async function createResetToken(
  email: string
): Promise<{ raw: string; userId: string; fullName: string } | null> {
  const [user] = await db
    .select({ id: users.id, fullName: users.fullName, isActive: users.isActive })
    .from(users)
    .where(eq(users.email, email.trim().toLowerCase()))
    .limit(1);
  if (!user || !user.isActive) return null;

  const raw = randomBytes(32).toString("base64url");
  await db.insert(passwordResetTokens).values({
    userId: user.id,
    tokenHash: hashToken(raw),
    expiresAt: new Date(Date.now() + RESET_TTL_MINUTES * 60_000),
  });

  return { raw, userId: user.id, fullName: user.fullName };
}

/** The user id a live, unused token belongs to — or null. */
export async function resolveResetToken(raw: string | undefined): Promise<string | null> {
  if (!raw || raw.length < 20) return null;
  const [row] = await db
    .select({ userId: passwordResetTokens.userId })
    .from(passwordResetTokens)
    .where(
      and(
        eq(passwordResetTokens.tokenHash, hashToken(raw)),
        isNull(passwordResetTokens.usedAt),
        gt(passwordResetTokens.expiresAt, new Date())
      )
    )
    .limit(1);
  return row?.userId ?? null;
}

/**
 * Burn a token. Constrained to rows that are still unused, so two concurrent
 * submissions cannot both succeed.
 */
export async function consumeResetToken(raw: string): Promise<boolean> {
  const rows = await db
    .update(passwordResetTokens)
    .set({ usedAt: new Date() })
    .where(
      and(
        eq(passwordResetTokens.tokenHash, hashToken(raw)),
        isNull(passwordResetTokens.usedAt),
        gt(passwordResetTokens.expiresAt, new Date())
      )
    )
    .returning({ id: passwordResetTokens.id });
  return rows.length > 0;
}

/** Invalidate every outstanding token for a user (after a successful reset). */
export async function revokeResetTokensFor(userId: string): Promise<void> {
  await db
    .update(passwordResetTokens)
    .set({ usedAt: new Date() })
    .where(
      and(eq(passwordResetTokens.userId, userId), isNull(passwordResetTokens.usedAt))
    );
}
