## Broadcast Response & Acceptance Flow

### Purpose

Defines how users respond to broadcasts and how requesters review and accept those responses.

---

## Core Concepts

- A broadcast response creates a `task_request`

- Each response is scoped to a **single broadcast**

- The broadcast creator is the requester

- The responder is a potential helper

---

## Response Creation (Helper)

### Trigger

User clicks **“I can help”** on a broadcast.

### Backend Effect

Creates a `task_request` with:

- `requester_id` = broadcast creator

- `helper_id` = responding user

- `status` = `sent`

- `broadcast_id` = originating broadcast

---

## Requester View (Responses)

Requester sees a list of responses:

Each response shows:

- Helper name + avatar

- Response time

- Status (`sent`, `accepted`)

Clicking a response opens:

- Helper profile summary

- Message history (if any)

- Accept button

---

## Acceptance Flow

### On Accept


- Selected response → `accepted`

- Task transitions to **active**

- Other responses remain pending (Phase 2)

- Messaging context persists

No automatic declines in Phase 2.

---

## State Summary

| State | Meaning |
| --- | --- |
| Broadcast Open | Awaiting responses |
| Response Sent | Helper has offered help |
| Response Accepted | Task is active |
