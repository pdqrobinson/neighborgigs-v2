# 7 Rules of Integration - Alignment Status

**Last Updated:** 2026-01-20

---

## ✅ Completed (Aligned)

| Rule | Status | Implementation |
| --- | --- | --- |
| **Rule 1**: ONE write path per concept | 🟡 **95%** | Almost all writes through RPCs. See gaps below. |
| **Rule 2**: Database invariants | ✅ Complete | `007_idempotency_fix.sql` applied: unique indexes for broadcast/tasks/payments |
| **Rule 3**: Idempotency at RPC boundary | ✅ Complete | No more Supabase `Idempotency-Key` header usage. Keys pass via body as `idempotency_key: text` |
| **Rule 4**: Deterministic keys (frontend) | ✅ Complete | `Home.tsx`, `ActiveTask.tsx`, `RequestHelp.tsx` all generate deterministic keys |
| **Rule 5**: Transactions inside RPCs | ✅ Complete | All RPCs use atomic transactions with proper exception handling |
| **Rule 6**: One source of truth | ✅ Complete | Ledger = money source, DB = timestamps, no frontend math |
| **Rule 7**: DB tripwire (optional) | ⚪ Not applied | Optional enforcement trigger not yet added |

---

## 🔍 Rule 1 Gaps (Direct DB Writes Remaining)

The following endpoints still violate Rule 1 by using direct `.update()` or `.insert()`:

### 1. Decline Request
**Location:** `src/backend/routes.ts:479`
**Issue:** Uses direct `db.from('task_requests').update({ status: 'declined' })`
**Fix Required:** Convert to RPC `decline_request_with_idempotency`

**Current Code:**
```typescript
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
    return c.json(errorResponse('NOT_FOUND', 'Request not found or you are not helper'), 404);
  }

  return c.json({ request: data });
});
```

**Should Be:**
```typescript
api.post('/api/v1/requests/:requestId/decline', async (c) => {
  const userId = getUserId(c);
  const requestId = c.req.param('requestId');
  const body = await c.req.json();
  const { idempotency_key } = body;

  const { data: result, error } = await db.rpc('decline_request_with_idempotency', {
    p_idempotency_key: idempotency_key || `decline:${requestId}:${userId}`,
    p_request_id: requestId,
    p_helper_id: userId
  });

  if (error) {
    return c.json(errorResponse('INTERNAL_ERROR', error.message), 500);
  }

  if (result?.error) {
    return c.json(errorResponse(result.error.code, result.error.message), 409);
  }

  return c.json(result);
});
```

---

## 📋 RPC Inventory (All RPC Functions)

| RPC | Status | Location |
| --- | --- | --- |
| `create_broadcast_with_idempotency` | ✅ Active | `007_idempotency_fix.sql` |
| `respond_to_broadcast_with_idempotency` | ✅ Active | `008_fix_idempotency_rpc_text_keys.sql` |
| `cancel_request_with_idempotency` | ✅ Active | `008_fix_idempotency_rpc_text_keys.sql` |
| `decline_request_with_idempotency` | 🟡 **Created, not applied** | `009_decline_request_rpc.sql` |
| `accept_request` | ✅ Active | `002_rpc_functions.sql` |
| `complete_task` | ✅ Active | `002_rpc_functions.sql` |
| `get_wallet` | ✅ Active | `003_wallet_canonical_model.sql` |
| `create_request_with_idempotency` | ✅ Active | migrations |
| `request_withdrawal` | ✅ Active | migrations |

---

## 🧪 Stability Tests (How you KNOW it's stable)

When all 7 rules are aligned, run these tests:

### Test 1: Spam Test
```bash
curl -X POST http://localhost:50430/api/v1/broadcasts \
  -H "X-User-Id: 00000000-0000-0000-0000-000000000001" \
  -H "Content-Type: application/json" \
  -d '{"type":"need_help","message":"Spam test","expiresInMinutes":60,"idempotency_key":"test:spam"}' \
  && \
curl -X POST http://localhost:50430/api/v1/broadcasts \
  -H "X-User-Id: 00000000-0000-0000-0000-000000000001" \
  -H "Content-Type: application/json" \
  -d '{"type":"need_help","message":"Spam test","expiresInMinutes":60,"idempotency_key":"test:spam"}'

# Expected: Same broadcast ID both times, second returns 200 (not 201)
```

### Test 2: Network Retry
```bash
# Kill request mid-flight, then retry with same key
# Expected: Same broadcast ID, idempotent: true
```

### Test 3: Race Test (Two helpers respond)
```bash
# Simulate two simultaneous responses to same broadcast
# Expected: One task created, one gets conflict error
```

### Test 4: Money Test
```bash
# Retry completion endpoint
# Expected: One ledger entry per task, no double payout
```

---

## 🎯 Next Steps

1. **Apply Migration `009_decline_request_rpc.sql`** to Supabase
2. **Update routes.ts** to use `decline_request_with_idempotency` RPC
3. **Run stability tests** to confirm idempotency works
4. **Add Rule 7 tripwire** (optional but recommended)

---

## 📊 Alignment Score

**Current: 6.5 / 7 = 93%**

To reach 100%:
- Fix decline request RPC (Rule 1)
- Add DB tripwire triggers (Rule 7)
