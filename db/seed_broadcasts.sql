-- NeighborGigs Phase One - Demo Broadcasts
-- Sample broadcasts for testing

-- Active broadcasts in demo_neighborhood
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
  created_at
) values
  -- Broadcast 1: Need help
  (gen_random_uuid(), '00000000-0000-0000-0000-000000000001', null,
   'Need someone with a truck to help move a couch this afternoon',
   0, 'sent',
   now() + interval '60 minutes',
   true, 'need_help',
   now() - interval '5 minutes'),

  -- Broadcast 2: Offering help
  (gen_random_uuid(), '00000000-0000-0000-0000-000000000002', null,
   'Heading to Home Depot in 30 mins - happy to pick up small items',
   0, 'sent',
   now() + interval '30 minutes',
   true, 'offer_help',
   now() - interval '2 minutes'),

  -- Broadcast 3: Need help (more urgent)
  (gen_random_uuid(), '00000000-0000-0000-0000-000000000001', null,
   'Dog got loose near downtown! Need help looking for him ASAP',
   0, 'sent',
   now() + interval '120 minutes',
   true, 'need_help',
   now() - interval '10 minutes'),

  -- Broadcast 4: Offering help
  (gen_random_uuid(), '00000000-0000-0000-0000-000000000003', null,
   'Free coffee pickup at Starbucks on 5th Ave! Running there now',
   0, 'sent',
   now() + interval '15 minutes',
   true, 'offer_help',
   now() - interval '1 minute'),

  -- Broadcast 5: Need help
  (gen_random_uuid(), '00000000-0000-0000-0000-000000000003', null,
   'Need someone to watch my kids for 2 hours while I run errands',
   0, 'sent',
   now() + interval '90 minutes',
   true, 'need_help',
   now() - interval '20 minutes');
