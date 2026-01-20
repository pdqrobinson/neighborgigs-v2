-- Migration: Auto-enable "on the move" when helper accepts a task
-- This repurposes the on_the_move feature to activate automatically on task acceptance

-- RPC: Accept Request (Updated - Auto-enable on_the_move for helper)
-- Creates task, updates request status, and sets helper to on_the_move in single transaction
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

  -- Auto-enable on_the_move for helper (Phase 2: on the move = working on task)
  update users
  set
    on_the_move = true,
    direction = 'out',
    move_expires_at = now() + interval '2 hours'
  where id = p_helper_id;

  return jsonb_build_object(
    'task_request', to_jsonb(v_request),
    'task', to_jsonb(v_task)
  );
end;
$$;

-- RPC: Complete Task (Updated - Clear on_the_move when task completes)
-- Updates task status, credits helper wallet, and clears on_the_move in single transaction
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

  -- Clear on_the_move for helper (task is done)
  update users
  set
    on_the_move = false,
    direction = null,
    move_expires_at = null
  where id = p_helper_id;

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
