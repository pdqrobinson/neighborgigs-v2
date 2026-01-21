-- Migration: get_current_user RPC (uuid-safe)
--
-- This RPC prevents uuid = text errors by accepting text parameters
-- and casting to uuid inside the function.
-- Fixes the operator does not exist: uuid = text error.

create or replace function get_current_user(
  p_user_id text
)
returns json
language plpgsql
as $$
declare
  v_user users;
begin
  -- Cast the text parameter to uuid inside the function
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
