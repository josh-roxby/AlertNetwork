-- Convert project_members.role from `text + CHECK constraint` to a
-- Postgres ENUM type. Functionally identical at the DB layer — the
-- value space is still ('viewer', 'manager') — but it lights up a
-- dropdown in the Supabase Studio Table Editor instead of a free
-- text input.
--
-- Order matters: drop the old CHECK first (which compares role to
-- text[]) before changing the column type, otherwise the cast fails
-- when the constraint can't find a `project_member_role = text`
-- operator.
--
-- Also redefine `can_manage_project()` to cast role to text in its
-- comparison — gives the function a stable signature regardless of
-- whether the column is text or the new enum type.

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
        and role::text = 'manager'
    );
$$;

alter table public.project_members
  drop constraint if exists project_members_role_check;

create type public.project_member_role as enum ('viewer', 'manager');

alter table public.project_members
  alter column role drop default;

alter table public.project_members
  alter column role type public.project_member_role
  using role::text::public.project_member_role;
