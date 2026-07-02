# מדריך הטמעה — ערכת ליבה למערכת ניהול משרד עו"ד

## מה יש בערכה

```
legal-erp-kit/
├── supabase/migrations/
│   ├── 001_core.sql              # משרדים, משתמשים, CRM, תיקים, מונים
│   ├── 002_calendar_billing.sql  # יומן, משימות, workflows, שעתון, הסכמי שכ"ט, חיובים
│   ├── 003_finance_documents.sql # חשבוניות, תשלומים, נאמנויות, מסמכים, audit
│   └── 004_rls.sql               # RLS מלא + הרשאות לפי תפקיד
├── src/
│   ├── types/domain.ts           # טיפוסי TypeScript
│   └── services/billing.ts       # מנוע חיובים: ריטיינר, שעות→חיוב, חשבון עסקה, תשלום
└── docs/IMPLEMENTATION.md        # המסמך הזה
```

## התקנה

```bash
# 1. בפרויקט ה-Supabase שלך
supabase db push   # או הרץ את הקבצים בסדר דרך SQL Editor

# 2. העתק את src/ לפרויקט ה-Next.js
```

## איך זה מתחבר למערכת שאתה כבר בונה

אם כבר יש לך טבלאות clients/cases — מפה את השדות: הסכמה כאן בנויה כך שאפשר
להוסיף עמודות חסרות (`alter table`) במקום לשבור מה שקיים. הקריטי:
- `firm_id` על כל טבלה + RLS
- `firm_counters` + `next_counter()` לספרור חשבוניות רציף (דרישת רשות המסים)
- `trust_accounts` נפרד לחלוטין מכספי המשרד (כללי לשכת עוה"ד)
- `audit_log` append-only

## מבנה מומלץ ל-Next.js (App Router, RTL)

```
app/
├── (auth)/login/
├── (app)/
│   ├── dashboard/
│   ├── clients/            # CRM
│   ├── cases/[id]/         # תיק: overview, parties, docs, time, charges, comms
│   ├── calendar/
│   ├── tasks/
│   ├── billing/            # חיובים פתוחים, הפקת חשבון עסקה
│   ├── invoices/
│   ├── trust/              # נאמנויות
│   └── reports/
├── api/
│   ├── webhooks/payment/   # webhook סליקה → recordPayment()
│   └── cron/retainers/     # מופעל ע"י Vercel Cron יומי
└── portal/[token]/         # פורטל לקוח (צפייה + תשלום)
```

## Cron ריטיינרים (Vercel Cron / Supabase Cron)

יומי ב-06:00: שלוף `fee_agreements` פעילים עם `retainer_billing_day = today` →
`computeMonthlyRetainer()` → insert charges → `createProforma()` → שלח ללקוח (WhatsApp/מייל) עם לינק תשלום.

## סדר בנייה מומלץ (MVP)

1. **שבוע 1-2**: migrations + auth + מסכי לקוחות ותיקים (CRUD + חיפוש)
2. **שבוע 3**: יומן + משימות (Supabase Realtime לעדכונים חיים)
3. **שבוע 4**: שעתון (טיימר + הזנה ידנית) בתוך מסך תיק
4. **שבוע 5-6**: חיובים → חשבון עסקה → PDF → שליחה בוואטסאפ (Green API שכבר עבדת איתו)
5. **שבוע 7**: אינטגרציית חשבוניות (iCount/חשבונית ירוקה) + סליקה (Grow/Meshulam) + webhook
6. **שבוע 8**: מסמכים (Storage + תבניות docx-templates) + פורטל לקוח

## נקודות זהירות

- **מע"מ**: שמור `vat_rate` פר-שורה (השיעור משתנה — אל תקודד קשיח)
- **חשבוניות**: לעולם לא DELETE — רק `cancelled_at` + חשבונית זיכוי
- **הקצאה**: חשבוניות מס מעל הסף דורשות מס' הקצאה — עדיף להפיק דרך ספק מורשה (iCount) בשלב ראשון במקום לבנות מנוע עצמאי
- **נאמנויות**: משיכה דורשת `approved_by`; ה-trigger חוסם יתרה שלילית
- **Storage**: bucket פרטי, מבנה `firm_id/case_id/...`, גישה דרך signed URLs בלבד
