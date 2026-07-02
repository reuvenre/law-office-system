import type { NextAuthConfig } from "next-auth";

/**
 * Edge-safe Auth.js config (no DB / bcrypt) used by middleware.
 * The Credentials provider with DB access is added in auth.ts (Node runtime).
 */
export const authConfig = {
  pages: { signIn: "/login" },
  session: { strategy: "jwt" },
  trustHost: true,
  providers: [],
  callbacks: {
    authorized({ auth, request: { nextUrl } }) {
      const isLoggedIn = !!auth?.user;
      const { pathname } = nextUrl;

      const isAuthRoute = pathname.startsWith("/login");
      // Machine endpoints authenticate via their own shared secret, not a
      // user session — they must bypass session-based middleware.
      const isPublic =
        pathname === "/" ||
        pathname.startsWith("/api/auth") ||
        pathname.startsWith("/api/cron") ||
        pathname.startsWith("/api/webhooks") ||
        pathname.startsWith("/api/integrations");

      if (isAuthRoute) {
        if (isLoggedIn) {
          return Response.redirect(new URL("/dashboard", nextUrl));
        }
        return true;
      }
      if (isPublic) return true;

      // Everything else requires an authenticated user.
      return isLoggedIn;
    },
    jwt({ token, user }) {
      if (user) {
        token.id = user.id;
        token.role = user.role;
      }
      return token;
    },
    session({ session, token }) {
      if (token && session.user) {
        session.user.id = token.id as string;
        session.user.role = token.role as string;
      }
      return session;
    },
  },
} satisfies NextAuthConfig;
