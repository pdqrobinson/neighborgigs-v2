-- NeighborGigs Migration 003: Add Broadcast Support to Tasks
-- This migration enables the broadcast feature with map visualization

-- Add broadcast_type column to tasks
alter table tasks add column if not exists broadcast_type text check (broadcast_type in ('need_help', 'offer_help'));

-- Add expires_at column to tasks (for broadcast expiration)
alter table tasks add column if not exists expires_at timestamptz;

-- Add location columns to tasks (for map markers)
alter table tasks add column if not exists last_lat numeric;
alter table tasks add column if not exists last_lng numeric;

-- Update status check constraint to include 'broadcast'
alter table tasks drop constraint if exists tasks_status_check;
alter table tasks add constraint tasks_status_check check (
  status in ('broadcast', 'accepted', 'in_progress', 'completed')
);

-- Add indexes for broadcast queries
create index if not exists tasks_status_created_idx on tasks(status, created_at desc);
create index if not exists tasks_expires_at_idx on tasks(expires_at);
create index if not exists tasks_location_idx on tasks using gist (ll_to_earth(last_lat, last_lng));

-- Add is_broadcast column to task_requests (for tracking which requests are broadcasts)
alter table task_requests add column if not exists is_broadcast boolean default false;
alter table task_requests add column if not exists broadcast_type text check (broadcast_type in ('need_help', 'offer_help'));
