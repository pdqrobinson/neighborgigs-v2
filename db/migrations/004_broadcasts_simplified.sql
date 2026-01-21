-- NeighborGigs Phase One - Simplified Broadcasts
-- Broadcasts as cheap, fast signals with minimal idempotency

-- 1. Create broadcasts table (separate from task_requests)
create table broadcasts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references users(id) on delete cascade,
  message text not null,
  offer_usd numeric default 0,
  lat double precision not null,
  lng double precision not null,
  location_context text,
  idempotency_key text not null,
  created_at timestamptz not null default now()
);

-- 2. Unique index for idempotency (non-negotiable safety guard)
-- Prevents race conditions and double inserts even if RPC is bypassed
create unique index broadcasts_user_idempotency_unique
on broadcasts (user_id, idempotency_key);

-- 3. Index for querying broadcasts by location/time
create index broadcasts_created_idx on broadcasts(created_at desc);

-- 4. Simplified create_broadcast RPC (final form)
-- Broadcasts are signals, not fully-specified contracts
-- Cheap, fast, minimal, easy to reason about
create or replace function create_broadcast(
  p_user_id uuid,
  p_message text,
  p_offer_usd numeric,
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
  -- Idempotency check: return existing broadcast if key matches
  select *
  into v_existing
  from broadcasts
  where user_id = p_user_id
    and idempotency_key = p_idempotency_key;

  if found then
    return json_build_object(
      'broadcast', row_to_json(v_existing),
      'idempotent', true
    );
  end if;

  -- Create new broadcast
  insert into broadcasts (
    user_id,
    message,
    offer_usd,
    lat,
    lng,
    location_context,
    idempotency_key,
    created_at
  )
  values (
    p_user_id,
    p_message,
    p_offer_usd,
    p_lat,
    p_lng,
    p_location_context,
    p_idempotency_key,
    now()
  )
  returning * into v_broadcast;

  return json_build_object(
    'broadcast', row_to_json(v_broadcast),
    'idempotent', false
  );
end;
$$;

-- 5. Get broadcasts with distance from user location
create or replace function get_broadcasts_with_distance(
  p_user_lat numeric,
  p_user_lng numeric
)
returns table (
  id uuid,
  user_id uuid,
  message text,
  offer_usd numeric,
  lat double precision,
  lng double precision,
  location_context text,
  created_at timestamptz,
  distance_miles numeric,
  requester_first_name text,
  requester_profile_photo text
)
language sql
as $$
  select
    b.id,
    b.user_id,
    b.message,
    b.offer_usd,
    b.lat,
    b.lng,
    b.location_context,
    b.created_at,
    round(
      (earth_distance(
        ll_to_earth(p_user_lat, p_user_lng),
        ll_to_earth(b.lat, b.lng)
      ) / 1609.34)::numeric,
      2
    ) as distance_miles,
    u.first_name as requester_first_name,
    u.profile_photo as requester_profile_photo
  from broadcasts b
  join users u on b.user_id = u.id
  order by
    b.created_at desc;
$$;
