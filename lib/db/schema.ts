import {
  pgTable,
  pgEnum,
  uuid,
  text,
  boolean,
  timestamp,
  date,
  bigint,
  jsonb,
  numeric,
  integer,
  primaryKey,
  unique,
} from "drizzle-orm/pg-core";

/**
 * Single-firm tenancy: every table carries firm_id, defaulting to the one
 * seeded firm. This gives multi-tenant structure without rewriting existing
 * queries yet (per integration plan, Step 2 "structural only").
 */
export const DEFAULT_FIRM_ID = "00000000-0000-0000-0000-000000000001";

/* ------------------------------------------------------------------ */
/* Enums (spec §4 / appendices א'·ב')                                  */
/* ------------------------------------------------------------------ */
export const roleEnum = pgEnum("role", [
  "lawyer",
  "assistant",
  "admin",
  "secretary",
  "accountant",
  "intern",
]);
export const accessScopeEnum = pgEnum("access_scope", ["all", "own", "custom"]);

/* ERP / billing enums (from _integration-kit) */
export const contactTypeEnum = pgEnum("contact_type", [
  "client",
  "opposing",
  "court",
  "expert",
  "witness",
  "other",
]);
export const entityKindEnum = pgEnum("entity_kind", ["person", "company"]);
export const feeTypeEnum = pgEnum("fee_type", [
  "hourly",
  "fixed",
  "retainer",
  "success_fee",
  "mixed",
]);
export const chargeTypeEnum = pgEnum("charge_type", [
  "fee",
  "expense",
  "court_fee",
  "retainer",
  "success_fee",
]);
export const chargeStatusEnum = pgEnum("charge_status", [
  "pending",
  "invoiced",
  "cancelled",
]);
export const docTypeEnum = pgEnum("doc_type", [
  "proforma",
  "tax_invoice",
  "receipt",
  "invoice_receipt",
  "credit_note",
]);
export const invoiceStatusEnum = pgEnum("invoice_status", [
  "draft",
  "sent",
  "partially_paid",
  "paid",
  "cancelled",
]);
export const paymentMethodEnum = pgEnum("payment_method", [
  "bank_transfer",
  "credit_card",
  "bit",
  "check",
  "cash",
]);
export const trustDirectionEnum = pgEnum("trust_direction", [
  "deposit",
  "withdrawal",
]);
export const clientTypeEnum = pgEnum("client_type", ["individual", "company"]);
export const reminderChannelEnum = pgEnum("reminder_channel", [
  "whatsapp",
  "sms",
  "email",
]);
export const practiceAreaEnum = pgEnum("practice_area", [
  "civil_commercial",
  "real_estate",
  "power_of_attorney",
  "wills_inheritance",
  "enforcement",
]);
export const caseStatusEnum = pgEnum("case_status", [
  "new",
  "in_progress",
  "waiting_client",
  "waiting_court",
  "hearing_scheduled",
  "on_hold",
  "closed_won",
  "closed_lost",
  "archived",
]);
export const documentCategoryEnum = pgEnum("document_category", [
  "contract",
  "id",
  "power_of_attorney",
  "court_filing",
  "tabu",
  "will",
  "other",
]);
export const syncStatusEnum = pgEnum("sync_status", [
  "pending",
  "synced",
  "failed",
]);
export const hearingStatusEnum = pgEnum("hearing_status", [
  "scheduled",
  "completed",
  "postponed",
  "cancelled",
]);
export const priorityEnum = pgEnum("priority", [
  "low",
  "normal",
  "high",
  "critical",
]);
export const taskStatusEnum = pgEnum("task_status", [
  "open",
  "in_progress",
  "done",
  "cancelled",
]);
export const activityActionEnum = pgEnum("activity_action", [
  "create",
  "update",
  "delete",
  "send_reminder",
  "drive_sync",
]);
export const entityTypeEnum = pgEnum("entity_type", [
  "client",
  "case",
  "document",
  "hearing",
  "deadline",
  "task",
  "note",
]);
export const triggerTypeEnum = pgEnum("trigger_type", ["hearing", "deadline"]);
export const messageStatusEnum = pgEnum("message_status", [
  "queued",
  "sent",
  "failed",
]);

