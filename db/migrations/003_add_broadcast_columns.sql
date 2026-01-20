-- NeighborGigs Phase One - Add Broadcast Support
-- Adds columns to task_requests table for broadcast functionality

-- Add broadcast support columns to task_requests
alter table task_requests
  add column if not exists is_broadcast boolean default false,
  add column if not exists broadcast_type text check (broadcast_type in ('need_help', 'offer_help'));

-- Add index for broadcast queries
create index if not exists task_requests_broadcast_idx on task_requests(is_broadcast, status, expires_at);
