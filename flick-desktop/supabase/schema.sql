-- Run this script in the Supabase SQL Editor for your project.

create table if not exists public.files (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  name text not null check (length(trim(name)) > 0),
  size bigint not null check (size >= 0 and size <= 52428800),
  mime_type text not null default 'application/octet-stream',
  storage_path text not null unique,
  created_at timestamptz not null default now(),
  delivered_at timestamptz,
  constraint files_storage_path_belongs_to_user
    check (split_part(storage_path, '/', 1) = user_id::text)
);

create index if not exists files_user_created_at_idx
  on public.files (user_id, created_at desc);

alter table public.files enable row level security;

revoke all on table public.files from public, anon;
grant select, insert, update, delete on table public.files to authenticated;

drop policy if exists "Users can read their own files" on public.files;
create policy "Users can read their own files"
  on public.files for select
  to authenticated
  using ((select auth.uid()) = user_id);

drop policy if exists "Users can add their own files" on public.files;
create policy "Users can add their own files"
  on public.files for insert
  to authenticated
  with check ((select auth.uid()) = user_id);

drop policy if exists "Users can update their own files" on public.files;
create policy "Users can update their own files"
  on public.files for update
  to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

drop policy if exists "Users can delete their own files" on public.files;
create policy "Users can delete their own files"
  on public.files for delete
  to authenticated
  using ((select auth.uid()) = user_id);

insert into storage.buckets (id, name, public, file_size_limit)
values ('flick-files', 'flick-files', false, 52428800)
on conflict (id) do update
set
  name = excluded.name,
  public = false,
  file_size_limit = excluded.file_size_limit;

drop policy if exists "Users can read their own Flick uploads" on storage.objects;
create policy "Users can read their own Flick uploads"
  on storage.objects for select
  to authenticated
  using (
    bucket_id = 'flick-files'
    and (storage.foldername(name))[1] = (select auth.uid())::text
  );

drop policy if exists "Users can upload to their own Flick folder" on storage.objects;
create policy "Users can upload to their own Flick folder"
  on storage.objects for insert
  to authenticated
  with check (
    bucket_id = 'flick-files'
    and (storage.foldername(name))[1] = (select auth.uid())::text
  );

drop policy if exists "Users can update their own Flick uploads" on storage.objects;
create policy "Users can update their own Flick uploads"
  on storage.objects for update
  to authenticated
  using (
    bucket_id = 'flick-files'
    and (storage.foldername(name))[1] = (select auth.uid())::text
  )
  with check (
    bucket_id = 'flick-files'
    and (storage.foldername(name))[1] = (select auth.uid())::text
  );

drop policy if exists "Users can delete their own Flick uploads" on storage.objects;
create policy "Users can delete their own Flick uploads"
  on storage.objects for delete
  to authenticated
  using (
    bucket_id = 'flick-files'
    and (storage.foldername(name))[1] = (select auth.uid())::text
  );

do $$
begin
  if not exists (
    select 1
    from pg_publication_tables
    where pubname = 'supabase_realtime'
      and schemaname = 'public'
      and tablename = 'files'
  ) then
    alter publication supabase_realtime add table public.files;
  end if;
end
$$;
