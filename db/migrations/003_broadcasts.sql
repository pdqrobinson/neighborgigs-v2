-- Migration: Add broadcast support to tasks table
-- Broadcasts are tasks in an early state with no helper yet
--
-- APPLY INSTRUCTIONS:
-- 1. Go to https://supabase.com/dashboard/project/kxpglaetbawiugqmihfj/sql
-- 2. Copy and paste SQL below
-- 3. Click "Run" to execute
--
-- Make helper_id nullable (task can exist without helper)
ALTER TABLE tasks 
ALTER COLUMN helper_id DROP NOT NULL;

-- Add broadcast_type to tasks
ALTER TABLE tasks
ADD COLUMN broadcast_type TEXT;

-- Add constraint for valid broadcast types
ALTER TABLE tasks 
ADD CONSTRAINT check_broadcast_type 
CHECK (broadcast_type IN ('need_help', 'offer_help') OR broadcast_type IS NULL);

-- Create index for efficient broadcast queries
CREATE INDEX idx_tasks_broadcasts 
ON tasks (status, expires_at) 
WHERE status = 'broadcast';

COMMENT ON COLUMN tasks.broadcast_type IS 'Broadcast type: need_help or offer_help (only when status=broadcast)';
