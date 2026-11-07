-- M5: every alert we owe someone. Doubles as the in-app inbox (M6).
-- Run in Supabase → SQL Editor → New query → Run. Safe to re-run.

create table if not exists public.notifications (
  id         bigint generated always as identity primary key,
  user_id    uuid not null references public.profiles (id) on delete cascade,
  set_num    text not null references public.sets (set_num) on delete cascade,
  -- 'now_available' arrives with Brickset; 'back_in_stock' is Phase 2.
  kind       text not null check (kind in ('new_set', 'now_available', 'back_in_stock')),
  -- pending → sending → sent. Waits as 'pending' during quiet hours.
  status     text not null default 'pending' check (status in ('pending', 'sending', 'sent')),
  created_at timestamptz not null default now(),
  sent_at    timestamptz,
  devices_reached integer,
  -- One alert per person, per set, per kind. Ever. Re-running the job
  -- (or two runs overlapping) can't double-alert anyone.
  unique (user_id, set_num, kind)
);

create index if not exists notifications_unsent_idx
  on public.notifications (status) where status <> 'sent';
create index if not exists notifications_user_idx
  on public.notifications (user_id, created_at desc);

alter table public.notifications enable row level security; -- server-only
