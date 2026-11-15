-- Dismissing alerts in the inbox.
-- Run in Supabase → SQL Editor → New query → Run. Safe to re-run.
--
-- Dismiss HIDES an alert; it doesn't delete the row. The row is what
-- guarantees "one alert per person, per set, per kind, ever", so deleting
-- it could let the same alert be sent again.

alter table public.notifications add column if not exists dismissed_at timestamptz;
