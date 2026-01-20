import { createClient } from '@supabase/supabase-js';
import { readFileSync } from 'fs';

const supabaseUrl = 'https://kxpglaetbawiugqmihfj.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imt4cGdsYWV0YmF3aXVncW1paGZqIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2ODc1NzYwOCwiZXhwIjoyMDg0MzMzNjA4fQ.o5mQ1vylAbs12UFMgs8FMDo_UaHAaN3FyEJM8Te7pUI';

const supabase = createClient(supabaseUrl, supabaseKey);

async function applyMigration() {
  console.log('Applying idempotency stabilization migration...');

  const migrationSQL = readFileSync('./db/migrations/007_idempotency_fix.sql', 'utf-8');

  // Execute SQL via Supabase RPC
  const { data, error } = await supabase.rpc('exec_sql', { sql: migrationSQL });

  if (error) {
    console.error('Migration failed:', error);
    throw error;
  }

  console.log('Migration applied successfully!');
  console.log('Summary:');
  console.log('- Created idempotency_keys table');
  console.log('- Added 6 critical DB invariants');
  console.log('- Added helper functions for deterministic idempotency keys');
}

applyMigration().catch(console.error);
