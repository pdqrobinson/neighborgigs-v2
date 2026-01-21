# NeighborGigs — Supabase Setup Guide (Phase One)

## Purpose

Define the exact Supabase configuration required for Phase One.

This document ensures:

- dev and prod environments stay in sync

- database strategy is implemented correctly

- no accidental security or schema drift

- demo-mode works intentionally

This guide is authoritative for Phase One.

---

## 1. Supabase Project Setup

**Supabase credentials are listed in screts in settings** 

### Environments

Create **two Supabase projects**:

- `neighborgigs-dev`

- `neighborgigs-prod`

They must have:

- identical schema

- identical extensions

- identical configuration

- different data only

**Rule:**  

Schema drift between dev and prod is not allowed.

---

## 2. Authentication Configuration (Phase One)

### Auth Status

- Supabase Auth is **NOT used** in Phase One

- No email auth

- No phone OTP

- No OAuth providers

Auth is **stubbed** via demo users.

### Consequence

- `auth.users` table is ignored
- API uses `X-User-Id` header
- Supabase anon/service keys must **never** be exposed to the client for writes

---

## 3. Row Level Security (RLS)

### Phase One Rule

**RLS is disabled on all tables.**

Reason:

- Demo environment

- API is the only access layer

- RLS would add complexity without value

### Required Actions

For each table:

```sql

alter table <table_name> disable row level security;

Tables:

neighborhoods

users

wallets

ledger_entries

tasks

task_requests

Rule:

Do not partially enable RLS in Phase One.

4\. Required Extensions (Geo)

Decision (LOCKED)

Use earthdistance + cube, not PostGIS.

Why

simpler

cheaper

sufficient for radius-based discovery

no spatial joins required in Phase One

Enable Extensions

Run once per project:

sql

Copy code

create extension if not exists cube;

create extension if not exists earthdistance;

5\. Schema Creation Order (IMPORTANT)

Run migrations in this order:

neighborhoods

users

wallets

ledger_entries

tasks

task_requests

This avoids foreign key failures.

6\. Canonical Phase One Schema

⚠️ This schema must match Database_Strategy.md exactly.

neighborhoods

sql

Copy code

create table neighborhoods (

  id text primary key,

  name text not null,

  center_lat numeric not null,

  center_lng numeric not null,

  radius_miles numeric not null,

  created_at timestamp default now()

);

users

```sql
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
```

### Required invariants
- `on_the_move = true` ⇒ `move_expires_at IS NOT NULL`
- `direction` only valid if `on_the_move = true`
- Phase 1 does not store push tokens on users (see user_devices table)

user_devices (NEW in Phase 1)

```sql
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
```

### Required invariants
- Token uniqueness per user (multiple devices per user allowed, same platform allowed)
- Unique constraint on (user_id, push_token) because tokens rotate; platform uniqueness is incorrect (a user can have multiple iOS devices)
- last_seen_at is useful for tracking device activity

wallets

```sql
create table wallets (
  id uuid primary key,
  user_id uuid references users(id) on delete cascade unique,
  available_usd numeric default 0,
  pending_usd numeric default 0,
  created_at timestamp default now()
);
```

ledger_entries

```sql
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
```

### Rules
- Phase 1 only uses 'credit' and 'debit' entry types (hold/release are Phase 2+)
- Never update balances without inserting a ledger entry
- Balances are recalculated from ledger if needed

tasks

```sql
create table tasks (
  id uuid primary key,
  requester_id uuid references users(id),
  helper_id uuid references users(id),
  description text,
  tip_amount_usd numeric,
  status text check (
    status in (
      'requested',
      'accepted',
      'in_progress',
      'completed'
    )
  ),
  created_at timestamp default now(),
  completed_at timestamp,
  proof_photo_url text
);
```

task_requests
```sql
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
```

### Required invariants
- Phase 1 only uses credit|debit entry types (hold/release are Phase 2+)
- `task_id is null until request acceptance`

7\. Indexes (Required for Performance)

Geo lookup
```sql
create index users_location_idx
on users using gist (
  ll_to_earth(last_lat, last_lng)
);

create index users_move_expires_at_idx on users(move_expires_at);
```

Task lookup
```sql
create index tasks_helper_status_idx
on tasks (helper_id, status);

create index tasks_requester_status_idx
on tasks (requester_id, status);
```

Requests lookup
```sql
create index task_requests_helper_status_idx
on task_requests (helper_id, status);

create index task_requests_expires_at_idx on task_requests(expires_at);
```

8\. Demo User Strategy (Phase One)

Rule

Demo users are real rows, inserted via SQL.

There is:

no demo flag

no demo mode logic

no branching

Required Demo Data

1 demo requester

2–5 demo helpers

All with known UUIDs

All in same neighborhood

Slightly offset lat/lng

Example:

sql

Copy code

insert into users (

  id, first_name, neighborhood_id, radius_miles,

  last_lat, last_lng

) values (

  '00000000-0000-0000-0000-000000000001',

  'Demo',

  'demo_neighborhood',

  1,

  33.4484,

  -112.0740

);

9\. Environment Variables (Zo)

Required Variables

Set these per environment:

SUPABASE_URL

SUPABASE_SERVICE_ROLE_KEY

DATABASE_URL

Rules

Service role key used only by backend

Never exposed to client

Client uses backend API exclusively

10\. Dev ↔ Prod Sync Rules (Supabase)

Schema changes applied to dev first

Schema changes committed to Git

Schema changes then applied to prod

Data never copied from dev → prod

Rule:

If it's not in Git, it doesn’t get applied.

11\. Phase One Safety Rules

No triggers

No functions

No policies

No RLS

No cron inside Supabase

All logic lives in the backend API.

Final Lock Statement

Supabase is a persistence layer in Phase One, not a logic engine.

Any attempt to add:

triggers

functions

policies

RLS complexity

is a Phase Two concern and must be rejected.

---

## 3. Supabase Credentials (Phase One)

### Credential Variables

Phase 1 requires only these credentials at runtime for a backend API that talks to Supabase:

- `SUPABASE_URL`
- `SUPABASE_SERVICE_ROLE_KEY`

If you also have a public client (web/mobile) that calls Supabase directly (Phase 1 says you don't, but if you do):
- `SUPABASE_ANON_KEY`

### Storage Rules

All credentials are backend-only environment variables:
- Stored in Zo backend environment (dev + prod)
- Never committed to Git
- Never exposed to client
- Client uses backend API exclusively

### Auth Rule

The backend authenticates to Supabase using service credentials; the client never does.

### Environment Separation

Manage dev/prod via separate environment files or config, not via variable names. The same variable names (`SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`) are used across all environments; only their values differ.