Got it. Tight, explicit, **Phase One only**.\
No future talk. No “later”. No exclusions list. Just what **exists** and must ship.

---

# NeighborGigs — Phase One Definition

## Phase One Goal

**Prove that neighbors will successfully complete real-time, hyperlocal tasks with strangers using a map-first experience.**

If Phase One works, everything else becomes optional.\
If it doesn’t, nothing else matters.

---

## Phase One User Capabilities

### 1. Account & Identity

- Demo user is bootstrapped silently (no auth UI)

- Set first name and profile photo

- Phone number is optional profile metadata only (not used for auth)

- Basic profile view (self only)

---

### 2. Location & Neighborhood

- Location permission required to proceed

- Neighborhood is assigned automatically on first app open (or default if location denied)

- User selects a radius (1–3 miles)

- Only activity within neighborhood + radius is visible

---

### 3. Home Experience (Map-First)

- Home screen is a map centered on user location

- Radius ring visible

- Live pins representing **people currently on the move**

- Pins only appear when a user is actively on the move

- Map and list views show the same data

- Toggle between map and list view

---

### 4. Going On the Move

- User can mark themselves “on the move”

- Select:

  - Direction (going out or heading home)

  - Time window (e.g., 30–120 minutes)

- User becomes visible on the map/list during this time

---

### 5. Discovering Help

- Users can view nearby on-the-move neighbors

- Pins/list items show:

  - First name

  - Profile photo

  - Distance

  - Direction

  - Time remaining

---

### 6. Requesting Help

- User can send a request to an on-the-move neighbor

- Request includes:

  - Short text description

  - Suggested tip (preset amounts)

- Request is delivered in real time

---

### 7. Accepting & Completing Tasks

- On-the-move user can accept a request

- Task enters active state

- On completion, helper marks task complete

- Optional photo proof supported

---

### 8. Wallet (USD Only)

- Each user has a NeighborGigs wallet

- Wallet tracks:

  - Pending balance

  - Available balance

- Earnings are credited upon task completion

- Simple wallet activity history visible

---

### 9. Withdrawals

- User can request a withdrawal from available balance
- Withdrawals are synchronous in Phase 1
- On request, funds are immediately debited and operation returns success/failure in the same response
- No pending/processing states


---

### 10. Notifications

- Push notifications for:

  - New requests

  - Accepted requests

  - Task completion

  - Wallet updates

---

### 11. Broadcast Money Model (Phase 1)

**Phase 1 Goal (Locked In)**

A broadcast is submitted with a clear price attached so helpers can instantly decide if it's worth it.

That's it. No money actually moves in Phase 1.

**Phase 1 Money Model (Simple on Purpose)**

What exists:
- A price tag on the broadcast (`offer_usd` field)
- Clear expectations for helpers
- Future compatibility with escrow (schema ready for Phase 2)

What does NOT exist (yet):
- Wallet balances for broadcasts
- Holding funds
- Automatic payouts
- Disputes
- Tips logic on broadcasts
- Financial compliance checks (no escrow, no money handling)

**Broadcast Payload Example:**
```json
{
  "type": "pickup",
  "title": "Need one item from Target",
  "description": "Just need paper towels",
  "pickup_location": {...},
  "offer_usd": 15
}
```

**Validation Rules:**
- `offer_usd` must be integer (whole dollars only)
- Minimum: $5
- Maximum: $50
- Server-side validation enforced
- Phase 1 only: UI allows any integer within range

**Product Impact:**
- Sets value expectations instantly
- Filters helpers by price sensitivity
- Makes broadcasts feel real and actionable

**Technical Impact:**
- One column (`offer_usd`) on `task_requests` table
- One validation rule (server-side check)
- Zero financial compliance complexity

**Legal Impact:**
- No escrow = no fiduciary responsibility
- No money handling = no classification issues
- Clear signaling = transparent expectations

---

### 12. Support & Help

- (Removed from Phase 1 - moved to Phase 2)

---

## Phase One Success Definition

Phase One is considered successful when:

- Users go on the move

- Requests are sent

- Tasks are completed

- Money is earned and withdrawn

- Users return to repeat the behavior

No vanity metrics. Only completed loops.

---

## Phase One Artifacts (What Must Exist)

- Mobile app (iOS/Android or equivalent)

- Backend with:

  - User state

  - Location tracking

  - Task state machine

  - Wallet ledger

- Admin visibility for monitoring activity and payouts

---

## Phase One Lock Statement

> **Phase One ships when a neighbor can open the app, see someone nearby, request help, get it done, and get paid — without explanation.**