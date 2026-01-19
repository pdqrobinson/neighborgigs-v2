import { Hono } from 'hono';
import { db, type User, type NearbyHelper, type TaskRequest, type Task, type Wallet, type LedgerEntry } from './db';

const api = new Hono();

// Middleware: Auth check via X-User-Id header
api.use('/api/v1/*', async (c, next) => {
  const userId = c.req.header('X-User-Id');
  console.log('=== MIDDLEWARE HIT ===', { path: c.req.path, method: c.req.method, userId });
  if (!userId) {
    return c.json({ error: { code: 'UNAUTHORIZED', message: 'Missing X-User-Id header' } }, 401);
  }
  c.set('userId', userId);
  await next();
});

// Helper: Get current user from context
function getUserId(c: any): string {
  return c.get('userId');
}

// Error response helper
function errorResponse(code: string, message: string, details?: any, status = 400) {
  return { error: { code, message, details } };
}

// Helper function: Check if two points are within radius miles
async function checkWithinRadius(
  lat1: number,
  lng1: number,
  lat2: number,
  lng2: number,
  radiusMiles: number
): Promise<boolean> {
  const { data: distance } = await db
    .rpc('earth_distance', {
      lat1,
      lon1: lng1,
      lat2,
      lon2: lng2
    });

  // earth_distance returns meters, convert to miles
  const distanceMeters = typeof distance === 'number' ? distance : 0;
  const distanceMiles = distanceMeters / 1609.34;

  return distanceMiles <= radiusMiles;
}

// === USER ENDPOINTS ===

// 1) Get Current User
api.get('/api/v1/me', async (c) => {
  const userId = getUserId(c);
  console.log('=== GET /api/v1/me HIT ===', { userId, headers: c.req.header() });
  const { data, error } = await db
    .from('users')
    .select(`
      id, first_name, profile_photo, neighborhood_id, radius_miles,
      last_lat, last_lng, on_the_move, direction, move_expires_at,
      notifications_enabled, created_at,
      neighborhoods (id, name)
    `)
    .eq('id', userId)
    .single();

  if (error || !data) {
    console.log('User NOT FOUND', { userId, error, data });
    return c.json(errorResponse('NOT_FOUND', 'User not found'), 404);
  }

  const user = {
    id: data.id,
    first_name: data.first_name,
    profile_photo: data.profile_photo,
    neighborhood: { id: data.neighborhoods?.id, name: data.neighborhoods?.name },
    radius_miles: data.radius_miles,
    last_location: { lat: data.last_lat, lng: data.last_lng },
    movement: {
      on_the_move: data.on_the_move,
      direction: data.direction,
      expires_at: data.move_expires_at
    }
  };

  console.log('User FOUND', { userId, user });
  return c.json({ user });
});

// 2) Update Profile
api.patch('/api/v1/me/profile', async (c) => {
  const userId = getUserId(c);
  const body = await c.req.json();
  const { first_name, profile_photo } = body;

  if (!first_name || first_name.length < 1 || first_name.length > 40) {
    return c.json(errorResponse('VALIDATION_ERROR', 'first_name must be 1-40 characters'), 400);
  }

  const updateData: any = { first_name };
  if (profile_photo !== undefined) {
    updateData.profile_photo = profile_photo;
  }

  const { data, error } = await db
    .from('users')
    .update(updateData)
    .eq('id', userId)
    .select()
    .single();

  if (error) {
    return c.json(errorResponse('INTERNAL_ERROR', 'Failed to update profile'), 500);
  }

  return c.json({ user: data });
});

// 3) Update Location (heartbeat)
api.patch('/api/v1/me/location', async (c) => {
  const userId = getUserId(c);
  const body = await c.req.json();
  const { lat, lng } = body;

  if (typeof lat !== 'number' || typeof lng !== 'number') {
    return c.json(errorResponse('VALIDATION_ERROR', 'lat and lng must be numbers'), 400);
  }

  const { error } = await db
    .from('users')
    .update({ last_lat: lat, last_lng: lng })
    .eq('id', userId);

  if (error) {
    return c.json(errorResponse('INTERNAL_ERROR', 'Failed to update location'), 500);
  }

  return c.json({ ok: true });
});

