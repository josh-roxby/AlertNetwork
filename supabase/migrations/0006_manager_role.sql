-- Adds the `manager` role to project_members and re-points the
-- project-scoped RLS writes that managers SHOULD be able to do —
-- accounts, posts, reports, the reports' join tables, etc.
--
-- Roles after this migration:
--   - super_admin  → in `super_admins`. Can create projects.
--   - owner        → projects.owner_id. Full control. Always also a
--                    super_admin in practice (only super_admins can
--                    INSERT into projects).
--   - manager      → project_members.role = 'manager'. Can add /
--                    edit accounts and reports inside one project.
--                    CANNOT trigger generate-now, send-test,
--                    invite/remove members, set passwords, change
--                    project health-config, or create new projects.
--   - viewer       → project_members.role = 'viewer'. Read-only.
--
-- The "owner-only" stuff (generate-now, send-test, password reset,
-- team invites) stays gated by `is_project_owner()` — both in RLS
-- and explicit checks in the API routes that bypass RLS via
-- service-role.

-- 1) Relax the role check.
alter table public.project_members
  drop constraint if exists project_members_role_check;
alter table public.project_members
  add constraint project_members_role_check
  check (role in ('viewer', 'manager'));

-- 2) New predicate: owner OR manager. The "write inside the
-- project" tier. Owner-only writes still use `is_project_owner`.
create or replace function public.can_manage_project(p_project_id uuid)
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
      where project_id = p_project_id
        and user_id = auth.uid()
        and role = 'manager'
    );
$$;

-- 3) Repoint the write policies that managers can use to
-- `can_manage_project`. SELECT policies stay on `is_project_member`
-- (viewers + managers + owner can all read).
--
-- We leave UPDATE/DELETE on `projects` itself + on `report_history`
-- + on `posts` (`update`/`delete`) keyed to owner; those mutate
-- shared state managers shouldn't touch.

-- categories
drop policy if exists "categories write for owner" on public.categories;
drop policy if exists "categories update for owner" on public.categories;
drop policy if exists "categories delete for owner" on public.categories;
create policy "categories write for manager" on public.categories
  for insert with check (can_manage_project(project_id));
create policy "categories update for manager" on public.categories
  for update using (can_manage_project(project_id))
  with check (can_manage_project(project_id));
create policy "categories delete for manager" on public.categories
  for delete using (can_manage_project(project_id));

-- tags
drop policy if exists "tags write for owner" on public.tags;
drop policy if exists "tags update for owner" on public.tags;
drop policy if exists "tags delete for owner" on public.tags;
create policy "tags write for manager" on public.tags
  for insert with check (can_manage_project(project_id));
create policy "tags update for manager" on public.tags
  for update using (can_manage_project(project_id))
  with check (can_manage_project(project_id));
create policy "tags delete for manager" on public.tags
  for delete using (can_manage_project(project_id));

-- accounts
drop policy if exists "accounts write for owner" on public.accounts;
drop policy if exists "accounts update for owner" on public.accounts;
drop policy if exists "accounts delete for owner" on public.accounts;
create policy "accounts write for manager" on public.accounts
  for insert with check (can_manage_project(project_id));
create policy "accounts update for manager" on public.accounts
  for update using (can_manage_project(project_id))
  with check (can_manage_project(project_id));
create policy "accounts delete for manager" on public.accounts
  for delete using (can_manage_project(project_id));

-- account_tags
drop policy if exists "account_tags write for owner" on public.account_tags;
drop policy if exists "account_tags delete for owner" on public.account_tags;
create policy "account_tags write for manager" on public.account_tags
  for insert with check (
    account_id in (
      select a.id from public.accounts a where can_manage_project(a.project_id)
    )
  );
create policy "account_tags delete for manager" on public.account_tags
  for delete using (
    account_id in (
      select a.id from public.accounts a where can_manage_project(a.project_id)
    )
  );

-- reports
drop policy if exists "reports write for owner" on public.reports;
drop policy if exists "reports update for owner" on public.reports;
drop policy if exists "reports delete for owner" on public.reports;
create policy "reports write for manager" on public.reports
  for insert with check (can_manage_project(project_id));
create policy "reports update for manager" on public.reports
  for update using (can_manage_project(project_id))
  with check (can_manage_project(project_id));
create policy "reports delete for manager" on public.reports
  for delete using (can_manage_project(project_id));

-- report_accounts
drop policy if exists "report_accounts write for owner" on public.report_accounts;
drop policy if exists "report_accounts delete for owner" on public.report_accounts;
create policy "report_accounts write for manager" on public.report_accounts
  for insert with check (
    report_id in (
      select r.id from public.reports r where can_manage_project(r.project_id)
    )
  );
create policy "report_accounts delete for manager" on public.report_accounts
  for delete using (
    report_id in (
      select r.id from public.reports r where can_manage_project(r.project_id)
    )
  );

-- report_categories
drop policy if exists "report_categories write for owner" on public.report_categories;
drop policy if exists "report_categories delete for owner" on public.report_categories;
create policy "report_categories write for manager" on public.report_categories
  for insert with check (
    report_id in (
      select r.id from public.reports r where can_manage_project(r.project_id)
    )
  );
create policy "report_categories delete for manager" on public.report_categories
  for delete using (
    report_id in (
      select r.id from public.reports r where can_manage_project(r.project_id)
    )
  );

-- report_recipients — managers can edit the recipient list since
-- they're the ones building reports
drop policy if exists "report_recipients write for owner" on public.report_recipients;
drop policy if exists "report_recipients delete for owner" on public.report_recipients;
create policy "report_recipients write for manager" on public.report_recipients
  for insert with check (
    report_id in (
      select r.id from public.reports r where can_manage_project(r.project_id)
    )
  );
create policy "report_recipients delete for manager" on public.report_recipients
  for delete using (
    report_id in (
      select r.id from public.reports r where can_manage_project(r.project_id)
    )
  );

-- NOTE: report_history INSERT/UPDATE stays on `is_project_owner` —
-- only the cron path + the explicit owner run-now should write
-- there. Same for password_hash on `reports` (handled in the API
-- route, not in this policy).

-- 4) Let owners change a member's role (viewer <-> manager). Adds
-- the UPDATE policy that PR #48's project_members originally lacked.
create policy "project_members update" on public.project_members
  for update
  using (is_project_owner(project_id))
  with check (is_project_owner(project_id));