/* Reusable column groups */
const timestamps = {
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
};

/* ------------------------------------------------------------------ */
/* users (§4.1) — also holds the Auth.js credentials hash             */
/* ------------------------------------------------------------------ */
export const users = pgTable("users", {
  id: uuid("id").primaryKey().defaultRandom(),
  fullName: text("full_name").notNull(),
  email: text("email").notNull().unique(),
  passwordHash: text("password_hash"),
  phone: text("phone"),
  role: roleEnum("role").notNull().default("lawyer"),
  avatarUrl: text("avatar_url"),
  isActive: boolean("is_active").notNull().default(true),
  isAdmin: boolean("is_admin").notNull().default(false),
  accessScope: accessScopeEnum("access_scope").notNull().default("own"),
  visibleUserIds: jsonb("visible_user_ids").$type<string[]>().notNull().default([]),
  firmId: uuid("firm_id")
    .notNull()
    .default(DEFAULT_FIRM_ID)
    .references(() => firms.id),
  hourlyRate: numeric("hourly_rate", { precision: 10, scale: 2 }),
  licenseNumber: text("license_number"),
  ...timestamps,
});

/* ------------------------------------------------------------------ */
/* clients (§4.2)                                                      */
/* ------------------------------------------------------------------ */
export const clients = pgTable("clients", {
  id: uuid("id").primaryKey().defaultRandom(),
  fullName: text("full_name").notNull(),
  idNumber: text("id_number"),
  clientType: clientTypeEnum("client_type").notNull().default("individual"),
  phone: text("phone"),
  email: text("email"),
  address: text("address"),
  notes: text("notes"),
  reminderConsent: boolean("reminder_consent").notNull().default(false),
  reminderChannel: reminderChannelEnum("reminder_channel").default("whatsapp"),
  driveFolderId: text("drive_folder_id"),
  onedriveUrl: text("onedrive_url"),
  firmId: uuid("firm_id")
    .notNull()
    .default(DEFAULT_FIRM_ID)
    .references(() => firms.id),
  contactType: contactTypeEnum("contact_type").notNull().default("client"),
  entityKind: entityKindEnum("entity_kind").notNull().default("person"),
  phone2: text("phone2"),
  city: text("city"),
  tags: text("tags").array().notNull().default([]),
  createdBy: uuid("created_by").references(() => users.id),
  ...timestamps,
});

/* ------------------------------------------------------------------ */
/* cases (§4.3)                                                        */
/* ------------------------------------------------------------------ */
export const cases = pgTable("cases", {
  id: uuid("id").primaryKey().defaultRandom(),
  clientId: uuid("client_id")
    .notNull()
    .references(() => clients.id, { onDelete: "cascade" }),
  caseNumber: text("case_number"),
  title: text("title").notNull(),
  practiceArea: practiceAreaEnum("practice_area").notNull(),
  status: caseStatusEnum("status").notNull().default("new"),
  responsibleLawyerId: uuid("responsible_lawyer_id").references(() => users.id),
  opposingParty: text("opposing_party"),
  court: text("court"),
  typeFields: jsonb("type_fields").notNull().default({}),
  driveFolderId: text("drive_folder_id"),
  driveUrl: text("drive_url"),
  onedriveUrl: text("onedrive_url"),
  openedAt: date("opened_at").notNull().defaultNow(),
  closedAt: date("closed_at"),
  firmId: uuid("firm_id")
    .notNull()
    .default(DEFAULT_FIRM_ID)
    .references(() => firms.id),
  externalNumber: text("external_number"),
  stage: text("stage"),
  feeAgreementId: uuid("fee_agreement_id").references(() => feeAgreements.id),
  createdBy: uuid("created_by").references(() => users.id),
  ...timestamps,
});