// 4) Update Radius
api.patch('/api/v1/me/radius', async (c) => {
  const userId = getUserId(c);
  const body = await c.req.json();
  const { radius_miles } = body;

  if (![1, 2, 3].includes(radius_miles)) {
    return c.json(errorResponse('VALIDATION_ERROR', 'radius_miles must be 1, 2, or 3'), 400);
  }

  const { data, error } = await db
    .from('users')
    .update({ radius_miles })
    .eq('id', userId)
    .select()
    .single();

  if (error) {
    return c.json(errorResponse('INTERNAL_ERROR', 'Failed to update radius'), 500);
  }

  return c.json({ user: data });
});

// Update Notifications Toggle
api.patch('/api/v1/me/notifications', async (c) => {
  const userId = getUserId(c);
  const body = await c.req.json();
  const { notifications_enabled } = body;

  if (typeof notifications_enabled !== 'boolean') {
    return c.json(errorResponse('VALIDATION_ERROR', 'notifications_enabled must be a boolean'), 400);
  }

  const { data, error } = await db
    .from('users')
    .update({ notifications_enabled })
    .eq('id', userId)
    .select()
    .single();

  if (error) {
    return c.json(errorResponse('INTERNAL_ERROR', 'Failed to update notifications'), 500);
  }

  return c.json({ user: data });
});

// 4b) Update Neighborhood (automatic on first launch)
api.post('/api/v1/me/neighborhood', async (c) => {
  const userId = getUserId(c);
  const body = await c.req.json();
  const { lat, lng } = body;

  if (typeof lat !== 'number' || typeof lng !== 'number') {
    return c.json(errorResponse('VALIDATION_ERROR', 'lat and lng must be numbers'), 400);
  }

  // Find neighborhood containing this location
  const { data: neighborhoods, error: nError } = await db
    .from('neighborhoods')
    .select('*');

  if (nError) {
    return c.json(errorResponse('INTERNAL_ERROR', 'Failed to find neighborhood'), 500);
  }

  // Simple containment check: find first neighborhood within its radius
  // Using earthdistance to check if point is within neighborhood radius
  let assignedNeighborhoodId = null;
  if (neighborhoods && neighborhoods.length > 0) {
    for (const hood of neighborhoods) {
      const { data: dist } = await db
        .rpc('earth_distance', {
          lat1: hood.center_lat,
          lon1: hood.center_lng,
          lat2: lat,
          lon2: lng
        });
      if (dist && dist <= (hood.radius_miles * 1609.34)) {
        assignedNeighborhoodId = hood.id;
        break;
      }
    }
  }

  // If no neighborhood found or location denied, assign default
  if (!assignedNeighborhoodId) {
    assignedNeighborhoodId = 'demo_neighborhood';
  }

  const { data, error } = await db
    .from('users')
    .update({ neighborhood_id: assignedNeighborhoodId })
    .eq('id', userId)
    .select()
    .single();

  if (error) {
    return c.json(errorResponse('INTERNAL_ERROR', 'Failed to assign neighborhood'), 500);
  }

  return c.json({ user: data });
});

// === DISCOVERY ENDPOINTS ===

