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

### Decisions (settled 2026-05-14)

- **Auth**: Supabase magic link only. No password flow, no OAuth (can add later).
- **Tenancy**: single owner per project. `projects.owner_id = auth.uid()` is the only RLS root; cascade through FKs. `project_members` table dropped. The "Manage team" sheet stays as a placeholder until we add membership.
- **No `snapshots` table**: charts compute from `posts` directly. Revisit if query perf needs a pre-aggregate.
- **Posts**: backend-only for this round; no new Posts UI on `/accounts/[id]`.

### M. Database (Supabase)

- [ ] **M-1** Provision a Supabase project (user). Capture URL, anon key, service role key in `.env.local` (and Vercel env vars across Production / Preview / Development). See `supabase/README.md`.
- [x] **M-2 scaffolding** SQL migration + Supabase client modules. `supabase/migrations/0001_init.sql` is the schema source of truth; `src/lib/supabase.ts`, `supabase-server.ts`, `supabase-admin.ts` are the three client wrappers.
- [ ] **M-3** Wire auth + replace placeholder data.
  - Add `/login` (magic-link request form) + the email callback route.
  - Flip `src/proxy.ts` `AUTH_ENABLED` to `true`; check Supabase session, redirect unauth'd traffic.
  - Replace localStorage password gate (`src/components/password-gate.tsx`) with HttpOnly cookie + server-side check against `reports.password_hash`.
  - Swap every page's read from `src/lib/placeholder-data.ts` to Supabase queries. Add proper empty states for projects / accounts / categories / tags. Delete `placeholder-data.ts` and the `PLACEHOLDER_MODE` badge once nothing imports it.

### N. Scrape + cron API routes

Apify constraints to bake in:
- Endpoint: `POST https://api.apify.com/v2/acts/apidojo~tiktok-scraper-api/run-sync-get-dataset-items?token=$APIFY_API_KEY` — sync, dataset items inline in response.
- 48h window is **server-side filtering** — Apify's `dateRange` only applies to keyword search, not `startUrls`. User feeds return most-recent first; we filter by post `createTime`.
- `maxItems: 50` per account (~30 surfaces is typical). Cost reference: $0.0003/post × 30 × 100 accounts ≈ $0.90/day.
- Keep the raw response in `posts.raw` (JSONB). Extract typed columns: `views, likes, comments, shares, saves, posted_at`. Engagement ratio is derived at query time.

- [ ] **N-1** `GET /api/accounts` — list accounts for the logged-in user (RLS-gated). Returns `{ id, url, project_id, last_scraped_at }`.
- [ ] **N-2** `POST /api/scrape/tiktok-daily` — body `{ accountId, url }`. Calls Apify, filters to last 48h, upserts `posts` on `(account_id, platform_post_id)`. Returns `{ scanned, inserted, updated }`. Idempotent — safe to retry.
- [ ] **N-3** `POST /api/cron/daily` — guarded by `CRON_SHARED_SECRET`. Uses service-role client to read all accounts, then calls per-account scrape (sequential or limited concurrency of ~5). Returns a per-account summary.
- [ ] **N-4** Email/report dispatch — separate slice, opened after the daily-scrape pipeline is producing real data. Will reuse `src/components/report-view.tsx` for HTML email rendering.

### O. GitHub Cron

- [ ] **O-1** `.github/workflows/cron.yml` — `schedule: '0 8 * * *'` (08:00 UTC daily). Hits `/api/cron/daily` on the deployed Vercel URL with the `CRON_SHARED_SECRET` repo secret. Document the secret rotation runbook in `supabase/README.md`. Email/report cron is a separate workflow added with N-4.

## Small carry-overs (still relevant)

- [ ] Replace `README.md` (currently the create-next-app default) with project-specific setup instructions — env vars, scripts, branching model, deploy.
- [ ] Set up CI in GitHub Actions running `npm run build` + `npm run lint` + `npm run typecheck` on PRs. Local builds + lint are already clean; CI just enforces.

