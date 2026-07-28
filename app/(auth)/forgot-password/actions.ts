"use server";

import { z } from "zod";
import { createResetToken, RESET_TTL_MINUTES } from "@/lib/auth/password-reset";
import { resendEmail } from "@/lib/messaging/providers";
import { appBaseUrl } from "@/lib/url";

export type ForgotState = { sent?: boolean; error?: string } | undefined;

const schema = z.object({ email: z.string().trim().email() });

/**
 * Send a password-reset link.
 *
 * Always reports success, whether or not the address belongs to a user: a form
 * that distinguishes the two tells anyone who asks which lawyers work here.
 */
export async function requestPasswordResetAction(
  _prev: ForgotState,
  formData: FormData
): Promise<ForgotState> {
  const parsed = schema.safeParse({ email: formData.get("email") });
  if (!parsed.success) return { error: "יש להזין כתובת אימייל תקינה" };

  const issued = await createResetToken(parsed.data.email);
  if (issued) {
    const link = `${appBaseUrl()}/reset-password/${issued.raw}`;
    const result = await resendEmail.send(
      parsed.data.email,
      `שלום ${issued.fullName},\n\n` +
        `התקבלה בקשה לאיפוס הסיסמה שלך במערכת ניהול המשרד.\n` +
        `לקביעת סיסמה חדשה: ${link}\n\n` +
        `הקישור תקף ל-${RESET_TTL_MINUTES} דקות וניתן לשימוש פעם אחת.\n` +
        `אם לא ביקשת לאפס סיסמה, אפשר להתעלם מהודעה זו — הסיסמה הנוכחית נשארת בתוקף.\n\n` +
        `מערכת מבית win-solutions.co.il`
    );
    if (result.status !== "sent") {
      // Log for the operator; the visitor still sees the neutral message.
      console.error("password reset email failed", result.providerResponse);
    }
  }

  return { sent: true };
}
