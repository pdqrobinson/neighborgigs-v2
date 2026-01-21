-- Migration: Add broadcast idempotency and deduplication support
--
-- This migration enables:
-- 1. Idempotent broadcast creation (prevent duplicate submissions)
-- 2. Future support for payment-protected broadcasts
--
-- APPLY INSTRUCTIONS:
-- 1. Go to https://supabase.com/dashboard/project/kxpglaetbawiugqmihfj/sql
-- 2. Copy and paste SQL below
-- 3. Click "Run" to execute

-- Table: broadcast_requests (Idempotency tracking)
-- Stores successful broadcast submissions to prevent duplicates
create table if not exists broadcast_requests (
  id uuid primary key default gen_random_uuid(),
  idempotency_key uuid not null unique,
  user_id uuid not null references users(id) on delete cascade,
  broadcast_type text not null check (broadcast_type in ('need_help', 'offer_help')),
  message text not null check (length(message) >= 1 and length(message) <= 280),
  expires_minutes int not null check (expires_minutes in (15, 30, 60, 120)),
  broadcast_lat numeric,
  broadcast_lng numeric,
  location_context text,
  place_name text,
  place_address text,
  price_usd numeric default 0 check (price_usd >= 0),
  task_request_id uuid references task_requests(id) on delete set null,
  created_at timestamptz not null default now(),
  
  -- Deduplication window: reject identical submissions within 30 seconds
  unique(user_id, broadcast_type, message, created_at)
);

-- Index for fast idempotency key lookup
create index idx_broadcast_requests_idempotency_key on broadcast_requests(idempotency_key);

-- Index for recent broadcasts per user (cleanup)
create index idx_broadcast_requests_user_created on broadcast_requests(user_id, created_at desc);

-- Comment
comment on table broadcast_requests is 'Tracks broadcast submissions for idempotency and deduplication. Prevents duplicate submissions within 30 seconds.';
comment on column broadcast_requests.idempotency_key is 'Unique key from client to ensure idempotent creation';
comment on column broadcast_requests.price_usd is 'Future: price associated with broadcast when payments are enabled';

-- RPC: create_broadcast_with_idempotency
-- Idempotent broadcast creation with deduplication protection
-- Returns existing broadcast if idempotency_key already used
-- Prevents duplicate broadcasts (same user, type, message) within 30 seconds
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
  -- Prevents rapid resubmits of identical content
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
  
  -- FUTURE: When payments are enabled, add wallet balance check here
  -- FUTURE: Place hold on p_price_usd amount from user's wallet
  
  -- 7. Create the task request (broadcast)
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
    p_user_id,
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
    p_price_usd,
    v_task_request.id
  );
  
  return jsonb_build_object(
    'idempotent', false,
    'broadcast', to_jsonb(v_task_request)
  );
end;
$$;
