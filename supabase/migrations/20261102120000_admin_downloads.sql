-- Admin allowlist, public download links, and installer storage for the website dashboard.
-- After running this, add yourself as an admin (see the end of this file).

-- 1) Who is an admin. No policies on purpose: nobody can read or write this table
--    through the API. Only the SQL editor / service role can change it.
create table if not exists public.admins (
  email text primary key check (email = lower(email))
);
alter table public.admins enable row level security;
revoke all on table public.admins from public, anon, authenticated;

-- True only when the signed-in user's email is on the allowlist AND that email is confirmed.
create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.admins a
    join auth.users u on lower(u.email) = a.email
    where u.id = auth.uid()
      and u.email_confirmed_at is not null
  );
$$;
revoke all on function public.is_admin() from public;
grant execute on function public.is_admin() to anon, authenticated;

-- 2) One row per place people can get the app.
create table if not exists public.platform_downloads (
  key text primary key check (key in ('mac', 'windows', 'ios', 'android', 'microsoft')),
  label text not null,
  status text not null default 'hidden' check (status in ('live', 'coming_soon', 'hidden')),
  url text,
  storage_path text,
  version text,
  release_notes text,
  sha256 text,
  size_bytes bigint,
  download_count bigint not null default 0,
  updated_at timestamptz not null default now()
);

alter table public.platform_downloads enable row level security;
revoke all on table public.platform_downloads from public, anon, authenticated;
grant select on table public.platform_downloads to anon, authenticated;
grant insert, update, delete on table public.platform_downloads to authenticated;

-- Visitors see only live / coming-soon rows. Admins see everything and are the only ones who can write.
drop policy if exists "Read visible downloads" on public.platform_downloads;
create policy "Read visible downloads" on public.platform_downloads
  for select to anon, authenticated
  using (status <> 'hidden' or public.is_admin());

drop policy if exists "Admins insert downloads" on public.platform_downloads;
create policy "Admins insert downloads" on public.platform_downloads
  for insert to authenticated with check (public.is_admin());

drop policy if exists "Admins update downloads" on public.platform_downloads;
create policy "Admins update downloads" on public.platform_downloads
  for update to authenticated using (public.is_admin()) with check (public.is_admin());

drop policy if exists "Admins delete downloads" on public.platform_downloads;
create policy "Admins delete downloads" on public.platform_downloads
  for delete to authenticated using (public.is_admin());

insert into public.platform_downloads (key, label) values
  ('mac', 'Mac'),
  ('windows', 'Windows'),
  ('ios', 'iPhone (App Store)'),
  ('android', 'Android (Google Play)'),
  ('microsoft', 'Microsoft Store')
on conflict (key) do nothing;

-- 3) Counted download. The website's /download/<key> route calls this, then redirects.
--    Only live rows can be counted. Returns the link, or 'storage:<path>' for an uploaded file.
create or replace function public.record_download(p_key text)
returns text
language plpgsql
security definer
set search_path = public
as $$
declare
  v_url text;
  v_path text;
begin
  update public.platform_downloads
     set download_count = download_count + 1
   where key = p_key and status = 'live'
  returning url, storage_path into v_url, v_path;
  if not found then
    return null;
  end if;
  if v_path is not null and v_path <> '' then
    return 'storage:' || v_path;
  end if;
  return v_url;
end;
$$;
revoke all on function public.record_download(text) from public;
grant execute on function public.record_download(text) to anon, authenticated;

-- 4) Storage for the Mac and Windows installers. Files are public to download (that is the point),
--    but only admins can upload, replace or delete them.
--    Note: the per-file cap cannot exceed the project's global limit (Supabase Settings > Storage).
insert into storage.buckets (id, name, public, file_size_limit)
values ('downloads', 'downloads', true, 524288000)
on conflict (id) do update set public = true, file_size_limit = excluded.file_size_limit;

drop policy if exists "Admins manage download files" on storage.objects;
create policy "Admins manage download files" on storage.objects
  for all to authenticated
  using (bucket_id = 'downloads' and public.is_admin())
  with check (bucket_id = 'downloads' and public.is_admin());

-- 5) Make yourself the admin (run this once, with your own email, in the SQL editor):
--    insert into public.admins (email) values ('you@example.com');
