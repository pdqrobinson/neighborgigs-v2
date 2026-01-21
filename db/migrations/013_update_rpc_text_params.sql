-- Migration: Update RPC functions to accept text parameters for ID fields
-- Fixes "operator does not exist: uuid = text" error by casting text to uuid inside functions
--
-- APPLY INSTRUCTIONS:
-- 1. Go to https://supabase.com/dashboard/project/kxpglaetbawiugqmihfj/sql
-- 2. Copy and paste SQL below
-- 3. Click "Run" to execute

-- ============================================================
-- Update get_current_user to accept p_user_id text
-- ============================================================

CREATE OR REPLACE FUNCTION get_current_user(
  p_user_id text
)
RETURNS json
LANGUAGE plpgsql
AS $$
declare
  v_user users;
begin
  -- Cast the text parameter to uuid inside the function
  select * into v_user
  from users
  where id = p_user_id::uuid;

  if not found then
    return jsonb_build_object(
      'error', jsonb_build_object(
        'code', 'NOT_FOUND',
        'message', 'User not found.'
      )
    );
  end if;

  return jsonb_build_object(
    'id', v_user.id,
    'first_name', v_user.first_name,
    'profile_photo', v_user.profile_photo,
    'neighborhood_id', v_user.neighborhood_id,
    'radius_miles', v_user.radius_miles,
    'last_lat', v_user.last_lat,
    'last_lng', v_user.last_lng,
    'on_the_move', v_user.on_the_move,
    'direction', v_user.direction,
    'direction_direction', v_user.direction,
    'move_expires_at', v_user.move_expires_at
  );
end;
$$;

-- ============================================================
-- Update create_broadcast_with_idempotency to accept text for ID fields
-- ============================================================

CREATE OR REPLACE FUNCTION create_broadcast_with_idempotency(
  p_idempotency_key text,
  p_user_id text,
  p_broadcast_type text,
  p_message text,
  p_expires_minutes int,
  p_lat numeric,
  p_lng numeric,
  p_location_context text,
  p_place_name text,
  p_place_address text,
  p_offer_usd numeric default 0
)
RETURNS json
LANGUAGE plpgsql
AS $$
declare
  v_existing_request broadcast_requests;
  v_task_request task_requests;
  v_result jsonb;
begin
  -- 1. Check for existing request with this idempotency key
  select * into v_existing_request
  from broadcast_requests
  where idempotency_key = p_idempotency_key::uuid;

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
  -- Prevents rapid resubmits of identical content
  if exists (
    select 1 from broadcast_requests
    where
      user_id = p_user_id::uuid
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

  -- 3. Create the task request (broadcast)
  insert into task_requests (
    id,
    requester_id,
    helper_id,
    message,
    suggested_tip_usd,
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
    p_user_id::uuid,
    null,
    p_message,
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
  retu
[truncated]
ing * into v_task_request;

  -- 4. Record the idempotency key
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
    p_idempotency_key::uuid,
    p_user_id::uuid,
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

-- ============================================================
-- Update respond_to_broadcast to accept text for ID fields
-- ============================================================

CREATE OR REPLACE FUNCTION respond_to_broadcast(
  p_broadcast_id text,
  p_helper_id text,
  p_suggested_tip_usd numeric
)
RETURNS json
LANGUAGE plpgsql
AS $$
declare
  v_broadcast task_requests;
  v_response_request task_requests;
begin
  -- 1. Fetch and lock broadcast with lock (prevents race conditions)
  select * into v_broadcast
  from task_requests
  where id = p_broadcast_id::uuid
    and is_broadcast = true
    and status = 'sent'
  for update;

  if not found then
    return jsonb_build_object(
      'error', jsonb_build_object(
        'code', 'NOT_FOUND',
        'message', 'Broadcast not found or already processed.'
      )
    );
  end if;

  -- 2. Check broadcast is not expired
  if v_broadcast.expires_at < now() then
    return jsonb_build_object(
      'error', jsonb_build_object(
        'code', 'EXPIRED',
        'message', 'Broadcast has expired.'
      )
    );
  end if;

  -- 3. Prevent self-response
  if v_broadcast.requester_id = p_helper_id::uuid then
    return jsonb_build_object(
      'error', jsonb_build_object(
        'code', 'FORBIDDEN',
        'message', 'You cannot respond to your own broadcast.'
      )
    );
  end if;

  -- 4. Prevent multiple responses
  if p_suggested_tip_usd not in (5, 10, 15, 20) then
    return jsonb_build_object(
      'error', jsonb_build_object(
        'code', 'VALIDATION_ERROR',
        'message', 'suggested_tip_usd must be 5, 10, 15, or 20.'
      )
    );
  end if;

  -- 5. Check helper doesn't have active task
  if exists (
    select 1 from task_requests
    where helper_id = p_helper_id::uuid
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

  -- 6. Create response task_request
  insert into task_requests (
    id,
    task_id,
    requester_id,
    helper_id,
    message,
    suggested_tip_usd,
    status,
    expires_at,
    is_broadcast,
    created_at
  )
  values (
    gen_random_uuid(),
    null,
    v_broadcast.requester_id,
    p_helper_id::uuid,
    'Responding to broadcast: ' || v_broadcast.message,
    p_suggested_tip_usd,
    'sent',
    now() + interval '15 minutes',
    false,
    now()
  )
  returning * into v_response_request;

  return jsonb_build_object(
    'request', to_jsonb(v_response_request)
  );
end;
$$;

-- ============================================================
-- Update delete_broadcast to accept text for ID fields
-- ============================================================

CREATE OR REPLACE FUNCTION delete_broadcast(
  p_broadcast_id text,
  p_user_id text
)
RETURNS json
LANGUAGE plpgsql
AS $$
declare
  v_broadcast task_requests;
begin
  -- 1. Fetch and verify broadcast ownership
  select * into v_broadcast
  from task_requests
  where id = p_broadcast_id::uuid
    and is_broadcast = true
  for update;

  if not found then
    return jsonb_build_object(
      'error', jsonb_build_object(
        'code', 'NOT_FOUND',
        'message', 'Broadcast not found.'
      )
    );
  end if;

  -- 2. Verify ownership
  if v_broadcast.requester_id != p_user_id::uuid then
    return jsonb_build_object(
      'error', jsonb_build_object(
        'code', 'FORBIDDEN',
        'message', 'You can only delete your own broadcasts.'
      )
    );
  end if;

  -- 3. Delete broadcast
  delete from task_requests
  where id = p_broadcast_id::uuid
    and requester_id = p_user_id::uuid;

  return jsonb_build_object('ok', true);
end;
$$;