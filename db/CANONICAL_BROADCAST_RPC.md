# Canonical Broadcast RPC - Final Contract

**Status: ✅ FINAL, DECLARED**

---

## The One RPC

### Function: `create_broadcast`

**Parameters (EXACTLY 7, in EXACT order):**

| Parameter | Type | Description |
|-----------|------|-------------|
| `p_user_id` | uuid | User creating the broadcast |
| `p_message` | text | Broadcast message (1-280 chars, validated in app) |
| `p_price_usd` | numeric | Offer price (0 for free) |
| `p_lat` | double precision | Latitude |
| `p_lng` | double precision | Longitude |
| `p_location_context` | text | Context string (null allowed) |
| `p_idempotency_key` | text | Unique key for deduplication |

**Returns:**
```json
{
  "broadcast": { /* row data */ },
  "idempotent": true|false
}
```

---

## Database Schema

### Table: `broadcasts`

```sql
create table broadcasts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references users(id) on delete cascade,
  message text not null,
  price_usd numeric not null default 0,
  lat double precision not null,
  lng double precision not null,
  location_context text,
  idempotency_key text not null,
  created_at timestamp with time zone default now()
);

create unique index broadcasts_user_idempotency_unique
on broadcasts (user_id, idempotency_key);
```

---

## The RPC Function (PostgreSQL)

```sql
create or replace function create_broadcast(
  p_user_id uuid,
  p_message text,
  p_price_usd numeric,
  p_lat double precision,
  p_lng double precision,
  p_location_context text,
  p_idempotency_key text
)
returns json
language plpgsql
as $$
declare
  v_existing broadcasts;
  v_broadcast broadcasts;
begin
  -- Idempotency guard
  select *
  into v_existing
  from broadcasts
  where user_id = p_user_id
    and idempotency_key = p_idempotency_key;

  if found then
    return jsonb_build_object(
      'broadcast', row_to_json(v_existing),
      'idempotent', true
    );
  end if;

  insert into broadcasts (
    user_id,
    message,
    price_usd,
    lat,
    lng,
    location_context,
    idempotency_key,
    created_at
  ) values (
    p_user_id,
    p_message,
    p_price_usd,
    p_lat,
    p_lng,
    p_location_context,
    p_idempotency_key,
    now()
  ) returning * into v_broadcast;

  return jsonb_build_object(
    'broadcast', row_to_json(v_broadcast),
    'idempotent', false
  );
end;
$$;

grant execute on function create_broadcast to authenticated;
grant all on table broadcasts to authenticated;
```

---

## Application Code (TypeScript/Node.js)

```typescript
// Frontend must generate unique idempotency key
// Example: `${userId}-${Date.now()}-${crypto.randomUUID()}`

const { data, error } = await db.rpc('create_broadcast', {
  p_user_id: userId,
  p_message: message,
  p_price_usd: offer_usd ?? 0,
  p_lat: lat,
  p_lng: lng,
  p_location_context: location_context ?? null,
  p_idempotency_key: idempotencyKey,
});

if (error) {
  if (error.code === '23505') {
    // Unique constraint violation (race condition)
    throw new Error('Duplicate broadcast - please retry');
  }
  throw new Error(error.message);
}

return {
  broadcast: data.broadcast,
  idempotent: data.idempotent
};
```

---

## What This RPC Does

✅ **Idempotency**: Same `(user_id, idempotency_key)` returns existing broadcast  
✅ **Deduplication**: Unique index prevents duplicates  
✅ **Pricing**: Supports `price_usd` for offers (0 = free)  
✅ **Location**: Stores lat/lng and optional context  
✅ **Minimal**: Only essential broadcast data  
✅ **Atomic**: One transaction, no partial failures  

---

## What This RPC Does NOT Do

❌ **No legacy params**: No `expires_minutes`, `broadcast_type`, `place_name`, `place_address`  
❌ **No UUID text hell**: All UUIDs are proper `uuid` type  
❌ **No Phase 3 logic**: No escrow, no task creation, no response handling  
❌ **No validation in DB**: Validation happens in application layer  
❌ **No overloading**: Single signature, no multiple versions  

