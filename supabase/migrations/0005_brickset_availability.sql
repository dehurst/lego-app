-- Brickset: launch/retirement dates + US price, so we know
-- "announced" vs "on sale" vs "retired", and can send "now available" alerts.
-- Run in Supabase → SQL Editor → New query → Run. Safe to re-run.

-- Raw Brickset data, keyed by set number. NOT linked to `sets` with a
-- foreign key on purpose: Brickset often lists a set before Rebrickable does,
-- and the two join up automatically once Rebrickable catches up.
create table if not exists public.brickset_sets (
  set_num      text primary key,   -- "75301-1", same format as sets.set_num
  brickset_id  integer,
  name         text,
  year         integer,
  theme        text,
  category     text,               -- Normal, Gear, Book, …
  released     boolean,
  launch_date  date,
  exit_date    date,               -- official retirement date, if known
  rrp_usd      numeric(8, 2),
  availability text,               -- Retail, LEGO exclusive, …
  brickset_url text,
  fetched_at   timestamptz not null default now()
);
alter table public.brickset_sets enable row level security; -- server-only

-- What the app shows and alerts on, worked out from the Brickset data.
alter table public.sets drop column if exists available; -- replaced by availability_status
alter table public.sets add column if not exists exit_date date;
alter table public.sets add column if not exists rrp_usd numeric(8, 2);
alter table public.sets add column if not exists availability_status text
  check (availability_status in ('coming', 'available', 'retired'));

-- Small key/value store for job bookkeeping (e.g. when we last called Brickset).
create table if not exists public.app_state (
  key        text primary key,
  value      jsonb,
  updated_at timestamptz not null default now()
);
alter table public.app_state enable row level security; -- server-only

-- Recomputes every set's availability for `today` from its Brickset dates,
-- saves anything that changed, and returns the sets that just went from
-- "coming" to "available" (the ones to send "now available" alerts for).
-- Runs every hour with NO Brickset API calls: launch dates are known ahead
-- of time, so a set flips to available on its launch day by itself.
create or replace function public.refresh_set_availability(today date)
returns table (set_num text)
language sql
as $$
  with computed as (
    select
      s.set_num,
      s.availability_status as old_status,
      case
        when b.exit_date is not null and b.exit_date < today then 'retired'
        when b.launch_date is not null and b.launch_date <= today then 'available'
        when b.launch_date is not null then 'coming'
        when b.released then 'available'
        when b.released = false then 'coming'
      end as new_status,
      b.launch_date,
      b.exit_date,
      b.rrp_usd
    from public.sets s
    join public.brickset_sets b on b.set_num = s.set_num
  ),
  changed as (
    update public.sets s
    set availability_status = c.new_status,
        launch_date = c.launch_date,
        exit_date = c.exit_date,
        rrp_usd = c.rrp_usd,
        available_since = case
          when c.new_status = 'available' and s.availability_status is distinct from 'available'
            then now()
          else s.available_since
        end
    from computed c
    where s.set_num = c.set_num
      and (s.availability_status is distinct from c.new_status
        or s.launch_date is distinct from c.launch_date
        or s.exit_date is distinct from c.exit_date
        or s.rrp_usd is distinct from c.rrp_usd)
    returning s.set_num, c.old_status, c.new_status
  )
  -- Only "coming → available" counts. A set we'd never classified before
  -- (old_status null, e.g. on the first Brickset sync) does NOT alert.
  select changed.set_num from changed
  where old_status = 'coming' and new_status = 'available';
$$;

-- Only our server (service role) may run it.
revoke execute on function public.refresh_set_availability(date) from public, anon, authenticated;
