# Decision Note: Applications Table

**Decision Date:** 2026-01-21
**Status:** ✅ FINAL
**Rationale:** Fix philosophy - one canonical model. Explicit is better than implicit.---
**Cross-Reference:** See `Phase_2_INDEX.md` for overview. Schema defined in `2_2_data_model_changes.md` → "Request Applications Table". ERD in `ERD_phase2.md`.
---


---

## The Decision

**Rename:** `applications` → `request_applications`

**Definition:** A helper "applies/bids/offers" on a task request

**Scope:** Phase 2 only (helper bidding on requests)

---

## Schema for `request_applications`

```sql
CREATE TABLE request_applications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

  -- Relationships
  task_request_id UUID NOT NULL REFERENCES task_requests(id) ON DELETE CASCADE,
  helper_user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,

  -- Offer details
  offer_usd DECIMAL(10,2) NOT NULL,
  message TEXT,

  -- State
  status VARCHAR(20) NOT NULL DEFAULT 'pending',
  -- Values: 'pending', 'accepted', 'rejected', 'withdrawn'

  -- Preview support
  is_preview BOOLEAN DEFAULT false,
  submitted_at TIMESTAMP WITH TIME ZONE,
  finalized_at TIMESTAMP WITH TIME ZONE,

  -- Draft support (Phase 2 only)
  status VARCHAR(20) DEFAULT 'draft' CHECK (status IN ('draft', 'submitted', 'accepted', 'rejected', 'withdrawn')),

  -- Constraints
  CONSTRAINT check_valid_offer CHECK (offer_usd > 0),
  CONSTRAINT check_application_not_finalized_in_preview
    CHECK (NOT (is_preview = true AND finalized_at IS NOT NULL))
);

-- Indexes for common queries
CREATE INDEX idx_request_applications_task_request ON request_applications(task_request_id);
CREATE INDEX idx_request_applications_helper ON request_applications(helper_user_id);
CREATE INDEX idx_request_applications_status ON request_applications(status);

-- One application per helper per request (prevents spam)
CREATE UNIQUE INDEX one_application_per_helper_per_request
  ON request_applications(task_request_id, helper_user_id)
  WHERE status NOT IN ('withdrawn', 'rejected');
```

---

## Entity Relationships

```
users
  ├─→ wallets (1:1)
  └─→ task_requests (as requester) [1:N]
  └─→ request_applications (as helper) [1:N]

task_requests
  ├─→ request_applications [1:N]
  └─→ tasks [0:1] (on acceptance)

request_applications
  ├─→ task_requests [N:1]
  └─→ users (helper) [N:1]
```

---

## Phase 1 vs Phase 2

**Phase 1:** Direct request acceptance (no applications)
- Helper sees request
- Accepts directly
- Task created from task_request

**Phase 2:** Bidding applications
- Helper submits application with offer
- Requester chooses from applications
- Accepted application → task creation

---

## Documentation Updates Required

### In `2_2_data_model_changes.md`
- Rename all `applications` → `request_applications`
- Add full schema definition above
- Add relationship documentation

### Add to Core Invariants (Phase 2 extension)
- "Applications represent helper offers on requests"
- "Only one task per task_request, but multiple applications"
- "Accepted application creates task"

---

## Preview Mode Support

```sql
-- Preview applications cannot be finalized
CHECK (NOT (is_preview = true AND finalized_at IS NOT NULL))

-- Preview applications start as draft
DEFAULT 'draft' -- for preview mode

-- Feature flag gate
PREVIEW_ALLOW_APPLICATIONS = true/false
```
