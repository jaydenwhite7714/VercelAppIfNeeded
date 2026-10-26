-- Extend the existing profile-creation trigger to all three supported social
-- providers. Email/password signups still require the validated username in
-- user metadata; OAuth usernames remain unique and are generated in-database.
create or replace function public.create_unbilled_profile_for_auth_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  provider_name text := lower(coalesce(new.raw_app_meta_data ->> 'provider', ''));
  normalized_username text := lower(btrim(coalesce(new.raw_user_meta_data ->> 'username', '')));
  username_base text;
  username_candidate text;
  suffix text;
  attempt integer;
begin
  if provider_name not in ('google', 'azure', 'apple') then
    if normalized_username !~ '^[a-z][a-z0-9_]{2,23}$' then
      raise exception 'Invalid Unbilled username.' using errcode = '23514';
    end if;

    insert into public.profiles (user_id, username)
    values (new.id, normalized_username);
    return new;
  end if;

  username_base := lower(split_part(coalesce(new.email, ''), '@', 1));
  username_base := regexp_replace(username_base, '[^a-z0-9]+', '_', 'g');
  username_base := regexp_replace(username_base, '_+', '_', 'g');
  username_base := regexp_replace(username_base, '^_+|_+$', '', 'g');
  username_base := regexp_replace(username_base, '^[^a-z]+', '', 'g');
  if length(username_base) < 3 then username_base := 'member'; end if;
  username_base := left(username_base, 14);

  -- Retry rare username collisions. The unique normalized index is the final
  -- concurrency-safe guard. Primary-key conflicts are never swallowed.
  for attempt in 1..10 loop
    suffix := substr(replace(pg_catalog.gen_random_uuid()::text, '-', ''), 1, 8);
    username_candidate := username_base || '_' || suffix;
    insert into public.profiles (user_id, username)
    values (new.id, username_candidate)
    on conflict (username_normalized) do nothing;
    if found then return new; end if;
  end loop;

  raise exception 'Could not assign a unique Unbilled username.' using errcode = '23505';
end;
$$;

revoke all on function public.create_unbilled_profile_for_auth_user() from public, anon, authenticated;
