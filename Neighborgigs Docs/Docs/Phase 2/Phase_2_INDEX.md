# Phase 2 — Master Index

**Status:** ✅ Complete  
**Last Updated:** 2026-01-21  
**Scope:** NeighborGigs Phase 2 Documentation

---

## Overview

Phase 2 introduces **controlled interaction** to observe real user behavior **without mutating production state**. This documentation provides canonical guidance for implementation.

---

## Canonical Documents (Read These First)

These documents contain the authoritative source of truth for Phase 2 implementation.

### 1. `2_1_technical_implementation.md` ← **START HERE**
**Purpose:** Complete technical implementation guide covering feature flags, draft persistence, startup validation, transaction boundaries, and error handling.

**Key Topics:**
- Flag precedence (ENV > DB > Code)
- Draft persistence strategy (in-memory by default)
- Startup validation guards
- Transaction boundaries and RPC patterns
- Preview blocking layer

**Related:** See sections below for specific concerns

---

### 2. `2_2_data_model_changes.md`
**Purpose:** Database schema changes and entity relationships for Phase 2.

**Key Topics:**
- Table migrations (preview_settings, preview_events, preview_feedback, drafts)
- Data model for drafts, applications, messages
- Constraints and invariants
- Migration strategy and rollback plan

**Canonical Tables:** `task_requests`, `tasks`, `request_applications`, `drafts`

---

### 3. `2_3_testing_strategy.md`
**Purpose:** Comprehensive testing approach for preview mode.

**Key Topics:**
- Unit tests for DraftService, PreviewBlocker
- Integration tests for complete flows
- E2E tests for blocked actions
- Test coverage goals and fixtures
- CI/CD integration

---

### 4. `2_4_monitoring_analytics.md`
**Purpose:** Metrics framework and monitoring for Phase 2.

**Key Topics:**
- Flow completion metrics
- Blocked actions analytics
- Draft behavior metrics
- Feedback and confusion tracking
- Technical health monitoring
- Phase 3 readiness checklist

---

## Supporting Documents

### Architecture & Patterns

#### `7_Rules_OF_INTEGRATION.md`
**Purpose:** Seven non-negotiable rules for rock-solid system integration.

**Key Rules:**
1. ONE write path per concept (routes never write)
2. Database invariants > application logic
3. Idempotency belongs ONLY at RPC boundary
4. Deterministic keys generated frontend-side
5. Transactions inside RPCs (not routes)
6. [Content truncated - see full file]

---

### Entity Relationships

#### `ERD_phase2.md`
**Purpose:** Entity relationship diagram and canonical table names.

**Key Concepts:**
- `task_requests` = requester posts (canonical)
- `tasks` = active work after acceptance (canonical)
- `jobs` is a **view** or TypeScript DTO (NOT a table)
- Complete relationship diagrams

---

### Decision Records

#### `DECISION_applications_table.md`
**Decision:** Rename `applications` → `request_applications`  
**Status:** ✅ FINAL  
**Rationale:** Fix philosophy - one canonical model. Explicit is better than implicit.

#### `DECISION_canonical_table_names.md`
**Decision:** Keep Phase 1 names forever (`task_requests`, `tasks`)  
**Status:** ✅ FINAL  
**Rationale:** Fix philosophy - one canonical model (names + relationships). Everything else maps to it.

#### `DECISION_draft_persistence.md`
**Decision:** Phase 2 drafts are in-memory by default. Persistence is optional and gated by `DRAFTS_PERSISTED=true`.  
**Status:** ✅ FINAL  
**Rationale:** Fix philosophy - one canonical model, everything else maps to it.

**Note:** This content is now consolidated into `2_1_technical_implementation.md`

---

### Feature Implementation

#### `Account_settings.md`
**Purpose:** Phase 2 Account Settings (Task-Oriented, Preview-Safe)

**Scope:** Users can navigate and understand Account Settings while preventing irreversible or trust-sensitive changes.

#### `Broadcast_task_detail.md`
**Purpose:** Broadcast → Task Details View behavior and UI structure.

