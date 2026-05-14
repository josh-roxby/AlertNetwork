# TODO

Project work list for AlertNetwork. Organised by feature group, then subtask. Format: `A-1-1` = group A, item 1, sub-item 1.

> When in doubt, pick from the top of an open group. Mark items complete inline as they ship.

## G. General polish

- [ ] **G-1** Detect system colour-scheme on first launch (`prefers-color-scheme`). Light → light theme; dark → dark theme. Override persists once the user toggles.
- [ ] **G-2** Theme toggle in the header top-right next to the bell. Sun / moon icon, flips `data-theme` on `<html>`.
- [ ] **G-3** Back-button respects path history. Tapping the header back chevron from a sub-page (account detail, report detail) returns to the previous route in the stack, not a hard-coded parent. Falls back to the parent when there's no history.
- [ ] **G-4** Desktop responsive layout. Mobile is locked to a 480/640 frame; desktop needs to break out into a wider layout (sidebar, multi-column dashboard, table-like account list) at `lg+`. Don't break the mobile pattern.

## H. Dashboard

- [ ] **H-1** Categories tile shows total (canonical 8), not in-use / total.
- [ ] **H-2** Top Health tile gets a "View account" CTA → routes to `/accounts/[id]` for that top scorer.
- [ ] **H-3** Filter chips actually filter the dashboard account list. Click `Excellent` → only excellent rows visible. Click `Daily` → only daily-tier rows (until tier is removed in I-3, then drop these chips).

## I. Accounts

- [ ] **I-1** Edit button on the account detail page — opens a sheet to adjust tags and category.
- [ ] **I-2** Add Account sheet: the **Pick a category** dropdown actually works (placeholder value → selection), and includes a final "+ Add new category" option that opens the category-creation flow.
- [ ] **I-3** Remove the **tier** concept from accounts. All accounts log daily by default. Drop the `Tier` type / `account.tier` field / `TIER_LABEL` / tier segmented in Add Account / tier chips on rows and detail / tier filter chips on dashboard. Trend window simplifies to WoW for everyone.
- [ ] **I-4** Add Account sheet: tags input field for creation (comma-separated or chip-input style).

## J. Reports

- [ ] **J-1** Clean PDF/print layout for `/reports/[id]/view`. No UI chrome. Document-style header (Alert Network · Report title · sent-date · export-date). Lead with an overview table, then top performers, then accounts grouped by category. Fewer hard borders.
- [ ] **J-2** Yellow eye icon as the page-level primary action on Report Detail. Sits in the bottom-right where the FAB would be (FAB is hidden on sub-pages). Opens `/reports/[id]/view` in a new tab.
- [ ] **J-3** New Report sheet should match the Settings tab — include password toggle, scope picker (with the same conditional Category / Account multi-select sub-UI), cadence segmented (Weekly / Monthly only — see J-4).
- [ ] **J-4** Remove the **one-off** cadence option from edit and creation. Cadence is now Weekly or Monthly only.

## K. Settings

- [ ] **K-1** Daily log time row: info-only. Drop the chevron, no longer tappable.
- [ ] **K-2** Remove Weekly log day row entirely.
- [ ] **K-3** Keep Account limit row.
- [ ] **K-4** Members and Report viewers rows open a **Users modal** showing the user list (Members + Viewers sections). Reuses the existing Team sheet pattern.
- [ ] **K-5** Categories row opens a **Categories management modal**: add / edit / remove categories, with a colour picker constrained to the fixed 8-colour palette.
- [ ] **K-6** Tags row opens a **Tags drawer**: list, create, edit; each tag shows its current account count.
- [ ] **K-7** Remove the Slack alerts row.
- [ ] **K-8** Remove Archive project (keep Delete project).

## L. Navigation

- [ ] **L-1** Tapping the project name in nav opens a `/projects` page — list of projects with a create-new-project entry. Replaces the drawer's project card click target.
- [ ] **L-2** Persist last-active project across sessions (localStorage). On load, default to that project.
- [ ] **L-3** Category items in the drawer route to `/accounts?category=<id>` and auto-filter the page to that category.
- [ ] **L-4** Empty-projects state: if the user has no projects, the `/projects` page becomes a single hero tile with description + "Add project" button. Same screen is used when navigating to the projects page; if there are projects, list them.

## Carry-overs / longer initiatives (after G-L)

### M. Database (Supabase) — second-to-last

- [ ] **M-1** Provision a Supabase project.
- [ ] **M-2** SQL migrations for users / projects / accounts / snapshots / reports / report_history / categories / tags / report_recipients / project_members / report_password.
- [ ] **M-3** Auth + RLS. Middleware wrapper enforces every access check (per PRD). Replaces the localStorage password gate with HttpOnly cookie + server-side validation.

### N. Scrape & email function — last

- [ ] **N-1** Server-side hooks on the app that a GitHub CRON can call via authenticated API. Each fire checks every account on Supabase across projects and pulls the last 24 hours.
- [ ] **N-2** TikTok API wiring (await spec from user) — request structure, response normalisation into the snapshot schema, rate-limit handling.
- [ ] **N-3** Report API endpoint that the same daily 08:00 cron hits — iterates all reports across users, decides which to send today (weekly → Monday; monthly → 1st), renders, dispatches via Gmail service account.

### O. GitHub CRON — last

- [ ] **O-1** GitHub Action with `schedule:` cron at 08:00 GMT daily, hitting `N-1` and `N-3` with a shared secret. Documented in a runbook.

## Pre-existing carry-overs (now mostly covered above)

- [ ] **Remove placeholder data once the DB is wired up.** All mock content lives in `src/lib/placeholder-data.ts` and is gated by `PLACEHOLDER_MODE`. When Postgres + Apify ingestion are in place: delete `src/lib/placeholder-data.ts`, remove its imports from each page and the shell, drop the "Placeholder data" badge.
- [ ] **Turn auth back on.** `src/proxy.ts` is a no-op stub gated by `AUTH_ENABLED = false`. Implement the user model, sessions, and `/sign-in` route, flip `AUTH_ENABLED` to `true`, verify the matcher excludes the right public paths. Folds into **M-3**.
- [ ] Replace `README.md` with project-specific setup instructions.
- [ ] Set up CI / linting / test tooling.

## Done

- [x] Repo bootstrap, branching model, scaffold, design system v0.3.
- [x] Mobile UI v0.4 — frame shell, float nav + FAB, sheets, core components.
- [x] Drawer + sheet z-stacking fix.
- [x] Report Detail page (Recent / History / Settings tabs).
- [x] **A** Global polish — page padding, drawer anchor scroll, notifications popover.
- [x] **B** Dashboard expansion — new stat tiles, featured reports section + star toggle.
- [x] **C** Account UI — health colour neutralised, metric legend + Med/Tot/ER labels, WoW/MoM key, AddAccount tile, filter sheet.
- [x] **D** Account detail page — `/accounts/[id]` with Recharts trends + range selector.
- [x] **E** Reports list/detail enhancements + view-only stub.
- [x] **F** Shareable view-only polish + per-report password gate.
