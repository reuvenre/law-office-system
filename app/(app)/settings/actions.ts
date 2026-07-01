"use server";

import { revalidatePath } from "next/cache";
import { eq } from "drizzle-orm";
import bcrypt from "bcryptjs";
import { z } from "zod";
import { db } from "@/lib/db";
import { users, appSettings } from "@/lib/db/schema";
import { requireLawyer } from "@/lib/auth/guards";
import { getSettings } from "@/lib/data/settings";

export type UserFormState = { error?: string } | undefined;

type Role = "lawyer" | "assistant";

/** Update a user's display name / phone / role (spec §6.10). */
export async function updateUserAction(userId: string, formData: FormData) {
  await requireLawyer();
  const fullName = (formData.get("fullName") as string)?.trim();
  const phone = (formData.get("phone") as string)?.trim() || null;
  const role = String(formData.get("role") || "lawyer") as Role;
  if (!fullName) return;

  await db
    .update(users)
    .set({ fullName, phone, role })
    .where(eq(users.id, userId));
  revalidatePath("/settings");
}

/** Set a user's password (for the email/password sign-in path). */
export async function setPasswordAction(userId: string, formData: FormData) {
  await requireLawyer();
  const password = String(formData.get("password") || "");
  if (password.length < 8) return;
  const passwordHash = await bcrypt.hash(password, 10);
  await db.update(users).set({ passwordHash }).where(eq(users.id, userId));
  revalidatePath("/settings");
}

/** Activate / deactivate a user (soft access control). */
export async function setUserActiveAction(userId: string, isActive: boolean) {
  await requireLawyer();
  await db.update(users).set({ isActive }).where(eq(users.id, userId));
  revalidatePath("/settings");
}

const addUserSchema = z.object({
  fullName: z.string().trim().min(1),
  email: z.string().trim().email(),
  role: z.enum(["lawyer", "assistant"]),
  password: z.string().min(8),
});

/** Add a new user (lawyer or assistant). */
export async function addUserAction(
  _prev: UserFormState,
  formData: FormData
): Promise<UserFormState> {
  await requireLawyer();
  const parsed = addUserSchema.safeParse({
    fullName: formData.get("fullName"),
    email: formData.get("email"),
    role: formData.get("role"),
    password: formData.get("password"),
  });
  if (!parsed.success) {
    return { error: "מלא שם, אימייל תקין, תפקיד וסיסמה (8+ תווים)" };
  }

  const email = parsed.data.email.toLowerCase();
  const passwordHash = await bcrypt.hash(parsed.data.password, 10);

  const existing = await db
    .select({ id: users.id })
    .from(users)
    .where(eq(users.email, email))
    .limit(1);
  if (existing[0]) return { error: "אימייל כבר קיים במערכת" };

  await db.insert(users).values({
    fullName: parsed.data.fullName,
    email,
    role: parsed.data.role,
    passwordHash,
    isActive: true,
  });
  revalidatePath("/settings");
  return undefined;
}

function parseDays(raw: unknown): number[] {
  return String(raw ?? "")
    .split(",")
    .map((s) => parseInt(s.trim(), 10))
    .filter((n) => Number.isFinite(n) && n >= 0);
}

/** Update reminder templates, alert windows and default channel (spec §6.10). */
export async function updateReminderSettingsAction(formData: FormData) {
  await requireLawyer();
  const current = await getSettings();
  await db
    .update(appSettings)
    .set({
      hearingTemplate: String(formData.get("hearingTemplate") || ""),
      deadlineTemplate: String(formData.get("deadlineTemplate") || ""),
      hearingDaysBefore: parseDays(formData.get("hearingDaysBefore")),
      deadlineCriticalDays: parseDays(formData.get("deadlineCriticalDays")),
      deadlineHighDays: parseDays(formData.get("deadlineHighDays")),
      defaultChannel: String(formData.get("defaultChannel") || "whatsapp") as
        | "whatsapp"
        | "sms"
        | "email",
    })
    .where(eq(appSettings.id, current.id));
  revalidatePath("/settings");
}
