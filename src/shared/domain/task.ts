// ============================================================
// Canonical Task Domain Types
// ============================================================
// Single source of truth for Task entity

// ============================================================
// Type Unions
// ============================================================

export type TaskStatus = 'accepted' | 'in_progress' | 'completed';

// ============================================================
// Database Row Type (what Supabase returns)
// ============================================================

export interface TaskRow {
  id: string;
  requester_id: string;
  helper_id: string | null;
  description: string;
  tip_amount_usd: number;
  status: TaskStatus;
  proof_photo_url: string | null;
  created_at: string;
  completed_at: string | null;
  broadcast_type?: 'need_help' | 'offer_help' | null;
  requester?: {
    id: string;
    first_name: string | null;
    profile_photo: string | null;
  };
  helper?: {
    id: string;
    first_name: string | null;
    profile_photo: string | null;
  };
  wallets?: {
    id: string;
  };
}

// ============================================================
// API Response Types (what client consumes)
// ============================================================

export interface Task {
  id: string;
  requester_id: string;
  helper_id: string | null;
  description: string;
  tip_amount_usd: number;
  status: TaskStatus;
  proof_photo_url: string | null;
  created_at: string;
  completed_at: string | null;
  broadcast_type?: 'need_help' | 'offer_help' | null;
  expires_at?: string | null;
  requester?: {
    id: string;
    first_name: string | null;
    profile_photo: string | null;
  };
  helper?: {
    id: string;
    first_name: string | null;
    profile_photo: string | null;
  };
}

// ============================================================
// Mappers (database row → API response)
// ============================================================

export function mapTaskRow(row: TaskRow): Task {
  return {
    id: row.id,
    requester_id: row.requester_id,
    helper_id: row.helper_id,
    description: row.description,
    tip_amount_usd: row.tip_amount_usd,
    status: row.status,
    proof_photo_url: row.proof_photo_url,
    created_at: row.created_at,
    completed_at: row.completed_at,
    broadcast_type: row.broadcast_type,
    requester: row.requester,
    helper: row.helper,
  };
}
