# Phase 2 Feature — Task-Based Status Tabs (User Home)

## Overview

Phase 2 introduces **task status tabs** on the User Home screen to let users explore and manage **tasks** in a safe, preview-enabled environment.

This phase focuses on **understanding task lifecycle and intent** without allowing irreversible execution.

---

## Phase 2 Objective (Task-Specific)

This feature exists to answer:

- Do users understand how tasks move through states?

- Can users easily tell what they should do next?

- Are task states intuitive or confusing?

- Where do users expect actions that are not yet enabled?

The goal is **clarity and insight**, not task execution.

---

## Task Tabs Introduced

The User Home screen displays four task-based tabs:

1. **Available**

2. **In Progress**

3. **Completed**

4. **Training**

Each tab represents a **conceptual task state**, not a final production state.

---

## Task Tab Definitions & Behavior

---

### 1️⃣ Available Tasks

**Definition**\
Tasks the user *can* start or engage with.

**Examples**

- Open tasks

- Unclaimed tasks

- Tasks ready to begin

**Phase 2 Behavior**

- Tasks are viewable

- Primary CTAs are visible

- Starting a task creates a **draft or preview assignment**

**Allowed**

- View task details

- “Start task” (creates preview state)

- Navigate task steps

**Blocked**

- Final assignment

- Payments

- Real-world commitments

**Insight Gained**

- Which tasks attract attention

- Whether CTAs are clear

- Where users hesitate before starting

---

### 2️⃣ In Progress Tasks

**Definition**\
Tasks the user has started but not completed.

**Phase 2 State**

- Draft or preview-only tasks

- Resume-friendly

**Allowed**

- Edit task details

- Move through steps

- Save progress

**Blocked**

- Final completion

- Status transitions beyond preview

- Any irreversible confirmation

**Insight Gained**

- Where tasks stall

- Step friction

- Resume behavior vs abandonment

---

### 3️⃣ Completed Tasks

**Definition**\
Tasks that appear finished from the user’s perspective.

**Important**\
In Phase 2, **completed does not mean executed in production**.

**What Appears Here**

- Dry-run completions

- Demo-completed tasks

- Preview-completed tasks

**Allowed**

- View task summaries

- Review outcomes

**Blocked**

- Re-triggering actions

- Payouts, confirmations, or receipts

**Insight Gained**

- Does “done” feel complete?

- Are task summaries sufficient?

- Do users understand completion meaning?

---

### 4️⃣ Training Tasks

**Definition**\
Tasks designed to teach users how the system works.

**Purpose**

- Build confidence

- Explain task lifecycle

- Reduce confusion elsewhere

**Contents**

- Sample tasks

- Walkthrough tasks

- Tooltips and guidance

**Allowed**

- Full interaction

- No real-world impact

**Insight Gained**

- Where education is needed

- Which concepts confuse users

- Whether training reduces errors in other tabs

---

## Task State Model (Phase 2)

Phase 2 uses **non-authoritative task states**.

Example internal states:

- `available`

- `preview_started`

- `preview_in_progress`

- `preview_completed`

- `training`

No Phase 2 task may transition into a **production-final** state.

---

## Safety Rules (Global)

Applied to **all task actions**:

- All writes are preview-scoped

- No task completion triggers real effects

- Backend blocks irreversible transitions

- UI may simulate success

- All events tagged `[preview]`

---

## UX Rules (Required)

- Tabs must clearly represent task state

- Preview mode must be visible

- Blocked actions must explain *why*

- Empty states must be intentional

**Example blocked message**

> “This task can’t be finalized in preview mode. You can explore the full flow, but no real actions will occur.”

---

## Gigs Screen

### Overview

A dedicated screen where users can view **all their gigs** (past and active) in one place. This uses the `gigs_view` from the ERD to provide a unified view of request + task data.

### gigs_view Definition (from ERD)

