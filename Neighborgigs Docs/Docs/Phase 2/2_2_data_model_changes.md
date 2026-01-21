# Phase 2: Data Model Changes

**Context:** This document outlines Phase 2 database changes for draft and preview functionality. Phase 2 begins after Phase 1 is stable and publicly viewable.**Cross-Reference:** See `Phase_2_INDEX.md` for complete Phase 2 documentation overview. See `2_1_technical_implementation.md` for technical implementation details.

---


**Canonical Names:** Uses `task_requests` and `tasks` (not `jobs`). See `ERD_phase2.md` for complete entity relationships.

**Execution Approach:** SQL migrations are executable and committed under `/db/migrations`. Applied via Supabase migration tooling. Phase 1 "manual implementation" note is legacy and should not be followed.

---

## Core Concepts

### Draft vs. Production Records

| Attribute | Draft Records | Production Records |
|-----------|---------------|-------------------|
| `status` | `'draft'` | `'active'`, `'cancelled'`, `'completed'` |
| `is_preview` | `true` | `false` |
| `submitted_at` | `null` | timestamp |
| `finalized_at` | `null` | timestamp |
| Persistence | In-memory (default) OR DB (if DRAFTS_PERSISTED=true) | Production tables only |

**Critical Rule:** Drafts are in-memory by default. Persistence is optional and gated by `DRAFTS_PERSISTED=true`.

See `DECISION_draft_persistence.md` for full implementation contract.

---

## Constraints & Precedence

### Feature Flags vs DB Constraints
- **Feature flags** gate behavior (UX guard)
- **DB constraints** enforce invariants as last-resort safety (seatbelt)
- **Precedence:** Feature flags gate behavior. DB constraints enforce invariants as last-resort safety.

### Example: Withdrawals
1. Feature flag blocks endpoint in preview (`PREVIEW_BLOCK_FINALIZE=true`)
2. DB constraint prevents `available_usd < 0` (always enforced)

---

## 1. Task Requests Table Changes (NOT "jobs")

### Migration: Add Draft Support to Task Requests

```sql
-- Add draft status enum (extends existing status)
-- Note: Phase 1 may have simpler status, Phase 2 adds draft
CREATE TYPE task_request_status AS ENUM ('draft', 'active', 'cancelled', 'completed', 'expired');

-- Add preview-related columns to task_requests (canonical table name)
ALTER TABLE task_requests
  ADD COLUMN IF NOT EXISTS status task_request_status DEFAULT 'active',
  ADD COLUMN IF NOT EXISTS is_preview BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS submitted_at TIMESTAMP WITH TIME ZONE,
  ADD COLUMN IF NOT EXISTS finalized_at TIMESTAMP WITH TIME ZONE,
  ADD COLUMN IF NOT EXISTS draft_data JSONB DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS parent_draft_id UUID REFERENCES task_requests(id);

-- Create indexes for draft queries
CREATE INDEX idx_task_requests_status ON task_requests(status);
CREATE INDEX idx_task_requests_is_preview ON task_requests(is_preview);
CREATE INDEX idx_task_requests_parent_draft ON task_requests(parent_draft_id);

-- Update existing records
UPDATE task_requests SET status = 'active' WHERE status IS NULL;
```

### Draft Constraints

```sql
-- Ensure preview records cannot be finalized
ALTER TABLE task_requests
  ADD CONSTRAINT check_preview_not_finalized
  CHECK (
    NOT (is_preview = true AND finalized_at IS NOT NULL)
  );

-- Ensure draft status for preview records
ALTER TABLE task_requests
  ADD CONSTRAINT check_preview_has_draft_status
  CHECK (
    NOT (is_preview = true AND status != 'draft')
  );

-- Ensure submitted_at is set only when status is not draft
ALTER TABLE task_requests
  ADD CONSTRAINT check_submitted_only_when_not_draft
  CHECK (
    NOT (status = 'draft' AND submitted_at IS NOT NULL)
  );
```

---

## 2. Request Applications Table (NEW - Phase 2 Only)

**Definition:** A helper "applies/bids/offers" on a task request. See `DECISION_applications_table.md` for full details.

