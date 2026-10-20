-- Plan limits read from a table (editable in the dashboard, no app update),
-- a plan per user, device limits with "remove a device", usage for Settings,
-- and cleanup of devices not seen for 90 days.
-- Replaces the hard-coded limits from 20261020120000_pins_limits_waitlist.sql.
-- Run in the Supabase SQL Editor (or `supabase db push`). Safe to run twice.

-- 1. Plans and limits ----------------------------------------------------------

create table if not exists public.plan_limits (
  plan text primary key,
  max_devices integer not null check (max_devices >= 1),
  max_pins integer not null check (max_pins >= 0),
  max_storage_mb integer not null check (max_storage_mb >= 1)
);

insert into public.plan_limits (plan, max_devices, max_pins, max_storage_mb)
values ('free', 4, 3, 500)
on conflict (plan) do nothing;

-- Limits are the same for everyone on a plan, so any signed-in user may read them.
alter table public.plan_limits enable row level security;
revoke all on table public.plan_limits from public, anon;
grant select on table public.plan_limits to authenticated;

drop policy if exists "Signed-in users can read plan limits" on public.plan_limits;
create policy "Signed-in users can read plan limits"
  on public.plan_limits for select
  to authenticated
  using (true);

create table if not exists public.profiles (
  user_id uuid primary key references auth.users (id) on delete cascade,
  plan text not null default 'free' references public.plan_limits (plan),
  created_at timestamptz not null default now()
);

-- Users can read their own plan but never change it.
alter table public.profiles enable row level security;
revoke all on table public.profiles from public, anon, authenticated;
grant select on table public.profiles to authenticated;

drop policy if exists "Users can read their own profile" on public.profiles;
create policy "Users can read their own profile"
  on public.profiles for select
  to authenticated
  using ((select auth.uid()) = user_id);

create or replace function public.handle_new_user_profile()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (user_id) values (new.id) on conflict do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created_profile on auth.users;
create trigger on_auth_user_created_profile
  after insert on auth.users
  for each row execute function public.handle_new_user_profile();

insert into public.profiles (user_id)
select id from auth.users
on conflict do nothing;

-- The limits that apply to a user (free if they somehow have no profile).
create or replace function public.flick_limits_for(p_user_id uuid)
returns public.plan_limits
language sql
stable
security definer
set search_path = public
as $$
  select l.*
  from public.plan_limits l
  where l.plan = coalesce(
    (select plan from public.profiles where user_id = p_user_id),
    'free'
  );
$$;

revoke all on function public.flick_limits_for(uuid) from public, anon, authenticated;

-- 2. Pins and storage ---------------------------------------------------------
-- Errors use the message pin_limit / storage_limit / device_limit so the apps
-- can show the right screen; the human text is in DETAIL.

create or replace function public.files_enforce_limits()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  limits public.plan_limits;
  used_bytes bigint;
  pinned_count integer;
begin
  perform pg_advisory_xact_lock(hashtext('flick-limits:' || new.user_id::text));
  limits := public.flick_limits_for(new.user_id);

  if tg_op = 'UPDATE' then
    -- Set once at upload: stops shrinking "size" or moving the expiry clock.
    new.user_id := old.user_id;
    new.size := old.size;
    new.storage_path := old.storage_path;
    new.created_at := old.created_at;
  end if;

  if tg_op = 'INSERT' then
    -- Only files that haven't expired (24 hours) count.
    select coalesce(sum(size), 0) into used_bytes
      from public.files
      where user_id = new.user_id
        and created_at > now() - interval '24 hours';
    if used_bytes + new.size > limits.max_storage_mb::bigint * 1024 * 1024 then
      raise exception 'storage_limit'
        using errcode = 'P0001',
              detail = format('Storage full (%s MB).', limits.max_storage_mb);
    end if;
  end if;

  if new.pinned and (tg_op = 'INSERT' or not old.pinned) then
    select count(*) into pinned_count
      from public.files
      where user_id = new.user_id and pinned and id <> new.id;
    if pinned_count >= limits.max_pins then
      raise exception 'pin_limit'
        using errcode = 'P0001',
              detail = format('You''ve used %s of %s pins.', pinned_count, limits.max_pins);
    end if;
  end if;

  if new.pinned and (tg_op = 'INSERT' or not old.pinned) then
    new.pinned_at := now();
  elsif not new.pinned then
    new.pinned_at := null;
  else
    new.pinned_at := old.pinned_at;
  end if;

  return new;
end;
$$;

-- The trigger itself already exists (files_enforce_limits); it now uses this body.
drop function if exists public.flick_free_max_pins();
drop function if exists public.flick_free_max_bytes();

-- 3. Devices --------------------------------------------------------------------

