import { Hono } from 'hono';
import { db, type User, type NearbyHelper, type TaskRequest, type Task, type Wallet, type WalletTransaction } from './db';
import { mapBroadcastRow } from '../shared/domain/broadcast';

const api = new Hono();

// === IDEMPOTENCY MIDDLEWARE ===
// Enforces Idempotency-Key header for all state-modifying operations
// This is the single source of truth for idempotency requirements
api.use('/api/v1/*', async (c, next) => {
  const method = c.req.method;
  const path = c.req.path;
  
  // Log all headers in development for debugging
  if (process.env.NODE_ENV !== 'production') {
    // Hono provides headers via c.req.header() - log individual headers
    console.log('=== REQUEST HEADERS ===', {
      method,
      path,
      'x-user-id': c.req.header('X-User-Id'),
      'idempotency-key': c.req.header('Idempotency-Key'),
      'content-type': c.req.header('Content-Type'),
    });
  }
  
  await next();
});

// === IDEMPOTENCY ENFORCEMENT MIDDLEWARE ===
// Fail fast if Idempotency-Key header is missing for state-modifying operations
const IDEMPOTENCY_REQUIRED_METHODS = ['POST', 'PUT', 'PATCH', 'DELETE'];
const IDEMPOTENCY_EXEMPT_PATHS = [
  '/api/v1/me/location',
  '/api/v1/me/notifications',
  '/api/v1/me/devices',
];

api.use('/api/v1/*', async (c, next) => {
  const method = c.req.method;
  const path = c.req.path;
  
  // Only require Idempotency-Key for state-changing operations
  if (['POST', 'PUT', 'PATCH', 'DELETE'].includes(method)) {
    // Skip certain non-idempotent operations
    const skipPaths = [
      '/api/v1/me/location',  // Heartbeat - not critical
      '/api/v1/me/notifications',  // Toggle - not idempotent
    ];
    
    if (!skipPaths.some(p => path.includes(p))) {
      const idempotencyKey = c.req.header('Idempotency-Key');
      
      if (!idempotencyKey) {
        console.error('=== IDEMPOTENCY CHECK FAILED ===', {
          method,
          path,
          'x-user-id': c.req.header('X-User-Id'),
          'content-type': c.req.header('Content-Type'),
        });
        
        return c.json(
          {
            error: {
              code: 'IDEMPOTENCY_KEY_REQUIRED',
              message: 'Idempotency-Key header is required for this operation',
              details: {
                method,
                path,
                required: true,
                docs: 'https://docs.neighborgigs.com/api/idempotency',
              },
            },
          },
          400
        );
      }
      
      // Validate idempotency key format (UUID or string)
      if (typeof idempotencyKey !== 'string' || idempotencyKey.trim() === '') {
        return c.json(
          {
            error: {
              code: 'IDEMPOTENCY_KEY_INVALID',
              message: 'Idempotency-Key must be a non-empty string',
            },
          },
          400
        );
      }
      
      // Log successful validation
      console.log('✓ Idempotency-Key validated', {
        method,
        path,
        key: idempotencyKey,
      });
    }
  }
  
  await next();
});

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
  // Use RPC for type-safe user fetch with UUID validation
  const { data: userData, error: userError } = await db.rpc('get_current_user', {
    p_user_id: userId
  });

  if (userError || !userData) {
    console.log('User NOT FOUND', { userId, userError, userData });
    return c.json(errorResponse('NOT_FOUND', 'User not found'), 404);
  }

  // Check for RPC error response
  if (userData.error) {
    return c.json(errorResponse('NOT_FOUND', userData.error.message || 'User not found'), 404);
  }

  // Fetch neighborhood name separately (this is a simple lookup, safe to do here)
  const { data: neighborhoodData, error: neighborhoodError } = await db
    .from('neighborhoods')
    .select('id, name')
    .eq('id', userData.neighborhood_id)
    .single();

  const user = {
    id: userData.id,
    first_name: userData.first_name,
    profile_photo: userData.profile_photo,
    neighborhood: neighborhoodData ? { id: neighborhoodData.id, name: neighborhoodData.name } : null,
    radius_miles: userData.radius_miles,
    last_location: { lat: userData.last_lat, lng: userData.last_lng },
    movement: {
      on_the_move: userData.on_the_move,
      direction: userData.direction,
      expires_at: userData.move_expires_at
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
  const idempotencyKey = c.req.header('Idempotency-Key');

  if (!idempotencyKey) {
    return c.json(errorResponse('VALIDATION_ERROR', 'Idempotency-Key header required'), 400);
  }

  // Use RPC for atomic decline with idempotency
  const { data: result, error } = await db.rpc('decline_request_with_idempotency', {
    p_idempotency_key: idempotencyKey,
    p_request_id: requestId,
    p_helper_id: userId
  });

  if (error) {
    return c.json(errorResponse('INTERNAL_ERROR', 'Failed to decline request'), 500);
  }

  if (result?.error) {
    return c.json(errorResponse(result.error.code || 'NOT_FOUND', result.error.message), 404);
  }

  return c.json({ request: result?.request });
});

