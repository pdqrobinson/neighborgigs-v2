# Phase 2 — Account Settings (Task-Oriented, Preview-Safe)

**Context:** Phase 2 Account Settings runs after Phase 1 is stable and publicly viewable. Phase 1 establishes read-only preview guards, notifications toggle, type consolidation, and service role key security. Phase 2 adds controlled interaction on settings to learn from real user behavior.

---

## Purpose

Phase 2 enables users to **navigate and understand Account Settings** while preventing **irreversible or trust-sensitive changes**.

Users can explore, review, and partially interact with settings to validate:

- Clarity

- Expectations

- Mental models

The goal is **insight**, not execution.

---

## Account Settings Items (Phase 2 Behavior)

Each section below corresponds directly to the UI shown.

---

## 1. Personal Information

**Name, email, phone number, and documents**

### Phase 2 Behavior

**View-first, limited edit**

### Allowed

- View all personal info fields

- Edit **non-auth fields**:

  - Display name

  - Optional profile metadata

- Upload preview documents (non-final)

### Blocked

- Email change

- Phone number change

- Identity document submission

- Verification triggers

### Insight Gained

- What users expect to edit

- Whether field labels are clear

- Which identity fields cause hesitation

---

## 2. Background Check

**Download your background check**

### Phase 2 Behavior

**View-only**

### Allowed

- View status

- See expiration date

- Download *sample* or redacted report

### Blocked

- Initiating a new background check

- Re-verification

- Third-party submission

### Insight Gained

- Whether users understand compliance requirements

- How much reassurance this section provides

---

## 3. Password

**Change your password**

### Phase 2 Behavior

**Visible but blocked**

### Allowed

- View password rules

- View security explanation

### Blocked

- Password change

- Reset triggers

- Auth mutations

### UX Requirement

Blocked with clear explanation:

> “Password changes are disabled in preview mode.”

### Insight Gained

- How often users attempt credential changes

- Whether placement is intuitive

---

## 4. Licenses

**Your licenses to take pictures**

### Phase 2 Behavior

**Preview upload & review**

### Allowed

- View license requirements

- Upload sample license images

- See validation hints

### Blocked

- Final submission

- Verification

- Approval state change

### Insight Gained

- Upload friction

- Documentation clarity

- Confusing requirements

---

## 5. Bank Account

**Your funds receipt account**

### Phase 2 Behavior

**View-only (Critical)**

### Allowed

- View bank account status (masked)

- See explanation of payout flow

### Blocked (Hard Stop)

- Add bank account

- Edit bank details

- Verification

- Payout configuration

### UX Copy Example

> “Bank details can’t be updated in preview mode. No funds will move from this environment.”

### Insight Gained

- When users look for payouts

- Trust expectations

- Onboarding timing issues

---

## 6. Help

**Need help?**

### Phase 2 Behavior

**Fully enabled**

### Allowed

- Browse help articles

- View FAQs

- Read onboarding guides

### Insight Gained

- Where users get stuck

- Which articles are actually useful

---

## 7. Support Chat

**Talk to us directly**



### Phase 2 Behavior

**Preview-safe channel**

### Allowed

- Open chat

- Submit preview questions

### Backend Handling

- Tagged as `[preview]`

- Routed to test or internal inbox

- No production escalations

### Insight Gained

- Common confusion points

- Repeated questions = UX debt

---

## 8. Send Feedback

**Suggestions or complaints**

### Phase 2 Behavior

**Fully enabled**

### Allowed

- Submit feedback

- Attach screenshots

- Context auto-captured

### Insight Gained

- Unfiltered user sentiment

- Priority issues surfaced early

---

## 9. Terms of Use

### Phase 2 Behavior

**View-only**

### Allowed

- Read current terms

### Blocked

- Acceptance flows

- Version locking

---

## 10. Participation Agreement

### Phase 2 Behavior

**View-only**

### Allowed

- Read agreement

- Learn obligations

### Blocked

- Signature

- Legal acceptance state change

---

## Global Phase 2 Safety Rules (Account Settings)

- No auth-level mutations

- No financial changes

- No legal acceptance

- No verification triggers

- All writes are preview-scoped

- All blocked actions explain *why*

---

## Analytics Captured (Phase 2)

Track:

- Section visits

- Blocked action attempts

- Most-clicked disabled items

- Time per section

- Feedback submitted from settings

These metrics directly inform Phase 3 unlock order.

---

## Phase 2 Exit Criteria — Account Settings

Account Settings are considered validated when:

- Users find expected sections without help

- Blocked actions match expectations

- Most interaction happens in allowed sections

- Support requests about “why can’t I do X” decline

---

## TL;DR (Plan Version)

> Phase 2 Account Settings allow users to explore and partially interact with profile, security, and payout-related settings in preview mode.\
> Sensitive actions are visible but blocked with clear explanations.\
> The goal is to validate clarity, trust signals, and user expectations before enabling real account changes.