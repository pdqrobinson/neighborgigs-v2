# Phase 4 — AI Neighbor Assistant 🤝

**“Helpful, not creepy. Smart, not bossy.”**

## Purpose

Introduce an AI assistant that behaves like a **friendly local neighbor**, not a corporate chatbot or gig-economy overlord.

The AI’s job is to:

- Reduce friction

- Prevent bad posts

- Help users price fairly

- Improve trust + completion rates\
  without ever sounding like it’s “deciding for you”

This AI **suggests**, never commands.

---

## Core Personality & Tone

**Vibe:**

> “Hey, quick thought — most folks around here offer about $8–$12 for that.”

**Rules:**

- No corporate language

- No “based on our algorithms”

- No pretending to be human

- Always optional advice

- Short, friendly, practical

**The AI speaks like:**

- A neighbor who’s done this before

- Someone who knows the area

- Someone who wants your task to actually get picked up

---

## Where AI Appears (and Where It Doesn’t)

### AI IS used in:

- Task creation

- Price suggestions

- Task clarity checks

- Helper ETA sanity checks

- Completion nudges

### AI is NOT used in:

- Disputes

- Enforcement

- Payments decisions

- Safety judgments

(Those stay human + rule-based.)

---

## AI Feature Set (Phase 4 Scope)

---

## 1️⃣ Smart Price Suggestions 💸

### When it triggers

During task creation, after:

- Task type selected

- Distance known

- Time window entered

### Inputs

- Task category (errand, pickup, drop-off)

- Distance (miles)

- Time sensitivity

- Neighborhood averages

- Historical acceptance rates

### Output (example)

> “Most neighbors offer **$10–$15** for this kind of errand nearby.\
> Want to start at **$12**?”

Buttons:

- 👍 Use $12

- ✏️ Edit myself

⚠️ Important:

- No “minimum wage” language

- No guilt framing

- No pressure

---

## 2️⃣ Task Clarity Check ✍️

### Problem it solves

Vague tasks don’t get accepted.

### AI behavior

Light copy suggestions only.

Example:

> “Quick tip — adding the store name usually gets faster responses.”

Or:

> “Helpers usually like knowing how many items. Want to add that?”

This runs **before posting**, not after rejection.

---

## 3️⃣ Time & Distance Reality Check ⏱️

If a user asks for:

- 1 hour delivery

- 8 miles away

- During rush hour

AI gently intervenes:

> “Heads up — that might be tight during this time of day.\
> You may get more helpers if you allow 90 minutes.”

Again: suggestion, not block.

---

## 4️⃣ Helper Match Confidence Boost 🧭

When a helper taps “Accept”:

> “This looks like it fits your current route.”

Or:

> “You’re about 6 minutes off the path — still worth it?”

This reduces regret-accepts and cancellations.

---

## 5️⃣ Completion & Courtesy Nudges ✅

After task completion:

To helper:

> “Nice work. Most neighbors upload a quick photo to close things out.”

To requester:

> “Everything look good? Confirming helps your neighbor get paid faster.”

No nagging. One nudge max.

---

## AI Decision Boundaries (Very Important)

The AI **never**:

- Sets prices automatically

- Accepts tasks for users

- Rejects tasks

- Changes payouts

- Makes safety claims

Think:\
**Advisor, not authority.**

---

## Technical Architecture (High-Level)

### AI Type

- Lightweight LLM

- Prompt-driven

- No long-term memory of users

- No identity assumptions

### Inputs

- Task metadata

- Geo context

- Aggregate neighborhood stats

- Time of day

### Outputs

- Plain text suggestions

- Optional numeric ranges

- UI hints (not actions)

### Failure Mode

If AI fails → nothing breaks\
User just posts normally.

---

## Data Ethics & Trust

- No training on private messages

- No voice

- No pretending to be human

- Clear “AI suggestion” labeling (small, subtle)

- Opt-out available in settings

Trust &gt; cleverness.

---

## Success Metrics (How We Know This Worked)

- Higher task acceptance rate

- Faster time-to-accept

- Fewer abandoned posts

- Fewer disputes due to mismatched expectations

- Higher repeat usage

If the AI isn’t improving **real outcomes**, it gets trimmed.