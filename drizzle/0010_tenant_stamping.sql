ALTER TABLE "cases" ALTER COLUMN "firm_id" DROP DEFAULT;--> statement-breakpoint
ALTER TABLE "charges" ALTER COLUMN "firm_id" DROP DEFAULT;--> statement-breakpoint
ALTER TABLE "client_portal_tokens" ALTER COLUMN "firm_id" DROP DEFAULT;--> statement-breakpoint
ALTER TABLE "clients" ALTER COLUMN "firm_id" DROP DEFAULT;--> statement-breakpoint
ALTER TABLE "deadlines" ALTER COLUMN "firm_id" DROP DEFAULT;--> statement-breakpoint
ALTER TABLE "document_templates" ALTER COLUMN "firm_id" DROP DEFAULT;--> statement-breakpoint
ALTER TABLE "documents" ALTER COLUMN "firm_id" DROP DEFAULT;--> statement-breakpoint
ALTER TABLE "fee_agreements" ALTER COLUMN "firm_id" DROP DEFAULT;--> statement-breakpoint
ALTER TABLE "hearings" ALTER COLUMN "firm_id" DROP DEFAULT;--> statement-breakpoint
ALTER TABLE "invoices" ALTER COLUMN "firm_id" DROP DEFAULT;--> statement-breakpoint
ALTER TABLE "notes" ALTER COLUMN "firm_id" DROP DEFAULT;--> statement-breakpoint
ALTER TABLE "payments" ALTER COLUMN "firm_id" DROP DEFAULT;--> statement-breakpoint
ALTER TABLE "tasks" ALTER COLUMN "firm_id" DROP DEFAULT;--> statement-breakpoint
ALTER TABLE "time_entries" ALTER COLUMN "firm_id" DROP DEFAULT;--> statement-breakpoint
ALTER TABLE "trust_accounts" ALTER COLUMN "firm_id" DROP DEFAULT;--> statement-breakpoint
ALTER TABLE "trust_transactions" ALTER COLUMN "firm_id" DROP DEFAULT;--> statement-breakpoint
ALTER TABLE "users" ALTER COLUMN "firm_id" DROP DEFAULT;--> statement-breakpoint
ALTER TABLE "workflows" ALTER COLUMN "firm_id" DROP DEFAULT;--> statement-breakpoint
--> app_settings becomes per-firm. Add the column nullable first so the existing
--> singleton row survives, attach it to the oldest firm (the only one on a
--> single-tenant deployment), drop any extra rows that would break the unique
--> constraint, then tighten to NOT NULL.
ALTER TABLE "app_settings" ADD COLUMN "firm_id" uuid;--> statement-breakpoint
UPDATE "app_settings" SET "firm_id" = (
  SELECT "id" FROM "firms" ORDER BY "created_at" ASC LIMIT 1
) WHERE "firm_id" IS NULL;--> statement-breakpoint
DELETE FROM "app_settings" WHERE "firm_id" IS NULL;--> statement-breakpoint
DELETE FROM "app_settings" a USING "app_settings" b
  WHERE a."firm_id" = b."firm_id" AND a."created_at" > b."created_at";--> statement-breakpoint
ALTER TABLE "app_settings" ALTER COLUMN "firm_id" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "app_settings" ADD CONSTRAINT "app_settings_firm_id_firms_id_fk" FOREIGN KEY ("firm_id") REFERENCES "public"."firms"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "app_settings" ADD CONSTRAINT "app_settings_firm_id_unique" UNIQUE("firm_id");