```sql
-- Create request_applications table (canonical name, NOT "applications")
CREATE TABLE request_applications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

  -- Relationships
  task_request_id UUID NOT NULL REFERENCES task_requests(id) ON DELETE CASCADE,
  helper_user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,

  -- Offer details
  offer_usd DECIMAL(10,2) NOT NULL,
  message TEXT,

  -- State
  status VARCHAR(20) NOT NULL DEFAULT 'pending',
  -- Values: 'pending', 'accepted', 'rejected', 'withdrawn', 'draft' (Phase 2)

  -- Preview support
  is_preview BOOLEAN DEFAULT false,
  submitted_at TIMESTAMP WITH TIME ZONE,
  finalized_at TIMESTAMP WITH TIME ZONE,

  -- Constraints
  CONSTRAINT check_valid_offer CHECK (offer_usd > 0),
  CONSTRAINT check_application_status
    CHECK (status IN ('draft', 'submitted', 'pending', 'accepted', 'rejected', 'withdrawn')),
  CONSTRAINT check_application_not_finalized_in_preview
    CHECK (NOT (is_preview = true AND finalized_at IS NOT NULL))
);

-- Indexes for common queries
CREATE INDEX idx_request_applications_task_request ON request_applications(task_request_id);
CREATE INDEX idx_request_applications_helper ON request_applications(helper_user_id);
CREATE INDEX idx_request_applications_status ON request_applications(status);

-- One application per helper per request (prevents spam)
CREATE UNIQUE INDEX one_application_per_helper_per_request
  ON request_applications(task_request_id, helper_user_id)
  WHERE status NOT IN ('withdrawn', 'rejected');
```

---

## 3. Messages Table Changes

```sql
-- Preview users can draft messages but not send them
ALTER TABLE messages
  ADD COLUMN IF NOT EXISTS status VARCHAR(20) DEFAULT 'draft',
  ADD COLUMN IF NOT EXISTS is_preview BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS sent_at TIMESTAMP WITH TIME ZONE;

-- Status constraint
ALTER TABLE messages
  ADD CONSTRAINT check_message_status
  CHECK (status IN ('draft', 'sent', 'deleted'));

-- Preview messages cannot be sent
ALTER TABLE messages
  ADD CONSTRAINT check_preview_not_sent
  CHECK (
    NOT (is_preview = true AND status = 'sent')
  );
```

---

## 4. Payments Table (Read-Only in Preview)

```sql
-- Preview mode should never write to payments, but we add flags for safety
ALTER TABLE payments
  ADD COLUMN IF NOT EXISTS is_preview BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS preview_source VARCHAR(50);

-- Prevent any preview payments from being created
ALTER TABLE payments
  ADD CONSTRAINT check_no_preview_payments
  CHECK (is_preview = false);

-- This constraint will prevent INSERT in preview mode
-- Application should check is_preview before attempting any payment operations
```

---

## 5. Wallet/Balance Table (Read-Only in Preview)

```sql
-- Similar to payments, protect wallet balances in preview
ALTER TABLE wallets
  ADD COLUMN IF NOT EXISTS is_readonly BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS original_balance DECIMAL(10,2);

-- Function to check if wallet should be read-only
-- Uses ENV variable precedence (not DB settings)
CREATE OR REPLACE FUNCTION is_wallet_readonly_in_preview()
RETURNS BOOLEAN AS $$
BEGIN
  RETURN (SELECT value = 'true' FROM preview_settings WHERE key = 'preview_mode');
END;
$$ LANGUAGE plpgsql;

-- Trigger to mark read-only in preview mode
CREATE OR REPLACE FUNCTION mark_wallet_readonly_in_preview()
RETURNS TRIGGER AS $$
BEGIN
  IF is_wallet_readonly_in_preview() THEN
    NEW.is_readonly := true;
    NEW.original_balance := COALESCE(OLD.balance, 0);
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_wallet_preview_readonly
  BEFORE INSERT OR UPDATE ON wallets
  FOR EACH ROW EXECUTE FUNCTION mark_wallet_readonly_in_preview();
```

---

## 6. Users Table - Profile Edit Restrictions

```sql
-- Add preview tracking to user profile changes
ALTER TABLE users
  ADD COLUMN IF NOT EXISTS is_preview_profile BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS profile_edits_in_preview JSONB DEFAULT '{}';

-- Track which fields can be edited in preview
-- Critical fields should be protected
ALTER TABLE users
  ADD COLUMN IF NOT EXISTS protected_fields TEXT[] DEFAULT ARRAY['email', 'password_hash', 'role', 'verified_at'];

-- Function to check if field is editable in preview
CREATE OR REPLACE FUNCTION is_field_protected(field_name TEXT)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM pg_attribute
    WHERE attname = field_name
    AND attrelid = 'users'::regclass
    AND attnum IN (
      SELECT unnest(protected_fields) FROM users LIMIT 1
    )
  );
END;
$$ LANGUAGE plpgsql;
```

