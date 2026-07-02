-- ============================================
-- 004_rls.sql — Row Level Security לכל הטבלאות
-- ============================================

-- helper: firm_id של המשתמש הנוכחי
create or replace function current_firm_id() returns uuid
language sql stable security definer as $$
  select firm_id from profiles where id = auth.uid()
$$;

create or replace function current_role_name() returns text
language sql stable security definer as $$
  select role from profiles where id = auth.uid()
$$;

-- ===== הפעלת RLS =====
alter table firms enable row level security;
alter table profiles enable row level security;
alter table contacts enable row level security;
alter table conflict_checks enable row level security;
alter table cases enable row level security;
alter table case_parties enable row level security;
alter table case_team enable row level security;
alter table fee_agreements enable row level security;
alter table events enable row level security;
alter table tasks enable row level security;
alter table workflows enable row level security;
alter table time_entries enable row level security;
alter table charges enable row level security;
alter table invoices enable row level security;
alter table invoice_lines enable row level security;
alter table payments enable row level security;
alter table trust_accounts enable row level security;
alter table trust_transactions enable row level security;
alter table documents enable row level security;
alter table document_templates enable row level security;
alter table communications enable row level security;
alter table audit_log enable row level security;

-- ===== Policies בסיסיים: בידוד לפי משרד =====
create policy firm_select on firms for select using (id = current_firm_id());

create policy profiles_all on profiles for select using (firm_id = current_firm_id());
create policy profiles_admin on profiles for all using (firm_id = current_firm_id() and current_role_name() = 'admin');

-- תבנית גנרית לטבלאות עם firm_id
do $$
declare t text;
begin
  foreach t in array array[
    'contacts','conflict_checks','cases','fee_agreements','events','tasks',
    'workflows','time_entries','charges','documents','document_templates','communications'
  ] loop
    execute format('create policy %I_tenant on %I for all using (firm_id = current_firm_id()) with check (firm_id = current_firm_id())', t, t);
  end loop;
end $$;

-- טבלאות בנות (דרך ההורה)
create policy case_parties_tenant on case_parties for all
  using (exists (select 1 from cases c where c.id = case_id and c.firm_id = current_firm_id()));
create policy case_team_tenant on case_team for all
  using (exists (select 1 from cases c where c.id = case_id and c.firm_id = current_firm_id()));
create policy invoice_lines_tenant on invoice_lines for all
  using (exists (select 1 from invoices i where i.id = invoice_id and i.firm_id = current_firm_id()));

-- ===== כספים: הרשאות מחמירות =====
-- חשבוניות: כולם רואים, רק admin/accountant יוצרים/מעדכנים
create policy invoices_select on invoices for select using (firm_id = current_firm_id());
create policy invoices_write on invoices for insert with check (
  firm_id = current_firm_id() and current_role_name() in ('admin','accountant')
);
create policy invoices_update on invoices for update using (
  firm_id = current_firm_id() and current_role_name() in ('admin','accountant')
);
-- אין policy למחיקה = מחיקה חסומה (רק ביטול)

create policy payments_select on payments for select using (firm_id = current_firm_id());
create policy payments_write on payments for insert with check (
  firm_id = current_firm_id() and current_role_name() in ('admin','accountant')
);

-- נאמנויות: הכי מחמיר
create policy trust_select on trust_accounts for select using (
  firm_id = current_firm_id() and current_role_name() in ('admin','accountant','lawyer')
);
create policy trust_txn_select on trust_transactions for select using (
  firm_id = current_firm_id() and current_role_name() in ('admin','accountant','lawyer')
);
create policy trust_txn_insert on trust_transactions for insert with check (
  firm_id = current_firm_id() and current_role_name() in ('admin','accountant')
);
-- אין update/delete על תנועות נאמנות בכלל

-- audit: קריאה ל-admin בלבד, כתיבה דרך service role / trigger
create policy audit_select on audit_log for select using (
  firm_id = current_firm_id() and current_role_name() = 'admin'
);
create policy audit_insert on audit_log for insert with check (firm_id = current_firm_id());
