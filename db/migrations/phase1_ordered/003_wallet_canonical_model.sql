-- NeighborGigs - Canonical Wallet Model Migration
-- This migration aligns the wallet implementation with the ledger-first mental model

-- 1. Rename ledger_entries to wallet_transactions and add canonical fields
alter table ledger_entries rename to wallet_transactions;

-- Add missing canonical fields
alter table wallet_transactions
  add column if not exists user_id uuid,
  add column if not exists type text check (type in ('credit','debit','hold','release')),
  add column if not exists status text check (status in ('pending','completed','failed')),
  add column if not exists reference_id uuid,
  add column if not exists created_at timestamp default now();

-- Backfill user_id from wallet relationship
update wallet_transactions wt
set user_id = (
  select w.user_id from wallets w where w.id = wt.wallet_id
);

-- Backfill type from entry_type (credit/debit → credit/debit, no holds/releases yet)
update wallet_transactions
set type = entry_type
where type is null;

-- Backfill status - existing entries are assumed completed (they were already credited)
update wallet_transactions
set status = 'completed'
where status is null;

-- Make user_id not null after backfill
alter table wallet_transactions
  alter column user_id set not null;

-- Create indexes for wallet_transactions
create index wallet_transactions_user_id_idx on wallet_transactions(user_id);
create index wallet_transactions_user_status_idx on wallet_transactions(user_id, status);
create index wallet_transactions_user_type_status_idx on wallet_transactions(user_id, type, status);
create index wallet_transactions_reference_id_idx on wallet_transactions(reference_id);

-- 2. Add canonical balance calculation functions

-- Ledger balance (authoritative): sum of all completed transactions
create or replace function get_ledger_balance_cents(p_user_id uuid)
returns integer
language sql
as $$
  select coalesce(sum(amount_usd * 100), 0)::integer
  from wallet_transactions
  where user_id = p_user_id
    and status = 'completed';
$$;

-- Available balance: ledger minus holds
create or replace function get_available_balance_cents(p_user_id uuid)
returns integer
language sql
as $$
  with ledger as (
    select coalesce(sum(amount_usd * 100), 0)::integer as total
    from wallet_transactions
    where user_id = p_user_id
      and status = 'completed'
  ),
  holds as (
    select coalesce(sum(amount_usd * 100), 0)::integer as total
    from wallet_transactions
    where user_id = p_user_id
      and type = 'hold'
      and status = 'pending'
  )
  select ledger.total - holds.total
  from ledger, holds;
$$;

-- Held amount (reserved funds)
create or replace function get_held_balance_cents(p_user_id uuid)
returns integer
language sql
as $$
  select coalesce(sum(amount_usd * 100), 0)::integer
  from wallet_transactions
  where user_id = p_user_id
    and type = 'hold'
    and status = 'pending';
$$;

-- 3. Update complete_task RPC to use status on ledger entry
create or replace function complete_task(
  p_task_id uuid,
  p_helper_id uuid,
  p_wallet_id uuid,
  p_tip_amount numeric,
  p_proof_photo_url text default null
)
returns json
language plpgsql
as $$
declare
  v_task tasks;
begin
  -- Lock and validate task
  select * into v_task
  from tasks
  where id = p_task_id and helper_id = p_helper_id and status = 'in_progress'
  for update;

  if not found then
    return jsonb_build_object('error', jsonb_build_object('code', 'CONFLICT', 'message', 'Task not available for completion'));
  end if;

  -- Update task
  update tasks
  set
    status = 'completed',
    completed_at = now(),
    proof_photo_url = p_proof_photo_url
  where id = p_task_id
  returning * into v_task;

  -- Create COMPLETED ledger entry (not pending)
  insert into wallet_transactions (
    id, wallet_id, user_id, type, amount_usd, source, reference_id, status
  )
  values (
    gen_random_uuid(),
    p_wallet_id,
    p_helper_id,
    'credit',
    p_tip_amount,
    'task',
    p_task_id,
    'completed'  -- COMPLETED status for instant availability
  );

  return jsonb_build_object(
    'task', to_jsonb(v_task),
    'wallet', (select jsonb_build_object(
      'wallet_id', id,
      'available_usd', get_available_balance_cents(p_helper_id)::numeric / 100,
      'pending_usd', 0,  -- No pending in canonical model
      'ledger_usd', get_ledger_balance_cents(p_helper_id)::numeric / 100,
      'held_usd', get_held_balance_cents(p_helper_id)::numeric / 100
    ) from wallets where id = p_wallet_id)
  );
