# CLAUDE.md

Guidance for Claude Code working in the AlertNetwork repository. Read this before doing anything else in a new session.

## TL;DR

- Next.js 16 App Router, TypeScript, Tailwind v4, Recharts. `src/` layout. App Router routes under `src/app`.
- All UI scope (Groups A–L from the voice-note todo lists) is on `main`. Remaining work is **M** (Supabase), **N** (scrape + email), **O** (GitHub cron). See `TODO.md`.
- Mobile-first by design. Mobile shell renders below `lg:`; `DesktopShell` (sidebar + top bar) renders at `lg:` and up. Both shells are in the DOM and toggled via Tailwind responsive classes — no JS switch.
- Placeholder data and a no-op auth stub gate the back end. Both are clearly flagged and ready for the real implementation in M.

## Branching model

- `main` is the only long-lived branch. Vercel deploys directly from it.
- Day-to-day work happens on short-lived feature branches off `main`.
- Branches Claude creates **must** use the `claude/<short-name>` prefix — the local git proxy this session runs through only accepts pushes to `claude/*` (HTTP 403 otherwise). Direct push to `main` is blocked.
- Pull requests target `main` directly. Squash or merge-commit; delete the feature branch after merge.
- Do not commit directly to `main`. All changes land via PR.

> A separate `dev` branch existed early on. It was removed because Vercel auto-deploys from `main`, there is no staging environment, and the second PR per feature was pure ceremony.

## Working agreements

- Track outstanding work in `TODO.md` at the repo root. Mark items complete inline as they ship.
- Keep commit messages short and descriptive; explain the "why" when it is not obvious from the diff.
- Prefer editing existing files over creating new ones unless the task requires a new file.
- One coherent feature group per PR (≈100–1000 lines of diff is fine). Rolling six rounds in one PR was tried; smaller is reviewable.
- After each PR opens, the user merges it before the next round starts. Don't stack branches.

## Workflow (Claude → PR)

1. `git checkout main && git pull origin main`
2. `git checkout -b claude/<short-name>`
3. Build the feature. Use the `TodoWrite` tool to track sub-items.
4. `npm run build` and `npm run lint` must pass before commit. `npm run typecheck` exists too.
5. Run the dev server (`PORT=3000 npm run dev` in the background) and `curl` the affected routes for a smoke test before committing.
6. Commit with a descriptive HEREDOC message, push.
7. Open a PR to `main` via the GitHub MCP (`mcp__github__create_pull_request`). Subscribe to PR activity (`mcp__github__subscribe_pr_activity`) and check CI / review comments.
8. The user merges. Sync `main`, repeat.

## Architecture map

### Shell

`src/components/shell.tsx` is the entry point. It wraps everything in `ShellProvider` (state for sheets, drawer, active project) and renders two parallel shells:

- **Mobile shell** (`lg:hidden`) — a 480px-max frame with `Header` (52px), absolute `<main>` scroll area, `FloatNav` (4 square buttons bottom-left), `Fab` (per-page action bottom-right), and `Drawer` (hamburger).
- **Desktop shell** (`hidden lg:flex`) — `DesktopShell` component with a 60px top bar (brand + page title + project switcher + theme/bell/user) and a 240px persistent left sidebar (workspace nav + categories + user footer). Main is `max-w-[1100px]` scrollable.

Both shells render the same `{children}` (the active page). Sheets are mounted at the root and overlay either layout identically.

**View-only routes** (`/reports/[id]/view`) bypass both shells via a regex check in `FrameInner` and render bare so the document feel is clean for sharing / printing.

### Shell context

`src/components/shell-context.tsx` owns:

- `drawerOpen` (mobile drawer)
- `sheet: SheetState` — a discriminated union:
  ```ts
  | null
  | { kind: "addAccount" }
  | { kind: "newReport" }
  | { kind: "newProject" }
  | { kind: "manageTeam" }
  | { kind: "categories" }
  | { kind: "tags" }
  | { kind: "editAccount"; accountId: string }
  ```
