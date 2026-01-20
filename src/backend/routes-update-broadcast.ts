// Partial routes.ts update - Broadcast endpoints with location support
// This section replaces the broadcast endpoint section in routes.ts

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

  // Try using RPC for distance calculation
  const { data: broadcasts, error } = await db.rpc('get_broadcasts_with_distance', {
    p_user_lat: lat,
    p_user_lng: lng
  });

  if (error) {
    console.error('RPC failed, falling back to direct query:', error);
    // Fallback to direct query if RPC doesn't exist yet
    const { data: fallback, error: fallbackError } = await db
      .from('task_requests')
      .select(`
        *,
        requester:users!task_requests_requester_id_fkey (
          id,
          first_name,
          profile_photo
        )
      `)
      .eq('is_broadcast', true)
      .eq('status', 'sent')
      .gt('expires_at', new Date().toISOString())
      .order('created_at', { ascending: false });

    if (fallbackError) {
      return c.json(errorResponse('INTERNAL_ERROR', 'Failed to fetch broadcasts'), 500);
    }

    return c.json({ broadcasts: fallback || [] });
  }

  // Format RPC results to match expected structure
  const formattedBroadcasts = (broadcasts || []).map((b: any) => ({
    id: b.id,
    requester_id: b.requester_id,
    broadcast_type: b.broadcast_type,
    message: b.message,
    suggested_tip_usd: b.suggested_tip_usd,
    status: b.status,
    is_broadcast: true,
    created_at: b.created_at,
    expires_at: b.expires_at,
    broadcast_lat: b.broadcast_lat,
    broadcast_lng: b.broadcast_lng,
    location_context: b.location_context,
    place_name: b.place_name,
    place_address: b.place_address,
    distance_miles: b.distance_miles,
    requester: {
      id: b.requester_id,
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
  const { type, message, expiresInMinutes, lat, lng, location_context, place_name, place_address } = body;

  console.log('=== CREATE BROADCAST ===', { userId, type, message, expiresInMinutes, lat, lng, location_context });

  if (!['need_help', 'offer_help'].includes(type)) {
    return c.json(errorResponse('VALIDATION_ERROR', 'type must be need_help or offer_help'), 400);
  }

  if (!message || message.length < 1 || message.length > 280) {
    return c.json(errorResponse('VALIDATION_ERROR', 'message must be 1-280 characters'), 400);
  }

  if (![15, 30, 60, 120].includes(expiresInMinutes)) {
    return c.json(errorResponse('VALIDATION_ERROR', 'expiresInMinutes must be 15, 30, 60, or 120'), 400);
  }

  // Validate location context
  if (!lat || typeof lat !== 'number') {
    return c.json(errorResponse('VALIDATION_ERROR', 'lat is required and must be a number'), 400);
  }

  if (!lng || typeof lng !== 'number') {
    return c.json(errorResponse('VALIDATION_ERROR', 'lng is required and must be a number'), 400);
  }

  if (!['here_now', 'heading_to', 'coming_from', 'place_specific'].includes(location_context)) {
    return c.json(errorResponse('VALIDATION_ERROR', 'location_context must be one of: here_now, heading_to, coming_from, place_specific'), 400);
  }

  const expiresAt = new Date(Date.now() + expiresInMinutes * 60 * 1000).toISOString();

  console.log('Inserting broadcast with location:', { lat, lng, location_context, place_name, place_address });

  const { data, error } = await db
    .from('task_requests')
    .insert({
      id: crypto.randomUUID(),
      requester_id: userId,
      helper_id: null,
      message,
      suggested_tip_usd: 0,
      status: 'sent',
      expires_at: expiresAt,
      is_broadcast: true,
      broadcast_type: type,
      broadcast_lat: lat,
      broadcast_lng: lng,
      location_context,
      place_name: place_name || null,
      place_address: place_address || null
    })
    .select()
    .single();

  if (error) {
    console.error('Failed to create broadcast:', error);
    return c.json(errorResponse('INTERNAL_ERROR', 'Failed to create broadcast'), 500);
  }

  return c.json({ broadcast: data }, 201);
});
