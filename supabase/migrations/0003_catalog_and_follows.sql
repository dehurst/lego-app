-- M4: LEGO catalog (themes + sets) and who follows which themes.
-- Run in Supabase → SQL Editor → New query → Run. Safe to re-run.

-- Themes come from Rebrickable. They nest (Technic → Competition), and we
-- let people follow the top-level ("root") theme, which includes its children.
create table if not exists public.themes (
  id               integer primary key,      -- Rebrickable theme id
  parent_id        integer,
  root_id          integer not null,         -- the top-level theme it belongs to
  name             text not null,            -- Rebrickable's name
  display_name     text not null,            -- friendlier name ("Marvel")
  -- Merchandise, books, promo items etc. aren't building sets: never shown.
  hidden           boolean not null default false,
  recent_set_count integer not null default 0,
  cover_image_url  text,
  synced_at        timestamptz not null default now()
);

create table if not exists public.sets (
  set_num            text primary key,       -- e.g. "75301-1" (Brickset uses the same)
  name               text not null,
  year               integer not null,
  theme_id           integer not null references public.themes (id),
  root_theme_id      integer not null references public.themes (id),
  num_parts          integer not null default 0, -- 0 = not known yet (announced)
  image_url          text,
  source_url         text,
  source_modified_at timestamptz,
  -- When WE first saw it. This is what makes a set "new", not the API's dates.
  first_seen_at      timestamptz not null default now(),
  last_synced_at     timestamptz not null default now(),
  -- Filled in once Brickset is connected: "announced" vs "available to buy".
  launch_date        date,
  available          boolean,
  available_since    timestamptz
);

create index if not exists sets_root_theme_idx
  on public.sets (root_theme_id, first_seen_at desc);

create table if not exists public.theme_follows (
  user_id    uuid not null references public.profiles (id) on delete cascade,
  theme_id   integer not null references public.themes (id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (user_id, theme_id)
);

-- One row per catalog sync, so we can see what happened and when.
create table if not exists public.sync_runs (
  id          bigint generated always as identity primary key,
  started_at  timestamptz not null default now(),
  finished_at timestamptz,
  ok          boolean,
  stats       jsonb,
  error       text
);

-- Server-only, like the other tables.
alter table public.themes        enable row level security;
alter table public.sets          enable row level security;
alter table public.theme_follows enable row level security;
alter table public.sync_runs     enable row level security;
