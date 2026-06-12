-- Reschedules the steam-sync cron to run at midnight (Europe/Paris, UTC+2 in summer = 22:00 UTC).
select cron.unschedule('steam-sync-daily');

select
  cron.schedule(
    'steam-sync-daily',
    '0 22 * * *',
    $$
    select net.http_post(
      url := 'https://hcmsaukacbptmzypemqx.supabase.co/functions/v1/steam-sync',
      headers := '{"Content-Type": "application/json"}'::jsonb,
      body := '{}'::jsonb
    );
    $$
  );