**Scope:** Defines the UI and behavior when a user clicks a broadcast. This view is the decision space where users understand the task and choose their next action.

#### `broadcast_response_flow.md`
**Purpose:** Broadcast Response & Acceptance Flow

**Scope:** How users respond to broadcasts and how requesters review and accept those responses.

**Core Concepts:**
- Broadcast response creates a `task_request`
- Each response is scoped to a single broadcast
- The broadcast creator is the requester
- The responder is a potential helper

#### `Multi_user_login.md`
**Purpose:** Phase 2 Multi-User Login (Simulation Mode)

**Status:** Phase 2 — Internal / Preview Only  
**Purpose:** Simulate real multi-user interactions, test broadcasts, responses, and messaging

**🚫 Not production authentication**

#### `offer_tip_model.md`
**Purpose:** Phase 2 Offer & Tip Model (Money Without Escrow)

**Goals:**
- Honor the offer made in Phase 1
- Introduce optional tips (helper appreciation)
- Keep accounting simple
- Avoid escrow, disputes, and chargebacks (for now)

#### `task_types.md`
**Purpose:** Final Phase 2 Broadcast Task Types (Locked at 5)

**Types:**
1. Pickup / Errand
2. Drop-off / Delivery
3. [Content truncated - see full file]

#### `user_messenging.md`
**Purpose:** Scoped User-to-User Messaging

**Core Principle:** Messaging exists to support a task — not to replace decisions.

**Scope Rules:** Messaging threads are scoped to a broadcast or task request. No global inbox in Phase 2.

---

## Archived Documents

Historical documentation moved to `docs/archive/` for reference only.

### `docs/archive/phase2_known_issues.md`
**Original:** `KNOWN_ISSUES_RISKS.md`  
**Contents:** Analysis of migration ordering chaos, critical blockers, and risks before Phase 2 development

**Status:** Archived as historical reference

---

### `docs/archive/phase2_changes_summary.md`
**Original:** `CHANGES_SUMMARY.md`  
**Contents:** List of all changes made to Phase 2 documentation to resolve critical contradictions and gaps

**Status:** Archived as historical reference

---

### `docs/archive/phase2_critical_fixes.md`
**Original:** `PHASE2_CRITICAL_FIXES.md`  
**Contents:** Resolution of 3 critical blockers that blocked Phase 2 development (draft persistence contradiction, flag precedence ambiguity, transaction boundaries)

**Status:** Archived as historical reference

---

## Cross-Reference Guide

### By Concept

#### Flag Management
- **Canonical implementation:** `2_1_technical_implementation.md` → "Flag Precedence"
- **Startup validation:** `2_1_technical_implementation.md` → "Startup Validation"
- **Historical conflicts:** `docs/archive/phase2_critical_fixes.md`

#### Draft Persistence
- **Canonical implementation:** `2_1_technical_implementation.md` → "Draft Persistence Strategy"
- **Decision rationale:** `DECISION_draft_persistence.md` (archived)
- **Schema changes:** `2_2_data_model_changes.md` → "Drafts Table"
- **Safety guards:** `2_1_technical_implementation.md` → "Startup Validation → DRAFTS_PERSISTED Guard"

#### Transaction Boundaries
- **Canonical rules:** `2_1_technical_implementation.md` → "Transaction Boundaries & Data Integrity"
- **Implementation patterns:** `7_Rules_OF_INTEGRATION.md` → "Rule 5"
- **RPC definitions:** `2_1_technical_implementation.md` → "Required RPCs"

#### Data Model
- **Entity relationships:** `ERD_phase2.md`
- **Schema changes:** `2_2_data_model_changes.md`
- **Canonical table names:** `DECISION_canonical_table_names.md`
- **Applications table:** `DECISION_applications_table.md`

#### Testing
- **Complete strategy:** `2_3_testing_strategy.md`
- **Unit tests:** `2_3_testing_strategy.md` → "Unit Testing"
- **Integration tests:** `2_3_testing_strategy.md` → "Integration Testing"
- **E2E tests:** `2_3_testing_strategy.md` → "End-to-End Testing"

