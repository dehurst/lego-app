-- M5: run Brick Drop's hourly check from Supabase's built-in scheduler.
-- NOT a migration: it contains your CRON_SECRET, so fill in the two
-- placeholders in the Supabase SQL Editor and run it there. Don't commit
-- the filled-in version.
--
--   YOUR-APP-URL     e.g. brickdrop.vercel.app
--   YOUR-CRON-SECRET the same value as CRON_SECRET in Vercel

-- pg_cron = the scheduler. pg_net = lets the database make web requests.
create extension if not exists pg_cron;
create extension if not exists pg_net;

-- At 7 minutes past every hour (times are UTC, but hourly doesn't care).
-- Running it again with the same name just replaces the schedule.
select cron.schedule(
  'brickdrop-hourly-check',
  '7 * * * *',
  $$
  select net.http_post(
    url := 'https://YOUR-APP-URL/api/cron/hourly',
    headers := jsonb_build_object(
      'Authorization', 'Bearer YOUR-CRON-SECRET',
      'Content-Type', 'application/json'
    ),
    timeout_milliseconds := 120000
  );
  $$
);

-- Handy checks:
--   select * from cron.job;                                          -- is it scheduled?
--   select * from cron.job_run_details order by start_time desc limit 5;
--   select id, status_code, left(content, 300) from net._http_response order by id desc limit 5;
-- To stop it:
--   select cron.unschedule('brickdrop-hourly-check');