/* ------------------------------------------------------------------ */
/* documents (§4.4) — storagePath holds the Vercel Blob pathname      */
/* ------------------------------------------------------------------ */
export const documents = pgTable("documents", {
  id: uuid("id").primaryKey().defaultRandom(),
  caseId: uuid("case_id").references(() => cases.id, { onDelete: "cascade" }),
  clientId: uuid("client_id")
    .notNull()
    .references(() => clients.id, { onDelete: "cascade" }),
  fileName: text("file_name").notNull(),
  storagePath: text("storage_path").notNull(),
  mimeType: text("mime_type"),
  sizeBytes: bigint("size_bytes", { mode: "number" }),
  category: documentCategoryEnum("category").notNull().default("other"),
  tags: text("tags").array().notNull().default([]),
  driveFileId: text("drive_file_id"),
  driveUrl: text("drive_url"),
  syncStatus: syncStatusEnum("sync_status").notNull().default("pending"),
  uploadedBy: uuid("uploaded_by").references(() => users.id),
  firmId: uuid("firm_id")
    .notNull()
    .default(DEFAULT_FIRM_ID)
    .references(() => firms.id),
  ...timestamps,
});

/* ------------------------------------------------------------------ */
/* hearings (§4.5)                                                     */
/* ------------------------------------------------------------------ */
export const hearings = pgTable("hearings", {
  id: uuid("id").primaryKey().defaultRandom(),
  caseId: uuid("case_id")
    .notNull()
    .references(() => cases.id, { onDelete: "cascade" }),
  hearingAt: timestamp("hearing_at", { withTimezone: true }).notNull(),
  location: text("location"),
  hearingType: text("hearing_type"),
  status: hearingStatusEnum("status").notNull().default("scheduled"),
  outcome: text("outcome"),
  firmId: uuid("firm_id")
    .notNull()
    .default(DEFAULT_FIRM_ID)
    .references(() => firms.id),
  createdBy: uuid("created_by").references(() => users.id),
  ...timestamps,
});

/* ------------------------------------------------------------------ */
/* deadlines (§4.6)                                                    */
/* ------------------------------------------------------------------ */
export const deadlines = pgTable("deadlines", {
  id: uuid("id").primaryKey().defaultRandom(),
  caseId: uuid("case_id")
    .notNull()
    .references(() => cases.id, { onDelete: "cascade" }),
  title: text("title").notNull(),
  dueAt: timestamp("due_at", { withTimezone: true }).notNull(),
  priority: priorityEnum("priority").notNull().default("normal"),
  isDone: boolean("is_done").notNull().default(false),
  doneBy: uuid("done_by").references(() => users.id),
  firmId: uuid("firm_id")
    .notNull()
    .default(DEFAULT_FIRM_ID)
    .references(() => firms.id),
  createdBy: uuid("created_by").references(() => users.id),
  ...timestamps,
});

/* ------------------------------------------------------------------ */
/* tasks (§4.7)                                                        */
/* ------------------------------------------------------------------ */
export const tasks = pgTable("tasks", {
  id: uuid("id").primaryKey().defaultRandom(),
  caseId: uuid("case_id").references(() => cases.id, { onDelete: "cascade" }),
  title: text("title").notNull(),
  description: text("description"),
  assignedTo: uuid("assigned_to").references(() => users.id),
  dueAt: timestamp("due_at", { withTimezone: true }),
  status: taskStatusEnum("status").notNull().default("open"),
  firmId: uuid("firm_id")
    .notNull()
    .default(DEFAULT_FIRM_ID)
    .references(() => firms.id),
  priority: priorityEnum("priority").notNull().default("normal"),
  workflowId: uuid("workflow_id").references(() => workflows.id),
  completedAt: timestamp("completed_at", { withTimezone: true }),
  createdBy: uuid("created_by").references(() => users.id),
  ...timestamps,
});

/* ------------------------------------------------------------------ */
/* notes (§4.8) — core audit requirement                              */
/* ------------------------------------------------------------------ */
export const notes = pgTable("notes", {
  id: uuid("id").primaryKey().defaultRandom(),
  caseId: uuid("case_id").references(() => cases.id, { onDelete: "cascade" }),
  clientId: uuid("client_id").references(() => clients.id, {
    onDelete: "cascade",
  }),
  body: text("body").notNull(),
  authorId: uuid("author_id")
    .notNull()
    .references(() => users.id),
  firmId: uuid("firm_id")
    .notNull()
    .default(DEFAULT_FIRM_ID)
    .references(() => firms.id),
  ...timestamps,
});

