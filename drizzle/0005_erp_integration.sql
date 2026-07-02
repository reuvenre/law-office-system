CREATE TYPE "public"."charge_status" AS ENUM('pending', 'invoiced', 'cancelled');--> statement-breakpoint
CREATE TYPE "public"."charge_type" AS ENUM('fee', 'expense', 'court_fee', 'retainer', 'success_fee');--> statement-breakpoint
CREATE TYPE "public"."contact_type" AS ENUM('client', 'opposing', 'court', 'expert', 'witness', 'other');--> statement-breakpoint
CREATE TYPE "public"."doc_type" AS ENUM('proforma', 'tax_invoice', 'receipt', 'invoice_receipt', 'credit_note');--> statement-breakpoint
CREATE TYPE "public"."entity_kind" AS ENUM('person', 'company');--> statement-breakpoint
CREATE TYPE "public"."fee_type" AS ENUM('hourly', 'fixed', 'retainer', 'success_fee', 'mixed');--> statement-breakpoint
CREATE TYPE "public"."invoice_status" AS ENUM('draft', 'sent', 'partially_paid', 'paid', 'cancelled');--> statement-breakpoint
CREATE TYPE "public"."payment_method" AS ENUM('bank_transfer', 'credit_card', 'bit', 'check', 'cash');--> statement-breakpoint
CREATE TYPE "public"."trust_direction" AS ENUM('deposit', 'withdrawal');--> statement-breakpoint
ALTER TYPE "public"."role" ADD VALUE 'admin';--> statement-breakpoint
ALTER TYPE "public"."role" ADD VALUE 'secretary';--> statement-breakpoint
ALTER TYPE "public"."role" ADD VALUE 'accountant';--> statement-breakpoint
ALTER TYPE "public"."role" ADD VALUE 'intern';--> statement-breakpoint
ALTER TYPE "public"."task_status" ADD VALUE 'cancelled';--> statement-breakpoint
CREATE TABLE "case_parties" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"case_id" uuid NOT NULL,
	"contact_id" uuid NOT NULL,
	"party_role" text NOT NULL,
	CONSTRAINT "case_parties_case_id_contact_id_party_role_unique" UNIQUE("case_id","contact_id","party_role")
);
--> statement-breakpoint
CREATE TABLE "charges" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"firm_id" uuid DEFAULT '00000000-0000-0000-0000-000000000001' NOT NULL,
	"case_id" uuid NOT NULL,
	"client_id" uuid NOT NULL,
	"charge_type" charge_type NOT NULL,
	"description" text NOT NULL,
	"amount" numeric(12, 2) NOT NULL,
	"vat_rate" numeric(4, 2) DEFAULT '18.00' NOT NULL,
	"charge_date" date DEFAULT now() NOT NULL,
	"status" charge_status DEFAULT 'pending' NOT NULL,
	"source_time_entry_ids" uuid[] DEFAULT '{}' NOT NULL,
	"invoice_id" uuid,
	"created_by" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "document_templates" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"firm_id" uuid DEFAULT '00000000-0000-0000-0000-000000000001' NOT NULL,
	"name" text NOT NULL,
	"category" text,
	"storage_path" text NOT NULL,
	"merge_fields" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "fee_agreements" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"firm_id" uuid DEFAULT '00000000-0000-0000-0000-000000000001' NOT NULL,
	"client_id" uuid NOT NULL,
	"agreement_type" "fee_type" NOT NULL,
	"hourly_rate" numeric(10, 2),
	"fixed_amount" numeric(12, 2),
	"retainer_amount" numeric(12, 2),
	"retainer_hours" numeric(6, 2),
	"retainer_billing_day" integer DEFAULT 1,
	"overage_rate" numeric(10, 2),
	"success_percent" numeric(5, 2),
	"vat_included" boolean DEFAULT false NOT NULL,
	"currency" text DEFAULT 'ILS' NOT NULL,
	"valid_from" date DEFAULT now() NOT NULL,
	"valid_to" date,
	"terms" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "firm_counters" (
	"firm_id" uuid NOT NULL,
	"counter_name" text NOT NULL,
	"current_value" bigint DEFAULT 0 NOT NULL,
	CONSTRAINT "firm_counters_firm_id_counter_name_pk" PRIMARY KEY("firm_id","counter_name")
);
--> statement-breakpoint
CREATE TABLE "firms" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" text NOT NULL,
	"license_plan" text DEFAULT 'basic' NOT NULL,
	"settings" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"modules" jsonb DEFAULT '{"billing":true,"documents":true,"enforcement":false,"accounting":false}'::jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
