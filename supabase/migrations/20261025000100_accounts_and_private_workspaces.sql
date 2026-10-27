-- Unbilled account identities and one private, validated workspace snapshot per user.
-- Auth passwords, verification tokens, and sessions remain owned by Supabase Auth.

create table if not exists public.profiles (
  user_id uuid primary key references auth.users (id) on delete cascade,
  username text not null,
  username_normalized text generated always as (lower(username)) stored,
  created_at timestamptz not null default now(),
  constraint profiles_username_format check (username = lower(btrim(username)) and username ~ '^[a-z][a-z0-9_]{2,23}$'),
  constraint profiles_username_normalized_key unique (username_normalized)
);

alter table public.profiles enable row level security;
alter table public.profiles force row level security;
revoke all on public.profiles from anon, authenticated;
grant select on public.profiles to authenticated;

create policy "Users can read their own profile"
  on public.profiles for select to authenticated
  using ((select auth.uid()) = user_id);

-- Signup may check only whether a chosen public username is available; no profile
-- details, email addresses, or account identifiers are returned.
create or replace function public.is_unbilled_username_available(p_username text)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select lower(btrim(coalesce(p_username, ''))) ~ '^[a-z][a-z0-9_]{2,23}$'
    and not exists (
      select 1 from public.profiles
      where username_normalized = lower(btrim(coalesce(p_username, '')))
    );
$$;

revoke all on function public.is_unbilled_username_available(text) from public;
grant execute on function public.is_unbilled_username_available(text) to anon, authenticated;

create or replace function public.create_unbilled_profile_for_auth_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  normalized_username text;
begin
  normalized_username := lower(btrim(coalesce(new.raw_user_meta_data ->> 'username', '')));
  if normalized_username !~ '^[a-z][a-z0-9_]{2,23}$' then
    raise exception 'Invalid Unbilled username.' using errcode = '23514';
  end if;

  insert into public.profiles (user_id, username)
  values (new.id, normalized_username);
  return new;
end;
$$;

revoke all on function public.create_unbilled_profile_for_auth_user() from public, anon, authenticated;
drop trigger if exists on_auth_user_created_unbilled_profile on auth.users;
create trigger on_auth_user_created_unbilled_profile
  after insert on auth.users
  for each row execute function public.create_unbilled_profile_for_auth_user();

create table if not exists public.user_workspaces (
  user_id uuid primary key references auth.users (id) on delete cascade,
  workspace jsonb not null,
  updated_at timestamptz not null default now(),
  constraint user_workspaces_workspace_object check (jsonb_typeof(workspace) = 'object')
);

alter table public.user_workspaces enable row level security;
alter table public.user_workspaces force row level security;
revoke all on public.user_workspaces from anon, authenticated;
grant select on public.user_workspaces to authenticated;

create policy "Users can read only their own workspace"
  on public.user_workspaces for select to authenticated
  using ((select auth.uid()) = user_id);

-- Snapshots are written only through this compare-and-swap function. Direct REST
-- INSERT/UPDATE/DELETE is intentionally not granted, even to authenticated users.
create or replace function public.save_own_workspace_snapshot(
  p_workspace jsonb,
  p_expected_updated_at timestamptz
)
returns timestamptz
language plpgsql
security definer
set search_path = ''
as $$
declare
  owner_id uuid := auth.uid();
  saved_at timestamptz := clock_timestamp();
  affected_rows integer;
begin
  if owner_id is null then
    raise exception 'Authentication required.' using errcode = '42501';
  end if;
  if jsonb_typeof(p_workspace) <> 'object' then
    raise exception 'Workspace snapshot must be a JSON object.' using errcode = '22023';
  end if;

  if p_expected_updated_at is null then
    insert into public.user_workspaces (user_id, workspace, updated_at)
    values (owner_id, p_workspace, saved_at)
    on conflict (user_id) do nothing;
  else
    update public.user_workspaces
       set workspace = p_workspace, updated_at = saved_at
     where user_id = owner_id and updated_at = p_expected_updated_at;
  end if;
  get diagnostics affected_rows = row_count;
  if affected_rows = 0 then
    return null;
  end if;
  return saved_at;
end;
$$;

revoke all on function public.save_own_workspace_snapshot(jsonb, timestamptz) from public, anon;
grant execute on function public.save_own_workspace_snapshot(jsonb, timestamptz) to authenticated;

create or replace function public.delete_own_workspace_snapshot(p_expected_updated_at timestamptz)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
declare
  owner_id uuid := auth.uid();
  affected_rows integer;
begin
  if owner_id is null then
    raise exception 'Authentication required.' using errcode = '42501';
  end if;
  if p_expected_updated_at is null then
    return false;
  end if;
  delete from public.user_workspaces
   where user_id = owner_id and updated_at = p_expected_updated_at;
  get diagnostics affected_rows = row_count;
  return affected_rows = 1;
end;
$$;

revoke all on function public.delete_own_workspace_snapshot(timestamptz) from public, anon;
grant execute on function public.delete_own_workspace_snapshot(timestamptz) to authenticated;

comment on table public.user_workspaces is 'One private JSON backup per Unbilled account. RLS limits reads to auth.uid(); writes and deletes use owner-bound compare-and-swap RPCs; no service-role key is used.';
