# Startup Validation (Critical Guards)

**Purpose:** Prevent silent failures and configuration conflicts at application startup.

---

## 1. DRAFTS_PERSISTED Guard

### What It Checks

Verifies that the `drafts` table exists **before** attempting to use it.

### When It Runs

- On application startup
- Before any draft operations

### Code (Required Implementation)

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

### Error Message Format

```
DRAFTS_PERSISTED=true but drafts table not present.

ACTION REQUIRED:
1. Run migrations: npm run migrate:up
2. OR set DRAFTS_PERSISTED=false in your .env file
3. OR verify your database connection string is correct

To list available tables:
  npm run db:list-tables
```

---

## 2. Flag Precedence Validation

### What It Checks

Verifies that there are no conflicts between ENV, DB, and code defaults.

### When It Runs

- On application startup
- Logs warnings (doesn't crash)

### Code (Required Implementation)

```typescript
// startup/validation.ts
const PREVIEW_FLAGS_DEFAULTS = {
  allow_drafts: true,
  allow_profile_edit: true,
  allow_flow_walkthrough: true,
  block_finalize: true,
} as const;

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
    console.warn('[PREVIEW] FLAG PRECEDENCE WARNINGS');
    console.warn('='.repeat(60));
    warnings.forEach(w => console.warn(`[PREVIEW] ${w}`));
    console.warn('='.repeat(60) + '\n');
  }
}
```

### Example Output

```
============================================================
[PREVIEW] FLAG PRECEDENCE WARNINGS
============================================================
[PREVIEW] Flag conflict for "allow_drafts": ENV=true, DB=false. ENV takes precedence.
[PREVIEW] Flag conflict for "block_finalize": ENV=false, DB=true. ENV takes precedence.
============================================================
```

---

## 3. Required Tables Check

### What It Checks

Verifies all required Phase 2 tables exist.

### When It Runs

- On application startup (in development/test)
- Before deployment (in CI/CD)

### Required Tables

| Table | Phase | Required If |
|-------|-------|-------------|
| `preview_settings` | 2 | Always |
| `preview_events` | 2 | Always (for logging) |
| `preview_feedback` | 2 | Always |
| `drafts` | 2 | DRAFTS_PERSISTED=true |
| `request_applications` | 2 | Always |
| `task_requests` | 1/2 | Always |

### Code

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

---

## 4. Environment Variable Validation

### What It Checks

Verifies required environment variables are set.

### Required ENV Variables

| Variable | Required | Default | Purpose |
|----------|----------|---------|---------|
| `PREVIEW_MODE` | No | `false` | Global preview toggle |
| `DRAFTS_PERSISTED` | No | `false` | Draft persistence toggle |
| `DATABASE_URL` | Yes | - | Database connection |
| `PREVIEW_ALLOW_DRAFTS` | No | `true` | Draft creation flag |
| `PREVIEW_BLOCK_FINALIZE` | No | `true` | Finalization block flag |

### Code

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

---

## 5. Database Migration Check

### What It Checks

Verifies that all required migrations have been applied.

### When It Runs

- On application startup (in development)
- Before deployment (in CI/CD)

### Code

```typescript
// startup/validation.ts
const REQUIRED_MIGRATIONS = [
  '001_phase1_initial',
  '002_phase1_wallet_ui',
  '003_phase2_preview_core',
  '004_phase2_applications',
  '005_phase2_broadcast_support',
];

export async function validateMigrations(): Promise<void> {
  if (process.env.NODE_ENV === 'production') {
    // Production: migrations are managed separately
    return;
  }
  
  const applied = await db.migrations.list();
  const missing = REQUIRED_MIGRATIONS.filter(m => !applied.includes(m));
  
  if (missing.length > 0) {
    throw new Error(
      'Missing required migrations:\n' +
      missing.map(m => `  - ${m}`).join('\n') +
      '\n\nApply migrations: npm run migrate:up'
    );
  }
}
```

---

## 6. Startup Sequence (All Checks)

### Required Startup Order

```typescript
// startup/index.ts
import { validateEnvironment } from './validateEnvironment';
import { validateDraftsTable } from './validateDraftsTable';
import { validateFlagPrecedence } from './validateFlagPrecedence';
import { validateRequiredTables } from './validateRequiredTables';
import { validateMigrations } from './validateMigrations';

export async function runStartupChecks(): Promise<void> {
  console.log('[STARTUP] Running validation checks...');
  
  try {
    // 1. Validate environment variables (fastest, no DB)
    validateEnvironment();
    
    // 2. Validate migrations (requires DB)
    await validateMigrations();
    
    // 3. Validate required tables (requires DB)
    await validateRequiredTables();
    
    // 4. Validate drafts table (conditional)
    await validateDraftsTable();
    
    // 5. Validate flag precedence (warning only)
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

---

## 7. Integration with Application Entry Point

### Server Entry Point (Example)

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

### CLI Entry Point (Example)

```typescript
// scripts/migrate.ts
import { runStartupChecks } from '../startup';

async function migrate() {
  // Skip some checks for migration script
  process.env.DRAFTS_PERSISTED = 'true';
  
  await runStartupChecks();
  
  // Run migrations...
}

migrate().catch((error) => {
  console.error('Migration failed:', error);
  process.exit(1);
});
```

---

## 8. Testing Startup Checks

### Unit Tests

```typescript
// startup/validation.test.ts
describe('Startup Validation', () => {
  beforeEach(() => {
    // Reset environment
    delete process.env.PREVIEW_MODE;
    delete process.env.DRAFTS_PERSISTED;
  });
  
  describe('validateEnvironment', () => {
    it('passes when DATABASE_URL is set', () => {
      process.env.DATABASE_URL = 'postgres://localhost/test';
      expect(() => validateEnvironment()).not.toThrow();
    });
    
    it('throws when DATABASE_URL is missing', () => {
      delete process.env.DATABASE_URL;
      expect(() => validateEnvironment()).toThrow('DATABASE_URL');
    });
  });
  
  describe('validateDraftsTable', () => {
    it('skips check when DRAFTS_PERSISTED is false', async () => {
      process.env.DRAFTS_PERSISTED = 'false';
      // Should not call schema.hasTable
      await expect(validateDraftsTable()).resolves.not.toThrow();
    });
    
    it('throws when table missing and DRAFTS_PERSISTED=true', async () => {
      process.env.DRAFTS_PERSISTED = 'true';
      schema.hasTable.mockResolvedValue(false);
      
      await expect(validateDraftsTable()).rejects.toThrow(
        'DRAFTS_PERSISTED=true but drafts table not present'
      );
    });
  });
  
  describe('validateFlagPrecedence', () => {
    it('logs warnings on conflicts', async () => {
      process.env.PREVIEW_ALLOW_DRAFTS = 'true';
      db.preview_settings.get.mockResolvedValue('false');
      
      const consoleSpy = jest.spyOn(console, 'warn');
      await validateFlagPrecedence();
      
      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining('Flag conflict for "allow_drafts"')
      );
    });
    
    it('passes without conflicts', async () => {
      process.env.PREVIEW_ALLOW_DRAFTS = 'true';
      db.preview_settings.get.mockResolvedValue(null);
      
      const consoleSpy = jest.spyOn(console, 'warn');
      await validateFlagPrecedence();
      
      expect(consoleSpy).not.toHaveBeenCalledWith(
        expect.stringContaining('Flag conflict')
      );
    });
  });
});
```

### Integration Test

```typescript
// startup/integration.test.ts
describe('Startup Checks - Integration', () => {
  it('complete startup sequence with valid config', async () => {
    process.env.DATABASE_URL = 'postgres://localhost/test';
    process.env.PREVIEW_MODE = 'true';
    process.env.DRAFTS_PERSISTED = 'true';
    
    // Mock successful validations
    schema.hasTable.mockResolvedValue(true);
    db.migrations.list.mockResolvedValue([
      '001_phase1_initial',
      '002_phase1_wallet_ui',
      '003_phase2_preview_core',
      '004_phase2_applications',
      '005_phase2_broadcast_support',
    ]);
    
    await expect(runStartupChecks()).resolves.not.toThrow();
  });
  
  it('fails when required table missing', async () => {
    process.env.DATABASE_URL = 'postgres://localhost/test';
    schema.hasTable.mockImplementation((table) => {
      if (table === 'preview_settings') return true;
      if (table === 'preview_events') return true;
      if (table === 'preview_feedback') return true;
      if (table === 'request_applications') return false; // Missing!
      return false;
    });
    
    await expect(runStartupChecks()).rejects.toThrow(
      'Missing required Phase 2 tables'
    );
  });
});
```

---

## 9. Troubleshooting Guide

### Issue: "drafts table not present" when DRAFTS_PERSISTED=true

**Solution:**
```bash
# 1. Check if table exists
npm run db:list-tables | grep drafts

