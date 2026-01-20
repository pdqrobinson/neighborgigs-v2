-- NeighborGigs - Add Broadcast Support
-- Run this in Supabase SQL Editor to enable broadcasts

-- Step 1: Add broadcast columns to task_requests
alter table task_requests
  add column if not exists is_broadcast boolean default false,
  add column if not exists broadcast_type text check (broadcast_type in ('need_help', 'offer_help'));

-- Step 2: Add index for broadcast queries
create index if not exists task_requests_broadcast_idx on task_requests(is_broadcast, status, expires_at);

-- Step 3: Insert demo broadcasts
insert into task_requests (
  id, requester_id, helper_id, message, suggested_tip_usd, status,
  expires_at, is_broadcast, broadcast_type, created_at
)
values
  (gen_random_uuid(), '00000000-0000-0000-0000-000000000001', null,
   'Need someone with a truck to help move a couch this afternoon',
   0, 'sent',
   now() + interval '60 minutes',
   true, 'need_help', now() - interval '5 minutes'),
  (gen_random_uuid(), '00000000-0000-0000-0000-000000000002', null,
   'Heading to Home Depot in 30 mins - happy to pick up small items',
   0, 'sent',
   now() + interval '30 minutes',
   true, 'offer_help', now() - interval '2 minutes'),
  (gen_random_uuid(), '00000000-0000-0000-0000-000000000001', null,
   'Dog got loose near downtown! Need help looking for him ASAP',
   0, 'sent',
   now() + interval '120 minutes',
   true, 'need_help', now() - interval '10 minutes'),
  (gen_random_uuid(), '00000000-0000-0000-0000-000000000003', null,
   'Free coffee pickup at Starbucks on 5th Ave! Running there now',
   0, 'sent',
   now() + interval '15 minutes',
   true, 'offer_help', now() - interval '1 minute'),
  (gen_random_uuid(), '00000000-0000-0000-0000-000000000003', null,
   'Need someone to watch my kids for 2 hours while I run errands',
   0, 'sent',
   now() + interval '90 minutes',
   true, 'need_help', now() - interval '20 minutes')
on conflict do nothing;

-- Verify broadcasts were created
select id, requester_id, message, broadcast_type, expires_at, created_at
from task_requests
where is_broadcast = true
order by created_at desc;
