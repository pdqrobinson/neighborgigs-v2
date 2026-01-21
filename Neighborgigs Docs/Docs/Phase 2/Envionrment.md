## The New Reality (No Staging)

You now have **exactly two environments**:

```markdown
DEV (zosite)  →  PROD (public)
```

That means:

- **Dev must behave like staging**

- **Prod must never be touched casually**

- **Promotion must be predictable and reversible**

No heroics. No live debugging.

---

## Hard Rules (these replace staging)

### Rule 1: Dev must be prod-like

If dev ≠ prod, you’ll keep chasing ghosts.

**These MUST match exactly:**

- Runtime version (Node / Bun / PHP)

- Build command

- Folder structure

- Reverse proxy config shape

- Docker image (if used)

Only differences allowed:

- Domain

- Env vars

- Credentials

If they don’t match, stop here and fix that first.

---

### Rule 2: Prod deploys are atomic or nothing

No partial deploys.\
No “just change this one file”.

Prod updates happen as **single, complete replacements**.

---

## Dev (zosite) Ruleset

Dev is now:

- Where features land

- Where migrations run first

- Where breakage is allowed

### Dev must include:

- Debug logging ON

- Health check endpoint (`/health`)

- Same start command as prod

- Same port expectations as prod

If it breaks on dev → **it does not go to prod**

---

## Production Ruleset

Prod is:

- Read-only except for deploys

- No experiments

- No hot fixes

If prod breaks:

- Roll back

- Diagnose in dev

- Promote fix forward

---

## Code Sync Strategy (Simple, Non-Negotiable)

### Branching

```markdown
develop  → auto deploy to zosite
main     → manual deploy to prod
```

### Promotion

1. Dev is green

2. You tag or merge

3. You deploy once

4. You verify

5. You walk away

No cherry-picks. No file copying.

---

## Database Strategy (since staging is gone)

### Source of truth: **PROD DB**

Dev options:

- Read-only access to prod data

- Sanitized snapshot copied down

- Separate DB with migration parity

### Schema changes:

1. Migration written

2. Migration tested on dev DB

3. Migration run ONCE on prod

Never “edit tables” manually in prod.

---

## 502 Protection Without Staging

A 502 means **the app was not ready when traffic hit it**.

### Required pattern:

1. Build app

2. Start app

3. Confirm `/health`

4. Reload proxy

5. Stop old app

If you skip step 3, expect pain.

---

## Minimum Viable Deploy Script (mental model)

```markdown
git pull origin main
npm run build   # or bun build
pm2 start ecosystem.config.js --env production
curl https://yoursite.com/health
pm2 delete old
```

(Exact commands depend on your stack, but the order is sacred.)

---

## Syncing zosite ↔ public without breaking things

### What stays in sync:

- Code

- UI

- Features

- Build logic

### What stays isolated:

- API keys

- Webhooks

- Payment providers

- OAuth callbacks

- Analytics

**Never reuse prod credentials in dev. Ever.**

---

## The Big Tradeoff (be honest)

Removing staging means:

- Fewer environments to manage ✅

- Faster iteration ✅

- **Higher responsibility on dev quality** ⚠️

If dev is sloppy → prod will hurt you.