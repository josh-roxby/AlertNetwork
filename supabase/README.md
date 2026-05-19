# Supabase

Schema and migrations for the AlertNetwork Postgres database.

## First-time setup

1. **Create a Supabase project** at <https://supabase.com>. Free tier is fine.
2. **Copy your keys** from Project Settings → API:
   - Project URL → `NEXT_PUBLIC_SUPABASE_URL`
   - `anon` `public` key → `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - `service_role` `secret` key → `SUPABASE_SERVICE_ROLE_KEY`
3. **Paste them** into a new `.env.local` at the repo root (use `.env.example` as the template) and mirror the same three keys in Vercel → Settings → Environment Variables for every environment (Production / Preview / Development).
4. **Apply the migration**:
   - In Supabase: SQL Editor → New query → paste `migrations/0001_init.sql` → run.
   - Or with the [Supabase CLI](https://supabase.com/docs/guides/cli) once linked: `supabase db push`.
5. **Enable Auth**: Authentication → Providers → make sure Email is on and "Enable email signups" is checked. Magic-link is the only flow we use; password sign-in can stay off.

## Tenancy model

Single owner per project. `projects.owner_id` is the only authorisation root — every other table cascades through `project_id` (or `account_id → project_id`). RLS policies enforce this on the wire so the browser client can't read or write rows it doesn't own.

The cron path (`/api/cron/daily`) needs to read every account across users to schedule scrapes — that path uses the **service-role** client, which bypasses RLS. The service-role key must never reach the browser bundle.

## Schema

See `migrations/0001_init.sql` for the source of truth. Tables:

- `projects` (id, owner_id → auth.users, name, description, timestamps)
- `categories`, `tags` — project-scoped lookup tables
- `accounts` (project_id, handle, url, category_id, last_scraped_at, …)
- `account_tags` — m2m
- `posts` — TikTok post metrics, unique on `(account_id, platform_post_id)`. Daily scrape upserts here.
- `reports`, `report_accounts`, `report_categories`, `report_recipients`, `report_history`

We intentionally **don't** have:

- `users` — Supabase Auth owns `auth.users`; we reference it directly.
- `project_members` — single-owner model for v1. Add later if we need shared projects.
- `snapshots` — charts compute from `posts` directly until query perf demands a pre-aggregate.

## Migrations

Plain SQL files in `migrations/`. Numbered with a four-digit prefix (`0001_…`, `0002_…`). To add one:

1. Create the next-numbered file.
2. Write only the diff from the previous state.
3. Run it in the Supabase SQL editor against every environment (local / staging / prod).
4. Commit the file in the same PR that uses the new schema.

## Cron auth (Vercel + GitHub Actions)

The cron routes (`/api/cron/daily`, `/api/cron/reports`) accept either of two bearer tokens via `src/lib/cron-auth.ts`:

- `CRON_SHARED_SECRET` — used by the GitHub Actions backup workflow (`.github/workflows/cron.yml`), which manually attaches `Authorization: Bearer ${CRON_SHARED_SECRET}`.
- `CRON_SECRET` — used by **Vercel Cron**. Vercel only attaches the Authorization header to its outgoing cron requests if an env var named exactly `CRON_SECRET` exists in the project. Setting `CRON_SHARED_SECRET` alone is not enough — the Vercel cron will fire with no auth header and the route will 401.

Set **both** env vars in Vercel (Production / Preview / Development) to the same value. Mirror `CRON_SHARED_SECRET` as a GitHub Actions repository secret, and set `APP_URL` as a repository variable.
