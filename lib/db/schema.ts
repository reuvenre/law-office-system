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
} from "drizzle-orm/pg-core";

/* ------------------------------------------------------------------ */
/* Enums (spec §4 / appendices א'·ב')                                  */
/* ------------------------------------------------------------------ */
export const roleEnum = pgEnum("role", ["lawyer", "assistant"]);
export const accessScopeEnum = pgEnum("access_scope", ["all", "own", "custom"]);
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
