# Phase 2 Critical Fixes - Implementation Guide

**Date:** 2026-01-20  
**Status:** ✅ FINAL - Ready for Development

---

## Overview

This document consolidates the **3 critical blockers** that must be resolved before Phase 2 development begins. Everything else is secondary.

---

## 🔴 Blocker 1: Draft Persistence Contradiction

### The Problem

Your documentation had contradictory statements:

| Document | Statement |
|----------|-----------|
| `2_1_technical_implementation.md` | "Phase 2 drafts are strictly in-memory." |
| `DECISION_draft_persistence.md` | "Drafts are persisted when DRAFTS_PERSISTED=true." |

**Result:** Developers implemented opposite behaviors, causing bugs.

### The Fix (Canonical Rule)

**"Drafts are in-memory by default. Persistence is optional and gated by `DRAFTS_PERSISTED=true`."**

### What Changed

#### 1. Updated `2_1_technical_implementation.md`

**Before:**
```markdown
> **Phase 2 drafts are strictly in-memory.**\
> They are **not persisted** and **never touch production tables**.
```

**After:**
```markdown
**Drafts are in-memory by default. Persistence is optional and gated by `DRAFTS_PERSISTED=true`.**

### Critical Safety Guard

At application startup, this check **MUST** run:

```typescript
if (process.env.DRAFTS_PERSISTED === 'true' && !schema.hasTable('drafts')) {
  throw new Error(
    'DRAFTS_PERSISTED=true but drafts table not present. ' +
    'Run migrations first or set DRAFTS_PERSISTED=false'
  );
}
```
```

#### 2. Updated `2_2_data_model_changes.md`

**Before:**
```markdown
| Persistence | In-memory (Phase 1) OR DB (Phase 2, if DRAFTS_PERSISTED=true) |

> **Note:** Draft persistence is Phase 2 only...
```

**After:**
```markdown
| Persistence | In-memory (default) OR DB (if DRAFTS_PERSISTED=true) |

**Critical Rule:** Drafts are in-memory by default. Persistence is optional and gated by `DRAFTS_PERSISTED=true`.
```

#### 3. Updated `DECISION_draft_persistence.md`

Added the **Critical Safety Guard** section with the startup check requirement.

### Implementation Code

```typescript
// services/draftService.ts
export class DraftService {
  private get store(): IDraftStore {
    return process.env.DRAFTS_PERSISTED === 'true' 
      ? new SupabaseDraftStore()
      : new InMemoryDraftStore();
  }
  
  async createDraft<T>(data: Partial<T>): Promise<Draft<T>> {
    return this.store.create(data);
  }
}

// InMemoryDraftStore (default)
class InMemoryDraftStore implements IDraftStore {
  private store = new Map<string, Draft>();
  // Zero migration risk
}

// SupabaseDraftStore (optional)
class SupabaseDraftStore implements IDraftStore {
  async create(draft: Draft): Promise<Draft> {
    await db.drafts.insert(draft);
  }
}
```

### Testing Strategy

```typescript
// Test Suite 1: DRAFTS_PERSISTED=false (default)
test('drafts are in-memory', async () => {
  const draft = await draftService.createDraft({ title: 'Test' });
  expect(draft.id).toBeDefined();
  // No DB write occurred
  expect(db.drafts.insert).not.toHaveBeenCalled();
});

// Test Suite 2: DRAFTS_PERSISTED=true
test('drafts persist to DB', async () => {
  process.env.DRAFTS_PERSISTED = 'true';
  
  const draft = await draftService.createDraft({ title: 'Test' });
  expect(draft.id).toBeDefined();
  // DB write occurred
  expect(db.drafts.insert).toHaveBeenCalledWith(
    expect.objectContaining({ title: 'Test' })
  );
});

// Test Suite 3: Safety Guard
test('startup fails when DRAFTS_PERSISTED=true but table missing', async () => {
  process.env.DRAFTS_PERSISTED = 'true';
  schema.hasTable.mockResolvedValue(false);
  
  await expect(startupChecks()).rejects.toThrow(
    'DRAFTS_PERSISTED=true but drafts table not present'
  );
});
```

