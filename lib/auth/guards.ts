import { redirect } from "next/navigation";
import { auth } from "@/auth";

export type SessionUser = {
  id: string;
  name: string;
  email: string;
  role: string;
};

/**
 * Server-side authorization gate. v1 has a single role (`lawyer`) with full
 * access, so this is the enforcement point in lieu of DB-level RLS
 * (see build plan — Neon pivot). Call at the top of protected pages/actions.
 */
export async function requireLawyer(): Promise<SessionUser> {
  const session = await auth();
  if (!session?.user) redirect("/login");
  if (session.user.role !== "lawyer") redirect("/login");
  return session.user as SessionUser;
}
