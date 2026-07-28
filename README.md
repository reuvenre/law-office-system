# מערכת לניהול משרד עורכי דין

Practice-management system for a small Israeli law office. Hebrew, full RTL, mobile-first.

## Stack

- **Next.js 16** (App Router, Turbopack, TypeScript) · React 19 · Tailwind + shadcn/ui
- **Neon Postgres** (EU / Frankfurt) via **Drizzle ORM**
- **Auth.js v5** (Google OAuth + email/password, bcrypt)
- **Vercel Blob** (documents) · **Vercel** (hosting)
- Reminders via Vercel Cron · Make + Google Drive sync
- Online payments (Grow/Meshulam, Cardcom) · Claude for the optional AI assist

## Setup

1. **Install**: `npm install`
2. **Neon**: create a project (EU/Frankfurt) at [neon.tech](https://neon.tech), copy the **pooled** connection string.
3. **Env**: fill `.env.local` (see `.env.example`):
   - `DATABASE_URL` — Neon pooled connection string
   - `AUTH_SECRET` — already generated (or `npx auth secret`)
   - `BLOB_READ_WRITE_TOKEN` — Vercel → Storage → Blob (needed for document uploads)
4. **Migrate**: `npm run db:migrate`
5. **Provision a firm** and its first admin — this is the onboarding path, and
   nothing can be created until a firm exists:

   ```
   npm run db:provision -- --name "משרד כהן ושות׳" \
     --admin-name "עו״ד דנה כהן" --admin-email dana@example.co.il \
     --password 'a-strong-password' [--plan basic|pro|enterprise]
   ```

6. **Seed extra dev users** (optional): `npm run db:seed` — adds two lawyers to
   the single existing firm. Refuses to guess once more than one firm exists.
7. **Run**: `npm run dev` → http://localhost:3000

On Vercel, `vercel-build` runs pending migrations before `next build`, so a
failed migration fails the deploy rather than shipping code against an older
schema. `DATABASE_URL` must therefore be available at build time too.

## Scripts

- `npm run dev` / `build` / `start`
- `npm run db:generate` — generate SQL migration from schema
- `npm run db:migrate` — apply migrations to Neon
- `npm run db:push` — push schema directly (dev)
- `npm run db:studio` — Drizzle Studio
- `npm run db:seed` — seed dev users into the existing firm
- `npm run db:provision` — create a firm + its first admin (customer onboarding)
- `npm test` — unit tests (Vitest)
- `npm run lint` — ESLint

## Status

Auth (Google + credentials + self-service password reset), clients, cases,
hearings (shared monthly office calendar), deadlines, tasks, documents,
dashboard, notes/audit, activity feed, global search, reminders
(WhatsApp/SMS/email via Vercel Cron), Make + Drive sync, per-user visibility
scopes + admin, embedded Hebrew user guide, and the full ERP billing stack:
time entries → charges → proforma → tax invoice (with מספר הקצאה) → payments,
retainer cron, client portal and online payments.

Not built yet: subscription billing for the firms themselves. Plans and seat
caps are enforced, but assigning a plan is a vendor action (`VENDOR_EMAILS`),
not a self-serve purchase. See `docs/launch-checklist-2026-07-27.md`.

## Notes

- **Tenancy**: every scoped query ANDs `firm_id`, and every insert stamps it
  from the signed-in viewer. The `firm_id` columns carry no default, so a
  forgotten stamp is a compile error rather than data filed under the wrong
  firm.
- **Authorization**: any active signed-in user may enter the app (`requireUser`);
  per-user visibility scopes (`all` / `own` / `custom`) are enforced in every
  list/detail/mutation query via `getViewer` + `lib/auth/scope.ts`. Admin-only and
  finance-only areas are gated by `requireAdmin` / `requireFinanceRole`;
  plan/module changes require `requireVendor`.
- **AI is opt-in per firm** (`ai` module, off by default on every tier) because
  it sends case material to a third-party API. `/privacy` states exactly what.
- **Documents** are stored in Vercel Blob and served through an auth-gated proxy
  (`/api/documents/[id]/download`); blob URLs are never exposed to the client.
- **Audit**: every status change writes `case_status_history` (atomic via `db.batch`);
  notes and status changes show author + timestamp everywhere; `activity_log` is append-only.
