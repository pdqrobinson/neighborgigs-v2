#!/usr/bin/env bun

import { createClient } from '@supabase/supabase-js';
import { readFileSync } from 'fs';

const supabaseUrl = process.env.SUPABASE_URL!;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

const supabase = createClient(supabaseUrl, supabaseKey);

async function runMigration() {
  const migrationPath = process.argv[2];

  if (!migrationPath) {
    console.error('Usage: bun run_migration.ts <migration-file.sql>');
    process.exit(1);
  }

  console.log(`Running migration: ${migrationPath}`);

  const sql = readFileSync(migrationPath, 'utf-8');

  const statements = sql
    .split(';')
    .map(s => s.trim())
    .filter(s => s.length > 0);

  for (const statement of statements) {
    console.log(`Executing: ${statement.substring(0, 80)}...`);

    const { data, error } = await supabase.rpc('exec_sql', { sql_statement: statement });

    if (error) {
      console.error('Error executing statement:', error);
      console.error('Statement:', statement);
      process.exit(1);
    }
  }

  console.log('✅ Migration completed successfully');
}

runMigration().catch((err) => {
  console.error('Migration failed:', err);
  process.exit(1);
});