// 11b) Cancel Request (requester can cancel their own sent request)
api.post('/api/v1/requests/:requestId/cancel', async (c) => {
  const userId = getUserId(c);
  const requestId = c.req.param('requestId');
  const idempotencyKey = c.req.header('Idempotency-Key');

  if (!idempotencyKey) {
    return c.json(errorResponse('VALIDATION_ERROR', 'Idempotency-Key header required'), 400);
  }

  // Use RPC for atomic cancellation with idempotency
  const { data: result, error } = await db.rpc('cancel_request_with_idempotency', {
    p_idempotency_key: idempotencyKey,
    p_request_id: requestId,
    p_user_id: userId  // Fixed: was p_requester_id
  });

  if (error) {
    return c.json(errorResponse('INTERNAL_ERROR', 'Failed to cancel request'), 500);
  }

  if (result?.error) {
    return c.json(errorResponse(result.error.code || 'NOT_FOUND', result.error.message), 404);
  }

  return c.json({ request: result?.request });
});

// === BROADCAST ENDPOINTS ===

// 17) List Active Broadcasts
api.get('/api/v1/broadcasts', async (c) => {
  const userId = getUserId(c);
  const lat = parseFloat(c.req.query('lat') || '0');
  const lng = parseFloat(c.req.query('lng') || '0');

  console.log('=== LIST BROADCASTS ===', { userId, lat, lng });

  const { data: currentUser } = await db
    .from('users')
    .select('neighborhood_id')
    .eq('id', userId)
    .single();

  if (!currentUser) {
    return c.json(errorResponse('NOT_FOUND', 'User not found'), 404);
  }

  // Use RPC for distance calculation from new broadcasts table
  const { data: broadcasts, error } = await db.rpc('get_broadcasts_with_distance', {
    p_user_lat: lat,
    p_user_lng: lng
  });

  if (error) {
    console.error('RPC failed:', error);
    return c.json(errorResponse('INTERNAL_ERROR', 'Failed to fetch broadcasts'), 500);
  }

  // Format results to match expected structure
  const formattedBroadcasts = (broadcasts || []).map((b: any) => ({
    id: b.id,
    user_id: b.user_id,
    message: b.message,
    offer_usd: b.offer_usd,
    lat: b.lat,
    lng: b.lng,
    location_context: b.location_context,
    created_at: b.created_at,
    distance_miles: b.distance_miles,
    requester: {
      id: b.user_id,
      first_name: b.requester_first_name,
      profile_photo: b.requester_profile_photo
    }
  }));

  console.log('Broadcasts query result:', { count: formattedBroadcasts.length });
  return c.json({ broadcasts: formattedBroadcasts });
});


