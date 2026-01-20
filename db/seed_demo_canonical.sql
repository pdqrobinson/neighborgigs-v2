-- NeighborGigs Phase One - Demo Data with Canonical Wallet Model
-- Run this after applying migration 003_wallet_canonical_model.sql

-- Clear existing demo data (if re-running)
delete from wallet_transactions where source = 'demo_seed';
delete from wallets where user_id in (
  '00000000-0000-0000-0000-000000000001',
  '00000000-0000-0000-0000-000000000002',
  '00000000-0000-0000-0000-000000000003',
  '00000000-0000-0000-0000-000000000004'
);
delete from users where id in (
  '00000000-0000-0000-0000-000000000001',
  '00000000-0000-0000-0000-000000000002',
  '00000000-0000-0000-0000-000000000003',
  '00000000-0000-0000-0000-000000000004'
);

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
-- Demo requester (Alex)
insert into users (
  id, first_name, neighborhood_id, radius_miles,
  last_lat, last_lng, on_the_move
) values (
  '00000000-0000-0000-0000-000000000001',
  'Alex',
  'demo_neighborhood',
  1,
  33.4484,
  -112.0740,
  false
) on conflict (id) do nothing;

-- Helper A (Jamie) - on the move
insert into users (
  id, first_name, neighborhood_id, radius_miles,
  last_lat, last_lng, on_the_move, direction, move_expires_at
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

-- Helper B (Taylor) - on the move
insert into users (
  id, first_name, neighborhood_id, radius_miles,
  last_lat, last_lng, on_the_move, direction, move_expires_at
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

-- Helper C (Jordan) - idle
insert into users (
  id, first_name, neighborhood_id, radius_miles,
  last_lat, last_lng, on_the_move
) values (
  '00000000-0000-0000-0000-000000000004',
  'Jordan',
  'demo_neighborhood',
  1,
  33.4489,
  -112.0760,
  false
) on conflict (id) do nothing;

-- 3. Wallets (only create wallet records, no stored balances)
insert into wallets (id, user_id)
values
  (gen_random_uuid(), '00000000-0000-0000-0000-000000000001'),
  (gen_random_uuid(), '00000000-0000-0000-0000-000000000002'),
  (gen_random_uuid(), '00000000-0000-0000-0000-000000000003'),
  (gen_random_uuid(), '00000000-0000-0000-0000-000000000004')
on conflict (user_id) do nothing;

-- 4. Ledger Transactions for Demo (ALL with status = 'completed')
-- Alex (requester) - starts with $0
-- Jamie (helper A) - $15 from completed tasks
insert into wallet_transactions (
  id, wallet_id, user_id, type, amount_usd, source, status
)
select
  gen_random_uuid(),
  w.id,
  u.id,
  'credit',
  15.00,
  'demo_seed',
  'completed'
from wallets w
join users u on u.id = w.user_id
where u.id = '00000000-0000-0000-0000-000000000002';

-- Taylor (helper B) - $5 from completed tasks
insert into wallet_transactions (
  id, wallet_id, user_id, type, amount_usd, source, status
)
select
  gen_random_uuid(),
  w.id,
  u.id,
  'credit',
  5.00,
  'demo_seed',
  'completed'
from wallets w
join users u on u.id = w.user_id
where u.id = '00000000-0000-0000-0000-000000000003';

-- Jordan (helper C) - $0 (idle, no earnings yet)
-- No transactions for Jordan - balance will correctly show $0

-- 5. Broadcasts for demo
insert into task_requests (
  id, requester_id, helper_id, message, suggested_tip_usd,
  status, expires_at, is_broadcast, broadcast_type
)
values
  (
    gen_random_uuid(),
    '00000000-0000-0000-0000-000000000001',  -- Alex
    null,  -- broadcasts have no specific helper
    'Need someone with a truck to help move a couch',
    25.00,
    'sent',
    now() + interval '15 minutes',
    true,
    'need_help'
  ),
  (
    gen_random_uuid(),
    '00000000-0000-0000-0000-000000000001',
    null,
    'Running to Costco in 15 mins, happy to pick up anything',
    5.00,
    'sent',
    now() + interval '15 minutes',
    true,
    'offer_help'
  );
