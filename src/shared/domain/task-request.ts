// ============================================================
// Canonical Task Request Domain Types
// ============================================================
// Single source of truth for TaskRequest entity

// ============================================================
// Type Unions
// ============================================================

export type TaskRequestStatus = 'sent' | 'accepted' | 'declined' | 'expired';

// ============================================================
// Database Row Type (what Supabase returns)
// ============================================================

export interface TaskRequestRow {
  id: string;
  requester_id: string;
  helper_id: string | null;
  task_id: string | null;
  message: string;
  suggested_tip_usd: number;
  offer_usd: number;
  status: TaskRequestStatus;
  created_at: string;
  expires_at: string;
  is_broadcast: boolean;
  broadcast_type: 'need_help' | 'offer_help' | null;
  broadcast_lat: number | null;
  broadcast_lng: number | null;
  location_context: 'here_now' | 'heading_to' | 'coming_from' | 'place_specific' | null;
  place_name: string | null;
  place_address: string | null;
  broadcast_id: string | null;
  requester?: {
    id: string;
    first_name: string | null;
    profile_photo: string | null;
  };
}

// ============================================================
// API Response Types (what client consumes)
// ============================================================

export interface TaskRequest {
  id: string;
  requester_id: string;
  helper_id: string | null;
  task_id: string | null;
  message: string;
  suggested_tip_usd: number;
  offer_usd: number;
  status: TaskRequestStatus;
  created_at: string;
  expires_at: string;
  is_broadcast?: boolean;
  broadcast_type?: 'need_help' | 'offer_help' | null;
  broadcast_lat?: number | null;
  broadcast_lng?: number | null;
  location_context?: 'here_now' | 'heading_to' | 'coming_from' | 'place_specific' | null;
  place_name?: string | null;
  place_address?: string | null;
  requester?: {
    id: string;
    first_name: string | null;
    profile_photo: string | null;
  };
}

// ============================================================
// Mappers (database row → API response)
// ============================================================

export function mapTaskRequestRow(row: TaskRequestRow): TaskRequest {
  return {
    id: row.id,
    requester_id: row.requester_id,
    helper_id: row.helper_id,
    task_id: row.task_id,
    message: row.message,
    suggested_tip_usd: row.suggested_tip_usd,
    offer_usd: row.offer_usd,
    status: row.status,
    created_at: row.created_at,
    expires_at: row.expires_at,
    is_broadcast: row.is_broadcast,
    broadcast_type: row.broadcast_type,
    broadcast_lat: row.broadcast_lat,
    broadcast_lng: row.broadcast_lng,
    location_context: row.location_context,
    place_name: row.place_name,
    place_address: row.place_address,
    requester: row.requester,
  };
}
