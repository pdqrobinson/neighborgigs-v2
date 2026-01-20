-- Migration: Respond to Broadcast (Creates task_requests on demand)
--
-- This implements clean architecture:
-- - broadcast_requests = intent (signals)
-- - task_requests = fulfillable tasks (created only when someone responds)
--
-- When a helper responds to a broadcast:
-- 1. Validate broadcast is still active and not already claimed
-- 2. Create a task_request (the actual job)
-- 3. Link broadcast to task_request
--
-- APPLY INSTRUCTIONS:
-- 1. Go to https://supabase.com/dashboard/project/kxpglaetbawiugqmihfj/sql
-- 2. Copy and paste SQL below
-- 3. Click "Run" to execute

-- ============================================================
-- Step 1: Add broadcast_id to task_requests (link back to source)
-- ============================================================

alter table task_requests
  add column if not exists broadcast_id uuid references broadcast_requests(id) on delete set null;

comment on column task_requests.broadcast_id is 'Optional link to original broadcast that created this task request. Null for direct requests.';

-- Index for finding tasks created from a specific broadcast
create index if not exists idx_task_requests_broadcast_id on task_requests(broadcast_id);

-- ============================================================
-- Step 2: Create respond_to_broadcast RPC
-- Creates task_requests from broadcasts on demand
-- ============================================================

create or replace function respond_to_broadcast(
  p_broadcast_id uuid,
  p_helper_id uuid
)
returns json
language plpgsql
as $$
declare
  v_broadcast broadcast_requests;
  v_requester_id uuid;
  v_task_request task_requests;
  v_message text;
  v_offer_usd numeric;
  v_expires_at timestamptz;
begin
  -- 1. Fetch and lock broadcast (prevents race conditions)
  select * into v_broadcast
  from broadcast_requests
  where id = p_broadcast_id
  for update;
  
  if not found then
    return jsonb_build_object(
      'error', jsonb_build_object(
        'code', 'NOT_FOUND',
        'message', 'Broadcast not found.'
      )
    );
  end if;
  
  -- 2. Check broadcast is still active (within expiration window)
  v_expires_at := v_broadcast.created_at + (v_broadcast.expires_minutes || ' minutes')::interval;
  
  if v_expires_at < now() then
    return jsonb_build_object(
      'error', jsonb_build_object(
        'code', 'EXPIRED',
        'message', 'This broadcast has expired.'
      )
    );
  end if;
  
  -- 3. Prevent multiple responses (first responder wins)
  if v_broadcast.task_request_id is not null then
    return jsonb_build_object(
      'error', jsonb_build_object(
        'code', 'ALREADY_CLAIMED',
        'message', 'This broadcast has already been accepted.'
      )
    );
  end if;
  
  -- 4. Prevent self-response (helper cannot respond to own broadcast)
  if v_broadcast.user_id = p_helper_id then
    return jsonb_build_object(
      'error', jsonb_build_object(
        'code', 'FORBIDDEN',
        'message', 'You cannot respond to your own broadcast.'
      )
    );
  end if;
  
  -- 5. Check helper doesn't have active task_request (task_requests, not tasks)
  if exists (
    select 1 from task_requests
    where helper_id = p_helper_id
      and status in ('accepted', 'in_progress')
      and is_broadcast = false
  ) then
    return jsonb_build_object(
      'error', jsonb_build_object(
        'code', 'CONFLICT',
        'message', 'You already have an active task.'
      )
    );
  end if;
  
  -- 6. Create task_request (the actual fulfillable job)
  -- Phase 1: offer_usd from broadcast IS the price. No tips.
  -- Keep original message intact - no mutation.
  insert into task_requests (
    id,
    requester_id,
    helper_id,
    message,
    suggested_tip_usd,
    offer_usd,
    status,
    created_at,
    expires_at,
    is_broadcast,
    broadcast_id,
    broadcast_type,
    broadcast_lat,
    broadcast_lng,
    location_context,
    place_name,
    place_address
  )
  values (
    gen_random_uuid(),
    v_broadcast.user_id,
    p_helper_id,
    v_broadcast.message,
    v_broadcast.offer_usd,
    v_broadcast.expires_at,
    now(),
    v_expires_at,
    false,
    p_broadcast_id,
    v_broadcast.broadcast_type,
    v_broadcast.broadcast_lat,
    v_broadcast.broadcast_lng,
    v_broadcast.location_context,
    v_broadcast.place_name,
    v_broadcast.place_address
  )
  returning * into v_task_request;
  
  -- 7. Link broadcast to this task_request (marks as claimed)
  update broadcast_requests
  set task_request_id = v_task_request.id
  where id = p_broadcast_id;
  
  return jsonb_build_object(
    'task_request', to_jsonb(v_task_request),
    'broadcast_offer_usd', v_broadcast.offer_usd
  );
end;
$$;