## Recovery work from pre-DB rounds (M-3c)

Things the early rounds had that the data-layer refactor dropped on the floor — recover, but on real DB-driven data this time.

- [ ] **`/reports/[id]/view` real data + PDF export.** The page is currently a stub. Restore: scoped accounts list, top-performer posts, per-category breakdown, computed health summary, "Export PDF" button (was wired via the browser's print pipeline in an earlier round). Honour `?historyId=` so history rows open the report at that send.
- [ ] **Password protection on shared report views.** `reports.password_hash` column exists. Implement: bcrypt-hashed password set from Manage sheet; `/view` checks an HttpOnly cookie issued by a POST `/api/reports/[id]/unlock` endpoint; viewers without the cookie see a password gate matching the rest of the design.
- [ ] **Full Apify JSON for caption mapping** (waiting on user). Captions return `(no caption)` for some accounts — likely the actor returns the body under a field we don't alias yet. Once we have a sample payload, add the right field to `mapApifyPost` in `src/lib/apify/tiktok.ts`. Vercel function logs print Object.keys when mapping bails wholesale — useful for partial successes.
- [x] **Per-project health-config** *(M-3b.4 — landing now via PR #37)*. Migration `0002_health_config.sql`, defaults in `src/lib/data/health.ts`, UI in the Manage project sheet. *Migration applied to the live Supabase project on 2026-05-19 via MCP.*

## Carry-overs from 2026-05-19 cron debug

- [ ] **Multi-user / project sharing.** TODO.md previously locked us into single-owner. User wants invited viewers (read-only). Plan: new `project_members(project_id, user_id, role)` table where `role in ('viewer','editor')`; RLS policies on every project-scoped table expand to `owner_id = auth.uid() OR exists (select 1 from project_members where project_id = … and user_id = auth.uid())`; new "Manage team" sheet replaces the placeholder; invitations by email (magic-link signup if not yet a user). Separate branch / PR.
- [x] **Report detail — restore "Total views" + "Engagement" metric tiles.** `src/components/report-detail.tsx` (Recent tab, around the `Average health` hero in `ReportRecent`) currently shows only the average-health tile and jumps straight to "Top 3 accounts". Earlier rounds had a 2-up (or 2×2) metric tile row underneath the hero: total views across scoped accounts in the report window, total engagement (likes + comments + shares) or engagement rate, and probably post count. Numbers all exist in scope already — `health.totalViews`, `health.totalLikes`, `health.totalComments`, `health.totalShares`, `health.postCount`, `health.engagementRate` are computed per-account by `computeAccountHealth` and just need aggregating across `withHealth` then rendering via the same `StatsGrid` / tile pattern used on `/dashboard`. Honour the report's date range from `health-config` (30d default).

## Audit list — re-walk every PR from rounds A-M

User flagged that prior UI got lost during the DB swap. Items to audit and restore where appropriate:

- [ ] Round-by-round review of PRs #13 → #28 (pre-DB rounds) and the live-data rounds (#29-37). Restore anything that's still missing: dashboard hero variants, account chart configurations, report scope picker polish, etc.

## Pre-existing context the next round will need

- **Placeholder data**: every page reads from `src/lib/placeholder-data.ts`. Records have stable IDs (`acc_01`–`acc_08`, `prj_01`–`prj_03`, `rep_01`–`rep_03`). One report (`rep_01`) has `password: "clientx"` for password-gate testing.
- **Time series**: `accountTimeSeries(account, days)` generates deterministic 90-day series with mulberry32 seeded by `account.id` — keeps the charts stable across renders.
- **Sheet kinds**: `addAccount | newReport | newProject | manageTeam | categories | tags | editAccount` (the last one carries an `accountId`). Defined in `src/components/shell-context.tsx` as a discriminated union.

## Done

(Everything from repo bootstrap through Round 6 — see the Status snapshot above and the merged PR list on GitHub.)
