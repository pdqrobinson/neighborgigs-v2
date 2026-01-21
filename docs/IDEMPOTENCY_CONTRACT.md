# Idempotency Contract

**Status**: ✅ ENFORCED  
**Applies to**: All production APIs  
**Document owner**: Senior Backend Engineer  
**Last updated**: 2025-01-21

---

## Overview

This document defines the permanent contract for Idempotency-Key handling in NeighborGigs. This contract is **non-negotiable** and applies to all state-modifying operations.

## The Contract

### 1. Client Responsibility

**Every state-modifying request MUST include the `Idempotency-Key` header.**

```http
POST /api/v1/broadcasts
Content-Type: application/json
X-User-Id: 00000000-0000-0000-0000-000000000001
Idempotency-Key: broadcast:create:00000000-0000-0000-0000-000000000001:offer_help:Going to Store:60:40.7128:-74.0060:10

{
  "type": "offer_help",
  "message": "Going to Store",
  "expiresInMinutes": 60,
  "lat": 40.7128,
  "lng": -74.0060,
  "offer_usd": 10
}
```

### 2. Server Enforcement

**The server MUST fail fast with HTTP 400 if the header is missing.**

**Error Response:**
```json
{
  "error": {
    "code": "IDEMPOTENCY_KEY_REQUIRED",
    "message": "Idempotency-Key header is required for this operation",
    "details": {
      "method": "POST",
      "path": "/api/v1/broadcasts",
      "required": true,
      "docs": "https://docs.neighborgigs.com/api/idempotency"
    }
  }
}
```

### 3. Idempotency Key Format

**Format**: `{operation}:{user_id}:{input_hash}`

**Examples:**
- `broadcast:create:00000000-0000-0000-0000-000000000001:offer_help:Going to Store:60:40.7128:-74.0060:10`
- `withdrawal:00000000-0000-0000-0000-000000000001:25.00`
- `request:cancel:abcd-1234-5678:00000000-0000-0000-0000-000000000001`

**Properties:**
- Deterministic for retries (same key for same operation)
- Contains all inputs that affect the outcome
- Validated at API layer (string, non-empty)

### 4. Database Enforcement

**Table**: `idempotency_keys`
- Tracks all idempotent operations across the system
- Unique constraint on `(user_id, key, operation, endpoint)`
- Serves as backstop if app-layer checks fail

**Columns:**
- `id`: UUID (primary key)
- `key`: TEXT (idempotency key from client)
- `user_id`: UUID (references users)
- `operation`: TEXT (e.g., 'create_broadcast', 'create_withdrawal')
- `endpoint`: TEXT (e.g., '/api/v1/broadcasts')
- `created_at`: TIMESTAMP

### 5. RPC Functions

All idempotent operations use RPC functions that:

1. **Check for existing key** before operation
2. **Return existing result** if key exists (idempotent)
3. **Reject duplicates** within 30-second window
4. **Record key** in database after success

**Example RPC (broadcast):**
```sql
create or replace function create_broadcast_with_idempotency_v2(
  p_idempotency_key text,
  p_user_id uuid,
  p_broadcast_type text,
  p_message text,
  p_expires_minutes int,
  p_lat numeric,
  p_lng numeric,
  p_location_context text,
  p_place_name text,
  p_place_address text,
  p_price_usd numeric default 0
)
returns json
language plpgsql
as $$
begin
  -- Check for existing key
  if exists (
    select 1 from task_requests
    where idempotency_key = p_idempotency_key
      and requester_id = p_user_id
  ) then
    -- Return existing (idempotent)
    return jsonb_build_object('idempotent', true, ...);
  end if;
  
  -- Check for duplicate within 30 seconds
  if exists (
    select 1 from task_requests
    where requester_id = p_user_id
      and broadcast_type = p_broadcast_type
      and message = p_message
      and created_at > now() - interval '30 seconds'
  ) then
    -- Return duplicate error
    return jsonb_build_object('error', jsonb_build_object(
      'code', 'DUPLICATE',
      'message', 'Duplicate detected.'
    ));
  end if;
  
  -- Create record
  insert into task_requests (...) values (...);
  
  -- Record idempotency
  perform record_idempotency_key(...);
  
  return jsonb_build_object('idempotent', false, ...);
end;
$$;
```

