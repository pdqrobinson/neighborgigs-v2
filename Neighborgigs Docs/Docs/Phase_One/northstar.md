## The North Star (Non-Negotiable)

**Phase 1 = Public Preview, Zero Irreversible Mutations**

That means:

- ✅ Reads are allowed

- ⚠️ Writes are allowed *only if* they’re isolated + reversible

- ❌ No money movement, no task lifecycle changes, no state transitions that affect wallets, reputation, or availability

Everything we do must answer one question:

> *If this goes sideways, can I flip a flag or revert a commit and be back in 5 minutes?*

If the answer is “ehhh”… don’t do it yet.

---

## High-Level Strategy (This Is the Part Grok Didn’t Emphasize Enough)

Before touching code:

### 1. **Freeze the World**

Create a protection branch and never commit directly to main.

```markdown
git checkout main
git pull
git checkout -b phase1-hardening
```

Every step below lands as **small, scoped commits**. No mega-commits.

---

## Step 0 – Observability First (You’re Flying Blind Right Now)

Before fixing anything:

- Add **one single log wrapper** in `routes.ts` around broadcast creation:

  - request payload

  - Supabase error message

  - RPC name attempted

Why?\
Because otherwise you’ll “fix” three things and not know which one mattered.

> Senior rule: **never debug distributed systems without logs**.

This is a 15-minute change that saves hours.

---

## Step 1 – Broadcast Creation (But Do NOT Over-Engineer It)

You’re correct: broadcasts block the entire app.

### The mistake to avoid ❌

Trying to fully “solve” distance, RPCs, earth math, and prod parity in one go.

### What we actually do ✅

**Goal:**

> “Broadcasts can be created and listed reliably in dev & preview.”

Not:

- Perfect distance math

- Final schema

- Optimized SQL

### Concrete plan

#### 1A. Make broadcast creation **dumb but reliable**

If `get_broadcasts_with_distance` doesn’t exist or fails:

- **Do not block creation**

- Insert broadcast normally

- Return it without distance

Distance can be:

- `null`

- computed later

- mocked

> Distance is *presentation*, not core data.

#### 1B. Add RPCs only if required

Yes, add migrations **only if** the fallback proves insufficient.

Rule:

> If a feature is only used for sorting or display → fallback first, optimize later.

This keeps rollback trivial.

---

## Step 2 – Preview Guards (This Should Be Backend-First, Not UI-First)

This is where I’ll push back a bit.

You suggested UI-level guards first.\
That’s necessary — but **not sufficient**.

### Correct hierarchy (very important)

1. **Backend guard (authoritative)**

2. UI guard (nice UX)

### Minimal, safe implementation

Add **one** backend switch:

```markdown
const PREVIEW_MODE = process.env.PREVIEW_MODE === 'true';
```

Then in routes:

- task start / complete

- wallet mutations

- withdrawals

- accept request

- anything that changes balances or state

```markdown
if (PREVIEW_MODE) {
  return c.json({ error: 'Preview mode: action disabled' }, 403);
}
```

Now add UI messaging on top.

Why this matters:

- Someone *will* open DevTools

- Someone *will* hit endpoints manually

- Backend must be the bouncer

> Senior mantra: **Never trust the client. Especially your own.**

---

## Step 3 – Type Consolidation (Do This Surgically)

This is good hygiene, but don’t turn it into a refactor spiral.

### Rules

- Only move **shared DTOs**

- Do NOT move DB-specific types

- Do NOT rename fields yet

Create:

```markdown
/src/shared/types.ts
```

Move only:

- `User`

- `Broadcast`

- `Task`

- `WalletSummary`

Then update imports.

No logic changes. No field renames. No cleverness.

> If TypeScript yells, fix *types*, not behavior.

---

## Step 4 – Secrets (Fast, Clean, Boring)

You already know this is non-negotiable.

### One extra senior-level safeguard

After moving the key to env vars:

- Add a **startup assertion**:

```markdown
if (!process.env.SUPABASE_SERVICE_ROLE_KEY) {
  throw new Error('Missing SUPABASE_SERVICE_ROLE_KEY');
}
```

Fail fast &gt; silent partial failure.

---

## Step 5 – “Public Preview” Contract Test

Before merging:

### Manual checklist (this matters more than unit tests *right now*)

- Broadcasts can be created

- Broadcasts appear on map/feed

- Clicking actions shows “Preview mode” messaging

- Wallet balance does not change

- No SQL errors in logs after 30 minutes idle

If any fail → fix **before** merging.

---

## What We Explicitly Do NOT Touch Yet ❌

This is how you avoid breakage:

- ❌ Wallet math correctness

- ❌ Escrow logic

- ❌ Notifications infra

- ❌ Performance tuning

- ❌ Real distance optimization

- ❌ Phase 2 migrations

Those are Phase 2 problems.

Right now, the app needs to:

> Load, look alive, and not hurt itself.

---

## The Commit Strategy (This Is How You Stay Sane)

You should end up with commits like:

1. `chore: add structured logging for broadcast creation`

2. `fix: allow broadcast creation without distance RPC`

3. `feat: backend preview mode guards`

4. `chore: consolidate shared API types`

5. `security: move supabase service role key to env`

If you can’t describe a commit in one sentence — it’s too big.