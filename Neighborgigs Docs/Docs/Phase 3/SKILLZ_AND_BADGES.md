# Phase 3 — Skills & Badges System

## Status

**Phase 3 — Trust Signals (Non-Credentialed)**

Skills and badges are introduced in Phase 3 to:

- Improve task matching

- Increase confidence between users

- Reward good behavior

They do **not**:

- Certify professionals

- Replace verification

- Guarantee outcomes

- Enable higher-risk work

---

## Core Principle (Lock This In)

> **Skills describe capability. Badges describe behavior.**

Neither are credentials.\
Neither are promises.

They exist to help users decide **faster and with more confidence**.

---

## Why This Is Phase 3 (Not Earlier)

Skills and badges require:

- Real interaction data

- Task completion history

- Messaging context

- Acceptance patterns

Without that, they become:

- Self-asserted fluff

- Or gamified noise

Phase 3 is when **signal starts to matter**.

---

## System Overview

There are **two separate but related systems**:

| System | Purpose |
| --- | --- |
| Skills | What a user is *good at* |
| Badges | How a user *behaves* |

They are intentionally decoupled.

---

## 1️⃣ Skills System

### What Skills Are

Skills are:

- **User-selected**

- **Soft signals**

- **Task-relevant**

- **Non-exclusive**

They help answer:

> “Is this person likely comfortable doing this?”

---

### Skill Categories (Phase 3)

Start with **6–8 max**. Fewer is better.

Recommended Phase 3 skills:

- 🛒 Errands & Shopping

- 📦 Deliveries & Drop-offs

- 🚗 Long-distance / Route-based

- 🤝 General Help

- 🧹 Light Cleaning

- 🗂 Organization & Sorting

No professional skills.\
No tools required.\
No licensing implied.

---

### Skill Assignment

```markdown
user_skill {
  user_id
  skill_key
  added_at
}
```

Rules:

- Users select skills manually

- Max 5 active skills

- Skills are editable

- No endorsements yet

---

### Skill Usage

Skills are used to:

- Filter broadcasts

- Sort responders

- Display context in response UI

Example display:

```markdown
Mike • Skills: Errands, Deliveries, Route-based
```

---

### Explicit Non-Goals (Skills)

Skills do **not**:

- Unlock task types

- Guarantee success

- Increase pricing

- Override trust rules

They are **assistive only**.

---

## 2️⃣ Badges System

### What Badges Are

Badges are:

- **System-earned**

- **Behavior-based**

- **Non-selectable**

- **Read-only**

They reflect:

> “How this user behaves on the platform.”

---

### Phase 3 Badge Set (Recommended)

Keep this **very small** at launch.

#### ⭐ Reliable

- Completed 5+ tasks

- No cancellations

#### ⏱ On Time

- Completed 3 tasks within expected window

#### 💬 Responsive

- Replies to messages within X hours

#### 👍 Well Rated

- Average rating above threshold (future-ready)

---

### Badge Model

```markdown
user_badge {
  user_id
  badge_key
  earned_at
}
```

Badges are:

- Awarded automatically

- Revoked if behavior changes (optional, later)

---

### Badge Visibility

Badges appear:

- On profile

- In response cards

- In task detail view

Never hidden. Never boosted artificially.

---

## Badge Logic (Phase 3 Rules)

- No manual badge grants

- No badge marketplace

- No badge stacking effects

- No badge-based permissions

Badges **signal**, they do not **unlock**.

---

## Skills vs Badges (Clear Separation)

| Dimension | Skills | Badges |
| --- | --- | --- |
| Assigned by | User | System |
| Editable | Yes | No |
| Purpose | Capability | Trust |
| Risk | Low | Medium |
| Abuse potential | Moderate | Low |

This separation prevents:

- Credential inflation

- Gamification abuse

- False authority

---

## UI Integration (Phase 3)

### Profile View

```markdown
Sarah
Skills: Errands, Organization
Badges: ⭐ Reliable · 💬 Responsive
```

---

### Broadcast Response View

```markdown
Mike
Skills: Deliveries, Route-based
Badges: ⭐ Reliable
[ Accept ] [ Message ]
```

Skills help *decide*.\
Badges help *trust*.

---

## Moderation & Safety

- Skills are user-managed → reportable

- Badges are system-managed → auditable

- No claims of certification allowed in copy

- Terms explicitly prohibit misrepresentation

---

## Phase Boundaries (Explicit)

| Phase | Capability |
| --- | --- |
| Phase 2 | Basic profiles |
| **Phase 3** | Skills + badges |
| Phase 4 | Identity verification |
| Phase 5 | Advanced trust weighting |

---

## Explicit Non-Goals

This system will **not**:

- Replace background checks

- Enable professional labor

- Support endorsements yet

- Show skill rankings

- Affect payouts

Those are future conversations.