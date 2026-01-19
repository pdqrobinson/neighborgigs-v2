-- NeighborGigs Phase One - Initial Schema
-- Authoritative schema for Phase One

-- Required extensions
create extension if not exists cube;
create extension if not exists earthdistance;

-- 1. neighborhoods
create table neighborhoods (
  id text primary key,
  name text not null,
  center_lat numeric not null,
  center_lng numeric not null,
  radius_miles numeric not null,
  created_at timestamp default now()
);

-- 2. users
create table users (
  id uuid primary key,
  phone text,
  first_name text,
  profile_photo text,

  neighborhood_id text references neighborhoods(id),
  radius_miles integer default 1,

  last_lat numeric,
  last_lng numeric,

  on_the_move boolean default false,
  direction text check (direction in ('out','home')),
  move_expires_at timestamp,

  notifications_enabled boolean default true,

  created_at timestamp default now()
);

-- 3. user_devices
create table user_devices (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references users(id) on delete cascade,
  push_token text not null,
  push_platform text not null check (push_platform in ('ios','android','web')),
  created_at timestamptz not null default now(),
  last_seen_at timestamptz
);

create unique index user_devices_unique on user_devices(user_id, push_token);
create index user_devices_user_id on user_devices(user_id);

-- 4. wallets
create table wallets (
  id uuid primary key,
  user_id uuid references users(id) on delete cascade unique,
  available_usd numeric default 0,
  pending_usd numeric default 0,
  created_at timestamp default now()
);

-- 5. ledger_entries
create table ledger_entries (
  id uuid primary key,
  wallet_id uuid references wallets(id) on delete cascade,
  entry_type text check (
    entry_type in ('credit','debit')
  ),
  amount_usd numeric not null,
  source text,
  reference_id uuid,
  created_at timestamp default now()
);

-- 6. tasks
create table tasks (
  id uuid primary key,
  requester_id uuid references users(id),
  helper_id uuid references users(id),
  description text,
  tip_amount_usd numeric,
  proof_photo_url text,
  status text check (
    status in (
      'accepted',
      'in_progress',
      'completed'
    )
  ),
  created_at timestamp default now(),
  completed_at timestamp
);

-- 7. task_requests
create table task_requests (
  id uuid primary key,
  requester_id uuid references users(id) on delete cascade,
  helper_id uuid references users(id) on delete cascade,
  task_id uuid references tasks(id),
  message text,
  suggested_tip_usd numeric,
  status text check (
    status in ('sent','accepted','declined','expired')
  ),
  created_at timestamptz not null default now(),
  expires_at timestamptz
);

create index task_requests_helper_status_idx on task_requests(helper_id, status);
create index task_requests_expires_at_idx on task_requests(expires_at);

-- Required indexes for performance
create index users_location_idx
on users using gist (ll_to_earth(last_lat, last_lng));

create index users_move_expires_at_idx on users(move_expires_at);

create index tasks_helper_status_idx on tasks(helper_id, status);
create index tasks_requester_status_idx on tasks(requester_id, status);

-- Disable RLS for Phase One (API is single authority)
alter table neighborhoods disable row level security;
alter table users disable row level security;
alter table user_devices disable row level security;
alter table wallets disable row level security;
alter table ledger_entries disable row level security;
alter table tasks disable row level security;
alter table task_requests disable row level security;
