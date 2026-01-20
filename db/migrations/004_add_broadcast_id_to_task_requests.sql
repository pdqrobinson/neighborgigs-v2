-- NeighborGigs Migration 004: Add broadcast_id link to task_requests
-- This enables querying responses to broadcasts

alter table task_requests
  add column if not exists broadcast_id uuid;
