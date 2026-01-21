# NeighborGigs — Phase One API Specification

\## Purpose

Define the backend API contract for Phase One. The backend API is the **only** component allowed to:

\- mutate state

\- enforce invariants

\- write ledger entries

\- determine visibility

Frontend must only call these endpoints.

\---

\## Global Rules

\### Base URL

`/api/v1`

\### Authentication (Phase One Stub)

All requests must include:

\- `X-User-Id: <uuid>`

If missing or invalid → `401 Unauthorized`.

The backend authenticates to Supabase using service credentials; the client never does.

\### Content Type

\- Requests with bodies: `Content-Type: application/json`

\- Responses: `application/json`

\### Idempotency (Phase One)

For endpoints that create records, client should send:

\- `Idempotency-Key: <string>`

If the same key is reused with the same user:

\- server returns the original result

\- server must not duplicate rows

If absent, server still works, but duplicates are possible (not recommended).

\### Standard Error Format

\`\`\`json

{

  "error": {

    "code": "STRING_CODE",

    "message": "Human readable message",

    "details": { "optional": "object" }

  }

}

Common error codes:

UNAUTHORIZED (401)

FORBIDDEN (403)

NOT_FOUND (404)

VALIDATION_ERROR (400)

CONFLICT (409)

RATE_LIMITED (429)

INTERNAL_ERROR (500)

Data Models (API View)

User (public)
Storage: Uses flat columns for movement data
API: Returns movement as nested object for client convenience

```json
{
  "id": "uuid",
  "first_name": "string",
  "profile_photo": "string|null",
  "neighborhood": {
    "id": "string",
    "name": "string"
  },
  "radius_miles": 1,
  "last_location": {
    "lat": 33.4484,
    "lng": -112.074
  },
  "movement": {
    "on_the_move": false,
    "direction": "out|home|null",
    "expires_at": "ISO8601|null"
  }
}
```

NearbyHelper (map/list item)

json

Copy code

{

  "user_id": "uuid",

  "first_name": "string",

  "profile_photo": "string|null",

  "distance_miles": 0.4,

  "direction": "out|home",

  "expires_at": "ISO8601",

  "last_location": { "lat": 33.4484, "lng": -112.074 }

}

TaskRequest

json

Copy code

{

  "id": "uuid",

  "requester_id": "uuid",

  "helper_id": "uuid",

  "message": "string",

  "suggested_tip_usd": 10,

  "status": "sent|accepted|declined|expired",

  "created_at": "ISO8601",

  "task_id": "uuid|null"

}

Task

json

Copy code

{

  "id": "uuid",

  "requester_id": "uuid",

  "helper_id": "uuid|null",

  "description": "string",

  "tip_amount_usd": 10,

  "status": "requested|accepted|in_progress|completed",

  "proof_photo_url": "string|null",

  "created_at": "ISO8601",

  "completed_at": "ISO8601|null"

}

Wallet

json

Copy code

{

  "wallet_id": "uuid",

  "available_usd": 0,

  "pending_usd": 0,

  "updated_at": "ISO8601"

}

LedgerEntry

json

Copy code

{

  "id": "uuid",

  "entry_type": "credit|debit",

  "amount_usd": 10,

  "source": "task|withdrawal|adjustment",

  "reference_id": "uuid|null",

  "created_at": "ISO8601"

}

Invariants Enforced by API

Hyperlocal containment: all discovery limited to neighborhood_id and radius_miles

Map/list parity: both use the same discovery endpoint

Movement-based availability: only on_the_move=true and expires_at &gt; now()

Explicit state only: no inferred transitions

One active task per helper: accepted/in_progress max 1 per helper

Time-bound movement must expire

Ledger-first money: wallet changes require ledger entries (Phase 1 only uses credit|debit)

Background jobs: run in backend environment (API-owned) via separate worker or scheduled job

State Machines

Request Lifecycle (task_requests table)

- sent → accepted
- sent → declined
- sent → expired

Task Lifecycle (tasks table) - STRICT
- Created as 'accepted' on request acceptance
- accepted → in_progress (POST /tasks/{task_id}/start REQUIRED)
- in_progress → completed (POST /tasks/{task_id}/complete)
- request.task_id is null until accepted
- Once accepted, task_id is immutable

NOTE: POST /tasks/{task_id}/start is REQUIRED before completing a task. Helpers cannot complete tasks directly from 'accepted' state.

Endpoints

1) Get Current User

GET /me

Returns the current user (based on X-User-Id).

200 Response

json

Copy code

{ "user": { ...User } }

2) Update Profile

PATCH /me/profile

Body

json

Copy code

{

  "first_name": "string",

  "profile_photo": "string|null"

}

Rules:

first_name length 1–40

profile_photo must be a URL or null

200

json

Copy code

{ "user": { ...User } }

3) Update Location (heartbeat)

PATCH /me/location

Used to keep map centered and enable accurate distance calculations.

Body

json

Copy code

{

  "lat": 33.4484,

  "lng": -112.074

}

Rules:

numeric lat/lng required

server stores last_lat, last_lng

200

json

Copy code

{ "ok": true }

4) Update Radius

PATCH /me/radius

Body

json

Copy code

{ "radius_miles": 1 }

Rules:

allowed values: 1, 2, 3

200

json

Copy code

{ "user": { ...User } }

5) Get Nearby Helpers (Map/List Source of Truth)

GET /nearby/helpers?lat=&lt;num&gt;&lng=&lt;num&gt;

Returns active “on the move” helpers within:

same neighborhood as current user

within current user’s radius_miles

All discovery results are sorted server-side by distance, then expiration.

200

json

Copy code

{ "helpers": \[ ...NearbyHelper \] }

Errors:

VALIDATION_ERROR if lat/lng missing

6) Go On The Move

POST /movement/start

Headers

Idempotency-Key recommended

Body

json

Copy code

{

  "direction": "out",

  "duration_minutes": 60

}

Rules:

direction: out or home

duration_minutes allowed: 30, 60, 90, 120

sets on_the_move=true and expires_at=now()+duration

200

json

Copy code

{ "movement": { "on_the_move": true, "direction": "out", "expires_at": "ISO8601" } }

7) Stop Movement Early

POST /movement/stop

Stops visibility immediately.

200

json

Copy code

{ "movement": { "on_the_move": false, "direction": null, "expires_at": null } }

8) Create Task Request (Requester → Helper)

POST /requests

Headers

Idempotency-Key recommended

Body

json

Copy code

{

  "helper_id": "uuid",

  "message": "string",

  "suggested_tip_usd": 10

}

Rules:

helper must be visible (on_the_move=true and not expired)

helper must be in same neighborhood and within radius at request time

message length: 1–280

suggested_tip_usd allowed presets: 5, 10, 15, 20 (adjust if you choose different)

201

json

Copy code

{ "request": { ...TaskRequest } }

Errors:

NOT_FOUND if helper not found

FORBIDDEN if helper not visible / out of area

9) List Incoming Requests (for Helper)

GET /requests/incoming?status=sent

Returns requests where helper_id = me and status matches (default sent).

200

json

Copy code

{ "requests": \[ ...TaskRequest \] }

10) Accept Request (Creates Task with Atomic Lock)
POST /requests/{request_id}/accept

Headers
Idempotency-Key recommended

Rules enforced:
- Use row-level lock to prevent race condition
- Transaction must be atomic
- request must be in 'sent' status
- current user must be the helper
- helper must not have any active task (accepted or in_progress)

Implementation (Single Transaction):
```sql
-- Lock the request row
SELECT * FROM task_requests
WHERE id = :request_id
  AND status = 'sent'
  AND helper_id = :current_user_id
