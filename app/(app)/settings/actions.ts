"use server";

import { revalidatePath } from "next/cache";
import { and, eq, ne } from "drizzle-orm";
import bcrypt from "bcryptjs";
import { z } from "zod";
import { db } from "@/lib/db";
import { users, appSettings, firms } from "@/lib/db/schema";
import {
  getViewer,
  requireAdmin,
  requireVendor,
  type Viewer,
} from "@/lib/auth/viewer";
import { isSameFirmUser } from "@/lib/data/users";
import { getSettings } from "@/lib/data/settings";
import { PLANS, MODULES, type ModuleKey } from "@/lib/plans";

export type UserFormState = { error?: string } | undefined;

const ROLE_VALUES = [
  "lawyer",
  "assistant",
  "admin",
  "secretary",
  "accountant",
  "intern",
] as const;
type Role = (typeof ROLE_VALUES)[number];
type Scope = "all" | "own" | "custom";

/**
 * May this viewer administer this user row?
 *
 * `isAdmin` alone only says "an admin of some firm" — it must be paired with a
 * tenant check, or one firm's admin can reset another firm's partner password
 * and sign in as them. Self-service (name/phone/own password) stays allowed.
 */
async function canAdministerUser(viewer: Viewer, userId: string) {
  if (viewer.id === userId) return true;
  if (!viewer.isAdmin) return false;
  return isSameFirmUser(userId, viewer.firmId);
}

/**
 * Update a user. Name/phone: self or admin. Email + role: admin only
 * (email is the login identity, so self-service change is blocked).
 */
export async function updateUserAction(
  userId: string,
  formData: FormData
): Promise<UserFormState> {
  const viewer = await getViewer();
  if (!(await canAdministerUser(viewer, userId))) {
    return { error: "אין הרשאה" };
  }

  const fullName = (formData.get("fullName") as string)?.trim();
  const phone = (formData.get("phone") as string)?.trim() || null;
  if (!fullName) return { error: "שם הוא שדה חובה" };

  const patch: Record<string, unknown> = { fullName, phone };

  if (viewer.isAdmin) {
    const email = String(formData.get("email") || "").trim().toLowerCase();
    if (!email || !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) {
      return { error: "אימייל לא תקין" };
    }
    const clash = await db
      .select({ id: users.id })
      .from(users)
      .where(and(eq(users.email, email), ne(users.id, userId)))
      .limit(1);
    if (clash[0]) return { error: "אימייל כבר קיים במערכת" };
    patch.email = email;
    patch.role = String(formData.get("role") || "lawyer") as Role;
  }

  await db.update(users).set(patch).where(eq(users.id, userId));
  revalidatePath("/settings");
  return undefined;
}

/** Set a password (self or admin of the same firm). */
export async function setPasswordAction(
  userId: string,
  formData: FormData
): Promise<UserFormState> {
  const viewer = await getViewer();
  if (!(await canAdministerUser(viewer, userId))) return { error: "אין הרשאה" };
  const password = String(formData.get("password") || "");
  if (password.length < 8) return { error: "סיסמה חייבת להיות 8 תווים לפחות" };
  const passwordHash = await bcrypt.hash(password, 10);
  await db.update(users).set({ passwordHash }).where(eq(users.id, userId));
  revalidatePath("/settings");
  return undefined;
}

/** Activate / deactivate a user (admin of the same firm). */
export async function setUserActiveAction(userId: string, isActive: boolean) {
  const viewer = await requireAdmin();
  if (!(await isSameFirmUser(userId, viewer.firmId))) return;
  await db.update(users).set({ isActive }).where(eq(users.id, userId));
  revalidatePath("/settings");
}

/** Set a user's visibility scope + admin flag (admin of the same firm). */
export async function setUserScopeAction(userId: string, formData: FormData) {
  const viewer = await requireAdmin();
  if (!(await isSameFirmUser(userId, viewer.firmId))) return;
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
  role: z.enum(ROLE_VALUES),
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

  // Enforce the firm's plan seat cap.
  const viewer = await getViewer();
  const { getFirm, countActiveSeats } = await import("@/lib/data/firm");
  const { seatLimitReached, planFor } = await import("@/lib/plans");
  const [firm, seats] = await Promise.all([
    getFirm(viewer.firmId),
    countActiveSeats(viewer.firmId),
  ]);
  if (seatLimitReached(firm.licensePlan, seats)) {
    return {
      error: `הגעתם למכסת המשתמשים בתוכנית ${planFor(firm.licensePlan).label}. לשדרוג פנו ל-win-solutions.co.il`,
    };
  }

  await db.insert(users).values({
    firmId: viewer.firmId,
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

/**
 * Update the firm's plan + module toggles.
 *
 * Vendor-only. The plan is what the firm pays for, so a customer admin must not
 * be able to move themselves to a higher tier — the entitlement system is only
 * worth anything if the entity it gates cannot write to it.
 */
export async function updateFirmPlanAction(
  formData: FormData
): Promise<{ error?: string } | undefined> {
  const viewer = await requireVendor();
  if (!viewer) return { error: "שינוי תוכנית מתבצע על ידי win-solutions.co.il" };
  const licensePlan = String(formData.get("licensePlan") || "basic");
  if (!PLANS[licensePlan]) return { error: "תוכנית לא מוכרת" };

  const modules = Object.fromEntries(
    (Object.keys(MODULES) as ModuleKey[]).map((k) => [
      k,
      formData.get(`module_${k}`) === "on",
    ])
  );

  await db
    .update(firms)
    .set({ licensePlan, modules })
    .where(eq(firms.id, viewer.firmId));
  revalidatePath("/settings");
  revalidatePath("/billing");
  return undefined;
}

/** Update reminder templates / windows / channel (admin only). */
export async function updateReminderSettingsAction(formData: FormData) {
  const viewer = await requireAdmin();
  const current = await getSettings(viewer.firmId);
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
