# Known Issues & Risks for Phase 2 Migration

**Analysis Date:** 2026-01-20\
**System Status:** Phase 1 (Near Complete) → Phase 2 (Ready to Start)\
**Focus:** Issues that could block or break Phase 2 development

---

## Executive Summary

I've analyzed the current Phase 1 codebase, migrations, and documentation. You have **4 critical issues** and **5 high-priority issues** that must be resolved before Phase 2 development begins.

**Critical Finding:** The migration ordering is chaotic, causing deployment risks. One direct DB write violates architectural rules. Several tables may have inconsistent schemas.

**Recommendation:** Fix critical issues (2-3 days) before starting Phase 2. This prevents weeks of debugging and deployment failures.

---

## 🔴 Critical Issues (Must Fix Before Phase 2)

### Issue 1: Migration Ordering Chaos

**Problem:** Migrations are numbered inconsistently, creating deployment risks.

**Current Migration Files:**

```markdown
001_initial_schema.sql          ← Base schema
002_rpc_functions.sql           ← RPCs (depends on 001)
003_add_broadcast_columns.sql   ← Add broadcast columns (Phase 1)
003_auto_on_move.sql            ← Auto-on-move logic (Phase 1)
003_broadcast_location.sql      ← Broadcast location (Phase 1)
003_broadcasts.sql              ← Broadcasts (Phase 1)
003_broadcasts_support.sql      ← Broadcast support (Phase 1)
003_wallet_canonical_model.sql  ← Wallet model (CRITICAL)
004_add_broadcast_id_to_task_requests.sql  ← Phase 1
004_broadcast_idempotency.sql              ← Phase 1
004_fix_missing_wallets.sql                ← BUG FIX (depends on 003_wallet_canonical_model)
005_phase1_offer_model.sql                 ← Phase 1
005_phase1_offer_model_clean.sql           ← DUPLICATE of 005
006_respond_to_broadcast.sql               ← Phase 1
007_idempotency_fix.sql                    ← Phase 1
008_fix_idempotency_rpc_text_keys.sql      ← Phase 1
009_create_request_idempotency.sql         ← Phase 1
009_decline_request_rpc.sql                ← Phase 1 (NOT APPLIED)
```

**Issues:**

1. **Three** `003_` **migrations** (broadcast, auto-on-move, wallet) - which runs first?
2. **Two** `004_` **migrations** (broadcast_idempotency, fix_missing_wallets) - which is correct?
3. **Two** `005_` **migrations** (offer_model, offer_model_clean) - duplicate logic
4. **Two** `009_` **migrations** (create_request, decline_request) - both need `008_`

**Impact:**

- New developers won't know which migrations to run
- Production deployments risk applying wrong order
- Supabase migration history may be corrupted
- Phase 2 migrations will conflict with existing order

**Evidence:**

- `file 003_wallet_canonical_model.sql` renames `ledger_entries` → `wallet_transactions`
- `file 002_rpc_functions.sql` still references `ledger_entries`
- If `002_` runs after `003_`, RPCs will fail
- If `003_` runs before `002_`, RPCs will reference non-existent table

**Severity:** 🔴 CRITICAL\
**Risk:** Deployment failures, RPC errors, application crashes\
**Likelihood:** High (already causing issues)

**How to Fix:**

**Option 1: Reorder & Document (Recommended)**

1. Create new migration directory: `db/migrations/phase1_ordered/`
2. Move all Phase 1 migrations in correct order:

   ```markdown
   001_initial_schema.sql              ← Base schema
   002_rpc_functions.sql               ← RPCs (depends on 001)
   003_wallet_canonical_model.sql      ← Wallet model (depends on 002)
   004_broadcast_add_columns.sql       ← Add broadcast fields
   005_broadcast_rpc_functions.sql     ← Broadcast RPCs
   006_idempotency_base.sql            ← Idempotency table
   007_idempotency_text_keys.sql       ← Fix key format
   008_request_idempotency.sql         ← Request RPCs
   009_decline_request_rpc.sql         ← Decline RPC (APPLY THIS)
   010_fix_missing_wallets.sql         ← Bug fix (after 003)
   011_auto_on_move.sql                ← Auto-on-move logic
   ```
3. Update `file routes.ts` to use new RPCs
4. Document: "Always run migrations in this order"

**Option 2: Consolidate Migrations**\
Merge all `003_` files into `file 003_complete_phase1.sql`\
Merge all `004_` files into `file 004_phase1_updates.sql`\
Merge all `005_` files into `file 005_offer_model.sql`

**Immediate Action:** Document correct migration order

---

### Issue 2: Missing Columns in Phase 2 Tables

**Problem:** Some Phase 2 tables documented in `file 2_2_data_model_changes.md` may have missing columns or incorrect schemas.

**Tables to Verify:**

#### `preview_feedback` Table

**Documented Schema (2_2_data_model_changes.md):**

