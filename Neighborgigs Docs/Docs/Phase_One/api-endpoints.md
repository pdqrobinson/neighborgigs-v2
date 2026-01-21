# NeighborGigs API Endpoints Documentation

> **Last Updated**: 2026-01-19
> **Base URL**: `http://localhost:3000`
> **Auth Required**: All endpoints require `X-User-Id` header

## Authentication

All API endpoints require a `X-User-Id` header to identify the authenticated user.

```http
X-User-Id: <user-uuid>
```

**Error Response** (401):
```json
{
  "error": {
    "code": "UNAUTHORIZED",
    "message": "Missing X-User-Id header"
  }
}
```

---

## User Endpoints

### Get Current User

**GET** `/api/v1/me`

Returns the current user's profile with location and movement status.

**Response** (200):
```json
{
  "user": {
    "id": "uuid",
    "first_name": "string",
    "profile_photo": "url | null",
    "neighborhood": {
      "id": "uuid",
      "name": "string"
    },
    "radius_miles": 1,
    "last_location": {
      "lat": 33.4484,
      "lng": -112.0740
    },
    "movement": {
      "on_the_move": false,
      "direction": "out | home | null",
      "expires_at": "ISO-8601 | null"
    }
  }
}
```

---

### Update Profile

**PATCH** `/api/v1/me/profile`

Update user profile information.

**Request Body**:
```json
{
  "first_name": "string (1-40 chars)",
  "profile_photo": "url | null"
}
```

**Response** (200):
```json
{
  "user": { /* updated user object */ }
}
```

---

### Update Location (Heartbeat)

**PATCH** `/api/v1/me/location`

Update user's current GPS location (called periodically to maintain freshness).

**Request Body**:
```json
{
  "lat": 33.4484,
  "lng": -112.0740
}
```

**Response** (200):
```json
{ "ok": true }
```

---

### Update Radius

**PATCH** `/api/v1/me/radius`

Update user's discovery radius.

**Request Body**:
```json
{ "radius_miles": 1 }
```

**Valid Values**: 1, 2, or 3 miles

**Response** (200):
```json
{
  "user": { /* updated user object */ }
}
```

---

### Update Notifications Toggle

**PATCH** `/api/v1/me/notifications`

Enable or disable push notifications.

**Request Body**:
```json
{ "notifications_enabled": true }
```

**Response** (200):
```json
{
  "user": { /* updated user object */ }
}
```

---

### Update Neighborhood (First Launch)

**POST** `/api/v1/me/neighborhood`

Automatically assign user to a neighborhood based on GPS location. Called on first launch.

**Request Body**:
```json
{
  "lat": 33.4484,
  "lng": -112.0740
}
```

**Response** (200):
```json
{
  "user": { /* updated user object with neighborhood assigned */ }
}
```

**Behavior**:
- Finds neighborhood containing the GPS point
- Assigns default neighborhood if no match found
- Updates `neighborhood_id` in user record

---

### Register Device (Push Notifications)

**POST** `/api/v1/me/devices`

Register a device for push notifications.

**Request Body**:
```json
{
  "push_token": "string",
  "push_platform": "ios | android | web"
}
```

**Response** (201):
```json
{
  "device": {
    "user_id": "uuid",
    "push_token": "string",
    "push_platform": "ios",
    "last_seen_at": "ISO-8601"
  }
}
```

---

## Discovery Endpoints

### Get Nearby Helpers

**GET** `/api/v1/nearby/helpers?lat={lat}&lng={lng}`

Get list of helpers currently "on the move" within user's neighborhood and radius.

**Query Parameters**:
- `lat` (required): User's current latitude
- `lng` (required): User's current longitude

**Response** (200):
```json
{
  "helpers": [
    {
      "user_id": "uuid",
      "first_name": "string",
      "profile_photo": "url | null",
      "distance_miles": 0.5,
      "direction": "out | home",
      "expires_at": "ISO-8601",
      "last_location": {
        "lat": 33.4485,
        "lng": -112.0741
      }
    }
  ]
}
```

**Behavior**:
- Filters by same neighborhood
- Filters by `on_the_move=true` and not expired
- Calculates distance using earthdistance function
- Returns helpers within user's radius

---

## Movement Endpoints

> **Note**: These endpoints are implemented but have no UI screens yet.

### Go On The Move

**POST** `/api/v1/movement/start`

Signal that user is actively moving (outbound or homebound) and available for requests.

