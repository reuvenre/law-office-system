import NextAuth from "next-auth";
import Google from "next-auth/providers/google";
import Credentials from "next-auth/providers/credentials";
import bcrypt from "bcryptjs";
import { eq } from "drizzle-orm";
import { z } from "zod";
import { authConfig } from "./auth.config";
import { db } from "@/lib/db";
import { users, firms } from "@/lib/db/schema";

const credentialsSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

/** Emails permitted to sign in (the firm's lawyers). Comma-separated env. */
function allowedEmails(): string[] {
  return (process.env.ALLOWED_EMAILS ?? "")
    .split(",")
    .map((e) => e.trim().toLowerCase())
    .filter(Boolean);
}

async function findUserByEmail(email: string) {
  const rows = await db
    .select()
    .from(users)
    .where(eq(users.email, email))
    .limit(1);
  return rows[0] ?? null;
}

/**
 * The firm a first-time Google sign-in should be provisioned into.
 *
 * Only answerable while the deployment serves a single firm — with two firms on
 * one deployment there is no way to tell which one an ALLOWED_EMAILS address
 * belongs to, and guessing would file a lawyer (and everything they then
 * create) into someone else's tenant. Past that point users are created by
 * their own firm's admin in Settings, so we fail closed and refuse the sign-in.
 */
async function bootstrapFirmId(): Promise<string | null> {
  const rows = await db.select({ id: firms.id }).from(firms).limit(2);
  return rows.length === 1 ? rows[0].id : null;
}

export const { handlers, auth, signIn, signOut } = NextAuth({
  ...authConfig,
  providers: [
    Google({
      clientId: process.env.GOOGLE_CLIENT_ID,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET,
    }),
    // Fallback (email + password) — kept so the app is never locked out before
    // Google OAuth is configured. Can be removed once Google sign-in is verified.
    Credentials({
      credentials: { email: {}, password: {} },
      async authorize(raw) {
        const parsed = credentialsSchema.safeParse(raw);
        if (!parsed.success) return null;
        const user = await findUserByEmail(parsed.data.email.toLowerCase());
        if (!user || !user.isActive || !user.passwordHash) return null;
        const valid = await bcrypt.compare(parsed.data.password, user.passwordHash);
        if (!valid) return null;
        return { id: user.id, email: user.email, name: user.fullName, role: user.role };
      },
    }),
  ],
  callbacks: {
    ...authConfig.callbacks,
    // Restrict who may sign in (spec §1.3 — two lawyers only).
    async signIn({ user, account }) {
      // Credentials authorize already validated the user.
      if (account?.provider === "credentials") return true;

      const email = user.email?.toLowerCase();
      if (!email) return false;
      if (allowedEmails().includes(email)) return true;

      const existing = await findUserByEmail(email);
      return !!existing?.isActive;
    },
    // Enrich the token with our internal user id + role (DB lookup on sign-in
    // only; runs in Node, never in edge middleware).
    async jwt({ token, user }) {
      if (user?.email) {
        const email = user.email.toLowerCase();
        let dbUser = await findUserByEmail(email);
        if (!dbUser) {
          // First Google sign-in for an allowed email — provision the row into
          // the deployment's only firm. Null once a second firm exists.
          const firmId = await bootstrapFirmId();
          if (firmId) {
            await db
              .insert(users)
              .values({
                firmId,
                email,
                fullName: user.name ?? email,
                role: "lawyer",
                isActive: true,
              })
              .onConflictDoNothing({ target: users.email });
            dbUser = await findUserByEmail(email);
          }
        }
        if (dbUser) {
          token.id = dbUser.id;
          token.role = dbUser.role;
          token.name = dbUser.fullName;
        }
      }
      return token;
    },
  },
});
