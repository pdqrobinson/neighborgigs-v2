-- Migration: Drop ALL versions of create_broadcast_with_idempotency and recreate
--
-- Drops all possible parameter type combinations, then creates text-param version

drop function if exists create_broadcast_with_idempotency(uuid, uuid, text, text, int, numeric, numeric, text, text, text, numeric) cascade;
drop function if exists create_broadcast_with_idempotency(text, uuid, text, text, int, numeric, numeric, text, text, text, numeric) cascade;
drop function if exists create_broadcast_with_idempotency(uuid, text, text, text, int, numeric, numeric, text, text, text, numeric) cascade;
drop function if exists create_broadcast_with_idempotency(text, text, text, text, int, numeric, numeric, text, text, text, numeric) cascade;

create or replace function create_broadcast_with_idempotency(
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
  p_price_usd numeric default 0
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
  
  -- 7. Create task request (broadcast)
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
    p_price_usd,
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
  
  -- 8. Record the idempotency key
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
    p_price_usd,
    v_task_request.id
  );
  
  return jsonb_build_object(
    'idempotent', false,
    'broadcast', to_jsonb(v_task_request)
  );
end;
$$;

comment on function create_broadcast_with_idempotency is 'Idempotent broadcast creation with deduplication. Accepts text params for UUIDs to prevent uuid = text errors.';
