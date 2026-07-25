import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import {
  PORTAL_COOKIE,
  verifyPortalToken,
  type PortalSession,
} from "@/lib/portal/tokens";

/** Resolve the portal session from the httpOnly cookie, or null. */
export async function getPortalSession(): Promise<PortalSession | null> {
  const jar = await cookies();
  return verifyPortalToken(jar.get(PORTAL_COOKIE)?.value);
}

/** Gate for portal pages — sends the visitor to the "link expired" screen. */
export async function requirePortalSession(): Promise<PortalSession> {
  const session = await getPortalSession();
  if (!session) redirect("/portal/expired");
  return session;
}