end;
$$;

-- 4. Update request_withdrawal RPC to use status and derive balances
create or replace function request_withdrawal(
  p_idempotency_key uuid,
  p_user_id uuid,
  p_amount_usd numeric
)
returns json
language plpgsql
as $$
declare
  v_wallet wallets;
  v_existing_withdrawal withdrawal_requests;
  v_available_cents integer;
begin
  -- Check for existing withdrawal with this idempotency key
  select * into v_existing_withdrawal
  from withdrawal_requests
  where id = p_idempotency_key;

  if found then
    -- Return existing result (idempotent)
    return jsonb_build_object(
      'ok', true,
      'status', 'processed',
      'wallet', (select jsonb_build_object(
        'wallet_id', w.id,
        'available_usd', get_available_balance_cents(p_user_id)::numeric / 100,
        'pending_usd', 0,
        'ledger_usd', get_ledger_balance_cents(p_user_id)::numeric / 100,
        'held_usd', get_held_balance_cents(p_user_id)::numeric / 100
      ) from wallets w where w.user_id = p_user_id),
      'withdrawal_id', p_idempotency_key
    );
  end if;

  -- Check available balance from ledger
  v_available_cents := get_available_balance_cents(p_user_id);

  if v_available_cents < (p_amount_usd * 100)::integer then
    return jsonb_build_object('error', jsonb_build_object('code', 'CONFLICT', 'message', 'Insufficient funds'));
  end if;

  -- Get wallet
  select * into v_wallet
  from wallets
  where user_id = p_user_id;

  if not found then
    return jsonb_build_object('error', jsonb_build_object('code', 'NOT_FOUND', 'message', 'Wallet not found'));
  end if;

  -- Create withdrawal request
  insert into withdrawal_requests (id, wallet_id, amount_usd)
  values (p_idempotency_key, v_wallet.id, p_amount_usd);

  -- Create COMPLETED debit ledger entry (immediate, not pending)
  insert into wallet_transactions (
    id, wallet_id, user_id, type, amount_usd, source, reference_id, status
  )
  values (
    gen_random_uuid(),
    v_wallet.id,
    p_user_id,
    'debit',
    p_amount_usd,
    'withdrawal',
    p_idempotency_key,
    'completed'
  );

  return jsonb_build_object(
    'ok', true,
    'status', 'processed',
    'wallet', jsonb_build_object(
      'wallet_id', v_wallet.id,
      'available_usd', get_available_balance_cents(p_user_id)::numeric / 100,
      'pending_usd', 0,
      'ledger_usd', get_ledger_balance_cents(p_user_id)::numeric / 100,
      'held_usd', get_held_balance_cents(p_user_id)::numeric / 100
    ),
    'withdrawal_id', p_idempotency_key
  );
end;
$$;

-- 5. Add function to get wallet with derived balances
create or replace function get_wallet(p_user_id uuid)
returns jsonb
language sql
as $$
  select jsonb_build_object(
    'wallet_id', w.id,
    'user_id', w.user_id,
    'available_usd', get_available_balance_cents(p_user_id)::numeric / 100,
    'pending_usd', 0,
    'ledger_usd', get_ledger_balance_cents(p_user_id)::numeric / 100,
    'held_usd', get_held_balance_cents(p_user_id)::numeric / 100,
    'created_at', w.created_at
  )
  from wallets w
  where w.user_id = p_user_id;
$$;

-- 6. Add function to get transaction history
create or replace function get_wallet_transactions(
  p_user_id uuid,
  p_limit integer default 50
)
returns jsonb
language sql
as $$
  select coalesce(jsonb_agg(
    jsonb_build_object(
      'id', wt.id,
      'type', wt.type,
      'amount_usd', wt.amount_usd,
      'status', wt.status,
      'source', wt.source,
      'reference_id', wt.reference_id,
      'created_at', wt.created_at
    )
    order by wt.created_at desc
  ), '[]'::jsonb)
  from wallet_transactions wt
  where wt.user_id = p_user_id
  limit p_limit;
$$;
