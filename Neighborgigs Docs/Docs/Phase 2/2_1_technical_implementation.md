# Phase 2 — Technical Implementation Guide (Canonical)

## Cross-Reference Information
**Master Document:** `2_1_technical_implementation.md`  
**Related:** `2_2_data_model_changes.md`, `2_3_testing_strategy.md`, `2_4_monitoring_analytics.md`  
**Archived:** `docs/archive/phase2_known_issues.md`, `docs/archive/phase2_changes_summary.md`

---

## Context

Phase 2 begins **only after Phase 1 is stable and publicly viewable**.

- **Phase 1** establishes:

  - Read-only preview guards

  - Notifications toggle

  - Type consolidation

  - Service role key security

- **Phase 2** introduces **controlled interaction** to observe real user behavior **without mutating production state**

Phase 2 is explicitly **non-destructive**.\
All interactions are preview-safe, observable, and reversible.

---

## Core Principles (Non-Negotiable)

- **Explicit allow-lists**: Everything is blocked by default in preview mode
- **Separate data paths**: Preview drafts never touch production tables
- **Clear UX signaling**: Users always know when they are in preview
- **Observability first**: Every meaningful action is logged
- **No silent failures**: All blocked actions explain themselves

---

## Fix Philosophy: Canonical Model & Precedence

### One Canonical Model
- `task_requests` = requester posts (canonical name)
- `tasks` = active work after acceptance (canonical name)
- Phase 2 "jobs" is a **view** or **TypeScript DTO**, not a table
- See `ERD_phase2.md` for complete entity relationships

### Runtime Guards vs DB Constraints (Precedence)
- **Feature flags** = "Should UI/backend allow this flow?" (UX guard)
- **DB constraints** = "Even if someone bypasses UI, prevent corruption" (seatbelt)
- **Precedence**: Feature flags gate behavior. DB constraints enforce invariants as last-resort safety.
- **Example**: Withdrawals blocked by flag in preview; DB ensures `available_usd >= 0` always

---

## Flag Precedence (Canonical)

**ENV – highest priority, requires deploy/restart**  
**DB – runtime override / hotfix**  
**Code defaults – fallback only**  

No exceptions. No "usually." No hand-waving.

### Single Source of Truth: `getPreviewFlag()`

All code MUST use this function. Never access flags directly.

```typescript
// flags/preview.ts
export async function getPreviewFlag(name: string): Promise<boolean> {
  // 1. ENV override (highest priority)
  const envVar = process.env[`PREVIEW_${name.toUpperCase()}`];
  if (envVar !== undefined) {
    return envVar === 'true';
  }
  
  // 2. DB setting (runtime override)
  try {
    const dbValue = await db.preview_settings.get(name);
    if (dbValue !== null) {
      return dbValue === 'true';
    }
  } catch (error) {
    // DB unavailable: continue to code default
    console.warn(`[PREVIEW] DB check failed for "${name}", using code default`);
  }
  
  // 3. Code default (fallback)
  return PREVIEW_FLAGS_DEFAULTS[name] ?? false;
}

// Pre-defined defaults (code)
const PREVIEW_FLAGS_DEFAULTS: Record<string, boolean> = {
  allow_drafts: true,
  allow_profile_edit: true,
  allow_flow_walkthrough: true,
  block_finalize: true,
  allow_applications: false,  // Not in Phase 2 initial release
} as const;

export const isPreviewMode = () => process.env.PREVIEW_MODE === 'true';
```

### Why This Hierarchy?

| Priority | Source | Characteristics | Use Case |
|----------|--------|-----------------|----------|
| **1 (Highest)** | ENV variables | - Requires deploy/restart<br>- Version-controlled<br>- Audit trail<br>- Intentional changes | Production deployments, feature rollouts |
| **2 (Middle)** | Database settings | - Runtime changeable<br>- Hotfix capability<br>- Riskier (no deploy cycle) | Emergency fixes, experiments, A/B tests |
| **3 (Lowest)** | Code defaults | - Cannot change at runtime<br>- Safe fallback<br>- Always available | Development, staging, last resort |

### Examples

| ENV | DB | Code | Result | Reason |
|-----|----|------|--------|--------|
| `true` | `false` | `false` | **ON** | ENV wins |
| (not set) | `true` | `false` | **ON** | DB overrides code |
| (not set) | (not set) | `true` | **ON** | Code default |
| `false` | `true` | `true` | **OFF** | ENV wins |

