# TODO

Active work list for AlertNetwork. Sections in priority order: things to ship, things to consider, things to come back to.

For session-by-session history (decision context, why things were built the way they were), see `SESSION_LOG.md`. For the codebase shape + architectural conventions, see `CLAUDE.md`.

---

## Status snapshot

Everything below the snapshot is open work. Anything not listed is shipped.

| Area | State |
|---|---|
| Apify daily scrape | ✅ pg_cron + Vercel + GH Actions, dedup'd, audited |
| Daily / weekly reports | ✅ Cron-driven, snapshot frozen, email via Gmail SMTP |
| Multi-user auth | ✅ Super admin / owner / manager / viewer tiers |
| Invite-only sign-up | ✅ Auth callback rejects non-invitees |
| Backfill (1-12 months) | ✅ Super-admin only, Manage Project sheet |
| Email branding | ✅ Brand-yellow report CTA + branded auth templates ready to paste in |
| `scrape_runs` audit | ✅ Every cron + manual run lands a row |
| Chart drill-down | ✅ Click any chart node → Sheet with that day's posts (in-app surfaces) |
| PWA install | ✅ Manifest + 192/512 icons + maskable variants + pass-through SW; install prompt fires on Chrome desktop / Android |
| Brand mark | ✅ SVG recreation in header, black-on-white favicon, PWA icon, apple touch icon |
| Project creation fix | ✅ Server-side `/api/projects/create` — bypasses the misfiring RLS check |

---

## Open follow-ups (small, ready to start any time)

These are concrete fixes / improvements that came out of the work in `SESSION_LOG.md`. Each is ~1 PR.

