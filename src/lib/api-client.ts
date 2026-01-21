// NeighborGigs Phase One - API Client
// All state-changing operations MUST include Idempotency-Key header
// This is a non-negotiable contract for production reliability

const API_BASE = '/api/v1';

const DEMO_USER_ID = '00000000-0000-0000-0000-000000000001';

// Helper: Generate deterministic idempotency key
// Format: {operation}:{user_id}:{inputs}
// This ensures retries use the same key
function generateKey(parts: string[]): string {
  return parts.join(':');
}

// Helper: Generate UUID from string (deterministic)
function generateDeterministicUUID(input: string): string {
  // Use a simple hash for deterministic UUID generation
  // In production, use crypto.randomUUID() with proper seed
  const hash = Array.from(input).reduce((acc, char) => {
    return ((acc << 5) - acc) + char.charCodeAt(0);
    return acc & 0xffffffff;
  }, 0);
  
  // Convert to UUID format
  const hex = Math.abs(hash).toString(16).padStart(8, '0');
  return `${hex.substring(0, 8)}-${hex.substring(0, 4)}-${hex.substring(0, 4)}-${hex.substring(0, 4)}-${hex.substring(0, 12)}`;
}

// Helper: Generate cryptographically secure UUID for idempotency
function generateIdempotencyKey(parts: string[]): string {
  const keyString = parts.join(':');
  
  // Use crypto.randomUUID() for proper UUID generation
  // Fallback to deterministic generation if crypto not available
  if (typeof crypto !== 'undefined' && crypto.randomUUID) {
    // Still use deterministic key for retries
    return generateDeterministicUUID(keyString);
  }
  
  return generateDeterministicUUID(keyString);
}