### Why This Fix Is Correct

✅ **No contradictions** - One clear rule  
✅ **Safe by default** - In-memory = zero risk  
✅ **Explicit opt-in** - Persistence is intentional  
✅ **Fail-fast** - Startup guard prevents silent failures  
✅ **No data loss** - Errors before write attempts

---

## 🔴 Blocker 2: Flag Precedence Ambiguity

### The Problem

Three layers of configuration with no clear hierarchy:

1. ENV variables (`PREVIEW_MODE=true`)
2. DB settings (`preview_settings` table)
3. Code defaults (`PREVIEW_FLAGS`)

**Result:** Undefined behavior when layers conflict.

### The Fix (Canonical Precedence)

**ENV > DB > Code. Always. No exceptions.**

### What Changed

#### 1. Updated `2_1_technical_implementation.md`

**Added new section: "Flag Precedence (Canonical)"**

```markdown
## Flag Precedence (Canonical)

**ENV – highest priority, requires deploy/restart**  
**DB – runtime override / hotfix**  
**Code defaults – fallback only**  

No exceptions. No "usually." No hand-waving.

### Single Source of Truth: getPreviewFlag()

```typescript
export async function getPreviewFlag(name: string): Promise<boolean> {
  // ENV overrides everything
  const envVar = process.env[`PREVIEW_${name.toUpperCase()}`];
  if (envVar !== undefined) {
    return envVar === 'true';
  }
  
  // DB setting (requires connection)
  try {
    const dbValue = await db.preview_settings.get(name);
    if (dbValue !== null) {
      return dbValue === 'true';
    }
  } catch (e) {
    // Continue to code default if DB fails
  }
  
  // Code default
  return PREVIEW_FLAGS_DEFAULTS[name] ?? false;
}
```
```

#### 2. Updated `STARTUP_VALIDATION.md`

