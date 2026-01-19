import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://kxpglaetbawiugqmihfj.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imt4cGdsYWV0YmF3aXVncW1paGZqIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2ODc1NzYwOCwiZXhwIjoyMDg0MzMzNjA4fQ.o5mQ1vylAbs12UFMgs8FMDo_UaHAaN3FyEJM8Te7pUI';

export const db = createClient(supabaseUrl, supabaseKey);

export interface User {
  id: string;
  phone: string | null;
  first_name: string | null;
  profile_photo: string | null;
  neighborhood_id: string | null;
  radius_miles: number;
  last_lat: number | null;
  last_lng: number | null;
  on_the_move: boolean;
  direction: 'out' | 'home' | null;
  move_expires_at: string | null;
  notifications_enabled: boolean;
  created_at: string;
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
  is_broadcast?: boolean;
  broadcast_type?: 'need_help' | 'offer_help' | null;
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
