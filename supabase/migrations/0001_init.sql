-- =====================================================================
-- AlertNetwork — initial schema
--
-- Tenancy model: single owner per project. Every queryable row traces
-- back to projects.owner_id = auth.uid() via foreign keys; RLS policies
-- below enforce this on the wire.
--
-- Auth: Supabase Auth (magic link) provides the auth.users table. We
-- don't define our own users table.
--
-- Run via Supabase SQL Editor or `supabase db push` from the repo root
-- if you set up the Supabase CLI.
-- =====================================================================

set search_path to public;

-- ---------------------------------------------------------------------
-- updated_at helper
-- ---------------------------------------------------------------------
create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

-- ---------------------------------------------------------------------
-- projects
-- ---------------------------------------------------------------------
create table public.projects (
  id          uuid primary key default gen_random_uuid(),
  owner_id    uuid not null references auth.users(id) on delete cascade,
  name        text not null,
  description text,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

create index projects_owner_id_idx on public.projects (owner_id);

create trigger projects_set_updated_at
  before update on public.projects
  for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------------
-- categories
-- ---------------------------------------------------------------------
create table public.categories (
  id          uuid primary key default gen_random_uuid(),
  project_id  uuid not null references public.projects(id) on delete cascade,
  label       text not null,
  palette_id  text not null,
  created_at  timestamptz not null default now()
);

create index categories_project_id_idx on public.categories (project_id);

-- ---------------------------------------------------------------------
-- tags
-- ---------------------------------------------------------------------
create table public.tags (
  id          uuid primary key default gen_random_uuid(),
  project_id  uuid not null references public.projects(id) on delete cascade,
  label       text not null,
  created_at  timestamptz not null default now()
);

create index tags_project_id_idx on public.tags (project_id);

-- ---------------------------------------------------------------------
-- accounts
-- ---------------------------------------------------------------------
create table public.accounts (
  id              uuid primary key default gen_random_uuid(),
  project_id      uuid not null references public.projects(id) on delete cascade,
  handle          text not null,
  display_name    text,
  platform        text not null default 'tiktok',
  url             text not null,
  category_id     uuid references public.categories(id) on delete set null,
  followers       integer,
  last_logged_at  timestamptz,
  last_scraped_at timestamptz,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);

create index accounts_project_id_idx on public.accounts (project_id);
create index accounts_category_id_idx on public.accounts (category_id);

create trigger accounts_set_updated_at
  before update on public.accounts
  for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------------
-- account_tags (m2m)
-- ---------------------------------------------------------------------
create table public.account_tags (
  account_id uuid not null references public.accounts(id) on delete cascade,
  tag_id     uuid not null references public.tags(id) on delete cascade,
  primary key (account_id, tag_id)
);

create index account_tags_tag_id_idx on public.account_tags (tag_id);

-- ---------------------------------------------------------------------
-- posts — upsert target for the daily TikTok scrape
-- ---------------------------------------------------------------------
create table public.posts (
  id                uuid primary key default gen_random_uuid(),
  account_id        uuid not null references public.accounts(id) on delete cascade,
  platform_post_id  text not null,
  posted_at         timestamptz not null,
  url               text,
  caption           text,
  views             bigint not null default 0,
  likes             bigint not null default 0,
  comments          bigint not null default 0,
  shares            bigint not null default 0,
  saves             bigint not null default 0,
  raw               jsonb not null,
  first_seen_at     timestamptz not null default now(),
  last_scraped_at   timestamptz not null default now(),
  updated_at        timestamptz not null default now(),
  unique (account_id, platform_post_id)
);

create index posts_account_posted_idx on public.posts (account_id, posted_at desc);

create trigger posts_set_updated_at
  before update on public.posts
  for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------------
-- reports
-- ---------------------------------------------------------------------
create table public.reports (
  id            uuid primary key default gen_random_uuid(),
  project_id    uuid not null references public.projects(id) on delete cascade,
  name          text not null,
  description   text,
  cadence       text not null check (cadence in ('weekly', 'monthly')),
  schedule      text,
  scope_kind    text not null check (scope_kind in ('project', 'category', 'account')),
  status        text not null default 'active',
  is_featured   boolean not null default false,
  password_hash text,
  last_sent_at  timestamptz,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);

create index reports_project_id_idx on public.reports (project_id);

create trigger reports_set_updated_at
  before update on public.reports
  for each row execute function public.set_updated_at();

create table public.report_accounts (
  report_id  uuid not null references public.reports(id) on delete cascade,
  account_id uuid not null references public.accounts(id) on delete cascade,
  primary key (report_id, account_id)
);

create table public.report_categories (
  report_id   uuid not null references public.reports(id) on delete cascade,
  category_id uuid not null references public.categories(id) on delete cascade,
  primary key (report_id, category_id)
);

create table public.report_recipients (
  id        uuid primary key default gen_random_uuid(),
  report_id uuid not null references public.reports(id) on delete cascade,
  email     text not null
);

create index report_recipients_report_id_idx on public.report_recipients (report_id);

create table public.report_history (
  id         uuid primary key default gen_random_uuid(),
  report_id  uuid not null references public.reports(id) on delete cascade,
  sent_at    timestamptz not null default now(),
  status     text not null,
  recipients integer not null default 0,
  accounts   integer not null default 0
);

create index report_history_report_id_idx on public.report_history (report_id, sent_at desc);

-- =====================================================================
-- Row-Level Security
--
-- Single-owner model: every check resolves to
--   project.owner_id = auth.uid()
-- via the appropriate foreign key chain. Service role bypasses RLS so
-- the cron path uses the service-role client.
-- =====================================================================

alter table public.projects          enable row level security;
alter table public.categories        enable row level security;
alter table public.tags              enable row level security;
alter table public.accounts          enable row level security;
alter table public.account_tags      enable row level security;
alter table public.posts             enable row level security;
alter table public.reports           enable row level security;
alter table public.report_accounts   enable row level security;
alter table public.report_categories enable row level security;
alter table public.report_recipients enable row level security;
alter table public.report_history    enable row level security;

create policy "projects owner full access"
  on public.projects
  for all
  using (owner_id = auth.uid())
  with check (owner_id = auth.uid());

create policy "categories owner via project"
  on public.categories
  for all
  using (project_id in (select id from public.projects where owner_id = auth.uid()))
  with check (project_id in (select id from public.projects where owner_id = auth.uid()));

create policy "tags owner via project"
  on public.tags
  for all
  using (project_id in (select id from public.projects where owner_id = auth.uid()))
  with check (project_id in (select id from public.projects where owner_id = auth.uid()));

create policy "accounts owner via project"
  on public.accounts
  for all
  using (project_id in (select id from public.projects where owner_id = auth.uid()))
  with check (project_id in (select id from public.projects where owner_id = auth.uid()));

create policy "account_tags owner via account"
  on public.account_tags
  for all
  using (account_id in (
    select a.id from public.accounts a
    join public.projects p on p.id = a.project_id
    where p.owner_id = auth.uid()
  ))
  with check (account_id in (
    select a.id from public.accounts a
    join public.projects p on p.id = a.project_id
    where p.owner_id = auth.uid()
  ));

create policy "posts owner via account"
  on public.posts
  for all
  using (account_id in (
    select a.id from public.accounts a
    join public.projects p on p.id = a.project_id
    where p.owner_id = auth.uid()
  ))
  with check (account_id in (
    select a.id from public.accounts a
    join public.projects p on p.id = a.project_id
    where p.owner_id = auth.uid()
  ));

create policy "reports owner via project"
  on public.reports
  for all
  using (project_id in (select id from public.projects where owner_id = auth.uid()))
  with check (project_id in (select id from public.projects where owner_id = auth.uid()));

create policy "report_accounts owner via report"
  on public.report_accounts
  for all
  using (report_id in (
    select r.id from public.reports r
    join public.projects p on p.id = r.project_id
    where p.owner_id = auth.uid()
  ))
  with check (report_id in (
    select r.id from public.reports r
    join public.projects p on p.id = r.project_id
    where p.owner_id = auth.uid()
  ));

create policy "report_categories owner via report"
  on public.report_categories
  for all
  using (report_id in (
    select r.id from public.reports r
    join public.projects p on p.id = r.project_id
    where p.owner_id = auth.uid()
  ))
  with check (report_id in (
    select r.id from public.reports r
    join public.projects p on p.id = r.project_id
    where p.owner_id = auth.uid()
  ));

create policy "report_recipients owner via report"
  on public.report_recipients
  for all
  using (report_id in (
    select r.id from public.reports r
    join public.projects p on p.id = r.project_id
    where p.owner_id = auth.uid()
  ))
  with check (report_id in (
    select r.id from public.reports r
    join public.projects p on p.id = r.project_id
    where p.owner_id = auth.uid()
  ));

create policy "report_history owner via report"
  on public.report_history
  for all
  using (report_id in (
    select r.id from public.reports r
    join public.projects p on p.id = r.project_id
    where p.owner_id = auth.uid()
  ))
  with check (report_id in (
    select r.id from public.reports r
    join public.projects p on p.id = r.project_id
    where p.owner_id = auth.uid()
  ));
