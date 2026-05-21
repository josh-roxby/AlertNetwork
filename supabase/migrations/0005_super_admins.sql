-- Super-admin gate for project creation.
--
-- Background: until this migration anyone signed in could create
-- their own project and become its owner. That made the multi-tenant
-- model open-ended — every invited viewer technically had a path to
-- spin up their own workspace.
--
-- New rule: only users in `super_admins` can INSERT into `projects`.
-- Everyone else is invite-only as a viewer. Membership in the
-- super_admins table is managed manually via the Supabase Studio
-- table editor — there's no UI to grant it from inside the app.
--
-- The owner check on UPDATE / DELETE of `projects` stays unchanged
-- (`owner_id = auth.uid()`). So super-admins can edit / delete the
-- projects they own; they CANNOT touch other super-admins' projects.

create table public.super_admins (
  user_id    uuid primary key references auth.users(id) on delete cascade,
  email      text not null,
  granted_at timestamptz not null default now(),
  granted_by uuid references auth.users(id),
  note       text
);

create index super_admins_email_idx on public.super_admins (email);

alter table public.super_admins enable row level security;

-- A user can see their own super-admin row (so the UI can tell
-- whether to render the "New project" button). No one writes via
-- the browser — the table is managed by you, the literal super
-- admin, from the Supabase Studio Table Editor.
create policy "super_admins select self"
  on public.super_admins
  for select
  using (user_id = auth.uid());

-- Helper used by the projects INSERT policy below. SECURITY DEFINER
-- so it can read super_admins regardless of the caller's RLS
-- visibility on that table — otherwise the RLS we just set up would
-- block the function from confirming someone else's row.
create or replace function public.is_super_admin()
returns boolean
language sql
stable
security definer
set search_path = public, auth
as $$
  select exists (
    select 1 from public.super_admins where user_id = auth.uid()
  );
$$;

-- Tighten the projects INSERT policy. The check is BOTH conditions:
--   - the caller is a super-admin
--   - they're setting themselves as the owner
-- Non-super-admins get a clean RLS rejection if they try to insert.
drop policy if exists "projects modify for owner" on public.projects;
create policy "projects insert for super admin"
  on public.projects
  for insert
  with check (is_super_admin() and owner_id = auth.uid());

-- Seed the initial super admin. josh@exhale.studio created the
-- workspace and is the de-facto super admin on day 1.
insert into public.super_admins (user_id, email, note)
select id, email, 'Initial super admin seeded by migration 0005'
from auth.users
where email = 'josh@exhale.studio'
on conflict (user_id) do nothing;
