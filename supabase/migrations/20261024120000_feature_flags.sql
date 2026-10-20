-- Feature switches in the database instead of app constants, and the
-- Clipboard sharing setting on the user's profile (synced across devices).
-- Run in the Supabase SQL Editor (or `supabase db push`). Safe to run twice.

-- 1. Developer switches ---------------------------------------------------------
-- Edit these in the dashboard: Table Editor → feature_flags → toggle "enabled".
-- Signed-in users can only read them; there are no write grants, so only the
-- dashboard (service role / postgres) can change them.

create table if not exists public.feature_flags (
  name text primary key,
  enabled boolean not null default false,
  description text
);

insert into public.feature_flags (name, enabled, description) values
  ('clipboard', true, 'Clips (text and links). Off hides Clips everywhere and blocks reading/adding clips.'),
  ('payments', false, 'Upgrade/purchase UI. Off shows the Pro waitlist button on limit screens instead.')
on conflict (name) do nothing;

alter table public.feature_flags enable row level security;
revoke all on table public.feature_flags from public, anon, authenticated;
grant select on table public.feature_flags to authenticated;

drop policy if exists "Signed-in users can read feature flags" on public.feature_flags;
create policy "Signed-in users can read feature flags"
  on public.feature_flags for select
  to authenticated
  using (true);

-- 2. Clipboard sharing, per user (on by default, existing users included) --------

alter table public.profiles
  add column if not exists clipboard_enabled boolean not null default true;

-- Users may change only this column, only on their own row (never "plan").
grant update (clipboard_enabled) on table public.profiles to authenticated;

drop policy if exists "Users can update their own clipboard setting" on public.profiles;
create policy "Users can update their own clipboard setting"
  on public.profiles for update
  to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

-- 3. Clips need both switches ----------------------------------------------------

create or replace function public.flick_clips_allowed(p_user_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select
    coalesce((select enabled from public.feature_flags where name = 'clipboard'), false)
    and coalesce((select clipboard_enabled from public.profiles where user_id = p_user_id), false);
$$;

revoke all on function public.flick_clips_allowed(uuid) from public, anon;
grant execute on function public.flick_clips_allowed(uuid) to authenticated;

drop policy if exists "Users can read their own clips" on public.clips;
create policy "Users can read their own clips"
  on public.clips for select
  to authenticated
  using ((select auth.uid()) = user_id and public.flick_clips_allowed((select auth.uid())));

drop policy if exists "Users can add their own clips" on public.clips;
create policy "Users can add their own clips"
  on public.clips for insert
  to authenticated
  with check ((select auth.uid()) = user_id and public.flick_clips_allowed((select auth.uid())));

-- Deleting your own clips stays allowed either way.

-- 4. Live updates: flag changes and setting changes reach every device ------------

do $$
begin
  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'feature_flags'
  ) then
    alter publication supabase_realtime add table public.feature_flags;
  end if;
  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'profiles'
  ) then
    alter publication supabase_realtime add table public.profiles;
  end if;
end
$$;
