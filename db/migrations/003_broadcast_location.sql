-- NeighborGigs - Broadcast Location Model Migration
-- Adds location context to broadcasts based on simplified single-pin model

-- Add broadcast location columns to task_requests table
alter table task_requests
  add column if not exists broadcast_lat numeric,
  add column if not exists broadcast_lng numeric,
  add column if not exists location_context text
    check (location_context in (
      'here_now',
      'heading_to',
      'coming_from',
      'place_specific'
    )),
  add column if not exists place_name text,
  add column if not exists place_address text;

-- Create index for location-based queries
create index if not exists task_requests_broadcast_location_idx
  on task_requests(broadcast_lat, broadcast_lng)
  where is_broadcast = true and broadcast_lat is not null and broadcast_lng is not null;

-- Create RPC function to calculate broadcast distance from user location
create or replace function calculate_broadcast_distance(
  user_lat numeric,
  user_lng numeric,
  broadcast_lat numeric,
  broadcast_lng numeric
)
returns numeric as $$
  select (
    earth_distance(
      ll_to_earth(user_lat, user_lng),
      ll_to_earth(broadcast_lat, broadcast_lng)
    ) / 1609.34
  );
$$ language sql stable;
