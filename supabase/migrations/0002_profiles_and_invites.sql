-- M3: accounts (profiles) and single-use invite codes.
-- Run in Supabase → SQL Editor → New query → Run. Safe to re-run.

-- One row per person. Login details (the hidden email + password) live in
-- Supabase's own auth.users table; this holds what OUR app needs.
create table if not exists public.profiles (
  id          uuid primary key references auth.users (id) on delete cascade,
  -- 3–20 lowercase letters, numbers or underscores. No real names needed.
  username    text not null unique check (username ~ '^[a-z0-9_]{3,20}$'),
  role        text not null default 'member' check (role in ('member', 'admin')),
  -- New accounts wait for an admin to approve them.
  status      text not null default 'pending' check (status in ('pending', 'approved')),
  created_at  timestamptz not null default now(),
  approved_at timestamptz
);

alter table public.profiles enable row level security;

-- A logged-in person may read their own profile (and nothing else).
-- All writes go through our server.
drop policy if exists "read own profile" on public.profiles;
create policy "read own profile" on public.profiles
  for select to authenticated
  using (id = (select auth.uid()));

create table if not exists public.invite_codes (
  id          uuid primary key default gen_random_uuid(),
  code        text not null unique,
  created_by  uuid references public.profiles (id) on delete set null,
  created_at  timestamptz not null default now(),
  expires_at  timestamptz not null default now() + interval '14 days',
  -- used_at is what marks a code as spent. (used_by can become null later if
  -- that account is removed, but the code stays spent.)
  used_at     timestamptz,
  used_by     uuid references public.profiles (id) on delete set null
);

alter table public.invite_codes enable row level security; -- server-only

-- Devices now belong to people. Remove M2 test rows that have no owner;
-- your devices re-register automatically the next time you open the app.
delete from public.push_subscriptions where user_id is null;
