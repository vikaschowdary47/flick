-- Guest sharing: send files without an account (link or 6-character code),
-- sign in later to extend the link and sync. One backend for site, mobile
-- and desktop.
--
-- How a guest uses it:
--   1. The client signs in anonymously (supabase.auth.signInAnonymously()).
--      The guest is a normal "authenticated" user flagged is_anonymous, so
--      the existing files table, storage rules and limits apply unchanged.
--   2. The client uploads files, then calls create_drop(file_ids, token_hash).
--      The raw link token never leaves the client (same idea as share_links:
--      only its SHA-256 is stored). The reply has the 6-character code.
--   3. Anyone opens the link or types the code; the drop-resolve Edge
--      Function returns the files and short-lived signed download URLs.
--   4. When the guest signs in (linking an identity keeps the same user id),
--      the client refreshes its session and calls extend_my_drops().
--
-- Numbers (hours, file counts, limits) live in share_settings, editable in
-- the dashboard with no app update. A feature flag, guest_share, is the
-- master switch and ships OFF.
-- Safe to run twice.

-- 1. Editable settings (one row) ------------------------------------------------
-- The CHECK constraints are hard ceilings: a typo in the dashboard cannot
-- turn a 1-hour guest link into a month-long public file host.

create table if not exists public.share_settings (
  id boolean primary key default true check (id),
  guest_ttl_minutes integer not null default 60 check (guest_ttl_minutes between 5 and 1440),
  signed_in_ttl_minutes integer not null default 1440 check (signed_in_ttl_minutes between 5 and 1440),
  guest_max_files integer not null default 5 check (guest_max_files between 1 and 20),
  signed_in_max_files integer not null default 20 check (signed_in_max_files between 1 and 50),
  guest_max_total_mb integer not null default 50 check (guest_max_total_mb between 1 and 200),
  guest_drops_per_hour integer not null default 10 check (guest_drops_per_hour between 1 and 100),
  code_attempts_per_minute integer not null default 20 check (code_attempts_per_minute between 1 and 120),
  drop_downloads_per_minute integer not null default 60 check (drop_downloads_per_minute between 1 and 600),
  constraint share_settings_guest_not_longer check (guest_ttl_minutes <= signed_in_ttl_minutes)
);

insert into public.share_settings (id) values (true) on conflict (id) do nothing;

-- Anyone (including the website, before sign-in) may read the numbers so the
-- UI can say "1 hour" from the source of truth. Only the dashboard writes.
alter table public.share_settings enable row level security;
revoke all on table public.share_settings from public, anon, authenticated;
grant select on table public.share_settings to anon, authenticated;

drop policy if exists "Anyone can read share settings" on public.share_settings;
create policy "Anyone can read share settings"
  on public.share_settings for select
  to anon, authenticated
  using (true);

insert into public.feature_flags (name, enabled, description) values
  ('guest_share', false, 'Send without an account (link or code). Off blocks creating and opening guest drops.')
on conflict (name) do nothing;

-- 2. Drops: one link/code for one or more files ----------------------------------

create table if not exists public.drops (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  -- 6 characters from an alphabet without I, O, 0, 1 (about a billion codes).
  code text not null unique check (code ~ '^[A-HJ-NP-Z2-9]{6}$'),
  token_hash text not null unique check (token_hash ~ '^[0-9a-f]{64}$'),
  created_at timestamptz not null default now(),
  expires_at timestamptz not null,
  revoked_at timestamptz,
  open_count integer not null default 0 check (open_count >= 0),
  download_count integer not null default 0 check (download_count >= 0),
  max_downloads integer check (max_downloads is null or max_downloads >= 1)
);

create index if not exists drops_owner_created_idx on public.drops (owner_id, created_at desc);
create index if not exists drops_expires_idx on public.drops (expires_at);

