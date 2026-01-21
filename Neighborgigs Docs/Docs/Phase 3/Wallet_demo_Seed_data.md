# Wallet Demo Seed Reconnection & Balance Normalization

**Purpose:**\
Restore **existing demo wallet seed data** so it behaves as a **single source of truth** and reflects correct balances in the app without re-seeding or inventing new records.

This document explains **what broke**, **why balances show as** `$0`, and **how to safely reconnect existing data**.

---

## Problem Summary (What’s Actually Wrong)

- Demo wallet rows **already exist**

- The UI/API shows `available_usd = 0`

- Incoming funds (ex: `$15`) are **not reflected**

- Wallet math is drifting from reality

This is **not a seed issue**.\
It’s a **connection + calculation issue**.

---

## Wallet Contract (Source of Truth)

The `wallets` table is authoritative.

### Canonical Rules

- `available_usd` = spendable balance

- `pending_usd` = escrowed / in-flight funds

- **Money only moves via events**

  - credit

  - debit

  - hold

  - release

There is **no derived balance** elsewhere.

> If money exists, it must be visible here — period.

---

## Why Demo Wallets Look “Disconnected”

### 1. User ↔ Wallet Mapping Drift

Common causes:

- Demo users recreated

- Auth user IDs changed

- Wallet `user_id` points to a **non-existent or old UUID**

Result:

```markdown
select * from wallets where user_id = <current_user>;
-- returns 0 rows
```

So the app falls back to `$0`.

---

### 2. Read Path Filters Out Data

Typical mistakes:

- Selecting wrong columns (`balance_usd` instead of `available_usd`)

- Assuming a wallet row exists

- Silent `null → 0` coercion

Example of a **bad read**:

```markdown
wallet.available_usd ?? 0
```

If the wallet query failed → you just masked the bug.

---

### 3. Demo Credits Were Never Applied

Demo seed may contain:

- Users

- Wallet rows

…but **no credit events** ever ran.

So:

- Wallet exists

- Balance never changed

- UI shows `$0` correctly (but misleadingly)

---

## Reconnection Strategy (Non-Destructive)

### Goal

Reconnect **existing wallet rows** to **current users** and **normalize balances** without deleting data.

---

## Step 1: Verify Wallet ↔ User Integrity

```markdown
select
  w.id,
  w.user_id,
  u.id as auth_user_id
from wallets w
left join auth.users u on u.id = w.user_id;
```

### Expected

- `auth_user_id` **NOT NULL**

### If NULL

Wallet is orphaned and must be reassigned.

---


## Step 2: Reattach Wallets to Current Demo Users

**Only do this for demo data.**

```markdown
update wallets
set user_id = '<current_demo_user_uuid>'
where user_id = '<old_orphaned_uuid>';
```

No deletes.\
No inserts.\
Just reconnecting wires.

---

## Step 3: Normalize Wallet Balances

Wallet math must be explicit.

### Rule

If demo funds exist conceptually, they must live in:

- `available_usd`

- or `pending_usd`

Example normalization:

```markdown
update wallets
set
  available_usd = coalesce(available_usd, 0),
  pending_usd   = coalesce(pending_usd, 0);
```

If demo users should start with credit:

```markdown
update wallets
set available_usd = 15
where user_id in (<demo_user_ids>)
  and available_usd = 0;
```

---

## Step 4: Fix the Read Path (Critical)

### API must:

1. Query by `user_id`

2. Fail loudly if no wallet exists

3. Never silently default to `$0`

**Correct behavior:**

- No wallet found → **error**

- Wallet found → display real balances

---

## Step 5: Enforce Wallet Invariants

Add guards so this never happens again.

### Required Invariants

- 1 wallet per user

- Wallet always exists before money moves

- Balances only change via controlled operations

Recommended DB constraint:

```markdown
create unique index if not exists wallets_user_id_unique
on wallets(user_id);
```

---

## Validation Checklist

Run these after reconnecting:

```markdown
-- Wallet exists
select * from wallets where user_id = '<demo_user>';

-- Balance reflects reality
select available_usd, pending_usd
from wallets
where user_id = '<demo_user>';
```

UI should now:

- Show correct balance

- Stop defaulting to `$0`

- Match backend exactly