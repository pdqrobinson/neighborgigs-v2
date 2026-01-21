# Broadcast Simplification - Implementation Summary

## Overview

Broadcasts have been simplified per senior dev guidance to be:
- **cheap**
- **fast**
- **minimal**
- **easy to reason about**

## Core Mental Model Change

**Before:** Broadcasts were fully-specified contracts with:
- Multiple RPC overloads
- Expiry logic at creation time
- Offer locking
- Escrow leakage
- Signature drift

**After:** Broadcasts are signals:
- "I'm here / going here / need help"
- Simple `create_broadcast` RPC
- Minimal idempotency (double-click prevention only)

---

## Changes Made

### 1. New `broadcasts` Table

File: `db/migrations/004_broadcasts_simplified.sql`

```sql
create table broadcasts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references users(id) on delete cascade,
  message text not null,
  offer_usd numeric default 0,
  lat double precision not null,
  lng double precision not null,
  location_context text,
  idempotency_key text not null,
  created_at timestamptz not null default now()
);
```

### 2. Unique Index for Idempotency (DB Guardrail)

```sql
create unique index broadcasts_user_idempotency_unique
on broadcasts (user_id, idempotency_key);
```

**Why:** Even if someone bypasses the RPC, DB enforces exactly-once semantics.

### 3. Simplified `create_broadcast` RPC (Final Form)

```sql
create or replace function create_broadcast(
  p_user_id uuid,
  p_message text,
  p_offer_usd numeric,
  p_lat double precision,
  p_lng double precision,
  p_location_context text,
  p_idempotency_key text
)
returns json
```

**Idempotency Logic:**
1. Check for existing `(user_id, idempotency_key)` pair
2. If found → return existing with `idempotent: true`
3. Otherwise → create new broadcast with `idempotent: false`

**What was removed:**
- ❌ `expires_minutes` parameter (expiry is a query concern)
- ❌ `broadcast_type` (type enforcement is later concern)
- ❌ `place_name`, `place_address` (optional enrichment)
- ❌ Multiple overloads
- ❌ Escrow logic
- ❌ Offer locking

### 4. `get_broadcasts_with_distance` RPC

```sql
create or replace function get_broadcasts_with_distance(
  p_user_lat numeric,
  p_user_lng numeric
)
returns table (
  id uuid,
  user_id uuid,
  message text,
  offer_usd numeric,
  lat double precision,
  lng double precision,
  location_context text,
  created_at timestamptz,
  distance_miles numeric,
  requester_first_name text,
  requester_profile_photo text
)
```

**Returns:** All broadcasts with distance calculated from user location.

### 5. Route Updates

File: `src/backend/routes.ts`

#### `POST /api/v1/broadcasts` - Create Broadcast

**Old signature:**
```typescript
{ broadcast_type, message, offer_usd, expiresInMinutes, lat, lng, location_context, place_name, place_address, price_usd }
```

**New signature:**
```typescript
{ message, offer_usd, lat, lng, location_context }
```

**Validations removed:**
- ❌ `broadcast_type` in ('need_help', 'offer_help')
- ❌ `expiresInMinutes` in (15, 30, 60, 120)
- ❌ `place_name` validation
- ❌ `place_address` validation
- ❌ Backend-generated idempotency key (now required from client)

**Required header:**
- `Idempotency-Key` - Client-generated UUID per submit attempt

**RPC call:**
```typescript
await db.rpc('create_broadcast', {
  p_user_id: userId,
  p_message: message,
  p_offer_usd: offer_usd ?? 0,
  p_lat: lat,
  p_lng: lng,
  p_location_context: location_context ?? null,
  p_idempotency_key: idempotencyKey,
});
```

**Response:**
```typescript
{
  id: data.broadcast?.id,
  broadcast: data.broadcast,
  idempotent: data.idempotent  // true if duplicate was found
}
```

#### `GET /api/v1/broadcasts` - List Broadcasts

**Changes:**
- Now queries `broadcasts` table instead of `task_requests`
- Uses `get_broadcasts_with_distance` RPC
- No fallback to `task_requests` table
- Returns simplified broadcast structure

---

## Migration Order

Updated `db/apply_migrations.sh`:

```bash
MIGRATIONS=(
  "001_initial_schema.sql"
  "002_rpc_functions.sql"
  "003_wallet_canonical_model.sql"
  "004_broadcasts_simplified.sql"  # <-- NEW
  # ... remaining migrations
)
```

---

## Phase 3 Compatibility

When escrow is added later:

1. **Do NOT touch `create_broadcast`** - it remains a simple signal creation
2. **Add new RPC:** `finalize_broadcast_and_fund_escrow(...)`
3. **That RPC handles:**
   - Validating broadcast exists
   - Moving money to escrow
   - Separate idempotency for the funding step

This separation keeps Phase 2 boring = safe.

---

## What This Fixes

| Issue | Resolution |
|--------|------------|
| Signature drift between docs/code | One canonical signature |
| Supabase cache confusion | Single `create_broadcast` function |
| Multiple RPC overloads | One function, one purpose |
| Phase 3 leakage (escrow logic) | No money-related logic in broadcast creation |
| Idempotency scope creep | Simple double-click prevention only |

---

## API Contract

### Create Broadcast

```
POST /api/v1/broadcasts
Headers: {
  X-User-Id: <uuid>,
  Idempotency-Key: <uuid>  // REQUIRED: Client-generated
}
Body: {
  message: string (1-280 chars),
  offer_usd?: number (default 0),
  lat: number,
  lng: number,
  location_context?: string
}
Response: {
  id: uuid,
  broadcast: { id, user_id, message, offer_usd, lat, lng, location_context, created_at, idempotency_key },
  idempotent: boolean  // true if existing broadcast was returned
}
```

### List Broadcasts

```
GET /api/v1/broadcasts?lat=33.45&lng=-112.07
Headers: { X-User-Id: <uuid> }
Response: {
  broadcasts: [{
    id,
    user_id,
    message,
    offer_usd,
    lat,
    lng,
    location_context,
    created_at,
    distance_miles,
    requester: { id, first_name, profile_photo }
  }]
}
```

---

## Status

- ✅ `004_broadcasts_simplified.sql` created
- ✅ `apply_migrations.sh` updated
- ✅ `POST /api/v1/broadcasts` route updated
- ✅ `GET /api/v1/broadcasts` route updated
- ✅ TypeScript compiles successfully
- ⏳ Pending: Apply migration to database (requires `DATABASE_URL` set)
