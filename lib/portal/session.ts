import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { cache } from "react";
import {
  PORTAL_COOKIE,
  verifyPortalToken,
  type PortalSession,
} from "@/lib/portal/tokens";

/**
 * Resolve the portal session from the httpOnly cookie, or null.
 * Wrapped in React `cache()` so a layout and the page it wraps share one token
 * lookup per request instead of querying twice.
 */
export const getPortalSession = cache(async (): Promise<PortalSession | null> => {
  const jar = await cookies();
  return verifyPortalToken(jar.get(PORTAL_COOKIE)?.value);
});

/** Gate for portal pages — sends the visitor to the "link expired" screen. */
export async function requirePortalSession(): Promise<PortalSession> {
  const session = await getPortalSession();
  if (!session) redirect("/portal/expired");
  return session;
}

/**
 * Auth wrapper for portal route handlers. Layouts don't cover route handlers,
 * so this is the single gate they share — one place decides the failure
 * response, and a handler can't accidentally ship without a session check.
 */
export function withPortalSession<C>(
  handler: (session: PortalSession, req: Request, ctx: C) => Promise<Response>
): (req: Request, ctx: C) => Promise<Response> {
  return async (req: Request, ctx: C) => {
    const session = await getPortalSession();
    if (!session) return new Response("Unauthorized", { status: 401 });
    return handler(session, req, ctx);
  };
}
