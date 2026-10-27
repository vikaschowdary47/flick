-- Devices count only where you're signed in right now.
-- Before: a device row stayed after signing out (or reinstalling the app),
-- so "3 of 4 devices" counted old sign-ins for up to 90 days and could block
-- a new device. Now a device whose sign-in session has ended is removed, and
-- usage and the device limit count only devices that are still signed in.
begin;

-- Signed in = its auth session still exists. Rows from before session ids
-- were recorded count while they've been seen in the last 30 days.
create or replace function public.flick_device_is_active(d public.devices)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select case
    when d.session_id is not null then exists (select 1 from auth.sessions s where s.id = d.session_id)
    else d.last_seen_at > now() - interval '30 days'
  end;
$$;
revoke all on function public.flick_device_is_active(public.devices) from public, anon, authenticated;

-- Removes this user's devices that are no longer signed in.
create or replace function public.flick_forget_signed_out_devices(p_user_id uuid)
returns void
language sql
security definer
set search_path = public
as $$
  delete from public.devices d
  where d.user_id = p_user_id and not public.flick_device_is_active(d);
$$;
revoke all on function public.flick_forget_signed_out_devices(uuid) from public, anon, authenticated;

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
    perform public.flick_forget_signed_out_devices(uid);
    return existing;
  end if;

  -- Free the slots of devices that have signed out before checking the limit.
  perform public.flick_forget_signed_out_devices(uid);

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
      where f.user_id = auth.uid() and public.flick_file_is_live(f)),
    l.max_storage_mb,
    (select count(*)::integer from public.devices d where d.user_id = auth.uid() and public.flick_device_is_active(d)),
    l.max_devices
  from public.flick_limits_for(auth.uid()) l
  where auth.uid() is not null;
$$;

revoke all on function public.register_device(text, text, text, uuid) from public, anon;
grant execute on function public.register_device(text, text, text, uuid) to authenticated;
revoke all on function public.get_usage() from public, anon;
grant execute on function public.get_usage() to authenticated;

-- Clean up signed-out devices for everyone every 15 minutes (the 90-day
-- sweep stays as a backstop).
do $$
begin
  if exists (select 1 from cron.job where jobname = 'flick-forget-signed-out-devices') then
    perform cron.unschedule('flick-forget-signed-out-devices');
  end if;
  perform cron.schedule(
    'flick-forget-signed-out-devices',
    '*/15 * * * *',
    $job$delete from public.devices d where not public.flick_device_is_active(d)$job$
  );
end
$$;

-- Clear out the old sign-ins now.
delete from public.devices d where not public.flick_device_is_active(d);

commit;
