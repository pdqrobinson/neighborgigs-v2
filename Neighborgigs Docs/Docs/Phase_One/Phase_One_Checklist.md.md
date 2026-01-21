Here is a **one-page Phase One Checklist**.\
This is designed to be run **before demos, merges, handoffs, or “are we ready?” moments**.

No explanations.\
Yes / No only.

You can title this:

> **PHASE_ONE_CHECKLIST.md**

---

# NeighborGigs — Phase One Readiness Checklist

## Scope & Architecture

- Phase One only (no Phase Two features present)

- No future-proofing logic

- No unused tables, endpoints, or screens

- Backend API is the single authority for state

- No orchestration layer (n8n not used)

---

## Core Invariants

- Hyperlocal containment enforced server-side

- Map is the source of truth

- Movement-based availability only

- One active task per helper enforced

- Explicit state only (no inferred state)

- All time-bound state expires correctly

- Empty states render honestly

- Ledger-first wallet model enforced

- Custodial wallet (USD only)

- Direction is contextual only

- Core loop preserved end-to-end

---

## Screens

- Only screens listed in `screens.md` exist

- No hidden or experimental screens

- Map and list show identical data

- All system states render (empty, loading, error)

---

## API

- All client actions go through API

- No client-side DB writes

- API enforces all invariants

- Idempotency implemented where required

- Errors return correct codes and messages

- No undocumented endpoints

---

## Geospatial

- Neighborhood containment applied first

- Radius filtering enforced server-side

- Movement state required for visibility

- Map and list share the same discovery query

- No client-side geo filtering

---

## Tasks & State

- TaskRequest states: sent → accepted | declined | expired (request lifecycle)

- Task states: requested → accepted → in_progress → completed (work lifecycle)

- No skipped or backward transitions within each state machine

- Conflicting actions return errors, not fixes

- Expired requests cannot be accepted

- Active task blocks new accepts

---

## Wallet & Ledger

- All balance changes have ledger entries

- Ledger is append-only

- No silent balance mutations

- Wallet balances derive from ledger

- Task completion credits wallet atomically

---

## Notifications

- Notifications triggered only after state commits

- Notifications never mutate state

- Missed notifications do not break flows

- Deep links resolve via API refresh

---

## Demo Mode

- Demo users inserted via SQL

- Demo UUIDs are fixed and documented

- No demo flags or branching logic


- Demo data reflects real system behavior

---

## Supabase

- Schema matches Phase One strategy exactly

- Required extensions enabled

- RLS disabled on all tables

- No triggers, functions, or policies

- Dev and prod schemas match

---

## Git & Environments

- Single repo in use

- `dev` → `main` promotion only

- No direct edits in production

- Commit messages follow scope rules

- Schema changes committed as SQL

- Dev and prod structures identical

---

## Error Handling

- Validation errors fail fast

- Conflicts preserve state

- Partial writes are impossible

- Retries are safe

- No silent auto-correction

---

## Final Gate

- All checks above are YES

> **If any box is unchecked, Phase One is not complete.**