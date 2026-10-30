-- Run on a disposable Supabase database after all migrations, as postgres.
-- Covers guest_drops: limits, expiry, sign-in extension, counters, cleanup, RLS.
-- All test data rolls back. Any failed check raises an exception.
begin;

insert into auth.users (id, is_anonymous) values
  ('20000000-0000-4000-8000-000000000001', true),   -- guest
  ('20000000-0000-4000-8000-000000000002', false);  -- another user
insert into public.files (id, user_id, name, size, mime_type, storage_path) values
  ('21000000-0000-4000-8000-000000000001', '20000000-0000-4000-8000-000000000001', 'a.jpg', 1000000, 'image/jpeg', 'g/a'),
  ('21000000-0000-4000-8000-000000000002', '20000000-0000-4000-8000-000000000001', 'b.pdf', 1000000, 'application/pdf', 'g/b'),
  ('21000000-0000-4000-8000-000000000003', '20000000-0000-4000-8000-000000000001', 'big1.bin', 30000000, 'application/octet-stream', 'g/big1'),
  ('21000000-0000-4000-8000-000000000004', '20000000-0000-4000-8000-000000000001', 'big2.bin', 30000000, 'application/octet-stream', 'g/big2'),
  ('21000000-0000-4000-8000-000000000005', '20000000-0000-4000-8000-000000000001', 'lost.txt', 10, 'text/plain', 'g/lost'),
  ('21000000-0000-4000-8000-000000000009', '20000000-0000-4000-8000-000000000002', 'theirs.txt', 10, 'text/plain', 'o/theirs');
-- "lost.txt" is a guest upload that was never shared; make it old.
update public.files set created_at = now() - interval '3 hours' where id = '21000000-0000-4000-8000-000000000005';

create or replace function pg_temp.as_user(p_uid uuid, p_anon boolean) returns void language sql as $$
  select set_config('request.jwt.claims',
    json_build_object('sub', p_uid, 'role', 'authenticated', 'is_anonymous', p_anon)::text, true);
$$;

-- 1. Master switch is off by default.
select pg_temp.as_user('20000000-0000-4000-8000-000000000001', true);
set local role authenticated;
do $$
begin
  perform * from public.create_drop(array['21000000-0000-4000-8000-000000000001']::uuid[], repeat('a', 64));
  raise exception 'FAIL: create_drop worked with guest_share off';
exception when others then
  if sqlerrm <> 'guest_share_disabled' then raise exception 'FAIL: expected guest_share_disabled, got %', sqlerrm; end if;
end $$;
reset role;
update public.feature_flags set enabled = true where name = 'guest_share';

-- 2. A guest drop: code shape, 1-hour expiry, counters at zero.
select pg_temp.as_user('20000000-0000-4000-8000-000000000001', true);
set local role authenticated;
create temp table made on commit drop as
  select * from public.create_drop(
    array['21000000-0000-4000-8000-000000000001', '21000000-0000-4000-8000-000000000002']::uuid[], repeat('a', 64));
grant select on made to authenticated;
do $$
declare m record;
begin
  select * into m from made;
  if m.code !~ '^[A-HJ-NP-Z2-9]{6}$' then raise exception 'FAIL: bad code %', m.code; end if;
  if m.expires_at > now() + interval '61 minutes' or m.expires_at < now() + interval '59 minutes' then
    raise exception 'FAIL: guest expiry should be about 1 hour, got %', m.expires_at;
  end if;
  if (select count(*) from public.drop_files where drop_id = m.drop_id) <> 2 then raise exception 'FAIL: expected 2 drop files'; end if;
  if (select open_count + download_count from public.drops where id = m.drop_id) <> 0 then raise exception 'FAIL: counters not zero'; end if;
end $$;

-- 3. Limits: too many files, someone else's file, too big, no files.
do $$
declare ids uuid[] := array(select ('21000000-0000-4000-8000-00000000000' || i)::uuid from generate_series(1, 5) i);
begin
  begin
    perform * from public.create_drop(ids || array(select gen_random_uuid() from generate_series(1, 2)), repeat('b', 64));
    raise exception 'FAIL: 7 files allowed';
  exception when others then
    if sqlerrm <> 'drop_too_many_files' then raise exception 'FAIL: expected drop_too_many_files, got %', sqlerrm; end if;
  end;
  begin
    perform * from public.create_drop(array['21000000-0000-4000-8000-000000000009']::uuid[], repeat('c', 64));
    raise exception 'FAIL: used another user''s file';
  exception when others then
    if sqlerrm <> 'drop_files_not_found' then raise exception 'FAIL: expected drop_files_not_found, got %', sqlerrm; end if;
  end;
  begin
    perform * from public.create_drop(array['21000000-0000-4000-8000-000000000003', '21000000-0000-4000-8000-000000000004']::uuid[], repeat('d', 64));
    raise exception 'FAIL: 60 MB guest drop allowed';
  exception when others then
    if sqlerrm <> 'drop_too_big' then raise exception 'FAIL: expected drop_too_big, got %', sqlerrm; end if;
  end;
  begin
    perform * from public.create_drop('{}'::uuid[], repeat('e', 64));
    raise exception 'FAIL: empty drop allowed';
  exception when others then
    if sqlerrm <> 'drop_no_files' then raise exception 'FAIL: expected drop_no_files, got %', sqlerrm; end if;
  end;
