# Phase 2 Entity Relationship Diagram
## Single Source of Truth

**Last Updated:** 2026-01-21  
**Status:** ✅ Final

---

## Canonical Table Names

| Table | Purpose | Phase 1 | Phase 2 |
|--------|---------|----------|----------|
| `users` | User accounts | ✅ | ✅ |
| `wallets` | User wallet records | ✅ | ✅ |
| `ledger_entries` | Money movements (ledger-first) | ✅ | ✅ |
| `task_requests` | Requester posts (proposals) | ✅ | ✅ |
| `tasks` | Active work after acceptance | ✅ | ✅ |
| `request_applications` | Helper applies/bids on requests | ❌ | ✅ |
| `messages` | Communication | ✅ | ✅ |

### Important
- `gigs` is a **view** or **TypeScript DTO**, NOT a table
- See `gigs_view` definition below

---

## Entity Relationships

```
┌─────────────────────────────────────────────────────────────────┐
│                        USERS                                │
│  id, email, first_name, profile_photo, location_lat/lng    │
│  created_at, updated_at, is_preview_profile                 │
└─────┬─────────────────────────────┬───────────────────────┘
      │                             │
      │ (wallet holder)              │ (requester)
      │                             │
      ▼                             ▼
┌─────────────────────────┐   ┌────────────────────────────────────┐
│       WALLETS          │   │         TASK_REQUESTS            │
│  id, user_id          │◄──┤  id, user_id (requester)       │
│  balance_usd          │   │  type, title, description        │
│  pending_usd          │   │  offer_usd, location_lat/lng    │
│  created_at, updated_at│   │  status, expires_at             │
└─────┬─────────────────┘   │  is_preview (Phase 2)          │
      │                     │  parent_draft_id (Phase 2)        │
      │                     │  submitted_at, finalized_at       │
      │                     └────────────┬─────────────────────┘
      │                                  │
      │                                  │ (optional)
      │                                  ▼
      │                     ┌────────────────────────────────────┐
      │                     │      REQUEST_APPLICATIONS        │
      │                     │  id, task_request_id            │
      │                     │  helper_user_id                 │
      │                     │  offer_usd, message             │
      │                     │  status (draft/submitted/...)   │
      │                     │  is_preview, submitted_at        │
      │                     └────────────┬─────────────────────┘
      │                                  │
      │                                  │ (helper)
      │                                  └─────────────────────┐
      │                                                        │
      │                                                        │
      │ (task worker)                                            │ (helper)
      ▼                                                         ▼
┌─────────────────────────┐                         ┌─────────────────────────┐
│        TASKS           │                         │      MESSAGES           │
│  id, task_request_id  │◄────────────────────────┤  id, sender_id          │
│  helper_user_id       │                         │  receiver_id            │
│  status               │                         │  task_request_id (opt)  │
│  completed_at         │                         │  task_id (opt)         │
│  proof_photo_url      │                         │  content               │
└─────┬─────────────────┘                         │  status, sent_at        │
      │                                         └─────────────────────────┘
      │
      │
      ▼
┌─────────────────────────┐
│     LEDGER_ENTRIES     │
│  id, wallet_id        │◄──────────────────────────┐
│  task_id (opt)        │                          │
│  amount_usd           │                          │
│  type                 │                          │
│  description          │                          │
│  created_at           │                          │
└─────────────────────────┘                          │
                                                    │
                                                    │
                      ┌───────────────────────────────┘
                      │
                      ▼
          ┌─────────────────────────────┐
          │   DRAFTS (Phase 2 only)   │
          │   IF DRAFTS_PERSISTED      │
          │   id, entity_type          │
          │   entity_id, user_id       │
          │   draft_data (JSONB)       │
          │   is_preview, created_at    │
          └─────────────────────────────┘
```

---

## Relationship Details

