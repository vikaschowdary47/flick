-- Display density (Comfy = the original big cards, Compact = rows/grid/chips),
-- per user and synced across devices. Everyone starts on Compact.
-- Run in the Supabase SQL Editor (or `supabase db push`). Safe to run twice.

alter table public.profiles
  add column if not exists ui_density text not null default 'compact';

alter table public.profiles drop constraint if exists profiles_ui_density_check;
alter table public.profiles
  add constraint profiles_ui_density_check check (ui_density in ('comfy', 'compact'));

-- Users may change this column on their own row only. The existing policy
-- "Users can update their own clipboard setting" already limits updates to
-- the user's own row; column grants decide which columns (never "plan").
grant update (ui_density) on table public.profiles to authenticated;

-- profiles is already in the supabase_realtime publication (feature flags
-- migration), so a change on one device reaches the others live.