```sql
CREATE TABLE preview_feedback (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  session_id UUID NOT NULL,
  user_id UUID REFERENCES users(id),
  page_path TEXT,
  component_name VARCHAR(100),
  action_attempted VARCHAR(100),
  rating INTEGER CHECK (rating BETWEEN 1 AND 5),
  was_confusing BOOLEAN,
  comments TEXT,
  category VARCHAR(50),
  severity VARCHAR(20) CHECK (severity IN ('low', 'medium', 'high', 'critical')),
  metadata JSONB DEFAULT '{}'
);
```

**Questions:**

- Does this table exist in the database?
- Does it have the `session_id` column?
- Is `session_id` NOT NULL?

**Impact:** If columns are missing, Phase 2 analytics will fail.

#### `preview_events` Table

**Documented Schema:**

```sql
CREATE TABLE preview_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  session_id UUID NOT NULL,
  user_id UUID REFERENCES users(id),
  event_type VARCHAR(100) NOT NULL,
  event_name VARCHAR(200) NOT NULL,
  flow_name VARCHAR(100),
  action_name VARCHAR(100),
  duration_ms INTEGER,
  metadata JSONB DEFAULT '{}',
  blocked_action VARCHAR(100),
  block_reason TEXT
);
```

**Questions:**

- Does this table exist?
- Are all columns present?

#### `drafts` Table (Only if DRAFTS_PERSISTED=true)

**Documented Schema:**

```sql
CREATE TABLE drafts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  entity_type VARCHAR(50) NOT NULL,
  entity_id UUID,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  draft_data JSONB NOT NULL DEFAULT '{}',
  status VARCHAR(20) NOT NULL DEFAULT 'draft',
  submitted_at TIMESTAMP WITH TIME ZONE,
  is_preview BOOLEAN DEFAULT false,
  session_id UUID,
  metadata JSONB DEFAULT '{}'
);
```

**Questions:**

- Does this table exist?
- Is `session_id` nullable or NOT NULL?

**Severity:** 🔴 CRITICAL\
**Risk:** Phase 2 features will fail at runtime\
**Likelihood:** Unknown (need to verify database schema)

**How to Fix:**

1. **Verify Current Schema:**

   ```sql
   -- Run in Supabase SQL Editor
   SELECT table_name, column_name, data_type, is_nullable
   FROM information_schema.columns 
   WHERE table_schema = 'public' 
     AND table_name IN ('preview_feedback', 'preview_events', 'drafts', 'preview_settings')
   ORDER BY table_name, ordinal_position;
   ```

2. **Compare with Documentation:**

   - If columns missing → Create migration to add them
   - If columns exist but wrong type → Fix in documentation
   - If table doesn't exist → Create it

3. **Create Migration File:**

   ```sql
   -- migration/phase2_schema_fix.sql
   -- Add missing columns to preview_feedback
   ALTER TABLE preview_feedback
     ADD COLUMN IF NOT EXISTS session_id UUID NOT NULL,
     ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES users(id);
   ```

---

### Issue 3: Direct DB Write in Decline Endpoint

**Problem:** One endpoint still violates Rule 1 (one write path per concept).

**Location:** `src/backend/routes.ts:479`

**Current Code (Direct DB Write):**

```typescript
api.post('/api/v1/requests/:requestId/decline', async (c) => {
  const userId = getUserId(c);
  const requestId = c.req.param('requestId');

  const { data, error } = await db
    .from('task_requests')
    .update({ status: 'declined' })  // ← VIOLATES RULE 1
    .eq('id', requestId)
    .eq('helper_id', userId)
    .select()
    .single();

  if (error || !data) {
    return c.json(errorResponse('NOT_FOUND', 'Request not found'), 404);
  }

  return c.json({ request: data });
});
```

**Status:** Integration alignment shows 95% complete

- This is the 5% gap
- Migration `file 009_decline_request_rpc.sql` exists but isn't applied

**Impact:**

- **No idempotency** → Duplicate declines possible
- **No transaction isolation** → Race conditions
- **No validation** → Invalid declines may succeed
- **Violates architecture** → Breaks consistency

**Evidence:**

```bash
# Migration exists but not in deployment
cat db/migrations/009_decline_request_rpc.sql
```

**Severity:** 🔴 CRITICAL\
**Risk:** Race conditions, duplicate declines, data corruption\
**Likelihood:** High (multiple helpers can decline simultaneously)

**How to Fix:**

**Step 1: Apply Migration in Supabase**