Added `validateFlagPrecedence()` function that:
- Checks ENV vs DB conflicts
- Logs warnings (doesn't crash)
- Provides clear resolution guidance

### Decision Matrix

| ENV | DB | Code | Result | Reason |
|-----|----|------|--------|--------|
| `true` | `false` | `false` | **ON** | ENV wins |
| (not set) | `true` | `false` | **ON** | DB overrides code |
| (not set) | (not set) | `true` | **ON** | Code default |
| `false` | `true` | `true` | **OFF** | ENV wins |

### Common Scenarios

#### Scenario A: Feature Rollout (Correct)

```bash
# 1. Update ENV (requires deploy)
# .env.production
PREVIEW_MODE=true

# 2. Deploy
npm run deploy

# 3. No DB changes needed
# Result: ENV=true, DB=false, Code=true → ON
```

#### Scenario B: Emergency Hotfix (Correct)

```bash
# 1. Update DB (no deploy)
UPDATE preview_settings SET value = 'false' WHERE key = 'preview_allow_drafts';

# 2. Verify ENV is NOT set
# Check: env | grep PREVIEW_ALLOW_DRAFTS
# Should return nothing

# 3. Result: ENV=undefined, DB=false, Code=true → OFF
```

#### Scenario C: Conflict (Detected at Startup)

**Logs:**
```
============================================================
[PREVIEW] FLAG CONFLICT DETECTED
============================================================
[PREVIEW] Flag conflict for "allow_drafts": ENV=true, DB=false. ENV takes precedence.
[PREVIEW] Flag conflict for "block_finalize": ENV=false, DB=true. ENV takes precedence.

Resolution: ENV variables always win. Update DB to match ENV.
============================================================
```

**Fix:**
```sql
-- Update DB to match ENV
UPDATE preview_settings SET value = 'true' WHERE key = 'allow_drafts';
UPDATE preview_settings SET value = 'false' WHERE key = 'block_finalize';
```

### Why This Fix Is Correct

✅ **Unambiguous** - Clear hierarchy always applies  
✅ **Safe** - ENV (intentional) > DB (mutable) > Code (safe)  
✅ **Debuggable** - Startup warnings show conflicts  
✅ **Production-grade** - Used by major systems (Kubernetes, AWS, etc.)  
✅ **No surprises** - Predictable behavior at runtime

---

## 🔴 Blocker 3: Transaction Boundaries Undefined

### The Problem

Docs say "Transactions live in RPCs" but:
- No RPCs defined
- No isolation levels
- No retry logic
- No preview rollback semantics

**Result:** Developers create inconsistent transaction patterns.

### The Fix (Canonical Rules)

1. **All state mutations happen inside RPCs**
2. **Routes never open transactions**
3. **Default: READ COMMITTED, 2 retries, DB timeout**
4. **Preview mode: mutations must roll back fully**

### What Changed

#### Added to `2_1_technical_implementation.md`

### Section 9: Transaction Boundaries & Data Integrity

```markdown
## 9. Transaction Boundaries & Data Integrity

### Canonical Rule

**All state mutations happen inside RPCs. Routes never open transactions.**

### Required RPCs (Complete List)

| RPC | Purpose | Transaction Required |
|-----|---------|---------------------|
| `rpc.create_draft` | Create draft | Yes (in-memory: no-op) |
| `rpc.update_draft` | Update draft | Yes (in-memory: no-op) |
| `rpc.submit_preview` | Dry-run | Yes (read-only) |
| `rpc.log_preview_event` | Analytics | No (best-effort) |
| `rpc.submit_feedback` | Feedback | Yes (low priority) |

### Default Transaction Policy

**Isolation Level:** `READ COMMITTED`  
**Retries:** 2 retries on serialization failure  
**Timeout:** DB default (30s)  
**Preview Mode:** Mutations must roll back fully

### Transaction Implementation Pattern

```typescript
// services/rpc.ts
export async function create_draftRPC(data: any): Promise<RPCResult> {
  const transactionRequired = process.env.DRAFTS_PERSISTED === 'true';
  
  if (!transactionRequired) {
    // In-memory: no transaction needed
    return { success: true, data: await draftService.createDraft(data) };
  }
  
  // DB-backed: use transaction with retries
  const maxRetries = 2;
  let lastError;
  
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      const result = await db.transaction(async (tx) => {
        const draft = await tx.drafts.insert({
          ...data,
          is_preview: true,
          status: 'draft',
        });
        
        await tx.preview_events.insert({
          event_name: '[draft_create]',
          draft_id: draft.id,
        });
        
        return draft;
      });
      
      return { success: true, data: result };
    } catch (error) {
      lastError = error;
      
      if (error.code === '40001' && attempt < maxRetries) {
        await sleep(100 * (attempt + 1));
        continue;
      }
      
      throw error;
    }
  }
  
  throw lastError;
}
```

### Route Handler Pattern (No Transactions)

```typescript
// routes/preview.ts
app.post('/api/preview/drafts', async (c) => {
  // 1. Validate input (no DB access)
  const data = await c.req.json();
  
  // 2. Check feature flag
  if (!await getPreviewFlag('allow_drafts')) {
    return c.json({ error: 'Drafts not allowed' }, 403);
  }
  
  // 3. Call RPC (transaction happens inside)
  const result = await rpc.create_draftRPC(data);
  
  // 4. Return result
  return c.json(result);
});
```

### Preview Mode Rollback Semantics

When `PREVIEW_MODE=true`:

1. **Roll back fully** on error (no partial state)
2. **Not write to production tables** (even if flag allows)
3. **Log to preview_events only** (separate table)
4. **Return success to user** (don't expose DB errors)

```typescript
async function previewMutation() {
  if (process.env.PREVIEW_MODE === 'true') {
    const errors = validateDraft(data);
    if (errors.length > 0) {
      return { success: false, errors };
    }
    return { success: true, dry_run: true }; // No DB write
  }
  
  // Production: real mutation
  return await rpc.create_draftRPC(data);
}
```

### Dead Letter Queue (DLQ)

```typescript
// services/dlq.ts
export async function handleFailedTransaction(error: Error, context: any) {
  try {
    await db.dlq.insert({ error: error.message, context });
  } catch (dlqError) {
    console.warn('DLQ write failed:', dlqError);
  }
  
  return {
    success: false,
    userMessage: 'Preview mode temporarily unavailable.',
    retry: true,
  };
}
```

**Canonical Rule:** Transactions live in RPCs. Routes are dumb pipes. Preview mutations roll back fully.
```