#### Monitoring & Analytics
- **Metrics framework:** `2_4_monitoring_analytics.md`
- **Flow completion:** `2_4_monitoring_analytics.md` → "Flow Completion Metrics"
- **Blocked actions:** `2_4_monitoring_analytics.md` → "Blocked Actions Metrics"
- **Dashboard queries:** `2_4_monitoring_analytics.md` → "Daily Monitoring Dashboard"

#### Specific Features
- **Account Settings:** `Account_settings.md`
- **Broadcast Details:** `Broadcast_task_detail.md`
- **Broadcast Responses:** `broadcast_response_flow.md`
- **Multi-User Login:** `Multi_user_login.md`
- **Offer/Tip Model:** `offer_tip_model.md`
- **Task Types:** `task_types.md`
- **User Messaging:** `user_messenging.md`

---

## Quick Start Guide

### For New Developers

1. **Read:** `2_1_technical_implementation.md` (complete guide)
2. **Reference:** `ERD_phase2.md` for data model
3. **Implement:** Follow patterns in `7_Rules_OF_INTEGRATION.md`
4. **Test:** Use strategy in `2_3_testing_strategy.md`
5. **Monitor:** Set up metrics from `2_4_monitoring_analytics.md`

### For Specific Tasks

#### Task: Implement Draft System
1. Read `2_1_technical_implementation.md` → "Draft Persistence Strategy"
2. Check `2_2_data_model_changes.md` → "Drafts Table"
3. Review `2_3_testing_strategy.md` → "Test Draft Service"
4. Implement startup guard from `2_1_technical_implementation.md` → "Startup Validation"

#### Task: Add New Feature Flag
1. Define in `2_1_technical_implementation.md` → "Flag Definitions"
2. Map action in `2_1_technical_implementation.md` → "Action → Flag Mapping"
3. Add to `2_1_technical_implementation.md` → "Startup Validation → Flag Precedence"
4. Update `2_1_technical_implementation.md` → "Flag Precedence → Examples"

#### Task: Add Database Migration
1. Check `2_2_data_model_changes.md` for schema patterns
2. Follow `2_2_data_model_changes.md` → "Migration Strategy"
3. Update `2_2_data_model_changes.md` → "Required Tables"
4. Test with `2_3_testing_strategy.md` patterns

#### Task: Set Up Monitoring
1. Review `2_4_monitoring_analytics.md` → "Key Metrics Framework"
2. Set up alerts from `2_4_monitoring_analytics.md` → "Automated Alerts"
3. Create dashboard from `2_4_monitoring_analytics.md` → "Daily Monitoring Dashboard"
4. Use queries from `2_4_monitoring_analytics.md` → "Query Examples"

---

## Configuration Reference

### Required Environment Variables

| Variable | Required | Default | Purpose |
|----------|----------|---------|---------|
| `DATABASE_URL` | Yes | - | Database connection |
| `PREVIEW_MODE` | No | `false` | Global preview toggle |
| `DRAFTS_PERSISTED` | No | `false` | Draft persistence toggle |
| `PREVIEW_ALLOW_DRAFTS` | No | `true` | Draft creation flag |
| `PREVIEW_ALLOW_PROFILE_EDIT` | No | `true` | Profile edit flag |
| `PREVIEW_ALLOW_FLOW_WALKTHROUGH` | No | `true` | Flow walkthrough flag |
| `PREVIEW_BLOCK_FINALIZE` | No | `true` | Finalization block flag |

### Validation Commands

```bash
npm run validate:startup          # Run all startup checks
npm run validate:drafts-table     # Check drafts table
npm run validate:flags            # Check flag precedence
npm run validate:migrations       # Check migrations
```

### Database Tables

#### Always Required (Phase 2)
- `preview_settings` - Flag configuration
- `preview_events` - Analytics logging
- `preview_feedback` - User feedback
- `request_applications` - Helper applications

#### Conditional
- `drafts` - Only if `DRAFTS_PERSISTED=true`

#### Phase 1 (Already exists)
- `users`
- `wallets`
- `ledger_entries`
- `task_requests`
- `tasks`
- `messages`