```sql
-- Copy this SQL to Supabase SQL Editor and run it
CREATE OR REPLACE FUNCTION decline_request_with_idempotency(
  p_idempotency_key text,
  p_request_id uuid,
  p_helper_id uuid
)
RETURNS json
LANGUAGE plpgsql
AS $$
DECLARE
  v_existing_key idempotency_keys;
  v_request task_requests;
BEGIN
  -- Check idempotency
  SELECT * INTO v_existing_key
  FROM idempotency_keys
  WHERE key = p_idempotency_key;

  IF FOUND THEN
    -- Return stored response
    RETURN v_existing_key.response;
  END IF;

  -- Check request exists and belongs to helper
  SELECT * INTO v_request
  FROM task_requests
  WHERE id = p_request_id AND helper_id = p_helper_id;

  IF NOT FOUND THEN
    RETURN jsonb_build_object(
      'error', jsonb_build_object(
        'code', 'NOT_FOUND',
        'message', 'Request not found or you are not the helper'
      )
    );
  END IF;

  -- Check not already declined
  IF v_request.status = 'declined' THEN
    RETURN jsonb_build_object(
      'ok', true,
      'status', 'already_declined'
    );
  END IF;

  -- Check not already accepted
  IF v_request.status = 'accepted' THEN
    RETURN jsonb_build_object(
      'error', jsonb_build_object(
        'code', 'CONFLICT',
        'message', 'Request already accepted'
      )
    );
  END IF;

  -- Perform the decline
  UPDATE task_requests
  SET status = 'declined'
  WHERE id = p_request_id;

  -- Store response for idempotency
  INSERT INTO idempotency_keys (key, action, user_id, response)
  VALUES (
    p_idempotency_key,
    'decline_request',
    p_helper_id,
    jsonb_build_object('ok', true, 'status', 'declined')
  );

  RETURN jsonb_build_object('ok', true, 'status', 'declined');
END;
$$;
```

**Step 2: Update routes.ts**

```typescript
// Replace the direct DB write with RPC call
api.post('/api/v1/requests/:requestId/decline', async (c) => {
  const userId = getUserId(c);
  const requestId = c.req.param('requestId');
  const body = await c.req.json();
  const { idempotency_key } = body;

  if (!idempotency_key) {
    return c.json(
      { error: { code: 'BAD_REQUEST', message: 'idempotency_key required' } },
      400
    );
  }

  const { data: result, error } = await db.rpc('decline_request_with_idempotency', {
    p_idempotency_key: idempotency_key,
    p_request_id: requestId,
    p_helper_id: userId
  });

  if (error) {
    return c.json(
      { error: { code: 'INTERNAL_ERROR', message: error.message } },
      500
    );
  }

  if (result?.error) {
    const statusCode = result.error.code === 'CONFLICT' ? 409 : 404;
    return c.json({ error: result.error }, statusCode);
  }

  return c.json(result);
});
```

**Step 3: Update Frontend**

```typescript
// In ActiveTask.tsx or wherever decline is called
const handleDecline = async () => {
  const idempotencyKey = `decline:${requestId}:${userId}`;
  const result = await apiClient.declineRequest(requestId, { idempotency_key: idempotencyKey });
  // Handle result...
};
```

---

### Issue 4: Ledger Entries Table Name Conflict

**Problem:** Migrations reference different table names for the ledger.

**Evidence:**

- `file 001_initial_schema.sql`: Creates `ledger_entries` table
- `file 003_wallet_canonical_model.sql`: Renames `ledger_entries` → `wallet_transactions`
- `file 002_rpc_functions.sql`: References `ledger_entries` (should reference `wallet_transactions`)
- `file 003_auto_on_move.sql`: References `ledger_entries` (should reference `wallet_transactions`)
- `file 007_idempotency_fix.sql`: References `ledger_entries` (should reference `wallet_transactions`)

**Timeline Issue:**

1. `file 002_rpc_functions.sql` creates RPCs that reference `ledger_entries`
2. `file 003_wallet_canonical_model.sql` renames the table
3. RPCs now reference non-existent table

**Impact:**

- RPCs will fail if migrations run in correct order
- Application crashes
- Money transactions will fail

**Severity:** 🔴 CRITICAL\
**Risk:** Application crashes, transaction failures\
**Likelihood:** High (if migrations run in order)

**How to Fix:**

**Option 1: Fix Migration Order (Best)**

- Reorder migrations so `file 003_wallet_canonical_model.sql` runs BEFORE `file 002_rpc_functions.sql`
- Update all RPCs to reference `wallet_transactions`

**Option 2: Update Old Migrations (Complex)**

- Update `file 002_rpc_functions.sql` to reference `wallet_transactions`
- Update `file 003_auto_on_move.sql` to reference `wallet_transactions`
- Update `file 007_idempotency_fix.sql` to reference `wallet_transactions`

**Recommended:** Create a new migration that fixes all RPC references:

```sql
-- migration/fix_ledger_references.sql
-- Update all RPC functions to use wallet_transactions instead of ledger_entries

-- 1. Fix complete_task RPC
CREATE OR REPLACE FUNCTION complete_task(...)
BEGIN
  -- Change: insert into ledger_entries → insert into wallet_transactions
  INSERT INTO wallet_transactions (
    id, wallet_id, user_id, type, amount_usd, source, reference_id, status
  ) VALUES (...);
END;

-- 2. Fix request_withdrawal RPC
CREATE OR REPLACE FUNCTION request_withdrawal(...)
BEGIN
  -- Change: insert into ledger_entries → insert into wallet_transactions
  INSERT INTO wallet_transactions (
    id, wallet_id, user_id, type, amount_usd, source, reference_id, status
  ) VALUES (...);
END;

-- 3. Fix accept_request RPC (if it references ledger_entries)
```

