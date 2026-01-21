# Phase 3 — Smart Offer Guidance & Market Signals

**Purpose**\
Improve task completion rates and user confidence by guiding pricing behavior—without enforcing hard rules or turning this into a gig-economy rate card.

Phase 3 introduces *assistive intelligence*, not price control.

---

## Goals

- Reduce underpriced offers that never get accepted

- Help new users price tasks confidently

- Surface lightweight market signals (“what usually works”)

- Preserve user autonomy and trust

---

## Phase 3 Features

### 1. Auto-Suggest Offer Based on `task_type`

**Description**\
When a requester creates a task, the system suggests a starting offer based on historical data for similar tasks.

**Behavior**

- Suggestion is **optional** and **editable**

- Shown as a helper hint, not a forced value

- Defaults only appear once task details are complete

**Inputs**

- `task_type`

- `estimated_duration`

- `distance_range`

- Optional modifiers (urgency, time window)

**Output**

- Suggested offer amount (e.g. `$18–$22`)

- One-line rationale:

  > “Most grocery pickup requests nearby are completed around $20”

**Implementation Notes**

- Use rolling median (not average) to avoid skew

- Data source:

  - Completed tasks only

  - Last 30–90 days

  - Same city / geo-cluster

---

### 2. Low Offer Warning (Soft Guardrail)

**Description**\
If a requester enters an offer significantly below the typical acceptance range, the system gently warns them.

**Trigger**

- Offer &lt; X% below median for similar tasks\
  (Recommended: 25–30%)

**UX Pattern**

- Non-blocking inline warning

- User can proceed without friction

**Example Copy**

> ⚠️ This offer is lower than most similar requests\
> Tasks like this usually get accepted around $18–$22

**Important**

- Never block submission

- No shaming language

- No “required minimums”

---

### 3. “Popular Offer” Highlighting

**Description**\
Visually highlight offer amounts that historically perform well.

**Usage Locations**

- Offer input slider / field

- Suggested offer chips

- Helper-side task cards (optional)

**Example UI Treatments**

- ⭐ “Popular” badge

- “Most accepted” label

- Subtle highlight on slider notch

**Logic**

- Offer range with highest acceptance rate


- Must meet minimum data threshold (avoid false confidence)

---

## Data Model Additions

### Aggregated Offer Stats (Derived Table / Cache)

```markdown
OfferStats {
  task_type: string
  geo_bucket: string
  median_offer: number
  popular_offer_min: number
  popular_offer_max: number
  acceptance_rate: number
  sample_size: number
  last_updated: timestamp
}
```

> This is **derived data**.\
> Never treated as a source of truth.

---

## Guardrails & Principles

- **Assist, don’t dictate**

- **No race-to-the-bottom dynamics**

- **Transparency beats optimization**

- **Confidence over coercion**

If data confidence is low:

- Do not show suggestions

- Fall back to neutral copy:

  > “Set what feels fair for the help you need”