-- Seed the single firm so firm_id backfill + FK validation succeed.
INSERT INTO "firms" ("id","name") VALUES ('00000000-0000-0000-0000-000000000001','המשרד') ON CONFLICT ("id") DO NOTHING;--> statement-breakpoint
CREATE TABLE "invoice_lines" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"invoice_id" uuid NOT NULL,
	"charge_id" uuid,
	"description" text NOT NULL,
	"quantity" numeric(10, 2) DEFAULT '1' NOT NULL,
	"unit_price" numeric(12, 2) NOT NULL,
	"line_total" numeric(12, 2) NOT NULL
);
--> statement-breakpoint
CREATE TABLE "invoices" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"firm_id" uuid DEFAULT '00000000-0000-0000-0000-000000000001' NOT NULL,
	"client_id" uuid NOT NULL,
	"case_id" uuid,
	"doc_type" "doc_type" NOT NULL,
	"doc_number" bigint NOT NULL,
	"subtotal" numeric(12, 2) NOT NULL,
	"vat_rate" numeric(4, 2) DEFAULT '18.00' NOT NULL,
	"vat_amount" numeric(12, 2) NOT NULL,
	"total" numeric(12, 2) NOT NULL,
	"currency" text DEFAULT 'ILS' NOT NULL,
	"status" "invoice_status" DEFAULT 'draft' NOT NULL,
	"allocation_number" text,
	"external_doc_id" text,
	"payment_link" text,
	"due_date" date,
	"issued_at" timestamp with time zone,
	"paid_at" timestamp with time zone,
	"cancelled_at" timestamp with time zone,
	"notes" text,
	"created_by" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "invoices_firm_id_doc_type_doc_number_unique" UNIQUE("firm_id","doc_type","doc_number")
);
--> statement-breakpoint
CREATE TABLE "payments" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"firm_id" uuid DEFAULT '00000000-0000-0000-0000-000000000001' NOT NULL,
	"invoice_id" uuid,
	"client_id" uuid NOT NULL,
	"method" "payment_method" NOT NULL,
	"amount" numeric(12, 2) NOT NULL,
	"reference" text,
	"provider" text,
	"provider_txn_id" text,
	"received_at" timestamp with time zone DEFAULT now() NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "time_entries" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"firm_id" uuid DEFAULT '00000000-0000-0000-0000-000000000001' NOT NULL,
	"case_id" uuid NOT NULL,
	"user_id" uuid NOT NULL,
	"entry_date" date DEFAULT now() NOT NULL,
	"started_at" timestamp with time zone,
	"duration_min" integer NOT NULL,
	"rate" numeric(10, 2) NOT NULL,
	"billable" boolean DEFAULT true NOT NULL,
	"description" text NOT NULL,
	"invoiced" boolean DEFAULT false NOT NULL,
	"invoice_id" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "trust_accounts" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"firm_id" uuid DEFAULT '00000000-0000-0000-0000-000000000001' NOT NULL,
	"client_id" uuid NOT NULL,
	"case_id" uuid,
	"account_name" text NOT NULL,
	"balance" numeric(14, 2) DEFAULT '0' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "trust_transactions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"trust_account_id" uuid NOT NULL,
	"firm_id" uuid DEFAULT '00000000-0000-0000-0000-000000000001' NOT NULL,
	"direction" "trust_direction" NOT NULL,
	"amount" numeric(14, 2) NOT NULL,
	"description" text NOT NULL,
	"reference" text,
	"approved_by" uuid,
	"created_by" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "workflows" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"firm_id" uuid DEFAULT '00000000-0000-0000-0000-000000000001' NOT NULL,
	"name" text NOT NULL,
	"case_type" text,
	"steps" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL
);
--> statement-breakpoint
ALTER TABLE "cases" ADD COLUMN "firm_id" uuid DEFAULT '00000000-0000-0000-0000-000000000001' NOT NULL;--> statement-breakpoint
ALTER TABLE "cases" ADD COLUMN "external_number" text;--> statement-breakpoint
ALTER TABLE "cases" ADD COLUMN "stage" text;--> statement-breakpoint
ALTER TABLE "cases" ADD COLUMN "fee_agreement_id" uuid;--> statement-breakpoint
ALTER TABLE "clients" ADD COLUMN "firm_id" uuid DEFAULT '00000000-0000-0000-0000-000000000001' NOT NULL;--> statement-breakpoint
ALTER TABLE "clients" ADD COLUMN "contact_type" "contact_type" DEFAULT 'client' NOT NULL;--> statement-breakpoint
ALTER TABLE "clients" ADD COLUMN "entity_kind" "entity_kind" DEFAULT 'person' NOT NULL;--> statement-breakpoint
ALTER TABLE "clients" ADD COLUMN "phone2" text;--> statement-breakpoint
ALTER TABLE "clients" ADD COLUMN "city" text;--> statement-breakpoint
ALTER TABLE "clients" ADD COLUMN "tags" text[] DEFAULT '{}' NOT NULL;--> statement-breakpoint
ALTER TABLE "deadlines" ADD COLUMN "firm_id" uuid DEFAULT '00000000-0000-0000-0000-000000000001' NOT NULL;--> statement-breakpoint
ALTER TABLE "documents" ADD COLUMN "firm_id" uuid DEFAULT '00000000-0000-0000-0000-000000000001' NOT NULL;--> statement-breakpoint
ALTER TABLE "hearings" ADD COLUMN "firm_id" uuid DEFAULT '00000000-0000-0000-0000-000000000001' NOT NULL;--> statement-breakpoint
ALTER TABLE "notes" ADD COLUMN "firm_id" uuid DEFAULT '00000000-0000-0000-0000-000000000001' NOT NULL;--> statement-breakpoint
ALTER TABLE "tasks" ADD COLUMN "firm_id" uuid DEFAULT '00000000-0000-0000-0000-000000000001' NOT NULL;--> statement-breakpoint
ALTER TABLE "tasks" ADD COLUMN "priority" "priority" DEFAULT 'normal' NOT NULL;--> statement-breakpoint
ALTER TABLE "tasks" ADD COLUMN "workflow_id" uuid;--> statement-breakpoint
ALTER TABLE "tasks" ADD COLUMN "completed_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "firm_id" uuid DEFAULT '00000000-0000-0000-0000-000000000001' NOT NULL;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "hourly_rate" numeric(10, 2);--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "license_number" text;--> statement-breakpoint
ALTER TABLE "case_parties" ADD CONSTRAINT "case_parties_case_id_cases_id_fk" FOREIGN KEY ("case_id") REFERENCES "public"."cases"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "case_parties" ADD CONSTRAINT "case_parties_contact_id_clients_id_fk" FOREIGN KEY ("contact_id") REFERENCES "public"."clients"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "charges" ADD CONSTRAINT "charges_firm_id_firms_id_fk" FOREIGN KEY ("firm_id") REFERENCES "public"."firms"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "charges" ADD CONSTRAINT "charges_case_id_cases_id_fk" FOREIGN KEY ("case_id") REFERENCES "public"."cases"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "charges" ADD CONSTRAINT "charges_client_id_clients_id_fk" FOREIGN KEY ("client_id") REFERENCES "public"."clients"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "charges" ADD CONSTRAINT "charges_invoice_id_invoices_id_fk" FOREIGN KEY ("invoice_id") REFERENCES "public"."invoices"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "charges" ADD CONSTRAINT "charges_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "document_templates" ADD CONSTRAINT "document_templates_firm_id_firms_id_fk" FOREIGN KEY ("firm_id") REFERENCES "public"."firms"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "fee_agreements" ADD CONSTRAINT "fee_agreements_firm_id_firms_id_fk" FOREIGN KEY ("firm_id") REFERENCES "public"."firms"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "fee_agreements" ADD CONSTRAINT "fee_agreements_client_id_clients_id_fk" FOREIGN KEY ("client_id") REFERENCES "public"."clients"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "firm_counters" ADD CONSTRAINT "firm_counters_firm_id_firms_id_fk" FOREIGN KEY ("firm_id") REFERENCES "public"."firms"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "invoice_lines" ADD CONSTRAINT "invoice_lines_invoice_id_invoices_id_fk" FOREIGN KEY ("invoice_id") REFERENCES "public"."invoices"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "invoice_lines" ADD CONSTRAINT "invoice_lines_charge_id_charges_id_fk" FOREIGN KEY ("charge_id") REFERENCES "public"."charges"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "invoices" ADD CONSTRAINT "invoices_firm_id_firms_id_fk" FOREIGN KEY ("firm_id") REFERENCES "public"."firms"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "invoices" ADD CONSTRAINT "invoices_client_id_clients_id_fk" FOREIGN KEY ("client_id") REFERENCES "public"."clients"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "invoices" ADD CONSTRAINT "invoices_case_id_cases_id_fk" FOREIGN KEY ("case_id") REFERENCES "public"."cases"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "invoices" ADD CONSTRAINT "invoices_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "payments" ADD CONSTRAINT "payments_firm_id_firms_id_fk" FOREIGN KEY ("firm_id") REFERENCES "public"."firms"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "payments" ADD CONSTRAINT "payments_invoice_id_invoices_id_fk" FOREIGN KEY ("invoice_id") REFERENCES "public"."invoices"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "payments" ADD CONSTRAINT "payments_client_id_clients_id_fk" FOREIGN KEY ("client_id") REFERENCES "public"."clients"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "time_entries" ADD CONSTRAINT "time_entries_firm_id_firms_id_fk" FOREIGN KEY ("firm_id") REFERENCES "public"."firms"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "time_entries" ADD CONSTRAINT "time_entries_case_id_cases_id_fk" FOREIGN KEY ("case_id") REFERENCES "public"."cases"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "time_entries" ADD CONSTRAINT "time_entries_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "time_entries" ADD CONSTRAINT "time_entries_invoice_id_invoices_id_fk" FOREIGN KEY ("invoice_id") REFERENCES "public"."invoices"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "trust_accounts" ADD CONSTRAINT "trust_accounts_firm_id_firms_id_fk" FOREIGN KEY ("firm_id") REFERENCES "public"."firms"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "trust_accounts" ADD CONSTRAINT "trust_accounts_client_id_clients_id_fk" FOREIGN KEY ("client_id") REFERENCES "public"."clients"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "trust_accounts" ADD CONSTRAINT "trust_accounts_case_id_cases_id_fk" FOREIGN KEY ("case_id") REFERENCES "public"."cases"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "trust_transactions" ADD CONSTRAINT "trust_transactions_trust_account_id_trust_accounts_id_fk" FOREIGN KEY ("trust_account_id") REFERENCES "public"."trust_accounts"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "trust_transactions" ADD CONSTRAINT "trust_transactions_firm_id_firms_id_fk" FOREIGN KEY ("firm_id") REFERENCES "public"."firms"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "trust_transactions" ADD CONSTRAINT "trust_transactions_approved_by_users_id_fk" FOREIGN KEY ("approved_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "trust_transactions" ADD CONSTRAINT "trust_transactions_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "workflows" ADD CONSTRAINT "workflows_firm_id_firms_id_fk" FOREIGN KEY ("firm_id") REFERENCES "public"."firms"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "cases" ADD CONSTRAINT "cases_firm_id_firms_id_fk" FOREIGN KEY ("firm_id") REFERENCES "public"."firms"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "cases" ADD CONSTRAINT "cases_fee_agreement_id_fee_agreements_id_fk" FOREIGN KEY ("fee_agreement_id") REFERENCES "public"."fee_agreements"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "clients" ADD CONSTRAINT "clients_firm_id_firms_id_fk" FOREIGN KEY ("firm_id") REFERENCES "public"."firms"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "deadlines" ADD CONSTRAINT "deadlines_firm_id_firms_id_fk" FOREIGN KEY ("firm_id") REFERENCES "public"."firms"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "documents" ADD CONSTRAINT "documents_firm_id_firms_id_fk" FOREIGN KEY ("firm_id") REFERENCES "public"."firms"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "hearings" ADD CONSTRAINT "hearings_firm_id_firms_id_fk" FOREIGN KEY ("firm_id") REFERENCES "public"."firms"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "notes" ADD CONSTRAINT "notes_firm_id_firms_id_fk" FOREIGN KEY ("firm_id") REFERENCES "public"."firms"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "tasks" ADD CONSTRAINT "tasks_firm_id_firms_id_fk" FOREIGN KEY ("firm_id") REFERENCES "public"."firms"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "tasks" ADD CONSTRAINT "tasks_workflow_id_workflows_id_fk" FOREIGN KEY ("workflow_id") REFERENCES "public"."workflows"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "users" ADD CONSTRAINT "users_firm_id_firms_id_fk" FOREIGN KEY ("firm_id") REFERENCES "public"."firms"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
-- Sequential per-firm counters (invoice/proforma numbering — tax-authority requirement)
CREATE OR REPLACE FUNCTION next_counter(p_firm uuid, p_name text) RETURNS bigint LANGUAGE plpgsql AS $$
DECLARE v bigint;
BEGIN
  INSERT INTO firm_counters(firm_id, counter_name, current_value) VALUES (p_firm, p_name, 1)
  ON CONFLICT (firm_id, counter_name) DO UPDATE SET current_value = firm_counters.current_value + 1
  RETURNING current_value INTO v;
  RETURN v;
END $$;--> statement-breakpoint
-- Data integrity: positive amounts
ALTER TABLE "trust_transactions" ADD CONSTRAINT "trust_amount_positive" CHECK (amount > 0);--> statement-breakpoint
ALTER TABLE "time_entries" ADD CONSTRAINT "time_duration_positive" CHECK (duration_min > 0);--> statement-breakpoint
-- Trust ledger: atomic balance update + block negative balance (bar-association rule)
CREATE OR REPLACE FUNCTION apply_trust_txn() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  UPDATE trust_accounts
  SET balance = balance + CASE WHEN new.direction='deposit' THEN new.amount ELSE -new.amount END
  WHERE id = new.trust_account_id;
  IF (SELECT balance FROM trust_accounts WHERE id = new.trust_account_id) < 0 THEN
    RAISE EXCEPTION 'Trust account balance cannot be negative';
  END IF;
  RETURN new;
END $$;--> statement-breakpoint
CREATE TRIGGER "trg_trust_txn" AFTER INSERT ON "trust_transactions" FOR EACH ROW EXECUTE FUNCTION apply_trust_txn();