### Testing Strategy

```typescript
// Test 1: Route doesn't open transactions
test('route handler calls RPC, not db.transaction', async () => {
  const response = await request(app)
    .post('/api/preview/drafts')
    .send({ title: 'Test' });
  
  // Verify route didn't open transaction
  expect(db.transaction).not.toHaveBeenCalled();
  
  // Verify RPC was called
  expect(rpc.create_draftRPC).toHaveBeenCalled();
});

// Test 2: RPC uses transaction when DRAFTS_PERSISTED=true
test('RPC opens transaction for persisted drafts', async () => {
  process.env.DRAFTS_PERSISTED = 'true';
  
  await rpc.create_draftRPC({ title: 'Test' });
  
  // Verify transaction was used
  expect(db.transaction).toHaveBeenCalled();
});

// Test 3: Transaction retries on serialization failure
test('RPC retries on serialization error', async () => {
  process.env.DRAFTS_PERSISTED = 'true';
  
  // First 2 calls fail with serialization error
  db.transaction.mockRejectedValueOnce({ code: '40001' });
  db.transaction.mockRejectedValueOnce({ code: '40001' });
  db.transaction.mockResolvedValueOnce({ id: 'draft-1' });
  
  const result = await rpc.create_draftRPC({ title: 'Test' });
  
  // Should have succeeded after retries
  expect(result.success).toBe(true);
  expect(db.transaction).toHaveBeenCalledTimes(3);
});

// Test 4: Preview mode rolls back fully
test('preview mode mutations don\'t write to production', async () => {
  process.env.PREVIEW_MODE = 'true';
  
  const result = await previewMutation({ title: 'Test' });
  
  // Returns success but doesn't write
  expect(result.success).toBe(true);
  expect(result.dry_run).toBe(true);
  expect(db.task_requests.insert).not.toHaveBeenCalled();
});
```

### Why This Fix Is Correct

✅ **Clear boundaries** - Routes vs RPCs vs DB  
✅ **Consistent patterns** - One way to handle transactions  
✅ **Production-ready** - Retries, DLQ, error handling  
✅ **Safe for preview** - Explicit rollback semantics  
✅ **Testable** - Each layer can be tested independently

---

## Implementation Roadmap

### Phase 1: Update Documentation (1-2 days)

**Priority Order:**

1. **Update `2_1_technical_implementation.md`**
   - Fix draft persistence section
   - Add flag precedence section
   - Add transaction boundaries section

2. **Update `2_2_data_model_changes.md`**
   - Fix draft persistence rule
   - Add missing columns (created_at, session_id, user_id)
   - Remove duplicates

3. **Create New Documents**
   - `STARTUP_VALIDATION.md` - All startup guards
   - `FLAG_CONFLICT_RESOLUTION.md` - Flag precedence guide
   - `PHASE2_CRITICAL_FIXES.md` - This document

### Phase 2: Code Implementation (2-3 days)

**For each critical fix:**

1. **Draft Persistence Fix**
   ```bash
   # 1. Add startup guard
   # File: startup/validation.ts
   # Function: validateDraftsTable()
   
   # 2. Update DraftService
   # File: services/draftService.ts
   # Support: InMemoryDraftStore + SupabaseDraftStore
   
   # 3. Add validation script
   # File: scripts/validate-drafts-table.ts
   # Command: npm run validate:drafts-table
   ```

