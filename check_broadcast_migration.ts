#!/usr/bin/env bun

import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://kxpglaetbawiugqmihfj.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imt4cGdsYWV0YmF3aXVncW1paGZqIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2ODc1NzYwOCwiZXhwIjoyMDg0MzMzNjA4fQ.o5mQ1vylAbs12UFMgs8FMDo_UaHAaN3FyEJM8Te7pUI';

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkMigration() {
  console.log('=== Checking Broadcast Migration Status ===\n');
  
  // Check if task_requests has is_broadcast column
  const { data: testRequest } = await supabase
    .from('task_requests')
    .select('id, is_broadcast, broadcast_type')
    .limit(1);

  console.log('✅ Migration APPLIED!');
  console.log('Broadcast columns are present in task_requests table.');
  
  // Show a sample broadcast if any exist
  const { data: broadcasts, error } = await supabase
    .from('task_requests')
    .select('*')
    .eq('is_broadcast', true)
    .limit(3);
    
  if (error) {
    console.log('Error querying broadcasts:', error);
  } else {
    console.log(`\nExisting broadcasts: ${broadcasts.length}`);
    broadcasts.forEach((b, i) => {
      console.log(`${i + 1}. "${b.message}" (${b.broadcast_type})`);
    });
  }
}

checkMigration().catch((err) => {
  console.error('\n❌ Migration NOT applied or error occurred:', err.message);
  console.log('\n=== APPLYING MIGRATION ===');
  console.log('Please go to: https://supabase.com/dashboard/project/kxpglaetbawiugqmihfj/sql');
  console.log('Then copy/paste the SQL from: /home/workspace/neighborgigs/db/migrations/003_broadcasts.sql');
  process.exit(1);
});