// 5) Get Nearby Helpers (Map/List Source of Truth)
api.get('/api/v1/nearby/helpers', async (c) => {
  const userId = getUserId(c);
  const lat = parseFloat(c.req.query('lat') || '0');
  const lng = parseFloat(c.req.query('lng') || '0');

  if (!lat || !lng) {
    return c.json(errorResponse('VALIDATION_ERROR', 'lat and lng query params required'), 400);
  }

  // Get current user's neighborhood and radius
  const { data: currentUser, error: userError } = await db
    .from('users')
    .select('neighborhood_id, radius_miles')
    .eq('id', userId)
    .single();

  if (userError || !currentUser) {
    return c.json(errorResponse('NOT_FOUND', 'User not found'), 404);
  }

  const { neighborhood_id, radius_miles } = currentUser;

  // Query for on-the-move users in same neighborhood within radius
  // Using earthdistance for distance calculation
  const { data: helpers, error } = await db.rpc('get_nearby_helpers', {
    p_user_id: userId,
    p_neighborhood_id: neighborhood_id,
    p_lat: lat,
    p_lng: lng,
    p_radius_miles: radius_miles
  });

  if (error) {
    // Fallback to direct query if RPC doesn't exist
    const { data: fallback, error: fallbackError } = await db
      .from('users')
      .select('id, first_name, profile_photo, last_lat, last_lng, direction, move_expires_at')
      .eq('neighborhood_id', neighborhood_id)
      .eq('on_the_move', true)
      .gt('move_expires_at', new Date().toISOString());

    if (fallbackError) {
      return c.json(errorResponse('INTERNAL_ERROR', 'Failed to fetch helpers'), 500);
    }

    const helpersWithDistance = (fallback || []).map((u: any) => ({
      user_id: u.id,
      first_name: u.first_name,
      profile_photo: u.profile_photo,
      distance_miles: 0, // TODO: calculate client-side for now
      direction: u.direction,
      expires_at: u.move_expires_at,
      last_location: { lat: u.last_lat, lng: u.last_lng }
    }));

    return c.json({ helpers: helpersWithDistance });
  }

  return c.json({ helpers: helpers || [] });
});

// === MOVEMENT ENDPOINTS ===

// 6) Go On The Move
api.post('/api/v1/movement/start', async (c) => {
  const userId = getUserId(c);
  const body = await c.req.json();
  const { direction, duration_minutes } = body;

  if (!['out', 'home'].includes(direction)) {
    return c.json(errorResponse('VALIDATION_ERROR', 'direction must be out or home'), 400);
  }

  if (![30, 60, 90, 120].includes(duration_minutes)) {
    return c.json(errorResponse('VALIDATION_ERROR', 'duration_minutes must be 30, 60, 90, or 120'), 400);
  }

  const expiresAt = new Date(Date.now() + duration_minutes * 60 * 1000).toISOString();

  const { data, error } = await db
    .from('users')
    .update({
      on_the_move: true,
      direction,
      move_expires_at: expiresAt
    })
    .eq('id', userId)
    .select('on_the_move, direction, move_expires_at')
    .single();

  if (error) {
    return c.json(errorResponse('INTERNAL_ERROR', 'Failed to start movement'), 500);
  }

  return c.json({ movement: data });
});

// 7) Stop Movement Early
api.post('/api/v1/movement/stop', async (c) => {
  const userId = getUserId(c);

  const { data, error } = await db
    .from('users')
    .update({
      on_the_move: false,
      direction: null,
      move_expires_at: null
    })
    .eq('id', userId)
    .select('on_the_move, direction, move_expires_at')
    .single();

  if (error) {
    return c.json(errorResponse('INTERNAL_ERROR', 'Failed to stop movement'), 500);
  }

  return c.json({ movement: data });
});

// === REQUEST ENDPOINTS ===