---

## Common Patterns

### 1. Feature Flag Resolution
```typescript
const value = await getPreviewFlag('allow_drafts');
// Returns: ENV override > DB setting > Code default
```

### 2. Startup Validation
```typescript
// server.ts
import { runStartupChecks } from './startup';

await runStartupChecks();
// Starts server only if validation passes
```

### 3. Draft Creation
```typescript
const draftService = new DraftService();
const draft = await draftService.createDraft(data);
// In-memory by default, DB if DRAFTS_PERSISTED=true
```

### 4. Preview Blocking
```typescript
const blocker = new PreviewBlocker();
if (blocker.shouldBlock('payment_charge')) {
  throw new PreviewBlockedError('payment_charge');
}
```

### 5. Transaction Boundaries
```typescript
// Routes validate and call RPC
// RPCs handle transactions
// No transactions in routes
```

---

## Deployment Checklist

### Before Phase 2 Deployment

- [ ] All startup checks pass locally
- [ ] Required migrations applied to staging
- [ ] Feature flags configured correctly
- [ ] Test coverage meets targets (see `2_3_testing_strategy.md`)
- [ ] Monitoring dashboards set up (see `2_4_monitoring_analytics.md`)
- [ ] Rollback plan documented (see `2_2_data_model_changes.md`)

### After Phase 2 Deployment

- [ ] Monitor startup logs for validation warnings
- [ ] Check preview mode is disabled initially
- [ ] Verify all blocks work correctly
- [ ] Track metrics from `2_4_monitoring_analytics.md`
- [ ] Collect user feedback
- [ ] Plan Phase 3 based on insights

---

## Glossary

| Term | Definition | Source |
|------|------------|--------|
| **Canonical** | Single source of truth, one authoritative implementation | `2_1_technical_implementation.md` |
| **Preview Mode** | Non-destructive mode where users can explore without committing changes | `2_1_technical_implementation.md` |
| **Draft** | In-progress work that hasn't been submitted or finalized | `2_1_technical_implementation.md` |
| **Dry Run** | Validation without persistence, returns success/error without side effects | `2_1_technical_implementation.md` |
| **Blocked Action** | Action that is allowed in UI but prevented by backend in preview mode | `2_1_technical_implementation.md` |
| **RPC** | Remote Procedure Call - single entry point for state mutations | `2_1_technical_implementation.md` |
| **Route** | HTTP endpoint - validates input, calls RPC, returns result (never writes directly) | `2_1_technical_implementation.md` |
| **DRAFTS_PERSISTED** | Environment variable that controls draft persistence | `2_1_technical_implementation.md` |
| **Startup Validation** | Checks that run on application boot to prevent silent failures | `2_1_technical_implementation.md` |
| **Dead Letter Queue** | Fallback storage for failed preview transactions | `2_1_technical_implementation.md` |

---

## Related Resources

### Phase 1 Documentation
- See `docs/Phase_One/` for Phase 1 implementation

### Phase 3 Planning
- Exit criteria: `Phase_2_scope.md` → "Exit Criteria → Phase 3 Promotion"
- Readiness checklist: `2_4_monitoring_analytics.md` → "Phase 3 Readiness Checklist"

### Architecture Rules
- See `7_Rules_OF_INTEGRATION.md` for integration patterns

---

## Feedback & Updates

**To update documentation:**
1. Identify the canonical document (see this index)
2. Update the relevant section
3. Add cross-reference links if needed
4. Update this index if adding/removing files

**Canonical documents:**
- `2_1_technical_implementation.md` - Technical implementation
- `2_2_data_model_changes.md` - Database schema
- `2_3_testing_strategy.md` - Testing approach
- `2_4_monitoring_analytics.md` - Metrics & monitoring
- `ERD_phase2.md` - Entity relationships
- `7_Rules_OF_INTEGRATION.md` - Integration patterns

**Supporting documents:**
- Feature-specific docs (Account_settings, Broadcast_task_detail, etc.)
- Decision records (DECISION_*.md)
- Archived docs (docs/archive/)

---

**End of Phase 2 Master Index**
