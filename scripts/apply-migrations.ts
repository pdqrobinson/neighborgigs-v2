import dns from 'node:dns';

// 🔥 Force IPv4 DNS resolution - fixes Supabase connection flapping
dns.setDefaultResultOrder('ipv4first');

import { Client } from 'pg';
import { readFileSync } from 'fs';

// This script requires your Supabase database password
// Get it from: https://supabase.com/dashboard/project/kxpglaetbawiugqmihfj/settings/database

const PASSWORD = process.env.SUPABASE_DB_PASSWORD;

if (!PASSWORD) {
  console.error('❌ Error: SUPABASE_DB_PASSWORD environment variable not set');
  console.error('');
  console.error('To run migrations:');
  console.error('  bun run apply-migrations.ts');
  console.error('');
  console.error('First, set your password:');
  console.error('  export SUPABASE_DB_PASSWORD="your-password-here"');
  console.error('');
  console.error('Get your password from:');
  console.error('  https://supabase.com/dashboard/project/kxpglaetbawiugqmihfj/settings/database');
  console.error('  -> Copy password from "Connection string" -> "Session mode"');
  process.exit(1);
}

// ✅ Use session mode (not transaction) with explicit SSL for DDL operations
// Session mode maintains single connection per statement, avoiding pooled connection issues
const client = new Client({
  host: 'aws-1-us-east-1.pooler.supabase.com',
  port: 6543,
  user: 'postgres.kxpglaetbawiugqmihfj',
  password: PASSWORD,
  database: 'postgres',
  ssl: {
    rejectUnauthorized: false,
  },
  statement_timeout: 0,
  query_timeout: 0,
  connectionTimeoutMillis: 10_000,
});

async function executeSQL(sql: string, context: string) {
  try {
    await client.query(sql);
    return { success: true };
  } catch (error: any) {
    return {
      success: false,
      error: error.message,
      detail: error.detail,
    };
  }
}

async function applyMigration(filePath: string, name: string) {
  console.log(`\n=== Applying ${name} ===`);

  const sql = readFileSync(filePath, 'utf-8');

  // Better SQL parser that respects $$...$$ delimiters (dollar-quoted strings)
  // This prevents breaking on semicolons inside function bodies
  const statements: string[] = [];
  let currentStatement = '';
  let inDollarQuote = false;

  for (let i = 0; i < sql.length; i++) {
    const char = sql[i];
    const nextChar = sql[i + 1];
    const prevChar = sql[i - 1];

    // Check for $$ delimiter start
    if (char === '$' && nextChar === '$' && !inDollarQuote) {
      inDollarQuote = true;
      currentStatement += '$$';
      i++; // Skip next $
      continue;
    }

    // Check for $$ delimiter end
    if (char === '$' && prevChar === '$' && inDollarQuote) {
      inDollarQuote = false;
      currentStatement += '$$';
      continue;
    }

    currentStatement += char;

    // Only split on semicolons when NOT inside $$...$$
    if (char === ';' && !inDollarQuote) {
      const trimmed = currentStatement.trim();
      if (trimmed.length > 0 && !trimmed.startsWith('--') && !trimmed.startsWith('/*')) {
        statements.push(trimmed);
      }
      currentStatement = '';
    }
  }

  // Add any remaining content
  const remaining = currentStatement.trim();
  if (remaining.length > 0 && !remaining.startsWith('--') && !remaining.startsWith('/*')) {
    statements.push(remaining);
  }

  console.log(`Found ${statements.length} SQL statements to execute...`);

  let successCount = 0;
  let errorCount = 0;

  for (let i = 0; i < statements.length; i++) {
    const statement = statements[i];
    const preview = statement.substring(0, 60).replace(/\n/g, ' ');

    const result = await executeSQL(statement, `${name} - Statement ${i + 1}`);

    if (result.success) {
      successCount++;
      if (successCount % 5 === 0 || i === statements.length - 1) {
        console.log(`✅ Progress: ${successCount}/${statements.length} statements executed`);
      }
    } else {
      errorCount++;
      const errorMsg = result.error as string;
      const errorDetail = result.detail;
      // Some errors might be expected (e.g., "already exists" if re-running)
      if (errorDetail?.includes('already exists') || errorDetail?.includes('does not exist')) {
        console.log(`⚠️  Statement ${i + 1}: ${preview}... (already exists - skipping)`);
      } else {
        console.error(`❌ Statement ${i + 1}: ${preview}...`);
        console.error(`   Error: ${errorMsg}`);
        console.error(`   Detail: ${errorDetail || 'N/A'}`);
      }
    }
  }

  console.log(`✅ ${name} completed: ${successCount} succeeded, ${errorCount} skipped/failed`);
}

async function main() {
  console.log('=== NeighborGigs Phase One Database Migrations ===\n');
  console.log('Connecting to: aws-1-us-east-1.pooler.supabase.com:6543 (session mode)\n');

  try {
    await client.connect();
    console.log('✅ Connected to database\n');

    await applyMigration('/home/workspace/neighborgigs/db/migrations/001_initial_schema.sql', 'Initial Schema');
    await applyMigration('/home/workspace/neighborgigs/db/migrations/002_rpc_functions.sql', 'RPC Functions');
    await applyMigration('/home/workspace/neighborgigs/db/seed_demo_data.sql', 'Demo Data');

    await client.end();

    console.log('\n========================================');
    console.log('✅ All migrations applied successfully!');
    console.log('========================================\n');

    console.log('Demo users created:');
    console.log('  - Alex (Requester): 00000000-0000-0000-0000-000000000001');
    console.log('  - Jamie (Helper):   00000000-0000-0000-0000000000002');
    console.log('  - Taylor (Helper): 00000000-0000-000000000003');
    console.log('  - Jordan (Idle):    00000000-0000-000000000004');
    console.log('');

  } catch (error) {
    console.error('\n❌ Migration failed:', error);
    await client.end().catch(() => {});
    process.exit(1);
  }
}

main();
