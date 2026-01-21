# NeighborGigs — Phase One Database Strategy

## Core Principles (Phase One)

1. **Supabase Postgres is the single source of truth**

2. **All users are real rows** (even demo users)

3. **State is explicit, never inferred**

4. **Money is ledgered, not mutated**

5. **Geo rules are enforced server-side**

6. **No auth dependency in Phase One**



---

## Database Overview (What Exists)

**Tables**

1. neighborhoods

2. users

3. user_devices

4. wallets

5. ledger_entries

6. tasks

7. task_requests

That’s it.\
No extra abstractions.

---

## 1. neighborhoods

Defines the hard boundary for visibility.

```markdown
create table neighborhoods (
  id text primary key,
  name text not null,
  center_lat numeric not null,
  center_lng numeric not null,
  radius_miles numeric not null,
  created_at timestamp default now()
);
```

### Example seed

```markdown
insert into neighborhoods (
  id, name, center_lat, center_lng, radius_miles
) values (
  'demo_neighborhood',
  'Downtown Demo',
  33.4484,
  -112.0740,
  3
);
```

---

## 2. users

Represents **all people** in the system (demo or real).

```markdown
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
- Push tokens are stored in `user_devices` table, not on users

---

## 2.5. user_devices

Stores push notification tokens for users, supporting multiple devices.

```markdown
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

---

## 3. wallets

One wallet per user.

```markdown
create table wallets (
  id uuid primary key,
  user_id uuid references users(id) unique,

  available_usd numeric default 0,
  pending_usd numeric default 0,

  created_at timestamp default now()
);
```

⚠️ **Important**\
These balances are **derived values**.\
They exist for performance + UI only.

Ledger is the truth.

---

## 4. ledger_entries

Every money movement lives here.

```markdown
create table ledger_entries (
  id uuid primary key,
  wallet_id uuid references wallets(id),

  entry_type text check (
    entry_type in ('credit','debit')
  ),

  amount_usd numeric not null,
  source text, -- task, withdrawal, adjustment
  reference_id uuid,

  created_at timestamp default now()
);
```

### Rules

- Phase 1 only uses 'credit' and 'debit' entry types (hold/release are Phase 2+)
- Never update balances without inserting a ledger entry
- Balances are recalculated from ledger if needed

---

## 5. tasks

Represents the **agreed work**.

```markdown
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
```

---

## 6. task_requests

Separates **intent** from commitment.

```markdown
create table task_requests (
  id uuid primary key,

  requester_id uuid references users(id),
  helper_id uuid references users(id),

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

**task_id is null until request acceptance.**

**Note**: TaskRequest and Task are separate state machines:

- TaskRequest: sent → accepted | declined | expired (request lifecycle)
- Task: accepted → in_progress → completed (work lifecycle)

**Background Job (Required):**

```sql
update task_requests
set status = 'expired'
where status = 'sent'
  and expires_at < now();
```

---

## 7. withdrawal_requests

Prevents double-debit race conditions for withdrawals.

```markdown
create table withdrawal_requests (
  id uuid primary key,
  wallet_id uuid not null references wallets(id) on delete cascade,
  amount_usd numeric not null,
  created_at timestamptz not null default now()
);

create unique index withdrawal_requests_id_idx on withdrawal_requests(id);
```

**Purpose:** Idempotency for withdrawal operations to prevent duplicate ledger debits.

---

## Required Indexes (P0 - Must Add)

```sql
-- Location index for discovery query performance
create index users_location_idx
on users using gist (ll_to_earth(last_lat, last_lng));

-- Movement expiration index for background jobs
create index users_move_expires_at_idx on users(move_expires_at);

-- Request expiration index for background jobs
create index task_requests_expires_at_idx on task_requests(expires_at);

-- Task helper status for active task queries
create index tasks_helper_status_idx on tasks(helper_id, status);

-- Task requester status for requester queries
create index tasks_requester_status_idx on tasks(requester_id, status);
```

**Critical:** Without `users_location_idx`, every discovery query does a full table scan with earthdistance calculations.

---

## Core Queries (What the App Uses)

### A. Get visible on-the-move users

Note: Requires earthdistance and cube extensions (see DB_SETUP.md)

```markdown
select *
from users
where
  neighborhood_id = :neighborhood_id
  and on_the_move = true
  and move_expires_at > now()
  and (
    earth_distance(
      ll_to_earth(last_lat, last_lng),
      ll_to_earth(:user_lat, :user_lng)
    ) <= (:radius_miles * 1609.34)
  )
order by
  earth_distance(ll_to_earth(last_lat, last_lng), ll_to_earth(:user_lat, :user_lng)) asc,
  move_expires_at asc;
```

---

### B. Go on the move

```markdown
update users
set
  on_the_move = true,
  direction = 'out',
  move_expires_at = now() + interval '60 minutes'
where id = :user_id;
```

---

### C. Expire on-the-move state (backend cron / scheduled job)

```markdown
update users
set
  on_the_move = false,
  direction = null,
  move_expires_at = null
where move_expires_at < now();
```

---

### D. Accept request (request → task creation)

When a helper accepts a request:

1. Create a new Task record with status 'accepted' and helper_id set
2. Update task_requests status to accepted
3. Set request.task_id = new task id

```markdown
insert into tasks (
  id, requester_id, helper_id, description, tip_amount_usd, status
) values (
  gen_random_uuid(),
  :requester_id,
  :helper_id,
  :description,
  :tip,
  'accepted'
);

update task_requests
set status = 'accepted',
    task_id = (select id from tasks where helper_id = :helper_id order by created_at desc limit 1)
where id = :request_id;
```

---

### E. Complete task + credit wallet

```markdown
update tasks
set
  status = 'completed',
  completed_at = now()
where id = :task_id;
```

```markdown
insert into ledger_entries (
  id, wallet_id, entry_type, amount_usd, source, reference_id
) values (
  gen_random_uuid(),
  :wallet_id,
  'credit',
  :tip_amount,
  'task',
  :task_id
);
```

---

## Demo Mode Strategy (Critical)

### Demo user

- Inserted manually via SQL

- Known UUID

- Treated as authenticated

### RLS

For Phase One demo:

```markdown
alter table users disable row level security;
alter table tasks disable row level security;
alter table wallets disable row level security;
```

Security comes later.\
Clarity comes now.

---

## Phase One Invariants (Database-Level)

1. Users only see users in same neighborhood

2. No task exists without a requester

3. A task has **one helper max**

4. Wallet balances never mutate without ledger entries

5. On-the-move always expires

6. Empty data is allowed (no fake rows)

---

## Phase One Lock Statement (Database)

> **If a feature requires a new table, it is not Phase One.**

This schema supports:

- map

- list

- movement

- tasks

- money

- demo mode

Nothing else.

## Geospatial Calculations

PostgreSQL provides a powerful extension called `earthdistance` for performing geospatial calculations. This extension is particularly useful for calculating distances between two points on the Earth's surface.

To use the `earthdistance` extension, you need to enable it first:

```markdown
create extension if not exists earthdistance;
```

Once enabled, you can use the `ll_to_earth` function to convert latitude and longitude coordinates into a point on the Earth's surface, and then use the `earth_distance` function to calculate the distance between two points.

For example, to calculate the distance between two points with latitude and longitude coordinates `(lat1, lng1)` and `(lat2, lng2)`, you can use the following query:

```markdown
select earth_distance(
  ll_to_earth(lat1, lng1),
  ll_to_earth(lat2, lng2)
);
```

This will return the distance in meters. To convert the distance to miles, you can divide the result by 1609.34.