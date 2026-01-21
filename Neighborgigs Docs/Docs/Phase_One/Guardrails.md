# NeighborGigs — Guardrails & Decision Rules

## Purpose

This document defines **non-negotiable guardrails** that govern how the NeighborGigs application is designed and built in **Phase One**.

Its purpose is to:

- Prevent scope creep

- Prevent “helpful but incorrect” AI behavior

- Enforce core invariants

- Preserve product clarity

Any suggestion, implementation, or refactor that violates these rules **must be rejected**.

---

## 1. Phase One Scope Lock

### The system is restricted to Phase One only.

- No Phase Two features

- No future-proofing

- No “easy to add later” logic

- No speculative abstractions

**Rule:**\
If a suggestion expands scope beyond Phase One, it is invalid.

---

## 2. Screen Surface Lock

- Only screens defined in the Phase One screen list may exist

- No additional screens, tabs, or flows

- New behavior must reuse existing screens or modals

**Rule:**\
If a feature requires a new screen, it does not belong in Phase One.

---

## 3. Database Structure Lock

- Only the approved Phase One tables may exist

- No new tables

- No polymorphic “future” tables

- No schema redesigns

Allowed tables:

- neighborhoods

- users

- wallets

- ledger_entries

- tasks

- task_requests

**Rule:**\
If a feature requires a new table, it must be rejected.

---

## 4. Core Invariant Enforcement

All implementations must respect the Core Invariants document.

Violations include (but are not limited to):

- Cross-neighborhood visibility

- Global search or discovery

- Multiple active tasks per helper

- Inferred or implicit state

- Fake or synthetic activity

**Rule:**\
If a proposal violates any core invariant, it must not ship.

---

## 5. Explicit State Requirement

All state must be:

- Explicitly stored

- Explicitly transitioned

- Explicitly expired

Forbidden patterns:

- Deriving state from timestamps alone

- Inferring availability

- Assuming user intent

- Auto-correcting state silently

**Rule:**\
If state is not stored, it does not exist.

---

## 6. Task State Machine Lock

Tasks may only exist in the following states:

- requested

- accepted

- in_progress

- completed

Allowed transitions only:

- requested → accepted

- accepted → in_progress

- in_progress → completed

No skipping states.\
No backward transitions.

**Rule:**\
If a transition is not explicitly defined, it is invalid.

---

## 7. Helper Concurrency Rule

- A helper may complete many tasks over time

- A helper may only have **one active task at a time**

Active states:

- accepted

- in_progress

**Rule:**\
If a helper already has an active task, new accepts must be blocked.

---

## 8. Map-First Rule

- The map is the source of truth

- List/grid views mirror the map exactly

- No hidden or additional results

**Rule:**\
If data is visible anywhere, it must exist on the map.

---

## 9. Movement-Based Availability

- Only users actively “on the move” may appear as helpers

- Visibility is time-bound and expires

- No static availability

**Rule:**\
If a user is not on the move, they are invisible.

---

## 10. Honest Emptiness

- Empty maps are valid

- Empty lists are valid

- No fake pins or demo padding beyond seeded demo users

**Rule:**\
Never invent activity to improve appearance.

---

## 11. Wallet & Money Guardrails

- All value changes must be ledgered

- Wallet balances are derived, not authoritative

- No external payments in Phase One

- No balance mutation without ledger entry

**Rule:**\
If money changes and there is no ledger entry, the change is invalid.

---

## 12. Demo Authentication Rules

- Authentication is stubbed using a predefined Supabase user
- No login UI
- No auth flows
- No attempts to “complete” auth
- Supabase Auth is not used in Phase One

**Rule:**\
Demo auth is intentional and must not be altered.

---

## 13. Backend API as Single Authority (LOCKED)

Phase One has exactly one system that mutates state: the backend API.

- All state updates occur via backend API calls
- API validates invariants
- API writes database state
- API writes ledger entries
- API triggers notifications directly
- Backend cron jobs expire state

**Rule:**\
No other system may infer, orchestrate, or repair state.

This single rule prevents 90% of future mistakes.

---

## 14. Error-First Behavior

When uncertainty occurs:

- Fail visibly

- Preserve state

- Do not auto-resolve silently

Examples:


- Expired move → clear state


- Failed wallet update → retry or alert

- Conflicting task state → block action

**Rule:**\
Never “fix” user data silently.

---

## 15. Simplicity Override Rule

When multiple implementation options exist:

> **Choose the simpler, more explicit, more constrained approach.**

No:

- Prediction

- Automation

- Intelligence

- Magic

**Rule:**\
Reliability is more important than cleverness.

---

## 16. Feature Review Kill Switch

Before accepting any feature or change, ask:

1. Does this strengthen the core loop?

2. Does it reuse existing screens?

3. Does it reuse existing tables?

4. Does it respect all invariants?

5. Does it reduce ambiguity?

If **any answer is no**, the feature is rejected.

---

## Strong rule going forward (important)

When debugging backend logic:

> ❌ Never run multiple dev servers\
> ❌ Never mix `--hot` and non-hot\
> ❌ Never trust behavior until `lsof` shows ONE listener

Hot reload is a *convenience*, not a guarantee.

## Final Authority Statement

> **This guardrail document overrides all suggestions, tools, and convenience.\
> If a conflict exists, the guardrails win.**