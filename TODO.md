# TODO

Project work list for AlertNetwork. Organised by feature group. Format: `A-1-1` = group A, item 1, sub-item 1.

> All UI scope (Groups A–L) is now on `main`. Open work is the bigger initiatives — **M** Supabase, **N** scrape + email, **O** GitHub cron — plus a couple of small carry-overs.

## Status snapshot

| Scope | Status | PRs |
|---|---|---|
| A — Global polish | ✅ Done | #13 |
| B — Dashboard expansion | ✅ Done | #14 |
| C — Account UI fixes | ✅ Done | #15 |
| D — Account detail page | ✅ Done | #16 |
| E — Reports list / detail enhancements | ✅ Done | #17 |
| F — Shareable view-only + password gate | ✅ Done | #18 |
| G — Theme + cleanups + back-history + desktop layout | ✅ Done | #19, #24 |
| H — Dashboard interactivity | ✅ Done | #20 |
| I — Account UI deep cuts (tier removal, edit, add-account form) | ✅ Done | #20, #21 |
| J — Reports polish (PDF, view FAB, NewReport parity) | ✅ Done | #23 |
| K — Settings cleanups + management modals | ✅ Done | #19, #21 |
| L — Navigation + projects | ✅ Done | #22 |
| **M — Supabase / DB** | 🟡 Pending | — |
| **N — Scrape + email functions** | 🟡 Pending | — |
| **O — GitHub cron** | 🟡 Pending | — |

## Open (next round)

### M. Database (Supabase)

- [ ] **M-1** Provision a Supabase project. Capture URL, anon key, service role key in `.env.local` (and Vercel env vars).
- [ ] **M-2** SQL migrations. Tables and columns to mirror the placeholder shapes in `src/lib/placeholder-data.ts`:
  - `users` (id, email, name, created_at)
  - `projects` (id, owner_id, name, description, created_at, updated_at)
  - `project_members` (project_id, user_id, role: 'owner' | 'member' | 'viewer')
  - `categories` (id, project_id, label, palette_id)
  - `tags` (id, project_id, label)
  - `accounts` (id, project_id, handle, display_name, platform, url, category_id, followers, created_at, last_logged_at)
  - `account_tags` (account_id, tag_id)
  - `snapshots` (id, account_id, taken_at, median_views, total_views, engagement_ratio, posts_per_cycle, health_score)
  - `reports` (id, project_id, name, description, cadence: 'weekly' | 'monthly', schedule, scope_kind, status, is_featured, password_hash, last_sent_at)
  - `report_accounts` (report_id, account_id) — for scope='account'
  - `report_categories` (report_id, category_id) — for scope='tag'
  - `report_recipients` (report_id, email)
  - `report_history` (id, report_id, sent_at, status, recipients, accounts)
- [ ] **M-3** Auth + Row-Level Security.
  - Enable Supabase Auth (email + magic link is fine for v1).
  - RLS policies on every table: users can read/write only their own projects + cascade.
  - Replace `src/proxy.ts` no-op stub with a real proxy that checks the Supabase session. Flip `AUTH_ENABLED` to `true`.
  - Replace the localStorage password gate (`src/components/password-gate.tsx`) with an HttpOnly cookie set by a server action, server-side validation against `password_hash`.
  - Replace placeholder data reads with Supabase queries; delete `src/lib/placeholder-data.ts` and the `PLACEHOLDER_MODE` flag.

### N. Scrape + email function

- [ ] **N-1** Authenticated cron API at `/api/cron/scrape`. Iterates every account on Supabase across projects and pulls the last 24 hours of TikTok data. Stores snapshots. Single shared secret in the `Authorization` header (env var).
- [ ] **N-2** TikTok API integration. **Waiting on the API spec from the user** — request shape, rate-limits, fields, error handling. Once received, normalise into the `snapshots` row shape from M-2.
- [ ] **N-3** Report dispatch API at `/api/cron/reports`. Same cron fires this — iterate every report, decide if today is a send day (weekly → Monday; monthly → 1st), render the report (reuse `src/components/report-view.tsx` server-side or render to HTML email template), send via Gmail service account. Record the send in `report_history`.

### O. GitHub Cron

- [ ] **O-1** `.github/workflows/cron.yml` with `schedule: '0 8 * * *'` (08:00 GMT daily). Two jobs: hit `/api/cron/scrape` and `/api/cron/reports` with the shared secret. Document the secret rotation runbook.

## Small carry-overs (still relevant)

- [ ] Replace `README.md` (currently the create-next-app default) with project-specific setup instructions — env vars, scripts, branching model, deploy.
- [ ] Set up CI in GitHub Actions running `npm run build` + `npm run lint` + `npm run typecheck` on PRs. Local builds + lint are already clean; CI just enforces.
- [ ] Once M-3 lands: delete `src/lib/placeholder-data.ts`, drop all its imports, remove the "Placeholder data" badge from the top bar (search for `PLACEHOLDER_MODE`).
- [ ] Once M-3 lands: flip `AUTH_ENABLED = true` in `src/proxy.ts` (and rename the file if you switch to a real proxy — Next 16 deprecation note in commit message of the original move).

## Pre-existing context the next round will need

- **Placeholder data**: every page reads from `src/lib/placeholder-data.ts`. Records have stable IDs (`acc_01`–`acc_08`, `prj_01`–`prj_03`, `rep_01`–`rep_03`). One report (`rep_01`) has `password: "clientx"` for password-gate testing.
- **Time series**: `accountTimeSeries(account, days)` generates deterministic 90-day series with mulberry32 seeded by `account.id` — keeps the charts stable across renders.
- **Sheet kinds**: `addAccount | newReport | newProject | manageTeam | categories | tags | editAccount` (the last one carries an `accountId`). Defined in `src/components/shell-context.tsx` as a discriminated union.

## Done

(Everything from repo bootstrap through Round 6 — see the Status snapshot above and the merged PR list on GitHub.)
