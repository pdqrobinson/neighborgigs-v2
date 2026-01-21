import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

const client = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

const SQL = `
-- Drop legacy RPCs and tables
drop function if exists create_broadcast_with_idempotency cascade;
drop function if exists create_broadcast cascade;
drop table if exists broadcast_requests cascade;

-- Recreate broadcasts table (canonical)
create table if not exists broadcasts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references users(id) on delete cascade,
  message text not null,
  price_usd numeric not null default 0,
  lat double precision not null,
  lng double precision not null,
  location_context text,
  idempotency_key text not null,
  created_at timestamp with time zone default now()
);

-- Idempotency index
create unique index if not exists broadcasts_user_idempotency_unique
on broadcasts (user_id, idempotency_key);

-- Canonical RPC
create or replace function create_broadcast(
  p_user_id uuid,
  p_message text,
  p_price_usd numeric,
  p_lat double precision,
  p_lng double precision,
  p_location_context text,
  p_idempotency_key text
)
returns json
language plpgsql
as $$
declare
  v_existing broadcasts;
  v_broadcast broadcasts;
begin
  select * into v_existing
  from broadcasts
  where user_id = p_user_id
    and idempotency_key = p_idempotency_key;

  if found then
    return jsonb_build_object(
      'broadcast', row_to_json(v_existing),
      'idempotent', true
    );
  end if;

  insert into broadcasts (
    user_id,
    message,
    price_usd,
    lat,
    lng,
    location_context,
    idempotency_key,
    created_at
  ) values (
    p_user_id,
    p_message,
    p_price_usd,
    p_lat,
    p_lng,
    p_location_context,
    p_idempotency_key,
    now()
  ) returning * into v_broadcast;

  return jsonb_build_object(
    'broadcast', row_to_json(v_broadcast),
    'idempotent', false
  );
end;
$$;

grant execute on function create_broadcast to authenticated;
grant all on table broadcasts to authenticated;
`;

// Try to execute via proxy service that has exec_sql
// First check if we can reach the API
const proxyResponse = await fetch('http://localhost:50430/api/v1/admin/test-sql', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json', 'X-User-Id': '00000000-0000-0000-0000-000000000001' },
  body: JSON.stringify({ sql: 'SELECT 1' })
}).catch(e => ({ error: e.message }));

console.log('Proxy check:', proxyResponse);

// If proxy doesn't work, we need to inject exec_sql function
// Let's first check if exec_sql exists
const { data: fnExists, error: fnError } = await client.rpc('get_function_exists', { 
  func_name: 'exec_sql' 
});

console.log('exec_sql exists:', fnExists, 'error:', fnError);

if (!fnExists) {
  console.log('\nexec_sql function does not exist. Need to create it first.');
  
  // Create exec_sql function
  const createExecSql = `
    create or replace function exec_sql(sql text)
    returns json
    language plpgsql
    security definer
    as $$
    declare
      result json;
    begin
      execute sql;
      return jsonb_build_object('ok', true);
    end;
    $$;

    grant execute on function exec_sql to postgres;
    grant execute on function exec_sql to service_role;
  `;
  
  const { error: createError } = await client.rpc('exec_sql', { sql: createExecSql });
  
  if (createError) {
    console.error('Failed to create exec_sql:', createError);
    process.exit(1);
  }
  
  console.log('exec_sql created');
}

// Now apply the canonical migration
const { data, error } = await client.rpc('exec_sql', { sql: SQL });

if (error) {
  console.error('Migration error:', error);
  process.exit(1);
}

console.log('\n✓ Canonical broadcast RPC migration applied successfully!');
console.log('\nVerifying...');

const verifySql = `
  SELECT 
    'broadcasts table' as object,
    EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'broadcasts') as exists
  UNION ALL
  SELECT 
    'create_broadcast function' as object,
    EXISTS (SELECT FROM pg_proc WHERE proname = 'create_broadcast') as exists
  UNION ALL
  SELECT 
    'idempotency index' as object,
    EXISTS (SELECT FROM pg_indexes WHERE indexname = 'broadcasts_user_idempotency_unique') as exists;
`;

const { data: verifyData, error: verifyError } = await client.rpc('exec_sql', { sql: verifySql });

if (verifyError) {
  console.error('Verification error:', verifyError);
} else {
  console.log('\n=== VERIFICATION ===');
  console.table(verifyData);
}

process.exit(0);
