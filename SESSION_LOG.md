# Session log

Chronological record of substantive sessions. Each entry is one round of work — what was wrong / what was built / which PR(s) shipped it. Future Claude should read this before changing the auth model, the cron pipeline, the reports schema, or the email path, because the context for each decision lives here.

The TL;DR up top of `CLAUDE.md` covers the codebase shape. This file covers the decision history.

---

## 2026-05-19 — Daily cron debug saga (PRs #40, #41, #42)

**Symptom:** crons "fired" daily but accounts went stale. Reports stopped landing. Account `last_scraped_at` was updating but `posts.updated_at` wasn't.

**Misdiagnosis #1** — Suspected the `CRON_SECRET` env var wasn't set in Vercel (Vercel Cron only sends `Authorization: Bearer ${CRON_SECRET}` if that exact env var name is present; the codebase only documented `CRON_SHARED_SECRET`). Got the user to set both. Cron still didn't write posts.

**Misdiagnosis #2** — Thought the route was hitting Vercel's `maxDuration=60s` limit on Hobby. Function ran for 5 minutes (the Pro ceiling), returned 200, but still no posts written. Suggested moving to async Apify webhooks. User pushed back; said the endpoint works when curl'd manually.

**Actual root cause** — the Apify actor (`apidojo~tiktok-scraper-api`) had silently changed its output schema. Handle moved from `authorMeta.uniqueId` to `channel.username`. Caption from `text` → `title`. URL from `webVideoUrl` → `postPage`. Saves from `collectCount` → `bookmarks`. Our `postHandle()` aliases didn't include any of the new fields, so every post returned `null` from `postHandle()`, was skipped in the bucketing loop, and every per-account bucket came back empty. `upsertPosts(0 posts)` was a no-op, but `bumpAccountLastScraped()` ran unconditionally — which is why the timestamps kept refreshing while posts didn't.

**Fix:** added the new field names as first-choice aliases in `src/lib/apify/tiktok.ts`, kept the legacy names as fallbacks. PR #41.

**Lessons baked into later PRs:**
- `last_scraped_at` should NOT update when `written === 0` — silent failure mode (still on the TODO).
- Need an audit trail per cron run, not just per-row timestamps. Eventually shipped as `scrape_runs` in PR #53.
- Apify actor schemas drift. The mapping layer has to be permissive AND log keys when it bails so we can see what changed.

---

## 2026-05-19 — Snapshot frozen reports (PR #42)

**Why:** when a weekly report sends, the recipient should see the metrics AS OF the send. Until this PR, opening an old history row showed today's live data — the snapshot was implicit, not frozen.

**Built:** migration `0003_report_history_payload.sql` adds `report_history.payload jsonb`. New helper `buildReportSnapshot()` (server-side, service-role) resolves scope, fetches the 30-day window, computes per-account health + aggregates + top posts, returns a versioned JSON payload. Both `/api/cron/reports` and `/api/reports/[id]/run-now` write it on send. `/reports/[id]/view?historyId=X` reads the payload if present, falls back to live data for pre-PR history rows.

**Schema versioning:** `payload.version = 1`. New fields added in later PRs (`cadence`, `prior_period_totals`, per-account `mean_views` + `last_posted_at`, `daily_series`) are all optional — old payloads render gracefully without them.

---

## 2026-05-19 — Google SMTP wiring (PR #43)

**Decision:** App Password over OAuth2. Single sender (`ora@exhale.studio`), no third-party brokering. Setup is ~5 min in Google Account + Vercel env vars. Wrote `src/lib/email/transport.ts` (pooled nodemailer transport) + `src/lib/email/report-email.ts` (pure HTML-string template). Inline styles only — Gmail / Outlook / Apple Mail all strip `<style>` tags inconsistently.

Cron path now sends emails per-recipient (not BCC — spam-filter score, per-address delivery status). `report_history.recipients` count + `status` update on success.

