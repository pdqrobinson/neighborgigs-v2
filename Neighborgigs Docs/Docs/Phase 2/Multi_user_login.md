# Phase 2 — Multi-User Login (Simulation Mode)

## Status

**Phase 2 — Internal / Preview Only**

This login system exists to:

- Simulate real multi-user interactions

- Test broadcasts, responses, and messaging

- Observe behavior before real authentication is introduced

🚫 **This is not production authentication**

---

## Purpose

Phase 2 requires the ability to:

- Log in as different users

- Switch roles (requester ↔ helper)

- Observe bidirectional interactions:

  - Broadcast → Response

  - Accept → Active Task

  - User-to-user messaging

The Phase 2 login page enables **intentional identity switching** without real auth complexity.

---

## Core Principle

> Phase 2 login is **identity selection**, not authentication.

No passwords.\
No security promises.\
No persistence guarantees.

---

## Login Page Behavior

### Entry Point

- `/login` (Phase 2 only)

- Automatically redirects if a user is already selected

---

### UI Layout

```markdown
Choose a test account

[ 👤 Sarah (Requester) ]
Posts broadcasts, reviews responses

[ 👤 Mike (Helper) ]
Responds to broadcasts, accepts tasks

──────────────
Advanced
[ Clear session ]
```

---

### Interaction Rules

- Clicking a user:

  - Sets active user context

  - Clears preview state

  - Redirects to Home

- No confirmation modal

- Switching users is instant

---

## Dummy Accounts (Phase 2 Seed Data)

### Account A — Requester

```markdown
{
  "id": "user_requester_001",
  "name": "Sarah Parker",
  "email": "sarah@test.local",
  "role": "requester",
  "avatar_url": "/avatars/sarah.png"
}
```

**Primary use cases:**

- Create broadcasts

- View responses

- Accept helpers

- Message responders

---

### Account B — Helper

```markdown
{
  "id": "user_helper_001",
  "name": "Mike Rodriguez",
  "email": "mike@test.local",
  "role": "helper",
  "avatar_url": "/avatars/mike.png"
}
```

**Primary use cases:**

- View broadcasts

- Respond to broadcasts

- Message requester

- Become active helper on accept

---

## Session Model (Phase 2)

### Client-Side Only

```markdown
session {
  user_id
  name
  role
  is_preview: true
}
```

- Stored in memory or localStorage

- Cleared on refresh or explicit logout

- Never trusted by backend for security

---

## Backend Behavior (Phase 2)

- Backend accepts `user_id` from session context

- No JWT verification

- No password checks

- All requests assume **trusted preview mode**

⚠️ Backend routes **must remain preview-guarded**

---

## Switching Between Users

### Why This Matters

To test:

- Broadcast creator vs responder

- Messaging between two real users

- Accept flow transitions

- UI state correctness

---

### Switching Flow

1. User clicks **Clear session**

2. Redirects to `/login`

3. Selects another dummy account

4. App reloads with new identity

No data is wiped.\
Drafts persist only if same browser session is used.

---

## UX Guardrails

- Preview banner always visible

- Active user displayed in header:

  ```markdown
  Logged in as: Sarah (Preview)
  
  ```

- Clear Session button always accessible

---

## Explicit Non-Goals (Phase 2)

This login system does **not**:

- Validate credentials

- Enforce permissions

- Protect user data

- Support real users

- Persist sessions across devices

Those are Phase 3+ concerns.

---

## Phase Progression

| Phase | Auth Capability |
| --- | --- |
| Phase 1 | Single preview user |
| **Phase 2** | Manual user switching |
| Phase 3 | Real auth (OTP / magic link) |
| Phase 4 | Identity verification |

---

## Why This Is the Correct Approach

- Enables full interaction testing

- Removes auth friction during iteration

- Prevents premature security decisions

- Keeps Phase 2 focused on **behavior**

This mirrors how mature teams prototype multi-user systems.