FOR UPDATE;

-- If row exists, proceed with accept
UPDATE task_requests
SET status = 'accepted',
    task_id = :new_task_id
WHERE id = :request_id;

INSERT INTO tasks (...)
VALUES (...);
```

If SELECT returns 0 rows:
- Return 409 Conflict (already accepted or user not authorized)

200
```json
{
  "request": { ...TaskRequest },
  "task": { ...Task }
}
```

Errors:
- CONFLICT if request not in 'sent' status
- CONFLICT if helper has active task
- FORBIDDEN if user is not the helper

11) Decline Request

POST /requests/{request_id}/decline

Rules:

request must be sent

current user must be helper

request status → declined

200

json

Copy code

{ "request": { ...TaskRequest } }

12) Get My Active Task

GET /tasks/active

Returns the single active task for current user as requester or helper:
- status in requested|accepted|in_progress and belongs to me

If requester has a sent request (not yet accepted):
```json
{
  "task": null,
  "pending_request_id": "uuid"
}
```

If requester or helper has an active task:
```json
{
  "task": { ...Task },
  "pending_request_id": null
}
```

If none:
```json
{
  "task": null,
  "pending_request_id": null
}
```

13) Start Task (accepted → in_progress)

POST /tasks/{task_id}/start

Rules:

only helper can start

must be in accepted

200

json

Copy code

{ "task": { ...Task } }

Errors:

FORBIDDEN if not helper

CONFLICT if wrong state

14) Complete Task (in_progress → completed + ledger credit with idempotency)
POST /tasks/{task_id}/complete

Headers
Idempotency-Key recommended

Body
```json
{
  "proof_photo_url": "string|null"
}
```

Rules:
- only helper can complete
- must be in in_progress
- task status → completed, set completed_at, store proof_photo_url
- create ledger entry: credit to helper wallet for tip_amount_usd
- If Idempotency-Key exists → return prior result (no double-credit)
- update wallet derived balances (or recompute)

Implementation:
```sql
BEGIN;