// 18) Create Broadcast
api.post('/api/v1/broadcasts', async (c) => {
  const userId = getUserId(c);
  const body = await c.req.json();
  const { type, message, expiresInMinutes, lat, lng, offer_usd, idempotency_key } = body;

  console.log('=== CREATE BROADCAST ===', { userId, type, message, expiresInMinutes, lat, lng });

  // Validate type
  if (!['need_help', 'offer_help'].includes(type)) {
    return c.json(errorResponse('VALIDATION_ERROR', 'type must be need_help or offer_help'), 400);
  }

  // Validate message
  if (!message || message.length < 1 || message.length > 280) {
    return c.json(errorResponse('VALIDATION_ERROR', 'message must be 1-280 characters'), 400);
  }

  // Validate expiration
  if (![15, 30, 60, 120].includes(expiresInMinutes)) {
    return c.json(errorResponse('VALIDATION_ERROR', 'expiresInMinutes must be 15, 30, 60, or 120'), 400);
  }

  // Validate location
  if (!lat || typeof lat !== 'number') {
    return c.json(errorResponse('VALIDATION_ERROR', 'lat is required and must be a number'), 400);
  }

  if (!lng || typeof lng !== 'number') {
    return c.json(errorResponse('VALIDATION_ERROR', 'lng is required and must be a number'), 400);
  }

  // Validate offer_usd
  if (typeof offer_usd !== 'number') {
    return c.json(errorResponse('VALIDATION_ERROR', 'offer_usd is required and must be a number'), 400);
  }

  if (offer_usd < 0) {
    return c.json(errorResponse('VALIDATION_ERROR', 'offer_usd must be 0 or positive'), 400);
  }

  // Idempotency key must be provided
  if (!idempotency_key) {
    return c.json(errorResponse('VALIDATION_ERROR', 'idempotency_key is required'), 400);
  }

  const expiresAt = new Date(Date.now() + expiresInMinutes * 60 * 1000).toISOString();

  console.log('Creating broadcast:', { lat, lng, offer_usd });

  // Use canonical RPC for broadcast creation with idempotency
  // Note: location_context is not supported by canonical RPC - will be handled client-side if needed
  const { data, error } = await db.rpc('create_broadcast', {
    p_user_id: userId,
    p_message: message,
    p_price_usd: offer_usd,
    p_lat: lat,
    p_lng: lng,
    p_location_context: 'place_specific', // Default to place_specific for canonical RPC
    p_idempotency_key: idempotency_key
  });

  if (error) {
    // Check for unique constraint violation (duplicate idempotency key)
    if (error.code === '23505') {
      return c.json(errorResponse('CONFLICT', 'Duplicate broadcast - please retry with a new idempotency key'), 409);
    }
    console.error('Failed to create broadcast:', error);
    return c.json(errorResponse('INTERNAL_ERROR', 'Failed to create broadcast'), 500);
  }

  // Add expires_at to the broadcast response since canonical RPC doesn't return it
  if (data?.broadcast) {
    data.broadcast.expires_at = expiresAt;
  }

  return c.json({ broadcast: data?.broadcast, idempotent: data?.idempotent }, 201);
});


// 19) Respond to Broadcast
api.post('/api/v1/broadcasts/:id/respond', async (c) => {
  const userId = getUserId(c);
  const broadcastId = c.req.param('id');
  const body = await c.req.json();
  const { suggested_tip_usd } = body;

  console.log('=== RESPOND TO BROADCAST ===', { broadcastId, userId, suggested_tip_usd });

  // Basic validation
  if (typeof suggested_tip_usd !== 'number' || suggested_tip_usd <= 0) {
    return c.json(errorResponse('VALIDATION_ERROR', 'suggested_tip_usd must be a positive number'), 400);
  }

  // Use RPC for type-safe broadcast response (UUID cast at DB boundary)
  const { data, error } = await db.rpc('respond_to_broadcast', {
    p_broadcast_id: broadcastId,
    p_helper_id: userId,
    p_suggested_tip_usd: suggested_tip_usd
  });

  if (error) {
    console.error('RPC error:', error);
    return c.json(errorResponse('INTERNAL_ERROR', error.message), 500);
  }

  if (data?.error) {
    const errorCode = data.error.code;
    const httpStatus =
      errorCode === 'NOT_FOUND' ? 404 :
      errorCode === 'FORBIDDEN' ? 403 :
      errorCode === 'EXPIRED' ? 409 :
      errorCode === 'CONFLICT' ? 409 : 400;
    return c.json(
      errorResponse(errorCode, data.error.message),
      httpStatus
    );
  }

  return c.json({ request: data.request }, 201);
});