- `activeProjectId` — persisted to `localStorage('anw-active-project')`; default = `placeholderProjects[0]?.id`. Exposed via `useActiveProject()` helper.

Mount new sheets in `shell.tsx` and add the kind to the union.

### Pages

| Route | Page | Notes |
|---|---|---|
| `/` | redirect to `/dashboard` |  |
| `/dashboard` | client | Top Health hero, 2×3 stats, Featured Reports, account list with filter chips |
| `/accounts` | client | Search + circular filter button → `AccountsFilterSheet`; chip strip; `useSearchParams` reads `?category=<id>` for drawer deep-links. Wrapped in `<Suspense>` for static prerender |
| `/accounts/[id]` | server → `AccountDetail` (client) | Recharts trends, 7d/30d/90d range, Edit button opens `EditAccountSheet` |
| `/projects` | client | Project list + ACTIVE marker; switching sets `activeProjectId`. Empty state if no projects; `?empty=1` to preview |
| `/reports` | server | List of `ReportCard`s |
| `/reports/[id]` | server → `ReportDetail` (client) | Recent / History / Settings tabs |
| `/reports/[id]/view` | server → `PasswordGate` or `ReportView` | View-only, no shell. Document layout, print-friendly |
| `/settings` | client | Sectioned `SettingsRow`s; rows open management sheets |

### Placeholder data

Everything reads from `src/lib/placeholder-data.ts`. The module exports:

- Typed entities: `Account`, `Category`, `Project`, `Report`, `ReportHistoryEntry`, `AccountSeriesPoint`.
- Arrays: `placeholderAccounts` (8 acc_*), `placeholderProjects` (3 prj_*), `placeholderReports` (3 rep_*). Stable IDs.
- Helpers: `findAccount(id)`, `findReport(id)`, `accountsForReport(report)`, `accountTimeSeries(account, days=90)`.
- `PLACEHOLDER_MODE = true` flag. The top-bar / drawer reads this to show the "Placeholder data" badge.
- `rep_01` has `password: "clientx"` so the password gate is testable.

Time series is **deterministic per account** — mulberry32 seeded by `account.id`. Charts stay stable across renders, but every account has a slightly different shape.

### Theming

Inline pre-paint script in `src/app/layout.tsx` reads `localStorage('anw-theme')` (or `prefers-color-scheme`) and sets `data-theme` on `<html>` **before React hydrates**. Light users never see a dark flash. The `ThemeToggle` component (header top-right) flips the attribute and persists.

All colours are CSS vars in `globals.css`. Both `[data-theme="dark"]` (default) and `[data-theme="light"]` are defined. Tokens exposed to Tailwind v4 via `@theme inline`.

### Auth stub

`src/proxy.ts` is a no-op proxy gated by `AUTH_ENABLED = false`. When M-3 lands, flip the flag and the proxy starts enforcing. Note: the file was renamed from `middleware.ts` → `proxy.ts` per Next 16's convention.

The view-only page's password gate (`src/components/password-gate.tsx`) is preview-only — it stores the unlock flag in `localStorage`. Real implementation needs server-side validation + HttpOnly cookie.

## Preferred patterns

### Client vs server components

- Default to **server** components. Pages stay server unless they need `useState` / `useEffect` / event handlers / shell context.
- Server-rendered pages can wrap a single client island (`<AccountDetail>`, `<ReportDetail>`, `<PasswordGate>`) and pass props in.
- `"use client"` only at the file that needs it; downstream stays client by inheritance.

### Sheets and modals

- Every modal-style UI is a `<Sheet>` (`src/components/sheet.tsx`) — bottom-anchored on phones, centred from `sm+`. Drag handle, sticky header + footer, max-height 92dvh.
- To add a new sheet:
  1. Add the kind to `SheetState` in `shell-context.tsx`.
  2. Build the component in `src/components/sheets/<name>-sheet.tsx`.
  3. Mount it in `shell.tsx` keyed off `sheet?.kind === "..."`.
  4. Dispatch with `openSheet({ kind: "...", ... })`.

