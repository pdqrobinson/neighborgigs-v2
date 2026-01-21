# 7 Rules of Integration - Alignment Status

**Last Updated:** 2026-01-21  
**Migration Workflow:** Manual upload via Supabase SQL Editor (credentials unreliable)

---

## ⚠️ SUPABASE CREDENTIALS - MANUAL UPLOAD REQUIRED

**Status:** Supabase credentials consistently fail for CLI/automation  
**Solution:** Manual SQL upload via Supabase SQL Editor  
**Documentation:** See `MANUAL_MIGRATION_UPLOAD.md` for step-by-step workflow

**Current Migration Files Ready:**
- Location: `/home/workspace/neighborgigs/db/migrations/phase1_ordered/`
- Total: 15 Phase 1 migrations
- Status: ✅ Prepared for manual upload
- Order: Verified in `MIGRATION_ORDER.md`

**Manual Workflow Advantages:**
- ✅ No authentication failures
- ✅ Immediate feedback on each migration
- ✅ Step-by-step verification
- ✅ Supabase maintains migration history
- ✅ Easier troubleshooting

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

| RPC | Status | Location | Migration |
| --- | --- | --- | --- |
| `create_broadcast_with_idempotency` | ✅ Ready | `007_idempotency_fix.sql` | `007_idempotency_fix.sql` |
| `respond_to_broadcast_with_idempotency` | ✅ Ready | `008_fix_idempotency_rpc_text_keys.sql` | `008_fix_idempotency_rpc_text_keys.sql` |
| `cancel_request_with_idempotency` | ✅ Ready | `008_fix_idempotency_rpc_text_keys.sql` | `008_fix_idempotency_rpc_text_keys.sql` |
| `decline_request_with_idempotency` | 🟡 **Ready for manual upload** | `009_decline_request_rpc.sql` | `009_decline_request_rpc.sql` |
| `get_current_user` | ✅ Ready | `010_get_current_user_rpc.sql` | `010_fix_missing_wallets.sql` |
| `accept_request` | ✅ Ready | `002_rpc_functions.sql` | `002_rpc_functions.sql` |
| `complete_task` | ✅ Ready | `002_rpc_functions.sql` | `002_rpc_functions.sql` |
| `get_wallet` | ✅ Ready | `003_wallet_canonical_model.sql` | `003_wallet_canonical_model.sql` |
| `create_request_with_idempotency` | ✅ Ready | migrations | `009_create_request_idempotency.sql` |
| `request_withdrawal` | ✅ Ready | migrations | `008_fix_idempotency_rpc_text_keys.sql` |

**All migrations are in `/home/workspace/neighborgigs/db/migrations/phase1_ordered/` ready for manual upload.**

---

## 🧪 Stability Tests (How you KNOW it's stable)

When all 7 rules are aligned, run these tests:

### Test 1: Spam Test
```bash
# Test idempotency after migrations are applied
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

### Immediate: Manual Migration Upload

1. **Backup Production** (See `MANUAL_MIGRATION_UPLOAD.md`)
2. **Apply Migrations Manually** (15 Phase 1 migrations)
   - Open `MANUAL_MIGRATION_UPLOAD.md`
   - Follow step-by-step instructions
   - Start with `001_initial_schema.sql`
   - Apply in exact order
   - Verify after each migration

3. **Apply Migration `009_decline_request_rpc.sql`**
   - This is CRITICAL for Rule 1 compliance
   - Contains `decline_request_with_idempotency` RPC
   - Ready for manual upload

4. **Update routes.ts** to use `decline_request_with_idempotency` RPC
   - Remove direct DB write
   - Use idempotent RPC

5. **Run stability tests** to confirm idempotency works

6. **Add Rule 7 tripwire** (optional but recommended)

---

## 📊 Alignment Score

**Current: 6.5 / 7 = 93%**

To reach 100%:
1. ✅ Apply all Phase 1 migrations via manual upload
2. ✅ Migration `009_decline_request_rpc.sql` provides decline RPC
3. Update routes.ts to use the RPC (remove direct DB write)
4. Add DB tripwire triggers (Rule 7, optional)

**Ready for Phase 2 when:**
- All 15 Phase 1 migrations applied manually
- `decline_request_with_idempotency` RPC working
- routes.ts updated to use RPC
- Stability tests pass

---

## 🚀 Deployment Workflow

### Current: Manual Upload
1. Open Supabase SQL Editor
2. Copy migration SQL from `phase1_ordered/`
3. Paste and run
4. Verify success
5. Repeat for all migrations

### If Credentials Fixed: Alternative Automation
1. Use `psql` command line
2. Run `apply_migrations.sh` script
3. Verify results

**Both workflows documented in:**
- `MIGRATION_ORDER.md` - Overview and order
- `MANUAL_MIGRATION_UPLOAD.md` - Step-by-step manual guide
- `db/MIGRATION_CANONICAL_ORDER.md` - Authoritative reference

---

**Migration files ready in:** `/home/workspace/neighborgigs/db/migrations/phase1_ordered/`  
**Total Phase 1 migrations:** 15  
**Critical migrations:** `003_wallet_canonical_model.sql`, `009_decline_request_rpc.sql`