## Operations Requiring Idempotency-Key

### ✅ REQUIRED (State-Modifying)

| Operation | Endpoint | Method | Idempotency Key Required |
|-----------|----------|--------|--------------------------|
| Create Broadcast | `/api/v1/broadcasts` | POST | ✅ |
| Respond to Broadcast | `/api/v1/broadcasts/:id/respond` | POST | ✅ |
| Create Request | `/api/v1/requests` | POST | ✅ |
| Accept Request | `/api/v1/requests/:id/accept` | POST | ✅ |
| Decline Request | `/api/v1/requests/:id/decline` | POST | ✅ |
| Cancel Request | `/api/v1/requests/:id/cancel` | POST | ✅ |
| Start Task | `/api/v1/tasks/:id/start` | POST | ✅ |
| Complete Task | `/api/v1/tasks/:id/complete` | POST | ✅ |
| Request Withdrawal | `/api/v1/wallet/withdrawals` | POST | ✅ |
| Update Profile | `/api/v1/me/profile` | PATCH | ✅ |
| Update Neighborhood | `/api/v1/me/neighborhood` | POST | ✅ |

### ❌ NOT REQUIRED (Non-Idempotent/Heartbeat)

| Operation | Endpoint | Method | Reason |
|-----------|----------|--------|--------|
| Update Location | `/api/v1/me/location` | PATCH | Heartbeat - not critical |
| Update Notifications | `/api/v1/me/notifications` | PATCH | Toggle - not idempotent |
| Register Device | `/api/v1/me/devices` | POST | Device-specific |

## Infrastructure Requirements

### Development (Vite Proxy)

**vite.config.ts:**
```typescript
proxy: {
  '/api': {
    target: 'http://localhost:50430',
    changeOrigin: true,
    configure: (proxy) => {
      proxy.on('proxyReq', (proxyReq, req) => {
        console.log('Proxying:', {
          method: req.method,
          headers: req.headers, // Must include Idempotency-Key
        });
      });
    },
  },
},
cors: {
  allowedHeaders: [
    'Idempotency-Key',
    'X-User-Id',
    'Content-Type',
    'Authorization',
  ],
  exposedHeaders: ['Idempotency-Key'],
},
```

### Production (CORS)

**Must include:**
```
Access-Control-Allow-Headers: Idempotency-Key, X-User-Id, Content-Type
Access-Control-Expose-Headers: Idempotency-Key
Access-Control-Allow-Methods: POST, PUT, PATCH, DELETE, OPTIONS
```

### Proxy/Load Balancer

**Must forward:**
- `Idempotency-Key` header (case-sensitive)
- `X-User-Id` header
- All custom headers

**Common Issues:**
- **Nginx**: Add `proxy_set_header Idempotency-Key $http_idempotency_key;`
- **Cloudflare**: Enable "Preserve all headers"
- **Vercel**: Ensure custom headers are not stripped

## Testing

### Integration Tests

**test/idempotency.test.ts:**
```typescript
import { api } from '../src/lib/api-client';

describe('Idempotency Contract', () => {
  test('POST without Idempotency-Key fails with 400', async () => {
    // This should fail at the API layer
    await expect(
      fetch('/api/v1/broadcasts', {
        method: 'POST',
        headers: { 'X-User-Id': '...' }, // No Idempotency-Key
        body: JSON.stringify({ ... })
      })
    ).rejects.toThrow('Idempotency-Key header required');
  });

  test('Retries with same key return same result (idempotent)', async () => {
    const key = 'test:key:12345';
    
    // First request
    const result1 = await api.createBroadcast(...);
    
    // Retry with same key
    const result2 = await api.createBroadcast(...);
    
    // Should be identical
    expect(result1.broadcast.id).toBe(result2.broadcast.id);
    expect(result2.idempotent).toBe(true);
  });

  test('Different keys for same operation create duplicates', async () => {
    const key1 = 'test:key:11111';
    const key2 = 'test:key:22222';
    
    // First request
    const result1 = await api.createBroadcast(...);
    
    // Second request with different key
    const result2 = await api.createBroadcast(...);
    
    // Should create new record
    expect(result1.broadcast.id).not.toBe(result2.broadcast.id);
    expect(result2.idempotent).toBe(false);
  });
});
```

