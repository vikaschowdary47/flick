-- Pins, free-plan limits, and the Pro waitlist.
-- Run in the Supabase SQL Editor (or `supabase db push`). Safe to run twice.

-- 1. Pinning -----------------------------------------------------------------

alter table public.files
  add column if not exists pinned boolean not null default false,
  add column if not exists pinned_at timestamptz;

-- Pinned first, then newest.
create index if not exists files_user_pinned_created_at_idx
  on public.files (user_id, pinned desc, created_at desc);

-- 2. Free-plan limits, enforced in the database ------------------------------
-- 3 pinned files and 500 MB of stored files per user. The apps show a friendly
-- screen, but these triggers are what actually stop a request, so a modified
-- client can't get around them. Error messages start with FLICK_LIMIT_ so the
-- apps can recognise them.

create or replace function public.flick_free_max_pins() returns integer
  language sql immutable as $$ select 3 $$;

create or replace function public.flick_free_max_bytes() returns bigint
  language sql immutable as $$ select 524288000::bigint $$; -- 500 MB

create or replace function public.files_enforce_limits()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  used_bytes bigint;
  pinned_count integer;
begin
  -- One user's inserts/pins run one at a time, so two parallel uploads
  -- can't both squeeze under the limit.
  perform pg_advisory_xact_lock(hashtext('flick-limits:' || new.user_id::text));

  if tg_op = 'UPDATE' then
    -- These columns are set once at upload. Locking them stops a client from
    -- shrinking "size" to dodge the storage limit or moving the expiry clock.
    new.user_id := old.user_id;
    new.size := old.size;
    new.storage_path := old.storage_path;
    new.created_at := old.created_at;
  end if;

  if tg_op = 'INSERT' then
    select coalesce(sum(size), 0) into used_bytes
      from public.files
      where user_id = new.user_id;
    if used_bytes + new.size > public.flick_free_max_bytes() then
      raise exception 'FLICK_LIMIT_STORAGE: storage is full (% of % bytes used)',
        used_bytes, public.flick_free_max_bytes()
        using errcode = 'P0001';
    end if;
  end if;

  if new.pinned and (tg_op = 'INSERT' or not old.pinned) then
    select count(*) into pinned_count
      from public.files
      where user_id = new.user_id and pinned and id <> new.id;
    if pinned_count >= public.flick_free_max_pins() then
      raise exception 'FLICK_LIMIT_PINS: all % pins are used', public.flick_free_max_pins()
        using errcode = 'P0001';
    end if;
  end if;

  -- pinned_at always follows pinned; clients can't set it directly.
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

revoke all on function public.files_enforce_limits() from public, anon, authenticated;

drop trigger if exists files_enforce_limits on public.files;
create trigger files_enforce_limits
  before insert or update on public.files
  for each row execute function public.files_enforce_limits();

-- Pinned files still expire after 24 hours for now: expire-files is unchanged.

-- 3. Pro waitlist ------------------------------------------------------------
-- "Get notified when Pro is ready": the account email, which limit was hit,
-- and when. One row per user per limit.

create table if not exists public.waitlist (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  email text not null check (length(trim(email)) > 0),
  limit_hit text not null check (limit_hit in ('pins', 'storage')),
  created_at timestamptz not null default now(),
  constraint waitlist_one_per_limit unique (user_id, limit_hit)
);

alter table public.waitlist enable row level security;

revoke all on table public.waitlist from public, anon;
grant select, insert on table public.waitlist to authenticated;

drop policy if exists "Users can join the waitlist as themselves" on public.waitlist;
create policy "Users can join the waitlist as themselves"
  on public.waitlist for insert
  to authenticated
  with check (
    (select auth.uid()) = user_id
    and lower(email) = lower((select auth.jwt() ->> 'email'))
  );

drop policy if exists "Users can see their own waitlist rows" on public.waitlist;
create policy "Users can see their own waitlist rows"
  on public.waitlist for select
  to authenticated
  using ((select auth.uid()) = user_id);