-- Check idempotency (if Idempotency-Key header present)
IF :idempotency_key IS NOT NULL THEN
  IF EXISTS (SELECT 1 FROM ledger_entries WHERE reference_id = :idempotency_key AND source = 'task') THEN
    -- Task already completed with this key, return prior result
    SELECT * FROM ledger_entries WHERE reference_id = :idempotency_key;
    COMMIT;
    RETURN;
  END IF;
END IF;

-- Update task
UPDATE tasks
SET status = 'completed',
    completed_at = now(),
    proof_photo_url = :proof_photo_url
WHERE id = :task_id
  AND status = 'in_progress'
  AND helper_id = :current_user_id;

-- Create ledger entry (with idempotency key as reference)
INSERT INTO ledger_entries (id, wallet_id, entry_type, amount_usd, source, reference_id)
VALUES (
  COALESCE(:idempotency_key, gen_random_uuid()),
  :wallet_id,
  'credit',
  :tip_amount,
  'task',
  COALESCE(:idempotency_key, :task_id)
);

-- Update wallet balance
UPDATE wallets
SET available_usd = available_usd + :tip_amount
WHERE id = :wallet_id;

COMMIT;
```

200
```json
{
  "task": { ...Task },
  "wallet": { ...Wallet }
}
```

Errors:
FORBIDDEN if not helper
CONFLICT if wrong state
- Returns prior result if idempotency key already used

Wallet Endpoints

15) Get Wallet

GET /wallet

200

json

Copy code

{ "wallet": { ...Wallet } }

16) Get Ledger Entries

GET /wallet/ledger?limit=50&cursor=<optional>

200

json

Copy code

{

  "entries": \[ ...LedgerEntry \],

  "next_cursor": "string|null"

}

17) Request Withdrawal (Phase 1: synchronous with idempotency)
POST /wallet/withdrawals

Headers
Idempotency-Key required

Body
```json
{
  "amount_usd": 25
}
```

Rules:
- Idempotency-Key maps to withdrawal_requests.id
- If idempotency key exists → return prior result (no duplicate debit)
- If new → create withdrawal_requests record, then debit wallet
- amount_usd must be <= available_usd

Implementation:
```sql
BEGIN;

