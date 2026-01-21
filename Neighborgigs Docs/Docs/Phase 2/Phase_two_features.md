---
**Cross-Reference:** See `Phase_2_INDEX.md` for complete Phase 2 documentation overview.
---
# Phase 2 Feature Set (Safe, Interactive, Insight-Driven)

**Context:** Phase 2 begins after Phase 1 is stable and publicly viewable. Phase 1 establishes read-only preview guards, notifications toggle, type consolidation, and service role key security. Phase 2 adds controlled interaction to learn from real user behavior.

---

## Category A — Flow Completion (No Consequences)

These let users *finish* flows without finalizing anything.

### 1️⃣ Draft Creation & Editing

**What it gives you**

- Can users complete forms end-to-end?

- Where do they stall?

**How it works**

- Save as `status = 'draft'`

- No submit / no finalize

**Why it matters**\
If users can’t finish a draft, they’ll never submit in prod.

---

### 2️⃣ “Fake Submit” / Dry-Run Submit

**What it gives you**

- Tests copy, validation, confirmation screens

- Reveals missing context

**Behavior**

- UI proceeds as if successful

- Backend logs instead of committing

**Log example**

```markdown
[preview][dry_run] submit_request
```

---

## Category B — Intent Signals (What Users Expect)

### 3️⃣ Blocked Final Actions (With Explanation)

**What it gives you**

- Shows where users *expect* power

- Exposes confusing CTAs

**Pattern**

- Button enabled

- Backend blocks

- UX explains

This is gold for product decisions.

---

### 4️⃣ Click-Through Analytics on Disabled Actions

**What it gives you**

- Quantifies demand

- Tells you what to prioritize

Example:

- 60% of preview users click “Confirm”\
  → That’s a must-fix flow.

---

## Category C — Safe Personalization

### 5️⃣ Editable Profile Fields (Non-Critical Only)

**Allowed**

- Display name

- Avatar

- Preferences

- UI settings

**Blocked**

- Email

- Password

- Roles

- Permissions

This tests trust and clarity without risk.

---

### 6️⃣ Preference Toggles That Affect UI Only

**Examples**

- Notification preferences (UI only)

- Theme / layout

- Sorting defaults

Zero backend risk, lots of UX insight.

---

## Category D — Visibility & Feedback

### 7️⃣ Inline “Was This Confusing?” Prompts

**What it gives you**

- Contextual feedback

- No surveys, no email

Place after:

- Blocked actions

- Flow exits

- Errors

Short, optional, powerful.

---

### 8️⃣ Preview Feedback Panel

A small floating button:

> “Give feedback”

Logs:

- Page

- Action

- User intent

This replaces long feedback sessions.

---

## Category E — Observability (Quiet but Critical)

### 9️⃣ Preview-Only Event Logging

Log:

- Flow starts

- Draft saves

- Blocked actions

- Abandon points

Tag everything:

```markdown
[preview]
```

This becomes your Phase 3 checklist.

---

### 🔟 Time-on-Flow Tracking

**What it gives you**

- Cognitive load signals

- Complexity hotspots

Long time ≠ good.

---

## Category F — Confidence Builders (Subtle but Important)

### 11️⃣ Clear Preview State Indicator

Small but persistent:

> “Preview Mode”

Prevents:

- Panic

- False bug reports

- Trust erosion

---

### 12️⃣ Reset / Clear Draft Button

Lets users:

- Start over

- Explore freely

Encourages experimentation.

---

## What You Should Still NOT Enable

🚫 Payments\
🚫 Wallet changes\
🚫 Irreversible submits\
🚫 Emails / notifications\
🚫 Background jobs\
🚫 External webhooks

If it can’t be undone, it doesn’t belong here.

---

## Recommended Phase 2 Starter Pack (If You Want to Be Lean)

If you only pick **5**, pick these:

1. Draft creation

2. Dry-run submit

3. Blocked final actions

4. Preview-only logging

5. Clear preview banner

That’s enough to make Phase 2 *worth it*.