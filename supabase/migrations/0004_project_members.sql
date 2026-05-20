-- Project members + view-only access.
--
-- Adds a second authorisation root to projects: in addition to the
-- single owner stored on `projects.owner_id`, projects can now have
-- additional members in `project_members` with a role (currently only
-- `viewer`). Viewers can SELECT rows but cannot INSERT / UPDATE /
-- DELETE — only the owner mutates.
--
-- Implementation notes:
--   * The owner is intentionally NOT mirrored into project_members.
--     It stays on `projects.owner_id` (single source of truth) and
--     the membership predicate `is_project_member()` unions both.
--   * Two helper SQL functions wrap the predicates so the RLS bodies
--     stay readable: `is_project_member(p_project_id uuid)` returns
--     true for owner or any member; `is_project_owner` is the strict
--     check used on writes.
--   * Every existing project-scoped policy is replaced. Each table
--     gets a SELECT policy that uses `is_project_member` and a write
--     policy (insert/update/delete) that uses `is_project_owner`.
--   * `project_members` itself: owner sees all rows for projects they
--     own; member sees only their own membership row.

-- =====================================================================
-- Membership table
-- =====================================================================

create table public.project_members (
  id           uuid primary key default gen_random_uuid(),
  project_id   uuid not null references public.projects(id) on delete cascade,
  user_id      uuid not null references auth.users(id) on delete cascade,
  role         text not null check (role in ('viewer')),
  invited_email text not null,
  invited_by   uuid not null references auth.users(id),
  invited_at   timestamptz not null default now(),
  unique (project_id, user_id)
);

create index project_members_project_id_idx
  on public.project_members (project_id);
create index project_members_user_id_idx
  on public.project_members (user_id);

-- =====================================================================
-- Predicates used by every project-scoped policy
-- =====================================================================