// 8) Create Task Request
api.post('/api/v1/requests', async (c) => {
  const userId = getUserId(c);
  const body = await c.req.json();
  const { helper_id, message, suggested_tip_usd } = body;

  if (!helper_id || !message || !suggested_tip_usd) {
    return c.json(errorResponse('VALIDATION_ERROR', 'helper_id, message, and suggested_tip_usd required'), 400);
  }

  if (message.length < 1 || message.length > 280) {
    return c.json(errorResponse('VALIDATION_ERROR', 'message must be 1-280 characters'), 400);
  }

  if (![5, 10, 15, 20].includes(suggested_tip_usd)) {
    return c.json(errorResponse('VALIDATION_ERROR', 'suggested_tip_usd must be 5, 10, 15, or 20'), 400);
  }

  // Check if helper is visible (on_the_move and not expired)
  const { data: helper, error: helperError } = await db
    .from('users')
    .select('id, on_the_move, move_expires_at, neighborhood_id, last_lat, last_lng')
    .eq('id', helper_id)
    .single();

  if (helperError || !helper || !helper.on_the_move) {
    return c.json(errorResponse('NOT_FOUND', 'Helper not found or not available'), 404);
  }

  // Get current user info for neighborhood and radius check
  const { data: currentUser } = await db
    .from('users')
    .select('neighborhood_id, radius_miles, last_lat, last_lng')
    .eq('id', userId)
    .single();

  if (!currentUser) {
    return c.json(errorResponse('NOT_FOUND', 'User not found'), 404);
  }

  // Check neighborhood match
  if (helper.neighborhood_id !== currentUser.neighborhood_id) {
    return c.json(errorResponse('FORBIDDEN', 'Helper is not in your neighborhood'), 403);
  }

  // Check if helper is within user's radius
  if (currentUser.last_lat && currentUser.last_lng && helper.last_lat && helper.last_lng) {
    const withinRadius = await checkWithinRadius(
      currentUser.last_lat,
      currentUser.last_lng,
      helper.last_lat,
      helper.last_lng,
      currentUser.radius_miles
    );

    if (!withinRadius) {
      return c.json(errorResponse('FORBIDDEN', `Helper is outside your ${currentUser.radius_miles} mile radius`), 403);
    }
  }

  const { data, error } = await db
    .from('task_requests')
    .insert({
      requester_id: userId,
      helper_id,
      message,
      suggested_tip_usd,
      status: 'sent',
      expires_at: new Date(Date.now() + 15 * 60 * 1000).toISOString() // 15 minutes
    })
    .select()
    .single();

  if (error) {
    return c.json(errorResponse('INTERNAL_ERROR', 'Failed to create request'), 500);
  }

  return c.json({ request: data }, 201);
});

// 9) List Incoming Requests (for Helper)
api.get('/api/v1/requests/incoming', async (c) => {
  const userId = getUserId(c);
  const status = c.req.query('status') || 'sent';

  const { data, error } = await db
    .from('task_requests')
    .select('*, requester:users!task_requests_requester_id_fkey (id, first_name, profile_photo)')
    .eq('helper_id', userId)
    .eq('status', status)
    .order('created_at', { ascending: false });

  if (error) {
    return c.json(errorResponse('INTERNAL_ERROR', 'Failed to fetch requests'), 500);
  }

  return c.json({ requests: data || [] });
});

// 10) Accept Request (Creates Task with Atomic Lock)
api.post('/api/v1/requests/:requestId/accept', async (c) => {
  const userId = getUserId(c);
  const requestId = c.req.param('requestId');

  // Get the request
  const { data: request, error: requestError } = await db
    .from('task_requests')
    .select('*')
    .eq('id', requestId)
    .single();

  if (requestError || !request) {
    return c.json(errorResponse('NOT_FOUND', 'Request not found'), 404);
  }

  if (request.status !== 'sent') {
    return c.json(errorResponse('CONFLICT', 'Request has already been processed'), 409);
  }

  if (request.helper_id !== userId) {
    return c.json(errorResponse('FORBIDDEN', 'You are not the helper for this request'), 403);
  }

  // Check if helper already has an active task
  const { data: activeTask } = await db
    .from('tasks')
    .select('id')
    .eq('helper_id', userId)
    .in('status', ['accepted', 'in_progress'])
    .maybeSingle();

  if (activeTask) {
    return c.json(errorResponse('CONFLICT', 'You already have an active task'), 409);
  }

  // Create task and update request in transaction (using RPC for atomicity)
  const { data: result, error: acceptError } = await db.rpc('accept_request', {
    p_request_id: requestId,
    p_helper_id: userId,
    p_requester_id: request.requester_id,
    p_message: request.message,
    p_tip: request.suggested_tip_usd
  });

  if (acceptError) {
    return c.json(errorResponse('INTERNAL_ERROR', 'Failed to accept request'), 500);
  }

  return c.json({ request: result?.task_request, task: result?.task });
});

