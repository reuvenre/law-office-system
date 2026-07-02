// src/services/billing.ts — מנוע החיובים
// הלוגיקה העסקית המרכזית: שעות → חיובים → חשבון עסקה → חשבונית

import { SupabaseClient } from '@supabase/supabase-js';
import type { FeeAgreement, TimeEntry } from '../types/domain';

const VAT_RATE = 18.0; // עדכן לפי החוק

/**
 * חישוב ריטיינר חודשי ללקוח:
 * שעות בחודש מול שעות כלולות, וחיוב חריגה בתעריף overage.
 * מיועד לרוץ מ-Cron (Edge Function) ביום החיוב של כל הסכם.
 */
export async function computeMonthlyRetainer(
  db: SupabaseClient,
  agreement: FeeAgreement,
  month: string // 'YYYY-MM'
) {
  const from = `${month}-01`;
  const to = new Date(new Date(from).getFullYear(), new Date(from).getMonth() + 1, 0)
    .toISOString().slice(0, 10);

  // שעות billable של הלקוח בחודש (בכל התיקים תחת ההסכם)
  const { data: entries, error } = await db
    .from('time_entries')
    .select('duration_min, case_id, cases!inner(client_id, fee_agreement_id)')
    .eq('firm_id', agreement.firm_id)
    .eq('cases.fee_agreement_id', agreement.id)
    .eq('billable', true)
    .gte('entry_date', from)
    .lte('entry_date', to);
  if (error) throw error;

  const totalHours = (entries ?? []).reduce((s, e) => s + e.duration_min, 0) / 60;
  const included = agreement.retainer_hours ?? 0;
  const overageHours = Math.max(0, totalHours - included);
  const overageAmount = overageHours * (agreement.overage_rate ?? agreement.hourly_rate ?? 0);

  const charges = [
    {
      firm_id: agreement.firm_id,
      client_id: agreement.client_id,
      charge_type: 'retainer' as const,
      description: `ריטיינר חודשי ${month} (${included} שעות כלולות)`,
      amount: agreement.retainer_amount ?? 0,
      vat_rate: VAT_RATE,
    },
    ...(overageAmount > 0
      ? [{
          firm_id: agreement.firm_id,
          client_id: agreement.client_id,
          charge_type: 'fee' as const,
          description: `שעות חורגות ${month}: ${overageHours.toFixed(2)} שעות`,
          amount: round2(overageAmount),
          vat_rate: VAT_RATE,
        }]
      : []),
  ];

  return { totalHours, overageHours, charges };
}

/**
 * הפיכת רשומות שעתון לא-מחויבות לחיוב (הסכם שעתי)
 */
export async function chargesFromTimeEntries(
  db: SupabaseClient,
  firmId: string,
  caseId: string
) {
  const { data: entries, error } = await db
    .from('time_entries')
    .select('*')
    .eq('firm_id', firmId)
    .eq('case_id', caseId)
    .eq('billable', true)
    .eq('invoiced', false);
  if (error) throw error;

  const list = (entries ?? []) as TimeEntry[];
  if (!list.length) return null;

  const amount = list.reduce((s, e) => s + (e.duration_min / 60) * e.rate, 0);
  const totalMin = list.reduce((s, e) => s + e.duration_min, 0);

  const { data: caseRow } = await db.from('cases')
    .select('client_id').eq('id', caseId).single();

  return {
    charge: {
      firm_id: firmId,
      case_id: caseId,
      client_id: caseRow!.client_id,
      charge_type: 'fee' as const,
      description: `שכ"ט לפי שעות — ${(totalMin / 60).toFixed(2)} שעות`,
      amount: round2(amount),
      vat_rate: VAT_RATE,
      source_time_entry_ids: list.map((e) => e.id),
    },
    timeEntryIds: list.map((e) => e.id),
  };
}

/**
 * יצירת חשבון עסקה (proforma) מחיובים pending של לקוח.
 * ספרור רציף דרך next_counter — אין מחיקה, רק ביטול.
 */
export async function createProforma(
  db: SupabaseClient,
  firmId: string,
  clientId: string,
  chargeIds: string[],
  createdBy: string
) {
  const { data: charges, error } = await db
    .from('charges').select('*')
    .eq('firm_id', firmId)
    .in('id', chargeIds)
    .eq('status', 'pending');
  if (error) throw error;
  if (!charges?.length) throw new Error('אין חיובים פתוחים');

  const subtotal = round2(charges.reduce((s, c) => s + Number(c.amount), 0));
  const vatAmount = round2(subtotal * VAT_RATE / 100);

  const { data: num } = await db.rpc('next_counter', {
    p_firm: firmId, p_name: 'proforma',
  });

  const { data: invoice, error: invErr } = await db.from('invoices').insert({
    firm_id: firmId,
    client_id: clientId,
    doc_type: 'proforma',
    doc_number: num,
    subtotal,
    vat_rate: VAT_RATE,
    vat_amount: vatAmount,
    total: round2(subtotal + vatAmount),
    status: 'draft',
    created_by: createdBy,
  }).select().single();
  if (invErr) throw invErr;

  await db.from('invoice_lines').insert(
    charges.map((c) => ({
      invoice_id: invoice.id,
      charge_id: c.id,
      description: c.description,
      quantity: 1,
      unit_price: c.amount,
      line_total: c.amount,
    }))
  );

  await db.from('charges')
    .update({ status: 'invoiced', invoice_id: invoice.id })
    .in('id', chargeIds);

  return invoice;
}

/**
 * רישום תשלום + עדכון סטטוס חשבונית.
 * נקרא גם מ-webhook של ספק הסליקה.
 */
export async function recordPayment(
  db: SupabaseClient,
  firmId: string,
  invoiceId: string,
  payment: { method: string; amount: number; reference?: string; provider?: string; provider_txn_id?: string }
) {
  const { data: invoice } = await db.from('invoices')
    .select('*').eq('id', invoiceId).eq('firm_id', firmId).single();
  if (!invoice) throw new Error('חשבונית לא נמצאה');

  const { data: client } = await db.from('invoices').select('client_id').eq('id', invoiceId).single();

  await db.from('payments').insert({
    firm_id: firmId,
    invoice_id: invoiceId,
    client_id: client!.client_id,
    ...payment,
  });

  const { data: paid } = await db.from('payments')
    .select('amount').eq('invoice_id', invoiceId);
  const totalPaid = (paid ?? []).reduce((s, p) => s + Number(p.amount), 0);

  const status = totalPaid >= Number(invoice.total) ? 'paid' : 'partially_paid';
  await db.from('invoices').update({
    status,
    ...(status === 'paid' ? { paid_at: new Date().toISOString() } : {}),
  }).eq('id', invoiceId);

  return { status, totalPaid };
}

const round2 = (n: number) => Math.round(n * 100) / 100;