create table if not exists public.drop_files (
  drop_id uuid not null references public.drops (id) on delete cascade,
  file_id uuid not null references public.files (id) on delete cascade,
  position smallint not null default 0,
  primary key (drop_id, file_id)
);

create index if not exists drop_files_file_id_idx on public.drop_files (file_id);

alter table public.drops enable row level security;
alter table public.drop_files enable row level security;
revoke all on table public.drops from public, anon, authenticated;
revoke all on table public.drop_files from public, anon, authenticated;

-- Owners (guests included) can see their drops, with the counters, and may
-- revoke or cap downloads. Creating goes through create_drop() only.
grant select, delete on table public.drops to authenticated;
grant update (revoked_at, max_downloads) on table public.drops to authenticated;
grant select on table public.drop_files to authenticated;

drop policy if exists "Owners can read their drops" on public.drops;
create policy "Owners can read their drops"
  on public.drops for select to authenticated
  using ((select auth.uid()) = owner_id);

drop policy if exists "Owners can update their drops" on public.drops;
create policy "Owners can update their drops"
  on public.drops for update to authenticated
  using ((select auth.uid()) = owner_id)
  with check ((select auth.uid()) = owner_id);

drop policy if exists "Owners can delete their drops" on public.drops;
create policy "Owners can delete their drops"
  on public.drops for delete to authenticated
  using ((select auth.uid()) = owner_id);

drop policy if exists "Owners can read their drop files" on public.drop_files;
create policy "Owners can read their drop files"
  on public.drop_files for select to authenticated
  using (exists (
    select 1 from public.drops d
    where d.id = drop_id and d.owner_id = (select auth.uid())
  ));

-- 3. Helpers ------------------------------------------------------------------------

-- The earliest moment one of these files disappears on its own (24 hours after
-- upload or unpin). Null when all are pinned. A link never outlives its files.
create or replace function public.flick_files_expiry(p_file_ids uuid[])
returns timestamptz
language sql
stable
security definer
set search_path = public
as $$
  select min(
    case when pinned then null
    else greatest(created_at, coalesce(unpinned_at, created_at)) + interval '24 hours' end
  )
  from public.files
  where id = any(p_file_ids);
$$;
revoke all on function public.flick_files_expiry(uuid[]) from public, anon, authenticated;

-- A random 6-character code. gen_random_uuid() is a CSPRNG and 256 % 32 = 0,
-- so taking each byte mod 32 is unbiased.
create or replace function public.flick_new_drop_code()
returns text
language plpgsql
volatile
as $$
declare
  alphabet constant text := 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  bytes bytea := decode(replace(gen_random_uuid()::text, '-', ''), 'hex');
  result text := '';
  i integer;
begin
  for i in 0..5 loop
    result := result || substr(alphabet, (get_byte(bytes, i) % 32) + 1, 1);
  end loop;
  return result;
end;
$$;
revoke all on function public.flick_new_drop_code() from public, anon, authenticated;

-- 4. Create a drop ---------------------------------------------------------------------
-- Errors (message → meaning): guest_share_disabled, drop_no_files,
-- drop_too_many_files, drop_too_big, drop_rate_limit, drop_files_not_found.

create or replace function public.create_drop(p_file_ids uuid[], p_token_hash text)
returns table (drop_id uuid, code text, expires_at timestamptz)
language plpgsql
security definer
set search_path = public
as $$
declare
  uid uuid := auth.uid();
  is_guest boolean := coalesce((auth.jwt() ->> 'is_anonymous')::boolean, false);
  s public.share_settings;
  wanted integer;
  found_count integer;
  total_bytes bigint;
  recent integer;
  ttl interval;
  expiry timestamptz;
  files_expiry timestamptz;
  new_code text;
  new_id uuid;
  attempt integer := 0;
  max_files integer;
