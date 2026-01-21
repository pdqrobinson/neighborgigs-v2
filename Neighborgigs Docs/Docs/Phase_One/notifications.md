# NeighborGigs — Push Notification Strategy (Phase One)

## Purpose

Define how push notifications work in Phase One.

Notifications are **supporting signals**, not a system of record.

They must:

- reflect persisted backend state

- never infer or mutate state

- never create side effects on their own

---

## Phase One Principles

1\. Notifications are **triggered by backend state changes**

2\. Notifications are **best-effort**, not guaranteed

3\. Missed notifications must be recoverable via in-app state

4\. Notifications never replace polling or API reads

---

## Provider Decision (LOCKED)

### Push Provider

**Firebase Cloud Messaging (FCM)**

- Single provider for Phase One

- Works for Android and iOS

- Supported by Expo / Zo mobile environment

No email notifications in Phase One.

---

## Device Registration

### Phase One Constraint

Multiple devices per user are supported. Devices are unique by (user_id, push_token).

Device tokens are stored in a dedicated `user_devices` table:

```sql
create table user_devices (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references users(id) on delete cascade,
  push_token text not null,
  push_platform text not null check (push_platform in ('ios','android','web')),
  created_at timestamptz not null default now(),
  last_seen_at timestamptz
);

create unique index user_devices_unique on user_devices(user_id, push_token);
create index user_devices_user_id on user_devices(user_id);
```

Optional Phase 1.1 enhancement: Old/invalid tokens are removed on send failure.

API: Register Device

POST /me/devices

Body
```json
{
  "push_token": "string",
  "push_platform": "ios"
}
```

Rules:
- Multiple devices per user are supported (token uniqueness enforced at DB level)
- API: Register Device

Notification Categories

All notifications fall into one of these categories:

- Request lifecycle

- Task lifecycle

- Wallet updates

- System alerts

No marketing notifications in Phase One.

Event → Notification Mapping (Authoritative)

1\. New Task Request (Requester → Helper)

Trigger

Task request created

Status = sent

Recipient

Helper

Payload

json

Copy code

{

  "type": "request_received",

  "request_id": "uuid",

  "requester_name": "string",

  "message": "string"

}

Copy

“New request nearby from {{requester_name}}”

2\. Request Accepted (Helper → Requester)

Trigger

Request status changes to accepted

Recipient

Requester

Payload

json

Copy code

{

  "type": "request_accepted",

  "task_id": "uuid",

  "helper_name": "string"

}

Copy

“{{helper_name}} accepted your request”

3\. Request Declined

Trigger

Request status changes to declined

Recipient

Requester

Payload

json

Copy code

{

  "type": "request_declined",

  "request_id": "uuid"

}

Copy

“Your request was declined”

4\. Task Started

Trigger

Task status changes to in_progress

Recipient

Requester

Payload

json

Copy code

{

  "type": "task_started",

  "task_id": "uuid"

}

Copy

“Your task is underway”

5\. Task Completed

Trigger

Task status changes to completed

Recipients

Requester

Helper

Payload

json

Copy code

{

  "type": "task_completed",

  "task_id": "uuid",

  "amount_usd": 10

}

Copy (Requester)

“Your task is complete”

Copy (Helper)

“You earned $10”

6\. Wallet Updated

Trigger

Ledger entry created (credit)

Recipient

Helper

Payload

json

Copy code

{

  "type": "wallet_credit",

  "amount_usd": 10,

  "new_balance_usd": 25

}

Copy

“$10 added to your NeighborGigs wallet”

7\. Movement Expired (Optional)

Trigger

move_expires_at &lt; now()

Recipient

User

Payload

json

Copy code

{

  "type": "movement_expired"

}

Copy

“You’re no longer visible to nearby neighbors”

Backend Notification Rules

Notifications are sent after DB commit

Failed notifications are logged but do not rollback state

Duplicate notifications are acceptable; duplicate state changes are not

Backend may retry notification send up to N times (e.g., 3)

Notification Preferences (Phase One)

Default Behavior

All notifications enabled by default

User Control

Single toggle: notifications on/off

Stored on users:

sql

Copy code

notifications_enabled boolean default true

No granular preferences in Phase One.

Error Handling

If Notification Send Fails

Log error

Continue normal execution

Do not retry indefinitely

If Device Token Is Invalid

Remove token from storage

Do not block future sends

Deep Linking (Optional but Recommended)

Notification payloads should include:

task_id

request_id

Frontend should:

Open app

Fetch latest state via API

Render appropriate screen

Never trust notification payload as state.

Phase One Non-Goals

No scheduled reminders

No marketing pushes

No batching

No read receipts

No notification history UI

Final Lock Statement

Notifications reflect state — they never create it.

Missing a notification must never break the app.