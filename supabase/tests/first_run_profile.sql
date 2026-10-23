-- Run on a disposable Supabase database after all migrations, as postgres.
-- All test data rolls back. A pre-existing profile is removed to exercise healing.
begin;
insert into auth.users (id) values
 ('10000000-0000-4000-8000-000000000001'),
 ('10000000-0000-4000-8000-000000000002');
delete from public.profiles where user_id = '10000000-0000-4000-8000-000000000001';
set local role authenticated;
select set_config('request.jwt.claim.sub', '10000000-0000-4000-8000-000000000001', true);
select public.ensure_my_profile();
select public.ensure_my_profile();
do $$
begin
  if (select count(*) from public.profiles) <> 1 then raise exception 'RLS isolation or profile healing failed'; end if;
  if (select onboarded_at from public.profiles) is not null then raise exception 'Existing user skipped onboarding'; end if;
  begin
    update public.profiles set plan = 'free';
    raise exception 'Client can update plan';
  exception when insufficient_privilege then null;
  end;
  begin
    update public.profiles set display_name = ' ', account_type = 'personal', onboarded_at = now();
    raise exception 'Blank name accepted';
  exception when check_violation then null;
  end;
  begin
    update public.profiles set account_type = 'other';
    raise exception 'Invalid account type accepted';
  exception when check_violation then null;
  end;
end $$;
update public.profiles set display_name = 'Flick Tester', account_type = 'business', onboarded_at = now();
do $$
begin
  if not exists (select 1 from public.profiles where onboarded_at is not null and display_name = 'Flick Tester') then
    raise exception 'Own profile save failed';
  end if;
  update public.profiles set display_name = 'Attacked' where user_id = '10000000-0000-4000-8000-000000000002';
  if found then raise exception 'Cross-user update allowed'; end if;
end $$;
reset role;
do $$
begin
  if exists (select 1 from public.profiles where display_name = 'Attacked') then raise exception 'Cross-user write'; end if;
end $$;
rollback;
