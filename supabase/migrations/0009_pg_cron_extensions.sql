-- Enable the two Postgres extensions needed to run scheduled HTTP
-- calls from inside Supabase: pg_cron (the scheduler) + pg_net (the
-- HTTP client). Both are available on Supabase free tier.
--
-- The actual cron.schedule() calls live in supabase/setup-pg-cron.sql
-- — they need your production domain + CRON_SECRET filled in, so
-- they're not part of an auto-applied migration. Run that file once
-- in the Supabase SQL Editor (instructions in supabase/README.md).
--
-- Two helper functions read configuration:
--   cron_secret()  — pulls the bearer token from a Vault secret you
--                    populate via Supabase Studio → Project Settings
--                    → Vault.
--   app_url()      — pulls the production URL from a small
--                    app_settings table (one row, key='app_url').
--
-- Both helpers are SECURITY DEFINER so the pg_cron job (which runs
-- as the cron user) can read values it otherwise has no access to.

create extension if not exists pg_cron;
create extension if not exists pg_net;

-- A tiny config table for things like the production URL. Could be
-- a single Postgres setting via ALTER DATABASE, but a row in a
-- visible table is easier to update and inspect than a hidden
-- session-parameter ALTER.
create table public.app_settings (
  key        text primary key,
  value      text not null,
  updated_at timestamptz not null default now()
);

alter table public.app_settings enable row level security;

-- Super-admins can read settings; nobody writes from the browser
-- (manage values via Supabase Studio Table Editor).
create policy "app_settings select for super admin"
  on public.app_settings
  for select
  using (is_super_admin());

-- Helper: fetch the CRON_SECRET from Vault. The user populates
-- this themselves via Studio → Project Settings → Vault → New
-- secret, name = 'CRON_SECRET', value = the same secret as the
-- Vercel env var. Returns NULL until populated.
create or replace function public.cron_secret()
returns text
language sql
stable
security definer
set search_path = public, vault
as $$
  select decrypted_secret
  from vault.decrypted_secrets
  where name = 'CRON_SECRET'
  limit 1;
$$;

-- Helper: fetch the production URL from app_settings. Set with
--   insert into public.app_settings (key, value) values
--     ('app_url', 'https://your-domain.vercel.app');
create or replace function public.app_url()
returns text
language sql
stable
security definer
set search_path = public
as $$
  select value from public.app_settings where key = 'app_url' limit 1;
$$;
