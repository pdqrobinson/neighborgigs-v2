# Decision Note: Draft Persistence Strategy

**Decision Date:** 2026-01-21
**Status:** ✅ FINAL
**Rationale:** Fix philosophy - one canonical model, everything else maps to it.---
**Cross-Reference:** This decision is implemented in `2_1_technical_implementation.md` → "Draft Persistence Strategy"
---


---

## The Decision

**Phase 1:** Drafts are ephemeral (in-memory / local-only)
- Preview should not create server-side state
- Zero migration risk
- Simplest implementation

**Phase 2:** Drafts are persisted (DB) when enabled
- Multi-device support
- Recovery and resumability
- Analytics and learning from draft patterns

---

## Implementation Contract

### Flag Configuration
```typescript
// Phase 2 only
const DRAFTS_PERSISTED = process.env.DRAFTS_PERSISTED === 'true';

// Phase 1 default is false (in-memory)
```

### DraftService Supports Two Backends

**InMemoryDraftStore (Phase 1 default)**
```typescript
class InMemoryDraftStore implements IDraftStore {
  private store = new Map<string, Draft>();
  // In-memory only, lost on restart
}
```

**SupabaseDraftStore (Phase 2 behind DRAFTS_PERSISTED=true)**
```typescript
class SupabaseDraftStore implements IDraftStore {
  async save(draft: Draft): Promise<void> {
    await db.from('drafts').insert(draft);
  }
  // Persisted to database
}
```

**Same Interface, Swapable, Zero App-Level Branching**
```typescript
interface IDraftStore {
  create(data: any): Promise<Draft>;
  get(id: string): Promise<Draft>;
  update(id: string, data: any): Promise<Draft>;
  delete(id: string): Promise<void>;
}

// Factory - no branching in application code
export function createDraftStore(): IDraftStore {
  if (process.env.DRAFTS_PERSISTED === 'true') {
    return new SupabaseDraftStore();
  }
  return new InMemoryDraftStore(); // Phase 1 default
}
```

---

## Documentation Updates Required

### Add to `2_1_technical_implementation.md`
> "Draft persistence is Phase 2 only and is gated behind DRAFTS_PERSISTED=true. When false, drafts are in-memory only."

### Remove from `2_2_data_model_changes.md`
- All draft-related SQL migrations when DRAFTS_PERSISTED=false
- Or wrap migrations in: `DO $$ BEGIN IF $1::boolean THEN ... END IF; $$;`

---

## Benefits

✅ Phase 1: Zero risk, zero migration, zero cleanup
✅ Phase 2: Persistence when needed, feature-flagged rollout
✅ Same code path, same interface, different backend
✅ No "half-built persisted draft tables that nobody uses"
---

## Critical Safety Guard (Required)

At application startup, this check **MUST** run:

```typescript
// startup/validation.ts
if (process.env.DRAFTS_PERSISTED === 'true' && !schema.hasTable('drafts')) {
  throw new Error(
    'DRAFTS_PERSISTED=true but drafts table not present. ' +
    'Run migrations first or set DRAFTS_PERSISTED=false'
  );
}
```

**Why:** This prevents the worst possible failure mode: silent partial persistence.

**Failure Mode Without This Guard:**
1. DRAFTS_PERSISTED=true is set
2. Drafts table doesn't exist (migration not run)
3. Application starts normally
4. User creates drafts
5. Drafts are **lost silently** (no error, no persistence)
6. User thinks they saved work
7. Data loss occurs

**With This Guard:**
1. Application fails to start
2. Error message clearly explains the problem
3. Developer must fix issue before serving traffic
4. No silent failures
5. No data loss

See `STARTUP_VALIDATION.md` for complete startup validation requirements.

---

## Benefits

✅ Phase 1: Zero risk, zero migration, zero cleanup
✅ Phase 2: Persistence when needed, feature-flagged rollout
✅ Same code path, same interface, different backend
✅ No "half-built persisted draft tables that nobody uses"
