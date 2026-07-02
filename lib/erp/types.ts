/**
 * ERP domain types — inferred from the Drizzle schema (single source of truth),
 * replacing the hand-written _integration-kit/src/types/domain.ts.
 */
import type {
  firms,
  feeAgreements,
  timeEntries,
  charges,
  invoices,
  invoiceLines,
  payments,
  trustAccounts,
  trustTransactions,
} from "@/lib/db/schema";

export type Firm = typeof firms.$inferSelect;
export type FeeAgreement = typeof feeAgreements.$inferSelect;
export type TimeEntry = typeof timeEntries.$inferSelect;
export type NewTimeEntry = typeof timeEntries.$inferInsert;
export type Charge = typeof charges.$inferSelect;
export type NewCharge = typeof charges.$inferInsert;
export type Invoice = typeof invoices.$inferSelect;
export type InvoiceLine = typeof invoiceLines.$inferSelect;
export type Payment = typeof payments.$inferSelect;
export type NewPayment = typeof payments.$inferInsert;
export type TrustAccount = typeof trustAccounts.$inferSelect;
export type TrustTransaction = typeof trustTransactions.$inferSelect;

// Literal unions live in lib/constants.ts (ROLES, DOC types, etc.) and the
// pgEnum definitions in lib/db/schema.ts.
