"use server";

import bcrypt from "bcryptjs";
import { eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { users } from "@/lib/db/schema";
import {
  consumeResetToken,
  resolveResetToken,
  revokeResetTokensFor,
} from "@/lib/auth/password-reset";

export type ResetState = { ok?: boolean; error?: string } | undefined;

/**
 * Set a new password from a reset link.
 *
 * The token is resolved and then burned before the password is written, so a
 * link that is replayed (or clicked twice) cannot set the password again.
 */
export async function resetPasswordAction(
  token: string,
  _prev: ResetState,
  formData: FormData
): Promise<ResetState> {
  const password = String(formData.get("password") || "");
  const confirm = String(formData.get("confirm") || "");

  if (password.length < 8) return { error: "סיסמה חייבת להיות 8 תווים לפחות" };
  if (password !== confirm) return { error: "הסיסמאות אינן תואמות" };

  const userId = await resolveResetToken(token);
  if (!userId) return { error: "הקישור פג תוקף או כבר נוצל" };

  if (!(await consumeResetToken(token))) {
    return { error: "הקישור פג תוקף או כבר נוצל" };
  }

  await db
    .update(users)
    .set({ passwordHash: await bcrypt.hash(password, 10) })
    .where(eq(users.id, userId));

  // Any other outstanding link for this user is now stale.
  await revokeResetTokensFor(userId);

  return { ok: true };
}