### Manual Testing

**Using curl:**
```bash
# Without Idempotency-Key (should fail)
curl -X POST http://localhost:50430/api/v1/broadcasts \
  -H "Content-Type: application/json" \
  -H "X-User-Id: 00000000-0000-0000-0000-000000000001" \
  -d '{"type":"offer_help","message":"Test","expiresInMinutes":60,"lat":40.7128,"lng":-74.0060,"offer_usd":10}'

# With Idempotency-Key (should succeed)
curl -X POST http://localhost:50430/api/v1/broadcasts \
  -H "Content-Type: application/json" \
  -H "X-User-Id: 00000000-0000-0000-0000-000000000001" \
  -H "Idempotency-Key: broadcast:create:12345" \
  -d '{"type":"offer_help","message":"Test","expiresInMinutes":60,"lat":40.7128,"lng":-74.0060,"offer_usd":10}'

# Retry with same key (should return existing)
curl -X POST http://localhost:50430/api/v1/broadcasts \
  -H "Content-Type: application/json" \
  -H "X-User-Id: 00000000-0000-0000-0000-000000000001" \
  -H "Idempotency-Key: broadcast:create:12345" \
  -d '{"type":"offer_help","message":"Test","expiresInMinutes":60,"lat":40.7128,"lng":-74.0060,"offer_usd":10}'
```

## Failure Modes & Recovery

### Scenario 1: Client Retries Without Key

**Problem**: Client fails to send Idempotency-Key on retry  
**Recovery**: API returns 400 with clear error message  
**Action**: Client must generate and send key

### Scenario 2: Proxy Drops Header

**Problem**: Infrastructure strips custom headers  
**Recovery**: Verify proxy configuration, add custom header forwarding  
**Detection**: Development logs show missing headers

### Scenario 3: Database Insert Fails

**Problem**: Concurrent duplicate inserts  
**Recovery**: Unique constraint on `(user_id, key, operation, endpoint)`  
**Action**: Retry with same key (idempotent RPC handles this)

### Scenario 4: Client Generates Duplicate Key

**Problem**: Same key for different operations  
**Recovery**: RPC checks operation + endpoint combination  
**Action**: Client must generate unique keys per operation

## Migration Path

### Phase 1: Enforce at API Layer
✅ Middleware added to check Idempotency-Key header  
✅ Logging added for debugging  
✅ Error responses standardized

### Phase 2: Update All Clients
✅ API client updated to send header  
✅ Frontend components updated  
✅ Tests added for idempotency

### Phase 3: Database Enforcement
✅ Global idempotency tracking table  
✅ RPC functions updated to use text keys  
✅ Unique constraints in place

### Phase 4: Infrastructure Hardening
✅ Vite proxy configured to forward headers  
✅ CORS configured to allow Idempotency-Key  
✅ Production proxy configured

## Common Pitfalls

### ❌ Mistake 1: Generating Keys Server-Side

**Bad:**
```typescript
// Don't do this
const key = crypto.randomUUID(); // Generated on server
```

**Good:**
```typescript
// Do this - client generates deterministic key
const key = generateKey(['broadcast:create', userId, type, message]);
```

### ❌ Mistake 2: Passing Key in Body

**Bad:**
```json
{
  "idempotency_key": "12345",
  "message": "..."
}
```

**Good:**
```http
Idempotency-Key: 12345
```

### ❌ Mistake 3: Making Key Optional

