-- NeighborGigs Phase One - RPC Functions for Atomic Operations

-- RPC: Get Nearby Helpers
-- Uses earthdistance to find on-the-move users within radius in same neighborhood
create or replace function get_nearby_helpers(
  p_user_id uuid,
  p_neighborhood_id text,
  p_lat numeric,
  p_lng numeric,
  p_radius_miles integer
)
returns table (
  user_id uuid,
  first_name text,
  profile_photo text,
  distance_miles numeric,
  direction text,
  expires_at timestamptz,
  last_lat numeric,
  last_lng numeric
)
language sql
as $$
  select
    u.id as user_id,
    u.first_name,
    u.profile_photo,
    round(
      (earth_distance(
        ll_to_earth(u.last_lat, u.last_lng),
        ll_to_earth(p_lat, p_lng)
      ) / 1609.34)::numeric,
      2
    ) as distance_miles,
    u.direction,
    u.move_expires_at as expires_at,
    u.last_lat,
    u.last_lng
  from users u
  where
    u.neighborhood_id = p_neighborhood_id
    and u.id != p_user_id
    and u.on_the_move = true
    and u.move_expires_at > now()
    and earth_distance(
      ll_to_earth(u.last_lat, u.last_lng),
      ll_to_earth(p_lat, p_lng)
    ) <= (p_radius_miles * 1609.34)
  order by
    earth_distance(ll_to_earth(u.last_lat, u.last_lng), ll_to_earth(p_lat, p_lng)) asc,
    u.move_expires_at asc;
$$;

-- RPC: Accept Request (Atomic with Task Creation)
-- Creates task and updates request status in single transaction
create or replace function accept_request(
  p_request_id uuid,
  p_helper_id uuid,
  p_requester_id uuid,
  p_message text,
  p_tip numeric
)
returns json
language plpgsql
as $$
declare
  v_request task_requests;
  v_task tasks;
  v_wallet_id uuid;
begin
  -- Lock and validate request
  select * into v_request
  from task_requests
  where id = p_request_id and status = 'sent' and helper_id = p_helper_id
  for update;

  if not found then
    return jsonb_build_object('error', jsonb_build_object('code', 'CONFLICT', 'message', 'Request not available'));
  end if;

  -- Check helper doesn't have active task
  if exists (
    select 1 from tasks
    where helper_id = p_helper_id and status in ('accepted', 'in_progress')
  ) then
    return jsonb_build_object('error', jsonb_build_object('code', 'CONFLICT', 'message', 'Helper already has active task'));
  end if;

  -- Get helper's wallet id
  select id into v_wallet_id
  from wallets
  where user_id = p_helper_id;

  if v_wallet_id is null then
    -- Create wallet if doesn't exist
    insert into wallets (id, user_id)
    values (gen_random_uuid(), p_helper_id)
    returning id into v_wallet_id;
  end if;

  -- Create task
  insert into tasks (id, requester_id, helper_id, description, tip_amount_usd, status)
  values (gen_random_uuid(), p_requester_id, p_helper_id, p_message, p_tip, 'accepted')
  returning * into v_task;

  -- Update request
  update task_requests
  set status = 'accepted', task_id = v_task.id
  where id = p_request_id;

  return jsonb_build_object(
    'task_request', to_jsonb(v_request),
    'task', to_jsonb(v_task)
  );
end;
$$;

-- RPC: Complete Task (Atomic with Ledger Credit)
-- Updates task status and credits helper wallet in single transaction
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

  -- Create ledger entry
  insert into ledger_entries (id, wallet_id, entry_type, amount_usd, source, reference_id)
  values (gen_random_uuid(), p_wallet_id, 'credit', p_tip_amount, 'task', p_task_id);

  -- Update wallet balance
  update wallets
  set available_usd = available_usd + p_tip_amount
  where id = p_wallet_id;

  return jsonb_build_object(
    'task', to_jsonb(v_task),
    'wallet', (select jsonb_build_object(
      'wallet_id', id,
      'available_usd', available_usd,
      'pending_usd', pending_usd,
      'updated_at', updated_at
    ) from wallets where id = p_wallet_id)
  );
end;
$$;

-- RPC: Request Withdrawal (Idempotent with Synchronous Debit)
-- Creates withdrawal_requests record and debits wallet atomically
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
        'available_usd', w.available_usd,
        'pending_usd', w.pending_usd,
        'updated_at', w.updated_at
      ) from wallets w where w.user_id = p_user_id),
      'withdrawal_id', p_idempotency_key
    );
  end if;

  -- Get wallet and validate balance
  select * into v_wallet
  from wallets
  where user_id = p_user_id
  for update;

  if not found then
    return jsonb_build_object('error', jsonb_build_object('code', 'NOT_FOUND', 'message', 'Wallet not found'));
  end if;

  if v_wallet.available_usd < p_amount_usd then
    return jsonb_build_object('error', jsonb_build_object('code', 'CONFLICT', 'message', 'Insufficient funds'));
  end if;

  -- Create withdrawal request
  insert into withdrawal_requests (id, wallet_id, amount_usd)
  values (p_idempotency_key, v_wallet.id, p_amount_usd);

  -- Create debit ledger entry
  insert into ledger_entries (id, wallet_id, entry_type, amount_usd, source, reference_id)
  values (gen_random_uuid(), v_wallet.id, 'debit', p_amount_usd, 'withdrawal', p_idempotency_key);

  -- Update wallet balance
  update wallets
  set available_usd = available_usd - p_amount_usd
  where id = v_wallet.id
  returning * into v_wallet;

  return jsonb_build_object(
    'ok', true,
    'status', 'processed',
    'wallet', jsonb_build_object(
      'wallet_id', v_wallet.id,
      'available_usd', v_wallet.available_usd,
      'pending_usd', v_wallet.pending_usd,
      'updated_at', v_wallet.updated_at
    ),
    'withdrawal_id', p_idempotency_key
  );
end;
$$;

-- RPC: Expire Movement (Background Job)
-- Sets on_the_move to false for expired users
create or replace function expire_movement()
returns integer
language sql
as $$
  update users
  set
    on_the_move = false,
    direction = null,
    move_expires_at = null
  where move_expires_at < now()
  returning 1;
$$;

-- RPC: Expire Requests (Background Job)
-- Sets status to expired for old sent requests
create or replace function expire_requests()
returns integer
language sql
as $$
  update task_requests
  set status = 'expired'
  where status = 'sent' and expires_at < now()
  returning 1;
$$;
