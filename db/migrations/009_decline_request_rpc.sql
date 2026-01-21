-- Migration: Decline Request RPC with Idempotency
--
-- This migration ensures all request decline goes through an RPC with:
-- 1. Idempotency via idempotency_keys table
-- 2. Atomicity within the database
-- 3. Prevention of race conditions
--
-- APPLY INSTRUCTIONS:
-- 1. Go to https://supabase.com/dashboard/project/kxpglaetbawiugqmihfj/sql
-- 2. Copy and paste SQL below
-- 3. Click "Run" to execute

-- RPC: decline_request_with_idempotency
-- Idempotent task request decline with validation
-- Returns existing response if idempotency_key already used
create or replace function decline_request_with_idempotency(
  p_idempotency_key text,
  p_request_id uuid,
  p_helper_id uuid
)
returns json
language plpgsql
as $$
declare
  v_existing_key idempotency_keys;
  v_request task_requests;
begin
  -- 1. Check idempotency_keys table (universal pattern)
  insert into idempotency_keys (key, action, user_id)
  values (p_idempotency_key, 'request:decline', p_helper_id)
  on conflict (key) do update set created_at = now()
  returning * into v_existing_key;
  
  -- If this is not a new insert (updated row), return existing response
  if v_existing_key.response is not null then
    return v_existing_key.response;
  end if;
  
  -- 2. Validate that request exists and is in correct state
  select * into v_request
  from task_requests
  where id = p_request_id
    and helper_id = p_helper_id
    and status = 'sent';
  
  if v_request is null then
    return jsonb_build_object(
      'error', jsonb_build_object(
        'code', 'NOT_FOUND',
        'message', 'Request not found, not assigned to you, or already processed.'
      )
    );
  end if;
  
  -- 3. Update status (idempotent - will not fail on second run)
  update task_requests
  set status = 'declined'
  where id = p_request_id
    and helper_id = p_helper_id
    and status = 'sent';
  
  -- 4. Return updated request
  select * into v_request from task_requests where id = p_request_id;
  
  -- 5. Store response in idempotency_keys
  update idempotency_keys
  set response = jsonb_build_object('request', to_jsonb(v_request))
  where key = v_existing_key.key;
  
  return jsonb_build_object('request', to_jsonb(v_request));
end;
$$;
