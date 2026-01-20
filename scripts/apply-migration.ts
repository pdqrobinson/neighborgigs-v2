import pg from 'pg';

const connectionString = process.env.DATABASE_URL || 'postgresql://postgres.kxpglaetbawiugqmihfj:Oopie1!boodie2!jerry@aws-0-us-west-1.pooler.supabase.com:5432/postgres';

const client = new pg.Client({
  connectionString,
  ssl: { rejectUnauthorized: false }
});

async function executeSQLFile(filePath: string, description: string) {
  console.log(`\n=== ${description} ===`);
  try {
    const sql = await Bun.file(filePath).text();
    console.log('Executing SQL...');
    await client.query(sql);
    console.log('✓ Success!\n');
    return true;
  } catch (error: any) {
    console.error('✗ Error:', error.message);
    return false;
  }
}

async function main() {
  console.log('Connecting to database...');
  try {
    await client.connect();
    console.log('✓ Connected!\n');

    // Apply broadcast columns migration
    await executeSQLFile('/home/workspace/neighborgigs/db/migrations/003_add_broadcast_columns.sql', 'Add Broadcast Columns');

    // Insert demo broadcasts
    await executeSQLFile('/home/workspace/neighborgigs/db/seed_broadcasts.sql', 'Seed Demo Broadcasts');

    console.log('\n=== Migration Complete! ===');
  } catch (error: any) {
    console.error('Connection error:', error.message);
    console.error('\nConnection string format: postgresql://user:password@host:port/database');
  } finally {
    await client.end();
  }
}

main().catch(console.error);
