-- Runs the wishlist price check daily, shortly after the Steam sync (22:00 UTC = midnight Paris in summer).
select
  cron.schedule(
    'wishlist-price-check-daily',
    '15 22 * * *',
    $$
    select net.http_post(
      url := 'https://hcmsaukacbptmzypemqx.supabase.co/functions/v1/wishlist-price-check',
      headers := '{"Content-Type": "application/json"}'::jsonb,
      body := '{}'::jsonb
    );
    $$
  );
