-- M6: alerts inbox. Remembers when each person last opened it, so we can
-- show an unread count (and the red number on the app icon).
-- Run in Supabase → SQL Editor → New query → Run. Safe to re-run.

alter table public.profiles
  add column if not exists alerts_seen_at timestamptz not null default now();
