-- ===================================================================================================
-- IDEMPOTENCY HEADER ENFORCEMENT (REVISION 2)
-- Permanent fix for Idempotency-Key handling
-- ===================================================================================================

-- Check if the idempotency_keys table already exists
-- If it exists from migration 007, we need to update it or replace it
do $$
begin
  if exists (select 1 from information_schema.tables where table_name = 'idempotency_keys') then
    -- Table exists, check its schema
    -- If it has 'operation' column, it's already correct (migration 016 was run before)
    -- If it has 'action' column, it's from migration 007
    if exists (
      select 1 from information_schema.columns 
      where table_name = 'idempotency_keys' and column_name = 'action'
    ) then
      -- Existing table from migration 007 - update it to new schema
      -- Rename old table for backup
      alter table idempotency_keys rename to idempotency_keys_old;
      
      -- Create new table with correct schema
      create table idempotency_keys (
        id uuid primary key default gen_random_uuid(),
        key text not null,
        user_id uuid not null references users(id) on delete cascade,
        operation text not null,
        endpoint text not null,
        created_at timestamptz not null default now(),
        
        -- Prevent duplicate idempotency keys for same user + operation
        unique(user_id, key, operation, endpoint)
      );
      
      -- Index for fast lookups
      create index idx_idempotency_keys_lookup 
      on idempotency_keys(user_id, key, operation, endpoint, created_at);
      
      -- Migrate data from old table (convert 'action' to 'operation')
      insert into idempotency_keys (key, user_id, operation, endpoint, created_at)
      select 
        key,
        coalesce(user_id, '00000000-0000-0000-0000-000000000001'::uuid),
        action as operation,
        '/api/v1/legacy' as endpoint,
        created_at
      from idempotency_keys_old;
    end if;
  else
    -- Table doesn't exist, create it fresh
    create table if not exists idempotency_keys (
      id uuid primary key default gen_random_uuid(),
      key text not null,
      user_id uuid not null references users(id) on delete cascade,
      operation text not null,
      endpoint text not null,
      created_at timestamptz not null default now(),
      
      -- Prevent duplicate idempotency keys for same user + operation
      unique(user_id, key, operation, endpoint)
    );
    
    -- Index for fast lookups
    create index idx_idempotency_keys_lookup 
    on idempotency_keys(user_id, key, operation, endpoint, created_at);
  end if;
end $$;

-- Comment on table
comment on table idempotency_keys is 'Global idempotency tracking. Prevents duplicate operations even if app-layer checks fail.';
comment on column idempotency_keys.key is 'The idempotency key from the client';
comment on column idempotency_keys.operation is 'Operation type: create, update, delete, etc.';
comment on column idempotency_keys.endpoint is 'API endpoint: /api/v1/broadcasts, /api/v1/withdrawals, etc.';
comment on column idempotency_keys.created_at is 'When the operation was first executed. Used for cleanup.';

-- Function: check_idempotency_key
-- Generic RPC to check if an idempotency key has been used
-- Returns true if key exists, false otherwise
create or replace function check_idempotency_key(
  p_key text,
  p_user_id uuid,
  p_operation text,
  p_endpoint text
)
returns boolean
language sql
as $$
  select exists (
    select 1 from idempotency_keys
    where key = p_key
      and user_id = p_user_id
      and operation = p_operation
      and endpoint = p_endpoint
  );
$$;

-- Function: record_idempotency_key
-- Records that an idempotency key was used
-- Should be called after a successful operation
create or replace function record_idempotency_key(
  p_key text,
  p_user_id uuid,
  p_operation text,
  p_endpoint text
)
returns void
language plpgsql
as $$
begin
  insert into idempotency_keys (key, user_id, operation, endpoint)
  values (p_key, p_user_id, p_operation, p_endpoint)
  on conflict do nothing;
end;
$$;

-- Migration: Update existing idempotency tables to use text keys
-- Ensure consistency across all idempotency tracking

-- broadcast_requests: Change idempotency_key to text if it's UUID
do $$
begin
  if exists (
    select 1 from pg_attribute
    where attrelid = 'broadcast_requests'::regclass
      and attname = 'idempotency_key'
      and typname = 'uuid'
  ) then
    -- Drop existing index
    drop index if exists idx_broadcast_requests_idempotency_key;
    
    -- Change column type
    alter table broadcast_requests
    alter column idempotency_key type text;
    
    -- Recreate unique index
    create unique index idx_broadcast_requests_idempotency_key
    on broadcast_requests(idempotency_key);
  end if;
end $$;

