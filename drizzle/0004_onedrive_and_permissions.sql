CREATE TYPE "public"."access_scope" AS ENUM('all', 'own', 'custom');--> statement-breakpoint
ALTER TABLE "cases" ADD COLUMN "onedrive_url" text;--> statement-breakpoint
ALTER TABLE "clients" ADD COLUMN "onedrive_url" text;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "is_admin" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "access_scope" "access_scope" DEFAULT 'own' NOT NULL;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "visible_user_ids" jsonb DEFAULT '[]'::jsonb NOT NULL;--> statement-breakpoint
-- Existing users become full-access admins so nobody is locked out on upgrade.
UPDATE "users" SET "is_admin" = true, "access_scope" = 'all';