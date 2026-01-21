# Phase 2 — Offer & Tip Model (Money Without Escrow)

## Purpose

Phase 2 introduces **real money movement** while preserving the “neighbor helping neighbor” feel.

The goals are:

- Honor the **offer** made in Phase 1

- Introduce **optional tips** (helper appreciation, not bidding)

- Keep accounting simple

- Avoid escrow, disputes, and chargebacks (for now)

This phase answers:

> “How does money actually move when a task is completed?”

---

## Phase 2 Mental Model

### Key distinction (do not blur this):

| Concept | Meaning | When Set | Who Sets |
| --- | --- | --- | --- |
| **Offer** | The amount promised upfront to get help | Phase 1 | Requester OR Helper |
| **Tip** | Optional bonus added *after* completion | Phase 2 | Requester only |

**Timeline:**
1. **Phase 1:** Requester sets `offer_usd` when requesting help OR Helper sets `offer_usd` when offering to help
2. **Phase 2:** Requester sets `tip_usd` after task is completed

Offer = expectation (part of the request)\
Tip = gratitude (part of completion)

They are **not interchangeable** and occur at different times in the workflow. Offer amounts are bidirectional - either party can attach a price when initiating contact.

---

## Canonical Money Rules (Phase 2)

1. **Offer is guaranteed**

   - If a task completes successfully, the helper gets the offer amount

2. **Tip is optional**

   - Zero is acceptable

   - Never required to complete a task

3. **Money moves only on completion**

   - No holds

   - No partial payouts

4. **Wallet is the record of truth**

   - No hidden balances

   - No derived math

---

## Data Model Changes

### 1️⃣ `task_requests` (already exists)

Phase 2 adds **one field**, keeps Phase 1 intact.

```markdown
offer_usd        // already exists (from Phase 1)
tip_usd          // NEW — nullable, default 0
```

**Rules**

- `offer_usd`: required, whole dollars

- `tip_usd`: optional, whole dollars, min 0, max configurable (e.g. $50)

---

### 2️⃣ Wallet Ledger (authoritative)

All money movement is written as **ledger entries**.

```markdown
ledger_entries {
  id
  wallet_id
  task_request_id
  type            // 'offer_payout' | 'tip_payout'
  amount_usd
  created_at
}
```

**No derived balances. Ever.**\
Wallet balance = sum(ledger entries).

---

## Phase 2 Flow (Happy Path)

### Step 1 — Task is accepted

- No money moves

- Offer is informational only

### Step 2 — Task is completed

- Helper uploads proof (optional)

- Requester confirms completion

### Step 3 — Completion confirmation screen (NEW UI)

Requester sees:

> “Your neighbor completed the task.”

UI elements:

- Offer amount (read-only)

- Tip selector (optional)

  - Presets: $0, $3, $5, $10

  - Custom amount allowed

### Step 4 — Payout executes

On confirmation:

1. Create **offer payout ledger entry**

2. If `tip_usd > 0`, create **tip payout ledger entry**

3. Update task status → `completed`

4. Wallet balance updates immediately

No delays. No holds.

---

## Phase 2 API Contracts

### Complete Task (Requester)

```markdown
POST /api/v1/tasks/:id/complete
```

Payload:

```markdown
{
  "tip_usd": 5,
  "proof_photo_url": "optional"
}
```

Server-side validation:

- Task belongs to requester

- Task status is `in_progress`

- `tip_usd` ≥ 0

- Helper exists

---

## UI Rules (Very Important)

### Offer Display

- Always visible

- Never editable in Phase 2

### Tip Display

- Optional

- Friendly language only

Good copy:

> “Want to add a thank-you tip?”

Bad copy:

> “Helpers expect tips”

---

## What Phase 2 Explicitly Does NOT Include

🚫 Escrow\
🚫 Partial refunds\
🚫 Disputes\
🚫 Auto-adjusted pricing\
🚫 Dynamic offers\
🚫 Tip bidding wars

If you feel tempted to add any of these, you are in **Phase 3 or 4 territory**.

---

## Failure Scenarios (Phase 2 Simplification)

| Scenario | Phase 2 Behavior |
| --- | --- |
| Requester disappears | Admin resolves manually |
| Helper claims false completion | Admin resolves |
| Tip regret | No reversal |
| Offer dispute | Out of scope |

This is intentional. Phase 2 optimizes **speed and trust**, not perfection.

---

## Analytics Introduced in Phase 2


Track:

- Offer vs completion rate

- Tip frequency

- Average tip amount

- Repeat helper rate

Do **not** surface tip stats publicly yet.

---

## Migration Summary

### Required

- Add `tip_usd` to `task_requests`

- Add ledger entry types

- Update completion endpoint

### Not Required

- Wallet holds

- New tables beyond ledger

- Broadcast changes

---

## Phase 2 Success Criteria

Phase 2 is successful if:

- Helpers trust they’ll get paid

- Requesters understand pricing clearly

- No one is confused about where money went

- Support requests stay low

If users ask:

> “Where’s my money?”

Phase 2 failed.

---

## One-Line Philosophy (Pin This)

> **Phase 2 pays neighbors. Phase 3 protects them.**