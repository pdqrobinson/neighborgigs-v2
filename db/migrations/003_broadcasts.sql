-- Migration: Add broadcast support to task_requests
-- Broadcasts are open task_requests that haven't targeted a specific helper yet
--
-- APPLY INSTRUCTIONS:
-- 1. Go to https://supabase.com/dashboard/project/kxpglaetbawiugqmihfj/sql
-- 2. Copy and paste the SQL below
-- 3. Click "Run" to execute
--
-- Broadcasts are open task_requests that haven't targeted a specific helper yet

-- Add broadcast columns to task_requests
ALTER TABLE task_requests 
ADD COLUMN is_broadcast BOOLEAN DEFAULT FALSE,
ADD COLUMN broadcast_type TEXT;

-- Add constraint for valid broadcast types
ALTER TABLE task_requests 
ADD CONSTRAINT check_broadcast_type 
CHECK (broadcast_type IN ('need_help', 'offer_help') OR broadcast_type IS NULL);

-- Add index for efficient broadcast queries
CREATE INDEX idx_task_requests_broadcasts 
ON task_requests (is_broadcast, expires_at) 
WHERE is_broadcast = TRUE;

COMMENT ON COLUMN task_requests.is_broadcast IS 'Whether this request is a broadcast (open to anyone)';
COMMENT ON COLUMN task_requests.broadcast_type IS 'Broadcast type: need_help or offer_help (only when is_broadcast=true)';
