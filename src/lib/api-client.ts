// NeighborGigs Phase One - API Client
const API_BASE = '/api/v1';

const DEMO_USER_ID = '00000000-0000-0000-0000-000000000001';

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
  helper_id: string;
  description: string;
  tip_amount_usd: number;
  status: 'accepted' | 'in_progress' | 'completed';
  proof_photo_url: string | null;
  created_at: string;
  completed_at: string | null;
  requester?: { id: string; first_name: string; profile_photo: string | null };
  helper?: { id: string; first_name: string; profile_photo: string | null };
}

export interface Wallet {
  wallet_id: string;
  available_usd: number;
  pending_usd: number;
  updated_at: string;
}

export interface LedgerEntry {
  id: string;
  entry_type: 'credit' | 'debit';
  amount_usd: number;
  source: string;
  reference_id: string | null;
  created_at: string;
}

export interface Broadcast {
  id: string;
  requester_id: string;
  broadcast_type: 'need_help' | 'offer_help';
  message: string;
  expires_at: string;
  created_at: string;
  requester?: { id: string; first_name: string; profile_photo: string | null };
}

function apiFetch<T>(
  endpoint: string,
  options?: RequestInit & { idempotencyKey?: string }
): Promise<T> {
  const headers: HeadersInit = {
    'X-User-Id': DEMO_USER_ID,
    'Content-Type': 'application/json',
  };

  if (options?.idempotencyKey) {
    headers['Idempotency-Key'] = options.idempotencyKey;
  }

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
  getBroadcasts: () =>
    apiFetch<{ broadcasts: Broadcast[] }>('/broadcasts'),

  createBroadcast: (type: 'need_help' | 'offer_help', message: string, expiresInMinutes: number) =>
    apiFetch<{ broadcast: Broadcast }>('/broadcasts', {
      method: 'POST',
      body: JSON.stringify({ type, message, expiresInMinutes }),
    }),

  respondToBroadcast: (broadcastId: string, suggested_tip_usd: number) =>
    apiFetch<{ request: TaskRequest }>(`/broadcasts/${broadcastId}/respond`, {
      method: 'POST',
      body: JSON.stringify({ suggested_tip_usd }),
      idempotencyKey: crypto.randomUUID(),
    }),

  // Requests
  createRequest: (helper_id: string, message: string, suggested_tip_usd: number) =>
    apiFetch<{ request: TaskRequest }>('/requests', {
      method: 'POST',
      body: JSON.stringify({ helper_id, message, suggested_tip_usd }),
      idempotencyKey: crypto.randomUUID(),
    }),

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

  cancelRequest: (request_id: string) =>
    apiFetch<{ request: TaskRequest }>(`/requests/${request_id}/cancel`, {
      method: 'POST',
      idempotencyKey: crypto.randomUUID(),
    }),

  // Tasks
  getActiveTask: () =>
    apiFetch<{ task: Task | null; pending_request_id: string | null }>('/tasks/active'),

  startTask: (task_id: string) =>
    apiFetch<{ task: Task }>(`/tasks/${task_id}/start`, {
      method: 'POST',
    }),

  completeTask: (task_id: string, proof_photo_url?: string) =>
    apiFetch<{ task: Task; wallet: Wallet }>(`/tasks/${task_id}/complete`, {
      method: 'POST',
      body: JSON.stringify({ proof_photo_url }),
      idempotencyKey: crypto.randomUUID(),
    }),

  // Wallet
  getWallet: () =>
    apiFetch<{ wallet: Wallet }>('/wallet'),

  getLedgerEntries: (limit?: number, cursor?: string) =>
    apiFetch<{ entries: LedgerEntry[]; next_cursor: string | null }>(
      `/wallet/ledger?limit=${limit || 50}${cursor ? `&cursor=${cursor}` : ''}`
    ),

  requestWithdrawal: (amount_usd: number) =>
    apiFetch<{ ok: true; status: string; wallet: Wallet; withdrawal_id: string }>('/wallet/withdrawals', {
      method: 'POST',
      body: JSON.stringify({ amount_usd }),
      idempotencyKey: crypto.randomUUID(),
    }),
};
