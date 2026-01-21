-- ============================================================================
-- Fix: Update RPCs to use text idempotency_keys and idempotency_keys table
-- ============================================================================

-- 1. Create broadcast with proper idempotency (uses idempotency_keys table)
create or replace function create_broadcast_with_idempotency(
  p_idempotency_key text,
  p_user_id uuid,
  p_broadcast_type text,
  p_message text,
  p_expires_minutes int,
  p_lat numeric,
  p_lng numeric,
  p_location_context text,
  p_place_name text,
  p_place_address text,
  p_price_usd numeric default 0
)
returns json
language plpgsql
as $$
declare
  v_existing_key idempotency_keys;
  v_existing_request broadcast_requests;
  v_result jsonb;
  v_broadcast_id uuid;
begin
  -- 1. Check idempotency_keys table (universal pattern)
  insert into idempotency_keys (key, action, user_id)
  values (p_idempotency_key, 'broadcast:create', p_user_id)
  on conflict (key) do update set created_at = now()
  returning * into v_existing_key;
  
  -- If this is not a new insert (updated row), return existing response
  if v_existing_key.response is not null then
    return v_existing_key.response;
  end if;
  
  -- 2. Check for duplicate submission within 30 seconds (business rule, not idempotency)
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
        'message', 'You already posted this broadcast recently. Please wait before posting again.'
      )
    );
  end if;
  
  -- 3. Create new broadcast request (current architecture - no tasks table)
  insert into broadcast_requests (
    id, requester_id, helper_id, message, suggested_tip_usd, status,
    created_at, expires_at, is_broadcast, broadcast_type,
    broadcast_lat, broadcast_lng, location_context, place_name, place_address,
    idempotency_key
  ) values (
    gen_random_uuid(),
    p_user_id,
    null,
    p_message,
    p_price_usd,
    'sent',
    now(),
    now() + make_interval(mins => coalesce(p_expires_minutes, 60)),
    true,
    p_broadcast_type,
    p_lat,
    p_lng,
    p_location_context,
    p_place_name,
    p_place_address,
    p_idempotency_key
  ) returning * into v_existing_request;
  
  -- 4. Store response in idempotency_keys for replays
  v_broadcast_id := v_existing_request.id;
  update idempotency_keys
  set response = to_jsonb(v_existing_request)
  where key = p_idempotency_key;
  
  -- 5. Format response
  v_result := jsonb_build_object(
    'idempotent', false,
    'broadcast', to_jsonb(v_existing_request),
    'offer_usd', p_price_usd
  );
  
  return v_result;
end;
$$;

-- 2. Respond to broadcast with idempotency
create or replace function respond_to_broadcast_with_idempotency(
  p_idempotency_key text,
  p_broadcast_id uuid,
  p_helper_id uuid
)
returns json
language plpgsql
as $$
declare
  v_existing_key idempotency_keys;
  v_broadcast broadcast_requests;
  v_requester_id uuid;
  v_task_request task_requests;
  v_message text;
  v_offer_usd numeric;
  v_expires_at timestamptz;
begin
  -- 1. Check idempotency_keys table
  insert into idempotency_keys (key, action, user_id)
  values (p_idempotency_key, 'broadcast:respond', p_helper_id)
  on conflict (key) do update set created_at = now()
  returning * into v_existing_key;
  
  if v_existing_key.response is not null then
    return v_existing_key.response;
  end if;
  
  -- 2. Fetch and lock broadcast (prevents race conditions)
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
  
  -- 3. Check broadcast is still active (within expiration window)
  v_expires_at := v_broadcast.created_at + make_interval(mins => coalesce(v_broadcast.expires_minutes, 60));
  
  if v_expires_at < now() then
    return jsonb_build_object(
      'error', jsonb_build_object(
        'code', 'EXPIRED',
        'message', 'This broadcast has expired.'
      )
    );
  end if;
  
  -- 4. Extract broadcast details for response
  v_requester_id := v_broadcast.requester_id;
  v_message := v_broadcast.message;
  v_offer_usd := v_broadcast.suggested_tip_usd;
  
  -- 5. Create task request (fulfillable work)
  insert into task_requests (
    id, requester_id, helper_id, task_id, message, suggested_tip_usd, status,
    created_at, expires_at
  ) values (
    gen_random_uuid(),
    v_requester_id,
    p_helper_id,
    null,
    v_message,
    v_offer_usd,
    'sent',
    now(),
    v_expires_at
  ) returning * into v_task_request;
  
  -- 6. Store response in idempotency_keys
  update idempotency_keys
  set response = to_jsonb(v_task_request)
  where key = p_idempotency_key;
  
  -- 7. Format response
  return to_jsonb(v_task_request);
end;
$$;

-- 3. Cancel request with idempotency
create or replace function cancel_request_with_idempotency(
  p_idempotency_key text,
  p_user_id uuid,
  p_request_id uuid
)
returns json
language plpgsql
as $$
declare
  v_existing_key idempotency_keys;
  v_request task_requests;
begin
  -- 1. Check idempotency_keys table
  insert into idempotency_keys (key, action, user_id)
  values (p_idempotency_key, 'request:cancel', p_user_id)
  on conflict (key) do update set created_at = now()
  returning * into v_existing_key;
  
  if v_existing_key.response is not null then
    return v_existing_key.response;
  end if;
  
  -- 2. Fetch request (must belong to user)
  select * into v_request
  from task_requests
  where id = p_request_id
    and requester_id = p_user_id;
  
  if not found then
    return jsonb_build_object(
      'error', jsonb_build_object(
        'code', 'NOT_FOUND',
        'message', 'Request not found or cannot be cancelled'
      )
    );
  end if;
  
  -- 3. Cancel request
  update task_requests
  set status = 'declined'
  where id = p_request_id;
  
  -- 4. Store response in idempotency_keys
  update idempotency_keys
  set response = jsonb_build_object('cancelled', true)
  where key = p_idempotency_key;
  
  return jsonb_build_object('cancelled', true);
end;
$$;
