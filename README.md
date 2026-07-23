# מערכת לניהול משרד עורכי דין

Practice-management system for a small Israeli law office. Hebrew, full RTL, mobile-first.

## Stack

- **Next.js 14** (App Router, TypeScript) · Tailwind + shadcn/ui
- **Neon Postgres** (EU / Frankfurt) via **Drizzle ORM**
- **Auth.js v5** (email + password, bcrypt)
- **Vercel Blob** (documents) · **Vercel** (hosting)
- Reminders via Vercel Cron (Phase 7) · Make + Google Drive (Phase 7b)

## Setup

1. **Install**: `npm install`
2. **Neon**: create a project (EU/Frankfurt) at [neon.tech](https://neon.tech), copy the **pooled** connection string.
3. **Env**: fill `.env.local` (see `.env.example`):
   - `DATABASE_URL` — Neon pooled connection string
   - `AUTH_SECRET` — already generated (or `npx auth secret`)
   - `BLOB_READ_WRITE_TOKEN` — Vercel → Storage → Blob (needed for document uploads)
4. **Migrate**: `npm run db:migrate`
5. **Seed users** (optional names/passwords via `SEED_LAWYER1_*` / `SEED_LAWYER2_*` env): `npm run db:seed`
   - Defaults: `lawyer1@example.com` / `lawyer2@example.com`, password `ChangeMe!123` — **change before production**.
6. **Run**: `npm run dev` → http://localhost:3000

## Scripts

- `npm run dev` / `build` / `start`
- `npm run db:generate` — generate SQL migration from schema
- `npm run db:migrate` — apply migrations to Neon
- `npm run db:push` — push schema directly (dev)
- `npm run db:studio` — Drizzle Studio
- `npm run db:seed` — seed the two lawyer users

## Status

Phases 0–8 implemented: auth (Google + credentials), clients, cases,
hearings (incl. shared monthly office calendar), deadlines, tasks, documents,
dashboard, notes/audit, activity feed, global search, reminders (WhatsApp/SMS/email
via Vercel Cron), Make + Drive sync, per-user visibility scopes + admin, and the
ERP billing engine (time entries → charges → proforma → payments, retainer cron).
Billing currently has no UI — engine, schema, webhook and cron only.

## Notes

- **Authorization**: any active signed-in user may enter the app (`requireUser`);
  per-user visibility scopes (`all` / `own` / `custom`) are enforced in every
  list/detail/mutation query via `getViewer` + `lib/auth/scope.ts`. Admin-only and
  finance-only areas are gated by `requireAdmin` / `requireFinanceRole`.
- **Documents** are stored in Vercel Blob and served through an auth-gated proxy
  (`/api/documents/[id]/download`); blob URLs are never exposed to the client.
- **Audit**: every status change writes `case_status_history` (atomic via `db.batch`);
  notes and status changes show author + timestamp everywhere; `activity_log` is append-only.