**Request Body**:
```json
{
  "direction": "out | home",
  "duration_minutes": 30
}
```

**Valid Values**:
- `direction`: "out" or "home"
- `duration_minutes`: 30, 60, 90, or 120

**Response** (200):
```json
{
  "movement": {
    "on_the_move": true,
    "direction": "out",
    "expires_at": "ISO-8601"
  }
}
```

**Behavior**:
- Sets `on_the_move=true`
- Records direction (outbound/homebound)
- Calculates expiration time based on duration
- Makes user visible to nearby helpers

---

### Stop Movement Early

**POST** `/api/v1/movement/stop`

Cancel "on the move" status before expiration.

**Response** (200):
```json
{
  "movement": {
    "on_the_move": false,
    "direction": null,
    "expires_at": null
  }
}
```

---

## Request Endpoints

### Create Task Request

**POST** `/api/v1/requests`

Create a task request to a specific helper.

**Request Body**:
```json
{
  "helper_id": "uuid",
  "message": "string (1-280 chars)",
  "suggested_tip_usd": 10
}
```

**Valid Values**:
- `message`: 1-280 characters
- `suggested_tip_usd`: 5, 10, 15, or 20

**Response** (201):
```json
{
  "request": {
    "id": "uuid",
    "requester_id": "uuid",
    "helper_id": "uuid",
    "message": "string",
    "suggested_tip_usd": 10,
    "status": "sent",
    "expires_at": "ISO-8601",
    "created_at": "ISO-8601"
  }
}
```

**Validation**:
- Helper must be `on_the_move=true` and not expired
- Helper must be in same neighborhood
- Helper must be within requester's radius
- Request expires in 15 minutes

---

### List Incoming Requests (Helper)

**GET** `/api/v1/requests/incoming?status=sent`

Get list of incoming task requests for the current user (as helper).

**Query Parameters**:
- `status` (optional): Filter by status (default: "sent")

**Response** (200):
```json
{
  "requests": [
    {
      "id": "uuid",
      "requester": {
        "id": "uuid",
        "first_name": "string",
        "profile_photo": "url | null"
      },
      "message": "string",
      "suggested_tip_usd": 10,
      "status": "sent",
      "created_at": "ISO-8601"
    }
  ]
}
```

---

### Accept Request

**POST** `/api/v1/requests/:requestId/accept`

Accept an incoming request and create a task.

**Response** (200):
```json
{
  "request": { /* accepted request object */ },
  "task": {
    "id": "uuid",
    "requester_id": "uuid",
    "helper_id": "uuid",
    "message": "string",
    "tip_amount_usd": 10,
    "status": "accepted",
    "created_at": "ISO-8601"
  }
}
```

**Behavior**:
- Creates task with status "accepted"
- Updates request status to "accepted"
- Atomic operation via RPC to prevent race conditions
- Fails if helper already has active task

---

### Decline Request

**POST** `/api/v1/requests/:requestId/decline`

Decline an incoming request.

**Response** (200):
```json
{
  "request": {
    "id": "uuid",
    "status": "declined"
  }
}
```

---

### Cancel Request (Requester)

**POST** `/api/v1/requests/:requestId/cancel`

Cancel a sent request before it's accepted.

**Response** (200):
```json
{
  "request": {
    "id": "uuid",
    "status": "expired"
  }
}
```

---

## Broadcast Endpoints

### List Active Broadcasts

**GET** `/api/v1/broadcasts`

Get list of active broadcasts (community-wide discovery).

**Response** (200):
```json
{
  "broadcasts": [
    {
      "id": "uuid",
      "requester": {
        "id": "uuid",
        "first_name": "string",
        "profile_photo": "url | null"
      },
      "message": "string",
      "broadcast_type": "need_help | offer_help",
      "status": "sent",
      "expires_at": "ISO-8601",
      "created_at": "ISO-8601"
    }
  ]
}
```

**Behavior**:
- Returns broadcasts with `is_broadcast=true`
- Filters by status "sent"
- Filters by not expired
- Ordered by creation date (newest first)

---

### Create Broadcast

**POST** `/api/v1/broadcasts`

Create a new broadcast to the neighborhood.

**Request Body**:
```json
{
  "type": "need_help | offer_help",
  "message": "string (1-280 chars)",
  "expiresInMinutes": 60
}
```

**Valid Values**:
- `type`: "need_help" or "offer_help"
- `message`: 1-280 characters
- `expiresInMinutes`: 15, 30, 60, or 120

