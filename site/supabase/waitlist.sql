create extension if not exists pgcrypto;

create table if not exists public.waitlist (
  id uuid primary key default gen_random_uuid(),
  email text unique not null,
  use_type text,
  source text,
  created_at timestamptz not null default now(),
  constraint waitlist_email_lowercase check (email = lower(email))
);

alter table public.waitlist enable row level security;
create policy "Allow anonymous waitlist inserts" on public.waitlist for insert to anon with check (true);
