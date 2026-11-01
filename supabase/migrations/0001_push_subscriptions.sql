-- M2: one row per device that has turned on alerts.
-- Run this in Supabase → SQL Editor → New query → Run.

create table if not exists public.push_subscriptions (
  id              uuid primary key default gen_random_uuid(),
  -- Filled in from M3, once there are logins. Nullable for the M2 test.
  user_id         uuid references auth.users (id) on delete cascade,
  -- The push service URL for this device (Apple's, Google's, Mozilla's…).
  endpoint        text not null unique,
  -- Encryption keys from the browser; the payload is encrypted with them.
  p256dh          text not null,
  auth            text not null,
  device_label    text,
  user_agent      text,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now(),
  last_success_at timestamptz,
  failure_count   integer not null default 0
);

create index if not exists push_subscriptions_user_id_idx
  on public.push_subscriptions (user_id);

-- Row Level Security ON with no policies = nobody can read or write this
-- table from the browser. Only our server (using the secret key) can.
alter table public.push_subscriptions enable row level security;