---

## 7. Drafts Table (Phase 2 Only - Optional)

**Note:** Only create this table if `DRAFTS_PERSISTED=true`. Otherwise, use in-memory drafts.

```sql
-- Separate table for persisted drafts (Phase 2 only, behind DRAFTS_PERSISTED flag)
CREATE TABLE IF NOT EXISTS drafts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

  -- Entity being drafted
  entity_type VARCHAR(50) NOT NULL, -- 'task_request', 'request_application', 'message'
  entity_id UUID, -- NULL for new drafts, populated when promoted

  -- User ownership
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,

  -- Draft data (JSONB for flexibility)
  draft_data JSONB NOT NULL DEFAULT '{}',

  -- State
  status VARCHAR(20) NOT NULL DEFAULT 'draft',
  submitted_at TIMESTAMP WITH TIME ZONE,

  -- Preview tracking
  is_preview BOOLEAN DEFAULT false,
  session_id UUID,

  -- Metadata
  metadata JSONB DEFAULT '{}'
);

-- Indexes for draft queries
CREATE INDEX idx_drafts_user ON drafts(user_id);
CREATE INDEX idx_drafts_entity ON drafts(entity_type, entity_id);
CREATE INDEX idx_drafts_status ON drafts(status);
CREATE INDEX idx_drafts_created ON drafts(created_at DESC);
```

---

## 8. Preview Events Table (New - Phase 2 Only)

```sql
-- Separate table for preview-mode analytics
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

-- Indexes for analytics queries
CREATE INDEX idx_preview_events_session ON preview_events(session_id);
CREATE INDEX idx_preview_events_user ON preview_events(user_id);
CREATE INDEX idx_preview_events_type ON preview_events(event_type);
CREATE INDEX idx_preview_events_created ON preview_events(created_at);
```

---

## 9. Preview Settings Table (New - Phase 2 Only)

```sql
-- Global preview mode configuration
CREATE TABLE preview_settings (
  key VARCHAR(100) PRIMARY KEY,
  value TEXT NOT NULL,
  description TEXT,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Initial preview settings
INSERT INTO preview_settings (key, value, description) VALUES
  ('preview_mode', 'false', 'Global preview mode toggle (ENV overrides this)'),
  ('preview_allow_drafts', 'true', 'Allow draft creation in preview'),
  ('preview_allow_profile_edit', 'true', 'Allow non-critical profile edits in preview'),
  ('preview_block_finalize', 'true', 'Block finalization actions in preview'),
  ('preview_analytics_enabled', 'true', 'Enable preview event logging');

-- Function to check preview setting (fallback to default)
CREATE OR REPLACE FUNCTION get_preview_setting(key TEXT)
RETURNS TEXT AS $$
BEGIN
  RETURN COALESCE(
    (SELECT value FROM preview_settings WHERE key = get_preview_setting.key),
    'false'
  );
END;
$$ LANGUAGE plpgsql;

-- Helper to check if preview mode is active
-- IMPORTANT: ENV variable PREVIEW_MODE=true overrides DB
CREATE OR REPLACE FUNCTION is_preview_mode()
RETURNS BOOLEAN AS $$
BEGIN
  -- In production, check ENV variable via application layer
  -- This function is for DB-side checks only
  RETURN (SELECT value = 'true' FROM preview_settings WHERE key = 'preview_mode');
END;
$$ LANGUAGE plpgsql;
```

---

## 10. Preview Feedback Table (Preview-Specific)

```sql
-- Collect in-context feedback from preview users
CREATE TABLE preview_feedback (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

  -- Ownership
  session_id UUID NOT NULL,
  user_id UUID REFERENCES users(id),

  -- Context
  page_path TEXT,
  component_name VARCHAR(100),
  action_attempted VARCHAR(100),

  -- Feedback
  rating INTEGER CHECK (rating BETWEEN 1 AND 5),
  was_confusing BOOLEAN,
  comments TEXT,

  -- Categorization
  category VARCHAR(50), -- 'ux', 'copy', 'flow', 'bug', 'feature_request'
  severity VARCHAR(20) CHECK (severity IN ('low', 'medium', 'high', 'critical')),

  metadata JSONB DEFAULT '{}'
);

CREATE INDEX idx_preview_feedback_session ON preview_feedback(session_id);
CREATE INDEX idx_preview_feedback_category ON preview_feedback(category);
CREATE INDEX idx_preview_feedback_created ON preview_feedback(created_at);
```

