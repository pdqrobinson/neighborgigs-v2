# NeighborGigs — Core Invariants

Core invariants define the **non-negotiable rules** of the NeighborGigs system.\
They apply to product behavior, data design, user experience, and technical implementation.


Any feature, design, or architectural decision that violates these invariants **must not ship**.

any SQL migrations should be written up and given to the user for manual implementaiton

---

## 1. Hyperlocal Containment

All visibility and interaction is restricted to a user’s **assigned neighborhood** and **selected radius**.

- Users cannot see activity outside their neighborhood

- Radius is capped (1–3 miles)

- There is no global, citywide, or expanded search mode

**Rationale:**\
Trust is grounded in proximity. Distance ambiguity breaks confidence immediately.

---

## 2. Map as Source of Truth

The map is the **primary representation of system state**.

- The map defines what exists

- List or grid views are alternate representations of the same dataset

- No data may appear in a list that does not exist on the map

**Rationale:**\
Multiple sources of truth create confusion and erode trust.

---

## 3. Availability Is Movement-Based

Only users who are actively **on the move** are visible as helpers.

- Visibility is time-bound

- There are no static listings or idle availability states

**Rationale:**\
The product is built around immediacy and realism, not inventory.

---

## 4. Explicit State Only

All user, task, and wallet states are **explicitly stored and tracked**.

- No inferred or implicit state

- All transitions are intentional and recorded

**Rationale:**\
Implicit logic creates unpredictable behavior and untraceable bugs.

---

## 5. One Active Task per Helper

A helper may have at most one active task at a time in Phase One.

- A helper may complete many tasks over time
- A helper cannot accept a new task while another is active
- Active states include "accepted" and "in progress"

**Rationale:**\
Parallel commitments undermine reliability and break expectations.

---

## 6. Tasks Are Immediate and Short-Lived

Tasks are created with the assumption of **near-term execution**.

- Tasks exist because someone is already moving

- Tasks are accepted and completed within a short window

**Rationale:**\
NeighborGigs facilitates opportunistic help, not scheduled labor.

---

## 7. Task Creation Timing

In Phase One, Tasks are created only upon request acceptance. TaskRequests represent proposals and have no corresponding Task until accepted.

- TaskRequest: proposal from requester to helper (states: sent → accepted | declined | expired)

- Task: agreed work after acceptance (states: accepted → in_progress → completed)

**Rationale:**\
Separating proposal from commitment prevents premature resource allocation and clarifies state boundaries.

---

## 8. Empty States Are Honest

An absence of activity is a valid and visible state.

- No fake pins

- No synthetic activity

- No misleading placeholders

**Rationale:**\
Artificial activity permanently damages credibility.

---

## 9. Real Users Only

Every actor in the system exists as a **real database entity**.

- No anonymous task creation

- No client-only identities

- No temporary or ephemeral users

**Rationale:**\
Accountability, reconciliation, and trust require persistent identity.

---

## 10. Ledger-First Money Model

All value changes are recorded in a **ledger before any funds move**.

- Balances are derived from ledger entries

- No silent balance mutations

**Rationale:**\
Accounting integrity must exist independently of payment rails.

---

## 11. Custodial Wallet Control (Phase One)

The system maintains custody of funds in Phase One.

- Users do not manage keys

- Transfers are controlled and reversible

**Rationale:**\
Early-stage systems prioritize safety and control over autonomy.

---

## 12. Direction Is Contextual, Not Algorithmic

Movement direction (e.g., going out, heading home) is informational only.

- Direction does not affect routing or task assignment logic

**Rationale:**\
Context improves human decisions without increasing system complexity.

---

## 13. All Time-Bound State Expires

No active state persists indefinitely.

- On-the-move status expires

- Requests expire

- Tasks complete or terminate

**Rationale:**\
Stale state creates silent failure modes.

---

## 14. Core Loop Supremacy

All product behavior must support the core loop:

**On the move → request → accept → complete → earn**

Features that do not strengthen this loop do not belong in the system.

**Rationale:**\
Focus preserves velocity and clarity.

---

## 15. Intentional Friction

Certain constraints are deliberately enforced.

- Location permission

- Neighborhood lock

- Radius limits

**Rationale:**\
Constraints create clarity, predictability, and trust.

---

## 16. Simplicity Over Cleverness

The system favors predictable behavior over intelligent inference.

- No auto-matching

- No predictive routing

- No opaque decision-making

**Rationale:**\
Reliability is more valuable than novelty.

---

## Final Statement

> **These invariants are not features or preferences.\
> They are the structural rules that define the NeighborGigs system.**

Any decision that violates them must be reconsidered or rejected.