---

## 🟡 High Priority Issues (Fix Before Phase 2)

### Issue 5: Inconsistent RPC Idempotency

**Problem:** Some RPCs have idempotency, others don't.

**Status:**

- ✅ `create_broadcast_with_idempotency` - Has idempotency
- ✅ `respond_to_broadcast_with_idempotency` - Has idempotency
- ✅ `cancel_request_with_idempotency` - Has idempotency
- ✅ `create_request_with_idempotency` - Has idempotency
- ❌ `decline_request_with_idempotency` - **Not applied** (Issue 3)
- ❌ `accept_request` - No idempotency
- ❌ `complete_task` - No idempotency
- ❌ `request_withdrawal` - Has RPC, idempotency unclear

**Impact:**

- Duplicate task acceptance possible
- Duplicate task completion possible
- Duplicate withdrawals possible
- Race conditions between helpers

**Evidence:**

```sql
-- accept_request has no idempotency check
CREATE OR REPLACE FUNCTION accept_request(...)
BEGIN
  -- No idempotency check at start
  -- Can be called multiple times with same parameters
END;

-- complete_task has no idempotency check
CREATE OR REPLACE FUNCTION complete_task(...)
BEGIN
  -- No idempotency check
  -- Can be called multiple times
END;
```

**Severity:** 🟡 HIGH\
**Risk:** Duplicate transactions, financial errors\
**Likelihood:** Medium (depends on UI preventing double-clicks)

**How to Fix:**

**Phase 1 (Immediate - Before Phase 2):**

```sql
-- 1. Add idempotency to accept_request
CREATE OR REPLACE FUNCTION accept_request_with_idempotency(
  p_idempotency_key text,
  p_request_id uuid,
  p_helper_id uuid,
  p_requester_id uuid,
  p_message text,
  p_tip numeric
)
RETURNS json
LANGUAGE plpgsql
AS $$
DECLARE
  v_existing_key idempotency_keys;
  v_task tasks;
BEGIN
  -- Check idempotency
  SELECT * INTO v_existing_key
  FROM idempotency_keys
  WHERE key = p_idempotency_key;

  IF FOUND THEN
    RETURN v_existing_key.response;
  END IF;

  -- Existing accept logic here...
  -- [Copy from current accept_request]

  -- Store response
  INSERT INTO idempotency_keys (key, action, user_id, response)
  VALUES (p_idempotency_key, 'accept_request', p_helper_id, jsonb_build_object(...));
END;
$$;

-- 2. Add idempotency to complete_task
CREATE OR REPLACE FUNCTION complete_task_with_idempotency(
  p_idempotency_key text,
  p_task_id uuid,
  p_helper_id uuid,
  p_wallet_id uuid,
  p_tip_amount numeric,
  p_proof_photo_url text default null
)
RETURNS json
LANGUAGE plpgsql
AS $$
DECLARE
  v_existing_key idempotency_keys;
  v_task tasks;
BEGIN
  -- Check idempotency
  SELECT * INTO v_existing_key
  FROM idempotency_keys
  WHERE key = p_idempotency_key;

  IF FOUND THEN
    RETURN v_existing_key.response;
  END IF;

  -- Existing complete logic here...
  -- [Copy from current complete_task]

  -- Store response
  INSERT INTO idempotency_keys (key, action, user_id, response)
  VALUES (p_idempotency_key, 'complete_task', p_helper_id, jsonb_build_object(...));
END;
$$;
```

**Phase 2 (Planned):**\
3. Audit all RPCs for idempotency\
4. Create idempotency checklist\
5. Add tests for duplicate submissions

---

### Issue 6: Duplicate Transaction Columns (Due to Renaming)

**Problem:** Column name changes in migrations may cause inconsistencies.

**Evidence:**

```sql
-- 001_initial_schema.sql
CREATE TABLE ledger_entries (
  id UUID PRIMARY KEY,
  entry_type TEXT,  -- ← Old name
  amount_usd DECIMAL(10,2),  -- ← Is this dollars or cents?
  -- ...
);

-- 003_wallet_canonical_model.sql
ALTER TABLE ledger_entries RENAME TO wallet_transactions;
ALTER TABLE wallet_transactions
  ADD COLUMN IF NOT EXISTS type TEXT CHECK (type IN ('credit','debit','hold','release')),
  ADD COLUMN IF NOT EXISTS status TEXT CHECK (status IN ('pending','completed','failed'));
```

**Questions:**

1. Does `entry_type` still exist or was it replaced by `type`?
2. Is `amount_usd` in dollars or cents?
3. Do functions multiply by 100 assuming dollars?

**Evidence of Confusion:**

```sql
-- 003_wallet_canonical_model.sql
create or replace function get_ledger_balance_cents(p_user_id uuid)
returns integer
language sql
as $$
  select coalesce(sum(amount_usd * 100), 0)::integer  -- ← WHY multiply by 100?
  from wallet_transactions
  where user_id = p_user_id
    and status = 'completed';
$$;
```