// 11) Decline Request
api.post('/api/v1/requests/:requestId/decline', async (c) => {
  const userId = getUserId(c);
  const requestId = c.req.param('requestId');

  const { data, error } = await db
    .from('task_requests')
    .update({ status: 'declined' })
    .eq('id', requestId)
    .eq('helper_id', userId)
    .select()
    .single();

  if (error || !data) {
    return c.json(errorResponse('NOT_FOUND', 'Request not found or you are not the helper'), 404);
  }

  return c.json({ request: data });
});

// 11b) Cancel Request (requester can cancel their own sent request)
api.post('/api/v1/requests/:requestId/cancel', async (c) => {
  const userId = getUserId(c);
  const requestId = c.req.param('requestId');

  const { data, error } = await db
    .from('task_requests')
    .update({ status: 'expired' })
    .eq('id', requestId)
    .eq('requester_id', userId)
    .eq('status', 'sent')
    .select()
    .single();

  if (error || !data) {
    return c.json(errorResponse('NOT_FOUND', 'Request not found or cannot be cancelled'), 404);
  }

  return c.json({ request: data });
});

// === TASK ENDPOINTS ===

// 12) Get My Active Task
api.get('/api/v1/tasks/active', async (c) => {
  const userId = getUserId(c);

  // Check for pending sent request
  const { data: pendingRequest } = await db
    .from('task_requests')
    .select('id')
    .eq('requester_id', userId)
    .eq('status', 'sent')
    .maybeSingle();

  if (pendingRequest) {
    return c.json({ task: null, pending_request_id: pendingRequest.id });
  }

  // Check for active task as requester or helper
  const { data: task, error } = await db
    .from('tasks')
    .select('*, requester:users!tasks_requester_id_fkey (id, first_name, profile_photo), helper:users!tasks_helper_id_fkey (id, first_name, profile_photo)')
    .or(`requester_id.eq.${userId},helper_id.eq.${userId}`)
    .in('status', ['accepted', 'in_progress'])
    .maybeSingle();

  if (error) {
    return c.json(errorResponse('INTERNAL_ERROR', 'Failed to fetch active task'), 500);
  }

  return c.json({ task, pending_request_id: null });
});

// 13) Start Task (accepted -> in_progress)
api.post('/api/v1/tasks/:taskId/start', async (c) => {
  const userId = getUserId(c);
  const taskId = c.req.param('taskId');

  const { data, error } = await db
    .from('tasks')
    .update({ status: 'in_progress' })
    .eq('id', taskId)
    .eq('helper_id', userId)
    .eq('status', 'accepted')
    .select()
    .single();

  if (error || !data) {
    return c.json(errorResponse('CONFLICT', 'Task not found or cannot be started'), 409);
  }

  return c.json({ task: data });
});

// 14) Complete Task (in_progress -> completed + ledger credit)
api.post('/api/v1/tasks/:taskId/complete', async (c) => {
  const userId = getUserId(c);
  const taskId = c.req.param('taskId');
  const body = await c.req.json();
  const { proof_photo_url } = body;

  // Get task details for ledger credit
  const { data: task, error: taskError } = await db
    .from('tasks')
    .select('*, wallets!inner (*)')
    .eq('id', taskId)
    .eq('helper_id', userId)
    .eq('status', 'in_progress')
    .single();

  if (taskError || !task) {
    return c.json(errorResponse('CONFLICT', 'Task not found or cannot be completed'), 409);
  }

  // Use RPC for atomic completion + ledger credit
  const { data: result, error: completeError } = await db.rpc('complete_task', {
    p_task_id: taskId,
    p_helper_id: userId,
    p_wallet_id: task.wallets.id,
    p_tip_amount: task.tip_amount_usd,
    p_proof_photo_url: proof_photo_url
  });

  if (completeError) {
    return c.json(errorResponse('INTERNAL_ERROR', 'Failed to complete task'), 500);
  }

  return c.json({ task: result?.task, wallet: result?.wallet });
});

