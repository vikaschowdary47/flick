-- Add onboarding to the existing plan/preferences profile; keep user_id as its key.
begin;
alter table public.profiles
  add column if not exists display_name text,
  add column if not exists account_type text,
  add column if not exists onboarded_at timestamptz;
alter table public.profiles drop constraint if exists profiles_account_type_check;
alter table public.profiles add constraint profiles_account_type_check
  check (account_type in ('personal', 'business'));
alter table public.profiles drop constraint if exists profiles_onboarding_check;
alter table public.profiles add constraint profiles_onboarding_check check (
  onboarded_at is null or
  (display_name is not null and length(btrim(display_name)) between 1 and 80
   and account_type is not null)
);
alter table public.profiles enable row level security;
-- Existing SELECT/UPDATE policies already restrict access to auth.uid() = user_id.
-- Column grants preserve the prohibition on changing plan/user_id/created_at.
grant update (display_name, account_type, onboarded_at) on public.profiles to authenticated;

-- Heal a missing legacy profile without granting client INSERT or plan writes.
create or replace function public.ensure_my_profile()
returns public.profiles
language plpgsql security definer set search_path = ''
as $$
declare result public.profiles;
begin
  if auth.uid() is null then raise exception 'Authentication required' using errcode = '42501'; end if;
  insert into public.profiles (user_id) values (auth.uid()) on conflict (user_id) do nothing;
  select * into strict result from public.profiles where user_id = auth.uid();
  return result;
end;
$$;
revoke all on function public.ensure_my_profile() from public, anon;
grant execute on function public.ensure_my_profile() to authenticated;
commit;