2. **Flag Precedence Fix**
   ```bash
   # 1. Add getPreviewFlag() helper
   # File: flags/preview.ts
   
   # 2. Add startup validation
   # File: startup/validation.ts
   # Function: validateFlagPrecedence()
   
   # 3. Update all flag reads
   # Replace: process.env.PREVIEW_* 
   # With: await getPreviewFlag('*')
   ```

3. **Transaction Boundaries Fix**
   ```bash
   # 1. Create RPC functions
   # File: services/rpc.ts
   # Functions: create_draftRPC, update_draftRPC, etc.
   
   # 2. Update routes
   # File: routes/preview.ts
   # Change: Remove db.transaction() calls
   # Add: Call RPC functions instead
   
   # 3. Add DLQ service
   # File: services/dlq.ts
   ```

### Phase 3: Testing (1-2 days)

**Test Matrix:**
- [ ] DRAFTS_PERSISTED=false (default)
- [ ] DRAFTS_PERSISTED=true
- [ ] Flag precedence (all combinations)
- [ ] Transaction retries
- [ ] Preview mode rollback
- [ ] Concurrent draft edits
- [ ] Startup validation failures

**Test Commands:**
```bash
# Run all tests
npm test

# Run specific test suites
npm test -- --testPathPattern="flags"
npm test -- --testPathPattern="drafts"
npm test -- --testPathPattern="rpc"

# Run startup validation
npm run validate:startup
```

### Phase 4: Deployment (Ongoing)

**Deployment Checklist:**
- [ ] All startup checks pass locally
- [ ] All tests pass in CI/CD
- [ ] No flag conflicts in staging
- [ ] Migrations applied successfully
- [ ] Error tracking configured
- [ ] Monitoring dashboards updated
- [ ] Rollback procedure tested

**Post-Deployment:**
- [ ] Check logs for startup warnings
- [ ] Verify preview mode disabled initially
- [ ] Monitor error rates
- [ ] Run smoke tests
- [ ] Review flag conflicts (if any)

---

## Success Criteria

### Draft Persistence Fix ✅

- [x] Single source of truth for draft behavior
- [x] Startup guard prevents silent failures
- [x] In-memory by default, persisted only when enabled
- [x] Clear documentation with no contradictions
- [x] Test coverage for both storage backends

### Flag Precedence Fix ✅

- [x] Clear hierarchy: ENV > DB > Code
- [x] Single helper function for all flag reads
- [x] Startup validation warns on conflicts
- [x] Decision matrix documented
- [x] All scenarios covered with examples
- [x] Emergency procedures defined

### Transaction Boundaries Fix ✅

- [x] RPCs defined for all mutations
- [x] Routes never open transactions
- [x] Retry logic specified (2 retries, serialization errors)
- [x] Preview mode rollback semantics defined
- [x] DLQ for failed transactions
- [x] Testable patterns for each layer

---

## Common Pitfalls (Avoid These)

### ❌ Pitfall 1: Using ENV Directly

**Wrong:**
```typescript
if (process.env.PREVIEW_ALLOW_DRAFTS === 'true') {
  // Bypasses DB and code defaults
  // No conflict warnings
}
```

**Right:**
```typescript
const allowDrafts = await getPreviewFlag('allow_drafts');
if (allowDrafts) {
  // Consistent, validated, warned-on conflicts
}
```

### ❌ Pitfall 2: Forgetting Startup Guards

**Wrong:**
```typescript
// No validation at startup
// Silent failures possible
```

**Right:**
```typescript
// startup/validation.ts
await validateDraftsTable();
await validateFlagPrecedence();
await validateRequiredTables();
```

### ❌ Pitfall 3: Transactions in Routes

**Wrong:**
```typescript
app.post('/api/drafts', async (c) => {
  const result = await db.transaction(async (tx) => {
    return await tx.drafts.insert(data);
  });
  return result;
});
```

