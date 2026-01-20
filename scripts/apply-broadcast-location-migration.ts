import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.SUPABASE_URL || 'https://kxpglaetbawiugqmihfj.supabase.co';
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imt4cGdsYWV0YmF3aXVncW1paGZqIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2ODc1NzYwOCwiZXhwIjoyMDg0MzMzNjA4fQ.o5mQ1vylAbs12UFMgs8FMDo_UaHAaN3FyEJM8Te7pUI';

const db = createClient(supabaseUrl, supabaseKey);

const migrations = [
  // Add broadcast location columns
  `alter table task_requests
    add column if not exists broadcast_lat numeric,
    add column if not exists broadcast_lng numeric,
    add column if not exists location_context text
      check (location_context in (
        'here_now',
        'heading_to',
        'coming_from',
        'place_specific'
      )),
    add column if not exists place_name text,
    add column if not exists place_address text;`,

  // Create index for location-based queries
  `create index if not exists task_requests_broadcast_location_idx
    on task_requests(broadcast_lat, broadcast_lng)
    where is_broadcast = true and broadcast_lat is not null and broadcast_lng is not null;`,

  // Create RPC function to calculate broadcast distance from user location
  `create or replace function calculate_broadcast_distance(
    user_lat numeric,
    user_lng numeric,
    broadcast_lat numeric,
    broadcast_lng numeric
  )
  returns numeric as $$
    select (
      earth_distance(
        ll_to_earth(user_lat, user_lng),
        ll_to_earth(broadcast_lat, broadcast_lng)
      ) / 1609.34
    );
  $$ language sql stable;`
];

async function applyMigrations() {
  console.log('=== Applying Broadcast Location Migration ===\n');

  for (let i = 0; i < migrations.length; i++) {
    const migration = migrations[i];
    console.log(`Step ${i + 1}/${migrations.length}...`);
    
    try {
      const { error } = await db.rpc('exec_sql', { sql: migration });
      
      if (error) {
        console.error(`Failed:`, error);
        process.exit(1);
      }
      
      console.log('✓ Success\n');
    } catch (err) {
      console.error('Error:', err);
      process.exit(1);
    }
  }

  console.log('=== Migration Complete ===');
}

applyMigrations().catch(console.error);
