-- ============================================================
-- NeighborGigs — Phase One Demo Seed Data
-- Authoritative demo dataset
-- ============================================================

-- ⚠️ Assumptions:
-- - Schema already created
-- - RLS disabled
-- - Extensions enabled (cube, earthdistance)
-- - Tables exist exactly as defined in Phase One docs
-- ============================================================

-- ----------------------------
-- CLEAN SLATE (OPTIONAL)
-- Uncomment ONLY if you want a full reset
-- ----------------------------
-- truncate table
--   task_requests,
--   tasks,
--   ledger_entries,
--   wallets,
--   users,
--   neighborhoods
-- restart identity cascade;

-- ============================================================
-- 1. NEIGHBORHOOD
-- ============================================================

insert into neighborhoods (
  id,
  name,
  center_lat,
  center_lng,
  radius_miles
)
values (
  'demo_neighborhood',
  'Downtown Demo',
  33.4484,
  -112.0740,
  3
)
on conflict (id) do nothing;

-- ============================================================
-- 2. USERS (KNOWN UUIDS)
-- ============================================================

-- Demo Requester
insert into users (
  id,
  first_name,
  neighborhood_id,
  radius_miles,
  last_lat,
  last_lng,
  on_the_move
)
values (
  '00000000-0000-0000-0000-000000000001',
  'Alex',
  'demo_neighborhood',
  1,
  33.4484,
  -112.0740,
  false
)
on conflict (id) do nothing;

-- Demo Helper A (on the move)
insert into users (
  id,
  first_name,
  neighborhood_id,
  radius_miles,
  last_lat,
  last_lng,
  on_the_move,
  direction,
  move_expires_at
)
values (
  '00000000-0000-0000-0000-000000000002',
  'Jamie',
  'demo_neighborhood',
  1,
  33.4490,
  -112.0735,
  true,
  'out',
  now() + interval '45 minutes'
)
on conflict (id) do nothing;

-- Demo Helper B (on the move)
insert into users (
  id,
  first_name,
  neighborhood_id,
  radius_miles,
  last_lat,
  last_lng,
  on_the_move,
  direction,
  move_expires_at
)
values (
  '00000000-0000-0000-0000-000000000003',
  'Taylor',
  'demo_neighborhood',
  2,
  33.4478,
  -112.0752,
  true,
  'home',
  now() + interval '30 minutes'
)
on conflict (id) do nothing;

-- Demo Helper C (idle, not visible)
insert into users (
  id,
  first_name,
  neighborhood_id,
  radius_miles,
  last_lat,
  last_lng,
  on_the_move
)
values (
  '00000000-0000-0000-0000-000000000004',
  'Jordan',
  'demo_neighborhood',
  1,
  33.4489,
  -112.0760,
  false
)
on conflict (id) do nothing;

-- ============================================================
-- 3. USER DEVICES (PUSH TOKENS - OPTIONAL FOR TESTING)
-- ============================================================

-- These are placeholder tokens for testing notification flow only.
-- Real push delivery requires valid provider tokens from FCM.

insert into user_devices (user_id, push_token, push_platform, last_seen_at)
values
  ('00000000-0000-0000-0000-000000000001', 'dummy-token-demo-ios-001', 'ios', now()),
  ('00000000-0000-0000-0000-000000000002', 'dummy-token-demo-web-001', 'web', now());

-- ============================================================
-- 4. WALLETS
-- ============================================================

insert into wallets (
  id,
  user_id,
  available_usd,
  pending_usd
)
values
  (gen_random_uuid(), '00000000-0000-0000-0000-000000000001', 0, 0),
  (gen_random_uuid(), '00000000-0000-0000-0000-000000000002', 15, 0),
  (gen_random_uuid(), '00000000-0000-0000-0000-000000000003', 5, 0),
  (gen_random_uuid(), '00000000-0000-0000-0000-000000000004', 0, 0);

-- ============================================================
-- 5. LEDGER ENTRIES (SEED HISTORY)
-- ============================================================

insert into ledger_entries (
  id,
  wallet_id,
  entry_type,
  amount_usd,
  source
)
select
  gen_random_uuid(),
  w.id,
  'credit',
  w.available_usd,
  'demo_seed'
from wallets w
where w.available_usd > 0;

-- ============================================================
-- 5. WITHDRAWAL REQUESTS (Phase One Idempotency Fix)
-- ============================================================

-- This table exists to prevent double-debit race conditions.
-- Without it, simultaneous withdrawal requests could duplicate debits.

create table withdrawal_requests (
  id uuid primary key,
  wallet_id uuid not null references wallets(id) on delete cascade,
  amount_usd numeric not null,
  created_at timestamptz not null default now()
);

create unique index withdrawal_requests_id_idx on withdrawal_requests(id);

-- ============================================================
-- 6. OPTIONAL: SAMPLE ACTIVE TASK (COMMENTED OUT)
-- Uncomment if you want an in-progress demo task
-- ============================================================

-- insert into tasks (
--   id,
--   requester_id,
--   helper_id,
--   description,
--   tip_amount_usd,
--   status,
--   proof_photo_url
-- )
-- values (
--   gen_random_uuid(),
--   '00000000-0000-0000-0000-000000000001',
--   '00000000-0000-0000-0000-000000000002',
--   'Pick up a coffee from the corner shop',
--   5,
--   'in_progress',
--   null
-- );

-- ============================================================
-- END OF SEED FILE
-- ============================================================

