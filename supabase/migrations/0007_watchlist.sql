-- M7: sets a person is watching individually.
-- Run in Supabase → SQL Editor → New query → Run. Safe to re-run.
--
-- Today: watchers get the "now in stores" alert for the set even if they
-- don't follow its theme.
-- Phase 2 (designed for, not built): back-in-stock alerts would key off
-- this same table, e.g. with a stock_checks table (set_num, source,
-- in_stock, checked_at) and the 'back_in_stock' alert kind that already
-- exists in notifications.

create table if not exists public.watchlist_items (
  user_id    uuid not null references public.profiles (id) on delete cascade,
  set_num    text not null references public.sets (set_num) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (user_id, set_num)
);

create index if not exists watchlist_items_set_idx on public.watchlist_items (set_num);

alter table public.watchlist_items enable row level security; -- server-only
