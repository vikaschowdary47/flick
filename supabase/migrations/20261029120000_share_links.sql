-- Public share links for files. The raw link id is never stored: clients and
-- the download function store/query only its SHA-256 hex digest.
-- Run with `supabase db push` or paste into the Supabase SQL Editor.

create table if not exists public.share_links (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  file_id uuid not null references public.files (id) on delete cascade,
  id_hash text not null unique check (id_hash ~ '^[0-9a-f]{64}$'),
  expires_at timestamptz not null,
  revoked_at timestamptz,
  created_at timestamptz not null default now()
);

create index if not exists share_links_owner_created_idx
  on public.share_links (owner_id, created_at desc);
create index if not exists share_links_file_id_idx
  on public.share_links (file_id);

-- Reuse the existing Notify-me flow for the current 50 MB share-link cap.
alter table public.waitlist drop constraint if exists waitlist_limit_hit_check;
alter table public.waitlist
  add constraint waitlist_limit_hit_check check (limit_hit in ('pins', 'storage', 'devices', 'sharing'));

alter table public.share_links enable row level security;
revoke all on table public.share_links from public, anon;
grant select, insert, update, delete on table public.share_links to authenticated;

drop policy if exists "Owners can read their share links" on public.share_links;
create policy "Owners can read their share links"
  on public.share_links for select
  to authenticated
  using ((select auth.uid()) = owner_id);

drop policy if exists "Owners can create file share links" on public.share_links;
create policy "Owners can create file share links"
  on public.share_links for insert
  to authenticated
  with check (
    (select auth.uid()) = owner_id
    and exists (
      select 1 from public.files
      where files.id = file_id and files.user_id = (select auth.uid())
    )
  );

drop policy if exists "Owners can update their share links" on public.share_links;
create policy "Owners can update their share links"
  on public.share_links for update
  to authenticated
  using ((select auth.uid()) = owner_id)
  with check ((select auth.uid()) = owner_id);

drop policy if exists "Owners can delete their share links" on public.share_links;
create policy "Owners can delete their share links"
  on public.share_links for delete
  to authenticated
  using ((select auth.uid()) = owner_id);

-- Do not let a client extend a link beyond the file's remaining lifetime or
-- beyond the v1 24-hour public-link lifetime. Pinned files still get a
-- 24-hour link; an unpinned file's link ends with its normal file lifetime.
create or replace function public.share_links_enforce_expiry()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  source_file public.files;
  file_expires_at timestamptz;
begin
  if tg_op = 'UPDATE' then
    new.id := old.id;
    new.owner_id := old.owner_id;
    new.file_id := old.file_id;
    new.id_hash := old.id_hash;
    new.created_at := old.created_at;
  end if;

  select * into source_file from public.files where id = new.file_id;
  if not found then
    raise exception 'file no longer exists' using errcode = '23503';
  end if;
  if source_file.size > 52428800 then
    raise exception 'share_link_size_limit' using errcode = '22000';
  end if;

  if source_file.pinned then
    file_expires_at := now() + interval '24 hours';
  else
    file_expires_at := greatest(
      source_file.created_at,
      coalesce(source_file.unpinned_at, source_file.created_at)
    ) + interval '24 hours';
  end if;
  new.expires_at := least(new.expires_at, now() + interval '24 hours', file_expires_at);
  return new;
end;
$$;

revoke all on function public.share_links_enforce_expiry() from public, anon, authenticated;
drop trigger if exists share_links_enforce_expiry on public.share_links;
create trigger share_links_enforce_expiry
  before insert or update on public.share_links
  for each row execute function public.share_links_enforce_expiry();

-- One atomic one-minute bucket per link. The public Edge Function calls this
-- through service-role credentials before looking up the link or signing an
-- object URL. Old buckets are opportunistically removed by the same call.
create table if not exists public.share_link_rate_limits (
  id_hash text primary key references public.share_links (id_hash) on delete cascade,
  window_started_at timestamptz not null default now(),
  request_count integer not null default 0 check (request_count >= 0)
);

-- RLS is intentionally enabled with no policies: only the security-definer
-- rate-limit function (or service role) may access these buckets.
alter table public.share_link_rate_limits enable row level security;

revoke all on table public.share_link_rate_limits from public, anon, authenticated;

create or replace function public.flick_share_link_rate_limit(p_id_hash text)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  current_count integer;
begin
  insert into public.share_link_rate_limits (id_hash, window_started_at, request_count)
  values (p_id_hash, now(), 1)
  on conflict (id_hash) do update set
    window_started_at = case
      when public.share_link_rate_limits.window_started_at <= now() - interval '1 minute' then now()
      else public.share_link_rate_limits.window_started_at
    end,
    request_count = case
      when public.share_link_rate_limits.window_started_at <= now() - interval '1 minute' then 1
      else public.share_link_rate_limits.request_count + 1
    end
  returning request_count into current_count;

  delete from public.share_link_rate_limits
  where window_started_at < now() - interval '1 day';

  return current_count <= 60;
end;
$$;

revoke all on function public.flick_share_link_rate_limit(text) from public, anon, authenticated;
grant execute on function public.flick_share_link_rate_limit(text) to service_role;
