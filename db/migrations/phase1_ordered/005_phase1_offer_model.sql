-- Migration: Phase 1 Offer Model for Broadcasts
--
-- This migration adds the Phase 1 money model:
-- - Adds offer_usd field to task_requests (for broadcasts)
-- - Adds validation constraints (min $5, max $50, whole dollars only)
-- - Updates RPC functions to validate offer amounts
--
-- APPLY INSTRUCTIONS:
-- 1. Go to https://supabase.com/dashboard/project/kxpglaetbawiugqmihfj/sql
-- 2. Copy and paste SQL below
-- 3. Click "Run" to execute

-- Step 1: Add offer_usd column to task_requests
-- This is the Phase 1 field for broadcast offers
alter table task_requests
  add column if not exists offer_usd numeric check (
    offer_usd is null or (
      offer_usd >= 5 and
      offer_usd <= 50 and
      offer_usd = round(offer_usd)
    )
  );

-- Add index for filtering broadcasts by offer amount
create index if not exists idx_task_requests_offer_usd on task_requests(offer_usd);

-- Comment on the new field
comment on column task_requests.offer_usd is 'Phase 1: The amount offered for a broadcast. Must be whole dollars between $5 and $50. No money actually moves in Phase 1.';

-- Step 2: Update create_broadcast_with_idempotency to validate offer_usd
create or replace function create_broadcast_with_idempotency(
  p_idempotency_key uuid,
  p_user_id uuid,
  p_broadcast_type text,
  p_message text,
  p_expires_minutes int,
  p_lat numeric,
  p_lng numeric,
  p_location_context text,
  p_place_name text,
  p_place_address text,
  p_offer_usd numeric default null
)
returns json
language plpgsql
as $$
declare
  v_existing_request broadcast_requests;
  v_task_request task_requests;
  v_result jsonb;
begin
  -- 1. Check for existing request with this idempotency key
  select * into v_existing_request
  from broadcast_requests
  where idempotency_key = p_idempotency_key;
  
  if found then
    -- Return existing broadcast (idempotent)
    select tr.* into v_task_request
    from task_requests tr
    where tr.id = v_existing_request.task_request_id;
    
    return jsonb_build_object(
      'idempotent', true,
      'broadcast', to_jsonb(v_task_request)
    );
  end if;
  
  -- 2. Check for duplicate submission within 30 seconds
  if exists (
    select 1 from broadcast_requests
    where
      user_id = p_user_id
      and broadcast_type = p_broadcast_type
      and message = p_message
      and created_at > now() - interval '30 seconds'
  ) then
    return jsonb_build_object(
      'error', jsonb_build_object(
        'code', 'DUPLICATE',
        'message', 'Duplicate broadcast detected. Please wait before posting again.'
      )
    );
  end if;
  
  -- 3. Validate broadcast type
  if p_broadcast_type not in ('need_help', 'offer_help') then
    return jsonb_build_object(
      'error', jsonb_build_object(
        'code', 'VALIDATION_ERROR',
        'message', 'Invalid broadcast_type. Must be need_help or offer_help.'
      )
    );
  end if;
  
  -- 4. Validate message length
  if length(p_message) < 1 or length(p_message) > 280 then
    return jsonb_build_object(
      'error', jsonb_build_object(
        'code', 'VALIDATION_ERROR',
        'message', 'Message must be 1-280 characters.'
      )
    );
  end if;
  
  -- 5. Validate expires_minutes
  if p_expires_minutes not in (15, 30, 60, 120) then
    return jsonb_build_object(
      'error', jsonb_build_object(
        'code', 'VALIDATION_ERROR',
        'message', 'expiresInMinutes must be 15, 30, 60, or 120.'
      )
    );
  end if;
  
  -- 6. Validate location_context
  if p_location_context not in ('here_now', 'heading_to', 'coming_from', 'place_specific') then
    return jsonb_build_object(
      'error', jsonb_build_object(
        'code', 'VALIDATION_ERROR',
        'message', 'Invalid location_context.'
      )
    );
  end if;
  
  -- 7. Validate offer_usd (Phase 1: $5-$50, whole dollars only, required for broadcasts)
  if p_offer_usd is null then
    return jsonb_build_object(
      'error', jsonb_build_object(
        'code', 'VALIDATION_ERROR',
        'message', 'Offer amount is required. Please select an amount between $5 and $50.'
      )
    );
  end if;
  
  if p_offer_usd < 5 or p_offer_usd > 50 then
    return jsonb_build_object(
      'error', jsonb_build_object(
        'code', 'VALIDATION_ERROR',
        'message', 'Offer amount must be between $5 and $50.'
      )
    );
  end if;
  
  if p_offer_usd != round(p_offer_usd) then
    return jsonb_build_object(
      'error', jsonb_build_object(
        'code', 'VALIDATION_ERROR',
        'message', 'Offer amount must be a whole dollar amount.'
      )
    );
  end if;
  
  -- FUTURE: Phase 2/3 will add wallet balance check and escrow holds here
  
  -- 8. Create the task request (broadcast)
  insert into task_requests (
    id,
    requester_id,
    helper_id,
    message,
    suggested_tip_usd,
    offer_usd,
    status,
    expires_at,
    is_broadcast,
    broadcast_type,
    broadcast_lat,
    broadcast_lng,
    location_context,
    place_name,
    place_address
  )
  values (
    gen_random_uuid(),
    p_user_id,
    null,
    p_message,
    0, -- suggested_tip_usd is 0 for Phase 1 broadcasts
    p_offer_usd,
    'sent',
    now() + (p_expires_minutes || ' minutes')::interval,
    true,
    p_broadcast_type,
    p_lat,
    p_lng,
    p_location_context,
    p_place_name,
    p_place_address
  )
  returning * into v_task_request;
  
  -- 9. Record idempotency key
  insert into broadcast_requests (
    id,
    idempotency_key,
    user_id,
    broadcast_type,
    message,
    expires_minutes,
    broadcast_lat,
    broadcast_lng,
    location_context,
    place_name,
    place_address,
    price_usd,
    task_request_id
  )
  values (
    gen_random_uuid(),
    p_idempotency_key,
    p_user_id,
    p_broadcast_type,
    p_message,
    p_expires_minutes,
    p_lat,
    p_lng,
    p_location_context,
    p_place_name,
    p_place_address,
    p_offer_usd,
    v_task_request.id
  );
  
  return jsonb_build_object(
    'idempotent', false,
    'broadcast', to_jsonb(v_task_request)
  );
end;
$$;

-- Step 3: Update broadcast_requests table to track offer_usd
alter table broadcast_requests
  add column if not exists offer_usd numeric check (
    offer_usd is null or (
      offer_usd >= 5 and
      offer_usd <= 50 and
      offer_usd = round(offer_usd)
    )
  );

-- Update the unique constraint to include offer_usd for deduplication
drop index if exists broadcast_requests_user_created_idx;
create index idx_broadcast_requests_user_created on broadcast_requests(user_id, created_at desc);