**Bad:**
```typescript
const key = c.req.header('Idempotency-Key') || generateKey(); // Fallback
```

**Good:**
```typescript
const key = c.req.header('Idempotency-Key');
if (!key) {
  return c.json({ error: { code: 'IDEMPOTENCY_KEY_REQUIRED' } }, 400);
}
```

### ❌ Mistake 4: Not Logging When Headers Are Missing

**Bad:**
```typescript
// Silent failure - no debug info
if (!key) { return c.json({ error: 'Missing key' }); }
```

**Good:**
```typescript
console.error('IDEMPOTENCY CHECK FAILED', {
  method: req.method,
  path: req.path,
  headers: Object.fromEntries(req.headers.entries()),
});
```

## Reference Implementation

### Complete Middleware (routes.ts)

```typescript
// === IDEMPOTENCY ENFORCEMENT MIDDLEWARE ===
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
  if (IDEMPOTENCY_REQUIRED_METHODS.includes(method)) {
    // Skip certain non-idempotent operations
    if (!IDEMPOTENCY_EXEMPT_PATHS.some(p => path.includes(p))) {
      const idempotencyKey = c.req.header('Idempotency-Key');
      
      if (!idempotencyKey) {
        console.error('=== IDEMPOTENCY CHECK FAILED ===', {
          method,
          path,
          headers: Object.fromEntries(c.req.headers.entries()),
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
      
      console.log('✓ Idempotency-Key validated', {
        method,
        path,
        key: idempotencyKey,
      });
    }
  }
  
  await next();
});
```

### Client Implementation (api-client.ts)

```typescript
// Helper: Generate deterministic idempotency key
function generateKey(parts: string[]): string {
  return parts.join(':');
}

// Example: Create Broadcast
createBroadcast: (type, message, expiresInMinutes, location, offerUsd) => {
  const idempotencyKey = generateKey([
    'broadcast:create',
    DEMO_USER_ID,
    type,
    message,
    String(expiresInMinutes),
    String(location.lat),
    String(location.lng),
    String(offerUsd)
  ]);

  return apiFetch('/broadcasts', {
    method: 'POST',
    headers: {
      'Idempotency-Key': idempotencyKey,
    },
    body: JSON.stringify({ type, message, expiresInMinutes, ... }),
  });
}
```

## Monitoring & Debugging

### What to Log

**Development:**
```typescript
console.log('=== REQUEST HEADERS ===', {
  method,
  path,
  headers: Object.fromEntries(c.req.headers.entries()),
});
```

**Production:**
- Log missing Idempotency-Key attempts
- Log idempotent responses (reuse of key)
- Log duplicate detection

### Error Codes

| Code | HTTP Status | Meaning | Resolution |
|------|-------------|---------|------------|
| `IDEMPOTENCY_KEY_REQUIRED` | 400 | Header missing | Add header to request |
| `IDEMPOTENCY_KEY_INVALID` | 400 | Invalid format | Use non-empty string |
| `DUPLICATE` | 409 | Duplicate within 30s | Retry with new key or wait |
| `IDEMPOTENT` | 200 | Reused key | Success (no side effects) |

## References

- **Stripe Idempotency Keys**: https://stripe.com/docs/api/idempotent-requests
- **PostgreSQL Idempotency**: https://www.postgresql.org/docs/current/indexes-unique.html
- **HTTP Idempotency**: https://tools.ietf.org/html/rfc7231#section-4.2.2

---

## ✅ Checklist Before Deployment

- [ ] All POST/PUT/PATCH/DELETE endpoints require Idempotency-Key
- [ ] Idempotency-Key is validated and logged
- [ ] CORS allows `Idempotency-Key` header
- [ ] Proxy forwards custom headers
- [ ] API client generates deterministic keys
- [ ] Database has unique constraints
- [ ] RPC functions handle idempotency
- [ ] Tests pass for missing key, retries, and duplicates
- [ ] Documentation updated
- [ ] Team briefed on contract