**Response** (201):
```json
{
  "broadcast": {
    "id": "uuid",
    "requester_id": "uuid",
    "message": "string",
    "broadcast_type": "need_help",
    "status": "sent",
    "expires_at": "ISO-8601",
    "created_at": "ISO-8601"
  }
}
```

**Data Model**:
- Stored in `task_requests` table with `is_broadcast=true`
- `suggested_tip_usd` set to 0
- `helper_id` set to null

---

### Respond to Broadcast

**POST** `/api/v1/broadcasts/:id/respond`

Respond to a broadcast by creating a task request.

**Request Body**:
```json
{ "suggested_tip_usd": 10 }
```

**Valid Values**: 5, 10, 15, or 20

**Response** (201):
```json
{
  "request": {
    "id": "uuid",
    "requester_id": "uuid",
    "helper_id": "uuid",
    "message": "Responding to broadcast: ...",
    "suggested_tip_usd": 10,
    "status": "sent",
    "expires_at": "ISO-8601"
  }
}
```

**Behavior**:
- Cannot respond to own broadcast
- Broadcast must not be expired
- Creates regular task request linked to broadcast
- Request expires in 15 minutes

---

## Task Endpoints

### Get Active Task

**GET** `/api/v1/tasks/active`

Get the currently active task for the user (as requester or helper).

**Response** (200):
```json
{
  "task": {
    "id": "uuid",
    "requester_id": "uuid",
    "helper_id": "uuid",
    "message": "string",
    "tip_amount_usd": 10,
    "status": "accepted | in_progress",
    "created_at": "ISO-8601",
    "requester": { /* user object */ },
    "helper": { /* user object */ }
  },
  "pending_request_id": "uuid | null"
}
```

**Behavior**:
- If user has pending sent request: returns `task: null, pending_request_id: "uuid"`
- If user has active task: returns task object with requester and helper details
- If no activity: returns `task: null, pending_request_id: null`

---

### Start Task

**POST** `/api/v1/tasks/:taskId/start`

Transition task from "accepted" to "in_progress".

**Response** (200):
```json
{
  "task": {
    "id": "uuid",
    "status": "in_progress"
  }
}
```

**Behavior**:
- Only helper can start their task
- Task must be in "accepted" status

---

### Complete Task

**POST** `/api/v1/tasks/:taskId/complete`

Complete task and credit helper's wallet.

**Request Body**:
```json
{
  "proof_photo_url": "url | null"
}
```

**Response** (200):
```json
{
  "task": {
    "id": "uuid",
    "status": "completed",
    "completed_at": "ISO-8601",
    "proof_photo_url": "url | null"
  },
  "wallet": {
    "wallet_id": "uuid",
    "available_usd": 10.00,
    "pending_usd": 0.00
  }
}
```

**Behavior**:
- Only helper can complete their task
- Task must be in "in_progress" status
- Atomic operation: completes task + credits wallet
- Credit amount = `task.tip_amount_usd`

---

## Wallet Endpoints

### Get Wallet

**GET** `/api/v1/wallet`

Get current wallet balance and status.

**Response** (200):
```json
{
  "wallet": {
    "wallet_id": "uuid",
    "available_usd": 100.50,
    "pending_usd": 25.00,
    "updated_at": "ISO-8601"
  }
}
```

---

### Get Ledger Entries

**GET** `/api/v1/wallet/ledger?limit=50&cursor={timestamp}`

Get transaction history with pagination.

**Query Parameters**:
- `limit` (optional): Number of entries (default: 50)
- `cursor` (optional): Timestamp for pagination

**Response** (200):
```json
{
  "entries": [
    {
      "id": "uuid",
      "wallet_id": "uuid",
      "entry_type": "credit | debit",
      "source": "task_completion | withdrawal",
      "amount_usd": 10.00,
      "created_at": "ISO-8601"
    }
  ],
  "next_cursor": "ISO-8601 | null"
}
```

**Behavior**:
- Ordered by creation date (newest first)
- Returns `next_cursor` for pagination
- `next_cursor` is null when no more entries

---

### Request Withdrawal

**POST** `/api/v1/wallet/withdrawals`

Request withdrawal from wallet balance.

**Headers**:
- `Idempotency-Key`: Required (prevents duplicate withdrawals)

**Request Body**:
```json
{ "amount_usd": 25.00 }
```

**Response** (200):
```json
{
  "ok": true,
  "status": "processed",
  "wallet": {
    "wallet_id": "uuid",
    "available_usd": 75.50,
    "pending_usd": 25.00
  },
  "withdrawal_id": "uuid"
}
```

