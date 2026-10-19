-- OPTIONAL: scheduled push notifications.
-- Before running: replace YOUR-PROJECT-REF and YOUR_CRON_SECRET (both appear twice).
-- Times are in UTC. 07:00 UTC = 09:00 in Madrid/Rome in summer, 08:00 in winter.

create extension if not exists pg_cron;
create extension if not exists pg_net;

-- "🌍 Today's word is ready!" every morning
select cron.schedule('kelma-word-ready', '0 7 * * *', $$
  select net.http_post(
    url := 'https://YOUR-PROJECT-REF.supabase.co/functions/v1/daily-reminders',
    headers := jsonb_build_object('Content-Type', 'application/json', 'x-cron-secret', 'YOUR_CRON_SECRET'),
    body := jsonb_build_object('kind', 'word_ready')
  );
$$);

-- "🔥 Don't lose your streak!" every evening, only to whoever has not answered yet
select cron.schedule('kelma-streak-reminder', '0 18 * * *', $$
  select net.http_post(
    url := 'https://YOUR-PROJECT-REF.supabase.co/functions/v1/daily-reminders',
    headers := jsonb_build_object('Content-Type', 'application/json', 'x-cron-secret', 'YOUR_CRON_SECRET'),
    body := jsonb_build_object('kind', 'streak')
  );
$$);

-- To remove them later:
-- select cron.unschedule('kelma-word-ready');
-- select cron.unschedule('kelma-streak-reminder');
