-- Disposable Supabase database only, as postgres, after both auth migrations.
begin;
insert into auth.users (id) values ('10000000-0000-4000-8000-000000000011');
insert into public.devices (id,user_id,name,platform) values ('20000000-0000-4000-8000-000000000011','10000000-0000-4000-8000-000000000011','Delete test','ios');
insert into public.files (id,user_id,name,size,storage_path,device_id) values
 ('30000000-0000-4000-8000-000000000011','10000000-0000-4000-8000-000000000011','test.txt',10,'10000000-0000-4000-8000-000000000011/test.txt','20000000-0000-4000-8000-000000000011');
insert into public.clips (user_id,device_id,kind,content) values
 ('10000000-0000-4000-8000-000000000011','20000000-0000-4000-8000-000000000011','text','Delete this clip');
insert into public.waitlist (user_id,email,limit_hit) values ('10000000-0000-4000-8000-000000000011','delete-test@flick.invalid','storage');
insert into public.share_links (owner_id,file_id,id_hash,expires_at) values
 ('10000000-0000-4000-8000-000000000011','30000000-0000-4000-8000-000000000011',repeat('a',64),now()+interval '1 hour');
insert into public.share_link_rate_limits (id_hash) values (repeat('a',64));
set local role authenticated;
select set_config('request.jwt.claim.sub', '10000000-0000-4000-8000-000000000011', true);
do $$ begin
 if not public.flick_account_active() then raise exception 'Live account blocked'; end if;
end $$;
insert into storage.objects (bucket_id, name) values ('flick-files', '10000000-0000-4000-8000-000000000011/test.txt');
reset role;
insert into public.account_deletions(user_id) values ('10000000-0000-4000-8000-000000000011');
set local role authenticated;
do $$ begin
 if public.flick_account_active() then raise exception 'Deleting account remains active'; end if;
 begin
  insert into storage.objects (bucket_id, name) values ('flick-files', '10000000-0000-4000-8000-000000000011/race.txt');
  raise exception 'Upload allowed during deletion';
 exception when insufficient_privilege then null; end;
 if exists(select 1 from storage.objects where name = '10000000-0000-4000-8000-000000000011/test.txt') then
  raise exception 'Deleted-account JWT still reads storage';
 end if;
end $$;
reset role;
-- Storage objects are removed through the API in production, before auth deletion.
delete from storage.objects where name like '10000000-0000-4000-8000-000000000011/%';
delete from auth.users where id = '10000000-0000-4000-8000-000000000011';
do $$ begin
 if exists(select 1 from public.account_deletions where user_id='10000000-0000-4000-8000-000000000011') then raise exception 'Marker did not cascade'; end if;
 if exists(select 1 from public.profiles where user_id='10000000-0000-4000-8000-000000000011') then raise exception 'Profile did not cascade'; end if;
 if exists(select 1 from public.files where user_id='10000000-0000-4000-8000-000000000011') then raise exception 'Files did not cascade'; end if;
 if exists(select 1 from public.clips where user_id='10000000-0000-4000-8000-000000000011') then raise exception 'Clips did not cascade'; end if;
 if exists(select 1 from public.devices where user_id='10000000-0000-4000-8000-000000000011') then raise exception 'Devices did not cascade'; end if;
 if exists(select 1 from public.waitlist where user_id='10000000-0000-4000-8000-000000000011') then raise exception 'Waitlist did not cascade'; end if;
 if exists(select 1 from public.share_links where owner_id='10000000-0000-4000-8000-000000000011') then raise exception 'Share links did not cascade'; end if;
 if exists(select 1 from public.share_link_rate_limits where id_hash=repeat('a',64)) then raise exception 'Link rate limits did not cascade'; end if;

end $$;
set local role authenticated;
do $$ begin
 if public.flick_account_active() then raise exception 'Deleted user JWT remains active'; end if;
 begin
  insert into storage.objects (bucket_id, name) values ('flick-files', '10000000-0000-4000-8000-000000000011/after.txt');
  raise exception 'Deleted JWT can upload';
 exception when insufficient_privilege then null; end;
end $$;
reset role;
rollback;
