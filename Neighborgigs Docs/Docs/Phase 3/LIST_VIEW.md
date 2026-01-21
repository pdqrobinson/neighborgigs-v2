# Phase 3 — Broadcast List View (Discovery)

## Purpose

Phase 3 introduces a **map-adjacent list view** that cleanly displays all active broadcasts within a **50-mile radius**, optimized for:

- Fast scanning

- Trust at a glance

- “Worth it or not” decisions in under 3 seconds

This view is **read-only** and **non-committal**.\
No accepting, no messaging, no wallet logic here.

Think:

> “What’s happening around me right now?”

---

## Core Principles

1. **Local first**

   - Distance matters more than anything else

2. **Effort vs reward clarity**

   - Price, distance, and task type visible immediately

3. **Low cognitive load**

   - No walls of text

4. **No pressure**

   - Browsing ≠ committing

---

## Scope (Phase 3 Only)

### Included

- Active broadcasts within 50 miles

- Distance-aware sorting

- Basic filtering

- Clear expiration signals

### Explicitly Excluded

- Accepting a broadcast

- Messaging

- AI suggestions

- Wallet balances

- Escrow or payouts

- Map interactions (optional later)

---

## Data Source

### Canonical Table

`broadcast_requests`

This view **does not** query `task_requests`.

Why:

- Broadcasts represent *opportunities*

- Tasks represent *commitments*

---

## Backend Contract

### Endpoint

```markdown
GET /api/v1/broadcasts
```

### Required Query Params

| Param | Type | Description |
| --- | --- | --- |
| `lat` | number | User latitude |
| `lng` | number | User longitude |

### Optional Params

| Param | Default | Description |
| --- | --- | --- |
| `radius_miles` | 50 | Max distance |
| `limit` | 50 | Max results |
| `broadcast_type` | all | need_help / offer_help |

---

## Server-Side Filtering Rules

A broadcast is returned **only if**:

- `task_request_id IS NULL` (not yet claimed)

- Not expired (`created_at + expires_minutes > now`)

- Distance ≤ 50 miles

- Status = `sent`

Distance is calculated server-side using lat/lng (Haversine or PostGIS).

---

## Sorting Priority (In Order)

1. **Closest first**

2. **Soonest expiration**

3. **Higher offer_usd** (secondary signal)

This matches real-world helper behavior:

> “What’s nearby, still available, and worth it?”

---

## Broadcast List Item (UI Spec)

Each broadcast row/card must show **only what matters**:

### Required Fields

- **Task message** (1–2 lines max, truncate)

- **Offer amount** (`$12`)

- **Distance** (`2.4 mi`)

- **Time remaining** (`~18 min left`)

- **Task type badge**

  - “Needs help”

  - “Offering help”

### Optional (if available)

- Requester photo

- First name

### Explicitly Hidden

- Exact address

- Full requester profile

- Any wallet info

Privacy first.

---

## Visual Hierarchy (Critical)

Top → Bottom priority:

1. **Offer ($)**

2. **Distance**

3. **Task summary**

4. **Time remaining**

If someone scrolls fast, they should still catch:

> “$15 · 3 miles · Grocery pickup · 25 min left”

---

## Empty States

### No broadcasts nearby

> “Nothing nearby right now.\
> Check back later — neighbors post throughout the day.”

Optional CTA:

- “Post your own broadcast”

---

## Edge Cases

### Expiring soon

- Subtle warning color or icon

- No blocking

### Broadcast disappears while viewing

- Silently removed from list

- No error toast

This keeps the experience calm, not transactional.

---

## Performance Notes

- Results cached briefly (e.g., 15–30s)

- Pagination over infinite scroll (Phase 3)

- No real-time subscriptions yet

---

## Analytics (Phase 3 Only)

Track:

- List impressions

- Broadcast taps

- Distance vs tap rate

- Offer_usd vs tap rate

Do **not** track:

- Scroll depth aggressively

- “Missed opportunities”

This is discovery, not pressure.

---

## Phase 3 Success Criteria

Phase 3 is successful if:

- Helpers can decide “yes/no” in under 5 seconds

- No confusion about what’s being offered

- Users trust that what they see is:

  - Nearby

  - Available

  - Real

If helpers feel overwhelmed, Phase 3 failed.