### One-to-One Relationships
| From | To | Notes |
|------|-----|-------|
| `users` | `wallets` | Each user has one wallet |
| `task_requests` | `tasks` | One task per accepted request (Invariant #5) |

### One-to-Many Relationships
| From | To | Notes |
|------|-----|-------|
| `users` | `task_requests` | Requester can post multiple requests (sets offer_usd) |
| `users` | `request_applications` | Helper can apply to multiple requests (sets offer_usd in bid) |
| `task_requests` | `request_applications` | Multiple applications per request (each with their own offer_usd) |
| `users` | `tasks` | Helper can complete multiple tasks (one at a time) |
| `wallets` | `ledger_entries` | All money movements tracked |
| `users` | `messages` | User sends/receives messages |

### Many-to-Many Relationships
| Tables | Junction | Notes |
|--------|-----------|-------|
| `users` | `messages` | Sender/receiver in messages table |

---

## Views

### gigs_view (Convenience View)
```sql
-- Combines request + task for "gig" concept
CREATE OR REPLACE VIEW gigs_view AS
SELECT
  tr.id as request_id,
  tr.user_id as requester_id,
  tr.offer_usd,
  tr.status as request_status,
  tr.created_at as request_created_at,
  tr.expires_at,
  t.id as task_id,
  t.helper_id,
  t.status as task_status,
  t.completed_at
FROM task_requests tr
LEFT JOIN tasks t ON t.task_request_id = tr.id;
```

---

## State Transitions

### task_requests
```
draft → active → completed OR cancelled
        ↓
      expired
```

### tasks
```
accepted → in_progress → completed
```

### request_applications (Phase 2)
```
draft → submitted → accepted OR rejected OR withdrawn
```

### ledger_entries
- Types: `deposit`, `withdrawal`, `task_payment`, `task_earnings`, `tip`
- One-way insert (never updated, only new entries)

---

## Indexes (Performance)

```sql
-- Users
CREATE INDEX idx_users_location ON users USING GIST (point(location_lng, location_lat));
CREATE INDEX idx_users_on_the_move ON users(on_the_move, expires_at) WHERE on_the_move = true;

-- Task Requests
CREATE INDEX idx_task_requests_status ON task_requests(status, created_at);
CREATE INDEX idx_task_requests_expires ON task_requests(expires_at) WHERE status = 'active';

-- Tasks
CREATE INDEX idx_tasks_helper ON tasks(helper_id, status) WHERE status IN ('accepted', 'in_progress');
CREATE UNIQUE INDEX one_active_task_per_helper
  ON tasks(helper_id) WHERE status IN ('accepted', 'in_progress');

-- Request Applications
CREATE INDEX idx_request_applications_request ON request_applications(task_request_id);
CREATE INDEX idx_request_applications_helper ON request_applications(helper_user_id);
CREATE INDEX idx_request_applications_status ON request_applications(status);

-- Ledger
CREATE INDEX idx_ledger_wallet ON ledger_entries(wallet_id, created_at DESC);

-- Messages
CREATE INDEX idx_messages_thread ON messages(GREATEST(sender_id, receiver_id), LEAST(sender_id, receiver_id), created_at);
```

---

## Constraints (Safety)

```sql
-- One task per request
CREATE UNIQUE INDEX one_task_per_request
  ON tasks(task_request_id) WHERE status IS NOT NULL;

-- One payout per task
CREATE UNIQUE INDEX one_offer_payout_per_task
  ON ledger_entries(task_request_id) WHERE type = 'task_earnings';

-- Positive amounts
ALTER TABLE ledger_entries ADD CONSTRAINT check_positive_amount CHECK (amount_usd > 0);

-- Valid offer range (Phase 1: $5-$50; Phase 2: allow $0 offers)
-- Note: offer_usd represents the upfront offer amount, not a tip
-- Tips are added later in Phase 2 after task completion via tip_usd column
ALTER TABLE task_requests ADD CONSTRAINT check_offer_range CHECK (offer_usd >= 0 AND offer_usd <= 50);

-- Allow $0 offers in request_applications (Phase 2)
-- Application offer_usd is the helper's proposed offer amount
ALTER TABLE request_applications ADD CONSTRAINT check_valid_offer CHECK (offer_usd >= 0);

-- Preview: cannot finalize
ALTER TABLE task_requests ADD CONSTRAINT check_preview_not_finalized
  CHECK (NOT (is_preview = true AND finalized_at IS NOT NULL));

-- Preview: cannot send payments
ALTER TABLE payments ADD CONSTRAINT check_no_preview_payments CHECK (is_preview = false);
```

---

## Phase 2 Only Tables

| Table | Purpose | Behind Flag |
|-------|---------|-------------|
| `drafts` | Persisted drafts (if DRAFTS_PERSISTED=true) | DRAFTS_PERSISTED |
| `preview_events` | Analytics for preview sessions | PREVIEW_ANALYTICS_ENABLED |
| `preview_feedback` | In-context feedback from preview users | PREVIEW_FEEDBACK_ENABLED |
| `draft_history` | Track draft modifications | DRAFTS_PERSISTED |
| `preview_settings` | Runtime preview configuration | Built-in |

---

## Canonical Source Rule

> **This ERD is the single source of truth for Phase 2 entity relationships.**
>
> If code, docs, or migrations disagree with this ERD:
> 1. Update the conflicting source
> 2. Do NOT modify this ERD
> 3. If modification needed, document as separate decision note

**Last Modified:** 2026-01-21
**Next Review:** Before Phase 2 implementation begins