---

## Migration File

**Location**: `db/migrations/015_canonical_broadcast_rpc.sql`

Run this in Supabase SQL Editor:
```bash
# Copy contents of 015_canonical_broadcast_rpc.sql
# Paste and execute in Supabase SQL Editor
```

**Verification query** (run after migration):
```sql
SELECT 
  'broadcasts table' as object,
  EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'broadcasts') as exists
UNION ALL
SELECT 
  'create_broadcast function' as object,
  EXISTS (SELECT FROM pg_proc WHERE proname = 'create_broadcast') as exists
UNION ALL
SELECT 
  'idempotency index' as object,
  EXISTS (SELECT FROM pg_indexes WHERE indexname = 'broadcasts_user_idempotency_unique') as exists;
```

**Expected output:**
```
object              | exists
--------------------|-------
broadcasts table    | t
create_broadcast    | t
idempotency index   | t
```

---

## What To Delete (Non-Optional)

**Drop these NOW to prevent chaos:**

1. ✅ `create_broadcast_with_idempotency` (all versions)
2. ✅ `create_broadcast(...)` (any overload)
3. ✅ `broadcast_requests` table (legacy)
4. ❌ Keep: `task_requests` table (used for actual requests, not broadcasts)

**Why delete?**
- Multiple RPCs = schema cache confusion
- Multiple param names = type safety broken
- Legacy tables = migration hell
- Future migrations cannot depend on ghost objects

---

## How To Use This RPC

### 1. Before Creating Broadcast
- Validate message length (1-280 chars) in app
- Validate price is 0-9999 (numeric)
- Generate idempotency key: `${userId}-${Date.now()}-${uuid}`

### 2. Call The RPC
```typescript
const result = await db.rpc('create_broadcast', {
  p_user_id: userId,
  p_message: message,
  p_price_usd: offer_usd,
  p_lat: lat,
  p_lng: lng,
  p_location_context: location_context,
  p_idempotency_key: idempotencyKey,
});
```

### 3. Handle Response
- `result.idempotent === true`: Already created, show existing
- `result.idempotent === false`: New broadcast created

---

## File References

- **Migration**: `db/migrations/015_canonical_broadcast_rpc.sql`
- **Route**: `src/backend/routes.ts` (line 639-682)
- **Application code**: Uses `p_price_usd` parameter

---

## Rule To Live By

**One RPC name = one signature = one responsibility**

If you need new behavior:
1. Create NEW RPC with NEW name
2. Do NOT patch existing signature
3. Do NOT add optional params
4. Do NOT overload with different types

**Example:**
- ❌ Wrong: `create_broadcast(..., expires_minutes int, ...)`
- ✅ Right: Create `create_broadcast_with_expiry(...)` if needed later

---

## Questions & Answers

**Q: Are we missing expires, place_name, etc.?**  
A: Yes. Those belong downstream (Phase 2+). Broadcast creation should be minimal and idempotent.

**Q: What about validation?**  
A: Validation happens in application layer (TypeScript), not in database.

**Q: What about broadcast_type?**  
A: Not needed. Use separate endpoints or queries if needed later.

**Q: What about the old `task_requests` broadcasts?**  
A: Keep them. They're for actual requests, not broadcasts.

**Q: What if I need new fields later?**  
A: Add them to `broadcasts` table in NEW migration. Don't touch existing RPC.

---

## Next Steps

1. ✅ Run `db/migrations/015_canonical_broadcast_rpc.sql` in Supabase
2. ✅ Verify with query above
3. ✅ Deploy application (routes.ts already updated)
4. ✅ Test idempotency with same `idempotency_key`
5. ✅ Test duplicate prevention with same user/message

---

## Warning Signs Of Regression

If you see:
- ❌ `create_broadcast_with_idempotency` in logs
- ❌ `broadcast_requests` table referenced
- ❌ Multiple param names for same thing
- ❌ "Temporary" bypasses of idempotency

**Stop and fix immediately.** The schema cache will never stabilize.

---

**Status: FINAL**  
**Date: 2026-01-21**  
**Authority: Senior Software Engineer**
