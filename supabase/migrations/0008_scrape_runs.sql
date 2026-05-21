-- Audit table for every scrape invocation — daily cron, reports
-- cron, and manual UI rescans. One row per run, status pivots as
-- the run progresses (running → success | failed | partial |
-- skipped). The route handlers insert at the start, update at the
-- end.
--
-- Use cases:
--   - Confirm the daily cron actually fired today
--     (`select * from scrape_runs where started_at::date =
--     current_date and route = '/api/cron/daily'`)
--   - See which trigger source did the work — Vercel cron, GitHub
--     Actions, pg_cron, a manual curl, or the UI rescan button
--   - Diagnose runs that returned 200 but wrote zero posts (Apify
--     schema drift, all-handle-mismatch, etc.)
--
-- Visibility: SELECT-gated to super admins via the existing
-- is_super_admin() helper. Operational telemetry, not user data;
-- viewers / managers shouldn't see it.

create type public.scrape_run_source as enum (
  'vercel-cron',
  'github-actions',
  'pg-cron',
  'manual',
  'ui-rescan'
);

create type public.scrape_run_status as enum (
  'running',
  'success',
  'failed',
  'partial',
  'skipped'
);

create table public.scrape_runs (
  id              uuid primary key default gen_random_uuid(),
  source          scrape_run_source not null,
  route           text not null,
  started_at      timestamptz not null default now(),
  finished_at     timestamptz,
  duration_ms     integer,
  status          scrape_run_status not null default 'running',
  accounts_total  integer not null default 0,
  accounts_ok     integer not null default 0,
  posts_written   integer not null default 0,
  apify_items     integer not null default 0,
  error_message   text,
  notes           jsonb
);

create index scrape_runs_started_at_idx on public.scrape_runs (started_at desc);
create index scrape_runs_route_idx on public.scrape_runs (route, started_at desc);

alter table public.scrape_runs enable row level security;

create policy "scrape_runs select for super admin"
  on public.scrape_runs
  for select
  using (is_super_admin());

-- No INSERT / UPDATE policy — every write happens via the service
-- role from the cron / scrape route handlers, which bypasses RLS.
