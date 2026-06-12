-- Schedules the steam-sync edge function to run once a day, syncing every
-- linked Steam account's library playtime and wishlist into game_entries.
create extension if not exists pg_cron with schema extensions;
create extension if not exists pg_net with schema extensions;

select
  cron.schedule(
    'steam-sync-daily',
    '0 5 * * *',
    $$
    select net.http_post(
      url := 'https://hcmsaukacbptmzypemqx.supabase.co/functions/v1/steam-sync',
      headers := '{"Content-Type": "application/json"}'::jsonb,
      body := '{}'::jsonb
    );
    $$
  );
