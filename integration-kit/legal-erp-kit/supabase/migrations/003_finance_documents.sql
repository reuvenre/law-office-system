-- ============================================
-- 003_finance_documents.sql — חשבוניות, תשלומים, נאמנויות, מסמכים
-- ============================================

-- ===== חשבוניות =====
create table invoices (
  id uuid primary key default uuid_generate_v4(),
  firm_id uuid not null references firms(id),
  client_id uuid not null references contacts(id),
  case_id uuid references cases(id),
  doc_type text not null, -- proforma (חשבון עסקה) / tax_invoice / receipt / invoice_receipt / credit_note
  doc_number bigint not null,           -- ספרור רציף לפי סוג
  subtotal numeric(12,2) not null,
  vat_rate numeric(4,2) not null default 18.00,
  vat_amount numeric(12,2) not null,
  total numeric(12,2) not null,
  currency text not null default 'ILS',
  status text not null default 'draft', -- draft/sent/partially_paid/paid/cancelled
  allocation_number text,               -- מס' הקצאה רשות המסים
  external_doc_id text,                 -- מזהה אצל ספק חשבוניות (iCount/Green)
  payment_link text,
  due_date date,
  issued_at timestamptz,
  paid_at timestamptz,
  cancelled_at timestamptz,             -- אין מחיקה — רק ביטול!
  notes text,
  created_by uuid references profiles(id),
  created_at timestamptz not null default now(),
  unique(firm_id, doc_type, doc_number)
);
create index on invoices(firm_id, client_id);
create index on invoices(firm_id, status);

create table invoice_lines (
  id uuid primary key default uuid_generate_v4(),
  invoice_id uuid not null references invoices(id) on delete cascade,
  charge_id uuid references charges(id),
  description text not null,
  quantity numeric(10,2) not null default 1,
  unit_price numeric(12,2) not null,
  line_total numeric(12,2) not null
);

alter table time_entries add constraint fk_te_invoice foreign key (invoice_id) references invoices(id);
alter table charges add constraint fk_ch_invoice foreign key (invoice_id) references invoices(id);

-- ===== תשלומים =====
create table payments (
  id uuid primary key default uuid_generate_v4(),
  firm_id uuid not null references firms(id),
  invoice_id uuid references invoices(id),
  client_id uuid not null references contacts(id),
  method text not null, -- bank_transfer/credit_card/bit/check/cash
  amount numeric(12,2) not null,
  reference text,                -- אסמכתא
  provider text,                 -- grow/meshulam/cardcom
  provider_txn_id text,
  received_at timestamptz not null default now(),
  created_at timestamptz not null default now()
);
create index on payments(firm_id, invoice_id);

-- ===== נאמנויות ופיקדונות (הפרדה מלאה!) =====
create table trust_accounts (
  id uuid primary key default uuid_generate_v4(),
  firm_id uuid not null references firms(id),
  client_id uuid not null references contacts(id),
  case_id uuid references cases(id),
  account_name text not null,
  balance numeric(14,2) not null default 0,
  created_at timestamptz not null default now()
);

create table trust_transactions (
  id uuid primary key default uuid_generate_v4(),
  trust_account_id uuid not null references trust_accounts(id),
  firm_id uuid not null references firms(id),
  direction text not null check (direction in ('deposit','withdrawal')),
  amount numeric(14,2) not null check (amount > 0),
  description text not null,
  reference text,
  approved_by uuid references profiles(id), -- משיכה דורשת אישור
  created_by uuid references profiles(id),
  created_at timestamptz not null default now()
);

-- עדכון יתרה אטומי
create or replace function apply_trust_txn() returns trigger language plpgsql as $$
begin
  update trust_accounts
  set balance = balance + case when new.direction='deposit' then new.amount else -new.amount end
  where id = new.trust_account_id;
  if (select balance from trust_accounts where id = new.trust_account_id) < 0 then
    raise exception 'Trust account balance cannot be negative';
  end if;
  return new;
end $$;
create trigger trg_trust_txn after insert on trust_transactions
  for each row execute function apply_trust_txn();

-- ===== מסמכים =====
create table documents (
  id uuid primary key default uuid_generate_v4(),
  firm_id uuid not null references firms(id),
  case_id uuid references cases(id) on delete set null,
  folder text default '/',       -- תיוק לוגי
  name text not null,
  storage_path text not null,    -- Supabase Storage: firm_id/case_id/file
  mime_type text,
  size_bytes bigint,
  version int not null default 1,
  parent_document_id uuid references documents(id), -- גרסאות
  template_id uuid,
  ocr_text text,                 -- טקסט מ-OCR לחיפוש
  search_vector tsvector generated always as (to_tsvector('simple', coalesce(name,'') || ' ' || coalesce(ocr_text,''))) stored,
  uploaded_by uuid references profiles(id),
  created_at timestamptz not null default now()
);
create index on documents(firm_id, case_id);
create index documents_search on documents using gin(search_vector);

create table document_templates (
  id uuid primary key default uuid_generate_v4(),
  firm_id uuid not null references firms(id),
  name text not null,
  category text, -- letter/pleading/agreement/demand
  storage_path text not null,    -- קובץ docx עם שדות {{merge}}
  merge_fields jsonb default '[]',
  created_at timestamptz not null default now()
);

-- ===== תקשורת =====
create table communications (
  id uuid primary key default uuid_generate_v4(),
  firm_id uuid not null references firms(id),
  case_id uuid references cases(id) on delete set null,
  contact_id uuid references contacts(id),
  channel text not null, -- sms/whatsapp/email/call/letter
  direction text not null default 'outbound', -- inbound/outbound
  subject text,
  content text,
  status text default 'sent', -- queued/sent/delivered/failed
  provider_message_id text,
  sent_by uuid references profiles(id),
  sent_at timestamptz not null default now()
);
create index on communications(firm_id, case_id);

-- ===== Audit Log (append-only) =====
create table audit_log (
  id bigint generated always as identity primary key,
  firm_id uuid not null,
  user_id uuid,
  entity text not null,
  entity_id uuid,
  action text not null, -- insert/update/delete/view/print/send
  diff jsonb,
  ip inet,
  at timestamptz not null default now()
);
create index on audit_log(firm_id, entity, entity_id);

-- מניעת עדכון/מחיקה של audit
create or replace function block_audit_changes() returns trigger language plpgsql as $$
begin raise exception 'audit_log is append-only'; end $$;
create trigger trg_audit_no_update before update or delete on audit_log
  for each row execute function block_audit_changes();
