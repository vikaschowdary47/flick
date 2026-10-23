-- Service-owned deletion marker prevents uploads racing storage cleanup.
begin;
create table if not exists public.account_deletions (
  user_id uuid primary key references auth.users(id) on delete cascade,
  started_at timestamptz not null default now()
);
alter table public.account_deletions enable row level security;
revoke all on public.account_deletions from public, anon, authenticated;
grant all on public.account_deletions to service_role;
create or replace function public.flick_account_active()
returns boolean language sql stable security definer set search_path = '' as $$
  select exists (select 1 from auth.users where id = auth.uid())
    and not exists (select 1 from public.account_deletions where user_id = auth.uid());
$$;
revoke all on function public.flick_account_active() from public, anon;
grant execute on function public.flick_account_active() to authenticated;
drop policy if exists "Block Flick storage during account deletion" on storage.objects;
create policy "Block Flick storage during account deletion" on storage.objects
  as restrictive for all to authenticated
  using (bucket_id <> 'flick-files' or (select public.flick_account_active()))
  with check (bucket_id <> 'flick-files' or (select public.flick_account_active()));
commit;
