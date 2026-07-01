"use server";

import { revalidatePath } from "next/cache";
import { and, eq, ne } from "drizzle-orm";
import bcrypt from "bcryptjs";
import { z } from "zod";
import { db } from "@/lib/db";
import { users, appSettings } from "@/lib/db/schema";
import { getViewer, requireAdmin } from "@/lib/auth/viewer";
import { getSettings } from "@/lib/data/settings";

export type UserFormState = { error?: string } | undefined;

type Role = "lawyer" | "assistant";
type Scope = "all" | "own" | "custom";

/** Update name / email / phone (self or admin); role changes are admin-only. */
export async function updateUserAction(
  userId: string,
  formData: FormData
): Promise<UserFormState> {
  const viewer = await getViewer();
  if (!viewer.isAdmin && viewer.id !== userId) {
    return { error: "אין הרשאה" };
  }

  const fullName = (formData.get("fullName") as string)?.trim();
  const phone = (formData.get("phone") as string)?.trim() || null;
  const email = String(formData.get("email") || "").trim().toLowerCase();
  if (!fullName || !email) return { error: "שם ואימייל הם שדות חובה" };
  if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) {
    return { error: "אימייל לא תקין" };
  }

  const clash = await db
    .select({ id: users.id })
    .from(users)
    .where(and(eq(users.email, email), ne(users.id, userId)))
    .limit(1);
  if (clash[0]) return { error: "אימייל כבר קיים במערכת" };

  const patch: Record<string, unknown> = { fullName, phone, email };
  if (viewer.isAdmin) {
    patch.role = String(formData.get("role") || "lawyer") as Role;
  }
  await db.update(users).set(patch).where(eq(users.id, userId));
  revalidatePath("/settings");
  return undefined;
}

/** Set a password (self or admin). */
export async function setPasswordAction(userId: string, formData: FormData) {
  const viewer = await getViewer();
  if (!viewer.isAdmin && viewer.id !== userId) return;
  const password = String(formData.get("password") || "");
  if (password.length < 8) return;
  const passwordHash = await bcrypt.hash(password, 10);
  await db.update(users).set({ passwordHash }).where(eq(users.id, userId));
  revalidatePath("/settings");
}

/** Activate / deactivate a user (admin only). */
export async function setUserActiveAction(userId: string, isActive: boolean) {
  await requireAdmin();
  await db.update(users).set({ isActive }).where(eq(users.id, userId));
  revalidatePath("/settings");
}

/** Set a user's visibility scope + admin flag (admin only). */
export async function setUserScopeAction(userId: string, formData: FormData) {
  await requireAdmin();
  const isAdmin = formData.get("isAdmin") === "on";
  const accessScope = String(formData.get("accessScope") || "own") as Scope;
  const visibleUserIds = formData
    .getAll("visibleUserIds")
    .map(String)
    .filter(Boolean);
  await db
    .update(users)
    .set({ isAdmin, accessScope, visibleUserIds })
    .where(eq(users.id, userId));
  revalidatePath("/settings");
}

const addUserSchema = z.object({
  fullName: z.string().trim().min(1),
  email: z.string().trim().email(),
  role: z.enum(["lawyer", "assistant"]),
  password: z.string().min(8),
});

/** Add a new user (admin only). */
export async function addUserAction(
  _prev: UserFormState,
  formData: FormData
): Promise<UserFormState> {
  await requireAdmin();
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
    accessScope: "own",
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

/** Update reminder templates / windows / channel (admin only). */
export async function updateReminderSettingsAction(formData: FormData) {
  await requireAdmin();
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
