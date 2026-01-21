# Documentation Change Control Policy

**(Single Source of Truth Rule – Phase One)**

## Purpose

This document defines **how and when system documentation may be changed**, and establishes documentation as the **authoritative source of truth** for Phase One behavior.

**No production behavior may change unless the documentation is updated first.**

---

## Core Principle (Non-Negotiable)

> **Documentation → Decision → Implementation → Verification**
>
> Code must follow docs.\
> Docs never chase code.

If behavior and documentation disagree, **the documentation is wrong OR the code is wrong — never both.**

---

## What Counts as “Documentation”

The following files are considered **authoritative system documentation**:

- `phase_1.md`

- `api_spec.md`

- `Database_Strategy.md`

- `DB_SETUP.md`

- `screens.md`

- `Core_invariants.md`

- `error_handling.md`

- Any file explicitly marked as **spec**, **invariant**, or **contract**

Comments in code, commit messages, Slack messages, and “tribal knowledge” **do not count**.

---

## When Documentation MUST Be Updated First

Documentation **must be updated before any code change** if the change affects:

### 1. State Machines

- Task states

- Request states

- Wallet / ledger behavior

- Movement visibility rules

### 2. Data Models

- Tables

- Columns

- Constraints

- Indexes

- Relationships

### 3. API Contracts

- Endpoint behavior

- Request/response fields

- Error cases

- Idempotency rules

### 4. Screens or User Flows

- Adding/removing screens

- Changing screen purpose

- Changing what a screen represents (e.g. “processing” vs “instant”)

### 5. Money or Ownership

- Credits, debits, withdrawals

- Task acceptance/completion

- Anything that changes who owns what

If you’re asking **“does this change how the system behaves?”**\
→ the doc must be updated first.

---

## Allowed Code-First Changes (Rare but Explicit)

The following **may** be implemented without prior doc changes, but **must be documented immediately afterward**:

- Internal refactors with **no external behavior change**

- Performance optimizations that do **not** alter results

- Logging, metrics, tracing

- Comments, formatting, linting

If behavior is unchanged, docs don’t need pre-approval — but still must remain accurate.

---

## The Change Workflow (Mandatory)

### Step 1 — Identify the Conflict

When something “doesn’t work” or feels wrong:

- Identify **which invariant or contract is violated**

- Identify **which document is wrong or incomplete**

No coding yet.

---

### Step 2 — Propose Documentation Change

Create a **doc-first change** that includes:

- What is changing

- Why the current behavior is invalid or insufficient

- The new intended behavior

- Any tradeoffs introduced

This can be:

- A PR that only changes docs

- Or a clearly separated “Docs Commit” before code

---

### Step 3 — Approve the Documentation

Before implementation:

- Confirm the change does **not break Phase One scope**

- Confirm it does **not contradict core invariants**

- Confirm all related docs are aligned (no partial updates)

If docs disagree with each other, **fix all of them first**.

---

### Step 4 — Implement the Code

Only after docs are updated and agreed upon:

- Implement the behavior exactly as specified

- No “extra” logic

- No hidden assumptions

If implementation reveals a flaw in the doc:

- Stop

- Update the doc again

- Then continue

---

### Step 5 — Verify Against Documentation

After implementation:

- Verify code behavior against the updated docs


- If tests exist, they must reflect the doc, not the old behavior

---

## Conflict Resolution Rule

If two documents disagree:

1. **Do not guess**

2. **Do not code**

3. Identify the conflict explicitly

4. Resolve it in documentation

5. Then proceed

The system is considered **undefined** until conflicts are resolved.

---

## Versioning & Traceability (Lightweight)

- Each doc change should include a short note:

  - `Changed because: [reason]`

- No need for heavy RFCs — clarity beats ceremony

---

## Enforcement Rule

Any change that bypasses this process is considered:

- **Invalid**

- **Subject to rollback**

- **Not Phase One compliant**

This applies even if the code “works.”

---

## Why This Exists

Phase One success depends on:

- Deterministic behavior

- Predictable state transitions

- No hidden rules

This policy ensures:

- No silent scope creep

- No accidental async behavior

- No money bugs

- No “we’ll fix the docs later” debt