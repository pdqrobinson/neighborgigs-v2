# NeighborGigs — Error Handling & State Recovery (Phase One)

## Purpose

This document defines how the system behaves when **things go wrong**.

Phase One error handling prioritizes:

- data integrity

- invariant protection

- explicit failure over silent correction

- recoverability through state, not guesswork

If an error cannot be handled safely, the system must **fail visibly**.

---

## Core Principles

1. **State is never inferred**

2. **State is never auto-corrected silently**

3. **All transitions are explicit**

4. **Backend API is the single authority**

5. **Ledger integrity is never compromised**

6. **The user can always recover by retrying**

---

## Error Classification

Errors fall into four categories:

1. Validation errors (bad input)

2. Conflict errors (invalid state transition)

3. System errors (timeouts, crashes)

4. Expiry-related errors (time-bound state)

Each category has strict handling rules.

---

## Validation Errors

Validation errors occur when input is malformed or violates constraints.

Examples:

- Missing required fields

- Invalid UUID

- Radius outside allowed range

- Tip amount outside allowed presets

- Invalid direction value

### Handling Rules

- Request is rejected immediately

- No database writes occur

- Client receives a clear error message

- User may retry after correction

### Required Behavior

Validation errors must never:

- partially write data

- mutate state

- create side effects

---

## Conflict Errors (State Violations)

Conflict errors occur when a request is valid but violates current system state.

Examples:

- Helper attempts to accept a request while already active on another task

- Request is accepted twice

- Task is completed from an invalid state

- User attempts to act on a task they do not own

### Handling Rules

- Request is rejected

- State remains unchanged

- Client receives a conflict response

- User must refresh state and retry

### Required Behavior

Conflict errors must:

- preserve existing state

- never roll state forward

- never attempt reconciliation automatically

---

## Idempotency Failures

Some endpoints support idempotency (e.g. create request, complete task).

### Rule

If the same idempotency key is reused:

- The original result must be returned

- No duplicate rows may be created

- No duplicate ledger entries may occur

If idempotency metadata is missing:

- The request may proceed

- Duplicate prevention is best-effort only

Idempotency protects against:

- network retries

- double taps

- mobile reconnects

---

## System Errors (Timeouts, Crashes)

System errors include:

- server crashes

- database timeouts

- unexpected exceptions

### Handling Rules

- If a transaction is incomplete, it must rollback entirely

- Partial state writes are forbidden

- Client receives a generic error

- User may retry safely

### Required Behavior

The backend must use **atomic transactions** for:

- task state changes

- ledger writes

- wallet updates

If atomicity cannot be guaranteed, the operation must fail.

---

## Expiry-Based Errors

Some state is time-bound and may expire while a user is mid-action.

Examples:

- Helper movement expires while viewing the map

- Request expires before helper responds

- User attempts to accept an expired request

### Handling Rules

- Expired state is authoritative

- Action is rejected

- Client is instructed to refresh

### Required Behavior

Expiry cleanup must:

- be deterministic

- not depend on client activity

- never revive expired state

---

## Task-Specific Failure Scenarios

### Helper Accepts Request, Client Times Out

- Accept endpoint uses idempotency

- If accepted successfully, retry returns accepted state

- No duplicate task created

---

### Two Helpers Attempt to Accept Same Request

- First accept succeeds

- Second accept receives conflict error

- Request remains linked to first helper only

---

### Helper Goes Offline Mid-Task

- Task remains in current state

- No automatic reassignment

- Requester sees task as active

- Manual resolution deferred to Phase Two

Phase One does not attempt recovery beyond state preservation.

---

### Movement Expires During Active Task

- Movement visibility ends

- Task remains valid

- Helper continues task uninterrupted

Movement only affects discovery, not task execution.

---

## Wallet & Ledger Error Handling

### Ledger Integrity Rule

Ledger entries are **append-only**.
They are never:
- deleted
- edited
- reversed silently

### Failure During Wallet Credit

If task completion fails before ledger write:
- task remains incomplete
- no ledger entry exists

If ledger write succeeds but response fails:
- retry must return same ledger entry
- wallet balance must not double-credit

### Withdrawal Handling

Withdrawal requests in Phase One are synchronous and create immediate ledger entries:
- No pending/processing/failed states exist
- No withdrawal table or async processing
- Withdrawal request creates immediate debit ledger entry
- Wallet balances update synchronously
- All errors surface immediately to client

Note: "Synchronous" means the API request creates the ledger debit and updates the wallet balance within the same request. It does not mean external payout rails complete in the same request. Phase 1 is ledger-only withdrawal (accounting action); settlement is out of scope.

If withdrawal succeeds:
- Debit ledger entry created
- Wallet available_usd decreased
- Response returns success

If withdrawal fails:
- No ledger entry created
- Wallet unchanged
- Error returned to client
- Client may retry

---

## Notification Failures

Notifications are non-critical.

If notification sending fails:

- state remains correct

- no retry loop blocks execution

- user can recover by opening the app

Notifications never drive state.

---

## Client Recovery Strategy

When an error occurs, the client must:

1. Display the error

2. Refresh current state from API

3. Render authoritative state

4. Allow retry if appropriate

The client must never:

- guess what happened

- advance state optimistically

- assume success on failure

---

## Explicit Non-Goals (Phase One)

Phase One does NOT include:

- automatic task reassignment

- dispute resolution

- partial refunds

- rollback of completed tasks

- background reconciliation jobs

If an error cannot be safely resolved, it is surfaced and deferred.

---

## Final Lock Statement

Errors are not bugs to hide.\
They are signals to preserve integrity.

If a failure occurs, the system must:

- stop

- preserve truth

- allow recovery through explicit action

No guessing. No magic. No silent fixes.