**Issues:**

1. If `amount_usd` is already in cents, multiplying by 100 is wrong
2. If `amount_usd` is in dollars, the column name is misleading
3. Inconsistent: function returns `integer` (cents) but column says `_usd` (dollars)

**Severity:** 🟡 MEDIUM\
**Risk:** Balance calculation errors, financial discrepancies\
**Likelihood:** Medium (if data entry is inconsistent)

**How to Fix:**

**Step 1: Verify Current Schema**

```sql
-- Check wallet_transactions schema
\d wallet_transactions;

-- Check what type column values are
SELECT DISTINCT type FROM wallet_transactions LIMIT 10;
SELECT DISTINCT status FROM wallet_transactions LIMIT 10;
SELECT amount_usd FROM wallet_transactions LIMIT 5;
```

**Step 2: Choose Consistent Naming**

```sql
-- Option A: Use _cents suffix (Recommended for integer storage)
ALTER TABLE wallet_transactions RENAME COLUMN amount_usd TO amount_cents;

-- Update all functions to use _cents
CREATE OR REPLACE FUNCTION get_ledger_balance_cents(p_user_id uuid)
RETURNS integer
LANGUAGE sql
AS $$
  SELECT COALESCE(SUM(amount_cents), 0)
  FROM wallet_transactions
  WHERE user_id = p_user_id
    AND status = 'completed';
$$;

-- Option B: Use _usd suffix (Keep as decimal)
-- Keep amount_usd as DECIMAL, update all functions to NOT multiply by 100
```

**Step 3: Update Documentation**\
Update `file 2_2_data_model_changes.md` to reflect correct column type.

---

### Issue 7: Inconsistent Data Types in RPC Parameters

**Problem:** RPCs use different idempotency key types.

**Evidence:**

```sql
-- 007_idempotency_fix.sql
CREATE TABLE idempotency_keys (
  key TEXT PRIMARY KEY,  -- ← TEXT type
  ...
);

-- 008_fix_idempotency_rpc_text_keys.sql
CREATE OR REPLACE FUNCTION create_broadcast_with_idempotency(
  p_idempotency_key text,  -- ← Accepts text
  ...
)
```

But earlier RPCs might use UUID:

```sql
-- Some RPCs may still expect UUID
CREATE OR REPLACE FUNCTION some_old_rpc(
  p_idempotency_key uuid,  -- ← If this exists
  ...
)
```

**Impact:**

- Type mismatch errors
- RPC calls fail
- Inconsistent idempotency behavior

**Severity:** 🟡 MEDIUM\
**Risk:** RPC failures, type mismatch errors\
**Likelihood:** Low (if all RPCs were updated)

**How to Fix:**

**Step 1: Audit All RPCs**

```sql
-- Check all RPC function signatures
SELECT p.proname, pg_get_function_arguments(p.oid) as arguments
FROM pg_proc p
JOIN pg_namespace n ON p.pronamespace = n.oid
WHERE n.nspname = 'public'
  AND p.proname LIKE '%idempotency%'
  OR p.proname LIKE '%withdrawal%'
  OR p.proname LIKE '%accept%'
  OR p.proname LIKE '%complete%'
ORDER BY p.proname;
```

**Step 2: Update Consistency**\
Ensure all idempotency_key parameters are `text` type.

---

### Issue 8: Missing RPC for Send Message/Request

**Problem:** RequestHelp.tsx sends messages to helpers, but RPC may not exist.

**Evidence from routes.ts:**

```typescript
// POST /api/v1/requests
// Creates task_request with status = 'sent'
```

**Questions:**

- Does this use an RPC or direct insert?
- Is it idempotent?
- Does it check for existing requests?

**Severity:** 🟡 MEDIUM\
**Risk:** Duplicate requests, race conditions\
**Likelihood:** Unknown (need to verify)

**How to Fix:**

**Step 1: Verify Implementation**\
Check `file routes.ts` for `/api/v1/requests` endpoint:

- If direct DB insert → Convert to RPC
- If already uses RPC → Verify idempotency

**Step 2: Create/Update RPC**

```sql
CREATE OR REPLACE FUNCTION create_request_with_idempotency(
  p_idempotency_key text,
  p_requester_id uuid,
  p_helper_id uuid,
  p_message text,
  p_tip_usd numeric,
  p_location_lat numeric,
  p_location_lng numeric
)
RETURNS json
LANGUAGE plpgsql
AS $$
DECLARE
  v_existing_key idempotency_keys;
  v_request task_requests;
BEGIN
  -- Check idempotency
  SELECT * INTO v_existing_key
  FROM idempotency_keys
  WHERE key = p_idempotency_key;

  IF FOUND THEN
    RETURN v_existing_key.response;
  END IF;

  -- Validate helper is on the move
  -- Validate helper is within radius
  -- Create request
  -- Store idempotency

  RETURN jsonb_build_object('ok', true, 'request', to_jsonb(v_request));
END;
$$;
```

---

### Issue 9: Preview Event Logging Not Configured

**Problem:** `preview_events` table exists but logging may not be configured.

