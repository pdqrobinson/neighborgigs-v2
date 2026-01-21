# Movement Feature Architecture

> **Last Updated**: 2026-01-19
> **Status**: Design Decision Documented

## Overview

The Movement feature is **not a standalone availability mode**. Movement state is implicitly managed through the task acceptance lifecycle. When a helper accepts a task, they become "on the move" for the duration of that task.

## Core Principle

> **Task-Driven Movement**

Movement availability is not a separate mode users toggle on and off. It is a natural consequence of accepting a task.

```
Task Accepted → Helper becomes "on the move" → Task Complete → Movement ends
```

## Architectural Decision

### What Was Removed (Not Required)

The following screens and UI components from the original Phase One spec are **not implemented** because movement is task-driven:

- ❌ "Go On the Move" screen
- ❌ Direction selector UI (Out/Home)
- ❌ Time window selector UI (30/60/90/120 min)
- ❌ On-the-Move active state screen
- ❌ Countdown timer display for movement
- ❌ "Stop Movement" button

### Why This Approach

| **Alternative: Standalone Movement Mode** | **Selected: Task-Driven Movement** |
|---|---|
| User manually declares "I'm heading out" | User accepts task → movement is implied |
| User sets arbitrary availability window | Task deadline defines availability window |
| Movement expires independently | Movement ends with task completion |
| Separate "Stop Movement" action | Task action (complete/cancel) handles cleanup |
| Two parallel state systems | Single source of truth: task state |

## How Movement Works Now

### Backend State (Database)

The `users` table contains movement-related fields:

```sql
on_the_move      boolean  -- Derived from active task presence
direction        text     -- Not used (derived from task location)
move_expires_at  timestamptz  -- Derived from task deadline
```

**Important**: These fields are maintained by the task system, not by explicit user action.

### Task Lifecycle = Movement Lifecycle

| **Task State** | **Movement State** | **Visibility to Others** |
|---|---|---|
| No active task | `on_the_move = false` | Not visible |
| Request pending | `on_the_move = false` | Not visible |
| Task accepted | `on_the_move = true` | Visible on map |
| Task in_progress | `on_the_move = true` | Visible on map |
| Task completed | `on_the_move = false` | Not visible |
| Task cancelled | `on_the_move = false` | Not visible |

### Backend Logic

When a helper accepts a request (`POST /api/v1/requests/:requestId/accept`):

```typescript
// RPC function: accept_request
// Side effect: Sets user.on_the_move = true
```

When a task is completed (`POST /api/v1/tasks/:taskId/complete`) or cancelled:

```typescript
// RPC function: complete_task / cancel_task
// Side effect: Sets user.on_the_move = false for helper
```

## Discovery Flow

### For Requesters (Finding Helpers)

Requesters see helpers who:
1. Have an active task
2. Task status is `accepted` or `in_progress`
3. Are within the requester's radius

API call:
```http
GET /api/v1/nearby/helpers?lat=33.4484&lng=-112.0740
```

Response includes:
- Helper profile (name, photo)
- Current task (description, tip amount)
- Distance from requester
- Estimated arrival (if task in_progress)

### For Helpers (Accepting Tasks)

Helpers see incoming requests in `ActiveTask` screen (`/task`):

1. List of pending requests
2. Accept button triggers:
   - Request → Task conversion
   - `on_the_move = true` set automatically
   - Helper appears on requesters' maps
3. Decline or cancel → `on_the_move = false`

## UI Implementation

### Current Implementation

**Home.tsx**:
- Shows broadcasts (community announcements)
- Shows map/list of broadcasts
- No movement-specific controls

**ActiveTask.tsx**:
- Shows pending requests
- Shows active task details
- Task actions (Start, Complete, Cancel)
- No movement mode toggle needed

### No Additional Screens Needed

All movement UI is already present in existing screens:

| **Original Spec Screen** | **Implemented As** |
|---|---|
| "Go On the Move" screen | Accept request in ActiveTask.tsx |
| Direction selector | Implicit (task location defines direction) |
| Time window selector | Task deadline defines availability |
| On-the-Move active state | Task in_progress state |
| Countdown timer | Task completion status |
| "Stop Movement" button | Cancel/Complete task buttons |

## Broadcast vs. Movement

### Broadcast System (Community-Wide)

```
User creates broadcast
↓
Broadcast visible to all in neighborhood
↓
Interested users respond
↓
User selects response → Creates request → Creates task → Movement begins
```

### Movement (Task-Driven)

```
Helper receives incoming request
↓
Helper accepts request
↓
Task created → Helper becomes "on the move" (visible to others)
↓
Helper completes task → Movement ends
```

**Key Difference**:
- Broadcasts are **intent declarations** ("I have a truck, free for 2 hours")
- Movement is **task execution state** ("I'm currently helping Neighbor X with task Y")

## Future Considerations

### Phase Two+ Possibilities

If standalone movement mode becomes valuable (e.g., "I'm going to the grocery store, open to pickup requests"), it can be added as:

1. Separate `movement_mode` state from `task_state`
2. New "Go On the Move" screen
3. Explicit direction/time selection
4. Movement expiration independent of tasks

### But Not Phase One

Phase One focuses on **task completion**. Movement is a side effect of task acceptance, not a primary mode.

## Database Migration Notes

### Existing Fields (Not Removed)

The following fields remain in `users` table but are **derived from task state**:

```sql
-- users table
on_the_move      boolean  -- Set by RPC when task accepted/completed
direction        text     -- Unused (kept for future)
move_expires_at  timestamptz  -- Unused (kept for future)
```

### RPC Functions Maintain Consistency

```sql
CREATE FUNCTION accept_request(...)
RETURNS TABLE(task_request, task)
LANGUAGE plpgsql
AS $$
  -- Create task
  -- Set helper.on_the_move = true
$$;

CREATE FUNCTION complete_task(task_id uuid)
RETURNS void
LANGUAGE plpgsql
AS $$
  -- Mark task completed
  -- Set helper.on_the_move = false
$$;
```

## Summary

| **Question** | **Answer** |
|---|---|
| Do users manually go "on the move"? | No, movement is automatic when task accepted |
| Is there a movement screen? | No, ActiveTask screen handles this |
| Do users set movement duration? | No, task deadline defines availability |
| Can movement end independently of task? | No, movement ends with task |
| Can users see themselves "on the move"? | No, visibility is for other requesters only |
| Are movement-specific screens needed? | No, existing task screens suffice |

## Implementation Checklist

### ✅ Completed
- Task acceptance sets `on_the_move = true`
- Task completion sets `on_the_move = false`
- Nearby helpers API filters by active task
- Map shows helpers with active tasks

### ❌ Not Required (Phase One)
- "Go On the Move" screen
- Direction selector
- Time window selector
- Movement countdown display
- Stop movement button
- Movement-specific UI components

## References

- Original spec: `file 'Neighborgigs Docs/Docs/Phase_One/screens.md'`
- API endpoints: `file 'Neighborgigs Docs/Docs/Phase_One/api-endpoints.md'`
- Database schema: `file 'neighborgigs/db/migrations/001_initial_schema.sql'`
- ActiveTask screen: `file 'neighborgigs/src/pages/ActiveTask.tsx'`
