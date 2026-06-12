alter type public.notification_type add value 'price_drop';

alter table public.notifications add column data jsonb;

alter table public.game_entries add column last_notified_discount integer;
