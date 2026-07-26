import { execSync } from "node:child_process";

/**
 * Applies pending Drizzle migrations during a Vercel build (see the
 * `vercel-build` script). Runs before `next build`, so a failed migration
 * fails the deploy instead of shipping code against an older schema.
 *
 * Production only by default. Preview deployments usually share the production
 * DATABASE_URL, and migrating from an unmerged branch would alter the live
 * schema before the change is reviewed. Set MIGRATE_ON_DEPLOY=always to opt
 * preview builds in (sensible when each preview gets its own Neon branch).
 */
const vercelEnv = process.env.VERCEL_ENV;
const always = process.env.MIGRATE_ON_DEPLOY === "always";

if (vercelEnv && vercelEnv !== "production" && !always) {
  console.log(
    `[migrate-on-deploy] VERCEL_ENV=${vercelEnv} — skipping migrations (production only).`
  );
  console.log(
    "[migrate-on-deploy] Set MIGRATE_ON_DEPLOY=always to migrate on preview builds too."
  );
  process.exit(0);
}

console.log("[migrate-on-deploy] applying pending migrations…");
execSync("npm run db:migrate", { stdio: "inherit" });
console.log("[migrate-on-deploy] migrations up to date.");
