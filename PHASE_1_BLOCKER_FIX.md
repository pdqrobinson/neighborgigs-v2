# Phase 1 Blocker Fix: Decline Request RPC

**Status:** 🟡 BLOCKED (database migration not applied)

**Issue:** The `decline_request_with_idempotency` RPC exists in migration file but hasn't been applied to the database yet.

---

## Current State

### ✅ Code (routes.ts) - READY
Both `decline` and `cancel` endpoints are correctly using RPCs:

```typescript
// Decline endpoint (line ~523)
api.post('/api/v1/requests/:requestId/decline', async (c) => {
  // ... validation ...
  const { data: result, error } = await db.rpc('decline_request_with_idempotency', {
    p_idempotency_key: idempotencyKey,
    p_request_id: requestId,
    p_helper_id: userId
  });
  // ... error handling and response ...
});

// Cancel endpoint (line ~551)
api.post('/api/v1/requests/:requestId/cancel', async (c) => {
  // ... validation ...
  const { data: result, error } = await db.rpc('cancel_request_with_idempotency', {
    p_idempotency_key: idempotencyKey,
    p_request_id: requestId,
    p_requester_id: userId
  });
  // ... error handling and response ...
});
```

### ✅ Migration File - READY
The RPC is defined in `db/migrations/009_decline_request_rpc.sql`

### ❌ Database - NOT APPLIED
The migration hasn't been run against Supabase.

---

## Fix Required (Database Deployment)

### Step 1: Check Migration History

Run this in Supabase SQL Editor:

```sql
select * 
from supabase_migrations.schema_migrations 
order by version;
```

**Expected:** `009_decline_request_rpc.sql` should **NOT** be listed.

### Step 2: Verify RPC is Missing

```sql
select proname
from pg_proc
where proname = 'decline_request_with_idempotency';
```

**Expected:** **No rows returned** (function doesn't exist).

### Step 3: Apply Migration

**Option A: Via Supabase CLI (Recommended)**
```bash
cd /home/workspace/neighborgigs
supabase db push
```

**Option B: Manual SQL**
1. Go to https://supabase.com/dashboard/project/kxpglaetbawiugqmihfj/sql
2. Copy entire content of `db/migrations/009_decline_request_rpc.sql`
3. Click "Run" to execute

### Step 4: Verify Application

```sql
-- Check RPC exists
select proname
from pg_proc
where proname = 'decline_request_with_idempotency';
-- Should return 1 row

-- Check migration history
select * 
from supabase_migrations.schema_migrations 
where version = '009_decline_request_rpc';
-- Should return 1 row
```

### Step 5: Test the Endpoint

```bash
# Test with curl (replace <requestId> and <userId>)
curl -X POST http://localhost:50430/api/v1/requests/<requestId>/decline \
  -H "X-User-Id: <userId>" \
  -H "Idempotency-Key: test-decline-123" \
  -H "Content-Type: application/json"

# Should return: { "request": { ... } } or error

# Test idempotency - call again with same key
curl -X POST http://localhost:50430/api/v1/requests/<requestId>/decline \
  -H "X-User-Id: <userId>" \
  -H "Idempotency-Key: test-decline-123" \
  -H "Content-Type: application/json"

# Should return: Same response (idempotent)
```

---

## Why This Blocks Phase 2

### Risk of Starting Phase 2 Without This Fix

1. **Runtime Errors**
   - API calls to `/decline` will fail with "function does not exist"
   - Users will see 500 errors
   - Development blocked until fixed

2. **Race Conditions**
   - Without idempotency, double-clicking decline could create duplicate records
   - Database invariants may be violated

3. **Data Corruption**
   - Concurrent declines could result in inconsistent state
   - Ledger entries may be created incorrectly

4. **Rule 1 Violation**
   - Architecture requires one write path per concept
   - RPC is the single source of truth
   - Direct DB writes bypass validation and logging

### Timeline Impact

**If you fix this now:**
- 30 minutes to apply migration
- Phase 2 can start immediately after
- No runtime blockers

**If you skip this fix:**
- Phase 2 development will be blocked
- Runtime errors will appear
- Rework required to fix later

---

## Additional Recommendations

### 1. Add Startup Health Check

Create `scripts/health-check-rpc.ts`:

```typescript
// Check if critical RPCs exist before starting server
async function checkRpcExists(rpcName: string) {
  const { data, error } = await db.rpc('health_check_rpc', { rpc_name: rpcName });
  if (error || !data?.exists) {
    throw new Error(`RPC ${rpcName} not found in database`);
  }
}

// Run on startup
await checkRpcExists('decline_request_with_idempotency');
await checkRpcExists('cancel_request_with_idempotency');
await checkRpcExists('accept_request');
await checkRpcExists('complete_task');
```

### 2. Document Database Dependencies

Create `DATABASE_DEPS.md`:

```markdown
# Database Dependencies

## Phase 1 (Required)
- [ ] `decline_request_with_idempotency` (009_decline_request_rpc.sql)
- [ ] `cancel_request_with_idempotency` (008_fix_idempotency_rpc_text_keys.sql)
- [ ] `accept_request` (002_rpc_functions.sql)
- [ ] `complete_task` (002_rpc_functions.sql)
- [ ] `get_wallet` (003_wallet_canonical_model.sql)
- [ ] `get_wallet_transactions` (003_wallet_canonical_model.sql)
- [ ] `request_withdrawal` (003_wallet_canonical_model.sql)
- [ ] `get_nearby_helpers` (002_rpc_functions.sql)

## Phase 2 (Will need)
- `create_draft_with_idempotency`
- `update_draft_with_idempotency`
- `log_preview_event`
- `submit_preview_feedback`
- etc.
```

### 3. Create Migration Deployment Checklist

```markdown
# Migration Deployment Checklist

## Before Deploying
- [ ] Backup production database
- [ ] Test migration on staging
- [ ] Check migration history
- [ ] Verify no conflicts

## During Deploy
- [ ] Run migrations in correct order
- [ ] Monitor for errors
- [ ] Test RPC functionality

## After Deploy
- [ ] Verify RPC exists (SELECT proname FROM pg_proc)
- [ ] Test all endpoints
- [ ] Monitor logs for 24 hours
```

---

## Status

| Component | Status | Notes |
|-----------|--------|-------|
| Migration file | ✅ Ready | `db/migrations/009_decline_request_rpc.sql` |
| Code implementation | ✅ Ready | `routes.ts` using RPC |
| Database deployment | ❌ Pending | Migration not applied |
| Health check | ⚠️ Recommended | Add startup validation |
| Phase 2 blockers | ✅ Resolved | After DB migration |

**Total Fix Time:** 30 minutes (database deployment only)

---

## Next Steps

1. **Immediate (Today):**
   - Apply `009_decline_request_rpc.sql` to Supabase
   - Verify RPC exists
   - Test decline endpoint

2. **After Fix:**
   - Run all Phase 1 integrations tests
   - Verify Rule 1 compliance
   - Start Phase 2 development

3. **Prevent Future Issues:**
   - Add startup health checks
   - Document database dependencies
   - Create migration checklist