Later (PR #55) the user moved auth emails through Resend; the report email transport stayed on Gmail until further notice.

---

## 2026-05-19 — Report iteration round (PRs #44–47)

User reviewed the first real report email + screenshot from an external app. Four asks:

1. **Cadence-aware window** (PR #44). Weekly reports → 7 days. Monthly → 30 days. Threaded through `computeAccountHealth(posts, config, windowDays?)`, the view page, the report detail page, the email renderer.
2. **W/W and M/M deltas** (PR #44). Snapshot rolls up the period preceding the current window. Email surfaces ▲/▼ pills on total views, avg ER, avg health. Math handles edge cases — zero prior period → "new", < 0.5% → "flat".
3. **Dense per-account metrics** (PR #44). Replaced simple `AccountTile` with `AccountStatsBlock` — handle + category + health pill on top, 2×4 grid of (Posts / Total views / Total eng. / ER% / Mean / Median / Per wk / Last post). Rendered identically in the email and on the report detail page.
4. **Recipients UI** (PR #45). Multi-recipient editor in the Manage Report sheet. Add / remove via API endpoints with RLS-gated writes.
5. **Trend charts** (PR #46). Three Recharts cards: Daily views (area), Engagement rate (line, view-weighted), Posts per day (bar). Extracted shared chart primitives to `src/components/charts.tsx`.
6. **Reorder + chart on share view** (PR #47). User wanted Top 5 posts above All by category. Also wanted charts on `/reports/[id]/view` so email recipients see them too — but the share view loads from snapshot, so we added `daily_series` to `ReportSnapshotV1` (still v1, optional field).

---

## 2026-05-20 — Multi-user authorization (PRs #48, #49)

**Why:** single-owner-per-project was too restrictive — user wanted invited viewers.

**Built (PR #48):**
- New `project_members(project_id, user_id, role='viewer', invited_email, invited_by, invited_at)` table.
- Two SQL helpers: `is_project_member(p)` (owner OR member) and `is_project_owner(p)` (strict owner).
- Replaced every project-scoped RLS policy. SELECT uses `is_project_member` (viewers can read), all writes use `is_project_owner`.
- Invite via `auth.admin.inviteUserByEmail()` — Supabase creates the user row + sends a magic-link email in one call. Insert `project_members` row tying that user to the project.
- `/auth/callback` rejects sign-ins with no ownership or membership → bounces to `/login?error=invite-only`.
- Rebuilt `TeamSheet` from its placeholder stub into a real members manager (list + invite + remove).
- `useShell()` exposes `currentRole` + `isOwner`. Every create/edit button checks it.

**Follow-up (PR #49):** several UI affordances still showed for viewers even though writes would 403 at the RLS layer. Hidden them (Add account, New report, Manage report, Edit account, Rescan now, Settings nav link). API endpoints that use the service-role client (which bypasses RLS) got explicit `owner_id` checks before calling `supabaseAdmin()` — without these a viewer could `curl /api/reports/.../run-now` and trigger sends.

Also stripped the red/green health-band colours (`BAND_BG` / `BAND_TONE` now neutral everywhere) — user found the colour wash made the dashboard read like a stoplight. Period-over-period ▲/▼ still get green/red — different signal.

Reordered Recent tab: Overview → Top 3 → Trends → Top 5 posts → All by category (bottom).

---

## 2026-05-20 — Super-admin gate + manager role (PRs #50, #51)

**Why:** the user wanted to be the only person who can CREATE projects. Anyone signed in (including invited viewers) could previously create their own.

**Built (PR #50):**
- New `super_admins(user_id, email, granted_at, granted_by, note)` table — managed via Supabase Studio, no UI.
- `is_super_admin()` SQL helper (`SECURITY DEFINER`).
- Replaced the `projects` INSERT policy with `is_super_admin() AND owner_id = auth.uid()`.
- Auth callback also lets super-admins through even with zero memberships.
- `ShellContext.isSuperAdmin` from a `super_admins` SELECT.
- "New project" affordances all gated by `isSuperAdmin`.

**Bug surfaced in PR #50:** super-admin sign-in stopped working for `josh@exhale.studio` after the merge. Verified directly in the DB that everything was correct (RPC returned `true`, projects readable). The client-side SELECT against `super_admins` was misfiring somehow in the live deployment despite working in SQL simulation.

**Fix (PR #51):**
- Switched client `isSuperAdmin()` to call the RPC instead of selecting the table directly. `SECURITY DEFINER` bypasses RLS entirely → no policy-evaluation surface area.
- Auth callback now **fails open** on errors — if any of the three access checks (super, owns, member) error, let the user through and log it. Per-page RLS still keeps unauthorised users from reading data; a transient hiccup can never lock the super-admin out.
- New 'manager' role on `project_members`. Sits between viewer and owner. Can add/edit accounts and reports; cannot create projects, invite members, generate-now, send-test, change health-config, set passwords.
- `can_manage_project(p)` helper. Re-pointed write policies on accounts / posts / reports / tags / categories / account_tags / report_accounts / report_categories / report_recipients to it.
- TeamSheet now has a Viewer/Manager dropdown on each row + on the invite form. PATCH endpoint to flip roles in-place.

---

## 2026-05-20 — Role enum + dashboard diagnostic (PR #52)

**Why:** the super-admin sign-in bug stayed elusive across two debug rounds. PR #52 is more diagnostic-than-curative.

**Built:**
- Migration `0007` converts `project_members.role` from `text + CHECK` to a Postgres ENUM (`project_member_role`). Same value space; Supabase Studio renders a dropdown instead of a free text input.
- New `NoActiveProjectState` component on `/dashboard` — when `!activeProjectId`, instead of a plain "Waiting for invite" we now show the user their email + detected role + project count + a "Refresh data" button + Sign out link. Future stuck states are self-debuggable.
- `refreshProjects` now also re-fetches super-admin status.

The original sign-in bug was likely transient — the user reported it working after PR #51 deployed. PR #52's diagnostic empty state is insurance for the next time it happens.

---

## 2026-05-21 — pg_cron + scrape_runs audit (PR #53)

**Why:** Vercel Cron missed firing twice. The forensic debug from `last_scraped_at` timestamps was the third time we'd done that. Both problems traceable to "no first-class audit of cron invocations" + "Vercel Cron's SLA is 'approximately on schedule'".

**Built:**
- Migration `0008` — `scrape_runs` table + source/status enums. RLS-gated SELECT for super-admins (operational telemetry, not user data).
- Migration `0009` — enables `pg_cron` + `pg_net`. New `app_settings` table for the production URL. `cron_secret()` reads from Vault, `app_url()` reads the settings table.
- `supabase/setup-pg-cron.sql` — one-time setup script the user pastes once with their domain + after putting the secret in Vault. Idempotent.
- New `src/lib/data/scrape-runs.ts` — `startScrapeRun` / `finishScrapeRun` / `recentSuccessfulRun` / `detectSource` (reads `?source=` query param + falls back to User-Agent for Vercel).
- All three trigger paths instrumented: `/api/cron/daily`, `/api/cron/reports`, `/api/scrape/tiktok-account`.
- Daily route dedups — if a successful run lands in the last 60 minutes, subsequent triggers within that window return `{ skipped: true, reason: 'recent_success' }` without re-scraping. So pg_cron + Vercel Cron + GitHub Actions can all stay enabled simultaneously without burning triplicate Apify credits.
- GitHub Actions workflow updated to send `?source=github-actions`.

**Architecture:** three independent triggers (pg_cron primary 08:15 UTC, Vercel Cron 08:13 UTC, GitHub Actions 08:23 UTC). Whichever fires first does the work, the others audit-skip.

Verified end-to-end live on 2026-05-21: pg-cron success + audit row + dedup'd github-actions skip + dedup'd pg-cron skip on a manual retry, all in `scrape_runs`.

---

## 2026-05-21 — Backfill + loading polish (PR #54)

**Built:**
- New `POST /api/projects/[id]/backfill` — super-admin + project-owner gated. Body `{ months: 1-12 }`. Re-runs the same Apify path the daily cron uses but with a wider window. Posts upsert on the existing `(account_id, platform_post_id)` unique key so existing rows get refreshed and historical posts (which fell out of the rolling 7-day window) get inserted.
- "Update project metrics" section in the Manage Project sheet, visible only to super-admins. 1-12 month slider, "Run backfill" button. Refreshes in-memory accounts + posts after a successful run.
- `ShellContext.bootstrapping` — true until projects + super-admin status resolve. Pages (`/dashboard`, `/accounts`, `/reports`, `/projects`) gate on it before any other branching. Stops the 1-frame flash of the empty state on first paint after sign-in.

---

## 2026-05-21 — Email branding (PR #55)

- Report email button changed from orange (`#FF6B35`) to brand yellow (`#FFD300`). One-line fix; orange wasn't actually the app accent.
- Two new HTML templates in `supabase/email-templates/` — paste into Supabase Studio → Authentication → Email Templates. `invite.html` for the first-time invite, `magic-link.html` for every subsequent sign-in. Both match the report email visual language. README in the folder has install steps.
- (User had earlier swapped Supabase's outgoing SMTP from the built-in to Resend — see message of 2026-05-21 about hitting rate limits. Auth emails now go through Resend; report emails still go through `ora@exhale.studio` Gmail via nodemailer.)

---

## Cross-cutting notes that didn't make CLAUDE.md

- **Scrape audit is the source of truth.** When debugging cron, always go to `scrape_runs` first — it'll tell you whether anything fired, which trigger, and what wrote. The cron debug saga from 2026-05-19 wouldn't have happened with this in place.
- **`last_scraped_at` is unreliable as a "did the scrape work?" signal.** The route still updates it even when zero posts were written. Real signal is `scrape_runs.posts_written > 0`. Open TODO to fix.
- **RLS-gated table reads can misfire under odd conditions.** Prefer `SECURITY DEFINER` RPC functions for boolean access checks (`is_super_admin()`, `is_project_member()`). The bug we hit in PR #50/51 wasn't reproducible from SQL simulation but the RPC switch made it consistent.
- **Audit at the same layer as the work.** `scrape_runs` is written from the route handler, NOT from the cron job or trigger. That way `?source=manual` curls + UI rescans are captured the same way as scheduled runs. One table, one query, full picture.
- **Trigger redundancy is cheap if dedup is in the route.** pg_cron + Vercel Cron + GitHub Actions all run; only one does the actual work. Costs nothing to have the others as failover.
