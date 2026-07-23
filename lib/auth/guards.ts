import { redirect } from "next/navigation";
import { auth } from "@/auth";

export type SessionUser = {
  id: string;
  name: string;
  email: string;
  role: string;
};

/**
 * Server-side authentication gate: any signed-in user (whatever their role)
 * may enter the app shell. Role/scope-specific authorization is enforced
 * deeper in — getViewer() resolves visibility scopes, requireAdmin /
 * requireFinanceRole gate privileged areas. Call at the top of protected
 * pages/actions.
 */
export async function requireUser(): Promise<SessionUser> {
  const session = await auth();
  if (!session?.user) redirect("/login");
  return session.user as SessionUser;
}
