-- ============================================
-- 001_core.sql — Multi-tenancy, Users, CRM, Cases
-- מערכת ניהול משרד עורכי דין
-- ============================================

create extension if not exists "uuid-ossp";
create extension if not exists pg_trgm; -- חיפוש טקסט עברי

-- ===== Tenancy =====
create table firms (
  id uuid primary key default uuid_generate_v4(),
  name text not null,
  license_plan text not null default 'basic', -- basic/pro/enterprise
  settings jsonb not null default '{}',
  modules jsonb not null default '{"billing":true,"documents":true,"enforcement":false,"accounting":false}',
  created_at timestamptz not null default now()
);

-- פרופיל משתמש (מקושר ל-auth.users)
create table profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  firm_id uuid not null references firms(id),
  full_name text not null,
  role text not null default 'lawyer', -- admin/lawyer/secretary/accountant/intern
  license_number text,          -- מס' רישיון עו"ד
  hourly_rate numeric(10,2),    -- תעריף ברירת מחדל
  phone text,
  is_active boolean not null default true,
  permissions jsonb not null default '{}',
  created_at timestamptz not null default now()
);
create index on profiles(firm_id);

-- ===== CRM =====
create table contacts (
  id uuid primary key default uuid_generate_v4(),
  firm_id uuid not null references firms(id),
  contact_type text not null default 'client', -- client/opposing/court/expert/witness/other
  entity_kind text not null default 'person',  -- person/company
  name text not null,
  id_number text,               -- ת"ז / ח"פ
  phone text,
  phone2 text,
  email text,
  address text,
  city text,
  notes text,
  tags text[] default '{}',
  created_by uuid references profiles(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index on contacts(firm_id);
create index contacts_name_trgm on contacts using gin (name gin_trgm_ops);
create index on contacts(firm_id, id_number);

-- בדיקת ניגוד עניינים
create table conflict_checks (
  id uuid primary key default uuid_generate_v4(),
  firm_id uuid not null references firms(id),
  searched_name text not null,
  searched_id_number text,
  result text not null, -- clear/conflict_found
  matches jsonb default '[]',
  checked_by uuid references profiles(id),
  checked_at timestamptz not null default now()
);

-- ===== בתי משפט / ערכאות =====
create table courts (
  id uuid primary key default uuid_generate_v4(),
  name text not null,          -- "בית משפט השלום תל אביב"
  court_type text not null,    -- shalom/mechozi/elyon/labor/family/hotzlap
  city text,
  is_system boolean default true -- רשומות מערכת משותפות
);

-- ===== תיקים =====
create table cases (
  id uuid primary key default uuid_generate_v4(),
  firm_id uuid not null references firms(id),
  case_number text not null,       -- מס' תיק פנימי (רץ)
  external_number text,            -- מס' הליך בביהמ"ש
  title text not null,
  case_type text not null,         -- civil/torts/real_estate/labor/family/criminal/enforcement/other
  status text not null default 'open', -- open/pending/closed/archived
  stage text,                      -- שלב בתיק (כתבי טענות/הוכחות/סיכומים...)
  court_id uuid references courts(id),
  client_id uuid not null references contacts(id),
  responsible_user_id uuid references profiles(id), -- עו"ד אחראי
  fee_agreement_id uuid,           -- FK מוגדר ב-002
  description text,
  opened_at date not null default current_date,
  closed_at date,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(firm_id, case_number)
);
create index on cases(firm_id, status);
create index on cases(firm_id, client_id);
create index cases_title_trgm on cases using gin (title gin_trgm_ops);

-- צדדים בתיק
create table case_parties (
  id uuid primary key default uuid_generate_v4(),
  case_id uuid not null references cases(id) on delete cascade,
  contact_id uuid not null references contacts(id),
  party_role text not null, -- plaintiff/defendant/third_party/opposing_counsel
  unique(case_id, contact_id, party_role)
);

-- צוות מטפל
create table case_team (
  case_id uuid not null references cases(id) on delete cascade,
  user_id uuid not null references profiles(id),
  team_role text not null default 'member', -- lead/member/viewer
  primary key (case_id, user_id)
);

-- מונה תיקים אוטומטי לכל משרד
create table firm_counters (
  firm_id uuid not null references firms(id),
  counter_name text not null, -- case/invoice/proforma/receipt
  current_value bigint not null default 0,
  primary key (firm_id, counter_name)
);

create or replace function next_counter(p_firm uuid, p_name text)
returns bigint language plpgsql as $$
declare v bigint;
begin
  insert into firm_counters(firm_id, counter_name, current_value)
  values (p_firm, p_name, 1)
  on conflict (firm_id, counter_name)
  do update set current_value = firm_counters.current_value + 1
  returning current_value into v;
  return v;
end $$;

-- updated_at trigger
create or replace function set_updated_at() returns trigger language plpgsql as $$
begin new.updated_at = now(); return new; end $$;

create trigger trg_contacts_upd before update on contacts for each row execute function set_updated_at();
create trigger trg_cases_upd before update on cases for each row execute function set_updated_at();
