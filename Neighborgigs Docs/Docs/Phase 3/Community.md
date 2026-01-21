# Phase 3 — Community Message Board (Zip-Code Targeted)

## Status

**Phase 3 — Targeted Community Layer**

This feature is introduced **after**:

- Broadcasts are stable

- User-to-user messaging exists

- Multi-user login is implemented

- Trust basics are established

---

## Purpose

The Community Message Board provides a **lightweight, location-aware discussion space** for neighbors.

It is **not**:

- A global forum

- A social network

- A replacement for broadcasts

It exists to support:

- Local awareness

- Soft coordination

- Community trust

---

## Core Principle

> **Relevance beats reach.**

Messages should feel like:

- “People around me”

- “Things that matter here”

- “Helpful context, not noise”

---

## Targeting Strategy: Zip Code (Primary)

### Why Zip Code (and not radius)?

Zip codes:

- Are easy for users to understand

- Are stable (unlike GPS drift)

- Map cleanly to neighborhoods

- Avoid edge-case math

- Are familiar in U.S. mental models

Zip codes are **good enough** for Phase 3.

---

## User Association

Each user has **one primary zip code**:

```markdown
user {
  id
  name
  zip_code
}
```

- Set during onboarding

- Editable later (with limits)

- Used for default targeting

---

## Board Structure

### One Board Per Zip Code

Conceptually:

```markdown
Community Board
└── Zip Code: 85281
    ├── Post 1
    ├── Post 2
    └── Post 3
```

Users only see:

- Posts from their zip code

- Or nearby zips (optional expansion)

---

## Post Types (Keep This Tight)

Supported post types:

- 🗣 **General**

- 🚧 **Heads up / FYI**

- 🙋 **Looking for help**

- 💬 **Discussion**

No selling.\
No services.\
No links spam (Phase 3).

---

## Creating a Post

### Required Fields

```markdown
community_post {
  id
  author_id
  zip_code
  title
  body
  type
  created_at
}
```

Rules:

- Title required

- Body max length enforced

- Zip code auto-filled from user

Users **cannot** post outside their zip by default.

---

## Viewing the Board

### Default View

When a user opens the board:

- They see posts from **their zip code**

- Sorted by newest

- No algorithmic ranking (yet)

Header shows:

```markdown
Community · 85281
```

---

### Optional Expansion (Phase 3.5)

User may opt into:

- Adjacent zip codes

- “Nearby” view

This is **opt-in**, not default.

---

## Interaction Rules

### Allowed

- Read posts

- Comment

- Reply

- Like (optional)

### Not Allowed (Phase 3)

- Direct messaging from board

- Anonymous posts

- Polls

- Media uploads

Keep the board calm and readable.

---

## Moderation & Safety (Minimal but Real)

Phase 3 moderation strategy:

- Report post

- Soft delete

- Admin review

No automated moderation yet.

All posts are tied to real user identities.

---


## Relationship to Broadcasts

Important distinction:

| Feature | Purpose |
| --- | --- |
| Broadcasts | Immediate, task-based |
| Community Board | Ambient, informational |

Examples:

- “Anyone else notice Target shelves empty?”

- “FYI road closed on Main St”

- “Is Costco busy on Sundays?”

Broadcasts stay transactional.\
The board stays conversational.

---

## Why This Doesn’t Turn Into Noise

Because:

- Zip codes cap audience size

- No global feed

- No viral mechanics

- No reshares

- No follower graph

This is **local-first by design**.

---

## Phase Boundaries (Explicit)

| Phase | Capability |
| --- | --- |
| Phase 2 | Direct messaging |
| **Phase 3** | Zip-based board |
| Phase 4 | Trust-weighted visibility |
| Phase 5 | Cross-zip discovery |

---

## Explicit Non-Goals

This feature will **not**:

- Replace Facebook Groups

- Support marketplace listings

- Enable anonymous posting

- Become a chat room

- Show ads