end $$;

-- 4. Per-hour limit is read from share_settings (change the number, behavior follows).
reset role;
update public.share_settings set guest_drops_per_hour = 1;
select pg_temp.as_user('20000000-0000-4000-8000-000000000001', true);
set local role authenticated;
do $$
begin
  perform * from public.create_drop(array['21000000-0000-4000-8000-000000000001']::uuid[], repeat('f', 64));
  raise exception 'FAIL: second drop in an hour allowed with limit 1';
exception when others then
  if sqlerrm <> 'drop_rate_limit' then raise exception 'FAIL: expected drop_rate_limit, got %', sqlerrm; end if;
end $$;
reset role;
update public.share_settings set guest_drops_per_hour = 10;

-- 5. Settings have hard ceilings.
do $$
begin
  update public.share_settings set guest_ttl_minutes = 5000;
  raise exception 'FAIL: 5000-minute guest ttl accepted';
exception when check_violation then null;
end $$;

-- 6. Guests cannot extend; after sign-in the same user's live drop becomes 24 hours.
select pg_temp.as_user('20000000-0000-4000-8000-000000000001', true);
set local role authenticated;
do $$ begin
  if public.extend_my_drops() <> 0 then raise exception 'FAIL: guest extended a drop'; end if;
end $$;
select pg_temp.as_user('20000000-0000-4000-8000-000000000001', false);  -- same uid, identity linked
do $$
declare e timestamptz;
begin
  if public.extend_my_drops() <> 1 then raise exception 'FAIL: signed-in user could not extend'; end if;
  select expires_at into e from public.drops where code = (select code from made);
  if e < now() + interval '23 hours' then raise exception 'FAIL: expected about 24 hours, got %', e; end if;
end $$;
reset role;

-- 7. An expired drop is not brought back; its guest files are cleanup candidates.
update public.drops set expires_at = now() - interval '1 minute' where code = (select code from made);
select pg_temp.as_user('20000000-0000-4000-8000-000000000001', false);
set local role authenticated;
do $$ begin
  if public.extend_my_drops() <> 0 then raise exception 'FAIL: expired drop was extended'; end if;
end $$;
reset role;
do $$
declare n integer;
begin
  select count(*) into n from public.flick_expired_guest_files(100)
    where id in ('21000000-0000-4000-8000-000000000001', '21000000-0000-4000-8000-000000000002');
  -- The user is no longer anonymous in the JWT, but is_anonymous on auth.users decides cleanup.
  if n <> 2 then raise exception 'FAIL: expected 2 expired guest files, got %', n; end if;
  if exists (select 1 from public.flick_expired_guest_files(100) where id = '21000000-0000-4000-8000-000000000009') then
    raise exception 'FAIL: another user''s file listed for guest cleanup';
  end if;
  if not exists (select 1 from public.flick_expired_guest_files(100) where id = '21000000-0000-4000-8000-000000000005') then
    raise exception 'FAIL: abandoned guest upload not listed';
  end if;
  if exists (select 1 from public.flick_expired_guest_files(100) where id = '21000000-0000-4000-8000-000000000003') then
    raise exception 'FAIL: fresh unshared upload listed too early';
  end if;
end $$;

-- 8. Counters and max_downloads (what the Edge Function calls).
update public.drops set expires_at = now() + interval '1 hour', max_downloads = 1 where code = (select code from made);
do $$
declare d uuid := (select id from public.drops where code = (select code from made));
begin
  perform public.record_drop_event(d, 'open');
  if not public.record_drop_event(d, 'download') then raise exception 'FAIL: first download refused'; end if;
  if public.record_drop_event(d, 'download') then raise exception 'FAIL: download past max_downloads allowed'; end if;
  if (select open_count from public.drops where id = d) <> 1 or (select download_count from public.drops where id = d) <> 1 then
    raise exception 'FAIL: counters wrong';
  end if;
end $$;

-- 9. Rate-limit bucket.
do $$
begin
  if not public.flick_rate_limit('t', 2) or not public.flick_rate_limit('t', 2) then raise exception 'FAIL: limit hit early'; end if;
  if public.flick_rate_limit('t', 2) then raise exception 'FAIL: third call allowed with max 2'; end if;
end $$;

-- 10. Privacy: another user sees no drops; anonymous (logged-out) role cannot read the table.
select pg_temp.as_user('20000000-0000-4000-8000-000000000002', false);
set local role authenticated;
do $$ begin
  if exists (select 1 from public.drops) then raise exception 'FAIL: user saw someone else''s drop'; end if;
  if exists (select 1 from public.drop_files) then raise exception 'FAIL: user saw someone else''s drop files'; end if;
end $$;
reset role;
set local role anon;
do $$ begin
  perform 1 from public.drops;
  raise exception 'FAIL: anon role could read drops';
exception when insufficient_privilege then null;
end $$;
reset role;
set local role anon;
do $$ begin
  if (select guest_ttl_minutes from public.share_settings) <> 60 then raise exception 'FAIL: settings unreadable or changed'; end if;
end $$;
reset role;

select 'guest_drops: all checks passed' as result;
rollback;