alter table public.devices
  add column if not exists device_key text,
  add column if not exists last_seen_at timestamptz not null default now(),
  add column if not exists session_id uuid;

-- One row per install per account: signing in again reuses it.
create unique index if not exists devices_user_device_key_idx
  on public.devices (user_id, device_key);

-- Apps register through register_device() and remove through remove_device();
-- the only direct change they may make is renaming.
revoke insert, update, delete on table public.devices from authenticated;
grant update (name) on table public.devices to authenticated;

-- p_legacy_id: the row id an app saved before device keys existed; that row
-- is adopted instead of creating a second one.
drop function if exists public.register_device(text, text, text);
create or replace function public.register_device(
  p_device_key text,
  p_name text,
  p_platform text,
  p_legacy_id uuid default null
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  uid uuid := auth.uid();
  sid uuid := nullif(auth.jwt() ->> 'session_id', '')::uuid;
  existing uuid;
  device_count integer;
  limits public.plan_limits;
begin
  if uid is null then
    raise exception 'not signed in' using errcode = '42501';
  end if;
  if coalesce(trim(p_device_key), '') = '' then
    raise exception 'device key required' using errcode = '22023';
  end if;

  perform pg_advisory_xact_lock(hashtext('flick-devices:' || uid::text));

  select id into existing from public.devices where user_id = uid and device_key = p_device_key;
  if existing is null and p_legacy_id is not null then
    update public.devices set device_key = p_device_key
      where id = p_legacy_id and user_id = uid and device_key is null
      returning id into existing;
  end if;
  if existing is not null then
    update public.devices set last_seen_at = now(), session_id = sid where id = existing;
    return existing;
  end if;

  limits := public.flick_limits_for(uid);
  select count(*) into device_count from public.devices where user_id = uid;
  if device_count >= limits.max_devices then
    raise exception 'device_limit'
      using errcode = 'P0001',
            detail = format('You''re signed in on %s of %s devices.', device_count, limits.max_devices);
  end if;

  insert into public.devices (user_id, device_key, name, platform, session_id)
  values (
    uid,
    p_device_key,
    left(coalesce(nullif(trim(p_name), ''), 'Device'), 30),
    case when p_platform in ('ios', 'android', 'macos', 'windows', 'linux', 'web') then p_platform else 'other' end,
    sid
  )
  returning id into existing;
  return existing;
end;
$$;

-- Removes one of your devices and ends its session (its refresh token stops
-- working; the app also signs itself out when it sees its row disappear).
create or replace function public.remove_device(p_device_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  uid uuid := auth.uid();
  sid uuid;
begin
  delete from public.devices
    where id = p_device_id and user_id = uid
    returning session_id into sid;
  if sid is not null then
    delete from auth.sessions where id = sid and user_id = uid;
  end if;
end;
$$;

revoke all on function public.register_device(text, text, text, uuid) from public, anon;
revoke all on function public.remove_device(uuid) from public, anon;
grant execute on function public.register_device(text, text, text, uuid) to authenticated;
grant execute on function public.remove_device(uuid) to authenticated;

-- Free up slots: devices not seen for 90 days are removed daily.
do $$
begin
  if exists (select 1 from cron.job where jobname = 'flick-forget-stale-devices') then
    perform cron.unschedule('flick-forget-stale-devices');
  end if;
  perform cron.schedule(
    'flick-forget-stale-devices',
    '30 3 * * *',
    $job$delete from public.devices where last_seen_at < now() - interval '90 days'$job$
  );
end
$$;

-- 4. Usage for Settings ("2 of 3 pins, 120 of 500 MB, 2 of 4 devices") ---------

create or replace function public.get_usage()
returns table (
  plan text,
  pins_used integer,
  max_pins integer,
  storage_used_bytes bigint,
  max_storage_mb integer,
  devices_used integer,
  max_devices integer
)
language sql
stable
security definer
set search_path = public
as $$
  select
    l.plan,
    (select count(*)::integer from public.files f where f.user_id = auth.uid() and f.pinned),
    l.max_pins,
    (select coalesce(sum(f.size), 0)::bigint from public.files f
      where f.user_id = auth.uid() and f.created_at > now() - interval '24 hours'),
    l.max_storage_mb,
    (select count(*)::integer from public.devices d where d.user_id = auth.uid()),
    l.max_devices
  from public.flick_limits_for(auth.uid()) l
  where auth.uid() is not null;
$$;

revoke all on function public.get_usage() from public, anon;
grant execute on function public.get_usage() to authenticated;

-- 5. Waitlist: device limit too ---------------------------------------------------

alter table public.waitlist drop constraint if exists waitlist_limit_hit_check;
alter table public.waitlist
  add constraint waitlist_limit_hit_check check (limit_hit in ('pins', 'storage', 'devices'));
