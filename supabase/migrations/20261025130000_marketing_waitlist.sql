-- Anonymous waitlist for the eqlShare marketing site.
-- The existing public.waitlist table belongs to the authenticated app flows.
create extension if not exists pgcrypto;

create table if not exists public.marketing_waitlist (
  id uuid primary key default gen_random_uuid(),
  email text unique not null,
  use_type text,
  source text,
  created_at timestamptz not null default now(),
  constraint marketing_waitlist_email_lowercase check (email = lower(email))
);

alter table public.marketing_waitlist enable row level security;
revoke all on table public.marketing_waitlist from public, anon, authenticated;
grant insert on table public.marketing_waitlist to anon;
drop policy if exists "Allow anonymous marketing waitlist inserts" on public.marketing_waitlist;
create policy "Allow anonymous marketing waitlist inserts"
  on public.marketing_waitlist for insert to anon with check (true);