begin
  if uid is null then
    raise exception 'not signed in' using errcode = '42501';
  end if;
  if not coalesce((select enabled from public.feature_flags where name = 'guest_share'), false) then
    raise exception 'guest_share_disabled' using errcode = 'P0001';
  end if;
  if p_token_hash is null or p_token_hash !~ '^[0-9a-f]{64}$' then
    raise exception 'invalid token hash' using errcode = '22023';
  end if;

  select * into s from public.share_settings;
  max_files := case when is_guest then s.guest_max_files else s.signed_in_max_files end;
  perform pg_advisory_xact_lock(hashtext('flick-drops:' || uid::text));

  select count(distinct x) into wanted from unnest(coalesce(p_file_ids, '{}')) as x;
  if wanted = 0 then
    raise exception 'drop_no_files' using errcode = 'P0001';
  end if;
  if wanted > max_files then
    raise exception 'drop_too_many_files'
      using errcode = 'P0001', detail = format('Up to %s files per drop.', max_files);
  end if;

  -- Only your own files, and only ones that still exist.
  select count(*), coalesce(sum(size), 0) into found_count, total_bytes
    from public.files where id = any(p_file_ids) and user_id = uid;
  if found_count <> wanted then
    raise exception 'drop_files_not_found' using errcode = 'P0001';
  end if;

  if is_guest then
    if total_bytes > s.guest_max_total_mb::bigint * 1024 * 1024 then
      raise exception 'drop_too_big'
        using errcode = 'P0001', detail = format('Up to %s MB without signing in.', s.guest_max_total_mb);
    end if;
    select count(*) into recent from public.drops
      where owner_id = uid and created_at > now() - interval '1 hour';
    if recent >= s.guest_drops_per_hour then
      raise exception 'drop_rate_limit' using errcode = 'P0001';
    end if;
  end if;

  ttl := make_interval(mins => case when is_guest then s.guest_ttl_minutes else s.signed_in_ttl_minutes end);
  expiry := now() + ttl;
  files_expiry := public.flick_files_expiry(p_file_ids);
  if files_expiry is not null then
    expiry := least(expiry, files_expiry);
  end if;

  loop
    attempt := attempt + 1;
    new_code := public.flick_new_drop_code();
    begin
      insert into public.drops (owner_id, code, token_hash, expires_at)
      values (uid, new_code, p_token_hash, expiry)
      returning id into new_id;
      exit;
    exception when unique_violation then
      -- A clash on the code: try another. A clash on the token hash is a
      -- client bug (same token twice); give up rather than loop.
      if attempt >= 8 or exists (select 1 from public.drops where token_hash = p_token_hash) then
        raise;
      end if;
    end;
  end loop;

  insert into public.drop_files (drop_id, file_id, position)
  select new_id, f.id, (row_number() over (order by f.created_at, f.id) - 1)::smallint
  from public.files f where f.id = any(p_file_ids) and f.user_id = uid;

  return query select new_id, new_code, expiry;
end;
$$;

revoke all on function public.create_drop(uuid[], text) from public, anon;
grant execute on function public.create_drop(uuid[], text) to authenticated;

-- 5. Sign in → longer links --------------------------------------------------------------
-- Call after linking an account and refreshing the session. A guest (still
-- anonymous) gets 0. Only links that are still alive are extended: an
-- expired or revoked link is never brought back.

create or replace function public.extend_my_drops()
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  uid uuid := auth.uid();
  is_guest boolean := coalesce((auth.jwt() ->> 'is_anonymous')::boolean, false);
  ttl interval;
  changed integer;
begin
  if uid is null or is_guest then
    return 0;
  end if;
  select make_interval(mins => signed_in_ttl_minutes) into ttl from public.share_settings;

  with target as (
    select d.id,
      least(
        d.created_at + ttl,
        coalesce(
          (select public.flick_files_expiry(array_agg(df.file_id))
             from public.drop_files df where df.drop_id = d.id),
          'infinity'::timestamptz
        )
      ) as new_expiry
    from public.drops d
    where d.owner_id = uid and d.revoked_at is null and d.expires_at > now()
  )
  update public.drops d set expires_at = t.new_expiry
  from target t
  where d.id = t.id and t.new_expiry > d.expires_at;

  get diagnostics changed = row_count;
  return changed;