-- True when the calling user is the project owner OR appears in
-- project_members for that project. Stable so Postgres can cache it
-- within a query.
create or replace function public.is_project_member(p_project_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public, auth
as $$
  select
    exists (
      select 1 from public.projects
      where id = p_project_id and owner_id = auth.uid()
    )
    or exists (
      select 1 from public.project_members
      where project_id = p_project_id and user_id = auth.uid()
    );
$$;

-- True only when the calling user is the project owner. Used by every
-- write policy so viewers never get mutate access.
create or replace function public.is_project_owner(p_project_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public, auth
as $$
  select exists (
    select 1 from public.projects
    where id = p_project_id and owner_id = auth.uid()
  );
$$;

-- =====================================================================
-- Replace existing project-scoped RLS with read/write split
-- =====================================================================

-- projects
drop policy if exists "projects owner full access" on public.projects;
create policy "projects select for members"
  on public.projects
  for select
  using (is_project_member(id));
create policy "projects modify for owner"
  on public.projects
  for insert
  with check (owner_id = auth.uid());
create policy "projects update for owner"
  on public.projects
  for update
  using (owner_id = auth.uid())
  with check (owner_id = auth.uid());
create policy "projects delete for owner"
  on public.projects
  for delete
  using (owner_id = auth.uid());

-- categories
drop policy if exists "categories owner via project" on public.categories;
create policy "categories select for members"
  on public.categories for select using (is_project_member(project_id));
create policy "categories write for owner"
  on public.categories for insert with check (is_project_owner(project_id));
create policy "categories update for owner"
  on public.categories for update
  using (is_project_owner(project_id))
  with check (is_project_owner(project_id));
create policy "categories delete for owner"
  on public.categories for delete using (is_project_owner(project_id));

-- tags
drop policy if exists "tags owner via project" on public.tags;
create policy "tags select for members"
  on public.tags for select using (is_project_member(project_id));
create policy "tags write for owner"
  on public.tags for insert with check (is_project_owner(project_id));
create policy "tags update for owner"
  on public.tags for update
  using (is_project_owner(project_id))
  with check (is_project_owner(project_id));
create policy "tags delete for owner"
  on public.tags for delete using (is_project_owner(project_id));

-- accounts
drop policy if exists "accounts owner via project" on public.accounts;
create policy "accounts select for members"
  on public.accounts for select using (is_project_member(project_id));
create policy "accounts write for owner"
  on public.accounts for insert with check (is_project_owner(project_id));
create policy "accounts update for owner"
  on public.accounts for update
  using (is_project_owner(project_id))
  with check (is_project_owner(project_id));
create policy "accounts delete for owner"
  on public.accounts for delete using (is_project_owner(project_id));

-- account_tags (joined to accounts → projects)
drop policy if exists "account_tags owner via account" on public.account_tags;
create policy "account_tags select for members"
  on public.account_tags for select
  using (
    account_id in (
      select a.id from public.accounts a where is_project_member(a.project_id)
    )
  );
create policy "account_tags write for owner"
  on public.account_tags for insert
  with check (
    account_id in (
      select a.id from public.accounts a where is_project_owner(a.project_id)
    )
  );
create policy "account_tags delete for owner"
  on public.account_tags for delete
  using (
    account_id in (
      select a.id from public.accounts a where is_project_owner(a.project_id)
    )
  );

-- posts (joined to accounts → projects)
drop policy if exists "posts owner via account" on public.posts;
create policy "posts select for members"
  on public.posts for select
  using (
    account_id in (
      select a.id from public.accounts a where is_project_member(a.project_id)
    )
  );
create policy "posts write for owner"
  on public.posts for insert
  with check (
    account_id in (
      select a.id from public.accounts a where is_project_owner(a.project_id)
    )
  );
create policy "posts update for owner"
  on public.posts for update
  using (
    account_id in (
      select a.id from public.accounts a where is_project_owner(a.project_id)
    )
  )
  with check (
    account_id in (
      select a.id from public.accounts a where is_project_owner(a.project_id)
    )
  );
create policy "posts delete for owner"
  on public.posts for delete
  using (
    account_id in (
      select a.id from public.accounts a where is_project_owner(a.project_id)
    )
  );

-- reports
drop policy if exists "reports owner via project" on public.reports;
create policy "reports select for members"
  on public.reports for select using (is_project_member(project_id));
create policy "reports write for owner"
  on public.reports for insert with check (is_project_owner(project_id));
create policy "reports update for owner"
  on public.reports for update
  using (is_project_owner(project_id))
  with check (is_project_owner(project_id));
create policy "reports delete for owner"
  on public.reports for delete using (is_project_owner(project_id));

-- report_accounts
drop policy if exists "report_accounts owner via report" on public.report_accounts;
create policy "report_accounts select for members"
  on public.report_accounts for select
  using (
    report_id in (
      select r.id from public.reports r where is_project_member(r.project_id)
    )
  );
create policy "report_accounts write for owner"
  on public.report_accounts for insert
  with check (
    report_id in (
      select r.id from public.reports r where is_project_owner(r.project_id)
    )
  );
create policy "report_accounts delete for owner"
  on public.report_accounts for delete
  using (
    report_id in (
      select r.id from public.reports r where is_project_owner(r.project_id)
    )
  );

-- report_categories
drop policy if exists "report_categories owner via report" on public.report_categories;
create policy "report_categories select for members"
  on public.report_categories for select
  using (
    report_id in (
      select r.id from public.reports r where is_project_member(r.project_id)
    )
  );
create policy "report_categories write for owner"
  on public.report_categories for insert
  with check (
    report_id in (
      select r.id from public.reports r where is_project_owner(r.project_id)
    )
  );
create policy "report_categories delete for owner"
  on public.report_categories for delete
  using (
    report_id in (
      select r.id from public.reports r where is_project_owner(r.project_id)
    )
  );

-- report_recipients
drop policy if exists "report_recipients owner via report" on public.report_recipients;
create policy "report_recipients select for members"
  on public.report_recipients for select
  using (
    report_id in (
      select r.id from public.reports r where is_project_member(r.project_id)
    )
  );
create policy "report_recipients write for owner"
  on public.report_recipients for insert
  with check (
    report_id in (
      select r.id from public.reports r where is_project_owner(r.project_id)
    )
  );
create policy "report_recipients delete for owner"
  on public.report_recipients for delete
  using (
    report_id in (
      select r.id from public.reports r where is_project_owner(r.project_id)
    )
  );

-- report_history (read-only via the UI anyway, but be explicit)
drop policy if exists "report_history owner via report" on public.report_history;
create policy "report_history select for members"
  on public.report_history for select
  using (
    report_id in (
      select r.id from public.reports r where is_project_member(r.project_id)
    )
  );
create policy "report_history write for owner"
  on public.report_history for insert
  with check (
    report_id in (
      select r.id from public.reports r where is_project_owner(r.project_id)
    )
  );
create policy "report_history update for owner"
  on public.report_history for update
  using (
    report_id in (
      select r.id from public.reports r where is_project_owner(r.project_id)
    )
  )
  with check (
    report_id in (
      select r.id from public.reports r where is_project_owner(r.project_id)
    )
  );

-- =====================================================================
-- project_members itself
-- =====================================================================

alter table public.project_members enable row level security;

-- Owner can read every membership for projects they own.
-- Member can read their own membership row (so the app can show them
-- which projects they belong to).
create policy "project_members select"
  on public.project_members
  for select
  using (
    user_id = auth.uid()
    or is_project_owner(project_id)
  );

-- Only owners insert / delete memberships. There's no update path
-- (role is fixed at insert) so we don't grant UPDATE.
create policy "project_members insert"
  on public.project_members
  for insert
  with check (is_project_owner(project_id));

create policy "project_members delete"
  on public.project_members
  for delete
  using (is_project_owner(project_id));