**Right:**
```typescript
app.post('/api/drafts', async (c) => {
  const result = await rpc.create_draftRPC(data);
  return result;
});
```

---

## Quick Reference

### File Changes Summary

| File | Change | Priority |
|------|--------|----------|
| `2_1_technical_implementation.md` | Fix 3 sections | P0 |
| `2_2_data_model_changes.md` | Fix schema | P0 |
| `DECISION_draft_persistence.md` | Add safety guard | P1 |
| `STARTUP_VALIDATION.md` | New document | P1 |
| `FLAG_CONFLICT_RESOLUTION.md` | New document | P1 |
| `PHASE2_CRITICAL_FIXES.md` | New document | P2 |

### Code Changes Summary

| Component | Change | Priority |
|-----------|--------|----------|
| `startup/validation.ts` | Add 3 validators | P0 |
| `flags/preview.ts` | Add getPreviewFlag() | P0 |
| `services/draftService.ts` | Support dual backends | P0 |
| `services/rpc.ts` | Create RPC functions | P0 |
| `routes/preview.ts` | Use RPCs, not DB | P1 |
| `services/dlq.ts` | Add DLQ service | P1 |

### Test Changes Summary

| Test Type | File | Change |
|-----------|------|--------|
| Unit | `flags/preview.test.ts` | Test precedence |
| Unit | `draftService.test.ts` | Test both backends |
| Unit | `rpc.test.ts` | Test retries |
| Integration | `startup.test.ts` | Test all validators |
| Integration | `routes.test.ts` | Test RPC usage |
| E2E | `preview.test.ts` | Test full flows |

---

## Next Steps

### Immediate (Before Development)

1. **Review this document** with team
2. **Approve the 3 critical fixes**
3. **Update documentation** (2 days)
4. **Create implementation tickets** (1 day)

### During Development

5. **Implement code changes** (3 days)
6. **Write tests** (2 days)
7. **Run validation scripts** (1 day)
8. **Deploy to staging** (1 day)

### After Development

9. **Alpha testing** (1 week)
10. **Beta rollout** (2-3 weeks)
11. **Full Phase 2 launch** (1 week)
12. **Phase 3 planning** (1 week)

---

## Questions & Answers

### Q: Why ENV > DB > Code?

**A:** This is the industry standard for configuration management:
- ENV: Version-controlled, intentional, audit trail
- DB: Runtime flexibility, but riskier
- Code: Safe defaults, can't change at runtime

### Q: What if I need to change a flag in production?

**A:** Two options:
1. **DB change** (immediate, no deploy) - Use admin API
2. **ENV change** (requires deploy) - Use deployment pipeline

### Q: What happens if DRAFTS_PERSISTED=true but table missing?

**A:** Application **fails to start** with clear error message:
```
DRAFTS_PERSISTED=true but drafts table not present.
Run migrations first or set DRAFTS_PERSISTED=false
```

### Q: What about concurrency in draft edits?

**A:** Not covered in Phase 2. Handle in Phase 3 with optimistic locking.

### Q: What about performance with in-memory drafts?

**A:** Phase 2 is for learning, not scale. Optimize performance in Phase 3 if needed.

---

## Final Checklist

Before starting Phase 2 development, verify:

- [ ] All 3 critical blockers documented
- [ ] No contradictions in Phase 2 docs
- [ ] Startup validation documented
- [ ] Flag precedence matrix created
- [ ] Transaction boundaries defined
- [ ] RPCs enumerated
- [ ] Test strategy updated
- [ ] Rollback procedures defined
- [ ] Team alignment achieved

**Ready to start development?** ✅

---

## Support

**Questions about these fixes:**
- Review: `STARTUP_VALIDATION.md`
- Review: `FLAG_CONFLICT_RESOLUTION.md`
- Review: `PHASE2_CRITICAL_FIXES.md`

**Need help implementing:**
- Check: Example code in each document
- Run: `npm run validate:startup` to see current state
- Ask: Team lead for architecture review