-- Check idempotency
INSERT INTO withdrawal_requests (id, wallet_id, amount_usd)
VALUES (:idempotency_key, :wallet_id, :amount_usd)
ON CONFLICT (id) DO NOTHING;

-- If conflict, fetch and return prior result
IF EXISTS (SELECT 1 FROM withdrawal_requests WHERE id = :idempotency_key) THEN
  -- Return prior result, don't debit again
  SELECT * FROM ledger_entries WHERE reference_id = :idempotency_key;
  COMMIT;
  RETURN;
END IF;

-- Create debit ledger entry
INSERT INTO ledger_entries (id, wallet_id, entry_type, amount_usd, source, reference_id)
VALUES (gen_random_uuid(), :wallet_id, 'debit', :amount_usd, 'withdrawal', :idempotency_key);

-- Update wallet balance
UPDATE wallets
SET available_usd = available_usd - :amount_usd
WHERE id = :wallet_id;

COMMIT;
```

Note: "Synchronous" means the API request creates a ledger debit and updates wallet balance within the same request. It does not mean external payout rails complete in the same request. Phase 1 is ledger-only withdrawal (accounting action); settlement is out of scope.

200
```json
{
  "ok": true,
  "status": "processed",
  "wallet": { ...Wallet },
  "withdrawal_id": "uuid"
}
```

Errors:
- CONFLICT if amount exceeds available_usd
- Returns prior result if idempotency key already used

Background Jobs (Backend-owned, no n8n)

A) Expire Movement

Scheduled job runs in backend worker/scheduler:

if move_expires_at &lt; now() → set on_the_move=false, clear direction and expires

B) Expire Old Requests

(Optional) job runs in backend worker/scheduler:

requests older than X minutes still sent → expired

These are internal jobs, not public endpoints.

Notes for Implementation

Demo Data

Demo users inserted via SQL with known UUIDs

Client uses X-User-Id to act as that user

No Direct DB Access

Client must never use Supabase keys to write tables directly

No New Screens / No New Tables

Any need for new endpoints must map to existing screens and existing tables only.

17.1) Register Device (for Push Notifications)
POST /me/devices
Headers
Idempotency-Key recommended

Body
```json
{
  "push_token": "string",
  "push_platform": "ios"
}
```
Rules:
- push_platform: ios, android, or web
- Replaces existing token for same (user_id, push_token) combination via upsert
- Phase 1: supports multiple devices per user, tokens rotate

204 No Content

17.2) Update Neighborhood (automatic on first launch)
POST /me/neighborhood
Body
```json
{
  "lat": 33.4484,
  "lng": -112.074
}
```

Rules:
- backend assigns neighborhood_id based on location
- if location denied, backend assigns default neighborhood (e.g., "central")
- Phase 1: automatic assignment only, no UI required

200
```json
{
  "user": { ...User }
}
```

User (public)
Storage: Uses flat columns for movement data
API: Returns movement as nested object for client convenience

```json
{
  "id": "uuid",
  "first_name": "string",
  "profile_photo": "string|null",
  "neighborhood": {
    "id": "string",
    "name": "string"
  },
  "radius_miles": 1,
  "last_location": {
    "lat": 33.4484,
    "lng": -112.074
  },
  "movement": {
    "on_the_move": false,
    "direction": "out|home|null",
    "expires_at": "ISO8601|null"
  }
}
```

NearbyHelper (map/list item)

TaskRequest states: sent → accepted | declined | expired (request lifecycle only)

Task states: requested → accepted → in_progress → completed (work lifecycle)

These are separate state machines. TaskRequest represents the initial message/offer, while Task represents the agreed work.