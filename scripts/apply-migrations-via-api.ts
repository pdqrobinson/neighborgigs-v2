import { readFileSync } from 'fs';

const SUPABASE_URL = 'https://kxpglaetbawiugqmihfj.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imt4cGdsYWV0YmF3aXVncW1paGZqIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2ODc1NzYwOCwiZXhwIjoyMDg0MzMzNjA4fQ.o5mQ1vylAbs12UFMgs8FMDo_UaHAaN3FyEJM8Te7pUI';

async function executeSQLViaRPC(sql: string) {
  const response = await fetch(`${SUPABASE_URL}/rest/v1/rpc/exec_sql`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'apikey': SUPABASE_KEY,
      'Authorization': `Bearer ${SUPABASE_KEY}`,
      'Prefer': 'return=representation',
    },
    body: JSON.stringify({ query: sql }),
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`SQL execution failed: ${error}`);
  }

  return await response.json();
}

async function applyMigration(filePath: string, name: string) {
  console.log(`\n=== Applying ${name} ===`);

  const sql = readFileSync(filePath, 'utf-8');

  // Split SQL into individual statements
  const statements = sql
    .split(';')
    .map(s => s.trim())
    .filter(s => s.length > 0 && !s.startsWith('--'));

  console.log(`Found ${statements.length} SQL statements to execute...`);

  for (let i = 0; i < statements.length; i++) {
    const statement = statements[i];
    const preview = statement.substring(0, 50);

    try {
      await executeSQLViaRPC(statement);
      console.log(`✅ Statement ${i + 1}/${statements.length}: ${preview}...`);
    } catch (error) {
      console.error(`❌ Statement ${i + 1} failed: ${error.message}`);
      throw error;
    }
  }

  console.log(`✅ ${name} completed successfully`);
}

async function main() {
  console.log('=== NeighborGigs Phase One Database Migrations ===\n');

  try {
    await applyMigration('/home/workspace/neighborgigs/db/migrations/001_initial_schema.sql', 'Initial Schema');
    await applyMigration('/home/workspace/neighborgigs/db/migrations/002_rpc_functions.sql', 'RPC Functions');
    await applyMigration('/home/workspace/neighborgigs/db/seed_demo_data.sql', 'Demo Data');

    console.log('\n========================================');
    console.log('✅ All migrations applied successfully!');
    console.log('========================================');
  } catch (error) {
    console.error('\n❌ Migration failed:', error);
    process.exit(1);
  }
}

main();
