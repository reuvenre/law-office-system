import { redirect } from "next/navigation";
import { eq } from "drizzle-orm";
import { auth } from "@/auth";
import { db } from "@/lib/db";
import { users } from "@/lib/db/schema";

export type Viewer = {
  id: string;
  name: string;
  email: string;
  role: string;
  isAdmin: boolean;
  /** The firm this viewer belongs to (tenant boundary). */
  firmId: string;
  /** Lawyer ids whose data this viewer may see, or null = the whole firm. */
  allowedIds: string[] | null;
};

/**
 * Resolves the current user together with their visibility scope (spec:
 * large-firm access control). Admins and 'all'-scope users see everything;
 * 'own' sees only their own responsibility/creations; 'custom' also sees a
 * chosen set of colleagues. Enforced across every list/detail query.
 */
export async function getViewer(): Promise<Viewer> {
  const session = await auth();
  if (!session?.user) redirect("/login");

  const [u] = await db
    .select()
    .from(users)
    .where(eq(users.id, session.user.id))
    .limit(1);
  if (!u || !u.isActive) redirect("/login");

  let allowedIds: string[] | null;
  if (u.isAdmin || u.accessScope === "all") {
    allowedIds = null;
  } else if (u.accessScope === "custom") {
    allowedIds = [u.id, ...(u.visibleUserIds ?? [])];
  } else {
    allowedIds = [u.id];
  }

  return {
    id: u.id,
    name: u.fullName,
    email: u.email,
    role: u.role,
    isAdmin: u.isAdmin,
    firmId: u.firmId,
    allowedIds,
  };
}

/** Gate for admin-only actions/pages. */
export async function requireAdmin(): Promise<Viewer> {
  const v = await getViewer();
  if (!v.isAdmin) redirect("/dashboard");
  return v;
}

/** Gate for finance actions (invoices/payments/trust): admin or accountant. */
export async function requireFinanceRole(): Promise<Viewer> {
  const v = await getViewer();
  if (!v.isAdmin && v.role !== "admin" && v.role !== "accountant") {
    redirect("/dashboard");
  }
  return v;
}

/**
 * Gate a page/action behind a licensed module. Fail-closed: if the firm's plan
 * (or its explicit module map) doesn't include the module, redirect away.
 * Import lazily to avoid a cycle (data/firm → db → schema).
 */
export async function requireModule(moduleKey: import("@/lib/plans").ModuleKey): Promise<Viewer> {
  const v = await getViewer();
  const { getFirm } = await import("@/lib/data/firm");
  const { isModuleEnabled } = await import("@/lib/plans");
  const firm = await getFirm(v.firmId);
  if (!isModuleEnabled(firm, moduleKey)) redirect("/dashboard");
  return v;
}
