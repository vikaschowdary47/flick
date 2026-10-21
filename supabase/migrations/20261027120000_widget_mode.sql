-- Which widgets are on, per device (each phone decides for itself).
-- iOS: home, lock, lock_content (show names/text on the Lock Screen),
-- live_activity. Android: android_widget, bubble (floating bubble, also
-- gated by feature_flags.bubble_enabled when it ships).
-- Run in the Supabase SQL Editor (or `supabase db push`). Safe to run twice.

alter table public.devices
  add column if not exists widget_mode jsonb not null default
    '{"home": true, "lock": true, "lock_content": false, "live_activity": true, "android_widget": true, "bubble": false}'::jsonb;

-- Only an object of known boolean switches. (A function, because CHECK
-- constraints can't contain subqueries.)
create or replace function public.flick_valid_widget_mode(mode jsonb)
returns boolean
language sql
immutable
as $$
  select jsonb_typeof(mode) = 'object'
    and mode - array['home', 'lock', 'lock_content', 'live_activity', 'android_widget', 'bubble'] = '{}'::jsonb
    and coalesce((select bool_and(jsonb_typeof(value) = 'boolean') from jsonb_each(mode)), true);
$$;

alter table public.devices drop constraint if exists devices_widget_mode_shape;
alter table public.devices
  add constraint devices_widget_mode_shape check (public.flick_valid_widget_mode(widget_mode));

-- Apps may change this (and the name) on their own device rows only; the
-- existing "Users can rename their own devices" policy limits rows.
grant update (widget_mode) on table public.devices to authenticated;
