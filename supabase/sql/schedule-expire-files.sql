-- Schedule the expire-files Edge Function to run every hour.
-- Run this once in the Supabase dashboard: SQL Editor → New query → Run.
-- It does NOT change any tables or policies. It enables two extensions,
-- stores two secrets in Vault, and creates one cron job.
--
-- BEFORE RUNNING, replace the two placeholders:
--   <PROJECT_REF>  your project ref, e.g. abcdefghijklmnop (from the project URL)
--   <CRON_SECRET>  the same random value you set with:
--                  supabase secrets set CRON_SECRET=...

-- 1. Extensions (no-op if already enabled)
create extension if not exists pg_cron;
create extension if not exists pg_net;

-- 2. Secrets in Vault, so they aren't stored in plain text in the cron job
select vault.create_secret('https://<PROJECT_REF>.supabase.co', 'flick_project_url');
select vault.create_secret('<CRON_SECRET>', 'flick_expire_files_secret');

-- 3. Hourly job, at minute 0 of every hour
select cron.schedule(
  'flick-expire-files-hourly',
  '0 * * * *',
  $$
  select net.http_post(
    url := (select decrypted_secret from vault.decrypted_secrets where name = 'flick_project_url')
           || '/functions/v1/expire-files',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'x-cron-secret', (select decrypted_secret from vault.decrypted_secrets where name = 'flick_expire_files_secret')
    ),
    body := '{}'::jsonb,
    timeout_milliseconds := 60000
  ) as request_id;
  $$
);

-- Check it:
--   select jobid, jobname, schedule, active from cron.job;
--   select * from cron.job_run_details order by start_time desc limit 5;
--   select id, status_code, content from net._http_response order by created desc limit 5;
--
-- Undo:
--   select cron.unschedule('flick-expire-files-hourly');
--   delete from vault.secrets where name in ('flick_project_url', 'flick_expire_files_secret');
