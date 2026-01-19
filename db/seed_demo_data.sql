-- NeighborGigs Phase One - Demo Data Seeding
-- Run this in order after schema migration

-- 1. Neighborhood
insert into neighborhoods (
  id, name, center_lat, center_lng, radius_miles
) values (
  'demo_neighborhood',
  'Downtown Demo',
  33.4484,
  -112.0740,
  3
) on conflict (id) do nothing;

-- 2. Users
-- Demo requester
insert into users (
  id, first_name, neighborhood_id, radius_miles,
  last_lat, last_lng,
  on_the_move
) values (
  '00000000-0000-0000-0000-000000000001',
  'Alex',
  'demo_neighborhood',
  1,
  33.4484,
  -112.0740,
  false
) on conflict (id) do nothing;

-- Helper A (on the move)
insert into users (
  id, first_name, neighborhood_id, radius_miles,
  last_lat, last_lng,
  on_the_move, direction, move_expires_at
) values (
  '00000000-0000-0000-0000-000000000002',
  'Jamie',
  'demo_neighborhood',
  1,
  33.4490,
  -112.0735,
  true,
  'out',
  now() + interval '45 minutes'
) on conflict (id) do nothing;

-- Helper B (on the move)
insert into users (
  id, first_name, neighborhood_id, radius_miles,
  last_lat, last_lng,
  on_the_move, direction, move_expires_at
) values (
  '00000000-0000-0000-0000-000000000003',
  'Taylor',
  'demo_neighborhood',
  2,
  33.4478,
  -112.0752,
  true,
  'home',
  now() + interval '30 minutes'
) on conflict (id) do nothing;

-- Helper C (idle)
insert into users (
  id, first_name, neighborhood_id, radius_miles,
  last_lat, last_lng,
  on_the_move
) values (
  '00000000-0000-0000-0000-000000000004',
  'Jordan',
  'demo_neighborhood',
  1,
  33.4489,
  -112.0760,
  false
) on conflict (id) do nothing;

-- 3. Wallets
insert into wallets (id, user_id, available_usd, pending_usd)
values
  (gen_random_uuid(), '00000000-0000-0000-0000-000000000001', 0, 0),
  (gen_random_uuid(), '00000000-0000-0000-0000-000000000002', 15, 0),
  (gen_random_uuid(), '00000000-0000-0000-0000-000000000003', 5, 0),
  (gen_random_uuid(), '00000000-0000-0000-0000-000000000004', 0, 0)
on conflict (user_id) do nothing;

-- 4. Optional: Ledger History (For Wallet Demo)
insert into ledger_entries (
  id, wallet_id, entry_type, amount_usd, source
)
select
  gen_random_uuid(),
  w.id,
  'credit',
  w.available_usd,
  'demo_seed'
from wallets w
where w.available_usd > 0;