- [ ] **`last_scraped_at` shouldn't lie.** The daily cron currently bumps `accounts.last_scraped_at` even when `upsertPosts` writes 0 posts for that account. Caused the entire May-19 debug saga. Move the bump to only when `written > 0`. Surface "stale scrape" warnings on the account detail page when `last_scraped_at` is older than 36h.
- [ ] **Followers sync on every scrape.** `accounts.followers` exists but the cron never updates it. Apify returns `channel.followers` on each post payload — pluck it from any post in the bucket on each scrape, write it to the account row. Unlocks better health-scoring later (ratio of views to followers).
- [ ] **Avatar / display_name sync.** Same as followers — Apify returns `channel.name` and `channel.avatar`. Storing the avatar URL would let the dashboard show a profile pic next to each handle. Display name is already a column, just isn't being populated.
- [ ] **Slack/Discord webhook on cron failure.** When `scrape_runs.status = 'failed'` lands, hit a webhook URL. Means cron breakage shows up in your phone notifications, not via you noticing stale dashboard data 2 days later. Two-line addition in `finishScrapeRun`.
- [ ] **CSV export on report detail.** Manager/owner asks for raw data dump — currently no path. Add a "Download CSV" button on the report Recent tab that includes the same data the snapshot carries. ~30 LOC.
- [ ] **Project-tile metrics row on `/projects`** *(confirmed by user, ready)*. Each project card grows a small horizontal stats row: total views (30d), avg ER, accounts count, MoM delta on views. Same `AccountStatsBlock` pattern but project-level. Helps you scan multi-project health from the project switcher.
- [ ] **Diagnose & fix the RLS WITH CHECK misfire on projects.** Discovered while debugging "couldn't create project". Policy `(is_super_admin() AND owner_id = auth.uid())` evaluates to TRUE outside the policy but rejects INSERTs at policy-evaluation time. Worked around by moving creates to `/api/projects/create` (server-side, service-role). Still worth understanding — if it bites another table later we want to know why. Probable causes to investigate: SECURITY DEFINER function semantics in policy expressions, JWT GUC visibility differences during INSERT vs SELECT, or a Supabase version quirk.
- [ ] **Drop the actual logo PNGs in `public/`.** User provided two logo files (yellow/black + white/black). Currently shipping an SVG recreation of the design (PR #62) — close but not pixel-identical. When ready, drop the white-on-black PNG at `public/logo.png` and swap four references (`icon.tsx`, `icon2.tsx`, `apple-icon.tsx`, `BrandMark`) to use `next/image` instead.

---

## In consideration (suggestions, awaiting decision)

Categorised. Each item has my honest take so you can pick — none are "you must do this".

### Reporting / UX

- **Server-side PDF generation.** Currently the share view uses the browser's "Print to PDF". Server-rendered PDFs (Browserless / Puppeteer-on-Render / similar) would let us attach the PDF directly to the report email. Bigger lift (new infra), and the existing print pipeline mostly works — only worth it if recipients actually ask for attached PDFs.
- **Trend annotations.** Mark events on the daily-views chart — "campaign X launched", "first post over 100k". Stored as a small `account_annotations(account_id, date, label)` table. Owner adds them from the account detail page. Makes the trend graphs much more interpretable. Medium lift.
- **Inline history sparkline on report detail.** Right now you open the History tab to see past sends. Could show the last 5 sends as a tiny sparkline on the Recent tab — quick "are we trending up or down" without clicking through. Small.
- **Custom subject line per report.** Owner sets a template (`"{name} weekly — {date}"`) that overrides the default. Small. Worth it if you start running many reports.
- **Per-account drill-down link in email.** Each account row in the dense block could be a link to `/accounts/[id]` in the app. Already partly possible (the View Online link goes to the report view), but a direct deep-link is nicer. Tiny.

### Security / Hardening

- **Rate-limit `/api/reports/[id]/unlock`.** Password unlock is the one guess-able endpoint in the app. Add a basic IP-based rate limiter (5 attempts per 10min). Without this, a determined attacker can brute-force the password.
- **2FA for super-admins.** Supabase Auth supports TOTP. Make it required for any user in `super_admins`. Low effort if Supabase exposes a `require_mfa` flag we can flip.
- **Project mutation audit log.** `scrape_runs` only captures scrapes. A second table `project_audit_log` would record account deletions, member adds/removes, report deletions, password changes. Lets you answer "who deleted that account?" — currently no path.
- **Secret rotation runbook.** No documented procedure for rotating SMTP / Apify / CRON secrets. One short doc in `supabase/README.md` covering the steps + how to update the Vault secret used by pg_cron.
- **CSP + security headers via `next.config.ts`.** None currently set. Cheap hardening — `frame-ancestors 'none'`, `strict-transport-security`, etc. ~15 lines.
- **Verify Resend domain.** Currently invites send from `onboarding@resend.dev`. Once `exhale.studio` is verified in Resend, swap to `noreply@exhale.studio` for the from-address. Better deliverability + brand consistency. The change is one field in Supabase Studio → SMTP Settings.

### Data quality

- **Detect deleted/private accounts.** If Apify returns zero items for an account 3 days in a row, mark the account as `status='stale'`. Surface a small warning on the account list. Tiny code change once we trust the audit.
- **Posts.deleted_at column.** If a previously-scraped post stops appearing in Apify results for N days, soft-delete it. Right now deleted TikToks just sit in the DB indefinitely with old metrics. Medium lift.
- **Health-score weighting revisit.** Earlier session flagged that the score didn't match intuition (high-volume / lower-ER accounts undervalued). The work-up I did then proposed a 4-axis model with log-scaled reach. Worth revisiting once the data quality issues above are sorted.

### Use-case extensions

- **Instagram + YouTube support.** Apify has comparable scrapers. The architecture is already platform-agnostic at the DB layer (`accounts.platform`) — we'd add new actor configs, new mappers in `src/lib/apify/`, and a platform field on the Add Account sheet. Medium lift but high value if the user's actual workflow spans multiple platforms.
- **Comparison reports.** "Q4 vs Q3" or "current month vs last month" as a dedicated report type. The data is there — just a different snapshot shape. Aligns with the project-tile MoM idea above.
- **Public dashboard URL per project.** A read-only public-facing page showing top-level stats for a project. Useful for client-facing reporting without giving them an auth account. Lower priority but interesting.

### Operational

- **`scrape_runs` retention.** Table will grow without bound. Could archive runs older than 90d to JSONB in a `scrape_runs_archive` table. Worry about this around the 6-month mark.
- **CI pipeline.** GitHub Actions running `npm run build` + `npm run lint` + `npm run typecheck` on every PR. Local builds are clean today, but a deploy-blocking gate is worth it.
- **README rewrite.** Repo `README.md` is still the create-next-app default. Should describe setup steps, env vars, the trigger model, and link to `CLAUDE.md` / `SESSION_LOG.md` / `supabase/README.md`.

---

## Longer-term / Maybe never

Things that are interesting but not actionable without a clear business need.

- **Billing / multi-tenant SaaS.** If AlertNetwork goes external, Stripe + per-org isolation + usage metering matter. Until then, single-tenant is right.
- **Mobile native app.** The web app is already mobile-first (480px frame). Native would only help with push notifications.
- **AI-driven insights.** Auto-generated commentary on the report ("Account X spiked 250% this week because of post Y"). Cool demo, marginal utility, and adds AI costs to every send. Pass for now.
- **Real-time updates.** Supabase Realtime could push new posts to the dashboard as the cron writes them. Nice-to-have for a once-a-day workflow; only matters if scrapes become more frequent.

---

## Notes for future-me

- Anything that touches RLS or auth — read the relevant entry in `SESSION_LOG.md` first. The non-obvious decisions (RPC vs direct table reads, fail-open on auth callback, owner-explicit checks in service-role routes) have their context there.
- New migrations: number them sequentially, apply via Supabase MCP if available, otherwise tell the user to paste into Studio. Always update `supabase/README.md` if the schema changes anything user-facing.
- New API routes that use `supabaseAdmin()`: always add an explicit owner / super-admin check before the admin client. RLS doesn't gate service-role calls.
- `CLAUDE.md` is canonical for "how to work in this repo". This file is the next-actions board. `SESSION_LOG.md` is the why behind the what.
