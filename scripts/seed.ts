/**
 * Seeds two lawyer users into the deployment's existing firm — a development
 * convenience, not the onboarding path. To create a firm (and its first admin),
 * use `npm run db:provision`.
 *
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
  const { users, firms } = await import("../lib/db/schema");

  // Which firm do these users belong to? Only answerable while there is exactly
  // one — past that, guessing would file lawyers into someone else's tenant.
  const firmRows = await db.select({ id: firms.id, name: firms.name }).from(firms).limit(2);
  if (firmRows.length === 0) {
    throw new Error(
      "No firm exists yet. Create one first:\n" +
        '  npm run db:provision -- --name "<firm>" --admin-name "<name>" ' +
        "--admin-email <email> --password <password>"
    );
  }
  if (firmRows.length > 1) {
    throw new Error(
      "More than one firm exists — seeding is ambiguous. Use db:provision, or " +
        "add users from that firm's Settings screen."
    );
  }
  const firmId = firmRows[0].id;
  console.log(`Seeding into firm "${firmRows[0].name}"`);

  for (const u of seedUsers) {
    const passwordHash = await bcrypt.hash(u.password, 10);
    await db
      .insert(users)
      .values({
        firmId,
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