end;
$$;

revoke all on function public.extend_my_drops() from public, anon;
grant execute on function public.extend_my_drops() to authenticated;

-- 6. Used by the drop-resolve Edge Function (service role only) -----------------------

-- Generic one-minute bucket: returns false once p_max is passed.
create table if not exists public.rate_limit_buckets (
  bucket text primary key,
  window_started_at timestamptz not null default now(),
  request_count integer not null default 0 check (request_count >= 0)
);
alter table public.rate_limit_buckets enable row level security;
revoke all on table public.rate_limit_buckets from public, anon, authenticated;

create or replace function public.flick_rate_limit(p_bucket text, p_max integer)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  current_count integer;
begin
  insert into public.rate_limit_buckets (bucket, window_started_at, request_count)
  values (p_bucket, now(), 1)
  on conflict (bucket) do update set
    window_started_at = case
      when public.rate_limit_buckets.window_started_at <= now() - interval '1 minute' then now()
      else public.rate_limit_buckets.window_started_at end,
    request_count = case
      when public.rate_limit_buckets.window_started_at <= now() - interval '1 minute' then 1
      else public.rate_limit_buckets.request_count + 1 end
  returning request_count into current_count;

  delete from public.rate_limit_buckets where window_started_at < now() - interval '1 day';
  return current_count <= p_max;
end;
$$;
revoke all on function public.flick_rate_limit(text, integer) from public, anon, authenticated;
grant execute on function public.flick_rate_limit(text, integer) to service_role;

-- Counts opens and downloads. A download is counted when the signed URL is
-- handed out, so it is "download started", not "download finished". Returns
-- false when max_downloads is already used up (then no URL is given).
create or replace function public.record_drop_event(p_drop_id uuid, p_kind text)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  ok boolean;
begin
  if p_kind = 'open' then
    update public.drops set open_count = open_count + 1 where id = p_drop_id returning true into ok;
  elsif p_kind = 'download' then
    update public.drops set download_count = download_count + 1
      where id = p_drop_id and (max_downloads is null or download_count < max_downloads)
      returning true into ok;
  else
    raise exception 'unknown event kind' using errcode = '22023';
  end if;
  return coalesce(ok, false);
end;
$$;
revoke all on function public.record_drop_event(uuid, text) from public, anon, authenticated;
grant execute on function public.record_drop_event(uuid, text) to service_role;

-- Files of guests whose drops are over (expired or revoked), plus files a
-- guest uploaded but never shared (after the guest window and an hour of
-- grace). The expire-files job deletes these; signed-in users' files stay on
-- the normal 24-hour rule.
create or replace function public.flick_expired_guest_files(p_limit integer default 500)
returns table (id uuid, storage_path text, thumb_path text)
language sql
stable
security definer
set search_path = public
as $$
  select f.id, f.storage_path, f.thumb_path
  from public.files f
  join auth.users u on u.id = f.user_id and u.is_anonymous
  where not f.pinned
    and (
      (
        exists (select 1 from public.drop_files df where df.file_id = f.id)
        and not exists (
          select 1 from public.drop_files df
          join public.drops d on d.id = df.drop_id
          where df.file_id = f.id and d.revoked_at is null and d.expires_at > now()
        )
      )
      or (
        not exists (select 1 from public.drop_files df where df.file_id = f.id)
        and f.created_at < now() - (
          make_interval(mins => (select guest_ttl_minutes from public.share_settings)) + interval '1 hour'
        )
      )
    )
  order by f.created_at
  limit p_limit;
$$;
revoke all on function public.flick_expired_guest_files(integer) from public, anon, authenticated;
grant execute on function public.flick_expired_guest_files(integer) to service_role;
