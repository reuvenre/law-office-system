-- ============================================
-- 002_calendar_billing.sql — יומן, משימות, שעתון, חיובים
-- ============================================

-- ===== הסכמי שכ"ט =====
create table fee_agreements (
  id uuid primary key default uuid_generate_v4(),
  firm_id uuid not null references firms(id),
  client_id uuid not null references contacts(id),
  agreement_type text not null, -- hourly/fixed/retainer/success_fee/mixed
  hourly_rate numeric(10,2),
  fixed_amount numeric(12,2),
  retainer_amount numeric(12,2),      -- סכום ריטיינר חודשי
  retainer_hours numeric(6,2),        -- שעות כלולות
  retainer_billing_day int default 1, -- יום חיוב בחודש
  overage_rate numeric(10,2),         -- תעריף שעות חורגות
  success_percent numeric(5,2),       -- אחוזי הצלחה
  vat_included boolean default false,
  currency text default 'ILS',
  valid_from date not null default current_date,
  valid_to date,
  terms jsonb default '{}',
  is_active boolean default true,
  created_at timestamptz not null default now()
);
create index on fee_agreements(firm_id, client_id);

alter table cases add constraint fk_cases_fee
  foreign key (fee_agreement_id) references fee_agreements(id);

-- ===== יומן =====
create table events (
  id uuid primary key default uuid_generate_v4(),
  firm_id uuid not null references firms(id),
  case_id uuid references cases(id) on delete set null,
  event_type text not null default 'meeting', -- hearing/meeting/deadline/internal
  title text not null,
  description text,
  location text,
  start_at timestamptz not null,
  end_at timestamptz,
  all_day boolean default false,
  is_court_deadline boolean default false, -- מועד דיוני מחייב
  attendees uuid[] default '{}',            -- profiles
  reminder_minutes int[] default '{1440,60}', -- תזכורות
  google_event_id text,                     -- סנכרון חיצוני
  created_by uuid references profiles(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index on events(firm_id, start_at);
create index on events(case_id);

-- ===== משימות =====
create table tasks (
  id uuid primary key default uuid_generate_v4(),
  firm_id uuid not null references firms(id),
  case_id uuid references cases(id) on delete set null,
  assigned_to uuid references profiles(id),
  title text not null,
  description text,
  due_at timestamptz,
  priority text not null default 'normal', -- low/normal/high/urgent
  status text not null default 'open',     -- open/in_progress/done/cancelled
  workflow_id uuid,                        -- אם נוצרה מתסריט
  completed_at timestamptz,
  created_by uuid references profiles(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index on tasks(firm_id, assigned_to, status);
create index on tasks(case_id);

-- תסריטי עבודה (Workflows) — יצירת משימות אוטומטית לפי סוג תיק
create table workflows (
  id uuid primary key default uuid_generate_v4(),
  firm_id uuid not null references firms(id),
  name text not null,
  case_type text,               -- מופעל אוטומטית בפתיחת תיק מסוג זה
  steps jsonb not null default '[]',
  -- [{title, offset_days, assigned_role, priority}]
  is_active boolean default true
);

-- ===== שעתון =====
create table time_entries (
  id uuid primary key default uuid_generate_v4(),
  firm_id uuid not null references firms(id),
  case_id uuid not null references cases(id),
  user_id uuid not null references profiles(id),
  entry_date date not null default current_date,
  started_at timestamptz,
  duration_min int not null check (duration_min > 0),
  rate numeric(10,2) not null,   -- תעריף בפועל (נגזר מהסכם/עובד)
  billable boolean not null default true,
  description text not null,
  invoiced boolean not null default false,
  invoice_id uuid,               -- FK ב-003
  created_at timestamptz not null default now()
);
create index on time_entries(firm_id, case_id);
create index on time_entries(firm_id, user_id, entry_date);
create index on time_entries(firm_id, invoiced) where billable = true and invoiced = false;

-- ===== חיובים (לפני חשבונית) =====
create table charges (
  id uuid primary key default uuid_generate_v4(),
  firm_id uuid not null references firms(id),
  case_id uuid not null references cases(id),
  client_id uuid not null references contacts(id),
  charge_type text not null, -- fee/expense/court_fee/retainer/success_fee
  description text not null,
  amount numeric(12,2) not null,
  vat_rate numeric(4,2) not null default 18.00, -- מע"מ נוכחי
  charge_date date not null default current_date,
  status text not null default 'pending', -- pending/invoiced/cancelled
  source_time_entry_ids uuid[] default '{}',
  invoice_id uuid,
  created_by uuid references profiles(id),
  created_at timestamptz not null default now()
);
create index on charges(firm_id, client_id, status);
create index on charges(case_id);
