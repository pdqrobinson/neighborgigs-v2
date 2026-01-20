# Broadcast Duplicate Prevention Implementation

## Problem

Users could accidentally submit the same broadcast multiple times by clicking the "Broadcast" button multiple times before the API call completes. This causes duplicate broadcasts to be created and will become critical when payments are required for broadcasts.

## Solution Overview

Three-layer protection against duplicate broadcasts:

1. **Frontend**: Loading state prevents double-clicks
2. **Backend RPC**: Idempotency key handling prevents duplicate API calls
3. **Database**: Unique constraint prevents rapid duplicate submissions (30-second window)

## Implementation Details

### 1. Database Migration (`004_broadcast_idempotency.sql`)

**New Table: `broadcast_requests`**
- Stores all broadcast submissions for idempotency tracking
- `idempotency_key` (UUID, unique) - prevents duplicate API calls
- `user_id`, `broadcast_type`, `message` - for deduplication
- Unique constraint on `(user_id, broadcast_type, message, created_at)` - prevents rapid duplicates within 30 seconds

**New RPC Function: `create_broadcast_with_idempotency`**
- Checks for existing idempotency key → returns existing broadcast (idempotent)
- Checks for duplicate submission within 30 seconds → rejects with DUPLICATE error
- Validates all input fields (type, message length, duration, location)
- Future-proof: Accepts `p_price_usd` parameter for payment protection
- Creates `task_requests` record and links to `broadcast_requests`

### 2. Backend Update (`routes.ts`)

Updated `POST /api/v1/broadcasts` endpoint:
- **Requires** `Idempotency-Key` header
- Validates idempotency key format (UUID)
- Calls `create_broadcast_with_idempotency` RPC
- Returns appropriate responses:
  - `201` for new broadcast
  - `200` with `idempotent: true` for retries
  - `409` for duplicates (within 30-second window)
  - `400` for validation errors

### 3. Frontend Update (`Home.tsx`)

Added duplicate protection:
- `isSubmittingBroadcast` state → disables "Broadcast" button while submitting
- Generates unique idempotency key (`crypto.randomUUID()`) for each submission
- Passes idempotency key in `Idempotency-Key` header
- Passes location data correctly (lat, lng, location_context, place_name, place_address)
- Shows "Broadcasting..." on button while submitting
- Shows user-friendly error for duplicates

### 4. API Client Update (`api-client.ts`)

Updated `createBroadcast` function:
- Accepts optional `idempotencyKey` parameter
- Passes idempotency key in `Idempotency-Key` header
- Returns `{ broadcast, idempotent? }` response

## Deployment Steps

1. **Apply Database Migration**
   ```bash
   # Go to Supabase SQL Editor
   # Copy contents of db/migrations/004_broadcast_idempotency.sql
   # Run the SQL
   ```

2. **Restart Backend**
   - The backend changes are already in `routes.ts`
   - No code deployment needed beyond the migration

3. **Frontend Changes**
   - Changes are in `Home.tsx` and `api-client.ts`
   - Deploy frontend to see the new protection

## Testing

### Test 1: Double-Click Prevention
1. Click "Start a Broadcast"
2. Fill in the form
3. Click "Broadcast" twice quickly
4. **Expected**: Second click does nothing (button disabled)

### Test 2: Idempotency (Network Retry)
1. Click "Start a Broadcast"
2. Fill in the form
3. Click "Broadcast"
4. **Expected**: Broadcast created, modal closes
5. Try to send the same request again with same idempotency key
6. **Expected**: Returns existing broadcast (idempotent=true), no duplicate

### Test 3: 30-Second Deduplication
1. Create a broadcast with message "Need help moving a couch"
2. Immediately try to create another with the same message
3. **Expected**: Error "Duplicate broadcast detected. Please wait before posting again."
4. Wait 31 seconds and try again
5. **Expected**: Second broadcast created (different idempotency key)

### Test 4: Similar but Different Messages
1. Create a broadcast with "Need help moving a couch"
2. Immediately create another with "Need help moving a table"
3. **Expected**: Both broadcasts created (different messages)

## Future Payment Integration

When payments are required for broadcasts:

1. **Add wallet balance check** in `create_broadcast_with_idempotency` RPC:
   ```sql
   -- Check user has sufficient balance
   select * into v_wallet
   from wallets
   where user_id = p_user_id
   for update;

   if v_wallet.available_usd < p_price_usd then
     return jsonb_build_object(
       'error', jsonb_build_object(
         'code', 'INSUFFICIENT_FUNDS',
         'message', 'Insufficient balance for this broadcast'
       )
     );
   end if;
   ```

2. **Place hold on funds**:
   ```sql
   -- Create hold ledger entry
   insert into ledger_entries (wallet_id, entry_type, amount_usd, source, reference_id)
   values (v_wallet.id, 'hold', p_price_usd, 'broadcast_hold', p_idempotency_key);

   -- Update wallet
   update wallets
   set held_usd = held_usd + p_price_usd,
       available_usd = available_usd - p_price_usd
   where id = v_wallet.id;
   ```

3. **Frontend**: Display balance check before allowing broadcast
4. **Frontend**: Show "Broadcasting... (charging $X)" on button

## Summary

| Layer | Protection | Implementation |
|--------|-------------|----------------|
| Frontend | Button disabled while submitting | `isSubmittingBroadcast` state |
| Frontend | Idempotency key per submission | `crypto.randomUUID()` |
| Backend | Idempotency key validation | `Idempotency-Key` header required |
| Backend | RPC with idempotent logic | `create_broadcast_with_idempotency` |
| Database | Unique idempotency key | `broadcast_requests(idempotency_key)` |
| Database | 30-second deduplication | `unique(user_id, broadcast_type, message, created_at)` |

The system is now protected against duplicate broadcasts and ready for future payment integration.