/* ------------------------------------------------------------------ */
/* case_status_history (§4.9) — insert-only audit                     */
/* ------------------------------------------------------------------ */
export const caseStatusHistory = pgTable("case_status_history", {
  id: uuid("id").primaryKey().defaultRandom(),
  caseId: uuid("case_id")
    .notNull()
    .references(() => cases.id, { onDelete: "cascade" }),
  fromStatus: caseStatusEnum("from_status"),
  toStatus: caseStatusEnum("to_status").notNull(),
  changedBy: uuid("changed_by").references(() => users.id),
  changedAt: timestamp("changed_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
  note: text("note"),
});

/* ------------------------------------------------------------------ */
/* activity_log (§4.10) — insert-only audit                           */
/* ------------------------------------------------------------------ */
export const activityLog = pgTable("activity_log", {
  id: uuid("id").primaryKey().defaultRandom(),
  actorId: uuid("actor_id").references(() => users.id),
  entityType: entityTypeEnum("entity_type").notNull(),
  entityId: uuid("entity_id"),
  action: activityActionEnum("action").notNull(),
  metadata: jsonb("metadata").notNull().default({}),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

/* ------------------------------------------------------------------ */
/* app_settings — singleton office/reminder configuration (spec §6.10) */
/* ------------------------------------------------------------------ */
export const appSettings = pgTable("app_settings", {
  id: uuid("id").primaryKey().defaultRandom(),
  hearingTemplate: text("hearing_template")
    .notNull()
    .default(
      'שלום {client_name},\nתזכורת: נקבע דיון בתיק "{case_title}" בתאריך {date} בשעה {time}{court}.\nלכל שאלה ניתן לפנות למשרד.'
    ),
  deadlineTemplate: text("deadline_template")
    .notNull()
    .default(
      'שלום {client_name},\nתזכורת בנוגע לתיק "{case_title}": {title} — עד לתאריך {date}.\nלכל שאלה ניתן לפנות למשרד.'
    ),
  hearingDaysBefore: jsonb("hearing_days_before")
    .$type<number[]>()
    .notNull()
    .default([3, 1]),
  deadlineCriticalDays: jsonb("deadline_critical_days")
    .$type<number[]>()
    .notNull()
    .default([7, 1]),
  deadlineHighDays: jsonb("deadline_high_days")
    .$type<number[]>()
    .notNull()
    .default([3]),
  defaultChannel: reminderChannelEnum("default_channel")
    .notNull()
    .default("whatsapp"),
  ...timestamps,
});

/* ------------------------------------------------------------------ */
/* message_log (§4.11) — reminders journal                            */
/* ------------------------------------------------------------------ */
export const messageLog = pgTable("message_log", {
  id: uuid("id").primaryKey().defaultRandom(),
  clientId: uuid("client_id")
    .notNull()
    .references(() => clients.id, { onDelete: "cascade" }),
  caseId: uuid("case_id").references(() => cases.id, { onDelete: "cascade" }),
  triggerType: triggerTypeEnum("trigger_type").notNull(),
  triggerRefId: uuid("trigger_ref_id"),
  channel: reminderChannelEnum("channel").notNull(),
  renderedText: text("rendered_text"),
  status: messageStatusEnum("status").notNull().default("queued"),
  providerResponse: jsonb("provider_response"),
  sentAt: timestamp("sent_at", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

/* ================================================================== */
/* ERP / billing tables (integrated from _integration-kit)            */
/* FKs adapted to our users/clients tables; firm_id single-tenant.    */
/* ================================================================== */

export const firms = pgTable("firms", {
  id: uuid("id").primaryKey().defaultRandom(),
  name: text("name").notNull(),
  licensePlan: text("license_plan").notNull().default("basic"),
  settings: jsonb("settings").notNull().default({}),
  modules: jsonb("modules")
    .notNull()
    .default({ billing: true, documents: true, enforcement: false, accounting: false }),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const firmCounters = pgTable(
  "firm_counters",
  {
    firmId: uuid("firm_id")
      .notNull()
      .references(() => firms.id),
    counterName: text("counter_name").notNull(),
    currentValue: bigint("current_value", { mode: "number" }).notNull().default(0),
  },
  (t) => ({ pk: primaryKey({ columns: [t.firmId, t.counterName] }) })
);

export const feeAgreements = pgTable("fee_agreements", {
  id: uuid("id").primaryKey().defaultRandom(),
  firmId: uuid("firm_id")
    .notNull()
    .default(DEFAULT_FIRM_ID)
    .references(() => firms.id),
  clientId: uuid("client_id")
    .notNull()
    .references(() => clients.id),
  agreementType: feeTypeEnum("agreement_type").notNull(),
  hourlyRate: numeric("hourly_rate", { precision: 10, scale: 2 }),
  fixedAmount: numeric("fixed_amount", { precision: 12, scale: 2 }),
  retainerAmount: numeric("retainer_amount", { precision: 12, scale: 2 }),
  retainerHours: numeric("retainer_hours", { precision: 6, scale: 2 }),
  retainerBillingDay: integer("retainer_billing_day").default(1),
  overageRate: numeric("overage_rate", { precision: 10, scale: 2 }),
  successPercent: numeric("success_percent", { precision: 5, scale: 2 }),
  vatIncluded: boolean("vat_included").notNull().default(false),
  currency: text("currency").notNull().default("ILS"),
  validFrom: date("valid_from").notNull().defaultNow(),
  validTo: date("valid_to"),
  terms: jsonb("terms").notNull().default({}),
  isActive: boolean("is_active").notNull().default(true),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const workflows = pgTable("workflows", {
  id: uuid("id").primaryKey().defaultRandom(),
  firmId: uuid("firm_id")
    .notNull()
    .default(DEFAULT_FIRM_ID)
    .references(() => firms.id),
  name: text("name").notNull(),
  caseType: text("case_type"),
  steps: jsonb("steps").notNull().default([]),
  isActive: boolean("is_active").notNull().default(true),
});

export const caseParties = pgTable(
  "case_parties",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    caseId: uuid("case_id")
      .notNull()
      .references(() => cases.id, { onDelete: "cascade" }),
    contactId: uuid("contact_id")
      .notNull()
      .references(() => clients.id),
    partyRole: text("party_role").notNull(),
  },
  (t) => ({ uq: unique().on(t.caseId, t.contactId, t.partyRole) })
);

export const timeEntries = pgTable("time_entries", {
  id: uuid("id").primaryKey().defaultRandom(),
  firmId: uuid("firm_id")
    .notNull()
    .default(DEFAULT_FIRM_ID)
    .references(() => firms.id),
  caseId: uuid("case_id")
    .notNull()
    .references(() => cases.id),
  userId: uuid("user_id")
    .notNull()
    .references(() => users.id),
  entryDate: date("entry_date").notNull().defaultNow(),
  startedAt: timestamp("started_at", { withTimezone: true }),
  durationMin: integer("duration_min").notNull(),
  rate: numeric("rate", { precision: 10, scale: 2 }).notNull(),
  billable: boolean("billable").notNull().default(true),
  description: text("description").notNull(),
  invoiced: boolean("invoiced").notNull().default(false),
  invoiceId: uuid("invoice_id").references(() => invoices.id),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const charges = pgTable("charges", {
  id: uuid("id").primaryKey().defaultRandom(),
  firmId: uuid("firm_id")
    .notNull()
    .default(DEFAULT_FIRM_ID)
    .references(() => firms.id),
  caseId: uuid("case_id").references(() => cases.id),
  clientId: uuid("client_id")
    .notNull()
    .references(() => clients.id),
  chargeType: chargeTypeEnum("charge_type").notNull(),
  description: text("description").notNull(),
  amount: numeric("amount", { precision: 12, scale: 2 }).notNull(),
  vatRate: numeric("vat_rate", { precision: 4, scale: 2 }).notNull().default("18.00"),
  chargeDate: date("charge_date").notNull().defaultNow(),
  status: chargeStatusEnum("status").notNull().default("pending"),
  sourceTimeEntryIds: uuid("source_time_entry_ids").array().notNull().default([]),
  invoiceId: uuid("invoice_id").references(() => invoices.id),
  createdBy: uuid("created_by").references(() => users.id),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const invoices = pgTable(
  "invoices",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    firmId: uuid("firm_id")
      .notNull()
      .default(DEFAULT_FIRM_ID)
      .references(() => firms.id),
    clientId: uuid("client_id")
      .notNull()
      .references(() => clients.id),
    caseId: uuid("case_id").references(() => cases.id),
    docType: docTypeEnum("doc_type").notNull(),
    docNumber: bigint("doc_number", { mode: "number" }).notNull(),
    subtotal: numeric("subtotal", { precision: 12, scale: 2 }).notNull(),
    vatRate: numeric("vat_rate", { precision: 4, scale: 2 }).notNull().default("18.00"),
    vatAmount: numeric("vat_amount", { precision: 12, scale: 2 }).notNull(),
    total: numeric("total", { precision: 12, scale: 2 }).notNull(),
    currency: text("currency").notNull().default("ILS"),
    status: invoiceStatusEnum("status").notNull().default("draft"),
    allocationNumber: text("allocation_number"),
    externalDocId: text("external_doc_id"),
    paymentLink: text("payment_link"),
    dueDate: date("due_date"),
    issuedAt: timestamp("issued_at", { withTimezone: true }),
    paidAt: timestamp("paid_at", { withTimezone: true }),
    cancelledAt: timestamp("cancelled_at", { withTimezone: true }),
    notes: text("notes"),
    createdBy: uuid("created_by").references(() => users.id),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => ({ uq: unique().on(t.firmId, t.docType, t.docNumber) })
);

export const invoiceLines = pgTable("invoice_lines", {
  id: uuid("id").primaryKey().defaultRandom(),
  invoiceId: uuid("invoice_id")
    .notNull()
    .references(() => invoices.id, { onDelete: "cascade" }),
  chargeId: uuid("charge_id").references(() => charges.id),
  description: text("description").notNull(),
  quantity: numeric("quantity", { precision: 10, scale: 2 }).notNull().default("1"),
  unitPrice: numeric("unit_price", { precision: 12, scale: 2 }).notNull(),
  lineTotal: numeric("line_total", { precision: 12, scale: 2 }).notNull(),
});

export const payments = pgTable("payments", {
  id: uuid("id").primaryKey().defaultRandom(),
  firmId: uuid("firm_id")
    .notNull()
    .default(DEFAULT_FIRM_ID)
    .references(() => firms.id),
  invoiceId: uuid("invoice_id").references(() => invoices.id),
  clientId: uuid("client_id")
    .notNull()
    .references(() => clients.id),
  method: paymentMethodEnum("method").notNull(),
  amount: numeric("amount", { precision: 12, scale: 2 }).notNull(),
  reference: text("reference"),
  provider: text("provider"),
  providerTxnId: text("provider_txn_id"),
  receivedAt: timestamp("received_at", { withTimezone: true }).notNull().defaultNow(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const trustAccounts = pgTable("trust_accounts", {
  id: uuid("id").primaryKey().defaultRandom(),
  firmId: uuid("firm_id")
    .notNull()
    .default(DEFAULT_FIRM_ID)
    .references(() => firms.id),
  clientId: uuid("client_id")
    .notNull()
    .references(() => clients.id),
  caseId: uuid("case_id").references(() => cases.id),
  accountName: text("account_name").notNull(),
  balance: numeric("balance", { precision: 14, scale: 2 }).notNull().default("0"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const trustTransactions = pgTable("trust_transactions", {
  id: uuid("id").primaryKey().defaultRandom(),
  trustAccountId: uuid("trust_account_id")
    .notNull()
    .references(() => trustAccounts.id),
  firmId: uuid("firm_id")
    .notNull()
    .default(DEFAULT_FIRM_ID)
    .references(() => firms.id),
  direction: trustDirectionEnum("direction").notNull(),
  amount: numeric("amount", { precision: 14, scale: 2 }).notNull(),
  description: text("description").notNull(),
  reference: text("reference"),
  approvedBy: uuid("approved_by").references(() => users.id),
  createdBy: uuid("created_by").references(() => users.id),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const documentTemplates = pgTable("document_templates", {
  id: uuid("id").primaryKey().defaultRandom(),
  firmId: uuid("firm_id")
    .notNull()
    .default(DEFAULT_FIRM_ID)
    .references(() => firms.id),
  name: text("name").notNull(),
  category: text("category"),
  storagePath: text("storage_path").notNull(),
  mergeFields: jsonb("merge_fields").notNull().default([]),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});
