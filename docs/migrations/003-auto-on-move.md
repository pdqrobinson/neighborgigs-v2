# Migration 003: Auto-Enable "On The Move" on Task Acceptance

**Purpose**: Repurpose the `on_the_move` feature to automatically activate when a helper accepts a task.

**Updated:** 2026-01-21 (Manual upload workflow)

---

## ⚠️ SUPABASE CREDENTIALS - MANUAL UPLOAD REQUIRED

**Current Workflow:** Manual upload via Supabase SQL Editor  
**Reason:** Supabase credentials consistently fail for CLI/automation  
**See:** `../MANUAL_MIGRATION_UPLOAD.md` for complete workflow

---

## Instructions

### Option 1: Apply via Supabase SQL Editor (Recommended - Current Workflow)

1. Go to your Supabase project dashboard
2. Navigate to **SQL Editor**
3. Create a new query
4. Copy and paste the SQL below
5. Click **Run**
6. Verify success before proceeding to next migration

### Option 2: Apply via psql (Command Line - Credentials May Fail)

```bash
# WARNING: This may fail due to Supabase credential issues
psql -h kxpglaetbawiugqmihfj.supabase.co -U postgres -d postgres -f 003_auto_on_move.sql
```

---

## Migration SQL

```sql
-- Replace the existing accept_request RPC function to auto-enable "on the move"
-- when a helper accepts a task

CREATE OR REPLACE FUNCTION accept_request(
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
  v_request task_requests;
  v_task tasks;
  v_wallet_id uuid;
BEGIN
  -- Lock and validate request
  SELECT * INTO v_request
  FROM task_requests
  WHERE id = p_request_id AND status = 'sent' AND helper_id = p_helper_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('error', jsonb_build_object('code', 'CONFLICT', 'message', 'Request not available'));
  END IF;

  -- Check helper doesn't have active task
  IF EXISTS (
    SELECT 1 FROM tasks
    WHERE helper_id = p_helper_id AND status IN ('accepted', 'in_progress')
  ) THEN
    RETURN jsonb_build_object('error', jsonb_build_object('code', 'CONFLICT', 'message', 'Helper already has active task'));
  END IF;

  -- Get helper's wallet id
  SELECT id INTO v_wallet_id
  FROM wallets
  WHERE user_id = p_helper_id;

  IF v_wallet_id IS NULL THEN
    -- Create wallet if doesn't exist
    INSERT INTO wallets (id, user_id)
    VALUES (gen_random_uuid(), p_helper_id)
    RETURNING id INTO v_wallet_id;
  END IF;

  -- Create task
  INSERT INTO tasks (id, requester_id, helper_id, description, tip_amount_usd, status)
  VALUES (gen_random_uuid(), p_requester_id, p_helper_id, p_message, p_tip, 'accepted')
  RETURNING * INTO v_task;

  -- Update request
  UPDATE task_requests
  SET status = 'accepted', task_id = v_task.id
  WHERE id = p_request_id;

  -- NEW: Auto-enable "on the move" for the helper
  -- Set helper to "on the move" with a 2-hour window
  UPDATE users
  SET
    on_the_move = true,
    direction = 'out',
    move_expires_at = now() + interval '2 hours'
  WHERE id = p_helper_id;

  RETURN jsonb_build_object(
    'task_request', to_jsonb(v_request),
    'task', to_jsonb(v_task)
  );
END;
$$;
```

---

## What This Changes

### Before
- `on_the_move` was only set when user manually called `POST /movement/start`
- Helper could accept task without any visual indicator to requester

### After
- When a helper accepts a request, `on_the_move` is automatically set to `true`
- Helper gets a 2-hour "on the move" window
- `direction` is set to `'out'` (indicating they're en route to help)
- Frontend shows "Your neighbor is on the move" (or "You are on the move" for helper)

---

## Verification

After applying this migration, test by:

1. Create a broadcast from User A
2. User B accepts a request from User A
3. Check `ActiveTask` page:
   - For User B (helper): Should see "You are on the move"
   - For User A (requester): Should see "Your neighbor is on the move"
4. Verify in database:
   ```sql
   SELECT id, first_name, on_the_move, direction, move_expires_at
   FROM users
   WHERE id = '<helper_user_id>';
   ```
   Expected: `on_the_move = true`, `direction = 'out'`, `move_expires_at` ~ 2 hours from now

---

## Rollback (If Needed)

To revert to previous behavior:

```sql
CREATE OR REPLACE FUNCTION accept_request(
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
  v_request task_requests;
  v_task tasks;
  v_wallet_id uuid;
BEGIN
  SELECT * INTO v_request
  FROM task_requests
  WHERE id = p_request_id AND status = 'sent' AND helper_id = p_helper_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('error', jsonb_build_object('code', 'CONFLICT', 'message', 'Request not available'));
  END IF;

  IF EXISTS (
    SELECT 1 FROM tasks
    WHERE helper_id = p_helper_id AND status IN ('accepted', 'in_progress')
  ) THEN
    RETURN jsonb_build_object('error', jsonb_build_object('code', 'CONFLICT', 'message', 'Helper already has active task'));
  END IF;

  SELECT id INTO v_wallet_id
  FROM wallets
  WHERE user_id = p_helper_id;

  IF v_wallet_id IS NULL THEN
    INSERT INTO wallets (id, user_id)
    VALUES (gen_random_uuid(), p_helper_id)
    RETURNING id INTO v_wallet_id;
  END IF;

  INSERT INTO tasks (id, requester_id, helper_id, description, tip_amount_usd, status)
  VALUES (gen_random_uuid(), p_requester_id, p_helper_id, p_message, p_tip, 'accepted')
  RETURNING * INTO v_task;

  UPDATE task_requests
  SET status = 'accepted', task_id = v_task.id
  WHERE id = p_request_id;

  RETURN jsonb_build_object(
    'task_request', to_jsonb(v_request),
    'task', to_jsonb(v_task)
  );
END;
$$;
```

---

## 📚 Reference

- `../MANUAL_MIGRATION_UPLOAD.md` - Complete manual upload workflow
- `../MIGRATION_ORDER.md` - Migration order and dependencies
- `../MIGRATION_CANONICAL_ORDER.md` - Authoritative migration order
