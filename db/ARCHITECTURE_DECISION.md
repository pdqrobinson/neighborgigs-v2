# Architecture Decision Record: Broadcast RPC

**Date**: 2026-01-21  
**Authority**: Senior Software Engineer  
**Decision**: Declare canonical broadcast RPC contract as FINAL

---

## The Problem

The broadcast RPC had become chaotic:
- Multiple function versions (`create_broadcast_with_idempotency`, `create_broadcast`)
- Multiple parameter variations (UUID vs text, 7 params vs 11)
- Multiple tables (`task_requests` for broadcasts, plus `broadcast_requests`)
- Schema cache confusion in Supabase
- Type safety violations everywhere

---

## The Decision

**Pick ONE function, ONE parameter list, and delete everything else.**

### The Canonical RPC

```sql
function create_broadcast(
  p_user_id uuid,
  p_message text,
  p_price_usd numeric,
  p_lat double precision,
  p_lng double precision,
  p_location_context text,
  p_idempotency_key text
)
```

### Why This Signature?

1. **Minimal**: Only what's needed for broadcast creation
2. **Idempotent**: Prevents duplicates via `(user_id, idempotency_key)`
3. **Type-safe**: All UUIDs are `uuid` type, no text hell
4. **Future-proof**: Can be extended later without breaking
5. **Supabase-friendly**: Clean schema, no ghosts

---

## What We Removed

### 1. Legacy RPCs (Dropped)
- `create_broadcast_with_idempotency` (all overloads)
- Any `create_broadcast` with different params

### 2. Legacy Tables (Dropped)
- `broadcast_requests` (never should have existed)
- Keep: `task_requests` (this is for actual requests, not broadcasts)

### 3. Legacy Params (Removed)
- `expires_minutes` → Not needed at creation time
- `broadcast_type` → Not needed (could be added later if needed)
- `place_name` → Not needed (can be derived from lat/lng)
- `place_address` → Not needed (can be derived from lat/lng)

### 4. Legacy Behavior (Removed)
- UUID text casting (`p_user_id text`)
- Complex validation in database (moved to app layer)
- Phase 3 escrow hooks (belongs in Phase 3)

---

## What We Kept

### 1. Core Responsibilities
- ✅ Idempotency
- ✅ Deduplication
- ✅ Pricing support
- ✅ Location storage
- ✅ Atomic creation

### 2. Database Schema
```sql
create table broadcasts (
  id uuid primary key,
  user_id uuid references users,
  message text,
  price_usd numeric,
  lat double precision,
  lng double precision,
  location_context text,
  idempotency_key text,
  created_at timestamp
);

create unique index broadcasts_user_idempotency_unique
on broadcasts (user_id, idempotency_key);
```

### 3. Application Code
- Route: `POST /api/v1/broadcasts`
- Parameter: `p_price_usd` (not `p_offer_usd`)
- Validation: In TypeScript, not in database

---

## The Rule That Fixes Everything

**One RPC name = one signature = one responsibility**

If you need new behavior:
1. Create NEW RPC with NEW name
2. Do NOT patch existing signature
3. Do NOT add optional params
4. Do NOT overload with different types

---

## How To Apply This Decision

### Step 1: Run Migration
Execute `db/migrations/015_canonical_broadcast_rpc.sql` in Supabase SQL Editor.

### Step 2: Verify
Run the verification query from the migration file. All three should return `t` (true).

### Step 3: Deploy
The application code (`routes.ts`) is already updated to use `p_price_usd`.

### Step 4: Test
- Create broadcast → Should succeed
- Create same broadcast with same idempotency key → Should return existing
- Try without idempotency key → Should fail with validation error

---

## Future-Proofing

### What Can Be Added Later (Without Breaking)

1. **New columns in `broadcasts` table**
   - Add in new migration
   - RPC will still work (returns all columns)

2. **New RPCs for new behaviors**
   - `create_broadcast_with_expiry`
   - `create_broadcast_with_type`
   - `create_broadcast_with_place`

3. **New tables for new features**
   - `broadcast_responses`
   - `broadcast_escrows`
   - `broadcast_tags`

### What Cannot Be Changed (Must Create New RPC)

1. Parameter names of existing RPC
2. Parameter types of existing RPC
3. Return structure of existing RPC

---

## Migration History (Clean Slate)

```
[BEFORE] Multiple confusing versions
- create_broadcast_with_idempotency(text, uuid, text, text, int, ...)
- create_broadcast_with_idempotency(uuid, uuid, text, text, int, ...)
- create_broadcast(...overloads...)
- broadcast_requests table
- task_requests table (also used for broadcasts?!)

[AFTER] One canonical version
- create_broadcast(uuid, text, numeric, double, double, text, text)
- broadcasts table (clean)
- task_requests table (for actual requests only)
```

---

## Verification Checklist

- [ ] Migration `015_canonical_broadcast_rpc.sql` executed
- [ ] `broadcasts` table exists
- [ ] `create_broadcast` function exists
- [ ] `broadcasts_user_idempotency_unique` index exists
- [ ] `p_price_usd` used in routes.ts
- [ ] `create_broadcast_with_idempotency` dropped
- [ ] `broadcast_requests` dropped
- [ ] No legacy params in codebase

---

## Questions & Answers

**Q: Why drop `broadcast_requests` table?**  
A: It was legacy baggage. The `broadcasts` table is the source of truth.

**Q: Why remove `expires_minutes`?**  
A: Expiration is a Phase 2+ concern. At Phase 1, broadcasts are simple announcements.

**Q: What if we need `broadcast_type` later?**  
A: Add it as new column in `broadcasts` (new migration). Don't touch existing RPC.

**Q: What about validation?**  
A: Application layer handles validation (TypeScript). Database is simple and fast.

**Q: What about idempotency conflicts?**  
A: Unique index prevents them. Application generates unique key per request.

---

## Warning Signs

If you see these, something is wrong:

1. ❌ `create_broadcast_with_idempotency` in logs
2. ❌ `broadcast_requests` in queries
3. ❌ UUID text casting in code
4. ❌ Multiple versions of same RPC
5. ❌ "Temporary" bypasses of idempotency

**Action**: Stop immediately and check `015_canonical_broadcast_rpc.sql`

---

## Success Criteria

✅ **Database**
- One table: `broadcasts`
- One function: `create_broadcast`
- One index: `broadcasts_user_idempotency_unique`

✅ **Application**
- One route: `POST /api/v1/broadcasts`
- One RPC call: `db.rpc('create_broadcast', {...})`
- Correct params: `p_price_usd` (not `p_offer_usd`)

✅ **Behavior**
- Idempotent calls return existing broadcast
- Duplicate submissions rejected
- No legacy params accepted
- No legacy tables referenced

---

## Status

**DECISION: FINAL**  
**IMPLEMENTED: YES**  
**MIGRATED: READY**  
**VERIFIED: PENDING (run verification query)**

---

**This document is the source of truth. All future changes must reference it.**
