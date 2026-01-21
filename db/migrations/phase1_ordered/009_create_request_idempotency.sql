-- Migration: Create Request RPC with Idempotency
--
-- This migration ensures all request creation goes through an RPC with:
-- 1. Idempotency via idempotency_keys table
-- 2. Validation (helper visibility, neighborhood match, radius check)
-- 3. Atomicity within the database
--
-- APPLY INSTRUCTIONS:
-- 1. Go to https://supabase.com/dashboard/project/kxpglaetbawiugqmihfj/sql
-- 2. Copy and paste SQL below
-- 3. Click "Run" to execute

-- RPC: create_request_with_idempotency
-- Idempotent task request creation with validation
-- Returns existing request if idempotency_key already used
create or replace function create_request_with_idempotency(
  p_idempotency_key text,
  p_user_id uuid,
  p_helper_id uuid,
  p_message text,
  p_suggested_tip_usd numeric
)
returns json
language plpgsql
as $$
declare
  v_existing_key idempotency_keys;
  v_helper users;
  v_requester users;
  v_task_request task_requests;
  v_within_radius boolean;
  v_distance_meters numeric;
begin
  -- 1. Check idempotency_keys table (universal pattern)
  insert into idempotency_keys (key, action, user_id)
  values (p_idempotency_key, 'request:create', p_user_id)
  on conflict (key) do update set created_at = now()
  returning * into v_existing_key;
  
  -- If this is not a new insert (updated row), return existing response
  if v_existing_key.response is not null then
    return v_existing_key.response;
  end if;
  
  -- 2. Validate message length
  if length(p_message) < 1 or length(p_message) > 280 then
    return jsonb_build_object(
      'error', jsonb_build_object(
        'code', 'VALIDATION_ERROR',
        'message', 'Message must be 1-280 characters.'
      )
    );
  end if;
  
  -- 3. Validate suggested_tip_usd
  if p_suggested_tip_usd not in (5, 10, 15, 20) then
    return jsonb_build_object(
      'error', jsonb_build_object(
        'code', 'VALIDATION_ERROR',
        'message', 'suggested_tip_usd must be 5, 10, 15, or 20.'
      )
    );
  end if;
  
  -- 4. Fetch helper (must be on_the_move and not expired)
  select * into v_helper
  from users
  where id = p_helper_id
    and on_the_move = true
    and move_expires_at > now();
  
  if not found then
    return jsonb_build_object(
      'error', jsonb_build_object(
        'code', 'NOT_FOUND',
        'message', 'Helper not found or not available.'
      )
    );
  end if;
  
  -- 5. Fetch requester
  select * into v_requester
  from users
  where id = p_user_id;
  
  if not found then
    return jsonb_build_object(
      'error', jsonb_build_object(
        'code', 'NOT_FOUND',
        'message', 'User not found.'
      )
    );
  end if;
  
  -- 6. Check neighborhood match
  if v_helper.neighborhood_id != v_requester.neighborhood_id then
    return jsonb_build_object(
      'error', jsonb_build_object(
        'code', 'FORBIDDEN',
        'message', 'Helper is not in your neighborhood.'
      )
    );
  end if;
  
  -- 7. Check if helper is within user's radius (if both have location)
  if v_requester.last_lat is not null and v_requester.last_lng is not null
     and v_helper.last_lat is not null and v_helper.last_lng is not null then
    
    select earth_distance(
      ll_to_earth(v_requester.last_lat, v_requester.last_lng),
      ll_to_earth(v_helper.last_lat, v_helper.last_lng)
    ) into v_distance_meters;
    
    v_within_radius := (v_distance_meters <= (v_requester.radius_miles * 1609.34));
    
    if not v_within_radius then
      return jsonb_build_object(
        'error', jsonb_build_object(
          'code', 'FORBIDDEN',
          'message', 'Helper is outside your ' || v_requester.radius_miles || ' mile radius.'
        )
      );
    end if;
  end if;
  
  -- 8. Create task request
  insert into task_requests (
    id,
    requester_id,
    helper_id,
    message,
    suggested_tip_usd,
    status,
    created_at,
    expires_at
  )
  values (
    gen_random_uuid(),
    p_user_id,
    p_helper_id,
    p_message,
    p_suggested_tip_usd,
    'sent',
    now(),
    now() + interval '15 minutes'
  )
  returning * into v_task_request;
  
  -- 9. Store response in idempotency_keys for replays
  update idempotency_keys
  set response = to_jsonb(v_task_request)
  where key = p_idempotency_key;
  
  return to_jsonb(v_task_request);
end;
$$;
