import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.SUPABASE_URL || 'https://kxpglaetbawiugqmihfj.supabase.co';
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imt4cGdsYWV0YmF3aXVncW1paGZqIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2ODc1NzYwOCwiZXhwIjoyMDg0MzMzNjA4fQ.o5mQ1vylAbs12UFMgs8FMDo_UaHAaN3FyEJM8Te7pUI';

const db = createClient(supabaseUrl, supabaseKey);

async function executeSQL(sql: string, description: string) {
  console.log(`\n=== ${description} ===`);
  console.log('Executing:', sql.substring(0, 200) + '...');

  const { data, error } = await db.rpc('exec_sql', { sql });

  if (error) {
    console.error('Error:', error);
    // Try direct query as fallback
    console.log('Trying direct connection...');
  } else {
    console.log('Success!');
    return true;
  }
  return false;
}

async function main() {
  console.log('Starting broadcast migration and seed data...');

  // Try using direct SQL through postgres client
  // This won't work through Supabase REST API, so we'll provide manual SQL instructions
  console.log('\n' + '='.repeat(60));
  console.log('Migration SQL to apply manually:');
  console.log('='.repeat(60));

  const migrationSQL = `-- Add broadcast support columns to task_requests
alter table task_requests
  add column if not exists is_broadcast boolean default false,
  add column if not exists broadcast_type text check (broadcast_type in ('need_help', 'offer_help'));

-- Add index for broadcast queries
create index if not exists task_requests_broadcast_idx on task_requests(is_broadcast, status, expires_at);

-- Insert demo broadcasts
insert into task_requests (
  id,
  requester_id,
  helper_id,
  message,
  suggested_tip_usd,
  status,
  expires_at,
  is_broadcast,
  broadcast_type,
  created_at
) values
  (gen_random_uuid(), '00000000-0000-0000-0000-000000000001', null,
   'Need someone with a truck to help move a couch this afternoon',
   0, 'sent',
   now() + interval '60 minutes',
   true, 'need_help',
   now() - interval '5 minutes'),

  (gen_random_uuid(), '00000000-0000-0000-0000-000000000002', null,
   'Heading to Home Depot in 30 mins - happy to pick up small items',
   0, 'sent',
   now() + interval '30 minutes',
   true, 'offer_help',
   now() - interval '2 minutes'),

  (gen_random_uuid(), '00000000-0000-0000-0000-000000000001', null,
   'Dog got loose near downtown! Need help looking for him ASAP',
   0, 'sent',
   now() + interval '120 minutes',
   true, 'need_help',
   now() - interval '10 minutes'),

  (gen_random_uuid(), '00000000-0000-0000-0000-000000000003', null,
   'Free coffee pickup at Starbucks on 5th Ave! Running there now',
   0, 'sent',
   now() + interval '15 minutes',
   true, 'offer_help',
   now() - interval '1 minute'),

  (gen_random_uuid(), '00000000-0000-0000-0000-000000000003', null,
   'Need someone to watch my kids for 2 hours while I run errands',
   0, 'sent',
   now() + interval '90 minutes',
   true, 'need_help',
   now() - interval '20 minutes')
on conflict do nothing;`;

  console.log(migrationSQL);
  console.log('\n' + '='.repeat(60));
  console.log('To apply this migration:');
  console.log('1. Go to Supabase dashboard');
  console.log('2. Navigate to SQL Editor');
  console.log('3. Paste and run the SQL above');
  console.log('='.repeat(60));
}

main().catch(console.error);
