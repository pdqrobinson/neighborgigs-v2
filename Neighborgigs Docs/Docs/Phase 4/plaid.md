# NeighborGigs — Plaid Integration (Phase 4)

## Status

**Planned (Phase 4)**\
*Not required for MVP, Phase 1, Phase 2, or Phase 3*

---

## Purpose

Plaid is used to **verify and connect bank accounts** for helpers **only when NeighborGigs enables real money payouts**.

Plaid is **not** used for:

- Broadcast creation

- Price offers

- Escrow holds

- Payments in Phase 1–3

- Identity verification

- Credit checks

Plaid exists solely to:

> Safely link a helper’s bank account so completed earnings can be paid out.

---

## Why Plaid Is Phase 4 (Not Earlier)

Plaid introduces:

- Financial compliance concerns

- Bank account handling

- UX friction

- Support overhead

None of that is required until:

- Money actually moves

- Helpers have balances

- Payouts are real

Until then, it is **dead weight**.

---

## Dependency Chain (Non-Negotiable)

Plaid **must not** be implemented until **all of the following exist**:

1. Wallet system (authoritative balances)

2. Escrow / pending funds logic

3. Completion confirmation flow

4. Dispute handling (even if minimal)

5. Stripe (or equivalent) as payment rail

Plaid is the **last mile**, not the foundation.

---

## Scope of Plaid Integration

### What Plaid Will Do

- Allow helpers to securely link a bank account

- Return a verified `bank_account_token`

- Enable ACH payouts via Stripe (or equivalent)

### What Plaid Will NOT Do

- Move money

- Hold balances

- Decide payouts

- Validate identity beyond bank ownership

- Replace Stripe or wallets

---

## User Flow (Phase 4)

### Helper Onboarding → Payout Setup

1. Helper navigates to **Earnings → Payouts**

2. App checks:

   - Has helper earned money?

   - Is payout feature enabled?

3. Helper clicks **“Link Bank Account”**

4. Plaid Link modal opens

5. Helper selects bank + authenticates

6. App receives `public_token`

7. Backend exchanges for `access_token`

8. Bank account is marked **verified**

9. Helper is now eligible for payouts

No bank data is stored directly.

---

## Data Model (Phase 4)

```markdown
payout_account: {
  user_id: string
  provider: 'plaid'
  plaid_item_id: string
  status: 'linked' | 'errored' | 'unlinked'
  created_at: string
}
```

Sensitive tokens are:

- Encrypted

- Server-side only

- Never exposed to frontend

---

## Security & Compliance Notes

- Plaid Link is embedded via official SDK

- No credentials touch NeighborGigs servers

- Tokens are stored encrypted at rest

- Access is limited to payout execution only

---

## Failure & Recovery

Supported scenarios:

- Bank link fails → retry

- Bank account closed → relink

- Payout fails → funds remain in wallet

No funds are lost due to Plaid errors.

---

## Feature Gating

Plaid-related UI is hidden unless:

- User is a helper

- Wallet balance &gt; $0

- Payouts feature flag is enabled

This avoids confusing users before payouts exist.

---

## Why Plaid (When the Time Comes)

Plaid is chosen because:

- Industry standard

- Trusted by users

- Integrates cleanly with Stripe

- Handles bank complexity NeighborGigs should never touch

But again — **only when needed**.

---

## Explicit Non-Goals

This integration will **not**:

- Enable instant payouts in early phases

- Support crypto wallets

- Handle international banking initially

- Replace tax reporting tools

Those are separate Phase 5+ discussions.

---

## Phase Placement Summary

| Phase | Money Capability |
| --- | --- |
| Phase 1 | Offer amount only (no money moves) |
| Phase 2 | Escrow + wallet balances |
| Phase 3 | Disputes, refunds, trust expansion |
| **Phase 4** | **Plaid bank linking + payouts** |

✅ Plaid is **correctly placed in Phase 4**\
❌ Adding it earlier would slow you down and add risk