-- Migration: Fix RPC UUID/text conflicts
--
-- Drops existing function versions with all signatures
-- Then creates text-parameter versions to fix uuid = text errors

-- Drop all versions of get_current_user
drop function if exists get_current_user(uuid) cascade;
drop function if exists get_current_user(text) cascade;

-- Drop all versions of respond_to_broadcast
drop function if exists respond_to_broadcast(uuid, uuid) cascade;
drop function if exists respond_to_broadcast(uuid, uuid, text) cascade;
drop function if exists respond_to_broadcast(uuid, uuid, numeric) cascade;
drop function if exists respond_to_broadcast(text, text) cascade;

-- Drop all versions of delete_broadcast
drop function if exists delete_broadcast(uuid, uuid) cascade;
drop function if exists delete_broadcast(text, text) cascade;

-- ============================================================
-- RPC: get_current_user (text parameter version)
-- ============================================================

create or replace function get_current_user(
  p_user_id text
)
returns json
language plpgsql
as $$
declare
  v_user users;
begin
  select * into v_user
  from users
  where id = p_user_id::uuid;

  if not found then
    return jsonb_build_object(
      'error', jsonb_build_object(
        'code', 'NOT_FOUND',
        'message', 'User not found.'
      )
    );
  end if;

  return jsonb_build_object(
    'id', v_user.id,
    'first_name', v_user.first_name,
    'profile_photo', v_user.profile_photo,
    'neighborhood_id', v_user.neighborhood_id,
    'radius_miles', v_user.radius_miles,
    'last_lat', v_user.last_lat,
    'last_lng', v_user.last_lng,
    'on_the_move', v_user.on_the_move,
    'direction', v_user.direction,
    'move_expires_at', v_user.move_expires_at
  );
end;
$$;

-- ============================================================
-- RPC: respond_to_broadcast (text parameter version)
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

-- ============================================================
-- RPC: delete_broadcast (text parameter version)
-- ============================================================

create or replace function delete_broadcast(
  p_broadcast_id text,
  p_user_id text
)
returns json
language plpgsql
as $$
declare
  v_broadcast task_requests;
begin
  select * into v_broadcast
  from task_requests
  where id = p_broadcast_id::uuid
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

  if v_broadcast.requester_id != p_user_id::uuid then
    return jsonb_build_object(
      'error', jsonb_build_object(
        'code', 'FORBIDDEN',
        'message', 'You can only delete your own broadcasts.'
      )
    );
  end if;

  delete from task_requests
  where id = p_broadcast_id::uuid
    and requester_id = p_user_id::uuid;

  return jsonb_build_object('ok', true);
end;
$$;
