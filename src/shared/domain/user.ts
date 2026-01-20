// ============================================================
// Canonical User Domain Types
// ============================================================
// Single source of truth for User entity across:
// - Database schema
// - API responses
// - Frontend usage

// ============================================================
// Type Unions (for strict typing)
// ============================================================

export type Direction = 'out' | 'home' | null;

// ============================================================
// Database Row Type (what Supabase returns)
// ============================================================

export interface UserRow {
  id: string;
  phone: string | null;
  first_name: string | null;
  profile_photo: string | null;
  neighborhood_id: string | null;
  radius_miles: number;
  last_lat: number | null;
  last_lng: number | null;
  on_the_move: boolean;
  direction: Direction;
  move_expires_at: string | null;
  notifications_enabled: boolean;
  created_at: string;
  neighborhoods?: {
    id: string;
    name: string;
  } | null;
}

// ============================================================
// API Response Types (what client consumes)
// ============================================================

export interface User {
  id: string;
  first_name: string | null;
  profile_photo: string | null;
  neighborhood: {
    id: string;
    name: string;
  } | null;
  radius_miles: number;
  last_location: {
    lat: number;
    lng: number;
  };
  movement: {
    on_the_move: boolean;
    direction: Direction;
    expires_at: string | null;
  };
  notifications_enabled: boolean;
}

export interface NearbyHelper {
  user_id: string;
  first_name: string;
  profile_photo: string | null;
  distance_miles: number;
  direction: 'out' | 'home';
  expires_at: string;
  last_location: {
    lat: number;
    lng: number;
  };
}

// ============================================================
// Mappers (database row → API response)
// ============================================================

export function mapUserRow(row: UserRow): User {
  return {
    id: row.id,
    first_name: row.first_name,
    profile_photo: row.profile_photo,
    neighborhood: row.neighborhoods
      ? { id: row.neighborhoods.id, name: row.neighborhoods.name }
      : null,
    radius_miles: row.radius_miles,
    last_location: {
      lat: row.last_lat ?? 0,
      lng: row.last_lng ?? 0,
    },
    movement: {
      on_the_move: row.on_the_move,
      direction: row.direction,
      expires_at: row.move_expires_at,
    },
    notifications_enabled: row.notifications_enabled,
  };
}
