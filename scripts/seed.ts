/**
 * Seeds the two lawyer users (spec §1.3 / §3.1).
 * Run with: npm run db:seed
 *
 * Credentials are read from env (set them in .env.local), with safe
 * placeholders if missing. CHANGE THE PASSWORDS before production.
 */
import { config } from "dotenv";
import bcrypt from "bcryptjs";

config({ path: ".env.local" });

type SeedUser = { fullName: string; email: string; password: string };

const seedUsers: SeedUser[] = [
  {
    fullName: process.env.SEED_LAWYER1_NAME || "עורכת דין א׳",
    email: (process.env.SEED_LAWYER1_EMAIL || "lawyer1@example.com").toLowerCase(),
    password: process.env.SEED_LAWYER1_PASSWORD || "ChangeMe!123",
  },
  {
    fullName: process.env.SEED_LAWYER2_NAME || "עורכת דין ב׳",
    email: (process.env.SEED_LAWYER2_EMAIL || "lawyer2@example.com").toLowerCase(),
    password: process.env.SEED_LAWYER2_PASSWORD || "ChangeMe!123",
  },
];

async function main() {
  if (!process.env.DATABASE_URL) {
    throw new Error("DATABASE_URL is not set (.env.local)");
  }

  // Import after env is loaded so the Neon client initializes correctly.
  const { db } = await import("../lib/db");
  const { users } = await import("../lib/db/schema");

  for (const u of seedUsers) {
    const passwordHash = await bcrypt.hash(u.password, 10);
    await db
      .insert(users)
      .values({
        fullName: u.fullName,
        email: u.email,
        passwordHash,
        role: "lawyer",
        isActive: true,
      })
      .onConflictDoNothing({ target: users.email });
    console.log(`✓ seeded ${u.email}`);
  }

  console.log(
    "\nDone. If you used the default passwords (ChangeMe!123), change them now."
  );
  process.exit(0);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