---

## Query Patterns for Phase 2

### Get All Drafts for a User

```sql
-- If DRAFTS_PERSISTED=true (from DB table)
SELECT id, entity_type, draft_data, created_at
FROM drafts
WHERE user_id = $1
  AND is_preview = true
ORDER BY created_at DESC;

-- If DRAFTS_PERSISTED=false (in-memory, no DB query)
-- Use DraftService in-memory store instead
```

### Get Preview Analytics Summary

```sql
SELECT
  event_name,
  COUNT(*) as count,
  AVG(duration_ms) as avg_duration_ms,
  COUNT(DISTINCT session_id) as unique_sessions
FROM preview_events
WHERE created_at >= NOW() - INTERVAL '7 days'
GROUP BY event_name
ORDER BY count DESC;
```

### Get Blocked Actions Summary

```sql
SELECT
  blocked_action,
  COUNT(*) as block_count,
  COUNT(DISTINCT user_id) as unique_users,
  AVG(EXTRACT(EPOCH FROM (NOW() - created_at))/3600) as hours_ago
FROM preview_events
WHERE blocked_action IS NOT NULL
GROUP BY blocked_action
ORDER BY block_count DESC;
```

---

## Migration Strategy

### Phase 2 Rollout Steps

1. **Run schema migrations** (non-breaking, adds nullable columns)
2. **Deploy code with feature flags disabled**
3. **Enable preview mode for test users only** (PREVIEW_MODE=true)
4. **Gradual rollout to more users**
5. **Monitor preview_events table for insights**
6. **Disable preview mode and promote to Phase 3**

### Rollback Plan

```sql
-- Disable preview mode immediately
UPDATE preview_settings SET value = 'false' WHERE key = 'preview_mode';

-- Archive preview events (optional)
CREATE TABLE preview_events_archive AS SELECT * FROM preview_events;

-- Clean up drafts (optional, based on policy)
DELETE FROM task_requests WHERE is_preview = true AND status = 'draft';
DELETE FROM request_applications WHERE is_preview = true;
```

---

## Data Cleanup for Phase 3

When moving to Phase 3, you may want to:

```sql
-- Promote selected drafts to production
UPDATE task_requests
SET
  is_preview = false,
  status = 'active',
  submitted_at = NOW(),
  finalized_at = NOW()
WHERE id IN (
  SELECT id FROM task_requests
  WHERE is_preview = true
    AND status = 'draft'
    AND id IN (/* approved draft IDs */)
);

-- Archive all other preview data
DELETE FROM preview_events WHERE created_at < NOW() - INTERVAL '30 days';
DELETE FROM drafts WHERE created_at < NOW() - INTERVAL '30 days';
```

---

## Constraints & Invariants

### Database Constraints (Seatbelts)

| Invariant | Constraint Location | Purpose |
|------------|-------------------|---------|
| No negative balances | `ledger_entries.check_positive_amount` | Ledger-first money model |
| One task per request | `tasks.one_task_per_request` | Invariant #7 |
| One active task per helper | `tasks.one_active_task_per_helper` | Invariant #5 |
| Preview cannot finalize | `task_requests.check_preview_not_finalized` | Preview safety |
| Preview cannot send payments | `payments.check_no_preview_payments` | Preview safety |

### Feature Flags (UX Guards)

| Feature | Flag Name | Purpose |
|---------|-----------|---------|
| Draft creation | `PREVIEW_ALLOW_DRAFTS` | Allow drafts in preview |
| Profile edit | `PREVIEW_ALLOW_PROFILE_EDIT` | Allow non-critical edits |
| Flow walkthrough | `PREVIEW_ALLOW_FLOW_WALKTHROUGH` | Allow full flow execution |
| Finalize blocks | `PREVIEW_BLOCK_FINALIZE` | Block irreversible actions |

**Precedence:** Feature flags gate behavior. DB constraints enforce invariants as last-resort safety.