**Questions:**

- Are preview events being logged?
- Where does logging happen (frontend or backend)?
- Is the `preview_events` table created in Phase 1 or Phase 2?

**Evidence:**

- `file 2_2_data_model_changes.md` defines `preview_events` table
- No migration file creates this table (as of now)
- Logging strategy is documented but may not be implemented

**Severity:** 🟡 MEDIUM\
**Risk:** Phase 2 analytics will fail, no data to inform decisions\
**Likelihood:** High (table not in Phase 1 migrations)

**How to Fix:**

**Step 1: Create Migration for Preview Tables**

```sql
-- migration/012_phase2_preview_tables.sql
CREATE TABLE preview_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  session_id UUID NOT NULL,
  user_id UUID REFERENCES users(id),
  event_type VARCHAR(100) NOT NULL,
  event_name VARCHAR(200) NOT NULL,
  flow_name VARCHAR(100),
  action_name VARCHAR(100),
  duration_ms INTEGER,
  metadata JSONB DEFAULT '{}',
  blocked_action VARCHAR(100),
  block_reason TEXT
);

CREATE TABLE preview_feedback (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  session_id UUID NOT NULL,
  user_id UUID REFERENCES users(id),
  page_path TEXT,
  component_name VARCHAR(100),
  action_attempted VARCHAR(100),
  rating INTEGER CHECK (rating BETWEEN 1 AND 5),
  was_confusing BOOLEAN,
  comments TEXT,
  category VARCHAR(50),
  severity VARCHAR(20) CHECK (severity IN ('low', 'medium', 'high', 'critical')),
  metadata JSONB DEFAULT '{}'
);

CREATE TABLE preview_settings (
  key VARCHAR(100) PRIMARY KEY,
  value TEXT NOT NULL,
  description TEXT,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

INSERT INTO preview_settings (key, value, description) VALUES
  ('preview_mode', 'false', 'Global preview mode toggle'),
  ('preview_allow_drafts', 'true', 'Allow draft creation in preview'),
  ('preview_allow_profile_edit', 'true', 'Allow non-critical profile edits in preview'),
  ('preview_block_finalize', 'true', 'Block finalization actions in preview'),
  ('preview_analytics_enabled', 'true', 'Enable preview event logging');
```

**Step 2: Update routes.ts to Log Events**

```typescript
// In preview middleware or RPCs
async function logPreviewEvent(event: PreviewEvent) {
  await db.preview_events.insert({
    session_id: event.sessionId,
    user_id: event.userId,
    event_type: event.type,
    event_name: event.name,
    flow_name: event.flowName,
    action_name: event.actionName,
    duration_ms: event.durationMs,
    metadata: event.metadata,
  });
}
```

---

## 🟢 Medium Priority Issues (Can Fix During Phase 2)

### Issue 10: Migration #003 Creates Duplicate Columns

**Problem:** Migration `file 003_wallet_canonical_model.sql` may try to add columns that already exist.

**Evidence:**

```sql
ALTER TABLE wallet_transactions
  ADD COLUMN IF NOT EXISTS user_id uuid,
  ADD COLUMN IF NOT EXISTS type text CHECK (type IN ('credit','debit','hold','release')),
  ADD COLUMN IF NOT EXISTS status text CHECK (status IN ('pending','completed','failed')),
  ADD COLUMN IF NOT EXISTS reference_id uuid,
  ADD COLUMN IF NOT EXISTS created_at timestamp DEFAULT NOW();
```

**Issues:**

1. `IF NOT EXISTS` hides errors
2. Column may already exist from earlier migration
3. `created_at` likely already exists in `wallet_transactions`

**Severity:** 🟢 MEDIUM\
**Risk:** Silent failures, schema inconsistencies\
**Likelihood:** Low (IF NOT EXISTS prevents errors)

**How to Fix:**\
This is low priority because `IF NOT EXISTS` prevents failures. However, for clarity:

```sql
-- Create a cleanup migration
ALTER TABLE wallet_transactions
  ADD COLUMN IF NOT EXISTS user_id uuid,
  ADD COLUMN IF NOT EXISTS reference_id uuid;

-- Backfill user_id
UPDATE wallet_transactions wt
SET user_id = (SELECT w.user_id FROM wallets w WHERE w.id = wt.wallet_id)
WHERE wt.user_id IS NULL;

-- Add constraints
ALTER TABLE wallet_transactions ALTER COLUMN user_id SET NOT NULL;
```

---

### Issue 11: Withdrawal RPC May Not Be Idempotent

**Problem:** `request_withdrawal` RPC may not have idempotency key parameter.

**Evidence:**

```sql
-- 003_wallet_canonical_model.sql
CREATE OR REPLACE FUNCTION request_withdrawal(
  p_idempotency_key uuid,  -- ← Accepts UUID
  p_user_id uuid,
  p_amount_usd numeric
)
```

**Issues:**

1. Uses `uuid` type (should be `text`)
2. May not check idempotency properly
3. May create duplicate withdrawals

