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

**Three concentric tiers, enforced by RLS:**

1. **Super admin** — listed in `super_admins`. Only super admins can `INSERT` into `projects`. There's no UI to grant super-admin status; you manage the table yourself from the Supabase Studio Table Editor. `is_super_admin()` is the SQL helper, also exposed to the browser via the `super_admins` SELECT policy (each user can see their own row, so the UI can tell whether to render the "New project" button).
2. **Project owner** — `projects.owner_id`. Mutates everything inside a project (accounts, reports, recipients, categories, tags, etc.). The owner of a project is always the super-admin who created it.
3. **Project viewer** — row in `project_members` with `role = 'viewer'`. Read-only access to the project's accounts, posts, reports and their history. Invited by the project owner via Settings → Team & access.

Two SQL helper functions back the RLS policies:

- `is_project_member(project_id)` — owner OR viewer; gates every SELECT policy on project-scoped tables.
- `is_project_owner(project_id)` — strict owner check; gates every INSERT/UPDATE/DELETE policy on project-scoped tables.

**Inviting a viewer** uses Supabase's `auth.admin.inviteUserByEmail` (server-side, via the service role) which both creates the `auth.users` row and emails a magic-link, then inserts a `project_members` row tying the new user to the project as a viewer.

**Invite-only sign-in.** The `/auth/callback` route checks that the freshly-authenticated user is a super-admin OR owns at least one project OR appears in `project_members`. If none of those, it signs them out and redirects back to `/login?error=invite-only`. So anyone who knows the Supabase URL can request a magic-link, but they can't land in the app without a prior invite (or super-admin status).

The cron path (`/api/cron/daily`) needs to read every account across users to schedule scrapes — that path uses the **service-role** client, which bypasses RLS. The service-role key must never reach the browser bundle.

### Granting super-admin status

1. Supabase Dashboard → Table Editor → `super_admins`.
2. Insert a row with the `user_id` from `auth.users` (look up by email) and the email.
3. Optionally fill `granted_by` (your own user id) and `note`.
4. The new super-admin can sign in even with zero projects and will see the "New project" button on first load.

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
