-- Migration: respond_to_broadcast RPC (uuid-safe)
--
-- This RPC prevents uuid = text errors by accepting text parameters
-- and casting to uuid inside the function.
--
-- APPLY INSTRUCTIONS:
-- 1. Go to https://supabase.com/dashboard/project/kxpglaetbawiugqmihfj/sql
-- 2. Copy and paste SQL below
-- 3. Click "Run" to execute

-- ============================================================
-- Drop any existing versions of respond_to_broadcast
-- ============================================================

drop function if exists respond_to_broadcast(uuid, uuid) cascade;
drop function if exists respond_to_broadcast(uuid, uuid, text) cascade;
drop function if exists respond_to_broadcast(uuid, uuid, numeric) cascade;

-- ============================================================
-- RPC: respond_to_broadcast
-- Creates a task_request in response to a broadcast
-- ============================================================

create or replace function respond_to_broadcast(
  p_broadcast_id text,
  p_helper_id text
)
returns json
language plpgsql
as $$
declare
  v_broadcast task_requests;
begin
  -- Cast text to uuid in comparisons
  select * into v_broadcast
  from task_requests
  where id = p_broadcast_id::uuid
    and is_broadcast = true
    and status = 'sent'
  for update;

  if not found then
    return jsonb_build_object(
      'error', jsonb_build_object(
        'code', 'NOT_FOUND',
        'message', 'Broadcast not found or already processed.'
      )
    );
  end if;

  if v_broadcast.expires_at < now() then
    return jsonb_build_object(
      'error', jsonb_build_object(
        'code', 'EXPIRED',
        'message', 'Broadcast has expired.'
      )
    );
  end if;

  if v_broadcast.requester_id = p_helper_id::uuid then
    return jsonb_build_object(
      'error', jsonb_build_object(
        'code', 'FORBIDDEN',
        'message', 'You cannot respond to your own broadcast.'
      )
    );
  end if;

  if exists (
    select 1 from task_requests
    where helper_id = p_helper_id::uuid
      and status in ('accepted', 'in_progress')
      and is_broadcast = false
  ) then
    return jsonb_build_object(
      'error', jsonb_build_object(
        'code', 'CONFLICT',
        'message', 'You already have an active task.'
      )
    );
  end if;

  insert into task_requests (
    id,
    requester_id,
    helper_id,
    message,
    suggested_tip_usd,
    status,
    expires_at,
    is_broadcast,
    created_at
  )
  values (
    gen_random_uuid(),
    v_broadcast.requester_id,
    p_helper_id::uuid,
    'Responding to broadcast: ' || v_broadcast.message,
    v_broadcast.suggested_tip_usd,
    'sent',
    now() + interval '15 minutes',
    false,
    now()
  )
  returning * into v_broadcast;

  return jsonb_build_object(
    'request', to_jsonb(v_broadcast)
  );
end;
$$;

-- Comment
comment on function respond_to_broadcast is 'Creates a task_request in response to a broadcast. UUID-safe: all parameters are typed, preventing uuid = text errors.';