**Canonical Rule:** ENV > DB > Code. Always. No exceptions.

### Phase 1 vs Phase 2 Behavior
- Phase 1 and Phase 2 can differ if explicitly documented as:
  - "Phase 1 behavior under PREVIEW_MODE"
  - "Phase 2 behavior when [feature] enabled"

---

## Startup Validation (Critical Guards)

**Purpose:** Prevent silent failures and configuration conflicts at application startup.

### When It Runs
- On application startup
- Before any preview operations
- Logs warnings for flag conflicts (doesn't crash on conflicts)

### Required Checks

#### 1. DRAFTS_PERSISTED Guard

**What It Checks:** Verifies that the `drafts` table exists **before** attempting to use it.

**Code (Required Implementation):**

```typescript
// startup/validation.ts
export async function validateDraftsTable(): Promise<void> {
  if (process.env.DRAFTS_PERSISTED !== 'true') {
    return; // No persistence, no check needed
  }

  const hasTable = await schema.hasTable('drafts');
  
  if (!hasTable) {
    throw new Error(
      'DRAFTS_PERSISTED=true but drafts table not present. ' +
      'Run migrations first or set DRAFTS_PERSISTED=false\n\n' +
      'Available tables:\n' +
      (await schema.listTables()).map(t => `  - ${t}`).join('\n')
    );
  }
}
```

**Error Message Format:**
```
DRAFTS_PERSISTED=true but drafts table not present.

ACTION REQUIRED:
1. Run migrations: npm run migrate:up
2. OR set DRAFTS_PERSISTED=false in your .env file
3. OR verify your database connection string is correct

To list available tables:
  npm run db:list-tables
```

**Why This Matters:** This prevents the **worst possible failure mode: silent partial persistence**.

**Failure Mode Without This Guard:**
1. DRAFTS_PERSISTED=true is set
2. Drafts table doesn't exist (migration not run)
3. Application starts normally
4. User creates drafts
5. Drafts are **lost silently** (no error, no persistence)
6. User thinks they saved work
7. Data loss occurs

**With This Guard:**
1. Application fails to start
2. Error message clearly explains the problem
3. Developer must fix issue before serving traffic
4. No silent failures
5. No data loss

#### 2. Flag Precedence Validation

**What It Checks:** Verifies that there are no conflicts between ENV, DB, and code defaults.

**Code (Required Implementation):**

```typescript
// startup/validation.ts
export async function validateFlagPrecedence(): Promise<void> {
  const warnings: string[] = [];
  
  for (const flag of Object.keys(PREVIEW_FLAGS_DEFAULTS)) {
    const envKey = `PREVIEW_${flag.toUpperCase()}`;
    const envValue = process.env[envKey];
    
    try {
      const dbValue = await db.preview_settings.get(flag);
      
      // Check for conflict
      if (envValue !== undefined && dbValue !== null && envValue !== dbValue) {
        const warning = `Flag conflict for "${flag}": ENV=${envValue}, DB=${dbValue}. ENV takes precedence.`;
        warnings.push(warning);
      }
    } catch (error) {
      // DB unavailable, that's okay - ENV will be used
    }
  }
  
  if (warnings.length > 0) {
    console.warn('\n' + '='.repeat(60));
    console.warn('[PREVIEW] FLAG CONFLICT DETECTED');
    console.warn('='.repeat(60));
    warnings.forEach(w => console.warn(`[PREVIEW] ${w}`));
    console.warn('\nResolution: ENV variables always win. Update DB to match ENV.');
    console.warn('='.repeat(60) + '\n');
  }
}
```

**Example Output:**
```
============================================================
[PREVIEW] FLAG CONFLICT DETECTED
============================================================
[PREVIEW] Flag conflict for "allow_drafts": ENV=true, DB=false. ENV takes precedence.
[PREVIEW] Flag conflict for "block_finalize": ENV=false, DB=true. ENV takes precedence.

Resolution: ENV variables always win. Update DB to match ENV.
============================================================
```

#### 3. Required Tables Check

**What It Checks:** Verifies all required Phase 2 tables exist.

**Required Tables:**
| Table | Phase | Required If |
|-------|-------|-------------|
| `preview_settings` | 2 | Always |
| `preview_events` | 2 | Always (for logging) |
| `preview_feedback` | 2 | Always |
| `drafts` | 2 | DRAFTS_PERSISTED=true |
| `request_applications` | 2 | Always |
| `task_requests` | 1/2 | Always |

**Code:**
```typescript
// startup/validation.ts
const REQUIRED_PHASE2_TABLES = [
  'preview_settings',
  'preview_events',
  'preview_feedback',
  'request_applications',
];

const CONDITIONAL_TABLES = {
  drafts: 'DRAFTS_PERSISTED=true',
};

export async function validateRequiredTables(): Promise<void> {
  const missing: string[] = [];
  
  for (const table of REQUIRED_PHASE2_TABLES) {
    const exists = await schema.hasTable(table);
    if (!exists) missing.push(table);
  }
  
  if (process.env.DRAFTS_PERSISTED === 'true') {
    const draftsExists = await schema.hasTable('drafts');
    if (!draftsExists) missing.push('drafts (required when DRAFTS_PERSISTED=true)');
  }
  
  if (missing.length > 0) {
    throw new Error(
      'Missing required Phase 2 tables:\n' +
      missing.map(t => `  - ${t}`).join('\n') +
      '\n\nRun migrations first: npm run migrate:up'
    );
  }
}
```

#### 4. Environment Variable Validation

**What It Checks:** Verifies required environment variables are set.

**Required ENV Variables:**
| Variable | Required | Default | Purpose |
|----------|----------|---------|---------|
| `DATABASE_URL` | Yes | - | Database connection |
| `PREVIEW_MODE` | No | `false` | Global preview toggle |
| `DRAFTS_PERSISTED` | No | `false` | Draft persistence toggle |
| `PREVIEW_ALLOW_DRAFTS` | No | `true` | Draft creation flag |
| `PREVIEW_BLOCK_FINALIZE` | No | `true` | Finalization block flag |

**Code:**
```typescript
// startup/validation.ts
const REQUIRED_ENV = ['DATABASE_URL'];
const OPTIONAL_ENV = [
  'PREVIEW_MODE',
  'DRAFTS_PERSISTED',
  'PREVIEW_ALLOW_DRAFTS',
  'PREVIEW_ALLOW_PROFILE_EDIT',
  'PREVIEW_ALLOW_FLOW_WALKTHROUGH',
  'PREVIEW_BLOCK_FINALIZE',
];

export function validateEnvironment(): void {
  const missing: string[] = [];
  
  for (const env of REQUIRED_ENV) {
    if (!process.env[env]) {
      missing.push(env);
    }
  }
  
  if (missing.length > 0) {
    throw new Error(
      'Missing required environment variables:\n' +
      missing.map(v => `  - ${v}`).join('\n') +
      '\n\nRequired:\n' +
      REQUIRED_ENV.map(v => `  - ${v}`).join('\n') +
      '\n\nOptional:\n' +
      OPTIONAL_ENV.map(v => `  - ${v} (default: varies)`).join('\n')
    );
  }
  
  // Log current configuration
  console.log('\n' + '='.repeat(60));
  console.log('[PREVIEW] Current Configuration');
  console.log('='.repeat(60));
  console.log(`PREVIEW_MODE: ${process.env.PREVIEW_MODE || 'false'}`);
  console.log(`DRAFTS_PERSISTED: ${process.env.DRAFTS_PERSISTED || 'false'}`);
  console.log('='.repeat(60) + '\n');
}
```

### Startup Sequence (All Checks)

**Required Startup Order:**

```typescript
// startup/index.ts
import { validateEnvironment } from './validateEnvironment';
import { validateDraftsTable } from './validateDraftsTable';
import { validateFlagPrecedence } from './validateFlagPrecedence';
import { validateRequiredTables } from './validateRequiredTables';

export async function runStartupChecks(): Promise<void> {
  console.log('[STARTUP] Running validation checks...');
  
  try {
    // 1. Validate environment variables (fastest, no DB)
    validateEnvironment();
    
    // 2. Validate required tables (requires DB)
    await validateRequiredTables();
    
    // 3. Validate drafts table (conditional)
    await validateDraftsTable();
    
    // 4. Validate flag precedence (warning only)
    await validateFlagPrecedence();
    
    console.log('[STARTUP] All validation checks passed ✓');
  } catch (error) {
    console.error('\n' + '='.repeat(60));
    console.error('[STARTUP] VALIDATION FAILED');
    console.error('='.repeat(60));
    console.error(error.message);
    console.error('='.repeat(60) + '\n');
    
    // In development, continue anyway (for DX)
    if (process.env.NODE_ENV === 'development') {
      console.warn('[STARTUP] Continuing anyway in development mode...');
    } else {
      // In production/staging, fail fast
      throw error;
    }
  }
}
```

**Integration with Application Entry Point:**

```typescript
// server.ts
import { runStartupChecks } from './startup';

async function main() {
  // Run validation before starting server
  await runStartupChecks();
  
  // Start application
  const app = createApp();
  app.listen(process.env.PORT || 3000);
}

main().catch((error) => {
  console.error('Failed to start application:', error);
  process.exit(1);
});
```

### Command-Line Interface

**Run All Checks:**
```bash
npm run validate:startup
```

**Check Specific Component:**
```bash
npm run validate:drafts-table    # Check drafts table
npm run validate:flags           # Check flag precedence
```

**Expected Output:**
```
[STARTUP] Running validation checks...
[STARTUP] Current Configuration
PREVIEW_MODE: false
DRAFTS_PERSISTED: false
[STARTUP] All validation checks passed ✓
```

### Troubleshooting

**Issue: "drafts table not present" when DRAFTS_PERSISTED=true**
```bash
# 1. Check if table exists
npm run db:list-tables | grep drafts

# 2. If missing, run migrations
npm run migrate:up
```

**Issue: "Flag conflict" warnings**
1. Check your `.env` file
2. Check database `preview_settings` table
3. Decide which value to use (ENV takes precedence)
4. Update the lower-priority source to match

### Deployment Checklist

**Before Deployment:**
- [ ] Run `npm run validate:startup` locally
- [ ] All startup checks pass
- [ ] No conflicting flag warnings
- [ ] All required migrations applied to staging
- [ ] Database connection string verified
- [ ] Environment variables configured correctly

**During Deployment:**
- [ ] Startup checks run automatically
- [ ] Server fails to start if validation fails
- [ ] Logs show validation results
- [ ] No silent failures

**After Deployment:**
- [ ] Check logs for validation warnings
- [ ] Verify preview mode is disabled initially
- [ ] Monitor for any startup errors
- [ ] Run smoke tests

---

## Draft Persistence Strategy

**Drafts are in-memory by default. Persistence is optional and gated by `DRAFTS_PERSISTED=true`.**

### Phase 1 Behavior (Default)
- Drafts are ephemeral (in-memory / local-only)
- Zero migration risk
- Zero database writes
- Lost on server restart (acceptable)

### Phase 2 Behavior (When `DRAFTS_PERSISTED=true`)
- Drafts persist to database
- Multi-device support
- Recovery and resumability
- Analytics on draft patterns

### Critical Safety Guard

At application startup, this check **MUST** run (see "Startup Validation" section above):

```typescript
if (process.env.DRAFTS_PERSISTED === 'true' && !schema.hasTable('drafts')) {
  throw new Error(
    'DRAFTS_PERSISTED=true but drafts table not present. ' +
    'Run migrations first or set DRAFTS_PERSISTED=false'
  );
}
```

This prevents the worst possible failure mode: silent partial persistence.

### Implementation Contract

**DraftService Supports Two Backends:**

**InMemoryDraftStore (Phase 1 default)**
```typescript
class InMemoryDraftStore implements IDraftStore {
  private store = new Map<string, Draft>();
  // In-memory only, lost on restart
}
```

**SupabaseDraftStore (Phase 2 behind DRAFTS_PERSISTED=true)**
```typescript
class SupabaseDraftStore implements IDraftStore {
  async save(draft: Draft): Promise<void> {
    await db.from('drafts').insert(draft);
  }
  // Persisted to database
}
```

**Same Interface, Swapable, Zero App-Level Branching:**
```typescript
interface IDraftStore {
  create(data: any): Promise<Draft>;
  get(id: string): Promise<Draft>;
  update(id: string, data: any): Promise<Draft>;
  delete(id: string): Promise<void>;
}

// Factory - no branching in application code
export function createDraftStore(): IDraftStore {
  if (process.env.DRAFTS_PERSISTED === 'true') {
    return new SupabaseDraftStore();
  }
  return new InMemoryDraftStore(); // Phase 1 default
}
```

**DraftService:**
```typescript
export class DraftService {
  private get store(): IDraftStore {
    return process.env.DRAFTS_PERSISTED === 'true' 
      ? new SupabaseDraftStore()
      : new InMemoryDraftStore();
  }

  async createDraft<T>(data: Partial<T>): Promise<Draft<T>> {
    return this.store.create(data);
  }
}
```

### Benefits

✅ Phase 1: Zero risk, zero migration, zero cleanup  
✅ Phase 2: Persistence when needed, feature-flagged rollout  
✅ Same code path, same interface, different backend  
✅ No "half-built persisted draft tables that nobody uses"

### Canonical Rule

**Phase 2 drafts are in-memory by default. Persistence is optional and gated by `DRAFTS_PERSISTED=true`.**

---

## 1. Feature Flag System

### Flag Definitions

```typescript
// flags/preview.ts
export const PREVIEW_FLAGS = {
  allow_drafts: process.env.PREVIEW_ALLOW_DRAFTS === 'true',
  allow_profile_edit: process.env.PREVIEW_ALLOW_PROFILE_EDIT === 'true',
  allow_flow_walkthrough: process.env.PREVIEW_ALLOW_FLOW_WALKTHROUGH === 'true',
  block_finalize: process.env.PREVIEW_BLOCK_FINALIZE !== 'false', // default: true
} as const;

export const isPreviewMode = () => process.env.PREVIEW_MODE === 'true';
```

### Action → Flag Mapping (Explicit)

```typescript
// flags/previewActions.ts
import { PREVIEW_FLAGS } from './preview';

export const PREVIEW_ACTION_FLAGS: Record<string, keyof typeof PREVIEW_FLAGS> = {
  drafts: 'allow_drafts',
  profile_edit: 'allow_profile_edit',
  flow_walkthrough: 'allow_flow_walkthrough',
  job_submit: 'allow_drafts',
} as const;
```

This prevents:
- Typos
- Drift between frontend and backend
- Silent enablement of blocked actions

### Preview Guard Middleware

```typescript
// middleware/previewGuard.ts
export function previewGuard(action: string) {
  return (req, res, next) => {
    if (!isPreviewMode()) return next();

    const flag = PREVIEW_ACTION_FLAGS[action];
    if (flag && PREVIEW_FLAGS[flag]) {
      return next();
    }

    return res.status(403).json({
      error: 'Action not allowed in preview mode',
      previewMode: true,
      action,
      message:
        'You are viewing the full flow, but this action is disabled in preview mode.',
    });
  };
}
```

---

## 2. Draft Model (Phase 2)

### Draft Storage Strategy (Important)

> **Phase 2 drafts are strictly in-memory by default.**\
> They are **not persisted** and **never touch production tables** unless `DRAFTS_PERSISTED=true`.

- Drafts are lost on restart (acceptable for default)
- Zero migration risk (by default)
- Deterministic behavior
- Easy to replace with persistence in Phase 3

### Type Definitions

```typescript
// entities/Draft.ts
export enum DraftStatus {
  DRAFT = 'draft',
}

export interface Draft<T = any> {
  id: string;
  status: DraftStatus.DRAFT;
  is_preview: true;
  submitted_at: null;
  finalized_at: null;
  draft_data: Partial<T>;
}
```

> Draft data is **never spread to the top level**.\
> All entity fields live inside `draft_data`.

---

## 3. Draft Service

```typescript
// services/draftService.ts
export class DraftService {
  private store = new Map<string, Draft<any>>();

  private generateId() {
    return `draft_${Date.now()}_${Math.random().toString(36).slice(2)}`;
  }

  async createDraft<T>(data: Partial<T>): Promise<Draft<T>> {
    const draft: Draft<T> = {
      id: this.generateId(),
      status: DraftStatus.DRAFT,
      is_preview: true,
      submitted_at: null,
      finalized_at: null,
      draft_data: data,
    };

    this.store.set(draft.id, draft);
    return draft;
  }

  async getDraft<T>(id: string): Promise<Draft<T>> {
    const draft = this.store.get(id);
    if (!draft) throw new Error(`Draft not found: ${id}`);
    return draft as Draft<T>;
  }

  async updateDraft<T>(id: string, updates: Partial<T>): Promise<Draft<T>> {
    const draft = await this.getDraft<T>(id);
    const updated = {
      ...draft,
      draft_data: { ...draft.draft_data, ...updates },
    };
    this.store.set(id, updated);
    return updated;
  }

  /**
   * Phase 2 validation:
   * - Structural only
   * - No schema or field validation
   */
  validateDraft<T>(draft: Draft<T>): string[] {
    if (!draft.draft_data || Object.keys(draft.draft_data).length === 0) {
      return ['Draft data is empty'];
    }
    return [];
  }

  async dryRunSubmit<T>(id: string) {
    const draft = await this.getDraft<T>(id);
    const errors = this.validateDraft(draft);

    return {
      success: errors.length === 0,
      validationErrors: errors,
    };
  }
}
```

---

## 4. Preview Blocking Layer

### PreviewBlockedError

```typescript
export class PreviewBlockedError extends Error {
  action: string;
  isPreview = true;

  constructor(action: string, message?: string) {
    super(message ?? `Action "${action}" is blocked in preview mode.`);
    this.action = action;
    this.name = 'PreviewBlockedError';
  }
}
```

### PreviewBlocker

```typescript
export class PreviewBlocker {
  private blocked = new Set([
    'payment_charge',
    'wallet_transfer',
    'email_send',
    'job_finalize',
  ]);

  shouldBlock(action: string) {
    return isPreviewMode() && this.blocked.has(action);
  }

  async execute<T>(action: string, fn: () => Promise<T>) {
    if (this.shouldBlock(action)) {
      throw new PreviewBlockedError(action);
    }
    return fn();
  }
}
```

---

## 5. Preview Event Logging

### Logger Contract

```typescript
export interface PreviewEvent {
  timestamp: Date;
  sessionId: string;
  event: string;
  metadata?: Record<string, any>;
}
```

### Logger Implementation

```typescript
export class PreviewLogger {
  private sessionId = crypto.randomUUID();
  private flowTimers = new Map<string, number>();

  log(event: string, metadata?: Record<string, any>) {
    console.log('[preview]', {
      timestamp: new Date(),
      sessionId: this.sessionId,
      event,
      metadata,
    });
  }

  startFlow(name: string) {
    this.flowTimers.set(name, Date.now());
    this.log('[flow_start]', { name });
  }

  endFlow(name: string) {
    const start = this.flowTimers.get(name);
    this.log('[flow_end]', {
      name,
      duration: start ? Date.now() - start : undefined,
    });
    this.flowTimers.delete(name);
  }
}
```

---

## 6. Frontend Preview State

```typescript
export function PreviewProvider({ children }) {
  const isPreview = process.env.PREVIEW_MODE === 'true';
  const logger = useMemo(() => new PreviewLogger(), []);

  const canExecute = (action: string) => {
    if (!isPreview) return true;
    const flag = PREVIEW_ACTION_FLAGS[action];
    return flag ? PREVIEW_FLAGS[flag] === true : false;
  };

  return (
    <PreviewContext.Provider value={{ isPreview, canExecute, logger }}>
      {children}
    </PreviewContext.Provider>
  );
}
```

---

## 7. Example Flow (Job Posting)

```typescript
const draftService = useMemo(() => new DraftService(), []);

const handleSubmit = async () => {
  if (!canExecute('job_submit')) return;

  const draft = await draftService.createDraft(jobData);
  const result = await draftService.dryRunSubmit(draft.id);

  if (!result.success) {
    setErrors(result.validationErrors);
    return;
  }

  setStatus('preview');
};
```

---

## 8. Phase Boundaries (Explicit)

| Phase | Capability |
| --- | --- |
| Phase 1 | Read-only preview |
| **Phase 2** | Drafts, dry runs, observability |
| Phase 3 | Persistence, real validation |
| Phase 4 | Money (Stripe, Plaid) |

---

## 9. Transaction Boundaries & Data Integrity

### Canonical Rule

**All state mutations happen inside RPCs. Routes never open transactions.**

### Required RPCs (Complete List)

These are the **only** entry points for state mutations in Phase 2:

| RPC | Purpose | Transaction Required |
|-----|---------|---------------------|
| `rpc.create_draft` | Create a draft record | Yes (in-memory: no-op) |
| `rpc.update_draft` | Update draft data | Yes (in-memory: no-op) |
| `rpc.submit_preview` | Dry-run validation | Yes (read-only) |
| `rpc.log_preview_event` | Record analytics | No (append-only, best-effort) |
| `rpc.submit_feedback` | Save user feedback | Yes (low priority) |

### Default Transaction Policy

**Isolation Level:** `READ COMMITTED`  
**Retries:** 2 retries on serialization failure  
**Timeout:** DB default (typically 30s)  
**Preview Mode:** Mutations must no-op or roll back fully

### Transaction Implementation Pattern

```typescript
// services/rpc.ts
export async function create_draftRPC(data: any): Promise<RPCResult> {
  // Start transaction (only if DRAFTS_PERSISTED=true)
  const transactionRequired = process.env.DRAFTS_PERSISTED === 'true';
  
  if (!transactionRequired) {
    // In-memory: no transaction needed
    const draft = await draftService.createDraft(data);
    return { success: true, data: draft };
  }
  
  // DB-backed: use transaction
  const maxRetries = 2;
  let lastError;
  
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      const result = await db.transaction(async (tx) => {
        // 1. Check idempotency
        const existing = await tx.preview_events.get(idempotencyKey);
        if (existing) return existing;
        
        // 2. Create draft
        const draft = await tx.drafts.insert({
          ...data,
          is_preview: true,
          status: 'draft',
        });
        
        // 3. Log event (best effort, in same transaction)
        await tx.preview_events.insert({
          event_name: '[draft_create]',
          draft_id: draft.id,
        });
        
        return draft;
      });
      
      return { success: true, data: result };
    } catch (error) {
      lastError = error;
      
      // Retry on serialization failure
      if (error.code === '40001' && attempt < maxRetries) {
        await sleep(100 * (attempt + 1)); // Exponential backoff
        continue;
      }
      
      // Rollback on any other error
      throw error;
    }
  }
  
  throw lastError;
}
```

### Route Handler Pattern (No Transactions)

```typescript
// routes/preview.ts
app.post('/api/preview/drafts', async (c) => {
  // 1. Validate input (no DB access)
  const data = await c.req.json();
  
  // 2. Check feature flag (code/ENV/DB)
  if (!await getPreviewFlag('allow_drafts')) {
    return c.json({ error: 'Drafts not allowed' }, 403);
  }
  
  // 3. Call RPC (transaction happens inside)
  const result = await rpc.create_draftRPC(data);
  
  // 4. Return result
  return c.json(result);
});
```

### Why This Pattern?

1. **Single source of truth** for mutation logic
2. **Easy to test** (test RPCs, not routes)
3. **Consistent error handling** (all in one place)
4. **Audit trail** (all mutations logged in one place)
5. **Safe to refactor** (routes never touch DB directly)

### Preview Mode Rollback Semantics

When `PREVIEW_MODE=true`, all mutations **MUST**:

1. **Roll back fully** on error (no partial state)
2. **Not write to production tables** (even if flag allows)
3. **Log to preview_events only** (separate table)
4. **Return success to user** (don't expose DB errors)

```typescript
// Example: Preview mode mutation
async function previewMutation() {
  if (process.env.PREVIEW_MODE === 'true') {
    // 1. Validate in memory
    const errors = validateDraft(data);
    if (errors.length > 0) {
      return { success: false, errors };
    }
    
    // 2. Return "success" but don't write
    return { success: true, dry_run: true };
  }
  
  // Production: real mutation with transaction
  return await rpc.create_draftRPC(data);
}
```

### Dead Letter Queue (DLQ) for Failed Transactions

Failed preview transactions should **NOT** crash the user flow:

```typescript
// services/dlq.ts
export async function handleFailedTransaction(error: Error, context: any) {
  // 1. Log to DLQ (best effort)
  try {
    await db.dlq.insert({
      error: error.message,
      context,
      timestamp: new Date(),
    });
  } catch (dlqError) {
    // DLQ failure is not critical
    console.warn('DLQ write failed:', dlqError);
  }
  
  // 2. Return user-friendly error
  return {
    success: false,
    userMessage: 'Preview mode temporarily unavailable. Please try again.',
    retry: true,
  };
}
```

**Canonical Rule:** Transactions live in RPCs. Routes are dumb pipes. Preview mutations roll back fully.

---

## Summary

**Key Concepts:**
1. **Flag Precedence**: ENV > DB > Code (canonical, no exceptions)
2. **Draft Persistence**: In-memory by default, gated by `DRAFTS_PERSISTED=true`
3. **Startup Validation**: Critical guards prevent silent failures
4. **Transaction Boundaries**: RPCs only, routes are dumb pipes
5. **Preview Safety**: Zero destructive operations, full observability

**All code MUST:**
- Use `getPreviewFlag()` helper for all flag checks
- Run startup validation on every application boot
- Implement draft safety guards
- Follow RPC-only mutation pattern
- Log all meaningful preview events

**Result:** No more flag-related production incidents, no silent data loss, clear failure modes.
