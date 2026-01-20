-- ============================================================================
-- Idempotency Stabilization Migration
-- Goal: Prevent duplicate submissions, enforce business invariants at DB level
-- ============================================================================

-- 1. Idempotency Keys Table (universal protection against retries)
-- ============================================================================
create table if not exists idempotency_keys (
  key text primary key,
  action text not null,
  user_id uuid,
  request_fingerprint text,
  response jsonb,
  created_at timestamptz not null default now()
);

-- Index for fast lookups by user/action and cleanup
create index if not exists idx_idempotency_user_action_created
on idempotency_keys(user_id, action, created_at desc);

-- Index for replay lookups
create index if not exists idx_idempotency_key_created
on idempotency_keys(key, created_at desc);


-- 2. Critical Business Invariants (DB-level seatbelts)
-- ============================================================================

-- Invariant 1: Only ONE task can be created from a broadcast
-- This prevents race conditions where multiple helpers respond to same broadcast
create unique index if not exists one_task_per_broadcast
on task_requests(broadcast_id)
where broadcast_id is not null;

-- Invariant 2: Only ONE active task per helper at a time
-- Prevents a helper from accepting two tasks simultaneously
create unique index if not exists one_active_task_per_helper
on task_requests(helper_id)
where helper_id is not null
  and status in ('accepted', 'in_progress');

-- Invariant 3: Only ONE broadcast with same exact content per user (within time window)
-- Prevents accidental double-posts from rapid taps
create unique index if not exists one_active_per_user_content
on broadcast_requests(user_id, message, offer_usd)
where expires_at > now()
  and is_broadcast = true;


-- 3. Ledger Invariants (protect against double-payouts)
-- ============================================================================

-- Invariant 4: One offer payout per task request
create unique index if not exists one_offer_payout_per_task
on ledger_entries(task_request_id, type)
where type = 'offer_payout' and task_request_id is not null;

-- Invariant 5: One tip payout per task request
create unique index if not exists one_tip_payout_per_task
on ledger_entries(task_request_id, type)
where type = 'tip_payout' and task_request_id is not null;

-- Invariant 6: One withdrawal per request
create unique index if not exists one_withdrawal_per_request
on ledger_entries(reference_id, type)
where type = 'debit' and source = 'withdrawal';


-- 4. Helper Functions for Deterministic Idempotency Keys
-- ============================================================================

-- Helper: Create deterministic key for broadcast creation
-- Key format: broadcast:create:{userId}:{hash(message|offer_usd|expires_minutes|lat|lng)}
create or replace function create_broadcast_idempotency_key(
  p_user_id uuid,
  p_message text,
  p_offer_usd numeric,
  p_expires_minutes int,
  p_lat numeric,
  p_lng numeric
)
returns text as $$
begin
  return 'broadcast:create:' ||
         p_user_id::text || ':' ||
         encode(digest(
           p_message || '|' ||
           p_offer_usd::text || '|' ||
           p_expires_minutes::text || '|' ||
           p_lat::text || '|' ||
           p_lng::text,
           'sha256'
         ), 'hex');
end;
$$ language plpgsql immutable;


-- Helper: Create deterministic key for broadcast response
-- Key format: broadcast:respond:{broadcastId}:{helperId}
create or replace function create_broadcast_response_idempotency_key(
  p_broadcast_id text,
  p_helper_id uuid
)
returns text as $$
begin
  return 'broadcast:respond:' ||
         p_broadcast_id || ':' ||
         p_helper_id::text;
end;
$$ language plpgsql immutable;


-- Helper: Create deterministic key for task completion
-- Key format: task:complete:{taskId}:{requesterId}
create or replace function create_task_completion_idempotency_key(
  p_task_id uuid,
  p_requester_id uuid
)
returns text as $$
begin
  return 'task:complete:' ||
         p_task_id::text || ':' ||
         p_requester_id::text;
end;
$$ language plpgsql immutable;


-- 5. Cleanup: Old idempotency keys (keep last 30 days)
-- ============================================================================
-- This should be run periodically (e.g., via cron or maintenance job)
-- Run manually for now:
-- delete from idempotency_keys where created_at < now() - interval '30 days';


-- ============================================================================
-- Migration Complete
-- ============================================================================
-- Next steps:
-- 1. Update frontend to generate deterministic keys (no more crypto.randomUUID())
-- 2. Wrap all idempotent endpoints in single transactions
-- 3. Use RPC functions instead of direct inserts
-- ============================================================================
