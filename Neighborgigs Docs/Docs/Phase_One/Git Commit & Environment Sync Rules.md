# NeighborGigs — Git Commit & Environment Sync Rules (Zo)

## Purpose

Ensure **code, schema, and behavior** remain synchronized between:

- Zo Dev site

- Zo Production site

Git is the **single source of truth** for all changes, promotions, and rollbacks.

---

## 1. Repository Structure

- **Single Git repository**

- **Two environments**

  - `dev` → Zo Dev site (working state)

  - `main` → Zo Production site (stable state)

Rules:

- No separate repositories

- No copy-paste deployments

- No environment-specific logic in code

---

## 2. Branching Strategy (Phase One)

Branches:

- `dev` → all development work

- `main` → production only

Rules:

- No feature branches in Phase One

- No direct commits to `main`

- All changes flow: `dev` → `main`

---

## 3. Golden Rule

> **Nothing touches Production unless it has passed through** `dev` **and been committed.**

No exceptions.\
No hotfixes.\
No manual edits in prod.

---

## 4. Commit Scope Rules (Mandatory)

Each commit must represent **one logical change**.

Allowed scopes:

- `screen:` UI or layout changes

- `logic:` backend or flow logic changes

- `db:` schema or SQL changes

- `copy:` text or messaging changes

- `fix:` bug fixes only

- `seed:` demo data only

- `chore:` non-functional cleanup

If a change spans multiple scopes → split into multiple commits.

---

## 5. Commit Message Format (Strict)

Format:

```markdown
<scope>: <clear, present-tense description>
```

Examples:

```markdown
screen: add map/list toggle to home
logic: enforce single active task per helper
db: add move_expires_at to users
seed: insert demo neighborhood and users
fix: block accept when helper has active task
```

Not allowed:

- vague messages (“updates”, “wip”, “stuff”)

- combined scopes

- emoji-only commits

---

## 6. Development Workflow

### Step 1 — Build in Zo Dev

- Make changes only in Zo Dev

- Test manually

- Verify against:

  - Phase One scope

  - Core invariants

  - Guardrails

---

### Step 2 — Commit to `dev`

- Commit **before** promotion

- Commit message must follow scope rules

- Any schema change must include SQL in the repo

---

### Step 3 — Promote to Production

- Merge `dev` → `main`

- Deploy to Zo Prod

- No direct edits in production

---

## 7. Database Change Rules

### Schema Changes

- Must be committed as SQL files

- Applied in this order:

  1. Dev

  2. Prod (immediately after merge)

### Data Changes

- Demo data → dev only

- Production data → **never manually edited**

---

## 8. Sync Validation Checklist (Pre-Merge)

Before merging `dev` → `main`, confirm:

- No new screens added

- No new tables added


- No invariant violations

- Schema matches Phase One database strategy

- Commit messages follow scope rules

- Dev and Prod structures are identical

If **any** check fails → **do not merge**.

---

## 9. Rollback Rule

If production breaks:

1. Revert the last commit

2. Redeploy

3. Fix in `dev`

4. Re-merge

Rules:

- No emergency patches in prod

- Rollback always beats hotfix

---

## 10. AI Usage Rules

When using AI during development:

AI must:

- Follow this Git strategy

- Propose commit scopes explicitly

- Never suggest skipping commits

- Produce output that maps to:

  - one commit

  - one scope

If AI suggests:

- adding a new screen

- adding a new table

- bypassing Git

→ the suggestion is **invalid**.

---

## Final Lock Statement

> **If it isn’t committed, it doesn’t exist.\
> If it isn’t in** `main`**, it isn’t production.**