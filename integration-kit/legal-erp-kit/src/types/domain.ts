// src/types/domain.ts — טיפוסי ליבה של המערכת

export type Role = 'admin' | 'lawyer' | 'secretary' | 'accountant' | 'intern';
export type CaseStatus = 'open' | 'pending' | 'closed' | 'archived';
export type CaseType = 'civil' | 'torts' | 'real_estate' | 'labor' | 'family' | 'criminal' | 'enforcement' | 'other';
export type FeeType = 'hourly' | 'fixed' | 'retainer' | 'success_fee' | 'mixed';
export type DocType = 'proforma' | 'tax_invoice' | 'receipt' | 'invoice_receipt' | 'credit_note';
export type InvoiceStatus = 'draft' | 'sent' | 'partially_paid' | 'paid' | 'cancelled';
export type Channel = 'sms' | 'whatsapp' | 'email' | 'call' | 'letter';

export interface Firm {
  id: string;
  name: string;
  license_plan: 'basic' | 'pro' | 'enterprise';
  settings: Record<string, unknown>;
  modules: Record<string, boolean>;
}

export interface Profile {
  id: string;
  firm_id: string;
  full_name: string;
  role: Role;
  license_number?: string;
  hourly_rate?: number;
  is_active: boolean;
}

export interface Contact {
  id: string;
  firm_id: string;
  contact_type: 'client' | 'opposing' | 'court' | 'expert' | 'witness' | 'other';
  entity_kind: 'person' | 'company';
  name: string;
  id_number?: string;
  phone?: string;
  email?: string;
  address?: string;
  city?: string;
  tags: string[];
}

export interface Case {
  id: string;
  firm_id: string;
  case_number: string;
  external_number?: string;
  title: string;
  case_type: CaseType;
  status: CaseStatus;
  stage?: string;
  client_id: string;
  responsible_user_id?: string;
  fee_agreement_id?: string;
  opened_at: string;
  closed_at?: string;
}

export interface FeeAgreement {
  id: string;
  firm_id: string;
  client_id: string;
  agreement_type: FeeType;
  hourly_rate?: number;
  fixed_amount?: number;
  retainer_amount?: number;
  retainer_hours?: number;
  retainer_billing_day?: number;
  overage_rate?: number;
  success_percent?: number;
  vat_included: boolean;
  is_active: boolean;
}

export interface TimeEntry {
  id: string;
  firm_id: string;
  case_id: string;
  user_id: string;
  entry_date: string;
  duration_min: number;
  rate: number;
  billable: boolean;
  description: string;
  invoiced: boolean;
}

export interface Charge {
  id: string;
  firm_id: string;
  case_id: string;
  client_id: string;
  charge_type: 'fee' | 'expense' | 'court_fee' | 'retainer' | 'success_fee';
  description: string;
  amount: number;
  vat_rate: number;
  status: 'pending' | 'invoiced' | 'cancelled';
}

export interface Invoice {
  id: string;
  firm_id: string;
  client_id: string;
  case_id?: string;
  doc_type: DocType;
  doc_number: number;
  subtotal: number;
  vat_rate: number;
  vat_amount: number;
  total: number;
  status: InvoiceStatus;
  allocation_number?: string; // מס' הקצאה
  payment_link?: string;
}

export interface TrustAccount {
  id: string;
  firm_id: string;
  client_id: string;
  case_id?: string;
  account_name: string;
  balance: number;
}
