/**
 * Provision a new law firm (tenant) and its first admin user.
 *
 * This is the supported way to onboard a customer — every other write path
 * stamps `firm_id` from the signed-in user, so a firm has to exist before
 * anyone can belong to it.
 *
 * Usage:
 *   npm run db:provision -- --name "משרד כהן ושות׳" \
 *     --admin-name "עו״ד דנה כהן" \
 *     --admin-email dana@cohen-law.co.il \
 *     --password 'a-strong-password' \
 *     [--plan basic|pro|enterprise]
 *
 * Re-running with the same admin email is safe: the firm is matched by name and
 * the user by email, so nothing is duplicated.
 */
import { config } from "dotenv";
import bcrypt from "bcryptjs";

config({ path: ".env.local" });

function arg(flag: string): string | undefined {
  const i = process.argv.indexOf(`--${flag}`);
  return i >= 0 ? process.argv[i + 1] : undefined;
}

function required(flag: string, envKey: string): string {
  const value = arg(flag) ?? process.env[envKey];
  if (!value?.trim()) {
    console.error(`Missing --${flag} (or ${envKey}).`);
    process.exit(1);
  }
  return value.trim();
}

async function main() {
  if (!process.env.DATABASE_URL) {
    throw new Error("DATABASE_URL is not set (.env.local)");
  }

  const firmName = required("name", "FIRM_NAME");
  const adminName = required("admin-name", "FIRM_ADMIN_NAME");
  const adminEmail = required("admin-email", "FIRM_ADMIN_EMAIL").toLowerCase();
  const password = required("password", "FIRM_ADMIN_PASSWORD");
  const plan = (arg("plan") ?? process.env.FIRM_PLAN ?? "basic").trim();

  if (password.length < 8) {
    console.error("Password must be at least 8 characters.");
    process.exit(1);
  }

  // Import after env is loaded so the Neon client initializes correctly.
  const { eq } = await import("drizzle-orm");
  const { db } = await import("../lib/db");
  const { firms, users, appSettings } = await import("../lib/db/schema");
  const { PLANS } = await import("../lib/plans");

  if (!PLANS[plan]) {
    console.error(`Unknown plan "${plan}". Expected one of: ${Object.keys(PLANS).join(", ")}`);
    process.exit(1);
  }

  const [existingFirm] = await db
    .select({ id: firms.id })
    .from(firms)
    .where(eq(firms.name, firmName))
    .limit(1);

  let firmId: string;
  if (existingFirm) {
    firmId = existingFirm.id;
    console.log(`• firm "${firmName}" already exists — reusing it`);
  } else {
    const [created] = await db
      .insert(firms)
      .values({ name: firmName, licensePlan: plan, modules: PLANS[plan].modules })
      .returning({ id: firms.id });
    firmId = created.id;
    console.log(`✓ created firm "${firmName}" (${plan})`);
  }

  // Each firm gets its own reminder settings; without this the first admin who
  // opens Settings would create it implicitly, which is fine but less obvious.
  await db.insert(appSettings).values({ firmId }).onConflictDoNothing();

  const [existingUser] = await db
    .select({ id: users.id, firmId: users.firmId })
    .from(users)
    .where(eq(users.email, adminEmail))
    .limit(1);

  if (existingUser) {
    if (existingUser.firmId !== firmId) {
      console.error(
        `✗ ${adminEmail} already belongs to a different firm. Emails are the ` +
          `login identity and must be unique across the platform.`
      );
      process.exit(1);
    }
    console.log(`• admin ${adminEmail} already exists — leaving it untouched`);
  } else {
    await db.insert(users).values({
      firmId,
      fullName: adminName,
      email: adminEmail,
      passwordHash: await bcrypt.hash(password, 10),
      role: "admin",
      isAdmin: true,
      accessScope: "all",
      isActive: true,
    });
    console.log(`✓ created admin ${adminEmail}`);
  }

  console.log(`\nFirm id: ${firmId}`);
  console.log(
    "Next: sign in at /login with that email and password, then add the rest " +
      "of the team in Settings. For Google sign-in, add the address to " +
      "ALLOWED_EMAILS as well."
  );
  process.exit(0);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
