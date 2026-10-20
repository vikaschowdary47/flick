-- Device names: each phone/laptop registers itself once, and every file
-- records which device sent it ("from Vikas's iPhone").
-- Run in the Supabase SQL Editor (or `supabase db push`). Safe to run twice.

create table if not exists public.devices (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  name text not null check (char_length(trim(name)) between 1 and 30),
  platform text not null check (platform in ('ios', 'android', 'macos', 'windows', 'linux', 'web', 'other')),
  created_at timestamptz not null default now()
);

create index if not exists devices_user_id_idx on public.devices (user_id);

alter table public.devices enable row level security;

revoke all on table public.devices from public, anon;
grant select, insert, update on table public.devices to authenticated;

drop policy if exists "Users can read their own devices" on public.devices;
create policy "Users can read their own devices"
  on public.devices for select
  to authenticated
  using ((select auth.uid()) = user_id);

drop policy if exists "Users can add their own devices" on public.devices;
create policy "Users can add their own devices"
  on public.devices for insert
  to authenticated
  with check ((select auth.uid()) = user_id);

drop policy if exists "Users can rename their own devices" on public.devices;
create policy "Users can rename their own devices"
  on public.devices for update
  to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

-- The sender of each file. Null for files sent before this existed, or if the
-- device row is ever removed.
alter table public.files
  add column if not exists device_id uuid references public.devices (id) on delete set null;

-- A file can only name one of its owner's own devices, and the sender is
-- fixed once the file is uploaded.
create or replace function public.files_check_device()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if tg_op = 'UPDATE' then
    new.device_id := old.device_id;
    return new;
  end if;
  if new.device_id is not null and not exists (
    select 1 from public.devices where id = new.device_id and user_id = new.user_id
  ) then
    raise exception 'device does not belong to this user' using errcode = '42501';
  end if;
  return new;
end;
$$;

revoke all on function public.files_check_device() from public, anon, authenticated;

drop trigger if exists files_check_device on public.files;
create trigger files_check_device
  before insert or update on public.files
  for each row execute function public.files_check_device();

-- Renames show up live on every device.
do $$
begin
  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'devices'
  ) then
    alter publication supabase_realtime add table public.devices;
  end if;
end
$$;
