import { config } from "dotenv";
import { defineConfig } from "drizzle-kit";

// Local development reads .env.local; on Vercel the file is absent and dotenv
// is a no-op, so DATABASE_URL comes from the project's environment variables.
config({ path: ".env.local" });

if (!process.env.DATABASE_URL) {
  throw new Error(
    "DATABASE_URL is not set. Locally: add it to .env.local. On Vercel: set it " +
      "in Project Settings → Environment Variables (it is needed at build time " +
      "because vercel-build runs migrations)."
  );
}

export default defineConfig({
  schema: "./lib/db/schema.ts",
  out: "./drizzle",
  dialect: "postgresql",
  dbCredentials: {
    url: process.env.DATABASE_URL,
  },
  verbose: true,
  strict: true,
});