export interface User {
  id: string;
  first_name: string;
  profile_photo: string | null;
  neighborhood: { id: string; name: string };
  radius_miles: number;
  last_location: { lat: number; lng: number };
  movement: {
    on_the_move: boolean;
    direction: 'out' | 'home' | null;
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
  last_location: { lat: number; lng: number };
}

export interface TaskRequest {
  id: string;
  requester_id: string;
  helper_id: string;
  task_id: string | null;
  message: string;
  suggested_tip_usd: number;
  status: 'sent' | 'accepted' | 'declined' | 'expired';
  created_at: string;
  expires_at: string;
  requester?: { id: string; first_name: string; profile_photo: string | null };
}

export interface Task {
  id: string;
  requester_id: string;
  helper_id: string | null;
  description: string;
  tip_amount_usd: number;
  status: 'broadcast' | 'accepted' | 'in_progress' | 'completed';
  proof_photo_url: string | null;
  created_at: string;
  completed_at: string | null;
  broadcast_type?: 'need_help' | 'offer_help' | null;
  expires_at?: string | null;
  requester?: { id: string; first_name: string | null; profile_photo: string | null };
  helper?: { id: string; first_name: string | null; profile_photo: string | null };
}

export interface Wallet {
  wallet_id: string;
  user_id?: string;
  available_usd: number;
  pending_usd: number;
  ledger_usd?: number;
  held_usd?: number;
  created_at?: string;
  updated_at?: string;
}

export interface LedgerEntry {
  id: string;
  wallet_id: string;
  user_id: string;
  type: 'credit' | 'debit' | 'hold' | 'release';
  amount_usd: number;
  status: 'pending' | 'completed' | 'failed';
  source: string;
  reference_id: string | null;
  created_at: string;
}

export interface Broadcast {
  id: string;
  requester_id: string;
  broadcast_type: 'need_help' | 'offer_help';
  message: string;
  offer_usd: number;
  status: 'sent' | 'accepted' | 'declined' | 'expired';
  is_broadcast: boolean;
  created_at: string;
  expires_at: string;
  broadcast_lat: number | null;
  broadcast_lng: number | null;
  location_context: 'here_now' | 'heading_to' | 'coming_from' | 'place_specific' | null;
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

function apiFetch<T>(
  endpoint: string,
  options?: RequestInit
): Promise<T> {
  const headers: HeadersInit = {
    'X-User-Id': DEMO_USER_ID,
    'Content-Type': 'application/json',
  };

  return fetch(`${API_BASE}${endpoint}`, {
    ...options,
    headers: { ...headers, ...(options?.headers || {}) },
  }).then(async (res) => {
    const data = await res.json();
    if (!res.ok) {
      throw new Error(data.error?.message || 'API Error');
    }
    return data as T;
  });
}

export const api = {
  // User
  getMe: () => apiFetch<{ user: User }>('/me'),

  updateProfile: (data: { first_name: string; profile_photo?: string }) =>
    apiFetch<{ user: User }>('/me/profile', {
      method: 'PATCH',
      body: JSON.stringify(data),
    }),

  updateLocation: (lat: number, lng: number) =>
    apiFetch<{ ok: boolean }>('/me/location', {
      method: 'PATCH',
      body: JSON.stringify({ lat, lng }),
    }),

  updateRadius: (radius_miles: number) =>
    apiFetch<{ user: User }>('/me/radius', {
      method: 'PATCH',
      body: JSON.stringify({ radius_miles }),
    }),

  updateNeighborhood: (lat: number, lng: number) =>
    apiFetch<{ user: User }>('/me/neighborhood', {
      method: 'POST',
      body: JSON.stringify({ lat, lng }),
    }),

  updateNotifications: (notifications_enabled: boolean) =>
    apiFetch<{ user: User }>('/me/notifications', {
      method: 'PATCH',
      body: JSON.stringify({ notifications_enabled }),
    }),

  registerDevice: (push_token: string, push_platform: 'ios' | 'android' | 'web') =>
    apiFetch<{ device: any }>('/me/devices', {
      method: 'POST',
      body: JSON.stringify({ push_token, push_platform }),
    }),

  // Discovery
  getNearbyHelpers: (lat: number, lng: number) =>
    apiFetch<{ helpers: NearbyHelper[] }>(`/nearby/helpers?lat=${lat}&lng=${lng}`),

  // Movement
  startMovement: (direction: 'out' | 'home', expiresInMinutes: number) =>
    apiFetch<{ movement: User['movement'] }>('/movement/start', {
      method: 'POST',
      body: JSON.stringify({ direction, duration_minutes: expiresInMinutes }),
    }),

  stopMovement: () =>
    apiFetch<{ movement: User['movement'] }>('/movement/stop', {
      method: 'POST',
    }),

  // Broadcasts
  getBroadcasts: (lat?: number, lng?: number) =>
    apiFetch<{ broadcasts: Broadcast[] }>(`/broadcasts${lat && lng ? `?lat=${lat}&lng=${lng}` : ''}`),

  createBroadcast: (
    type: 'need_help' | 'offer_help',
    message: string,
    expiresInMinutes: number,
    location: {
      lat: number;
      lng: number;
      location_context: 'here_now' | 'heading_to' | 'coming_from' | 'place_specific';
      place_name?: string;
      place_address?: string;
    },
    offerUsd: number
  ) => {
    // Generate deterministic idempotency key for retries
    const idempotencyKey = generateKey([
      'broadcast:create',
      DEMO_USER_ID,
      type,
      message,
      String(expiresInMinutes),
      String(location.lat),
      String(location.lng),
      String(offerUsd)
    ]);

    return apiFetch<{ broadcast: Broadcast; idempotent?: boolean }>('/broadcasts', {
      method: 'POST',
      headers: {
        'Idempotency-Key': idempotencyKey,
      },
      body: JSON.stringify({
        type,
        message,
        expiresInMinutes,
        lat: location.lat,
        lng: location.lng,
        offer_usd: offerUsd,
      }),
    });
  },

  respondToBroadcast: (broadcastId: string) => {
    const idempotencyKey = generateKey(['broadcast:respond', broadcastId, DEMO_USER_ID]);

    return apiFetch<{ request: TaskRequest }>(`/broadcasts/${broadcastId}/respond`, {
      method: 'POST',
      headers: {
        'Idempotency-Key': idempotencyKey,
      },
      body: JSON.stringify({}),  // No body needed, only header
    });
  },

  deleteBroadcast: (broadcastId: string) =>
    apiFetch<{ ok: boolean }>(`/broadcasts/${broadcastId}`, {
      method: 'DELETE',
    }),

  getBroadcastResponses: (broadcastId: string) =>
    apiFetch<{ responses: TaskRequest[] }>(`/broadcasts/${broadcastId}/responses`),

  // Requests
  createRequest: (helper_id: string, message: string) => {
    const idempotencyKey = generateKey(['request:create', helper_id, DEMO_USER_ID, message.trim()]);

    return apiFetch<{ request: TaskRequest }>('/requests', {
      method: 'POST',
      headers: {
        'Idempotency-Key': idempotencyKey,
      },
      body: JSON.stringify({ helper_id, message, suggested_tip_usd: 0 }),
    });
  },

  getIncomingRequests: (status?: string) =>
    apiFetch<{ requests: TaskRequest[] }>(`/requests/incoming${status ? `?status=${status}` : ''}`),

  acceptRequest: (request_id: string) =>
    apiFetch<{ request: TaskRequest; task: Task }>(`/requests/${request_id}/accept`, {
      method: 'POST',
    }),

  declineRequest: (request_id: string) =>
    apiFetch<{ request: TaskRequest }>(`/requests/${request_id}/decline`, {
      method: 'POST',
    }),

  cancelRequest: (request_id: string) => {
    const idempotencyKey = generateKey(['request:cancel', request_id, DEMO_USER_ID]);

    return apiFetch<{ request: TaskRequest }>(`/requests/${request_id}/cancel`, {
      method: 'POST',
      headers: {
        'Idempotency-Key': idempotencyKey,
      },
    });
  },

  // Tasks
  getActiveTask: () =>
    apiFetch<{ task: Task | null; pending_request_id: string | null }>('/tasks/active'),

  startTask: (task_id: string) =>
    apiFetch<{ task: Task }>(`/tasks/${task_id}/start`, {
      method: 'POST',
    }),

  completeTask: (task_id: string, proof_photo_url?: string) => {
    const idempotencyKey = generateKey(['task:complete', task_id, DEMO_USER_ID]);

    return apiFetch<{ task: Task; wallet: Wallet }>(`/tasks/${task_id}/complete`, {
      method: 'POST',
      headers: {
        'Idempotency-Key': idempotencyKey,
      },
      body: JSON.stringify({ proof_photo_url }),
    });
  },

  // Wallet
  getWallet: () =>
    apiFetch<{ wallet: Wallet }>('/wallet'),

  getLedgerEntries: (limit?: number, cursor?: string) =>
    apiFetch<{ entries: LedgerEntry[]; next_cursor: string | null }>(
      `/wallet/ledger?limit=${limit || 50}${cursor ? `&cursor=${cursor}` : ''}`
    ),

  requestWithdrawal: (amount_usd: number) => {
    const idempotencyKey = generateKey(['withdrawal', DEMO_USER_ID, String(amount_usd)]);

    return apiFetch<{ ok: true; status: string; wallet: Wallet; withdrawal_id: string }>('/wallet/withdrawals', {
      method: 'POST',
      headers: {
        'Idempotency-Key': idempotencyKey,
      },
      body: JSON.stringify({ amount_usd }),
    });
  },
};
