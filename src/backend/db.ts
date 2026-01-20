import { createClient } from '@supabase/supabase-js';

// CRITICAL: Supabase credentials must be set via environment variables
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

// Startup assertion - fail fast if credentials missing
if (!supabaseUrl || !supabaseKey) {
  throw new Error('Missing required environment variables: SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY must be set');
}

export const db = createClient(supabaseUrl, supabaseKey);

// ============================================================
// Domain Types - imported from shared/domain
// ============================================================
export * from '../shared/domain';