// 20) Delete Broadcast
api.delete('/api/v1/broadcasts/:id', async (c) => {
  const userId = getUserId(c);
  const broadcastId = c.req.param('id');

  console.log('=== DELETE BROADCAST ===', { broadcastId, userId });

  // Use RPC for type-safe broadcast deletion (UUID cast at DB boundary)
  const { data, error } = await db.rpc('delete_broadcast', {
    p_broadcast_id: broadcastId,
    p_user_id: userId
  });

  if (error) {
    console.error('RPC error:', error);
    return c.json(errorResponse('INTERNAL_ERROR', error.message), 500);
  }

  if (data?.error) {
    const errorCode = data.error.code;
    const httpStatus =
      errorCode === 'NOT_FOUND' ? 404 :
      errorCode === 'FORBIDDEN' ? 403 : 400;
    return c.json(
      errorResponse(errorCode, data.error.message),
      httpStatus
    );
  }

  return c.json({ ok: true });
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

// 15) Get Wallet (uses canonical RPC function for derived balances)
api.get('/api/v1/wallet', async (c) => {
  const userId = getUserId(c);

  // Use RPC for derived balances from ledger
  const { data, error } = await db.rpc('get_wallet', { p_user_id: userId });

  if (error) {
    console.error('Wallet RPC error:', error);
    if (error.code === 'PGRST116') {
      // RPC not found - return defaults
      return c.json({ wallet: { available_usd: 0, pending_usd: 0, ledger_usd: 0, held_usd: 0 } });
    }
    return c.json(errorResponse('INTERNAL_ERROR', 'Failed to fetch wallet'), 500);
  }

  return c.json({ wallet: data });
});

// 16) Get Ledger Transactions (renamed from ledger_entries to wallet_transactions)
api.get('/api/v1/wallet/ledger', async (c) => {
  const userId = getUserId(c);
  const limit = parseInt(c.req.query('limit') || '50');
  const cursor = c.req.query('cursor') || null;

  // Use canonical RPC for transaction history
  const { data, error } = await db.rpc('get_wallet_transactions', {
    p_user_id: userId,
    p_limit: limit
  });

  if (error) {
    console.error('Ledger RPC error:', error);
    return c.json(errorResponse('INTERNAL_ERROR', 'Failed to fetch ledger'), 500);
  }

  return c.json({ entries: data || [], next_cursor: null });
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

// Temporary migration endpoint (remove in production)
api.post('/api/v1/admin/migrate-broadcasts', async (c) => {
  console.log('=== MIGRATION: Broadcast Support ===');

  try {
    // Add broadcast columns directly via SQL
    const columnsResult = await db
      .rpc('exec_sql', { 
        sql: `alter table task_requests
          add column if not exists is_broadcast boolean default false,
          add column if not exists broadcast_type text check (broadcast_type in ('need_help', 'offer_help'))`
      });
    
    console.log('Columns result:', columnsResult);

    // Add index
    const indexResult = await db
      .rpc('exec_sql', { 
        sql: `create index if not exists task_requests_broadcast_idx
          on task_requests(is_broadcast, status, expires_at)`
      });
    
    console.log('Index result:', indexResult);

    // Insert demo broadcasts
    const broadcastsResult = await db
      .rpc('exec_sql', { 
        sql: `insert into task_requests (
          id, requester_id, helper_id, message, suggested_tip_usd, status,
          expires_at, is_broadcast, broadcast_type, created_at
        )
        values
          (gen_random_uuid(), '00000000-0000-0000-0000-000000000001', null,
           'Need someone with a truck to help move a couch this afternoon',
           0, 'sent',
           now() + interval '60 minutes',
           true, 'need_help', now() - interval '5 minutes'),
          (gen_random_uuid(), '00000000-0000-0000-0000-000000000002', null,
           'Heading to Home Depot in 30 mins - happy to pick up small items',
           0, 'sent',
           now() + interval '30 minutes',
           true, 'offer_help', now() - interval '2 minutes'),
          (gen_random_uuid(), '00000000-0000-0000-0000-000000000001', null,
           'Dog got loose near downtown! Need help looking for him ASAP',
           0, 'sent',
           now() + interval '120 minutes',
           true, 'need_help', now() - interval '10 minutes'),
          (gen_random_uuid(), '00000000-0000-0000-0000-000000000003', null,
           'Free coffee pickup at Starbucks on 5th Ave! Running there now',
           0, 'sent',
           now() + interval '15 minutes',
           true, 'offer_help', now() - interval '1 minute'),
          (gen_random_uuid(), '00000000-0000-0000-0000-000000000003', null,
           'Need someone to watch my kids for 2 hours while I run errands',
           0, 'sent',
           now() + interval '90 minutes',
           true, 'need_help', now() - interval '20 minutes')
        on conflict do nothing`
      });

    console.log('Broadcasts result:', broadcastsResult);

    console.log('Broadcast migration complete!');
    return c.json({ ok: true, message: 'Broadcast migration applied' });
  } catch (error: any) {
    console.error('Migration error:', error);
    return c.json(errorResponse('INTERNAL_ERROR', error.message), 500);
  }
});

export default api;
