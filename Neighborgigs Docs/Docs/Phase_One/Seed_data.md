# NeighborGigs — Demo Data Seeding (Phase One)

## Purpose

Define the **exact demo dataset** used in Phase One.

Demo data exists to:

- unblock frontend development

- enable realistic demos

- test all core flows

- avoid fake UI states

Demo data is **real data** with known IDs.

There is:

- no demo mode

- no conditional logic

- no special casing

---

## Seeding Rules (Non-Negotiable)

1. All demo users are real rows

2. UUIDs are fixed and known

3. All users belong to one neighborhood

4. Helpers have slightly offset locations

5. Some helpers are "on the move"

6. Wallets start at known balances

7. No tasks are pre-completed unless explicitly stated

8. Seed data shortcut: Wallets may be created with preset balances for demo convenience, then ledger entries are inserted to match. In production, balances must only change through ledger entries.

---

## Seed Order (IMPORTANT)

Seed data must be inserted in this order:

1. neighborhoods

2. users

3. wallets

4. (optional) ledger_entries

5. (optional) tasks

6. (optional) task_requests

If this order is violated, foreign keys may fail.

---

## Known UUIDs (Authoritative)

These UUIDs are **reserved** for Phase One demos.

### Neighborhood

- `demo_neighborhood`

### Users

- Demo Requester\
  `00000000-0000-0000-0000-000000000001`

- Demo Helper A\
  `00000000-0000-0000-0000-000000000002`

- Demo Helper B\
  `00000000-0000-0000-0000-000000000003`

- Demo Helper C\
  `00000000-0000-0000-0000-000000000004`

---

## Seed Dataset Description

### Neighborhood

- Single neighborhood

- 3-mile radius

- Centered on a real coordinate (Phoenix example)

### Users

- One requester (not on the move)

- Three helpers

- Two helpers actively on the move

- One helper idle (not visible)

### Devices

- No push tokens in demo data (would require real device tokens)
- Devices registered via POST /me/devices API in production

### Device Testing Guidance

If `user_devices` table is empty:
- Notifications are a no-op (API returns success but sends nothing)

For testing end-to-end:
- Allow dummy tokens in non-prod (e.g., `dummy-token-123`)
- Mock the push provider to verify notification payloads are sent correctly

Do not test with real push provider tokens in non-production environments.

### Wallets

- All users have wallets

- Helpers start with small balances to demonstrate earnings

---

## `file Neighborgigs/Docs/Phase_One/seed_demo_data.sql`

You can run this file **as-is** in both dev and prod (prod will only be used later).

---



### 1. Neighborhood

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

### 2. Users

```markdown
-- Demo requester
insert into users (
  id, first_name, neighborhood_id, radius_miles,
  last_lat, last_lng,
  on_the_move
) values (
  '00000000-0000-0000-0000-000000000001',
  'Alex',
  'demo_neighborhood',
  1,
  33.4484,
  -112.0740,
  false
);

-- Helper A (on the move)
insert into users (
  id, first_name, neighborhood_id, radius_miles,
  last_lat, last_lng,
  on_the_move, direction, move_expires_at
) values (
  '00000000-0000-0000-0000-000000000002',
  'Jamie',
  'demo_neighborhood',
  1,
  33.4490,
  -112.0735,
  true,
  'out',
  now() + interval '45 minutes'
);

-- Helper B (on the move)
insert into users (
  id, first_name, neighborhood_id, radius_miles,
  last_lat, last_lng,
  on_the_move, direction, move_expires_at
) values (
  '00000000-0000-0000-0000-000000000003',
  'Taylor',
  'demo_neighborhood',
  2,
  33.4478,
  -112.0752,
  true,
  'home',
  now() + interval '30 minutes'
);

-- Helper C (idle)
insert into users (
  id, first_name, neighborhood_id, radius_miles,
  last_lat, last_lng,
  on_the_move
) values (
  '00000000-0000-0000-0000-000000000004',
  'Jordan',
  'demo_neighborhood',
  1,
  33.4489,
  -112.0760,
  false
);
```

---

### 3. Wallets

```markdown
insert into wallets (id, user_id, available_usd, pending_usd)
values
  (gen_random_uuid(), '00000000-0000-0000-0000-000000000001', 0, 0),
  (gen_random_uuid(), '00000000-0000-0000-0000-000000000002', 15, 0),
  (gen_random_uuid(), '00000000-0000-0000-0000-000000000003', 5, 0),
  (gen_random_uuid(), '00000000-0000-0000-0000-000000000004', 0, 0);
```

---

### 4. Optional: Ledger History (For Wallet Demo)

```markdown
insert into ledger_entries (
  id, wallet_id, entry_type, amount_usd, source
)
select
  gen_random_uuid(),
  w.id,
  'credit',
  w.available_usd,
  'demo_seed'
from wallets w
where w.available_usd > 0;
```

---

## What This Seed Enables Immediately

- Map shows:

  - 2 active helpers

  - correct distances

  - different directions

  - expiration countdowns

- List view matches map

- Request flow works end-to-end

- Wallet screen shows real balances

- Ledger history renders correctly

- Empty states still testable (Helper C)

---

## Resetting Demo Data

To reset demo state:

1. Truncate tables in reverse order

2. Re-run seed file

Never manually edit demo rows.

---

## Final Lock Statement

Demo data is **truthful, minimal, and intentional**.

If a UI looks empty:

- it is because the data is empty

- not because we should fake activity