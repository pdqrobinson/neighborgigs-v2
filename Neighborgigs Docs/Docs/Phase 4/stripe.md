# NeighborGigs — Stripe Integration (Phase 4 Only)

## Status

**Phase 4 — Real Money & Payouts**\
🚫 Not used in Phase 1–3

---

## Purpose

Stripe is introduced in **Phase 4** to:

- Charge requesters real money

- Release escrowed funds

- Pay helpers via connected accounts

- Handle refunds when required

Stripe is **not** used to:

- Track balances

- Decide task state

- Validate completion

- Resolve disputes

- Act as a ledger

> **NeighborGigs Wallet is the system of record. Stripe only moves money.**

---

## Why Stripe Is Phase 4

Stripe is intentionally delayed until:

- Wallet math is proven

- Task lifecycle is stable

- Trust signals exist

- Disputes have rules

- Payout logic is deterministic

Adding Stripe earlier would:

- Increase legal exposure

- Slow iteration

- Obscure bugs with “real money noise”

---

## Stripe Product Stack Used

Using **Stripe** with:

- **PaymentIntents** – charging & holding funds

- **Manual capture** – escrow-style flow

- **Stripe Connect (Express)** – helper payouts

- **Webhooks** – event reconciliation

No Stripe Checkout (too rigid).

---

## Core Architecture Rule (Non-Negotiable)

```markdown
NeighborGigs Wallet  → Source of Truth
Stripe               → Execution Engine
```

If Stripe says “paid” but wallet says “pending”\
→ **wallet wins**

Stripe events **never mutate balances directly**.

---

## Phase 4 User Flows

---

### 1. Requester Payment (Charging)

**Trigger:** Requester submits a broadcast with real money enabled

**Backend Flow:**

1. Validate offer amount

2. Create Stripe PaymentIntent:

   - `amount = offer_usd`

   - `currency = usd`

   - `capture_method = manual`

3. Store `payment_intent_id` on broadcast

4. Authorize funds (not captured)

**Wallet Update:**

```markdown
pending_usd += offer_usd
```

Funds are **held**, not earned.

---

### 2. Helper Completes Task (Capture)

**Trigger:** Requester confirms completion

**Backend Flow:**

1. Validate task state

2. Capture PaymentIntent

3. On success:

   - Move funds from `pending` → `earned`

4. Funds now belong to helper

**Wallet Update:**

```markdown
pending_usd -= offer_usd
available_usd += offer_usd
```

---

### 3. Helper Payout (Stripe Connect)

Helpers must:

- Have a connected Stripe account

- Have a positive available balance

**Backend Flow:**

1. Create Stripe Transfer to helper account

2. Deduct wallet balance

3. Record payout transaction

**Wallet Update:**

```markdown
available_usd -= payout_amount
```

Stripe never determines “how much” — NeighborGigs does.

---

### 4. Refunds / Cancellations

If a task is cancelled **before completion**:

1. Cancel PaymentIntent

2. Release authorization

3. Wallet reverts pending funds

If cancelled **after capture**:

- Refund via Stripe

- Wallet reflects reversal

Refunds always flow:

> Wallet → Stripe → Customer

Never the other way around.

---

## Stripe Webhooks (Required)

Stripe webhooks are used **only** to confirm execution, never to decide state.

Handled events:

- `payment_intent.succeeded`

- `payment_intent.canceled`

- `charge.refunded`

- `transfer.paid`

- `transfer.failed`

Each webhook:

1. Verifies signature

2. Matches known transaction

3. Updates execution status only

---

## Data Model (Phase 4)

```markdown
stripe_payment: {
  payment_intent_id: string
  broadcast_id: string
  status: 'authorized' | 'captured' | 'canceled' | 'refunded'
}

stripe_payout: {
  user_id: string
  transfer_id: string
  amount_usd: number
  status: 'paid' | 'failed'
}
```

Sensitive Stripe IDs are **server-only**.

---

## Security & Compliance

- No card data touches NeighborGigs servers

- Stripe Elements or SDK only

- Webhooks verified with signing secret

- Idempotency keys used everywhere

---

## Explicit Non-Goals (Phase 4)

Stripe will NOT:

- Replace wallets

- Auto-resolve disputes

- Calculate earnings

- Handle taxes

- Support international payouts (yet)

Those are Phase 5+ topics.

---

## Phase Summary (Locked)

| Phase | Stripe Usage |
| --- | --- |
| Phase 1 | ❌ None |
| Phase 2 | ❌ None |
| Phase 3 | ❌ None |
| **Phase 4** | ✅ Charging, escrow, payouts |

This keeps:

- Early dev fast

- Risk isolated

- Money logic clean

---

## Final Recommendation

✔ Stripe only enters when money **actually moves**\
✔ Wallet always stays authoritative\
✔ Stripe never owns state\
✔ Phase boundaries remain hard

This is the **correct, boring, production-safe Stripe setup**.