```sql
CREATE OR REPLACE VIEW gigs_view AS
SELECT
  tr.id as request_id,
  tr.user_id as requester_id,
  tr.offer_usd,
  tr.status as request_status,
  tr.created_at as request_created_at,
  tr.expires_at,
  t.id as task_id,
  t.helper_id,
  t.status as task_status,
  t.completed_at
FROM task_requests tr
LEFT JOIN tasks t ON t.task_request_id = tr.id;
```

### Query Examples (Filtered by Current User)

**Active Gigs (Helper)**

```sql
SELECT *
FROM gigs_view
WHERE helper_id = :current_user_id
  AND task_status IN ('accepted', 'in_progress')
ORDER BY task_created_at DESC;
```

**Past Gigs (Helper)**

```sql
SELECT *
FROM gigs_view
WHERE helper_id = :current_user_id
  AND task_status = 'completed'
ORDER BY completed_at DESC;
```

**Requested Gigs (Requester)**

```sql
SELECT *
FROM gigs_view
WHERE requester_id = :current_user_id
ORDER BY request_created_at DESC;
```

**Pending Requests (Not Yet Accepted)**

```sql
SELECT *
FROM gigs_view
WHERE requester_id = :current_user_id
  AND task_id IS NULL
  AND request_status = 'active'
ORDER BY request_created_at DESC;
```

### UI Considerations

**Gig Cards Should Display:**

- **Title** (from `task_requests`)

- **Offer Amount** (`offer_usd`)

- **Status Badge** (derived from `request_status` + `task_status`)

- **Created Date** (for pending) or **Completed Date** (for past)

- **Other User** (requester or helper, depending on context)

- **Gig Type** tag (helper vs requester)

**Status Logic:**

- **Active** = `task_status` = `accepted` OR `in_progress`

- **Completed** = `task_status` = `completed`

- **Pending** = `task_id` is NULL + `request_status` = `active`

- **Expired** = `request_status` = `expired`

- **Cancelled** = `request_status` = `cancelled`

**Empty States:**

- **No active gigs**: "You don't have any active gigs yet. Browse available tasks to get started."

- **No past gigs**: "No completed gigs yet. Your completed gigs will appear here."

- **No requested gigs**: "You haven't posted any tasks yet. Click the + button to create a task."

### Phase 2 Considerations

- **Preview Mode**: All actions in preview mode should show clear indicators

- **Safety**: No real payments or completions

- **Analytics**: Track which gig states users view most, time spent, and interaction patterns

- **Data Consistency**: Ensure UI reflects the true state from the database view

### TypeScript DTO Example

```typescript
interface Gig {
  request_id: string;
  requester_id: string;
  offer_usd: number;
  request_status: 'active' | 'cancelled' | 'expired';
  request_created_at: string;
  expires_at: string | null;
  task_id: string | null;
  helper_id: string | null;
  task_status: 'accepted' | 'in_progress' | 'completed' | null;
  completed_at: string | null;
  
  // Derived fields for UI
  status: 'pending' | 'active' | 'completed' | 'expired' | 'cancelled';
  display_type: 'helper' | 'requester';
}
```

---

## Task State Model (Phase 2)

Phase 2 uses **non-authoritative task states**.

Example internal states:

- `available`

- `preview_started`

- `preview_in_progress`

- `preview_completed`

- `training`

No Phase 2 task may transition into a **production-final** state.

---

## Safety Rules (Global)

Applied to **all task actions**:

- All writes are preview-scoped

- No task completion triggers real effects

- Backend blocks irreversible transitions

- UI may simulate success

- All events tagged `[preview]`

---

## UX Rules (Required)

- Tabs must clearly represent task state

- Preview mode must be visible

- Blocked actions must explain *why*

- Empty states must be intentional

**Example blocked message**

> “This task can’t be finalized in preview mode. You can explore the full flow, but no real actions will occur.”

---

## Analytics & Learning Signals

Phase 2 task analytics focus on:

- Task views by tab

- Starts from Available → In Progress

- Resume vs abandon rates

- Time spent per task

- Blocked completion attempts

- Training task usage

These signals inform Phase 3 readiness.