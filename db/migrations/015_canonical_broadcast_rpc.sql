-- ============================================
-- CANONICAL BROADCAST RPC MIGRATION
-- Run this in Supabase SQL Editor
-- ============================================

-- Step 1: Drop all legacy broadcast RPCs
drop function if exists create_broadcast_with_idempotency cascade;
drop function if exists create_broadcast cascade;

-- Step 2: Drop legacy tables (keep task_requests, drop broadcast_requests)
drop table if exists broadcast_requests cascade;

-- Step 3: Create canonical broadcasts table
create table if not exists broadcasts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references users(id) on delete cascade,
  message text not null,
  price_usd numeric not null default 0,
  lat double precision not null,
  lng double precision not null,
  location_context text,
  idempotency_key text not null,
  created_at timestamp with time zone default now()
);

-- Step 4: Create unique index for idempotency (prevents duplicates)
create unique index if not exists broadcasts_user_idempotency_unique
on broadcasts (user_id, idempotency_key);

-- Step 5: Create the ONE canonical RPC
create or replace function create_broadcast(
  p_user_id uuid,
  p_message text,
  p_price_usd numeric,
  p_lat double precision,
  p_lng double precision,
  p_location_context text,
  p_idempotency_key text
)
returns json
language plpgsql
as $$
declare
  v_existing broadcasts;
  v_broadcast broadcasts;
begin
  -- Idempotency guard
  select *
  into v_existing
  from broadcasts
  where user_id = p_user_id
    and idempotency_key = p_idempotency_key;

  if found then
    return jsonb_build_object(
      'broadcast', row_to_json(v_existing),
      'idempotent', true
    );
  end if;

  insert into broadcasts (
    user_id,
    message,
    price_usd,
    lat,
    lng,
    location_context,
    idempotency_key,
    created_at
  ) values (
    p_user_id,
    p_message,
    p_price_usd,
    p_lat,
    p_lng,
    p_location_context,
    p_idempotency_key,
    now()
  ) returning * into v_broadcast;

  return jsonb_build_object(
    'broadcast', row_to_json(v_broadcast),
    'idempotent', false
  );
end;
$$;

-- Step 6: Comment the function
comment on function create_broadcast(
  uuid, text, numeric, double precision, double precision, text, text
) is 'Canonical broadcast creation RPC. Idempotent on (user_id, idempotency_key). Supports pricing. No legacy params.';

-- Step 7: Grant permissions
grant execute on function create_broadcast to authenticated;
grant all on table broadcasts to authenticated;

-- Step 8: Verification query
SELECT 
  'broadcasts table' as object,
  EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'broadcasts') as exists
UNION ALL
SELECT 
  'create_broadcast function' as object,
  EXISTS (SELECT FROM pg_proc WHERE proname = 'create_broadcast') as exists
UNION ALL
SELECT 
  'idempotency index' as object,
  EXISTS (SELECT FROM pg_indexes WHERE indexname = 'broadcasts_user_idempotency_unique') as exists;

-- ============================================
-- EXPECTED VERIFICATION OUTPUT:
-- broadcasts table | true
-- create_broadcast function | true
-- idempotency index | true
-- ============================================
