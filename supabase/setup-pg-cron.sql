-- One-time setup for pg_cron-driven scrape + report scheduling.
--
-- Run this once in Supabase Studio → SQL Editor AFTER migrations
-- 0008 and 0009 are applied AND after you've populated the two
-- pieces of config below. After this, Postgres itself triggers
-- /api/cron/daily and /api/cron/reports on schedule — no
-- dependence on Vercel Cron or GitHub Actions.
--
-- Vercel Cron + GitHub Actions can stay enabled as redundant
-- backups; the dedup check at the start of each cron route skips
-- subsequent runs within an hour of a successful one, so you
-- won't burn extra Apify credits.

-- ====================================================================
-- 1) STORE THE CRON SECRET IN VAULT
--    Supabase Studio → Project Settings → Vault → New secret
--      Name:  CRON_SECRET
--      Value: <the same value as your Vercel CRON_SECRET env var>
--    Click "Create secret". cron_secret() will now return it.
--
--    Sanity check (should print true):
--    select cron_secret() is not null as secret_populated;
-- ====================================================================

-- ====================================================================
-- 2) STORE THE PRODUCTION URL
--    Run this with your actual deployed URL (no trailing slash):
-- ====================================================================

insert into public.app_settings (key, value)
values ('app_url', 'https://YOUR-DOMAIN.vercel.app')
on conflict (key) do update set value = excluded.value, updated_at = now();

-- Sanity check:
select app_url() as configured_url;

-- ====================================================================
-- 3) SCHEDULE THE TWO CRON JOBS
--    Idempotent — `cron.schedule` upserts on job name, so running
--    this block again just refreshes the schedule.
-- ====================================================================

select cron.schedule(
  'alertnetwork-daily-scrape',
  '15 8 * * *', -- 08:15 UTC every day. 2 mins after Vercel cron's 08:13.
  $$
    select net.http_post(
      url := public.app_url() || '/api/cron/daily?source=pg-cron',
      headers := jsonb_build_object(
        'Authorization', 'Bearer ' || public.cron_secret(),
        'Content-Type',  'application/json'
      ),
      body := '{}'::jsonb,
      timeout_milliseconds := 300000
    );
  $$
);

select cron.schedule(
  'alertnetwork-daily-reports',
  '30 8 * * *', -- 08:30 UTC every day. After the scrape has landed.
  $$
    select net.http_post(
      url := public.app_url() || '/api/cron/reports?source=pg-cron',
      headers := jsonb_build_object(
        'Authorization', 'Bearer ' || public.cron_secret(),
        'Content-Type',  'application/json'
      ),
      body := '{}'::jsonb,
      timeout_milliseconds := 60000
    );
  $$
);

-- ====================================================================
-- 4) VERIFY
-- ====================================================================

-- List the active cron jobs:
select jobname, schedule, command from cron.job where jobname like 'alertnetwork-%';

-- (Optional) fire the daily scrape RIGHT NOW for a smoke test —
-- runs the same command the schedule will run:
-- select net.http_post(
--   url := public.app_url() || '/api/cron/daily?source=pg-cron',
--   headers := jsonb_build_object('Authorization', 'Bearer ' || public.cron_secret()),
--   body := '{}'::jsonb,
--   timeout_milliseconds := 300000
-- );

-- After ~3 mins, check that the run was recorded:
-- select id, source, status, accounts_total, posts_written, finished_at
-- from public.scrape_runs
-- order by started_at desc limit 5;

-- ====================================================================
-- TO REMOVE THE JOBS (if you ever migrate away from pg_cron):
--   select cron.unschedule('alertnetwork-daily-scrape');
--   select cron.unschedule('alertnetwork-daily-reports');
-- ====================================================================
