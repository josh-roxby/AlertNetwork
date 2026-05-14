# TODO

Project work list for AlertNetwork. Organised by feature group, then subtask. Format: `A-1-1` = group A, item 1, sub-item 1.

> When in doubt, pick from the top of an open group. Mark items complete inline as they ship.

## A. Global polish

- [ ] **A-1** Add inner horizontal padding to page containers (≈ 4px each side) so content breathes off the frame edge; nav and FAB must not shift.
- [ ] **A-2** Drawer "Manage tags & categories" CTA should anchor-scroll to `#tags-categories-section` on `/settings` (already exists as anchor — confirm scroll behaviour after navigation).
- [ ] **A-3** Header notifications bell opens a clean popover listing recent successful report sends.

## B. Dashboard

- [ ] **B-1** Expand the top stats grid with new tiles.
  - [ ] **B-1-1** Categories count tile.
  - [ ] **B-1-2** Live reports count tile.
  - [ ] **B-1-3** Full-width "Top health score" tile (with handle / score / category).
- [ ] **B-2** Add spacing between the hero stats section and the account-filter chip strip.
- [ ] **B-3** New "Featured reports" section, between stats and chip nav.
  - [ ] **B-3-1** Render up to 3 featured report tiles (compact ReportCard variant).
  - [ ] **B-3-2** Favouriting mechanism — `isFeatured` flag (or similar) on `Report`, toggleable from settings.

## C. Account UI

- [ ] **C-1** Remove yellow from health score colouring on cards and rows; use white only (still tone by band, but no accent on "excellent").
- [ ] **C-2** Add a legend explaining the metric abbreviations (`med` = median, `tot` = total views, `ER%` = engagement). Either inline tooltip per metric or a small legend strip above the list.
- [ ] **C-3** WoW / MoM key on the `% growth` value on account cards/rows so the relative window is obvious (text label or pill suffix).
- [ ] **C-4** "Add account" empty tile at the end of every account list (Dashboard, Accounts, anywhere accounts are listed).
- [ ] **C-5** Filter popover triggered by a circular filter button right of the search field on `/accounts`.
  - [ ] **C-5-1** Circular filter button + popover panel scaffold.
  - [ ] **C-5-2** Health-score range slider (0–100, dual-handle).
  - [ ] **C-5-3** Category multi-select checkboxes.

## D. Account detail (`/accounts/[id]`)

- [ ] **D-1** Route + page skeleton: `src/app/accounts/[id]/page.tsx`, server-render report-style; back chevron in header.
- [ ] **D-2** General-info block: handle, display name, category, tier, followers, created/first-logged.
- [ ] **D-3** "View on platform" button — external link to `account.url`.
- [ ] **D-4** Chips row: tier badge, category, status (Live / Paused).
- [ ] **D-5** Surface all tags inline (chip strip).
- [ ] **D-6** Charts with placeholder data — Views, Median Views, ER, Engagement, Health score over time. Use a single charting primitive shared across charts.
- [ ] **D-7** Date-range selector at the top of the charts area; selection updates all charts. Presets (7d / 30d / 90d / Custom).

## E. Reports list + detail

- [ ] **E-1** More data in the reports list grid — total accounts, last delivery status, next scheduled run.
- [ ] **E-2** PDF export action on Report Detail → Recent (stub the download until a real renderer exists).
- [ ] **E-3** Recent tab: below "Notable movers", show a section with all accounts in the report grouped by category, each with that group's stats (count, avg health, top score, reach).
- [ ] **E-4** Report Detail page — add a small "View" button (visible while the primary lower nav is occluded by the back chevron) that opens the **shareable view-only** report in a new tab (`F-1`).
- [ ] **E-5** Clicking any History row opens the historic report's view-only page (links to `F-1` with a `historyId` param).
- [ ] **E-6** Scope behaviour (`SettingsTab`):
  - [ ] **E-6-1** "By project" → selects all accounts implicitly.
  - [ ] **E-6-2** "By category" → multi-select category picker.
  - [ ] **E-6-3** "Specific" → multi-select account picker.

## F. Shareable / view-only report page

- [ ] **F-1** `src/app/reports/[id]/view/page.tsx` — view-only report render, **no app shell**, no FAB, no float nav. Just the content. Layout mirrors the "Recent" tab so it's familiar.
- [ ] **F-2** Password-protect option in Report Detail → Settings; gate the view-only route via simple cookie check (placeholder until auth lands).

## Pre-existing carry-overs

- [ ] **Remove placeholder data once the DB is wired up.** All mock content lives in `src/lib/placeholder-data.ts` and is gated by `PLACEHOLDER_MODE`. When Postgres + Apify ingestion are in place: delete `src/lib/placeholder-data.ts`, remove its imports from each page and the shell, drop the "Placeholder data" badge.
- [ ] **Turn auth back on.** `src/proxy.ts` is a no-op stub gated by `AUTH_ENABLED = false`. Implement the user model, sessions, and `/sign-in` route, flip `AUTH_ENABLED` to `true`, verify the matcher excludes the right public paths.
- [ ] Define the initial project scope and tech stack beyond the shell (Postgres schema, Apify integration, cron scheduler).
- [ ] Replace `README.md` with project-specific setup instructions.
- [ ] Set up CI / linting / test tooling.

## Done

- [x] Initialise repository (`main` as the only long-lived branch; feature branches PR straight to `main`).
- [x] `CLAUDE.md` with branching + working agreements.
- [x] Scaffold Next.js App Router shell with Dashboard / Accounts / Reports / Settings.
- [x] Migrate design system to v0.3 (Unbounded display, full token set, mixed radii, category palette, HealthScore band rule).
- [x] Mobile UI v0.4 — frame shell, float nav + FAB, sheets, new core components.
- [x] Mobile polish — drawer + sheet z-stacking fix.
- [x] Report Detail page (`/reports/[id]`) — Recent / History / Settings tabs.
- [x] Nudge bottom shell off the frame edge (FloatNav + FAB at 12px instead of 4px).
