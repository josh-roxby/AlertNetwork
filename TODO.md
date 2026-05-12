# TODO

Global todo list for the AlertNetwork project. Add new items as they come up and check them off as they are completed.

## Open

- [ ] **Remove placeholder data once the database is wired up.** All mock content lives in `src/lib/placeholder-data.ts` and is gated by the `PLACEHOLDER_MODE` flag exported from that file. When Postgres + Apify ingestion are in place: delete `src/lib/placeholder-data.ts`, remove its imports from each page (`dashboard`, `accounts`, `projects`, `reports`) and from `src/components/top-bar.tsx`, and drop the "Placeholder data" badge in the top bar.
- [ ] **Turn auth back on.** `src/proxy.ts` is a no-op stub gated by `AUTH_ENABLED = false` so the shell can be previewed without sign-in. Implement the user model, sessions, and `/sign-in` route, then flip `AUTH_ENABLED` to `true` and verify the matcher excludes the right public paths.
- [ ] Define the initial project scope and tech stack beyond the shell (Postgres schema, Apify integration, cron scheduler)
- [ ] Replace `README.md` with project-specific setup instructions
- [ ] Set up CI/linting/test tooling

## Done

- [x] Initialize repository with `dev` as the default branch and `main` for production
- [x] Add `CLAUDE.md` with branching and working agreements
- [x] Scaffold Next.js App Router shell with dashboard, accounts, projects, reports pages
- [x] Migrate design system to v0.3 (Unbounded display, full token set, mixed radii, category palette, TierBadge / CategoryTag / HealthScore bands)
