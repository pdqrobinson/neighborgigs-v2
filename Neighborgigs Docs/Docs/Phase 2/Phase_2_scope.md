---
**Cross-Reference:** See `Phase_2_INDEX.md` for complete Phase 2 documentation overview.
---
## Phase 2 (Plan Version)

**Phase 2 enables safe interaction with the preview.**\
Users can move through real flows, but **nothing irreversible is allowed**.\
The goal is **insight, not execution**.

**Context:** Phase 1 focuses on showing the product publicly without breaking anything. Phase 1 establishes:
- Read-only preview guards
- Notifications toggle
- Type consolidation
- Service role key security
- **Functional wallet UI** (pending/available balances, withdrawals in Phase 1)
- **Preview mode** that blocks wallet mutations and irreversible actions

Phase 2 begins after Phase 1 is stable and publicly viewable. Phase 2 adds controlled interaction to learn from real user behavior.

---

## Phase 1 vs Phase 2 Scope

### Phase 1 Capabilities (Existing)
- ✅ Read-only preview of all user flows
- ✅ Wallet screens with **stub balances** for UX
- ✅ Withdrawal UI (blocked in preview mode)
- ✅ Notifications toggle
- ✅ Location and neighborhood features
- ✅ Map-first experience

### Phase 2 Capabilities (New)
- ✅ Draft creation and editing
- ✅ "Fake submit" / dry-run submit
- ✅ Blocked final actions with clear explanation
- ✅ Click-through analytics on disabled actions
- ✅ Editable profile fields (non-critical only)
- ✅ Preference toggles (UI-only)
- ✅ Preview feedback collection
- ✅ Preview-only event logging

---

## Phase 2 Scope (What This Actually Means)

### ✅ Allowed

- Navigate full user flows end-to-end

- Enter data

- Save drafts / temporary state

- Trigger validations and errors

- Experience "almost real" UX

### 🚫 Not Allowed

- Payments (Phase 1 already has wallet UI, Phase 2 does not enable money movement)

- Final submits

- State transitions that can't be undone

- Emails, notifications, webhooks

- Background jobs

- Ledger / wallet changes beyond what Phase 1 allows

If it affects **money, trust, or permanence**, it stays off.

---

## Phase 2 Building Blocks

### 1️⃣ Phase 2 Feature Flags (Minimal Set)

You don’t need a framework—just intent.

Examples:

- `preview_allow_drafts`

- `preview_allow_profile_edit`

- `preview_allow_flow_walkthrough`

- `preview_block_finalize`

Rule:

> **Every allowed interaction must be explicitly enabled.**

Default is **blocked**.

---

### 2️⃣ Draft-State Model (The Safety Net)

Anything writable in Phase 2 must be **non-final by design**.

Patterns:

- `status = 'draft'`

- `is_preview = true`

- `submitted_at = null`

- `finalized_at = null`

Golden rule:

> If it can’t be finalized, it can’t hurt production.

---

### 3️⃣ “Blocked Action” UX Pattern

Let users try — then stop them **clearly**.

When a user hits a blocked action:

- Show *why* it’s blocked

- Explain it’s a preview

- Do **not** fail silently

Example copy:

> “This action is disabled in preview mode. You’re seeing the full flow, but no real changes are made.”

This turns confusion into confidence.

---

### 4️⃣ What You’re Measuring in Phase 2


Phase 2 is successful if you can answer:

- Where do users hesitate?

- What do they click expecting to work?

- Where does the flow feel wrong?

- What explanations are missing?

If you’re not learning something concrete, Phase 2 isn’t doing its job.

---

## Exit Criteria → Phase 3 Promotion

Move to Phase 3 **only if all are true**:

- Core flows are understood without explanation

- No surprise clicks on irreversible actions

- Draft model is stable

- Blocked actions are rare and intentional

- Team agrees on “this is better than prod”

Phase 3 is when **execution** begins.\
Phase 2 is where you **earn confidence**.

---

## One-Line Summary (If You Want It Even Shorter)

> Phase 2 lets users *experience* the new system without letting them *commit* anything.