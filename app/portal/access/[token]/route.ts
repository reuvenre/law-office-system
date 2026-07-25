import { cookies } from "next/headers";
import { NextResponse, after } from "next/server";
import { PORTAL_COOKIE, verifyPortalToken, touchPortalToken } from "@/lib/portal/tokens";
import { appBaseUrl } from "@/lib/url";

export const dynamic = "force-dynamic";

/**
 * Redeem a portal magic link: validate the token, move it out of the URL and
 * into an httpOnly cookie, then redirect. Keeping the token in a cookie rather
 * than the address bar prevents it leaking through Referer headers, browser
 * history, and shared screenshots.
 */
export async function GET(
  _req: Request,
  { params }: { params: Promise<{ token: string }> }
) {
  const { token } = await params;
  const session = await verifyPortalToken(token);

  const target = new URL(session ? "/portal" : "/portal/expired", appBaseUrl());
  const res = NextResponse.redirect(target, { status: 302 });
  res.headers.set("Referrer-Policy", "no-referrer");
  res.headers.set("Cache-Control", "no-store");

  if (!session) return res;

  const jar = await cookies();
  jar.set(PORTAL_COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/portal",
    // Expire the cookie with the token it carries, so the two never diverge.
    expires: session.expiresAt,
  });

  // Bookkeeping only — don't hold up the redirect for it.
  after(() => touchPortalToken(session.tokenId));
  return res;
}
