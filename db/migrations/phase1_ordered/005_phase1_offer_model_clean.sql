-- Migration: Phase 1 Offer Model for Broadcasts (Clean Architecture)
--
-- This migration implements the clean separation:
-- - broadcast_requests = authoritative intent table (signals with prices)
-- - task_requests = sacred fulfillable tasks (real jobs only)
--
-- Key Principle: A broadcast is NOT a task request. It's a signal.
-- Only when someone responds does a task_request get created.
--
-- APPLY INSTRUCTIONS:
-- 1. Go to https://supabase.com/dashboard/project/kxpglaetbawiugqmihfj/sql
-- 2. Copy and paste SQL below
-- 3. Click "Run" to execute

-- ============================================================
-- Step 1: Add offer_usd to broadcast_requests (authoritative source)
-- ============================================================

alter table broadcast_requests
  add column if not exists offer_usd numeric check (
    offer_usd >= 5 and
    offer_usd <= 50 and
    offer_usd = round(offer_usd)
  );

comment on column broadcast_requests.offer_usd is 'Phase 1: The amount offered for this broadcast. Required field ($5-$50, whole dollars only). No money actually moves in Phase 1.';

-- Index for filtering broadcasts by offer amount
create index if not exists idx_broadcast_requests_offer_usd on broadcast_requests(offer_usd);

-- ============================================================
-- Step 2: Replace create_broadcast RPC (broadcasts only, no task_requests)
-- ============================================================

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
  p_offer_usd numeric
)
returns json
language plpgsql
as $$
declare
  v_existing_broadcast broadcast_requests;
  v_new_broadcast broadcast_requests;
begin
  -- 1. Check for existing broadcast with this idempotency key (retry-safe)
  select * into v_existing_broadcast
  from broadcast_requests
  where idempotency_key = p_idempotency_key;
  
  if found then
    -- Return existing broadcast (idempotent)
    return jsonb_build_object(
      'idempotent', true,
      'broadcast', to_jsonb(v_existing_broadcast)
    );
  end if;
  
  -- 2. Check for duplicate submission within 30 seconds (dedup)
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
  
  -- 3. Validate broadcast_type
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
  
  -- 7. Validate offer_usd (required, $5-$50, whole dollars only)
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
  
  -- 8. Create broadcast (intent only - no task_request yet)
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
    offer_usd,
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
    null
  )
  returning * into v_new_broadcast;
  
  return jsonb_build_object(
    'idempotent', false,
    'broadcast', to_jsonb(v_new_broadcast)
  );
end;
$$;

-- ============================================================
-- Step 3: Update get_broadcasts_with_distance RPC
-- Query from broadcast_requests instead of task_requests
-- ============================================================

create or replace function get_broadcasts_with_distance(
  p_user_lat numeric,
  p_user_lng numeric
)
returns table (
  id uuid,
  user_id uuid,
  broadcast_type text,
  message text,
  offer_usd numeric,
  created_at timestamptz,
  expires_at timestamptz,
  broadcast_lat numeric,
  broadcast_lng numeric,
  location_context text,
  place_name text,
  place_address text,
  distance_miles numeric,
  requester_first_name text,
  requester_profile_photo text
)
language sql
as $$
  select
    br.id,
    br.user_id,
    br.broadcast_type,
    br.message,
    br.offer_usd,
    br.created_at,
    br.expires_at,
    br.broadcast_lat,
    br.broadcast_lng,
    br.location_context,
    br.place_name,
    br.place_address,
    case
      when br.broadcast_lat is null or br.broadcast_lng is null then null
      else round(
        (earth_distance(
          ll_to_earth(p_user_lat, p_user_lng),
          ll_to_earth(br.broadcast_lat, br.broadcast_lng)
        ) / 1609.34)::numeric,
        2
      )
    end as distance_miles,
    u.first_name as requester_first_name,
    u.profile_photo as requester_profile_photo
  from broadcast_requests br
  join users u on br.user_id = u.id
  where
    br.created_at > now() - (br.expires_minutes || ' minutes')::interval
    -- Calculate expires_at dynamically
    and br.created_at + (br.expires_minutes || ' minutes')::interval > now()
  order by
    br.created_at desc;
$$;
