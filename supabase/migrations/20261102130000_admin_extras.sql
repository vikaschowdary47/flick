-- Admin dashboard extras: feature switches, waitlist viewing, site announcement, overview stats.
-- Run AFTER 20261102120000_admin_downloads.sql (needs public.is_admin()).

-- 1) Feature switches: admins may flip the existing flags (clipboard, payments).
--    Everyone else stays read-only. The apps already listen live, so a change reaches every device.
grant update (enabled, description) on table public.feature_flags to authenticated;
drop policy if exists "Admins update feature flags" on public.feature_flags;
create policy "Admins update feature flags" on public.feature_flags
  for update to authenticated
  using (public.is_admin()) with check (public.is_admin());

-- 2) Admins can read both waitlists (site signups and the in-app "notify me about Pro" requests).
grant select on table public.marketing_waitlist to authenticated;
drop policy if exists "Admins read marketing waitlist" on public.marketing_waitlist;
create policy "Admins read marketing waitlist" on public.marketing_waitlist
  for select to authenticated using (public.is_admin());

drop policy if exists "Admins read pro waitlist" on public.waitlist;
create policy "Admins read pro waitlist" on public.waitlist
  for select to authenticated using (public.is_admin());

-- 3) One announcement bar for the website (a single row).
create table if not exists public.site_announcement (
  id integer primary key default 1 check (id = 1),
  enabled boolean not null default false,
  message text not null default '' check (char_length(message) <= 200),
  link_url text check (link_url is null or link_url ~* '^https?://'),
  updated_at timestamptz not null default now()
);
insert into public.site_announcement (id) values (1) on conflict (id) do nothing;

alter table public.site_announcement enable row level security;
revoke all on table public.site_announcement from public, anon, authenticated;
grant select on table public.site_announcement to anon, authenticated;
grant update on table public.site_announcement to authenticated;

drop policy if exists "Read active announcement" on public.site_announcement;
create policy "Read active announcement" on public.site_announcement
  for select to anon, authenticated using (enabled or public.is_admin());

drop policy if exists "Admins update announcement" on public.site_announcement;
create policy "Admins update announcement" on public.site_announcement
  for update to authenticated using (public.is_admin()) with check (public.is_admin());

-- 4) Numbers for the Overview tab. Admins only; anyone else gets a permission error.
create or replace function public.admin_stats()
returns jsonb
language plpgsql
stable
security definer
set search_path = public
as $$
begin
  if not public.is_admin() then
    raise exception 'not allowed' using errcode = '42501';
  end if;
  return jsonb_build_object(
    'users', (select count(*) from auth.users),
    'new_users_7d', (select count(*) from auth.users where created_at > now() - interval '7 days'),
    'files_now', (select count(*) from public.files),
    'bytes_stored', (select coalesce(sum(size), 0) from public.files),
    'site_waitlist', (select count(*) from public.marketing_waitlist),
    'pro_waitlist', (select count(*) from public.waitlist),
    'downloads', (select coalesce(sum(download_count), 0) from public.platform_downloads)
  );
end;
$$;
revoke all on function public.admin_stats() from public, anon;
grant execute on function public.admin_stats() to authenticated;