**Severity:** 🟢 MEDIUM\
**Risk:** Duplicate withdrawals, financial errors\
**Likelihood:** Low (if UI prevents double-clicks)

**How to Fix:**

```sql
CREATE OR REPLACE FUNCTION request_withdrawal(
  p_idempotency_key text,  -- ← Change to text
  p_user_id uuid,
  p_amount_usd numeric
)
RETURNS json
LANGUAGE plpgsql
AS $$
DECLARE
  v_existing_key idempotency_keys;
  v_existing_withdrawal withdrawal_requests;
BEGIN
  -- Check idempotency
  SELECT * INTO v_existing_key
  FROM idempotency_keys
  WHERE key = p_idempotency_key;

  IF FOUND THEN
    RETURN v_existing_key.response;
  END IF;

  -- Check for existing withdrawal
  SELECT * INTO v_existing_withdrawal
  FROM withdrawal_requests
  WHERE id = p_idempotency_key;

  IF FOUND THEN
    -- Return existing result
    RETURN jsonb_build_object('ok', true, 'status', 'processed');
  END IF;

  -- Existing withdrawal logic here...

  -- Store idempotency
  INSERT INTO idempotency_keys (key, action, user_id, response)
  VALUES (p_idempotency_key, 'request_withdrawal', p_user_id, jsonb_build_object(...));
END;
$$;
```

---

### Issue 12: Preview Feedback Table Structure

**Problem:** `preview_feedback` table has `rating` column but rating may not be used everywhere.

**Evidence:**

```sql
CREATE TABLE preview_feedback (
  ...
  rating INTEGER CHECK (rating BETWEEN 1 AND 5),
  was_confusing BOOLEAN,
  ...
);
```

**Questions:**

- Is `rating` used?
- Should `was_confusing` be used instead?
- Are both needed?

**Severity:** 🟢 LOW\
**Risk:** Data inconsistency, unused columns\
**Likelihood:** Low (design decision)

**How to Fix:**\
Decide on feedback structure:

- Option A: Keep both (rating for quick feedback, was_confusing for context)
- Option B: Use only `was_confusing` (simpler)
- Option C: Add `thumbs_up_down` boolean (simplest)

---

## 📋 Priority Matrix

| Issue | Severity | Likelihood | Fix Time | Priority |
| --- | --- | --- | --- | --- |
| 1\. Migration ordering chaos | 🔴 Critical | High | 1-2 days | **P0** |
| 2\. Missing columns | 🔴 Critical | High | 0.5 days | **P0** |
| 3\. Direct DB write | 🔴 Critical | High | 0.5 days | **P0** |
| 4\. Ledger table name conflict | 🔴 Critical | High | 1 day | **P0** |
| 5\. Inconsistent RPC idempotency | 🟡 High | Medium | 1 day | **P1** |
| 6\. Duplicate transaction columns | 🟡 Medium | Medium | 0.5 days | **P1** |
| 7\. Inconsistent RPC data types | 🟡 Medium | Low | 0.25 days | **P1** |
| 8\. Missing RPC for requests | 🟡 Medium | Unknown | 0.5 days | **P1** |
| 9\. Preview event logging | 🟡 Medium | High | 1 day | **P1** |
| 10\. Duplicate column additions | 🟢 Medium | Low | 0.25 days | **P2** |
| 11\. Withdrawal RPC idempotency | 🟢 Medium | Low | 0.5 days | **P2** |
| 12\. Preview feedback structure | 🟢 Low | Low | 0.25 days | **P2** |

**Total P0:** 3-5 days\
**Total P1:** 3-5 days\
**Total P2:** 1-2 days

---

## 🎯 Implementation Roadmap

### Week 1: Fix Critical Issues (P0)

**Day 1: Migration Ordering**

- [ ]  Document correct migration order

- [ ]  Create new migration directory `db/migrations/phase1_ordered/`

- [ ]  Move/reorder migrations in correct sequence

- [ ]  Update deployment documentation

**Day 2: Table Schema Fixes**

- [ ]  Verify database schema vs documentation

- [ ]  Create migration to add missing columns to `preview_feedback`

- [ ]  Create migration to add missing columns to `preview_events`

- [ ]  Create migration for `preview_settings` table

**Day 3: Fix Direct DB Write**

- [ ]  Apply `file 009_decline_request_rpc.sql`

- [ ]  Update `file routes.ts` to use `decline_request_with_idempotency` RPC

- [ ]  Update frontend to generate idempotency keys

**Day 4: Fix Ledger Table Name**

- [ ]  Verify `ledger_entries` → `wallet_transactions` rename

- [ ]  Update `file 002_rpc_functions.sql` to use `wallet_transactions`

- [ ]  Update `file 003_auto_on_move.sql` to use `wallet_transactions`

- [ ]  Update `file 007_idempotency_fix.sql` to use `wallet_transactions`

**Day 5: Test Critical Fixes**

- [ ]  Run all migrations in order

- [ ]  Test decline endpoint

- [ ]  Test wallet balance calculations

- [ ]  Verify no RPC errors

