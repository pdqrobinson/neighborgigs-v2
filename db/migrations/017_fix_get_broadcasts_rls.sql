-- ============================================================================
-- Fix get_broadcasts_with_distance RLS Issue
-- Simpler migration - just recreate the RPC with SECURITY DEFINER
-- ============================================================================

-- Drop and recreate the function with SECURITY DEFINER
drop function if exists get_broadcasts_with_distance cascade;

create or replace function get_broadcasts_with_distance(
  p_user_lat numeric,
  p_user_lng numeric
)
returns table (
  id uuid,
  user_id uuid,
  message text,
  offer_usd numeric,
  created_at timestamptz,
  lat double precision,
  lng double precision,
  location_context text,
  distance_miles numeric,
  requester_first_name text,
  requester_profile_photo text
)
language sql
security definer
set search_path = public
as $$
  select
    b.id,
    b.user_id,
    b.message,
    b.price_usd,
    b.created_at,
    b.lat,
    b.lng,
    b.location_context,
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
    b.created_at > now() - interval '1 hour'
  order by
    b.created_at desc;
$$;

-- Grant permissions
grant all on function get_broadcasts_with_distance(numeric, numeric) to anon;
grant all on function get_broadcasts_with_distance(numeric, numeric) to authenticated;
grant all on function get_broadcasts_with_distance(numeric, numeric) to service_role;

-- Comment
comment on function get_broadcasts_with_distance(numeric, numeric) is 
'Returns active broadcasts with distance calculation from user location. SECURITY DEFINER bypasses RLS for reliable reads.';