# 2. If missing, run migrations
npm run migrate:up

# 3. If migrations don't include drafts table, add it:
# Edit db/migrations/006_phase2_drafts.sql
```

### Issue: "Flag conflict" warnings in console

**Solution:**
1. Check your `.env` file
2. Check database `preview_settings` table
3. Decide which value to use (ENV takes precedence)
4. Update the lower-priority source to match

### Issue: "Missing required migrations"

**Solution:**
```bash
# List applied migrations
npm run migrate:list

# Apply missing migrations
npm run migrate:up

# If some migrations are missing, check:
# - db/migrations/ directory
# - Migration naming convention (001_, 002_, etc.)
```

---

## 10. Deployment Checklist

### Before Deployment

- [ ] Run `npm run validate:startup` locally
- [ ] All startup checks pass
- [ ] No conflicting flag warnings
- [ ] All required migrations applied to staging
- [ ] Database connection string verified
- [ ] Environment variables configured correctly

### During Deployment

- [ ] Startup checks run automatically
- [ ] Server fails to start if validation fails
- [ ] Logs show validation results
- [ ] No silent failures

### After Deployment

- [ ] Check logs for validation warnings
- [ ] Verify preview mode is disabled initially
- [ ] Monitor for any startup errors
- [ ] Run smoke tests

---

## 11. Command-Line Interface

### Run All Checks

```bash
npm run validate:startup
```

### Check Specific Component

```bash
# Check drafts table
npm run validate:drafts-table

# Check flag precedence
npm run validate:flags

# Check migrations
npm run validate:migrations
```

### Expected Output

```
[STARTUP] Running validation checks...
[STARTUP] Current Configuration
PREVIEW_MODE: false
DRAFTS_PERSISTED: false
[STARTUP] All validation checks passed ✓
```

---

## Summary

These startup checks **MUST** be implemented to prevent:

1. **Silent partial persistence** (worst failure mode)
2. **Configuration conflicts** (runtime bugs)
3. **Missing tables** (runtime errors)
4. **Broken migrations** (data corruption)
5. **Production incidents** (user-facing errors)

**Every Phase 2 deployment MUST run these checks before serving traffic.**
