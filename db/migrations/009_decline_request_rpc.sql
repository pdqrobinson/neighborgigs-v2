-- =======================================
[truncated]
on conflict do nothing;
  -- Update status
  update task_requests
  set status = 'declined'
  where id = p_request_id
    and helper_id = p_helper_id
    and status = 'sent';
  -- Return updated request
  select * into v_request from task_requests where id = p_request_id;
  -- Store response
  update idempotency_keys
  set response = jsonb_build_object('request', to_jsonb(v_request))
  where key = v_existing_key.key;
  return jsonb_build_object('request', to_jsonb(v_request));
end;
$$;
