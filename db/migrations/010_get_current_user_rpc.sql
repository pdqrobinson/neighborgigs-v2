-- Migration: Get Current User RPC
--
-- Provides a type-safe way to fetch current user with UUID validation
-- Eliminates uuid = text comparison issues
-- Ensures authorization at database level

CREATE OR REPLACE FUNCTION get_current_user(p_user_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
AS $$
DECLARE
  v_user users%ROWTYPE;
BEGIN
  SELECT * INTO v_user
  FROM users
  WHERE id = p_user_id;
  
  IF NOT FOUND THEN
    RETURN jsonb_build_object('error', jsonb_build_object('code', 'NOT_FOUND', 'message', 'User not found'));
  END IF;
  
  RETURN jsonb_build_object(
    'id', v_user.id,
    'first_name', v_user.first_name,
    'profile_photo', v_user.profile_photo,
    'neighborhood_id', v_user.neighborhood_id,
    'radius_miles', v_user.radius_miles,
    'last_lat', v_user.last_lat,
    'last_lng', v_user.last_lng,
    'on_the_move', v_user.on_the_move,
    'direction', v_user.direction,
    'move_expires_at', v_user.move_expires_at,
    'notifications_enabled', v_user.notifications_enabled,
    'created_at', v_user.created_at
  );
END;
$$;