### Overlay primitives

`src/components/overlay.tsx` exports `useEscape`, `useScrollLock`, `Backdrop`. Use these inside any new sheet / drawer / popover so behaviour stays consistent (Escape closes, body scroll locks, backdrop dismisses).

### URL state

`useSearchParams()` requires a `<Suspense>` boundary for static prerender. Pattern:

```tsx
export default function Page() {
  return (
    <Suspense fallback={null}>
      <PageView />
    </Suspense>
  );
}

function PageView() {
  const sp = useSearchParams();
  // ...
}
```

### Local persistence

- `anw-theme` — `'light' | 'dark'`
- `anw-active-project` — project id
- `anw-report-unlock-<reportId>` — password gate unlock flag

If you add another key, prefix `anw-`.

### Tap feedback

Helper classes in `globals.css`:
- `tap-btn` — 0.96 scale on `:active` (buttons, chips)
- `tap-tab` — 0.92 scale (float-nav buttons)
- `tap-fab` — 0.94 scale (FAB)
- `tap-row` — 0.99 scale + bg shift (list rows, cards)

Add these to every interactive surface so feel stays consistent. All animations respect `prefers-reduced-motion` globally.

### Charts

Recharts only. Use the design tokens for colours (`var(--ink)`, `var(--accent)`, `var(--info)`, `var(--good)`). See `src/components/account-detail.tsx` for the canonical pattern (ResponsiveContainer + Line/Area + custom `ChartTooltip`).

## Gotchas

### `react-hooks/set-state-in-effect`

Lint rule fires on `useEffect(() => setState(...), [])` patterns. The cases where it's legitimate (and should be disabled with a comment) are:

1. **Bootstrap sync from `localStorage`** — has to run after mount because storage is undefined on the server. Example: `theme-toggle.tsx`, `password-gate.tsx`, `shell-context.tsx`.
2. **Re-seeding form state on prop change** — like `EditAccountSheet` re-syncing when a new `accountId` comes in.

Always add a comment explaining the cascade is intentional. Don't blanket-disable.

### `useMemo` with `[...arr].sort()`

React Compiler can't preserve memoisation through a spread + sort. Just compute inline:

```tsx
// ❌ Lint complains
const top = useMemo(() => [...accounts].sort(...).slice(0, 4), [accounts]);

// ✅ Compute inline — these arrays are tiny anyway
const top = [...accounts].sort((a, b) => b.healthScore - a.healthScore).slice(0, 4);
```

### `useMemo(fn, [])` shape

First arg must be an inline arrow expression — `useMemo(recentSends, [])` lints, `useMemo(() => recentSends(), [])` doesn't.

### Mobile shell vs desktop shell

Don't put per-page chrome (page title, action buttons) inside the **shell**. The shell only provides outer chrome (header, nav, FAB). Page content owns its own header block / actions. This keeps both shells working without per-page conditionals.

### Tailwind v4 colour tokens

Colour utilities like `bg-ink`, `text-accent`, `border-line-2` are generated from `@theme inline` in `globals.css`. If you add a new colour, declare it there too. Arbitrary values (`bg-[#xxx]`) are fine for one-offs but prefer tokens.

### Mixed radius rule

Structural surfaces (cards, sheets) use `rounded-md` / `rounded-lg`. Pills / chips / badges / FAB use `rounded-full` or `rounded-xs` (4px). Don't blend — see the design spec for the canonical pattern.

### Print styles

`/reports/[id]/view` is the only print-relevant route. Anything with `data-print="hide"` is dropped from the printed page (`@media print` rules in `globals.css`). Print also forces a light palette regardless of theme.

## File map