**Behavior**:
- Idempotent based on `Idempotency-Key` header
- Deducts from `available_usd`, adds to `pending_usd`
- Validates sufficient balance
- Fails if duplicate key detected

---

## Error Responses

All endpoints return errors in this format:

```json
{
  "error": {
    "code": "ERROR_CODE",
    "message": "Human-readable message",
    "details": { /* optional additional context */ }
  }
}
```

### Common Error Codes

- `UNAUTHORIZED` (401): Missing or invalid `X-User-Id` header
- `VALIDATION_ERROR` (400): Invalid request data
- `NOT_FOUND` (404): Resource not found
- `FORBIDDEN` (403): Access denied
- `CONFLICT` (409): Resource state conflict (e.g., duplicate, already processed)
- `INTERNAL_ERROR` (500): Server error

---

## RPC Functions

The following database RPCs provide atomic operations:

### `accept_request(p_request_id, p_helper_id, p_requester_id, p_message, p_tip)`

Atomically:
1. Updates request status to "accepted"
2. Creates task with status "accepted"
3. Prevents race conditions

### `complete_task(p_task_id, p_helper_id, p_wallet_id, p_tip_amount, p_proof_photo_url)`

Atomically:
1. Updates task status to "completed"
2. Credits wallet balance
3. Creates ledger entry
4. All-or-nothing transaction

### `request_withdrawal(p_idempotency_key, p_user_id, p_amount_usd)`

Atomically:
1. Validates idempotency key
2. Checks sufficient balance
3. Creates withdrawal request
4. Updates wallet balance
5. Returns success or idempotent error

### `get_nearby_helpers(p_user_id, p_neighborhood_id, p_lat, p_lng, p_radius_miles)`

Query function:
1. Filters by neighborhood
2. Filters by on-the-move status
3. Calculates distances using earthdistance
4. Filters by radius
5. Returns sorted list

---

## Database Schema Notes

### Users Table
- `id`: UUID (primary key)
- `first_name`: VARCHAR(40)
- `profile_photo`: TEXT (URL)
- `neighborhood_id`: UUID (foreign key)
- `radius_miles`: INT (1, 2, or 3)
- `last_lat`, `last_lng`: FLOAT (GPS location)
- `on_the_move`: BOOLEAN
- `direction`: TEXT ('out' | 'home' | null)
- `move_expires_at`: TIMESTAMP
- `notifications_enabled`: BOOLEAN

### Task Requests Table
- `id`: UUID (primary key)
- `requester_id`: UUID
- `helper_id`: UUID (null for broadcasts)
- `message`: TEXT (1-280 chars)
- `suggested_tip_usd`: DECIMAL
- `status`: TEXT ('sent', 'accepted', 'declined', 'expired')
- `expires_at`: TIMESTAMP
- `is_broadcast`: BOOLEAN
- `broadcast_type`: TEXT ('need_help' | 'offer_help' | null)

### Tasks Table
- `id`: UUID (primary key)
- `requester_id`: UUID
- `helper_id`: UUID
- `message`: TEXT
- `tip_amount_usd`: DECIMAL
- `status`: TEXT ('accepted', 'in_progress', 'completed')
- `proof_photo_url`: TEXT (URL | null)
- `started_at`: TIMESTAMP
- `completed_at`: TIMESTAMP

### Wallets Table
- `id`: UUID (primary key)
- `user_id`: UUID (one-to-one)
- `available_usd`: DECIMAL
- `pending_usd`: DECIMAL

### Ledger Entries Table
- `id`: UUID (primary key)
- `wallet_id`: UUID
- `entry_type`: TEXT ('credit' | 'debit')
- `source`: TEXT
- `amount_usd`: DECIMAL

---

## Rate Limiting & Best Practices

1. **Location Updates**: Call `/api/v1/me/location` every 30-60 seconds when moving
2. **Movement Status**: Call `/api/v1/movement/start` when heading out/coming home
3. **Request Polling**: Poll `/api/v1/tasks/active` every 15 seconds for updates
4. **Broadcasts**: Poll `/api/v1/broadcasts` every 30 seconds for new broadcasts
5. **Idempotency**: Always include `Idempotency-Key` header for withdrawals
6. **Error Handling**: Implement exponential backoff for 500 errors
7. **Timeouts**: Set reasonable timeouts (e.g., 10s) for all requests
