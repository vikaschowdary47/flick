-- Pinned files don't expire. Unpinning starts a fresh 24-hour timer.
-- Pinned files still count toward the storage limit.
-- Run in the Supabase SQL Editor (or `supabase db push`), then deploy the
-- updated expire-files function. Safe to run twice.

-- When a file was last unpinned; its 24 hours count from the later of
-- created_at and unpinned_at. Set only by the trigger below.
alter table public.files
  add column if not exists unpinned_at timestamptz;

-- A file is still "live" (counts toward storage, isn't expired) if it's
-- pinned, or less than 24 hours past its start (upload or last unpin).
create or replace function public.flick_file_is_live(f public.files)
returns boolean
language sql
stable
as $$
  select f.pinned or greatest(f.created_at, coalesce(f.unpinned_at, f.created_at)) > now() - interval '24 hours';
$$;

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
    -- Only this trigger moves the unpin clock (below).
    new.unpinned_at := old.unpinned_at;
  else
    new.unpinned_at := null;
  end if;

  if tg_op = 'INSERT' then
    -- Pinned files and files still inside their 24 hours count.
    select coalesce(sum(f.size), 0) into used_bytes
      from public.files f
      where f.user_id = new.user_id
        and public.flick_file_is_live(f);
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
    -- Unpinning starts a fresh 24-hour timer.
    if tg_op = 'UPDATE' and old.pinned then
      new.unpinned_at := now();
    end if;
  else
    new.pinned_at := old.pinned_at;
  end if;

  return new;
end;
$$;

-- Usage in Settings: storage counts pinned files and live ones.
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
    (select count(*)::integer from public.devices d where d.user_id = auth.uid()),
    l.max_devices
  from public.flick_limits_for(auth.uid()) l
  where auth.uid() is not null;
$$;