```
src/
├─ app/
│  ├─ layout.tsx                # Root layout, theme bootstrap script, fonts
│  ├─ globals.css               # All tokens, type scale, animations, print styles
│  ├─ page.tsx                  # Redirects to /dashboard
│  ├─ dashboard/page.tsx        # Client
│  ├─ accounts/
│  │  ├─ page.tsx               # Client + Suspense
│  │  └─ [id]/page.tsx          # Server → AccountDetail
│  ├─ projects/page.tsx         # Client + Suspense
│  ├─ reports/
│  │  ├─ page.tsx               # Server
│  │  └─ [id]/
│  │     ├─ page.tsx            # Server → ReportDetail
│  │     └─ view/page.tsx       # Server → PasswordGate or ReportView
│  └─ settings/page.tsx         # Client
├─ components/
│  ├─ shell.tsx                 # Top-level layout switcher
│  ├─ shell-context.tsx         # Drawer + sheet + active-project state
│  ├─ header.tsx                # Mobile header (lg:hidden)
│  ├─ float-nav.tsx             # Mobile bottom nav (lg:hidden)
│  ├─ fab.tsx                   # Per-page FAB (lg:hidden)
│  ├─ drawer.tsx                # Mobile hamburger drawer (modal)
│  ├─ desktop-shell.tsx         # lg+ top bar + sidebar
│  ├─ theme-toggle.tsx          # Sun/moon icon
│  ├─ notifications-menu.tsx    # Bell popover
│  ├─ anchor-scroller.tsx       # Hash-anchor scroll on settings
│  ├─ icons.tsx                 # All inline SVG icons
│  ├─ overlay.tsx               # useEscape / useScrollLock / Backdrop
│  ├─ sheet.tsx                 # Sheet primitive
│  ├─ sheets.tsx                # AddAccountSheet, TeamSheet
│  ├─ sheets/
│  │  ├─ new-report-sheet.tsx
│  │  ├─ new-project-sheet.tsx
│  │  ├─ categories-sheet.tsx
│  │  ├─ tags-sheet.tsx
│  │  └─ edit-account-sheet.tsx
│  ├─ scope-control.tsx         # Shared scope picker (Project / Category / Specific)
│  ├─ account-row.tsx           # Signature 2-line account list item
│  ├─ account-detail.tsx        # /accounts/[id] body with charts
│  ├─ report-detail.tsx         # /reports/[id] body with tabs
│  ├─ report-view.tsx           # /reports/[id]/view document body
│  ├─ report-card.tsx           # Reports list card
│  ├─ password-gate.tsx         # Wraps ReportView when password set
│  ├─ stats-grid.tsx            # 2x2 / 2x3 stat grid
│  ├─ filter-strip.tsx          # Horizontal scroll chip row
│  ├─ chip.tsx                  # Chip + ChipDivider
│  ├─ tab-nav.tsx               # Underlined tabs
│  ├─ accounts-filter-sheet.tsx # Range slider + category multi-select
│  ├─ add-account-tile.tsx      # Dashed "Add account" tile at end of lists
│  ├─ metric-legend.tsx         # Med/Tot/ER legend
│  ├─ featured-reports.tsx      # Dashboard featured-reports section + Star icon
│  ├─ health-score.tsx          # HealthScore + TrendArrow + healthBand
│  └─ page-header.tsx           # (legacy — most pages inline their own header now)
└─ lib/
   ├─ placeholder-data.ts       # Everything mock; PLACEHOLDER_MODE gate
   └─ format.ts                 # compactNumber / percent / relativeDate
```

## Session-history note

This handoff document is the consolidated outcome of:

- **Initial scaffold + v0.3 design system** (Next App Router shell, Unbounded display font, full token set, dark theme).
- **Mobile UI v0.4 rewrite** (frame architecture, floating nav, FAB, sheets, new component vocabulary).
- **A–F voice-note rounds**: global polish, dashboard expansion, account UI fixes, account detail with charts, reports enhancements, shareable view-only page.
- **G–L voice-note rounds**: theme toggle + settings cleanups, tier removal + dashboard interactivity, management sheets, navigation + projects, reports polish (PDF, view FAB, NewReport parity), back-history + desktop layout.

Each round is one merged PR — see `TODO.md` Status snapshot for the PR numbers. The placeholder data and the no-op auth stub are the cut-line between UI and back end; **M** is the bridge.