-- withdrawal_requests: Add idempotency_key as text if not exists
do $$
begin
  if not exists (
    select 1 from pg_attribute
    where attrelid = 'withdrawal_requests'::regclass
      and attname = 'idempotency_key'
  ) then
    alter table withdrawal_requests
    add column idempotency_key text unique;
    
    -- Create index for fast lookups
    create index idx_withdrawal_requests_idempotency_key
    on withdrawal_requests(idempotency_key);
  end if;
end $$;

-- task_requests: Add idempotency_key as text if not exists
do $$
begin
  if not exists (
    select 1 from pg_attribute
    where attrelid = 'task_requests'::regclass
      and attname = 'idempotency_key'
  ) then
    alter table task_requests
    add column idempotency_key text;
    
    -- Create unique index for idempotency (user + key + type)
    create unique index idx_task_requests_idempotency
    on task_requests(idempotency_key, requester_id, broadcast_type)
    where idempotency_key is not null;
  end if;
end $$;

-- Create or update RPC functions to use text idempotency keys

-- RPC: create_broadcast_with_idempotency_v2
-- Updated version using text idempotency keys
create or replace function create_broadcast_with_idempotency_v2(
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
  v_existing_broadcast task_requests;
  v_task_request task_requests;
  v_broadcast_id uuid;
begin
  -- 1. Check for existing broadcast with this idempotency key
  select * into v_existing_broadcast
  from task_requests
  where
    idempotency_key = p_idempotency_key
    and requester_id = p_user_id
    and broadcast_type = p_broadcast_type;
  
  if found then
    -- Return existing broadcast (idempotent)
    return jsonb_build_object(
      'idempotent', true,
      'broadcast', to_jsonb(v_existing_broadcast)
    );
  end if;
  
  -- 2. Check for duplicate submission within 30 seconds
  if exists (
    select 1 from task_requests
    where
      requester_id = p_user_id
      and broadcast_type = p_broadcast_type
      and message = p_message
      and created_at > now() - interval '30 seconds'
      and is_broadcast = true
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
  
  -- 7. Create the broadcast
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
    place_address,
    idempotency_key
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
    p_place_address,
    p_idempotency_key
  )
  returning id into v_broadcast_id;
  
  -- 8. Get the created broadcast
  select * into v_task_request
  from task_requests
  where id = v_broadcast_id;
  
  -- 9. Record idempotency in global tracking
  perform record_idempotency_key(
    p_idempotency_key,
    p_user_id,
    'create_broadcast',
    '/api/v1/broadcasts'
  );
  
  return jsonb_build_object(
    'idempotent', false,
    'broadcast', to_jsonb(v_task_request)
  );
end;
$$;

-- RPC: create_request_with_idempotency_v2
-- Creates task request with idempotency (for broadcasts responding to helpers)
create or replace function create_request_with_idempotency_v2(
  p_idempotency_key text,
  p_requester_id uuid,
  p_helper_id uuid,
  p_message text,
  p_tip_usd numeric
)
returns json
language plpgsql
as $$
declare
  v_existing_request task_requests;
  v_task_request task_requests;
begin
  -- 1. Check for existing request with this idempotency key
  select * into v_existing_request
  from task_requests
  where
    idempotency_key = p_idempotency_key
    and requester_id = p_requester_id
    and helper_id = p_helper_id;
  
  if found then
    return jsonb_build_object(
      'idempotent', true,
      'request', to_jsonb(v_existing_request)
    );
  end if;
  
  -- 2. Check for duplicate within 30 seconds
  if exists (
    select 1 from task_requests
    where
      requester_id = p_requester_id
      and helper_id = p_helper_id
      and message = p_message
      and created_at > now() - interval '30 seconds'
  ) then
    return jsonb_build_object(
      'error', jsonb_build_object(
        'code', 'DUPLICATE',
        'message', 'Duplicate request detected.'
      )
    );
  end if;
  
  -- 3. Create the request
  insert into task_requests (
    id,
    requester_id,
    helper_id,
    message,
    suggested_tip_usd,
    status,
    expires_at,
    idempotency_key
  )
  values (
    gen_random_uuid(),
    p_requester_id,
    p_helper_id,
    p_message,
    p_tip_usd,
    'sent',
    now() + interval '15 minutes',
    p_idempotency_key
  )
  returning * into v_task_request;
  
  -- 4. Record idempotency
  perform record_idempotency_key(
    p_idempotency_key,
    p_requester_id,
    'create_request',
    '/api/v1/requests'
  );
  
  return jsonb_build_object(
    'idempotent', false,
    'request', to_jsonb(v_task_request)
  );
end;
$$;

-- Migration: Update existing RPC functions to use text keys
-- Update the canonical create_broadcast function to accept text idempotency_key
-- (Already exists in 015_canonical_broadcast_rpc.sql, but ensure consistency)

-- Documentation
comment on function check_idempotency_key(text, uuid, text, text) is 
'Check if an idempotency key has been used. Returns true if exists, false otherwise.';

comment on function record_idempotency_key(text, uuid, text, text) is 
'Record that an idempotency key was used. Should be called after successful operations.';

comment on function create_broadcast_with_idempotency_v2(text, uuid, text, text, int, numeric, numeric, text, text, text, numeric) is
'Idempotent broadcast creation. Returns existing broadcast if idempotency_key already used. Prevents duplicates within 30 seconds.';

comment on function create_request_with_idempotency_v2(text, uuid, uuid, text, numeric) is
'Idempotent task request creation. Returns existing request if idempotency_key already used.';

-- Verification queries
-- Run these after migration to verify

-- Query 1: Check if idempotency_keys table exists and has correct columns
select 
  table_name,
  column_name,
  data_type,
  is_nullable
from information_schema.columns
where table_name = 'idempotency_keys'
order by ordinal_position;

-- Query 2: Check if RPC functions exist
select 
  proname,
  pg_get_function_arguments(oid) as arguments,
  pg_get_function_result(oid) as result_type
from pg_proc
where proname in (
  'check_idempotency_key',
  'record_idempotency_key',
  'create_broadcast_with_idempotency_v2',
  'create_request_with_idempotency_v2'
);

-- Query 3: Check existing idempotency keys (should be empty initially)
select count(*) as total_idempotency_keys from idempotency_keys;

-- Expected verification output:
-- 1. idempotency_keys table exists with columns: id, key, user_id, operation, endpoint, created_at
-- 2. All RPC functions exist and are callable
-- 3. total_idempotency_keys = 0 initially

-- Migration: Update get_broadcasts_with_distance to use new broadcasts table
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
    b.id,
    b.user_id,
    'need_help' as broadcast_type,  -- broadcasts table doesn't have type, default to need_help
    b.message,
    b.price_usd as offer_usd,
    b.created_at,
    now() + interval '1 hour' as expires_at,  -- broadcasts table doesn't store expiry
    b.lat as broadcast_lat,
    b.lng as broadcast_lng,
    b.location_context,
    null as place_name,  -- broadcasts table doesn't have these
    null as place_address,
    case
      when b.lat is null or b.lng is null then null
      else round(
        (earth_distance(
          ll_to_earth(p_user_lat, p_user_lng),
          ll_to_earth(b.lat, b.lng)
        ) / 1609.34)::numeric,
        2
      )
    end as distance_miles,
    u.first_name as requester_first_name,
    u.profile_photo as requester_profile_photo
  from broadcasts b
  join users u on b.user_id = u.id
  where
    b.created_at > now() - interval '1 hour'  -- Default 1 hour expiry
    and b.created_at + interval '1 hour' > now()
  order by
    b.created_at desc;
$$;

comment on function get_broadcasts_with_distance(numeric, numeric) is
'Returns active broadcasts with distance calculation from user location.';

-- Step 7: Grant permissions
grant all on table broadcasts to authenticated;
grant all on table broadcasts to service_role;
grant all on table broadcasts to anon;
grant all on function create_broadcast_with_idempotency_v2(text, uuid, text, text, int, numeric, numeric, text, text, text, numeric) to service_role;
grant all on function create_request_with_idempotency_v2(text, uuid, uuid, text, numeric) to service_role;
grant all on function check_idempotency_key(text, uuid, text, text) to service_role;
grant all on function record_idempotency_key(text, uuid, text, text) to service_role;
grant all on function get_broadcasts_with_distance(numeric, numeric) to service_role;

grant all on function create_broadcast_with_idempotency_v2(text, uuid, text, text, int, numeric, numeric, text, text, text, numeric) to anon;
grant all on function create_request_with_idempotency_v2(text, uuid, uuid, text, numeric) to anon;
grant all on function check_idempotency_key(text, uuid, text, text) to anon;
grant all on function record_idempotency_key(text, uuid, text, text) to anon;
grant all on function get_broadcasts_with_distance(numeric, numeric) to anon;

-- Grant permissions to canonical RPC from migration 015
grant all on function create_broadcast(uuid, text, numeric, double precision, double precision, text, text) to service_role;
grant all on function create_broadcast(uuid, text, numeric, double precision, double precision, text, text) to anon;
