# NeighborGigs — Phase One

NeighborGigs is a **hyperlocal, movement-based task app** that lets neighbors help each other with immediate, nearby errands.

This repository contains **Phase One only**.

Phase One is intentionally narrow, explicit, and constraint-driven.

---

## What Phase One Is

Phase One delivers a **fully functional core loop**:

**On the move → request → accept → complete → earn**

It supports:

- map-first discovery

- real-time availability

- simple task execution

- ledger-based wallet accounting

- push notifications

- realistic demo data

It does **not** attempt to scale, optimize, or predict.

---

## What Phase One Is Not

NeighborGigs Phase One is **not**:

- a gig marketplace

- a scheduling system

- a delivery platform

- a social network

- a routing or optimization engine

- a crypto or self-custody wallet

If a feature pushes the system in those directions, it is out of scope.

---

## Architecture Overview

Phase One uses a **single authoritative backend**.

```markdown
Client (Zo App)
      ↓
Backend API (single authority)
      ↓
Supabase Postgres
```

There is:

- no orchestration layer

- no background workflow engine

- no client-side state inference

All truth lives in the backend API.

---

## Core Principles

These principles are enforced everywhere in the system:

- Hyperlocal containment (neighborhood + radius)

- Map is the source of truth

- Availability is movement-based and time-bound

- All state is explicit

- One active task per helper

- Ledger-first wallet model

- Empty states are honest

- Simplicity over cleverness

If a change violates these, it must not ship.

---

## Repository Structure

This repo is organized around **intent first, implementation second**.

```markdown
/
├── README.md
├── docs/
│   ├── app_summary.md
│   ├── core_invariants.md
│   ├── phase_one.md
│   ├── screens.md
│   ├── guardrails.md
│   ├── api_spec.md
│   ├── database_strategy.md
│   ├── supabase_setup.md
│   ├── geospatial.md
│   ├── notifications.md
│   ├── error_recovery.md
│   ├── repo_setup.md
│   └── phase_one_checklist.md
├── db/
│   ├── migrations/
│   └── seed_demo_data.sql
```

---

## Authoritative Documents (Read in This Order)

If you are building, modifying, or reviewing Phase One, read these **in order**:

 1. `file app_summary.md` — what the product is

 2. `file core_invariants.md` — non-negotiable rules

 3. `file phase_one.md` — exact scope

 4. `file screens.md` — allowed UI surface

 5. `file guardrails.md` — decision rules

 6. `file api_spec.md` — backend contract

 7. `file database_strategy.md` — data intent

 8. `file supabase_setup.md` — data execution

 9. `file geospatial.md` — hyperlocal enforcement

10. `file notifications.md` — push behavior

11. `file error_recovery.md` — failure handling

12. `file seed_demo_data.sql` — demo world

13. `file phase_one_checklist.md` — final gate

If documents conflict:\
**Guardrails + Core Invariants always win.**

---

## Database Summary

Phase One uses **exactly eight tables**:

- neighborhoods

- users

- user_devices

- wallets

- ledger_entries

- tasks

- task_requests

- withdrawal_requests

No additional tables are allowed.

Column additions are permitted only when explicitly documented.

---

## Authentication (Phase One)

Phase One does **not** use Supabase Auth.

- Users are real rows in the `users` table

- The client identifies the active user via `X-User-Id`

- The backend validates and authorizes every request

- Supabase service credentials are backend-only

There is no login UI in Phase One.

---

## Demo Mode

There is **no demo mode flag**.

Demo behavior is achieved by:

- seeding real users via SQL

- using fixed, known UUIDs

- bootstrapping the client with one of those IDs


Demo users behave exactly like real users.

---

## Environment & Git Rules

This repo uses a **single Git repository** with **two environments**:

- `dev` → Zo Dev site

- `main` → Zo Production site

Rules:

- all work happens in `dev`

- nothing touches production without a commit

- no direct production edits

- no hotfixes

- schema changes must be SQL-committed

If it isn’t committed, it doesn’t exist.

---

## Definition of Done (Phase One)

A change is considered complete only if:

- it respects all core invariants

- it introduces no new screens

- it introduces no new tables

- it passes the Phase One checklist

- it is committed to `dev`

- it does not require explanation

If a change needs explanation, it is probably wrong.

---

## How to Start Development

1. Read the documents listed above. Do not skim.

2. Set up Supabase using `secrets in system settings SUPABSE_ANON_KEY_PROD, SUPABASE_SERVICE_ROLE_KEY, SUPABASE_SERVICE_ROLE_PROD, SUPABASE_URL`

3. 

4. Run `file seed_demo_data.sql`

5. Implement backend API endpoints from `file api_spec.md`

6. Build UI strictly from `file screens.md`

7. Run the Phase One checklist before demos or merges

---

## Final Statement

NeighborGigs Phase One is intentionally constrained.

Those constraints are not limitations — they are the product.

Build exactly what is described.\
Nothing more.\
Nothing less.