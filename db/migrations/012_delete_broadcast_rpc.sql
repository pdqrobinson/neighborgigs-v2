-- Migration: delete_broadcast RPC (UUID-safe)
--
-- This RPC prevents uuid = text errors by handling UUID type casting at DB boundary.
-- Replaces direct table queries in API route with a type-safe RPC.
--
-- APPLY INSTRUCTIONS:
-- 1. Go to https://supabase.com/dashboard/project/kxpglaetbawiugqmihfj/sql
-- 2. Copy and paste SQL below
-- 3. Click "Run" to execute

-- ============================================================
-- Drop any existing versions of delete_broadcast
-- ============================================================

drop function if exists delete_broadcast(uuid, uuid) cascade;

-- ============================================================
-- RPC: delete_broadcast
-- Deletes a broadcast (type-safe UUID handling)
-- ============================================================

create or replace function delete_broadcast(
  p_broadcast_id uuid,
  p_user_id uuid
)
returns json
language plpgsql
as $$
declare
  v_broadcast task_requests;
begin
  -- 1. Fetch and verify broadcast ownership
  select * into v_broadcast
  from task_requests
  where id = p_broadcast_id
    and is_broadcast = true
  for update;

  if not found then
    return jsonb_build_object(
      'error', jsonb_build_object(
        'code', 'NOT_FOUND',
        'message', 'Broadcast not found.'
      )
    );
  end if;

  -- 2. Verify ownership
  if v_broadcast.requester_id != p_user_id then
    return jsonb_build_object(
      'error', jsonb_build_object(
        'code', 'FORBIDDEN',
        'message', 'You can only delete your own broadcasts.'
      )
    );
  end if;

  -- 3. Delete broadcast
  delete from task_requests
  where id = p_broadcast_id
    and requester_id = p_user_id;

  return jsonb_build_object('ok', true);
end;
$$;

-- Comment
comment on function delete_broadcast is 'Deletes a broadcast. UUID-safe: all parameters are typed, preventing uuid = text errors.';