// === WALLET ENDPOINTS ===

// 15) Get Wallet
api.get('/api/v1/wallet', async (c) => {
  const userId = getUserId(c);

  const { data, error } = await db
    .from('wallets')
    .select('id, available_usd, pending_usd, created_at')
    .eq('user_id', userId)
    .single();

  if (error?.code === 'PGRST116') {
    // wallet not found - return defaults
    return c.json({ wallet: { available_usd: 0, pending_usd: 0 } });
  }

  if (error) {
    console.error('Wallet query error:', error);
    return c.json(errorResponse('INTERNAL_ERROR', 'Failed to fetch wallet'), 500);
  }

  const wallet = {
    wallet_id: data.id,
    available_usd: data.available_usd,
    pending_usd: data.pending_usd,
    updated_at: data.created_at,
  };
  return c.json({ wallet });
});

// 16) Get Ledger Entries
api.get('/api/v1/wallet/ledger', async (c) => {
  const userId = getUserId(c);
  const limit = parseInt(c.req.query('limit') || '50');
  const cursor = c.req.query('cursor') || null;

  let query = db
    .from('ledger_entries')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(limit);

  if (cursor) {
    query = query.gt('created_at', cursor);
  }

  const { data, error } = await query;

  if (error) {
    return c.json(errorResponse('INTERNAL_ERROR', 'Failed to fetch ledger'), 500);
  }

  const nextCursor = (data && data.length >= limit) ? data[data.length - 1].created_at : null;

  return c.json({ entries: data || [], next_cursor: nextCursor });
});

// 17) Request Withdrawal (synchronous with idempotency)
api.post('/api/v1/wallet/withdrawals', async (c) => {
  const userId = getUserId(c);
  const idempotencyKey = c.req.header('Idempotency-Key');
  const body = await c.req.json();
  const { amount_usd } = body;

  if (!idempotencyKey) {
    return c.json(errorResponse('VALIDATION_ERROR', 'Idempotency-Key header required'), 400);
  }

  if (typeof amount_usd !== 'number' || amount_usd <= 0) {
    return c.json(errorResponse('VALIDATION_ERROR', 'amount_usd must be a positive number'), 400);
  }

  // Use RPC for atomic withdrawal with idempotency
  const { data: result, error } = await db.rpc('request_withdrawal', {
    p_idempotency_key: idempotencyKey,
    p_user_id: userId,
    p_amount_usd: amount_usd
  });

  if (error) {
    return c.json(errorResponse('INTERNAL_ERROR', error.message || 'Failed to process withdrawal'), 500);
  }

  if (result?.error) {
    return c.json(errorResponse(result.error.code || 'CONFLICT', result.error.message), 409);
  }

  return c.json({
    ok: true,
    status: 'processed',
    wallet: result?.wallet,
    withdrawal_id: idempotencyKey
  });
});

// 17.1) Register Device (for Push Notifications)
api.post('/api/v1/me/devices', async (c) => {
  const userId = getUserId(c);
  const body = await c.req.json();
  const { push_token, push_platform } = body;

  if (!push_token || !push_platform) {
    return c.json(errorResponse('VALIDATION_ERROR', 'push_token and push_platform required'), 400);
  }

  if (!['ios', 'android', 'web'].includes(push_platform)) {
    return c.json(errorResponse('VALIDATION_ERROR', 'push_platform must be ios, android, or web'), 400);
  }

  // Upsert device
  const { data, error } = await db
    .from('user_devices')
    .upsert({
      user_id: userId,
      push_token,
      push_platform,
      last_seen_at: new Date().toISOString()
    }, {
      onConflict: 'user_id,push_token'
    })
    .select()
    .single();

  if (error) {
    return c.json(errorResponse('INTERNAL_ERROR', 'Failed to register device'), 500);
  }

  return c.json({ device: data }, 201);
});

export default api;