### Week 2: Fix High Priority Issues (P1)

**Day 6: Add Idempotency to Accept/Complete**

- [ ]  Create `accept_request_with_idempotency` RPC

- [ ]  Create `complete_task_with_idempotency` RPC

- [ ]  Update routes.ts

**Day 7: Fix Transaction Columns**

- [ ]  Verify `amount_usd` vs `amount_cents`

- [ ]  Create migration to rename if needed

- [ ]  Update all functions consistently

**Day 8: Fix RPC Data Types**

- [ ]  Audit all RPC signatures

- [ ]  Ensure all idempotency_key parameters are `text`

- [ ]  Update documentation

**Day 9: Add Missing RPCs**

- [ ]  Verify `create_request_with_idempotency` exists

- [ ]  Update if needed

- [ ]  Add tests for duplicate submissions

**Day 10: Setup Preview Event Logging**

- [ ]  Create preview tables (events, feedback, settings)

- [ ]  Update routes.ts to log events

- [ ]  Add frontend logging

### Week 3: Clean Up (P2)

**Day 11: Remove Duplicate Columns**

- [ ]  Check for duplicate column additions

- [ ]  Create cleanup migration if needed

**Day 12: Fix Withdrawal RPC**

- [ ]  Verify idempotency in `request_withdrawal`

- [ ]  Update if needed

**Day 13: Review Preview Feedback Structure**

- [ ]  Decide on feedback format

- [ ]  Update documentation

**Day 14: Final Verification**

- [ ]  Run all migrations

- [ ]  Test all RPCs

- [ ]  Verify no regressions

- [ ]  Update deployment checklist

---

## 🛡️ Safety-First Deployment Strategy

### Step 1: Staging Environment

1. Create fresh staging database
2. Apply all migrations in order
3. Test all RPCs
4. Run integration tests

### Step 2: Production Deployment

1. **Backup Production Database**

   ```bash
   # Use Supabase backup feature
   # Download SQL dump
   # Store safely
   ```

2. **Create Migration Plan**

   ```markdown
   1. Apply migration ordering fix (no schema changes)
   2. Apply missing columns (additive only)
   3. Apply RPC updates (no data changes)
   4. Apply cleanup migrations
   ```

3. **Deploy During Low Traffic**

   - Early morning hours
   - Maintenance window
   - Rollback plan ready

4. **Verify After Deployment**

   - Check all RPCs return 200
   - Verify wallet balances correct
   - Test decline/accept/complete flows
   - Monitor error logs

### Step 3: Rollback Plan

If something breaks:

1. Restore from backup
2. Revert to previous migration state
3. Investigate and fix

---

## 📊 Success Criteria

### Before Phase 2 Development Starts

- ✅ All P0 issues fixed
- ✅ All migrations run in correct order
- ✅ All RPCs work without errors
- ✅ Database schema matches documentation
- ✅ No direct DB writes in routes
- ✅ Idempotency implemented for all state mutations

### During Phase 2 Development

- ✅ Can add Phase 2 migrations without conflicts
- ✅ Preview mode works as documented
- ✅ No race conditions in draft creation
- ✅ No duplicate submissions
- ✅ Analytics capture all events

---

## 🚀 Quick Wins (If Time is Limited)

If you only have **1-2 days** before Phase 2 starts:

### Fix These 3 Things First:

1. **Apply decline_request_rpc.sql** (30 min)

   - Run migration
   - Update routes.ts
   - Update frontend

2. **Add missing columns to preview tables** (1 hour)

   - Run migration for preview_feedback
   - Run migration for preview_events

3. **Document migration order** (30 min)

   - Create `file MIGRATION_ORDER.md`
   - List correct order
   - Deploy to team

**Result:** Prevents 80% of issues with 20% effort.

---

## 📝 Action Items for You

### Immediate (Today):

1. **Check database schema** - Verify what's actually deployed

   ```sql
   SELECT table_name, column_name, data_type, is_nullable
   FROM information_schema.columns 
   WHERE table_schema = 'public'
   ORDER BY table_name, ordinal_position;
   ```

2. **Apply decline_request_rpc.sql** in Supabase SQL Editor

3. **Update routes.ts** to use the new RPC

### This Week:

1. **Fix migration ordering** - Create ordered directory
2. **Add missing columns** - Create migration for preview tables
3. **Add idempotency** - accept_request, complete_task
4. **Fix ledger references** - Update all RPCs to use wallet_transactions

### Next Week:

1. **Test everything** - Run all RPCs, test all flows
2. **Update documentation** - Phase 2 docs with corrected schemas
3. **Start Phase 2 development** - With clean slate

---

## 📞 Need Help?

If you're stuck on any of these:

- Review the `file INTEGRATION_ALIGNMENT_STATUS.md` file
- Check the `file BROADCAST_DUPLICATE_PREVENTION.md` file
- Use Supabase SQL Editor to test migrations
- Test RPCs individually before committing

**Bottom Line:** Fix the 4 critical issues first (2-3 days). This prevents weeks of debugging during Phase 2 development.