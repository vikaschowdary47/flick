-- Clips: short text and links shared between a user's devices.
-- Same rules as files: only your own rows, live updates, gone after 24 hours.
-- Run in the Supabase SQL Editor (or `supabase db push`). Safe to run twice.

create table if not exists public.clips (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  device_id uuid references public.devices (id) on delete set null,
  kind text not null check (kind in ('text', 'link')),
  content text not null check (char_length(content) between 1 and 10000),
  created_at timestamptz not null default now(),
  expires_at timestamptz not null default now() + interval '24 hours'
);

create index if not exists clips_user_created_at_idx
  on public.clips (user_id, created_at desc);

alter table public.clips enable row level security;

revoke all on table public.clips from public, anon;
grant select, insert, delete on table public.clips to authenticated;

drop policy if exists "Users can read their own clips" on public.clips;
create policy "Users can read their own clips"
  on public.clips for select
  to authenticated
  using ((select auth.uid()) = user_id);

drop policy if exists "Users can add their own clips" on public.clips;
create policy "Users can add their own clips"
  on public.clips for insert
  to authenticated
  with check ((select auth.uid()) = user_id);

drop policy if exists "Users can delete their own clips" on public.clips;
create policy "Users can delete their own clips"
  on public.clips for delete
  to authenticated
  using ((select auth.uid()) = user_id);

-- On insert: the clip expires 24 hours after creation (clients can't change
-- that), names only one of the owner's own devices, and only the 20 newest
-- clips per user are kept.
create or replace function public.clips_before_insert()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  new.created_at := now();
  new.expires_at := now() + interval '24 hours';
  if new.device_id is not null and not exists (
    select 1 from public.devices where id = new.device_id and user_id = new.user_id
  ) then
    raise exception 'device does not belong to this user' using errcode = '42501';
  end if;
  return new;
end;
$$;

create or replace function public.clips_keep_newest()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  delete from public.clips
  where user_id = new.user_id
    and id not in (
      select id from public.clips
      where user_id = new.user_id
      order by created_at desc, id desc
      limit 20
    );
  return null;
end;
$$;

revoke all on function public.clips_before_insert() from public, anon, authenticated;
revoke all on function public.clips_keep_newest() from public, anon, authenticated;

drop trigger if exists clips_before_insert on public.clips;
create trigger clips_before_insert
  before insert on public.clips
  for each row execute function public.clips_before_insert();

drop trigger if exists clips_keep_newest on public.clips;
create trigger clips_keep_newest
  after insert on public.clips
  for each row execute function public.clips_keep_newest();

-- Live updates on every device.
do $$
begin
  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'clips'
  ) then
    alter publication supabase_realtime add table public.clips;
  end if;
end
$$;

-- Expiry: clips have no stored file, so a plain SQL job is enough (hourly,
-- like expire-files). The apps also hide clips past expires_at.
do $$
begin
  if exists (select 1 from cron.job where jobname = 'flick-expire-clips-hourly') then
    perform cron.unschedule('flick-expire-clips-hourly');
  end if;
  perform cron.schedule(
    'flick-expire-clips-hourly',
    '15 * * * *',
    $job$delete from public.clips where expires_at < now()$job$
  );
end
$$;
