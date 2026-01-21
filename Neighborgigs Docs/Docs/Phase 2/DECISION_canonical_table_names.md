# Decision Note: Canonical Table Names

**Decision Date:** 2026-01-21
**Status:** ✅ FINAL
**Rationale:** Fix philosophy - one canonical model (names + relationships). Everything else maps to it.---
**Cross-Reference:** See `Phase_2_INDEX.md` for overview. See `ERD_phase2.md` for complete entity relationships. Schema defined in `2_2_data_model_changes.md`.
---


---

## The Decision

**Option A (CHOSEN):** Keep Phase 1 names forever
- `task_requests` = what requester posts
- `tasks` = what becomes active/assigned after acceptance
- Phase 2 "jobs" is a **view** or **TypeScript DTO**, not a table

**Option B (REJECTED):** Introduce jobs as new table
- Too risky
- Breaks mental model
- Zero benefit

---

## Canonical Names (Non-Negotiable)

```sql
-- Core tables
users                           -- User accounts and profiles
wallets                         -- User wallet records
ledger_entries                  -- Money movements (ledger-first)
task_requests                   -- Requester posts (proposals)
tasks                           -- Active work after acceptance
request_applications            -- Helper applies/bids (optional)
messages                        -- Communication
```

---

## Phase 2 "Jobs" Implementation

### Option 1: Database View (Recommended for queries)
```sql
-- jobs_view combines request + task for convenience
CREATE OR REPLACE VIEW jobs_view AS
SELECT
  tr.id as request_id,
  tr.user_id as requester_id,
  tr.offer_usd,
  tr.status as request_status,
  tr.created_at,
  t.id as task_id,
  t.helper_id,
  t.status as task_status,
  t.completed_at
FROM task_requests tr
LEFT JOIN tasks t ON t.task_request_id = tr.id;
```

### Option 2: TypeScript DTO (Recommended for API)
```typescript
// types/jobs.ts
export interface Job {
  request: TaskRequest;
  task?: Task;
  applications?: RequestApplication[];
}

// API returns unified Job object, but persists to canonical tables
```

---

## Migration Impact

✅ **Zero schema breakage**
✅ **Matches Phase 1 invariants**
✅ **Minimizes migration pain**
✅ **No rename churn**

---

## Documentation Updates Required

### Remove from `2_2_data_model_changes.md`
- All references to `jobs` table
- Replace with `task_requests` and `tasks`

### Update invariants to clarify
- Invariant #7 already correct: "Tasks are created only upon request acceptance"
- No changes needed to core invariants

---

## For Future Reference

**Rule:** Never introduce a new table name without:
1. Clear mapping to existing canonical names
2. ERD update showing relationships
3. Migration plan if renaming existing tables
4. Invariant update if affecting core entities
