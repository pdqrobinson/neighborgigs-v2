// ============================================================
// Canonical Broadcast Domain Types
// ============================================================
// Single source of truth for Broadcast entity

// ============================================================
// Type Unions
// ============================================================

export type BroadcastType = 'need_help' | 'offer_help';
export type LocationContext = 'here_now' | 'heading_to' | 'coming_from' | 'place_specific' | null;

// ============================================================
// Database Row Type (what Supabase returns)
// ============================================================

export interface BroadcastRow {
  id: string;
  user_id: string;
  broadcast_type: BroadcastType;
  message: string;
  suggested_tip_usd: number;
  status: 'sent' | 'accepted' | 'declined' | 'expired';
  created_at: string;
  expires_at: string;
  broadcast_lat: number | null;
  broadcast_lng: number | null;
  location_context: LocationContext;
  place_name: string | null;
  place_address: string | null;
  distance_miles: number | null;
  requester_first_name: string | null;
  requester_profile_photo: string | null;
}

// ============================================================
// API Response Types (what client consumes)
// ============================================================

export interface Broadcast {
  id: string;
  requester_id: string;
  broadcast_type: BroadcastType;
  message: string;
  suggested_tip_usd: number;
  status: 'sent' | 'accepted' | 'declined' | 'expired';
  is_broadcast: boolean;
  created_at: string;
  expires_at: string;
  broadcast_lat: number | null;
  broadcast_lng: number | null;
  location_context: LocationContext;
  place_name: string | null;
  place_address: string | null;
  distance_miles: number | null;
  requester?: {
    id: string;
    first_name: string | null;
    profile_photo: string | null;
  };
  description?: string; // Legacy field for backwards compatibility
}

// ============================================================
// Mappers (database row → API response)
// ============================================================

export function mapBroadcastRow(row: BroadcastRow): Broadcast {
  return {
    id: row.id,
    requester_id: row.user_id,
    broadcast_type: row.broadcast_type,
    message: row.message,
    suggested_tip_usd: row.suggested_tip_usd,
    status: row.status,
    is_broadcast: true,
    created_at: row.created_at,
    expires_at: row.expires_at,
    broadcast_lat: row.broadcast_lat,
    broadcast_lng: row.broadcast_lng,
    location_context: row.location_context,
    place_name: row.place_name,
    place_address: row.place_address,
    distance_miles: row.distance_miles,
    requester: row.requester_first_name
      ? {
          id: row.user_id,
          first_name: row.requester_first_name,
          profile_photo: row.requester_profile_photo,
        }
      : undefined,
  };
}
