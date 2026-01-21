# Flag Conflict Resolution (Authoritative)

**Purpose:** Define the one and only way to resolve conflicts between ENV, DB, and code defaults.

---

## The Canonical Precedence

**ENV – highest priority, requires deploy/restart**  
**DB – runtime override / hotfix**  
**Code defaults – fallback only**  

**No exceptions. No "usually." No hand-waving.**

---

## Why This Hierarchy?

| Priority | Source | Characteristics | Use Case |
|----------|--------|-----------------|----------|
| **1 (Highest)** | ENV variables | - Requires deploy/restart<br>- Version-controlled<br>- Audit trail<br>- Intentional changes | Production deployments, feature rollouts |
| **2 (Middle)** | Database settings | - Runtime changeable<br>- Hotfix capability<br>- Riskier (no deploy cycle) | Emergency fixes, experiments, A/B tests |
| **3 (Lowest)** | Code defaults | - Cannot change at runtime<br>- Safe fallback<br>- Always available | Development, staging, last resort |

---

## Single Source of Truth: `getPreviewFlag()`

**All code MUST use this function. Never access flags directly.**

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
```

---

## Startup Validation: Warn on Conflicts

**At startup, log warnings when ENV and DB disagree.**

```typescript
// startup/validation.ts
export async function validateFlagPrecedence(): Promise<void> {
  const warnings: string[] = [];
  
  for (const flag of Object.keys(PREVIEW_FLAGS_DEFAULTS)) {
    const envKey = `PREVIEW_${flag.toUpperCase()}`;
    const envValue = process.env[envKey];
    
    try {
      const dbValue = await db.preview_settings.get(flag);
      
      // Conflict detected
      if (envValue !== undefined && dbValue !== null && envValue !== dbValue) {
        warnings.push(
          `Flag conflict for "${flag}": ENV=${envValue}, DB=${dbValue}. ` +
          `ENV takes precedence.`
        );
      }
    } catch (error) {
      // DB unavailable, ENV will be used (no conflict)
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

---

## Decision Matrix: Who Wins?

### Case 1: ENV set, DB set, Code default exists

```
ENV:  PREVIEW_ALLOW_DRAFTS=true
DB:   preview_allow_drafts=false
Code: allow_drafts=true

Result: ON (ENV wins)
Reason: ENV > DB > Code
```

### Case 2: ENV not set, DB set, Code default exists

```
ENV:  (not set)
DB:   preview_allow_drafts=true
Code: allow_drafts=false

Result: ON (DB wins)
Reason: DB > Code (ENV absent)
```

### Case 3: ENV not set, DB not set, Code default exists

```
ENV:  (not set)
DB:   (not set)
Code: allow_drafts=true

Result: ON (Code default)
Reason: Code is fallback
```

### Case 4: ENV set to invalid value

```
ENV:  PREVIEW_ALLOW_DRAFTS=invalid
DB:   preview_allow_drafts=true
Code: allow_drafts=false

Result: OFF (ENV parsed as false)
Reason: ENV === 'true' check fails
```

### Case 5: ENV not set, DB unavailable

```
ENV:  (not set)
DB:   (connection fails)
Code: allow_drafts=true

Result: ON (Code default)
Reason: DB error → continue to code
Log:   "[PREVIEW] DB check failed for "allow_drafts", using code default"
```

---

## Common Scenarios & Resolution

### Scenario 1: Feature Rollout

**Goal:** Enable preview mode for 10% of users

**Correct Approach:**
```bash
# 1. Update ENV (requires deploy)
# .env.production
PREVIEW_MODE=true
PREVIEW_ALLOW_DRAFTS=true

# 2. Deploy (server restarts with new ENV)

# 3. No DB changes needed
# DB settings remain as-is (ignored)
```

**Wrong Approach:**
```bash
# ❌ Updating DB directly
UPDATE preview_settings SET value = 'true' WHERE key = 'preview_mode';
# Result: ENV=undefined, DB=true, Code=false → OFF (Code wins)
# No effect!
```

### Scenario 2: Emergency Hotfix

**Goal:** Disable a broken feature without redeploying

**Correct Approach:**
```bash
# 1. Update DB (no deploy needed)
UPDATE preview_settings SET value = 'false' WHERE key = 'preview_allow_drafts';

# 2. Verify ENV is NOT set for this flag
# Check: env | grep PREVIEW_ALLOW_DRAFTS
# Should return nothing

# 3. Result: ENV=undefined, DB=false, Code=true → OFF (DB wins)
```

**Wrong Approach:**
```bash
# ❌ Setting ENV (requires redeploy)
# Can't hotfix without deploy cycle
```

### Scenario 3: Conflict Resolution

**Problem:** ENV says ON, DB says OFF (developer confusion)

**Investigation:**
```bash
# 1. Check ENV
echo $PREVIEW_ALLOW_DRAFTS
# Output: true

# 2. Check DB
SELECT value FROM preview_settings WHERE key = 'preview_allow_drafts';
# Output: false

# 3. Check logs
grep "FLAG CONFLICT" /var/log/app.log
# Output: [PREVIEW] Flag conflict for "allow_drafts": ENV=true, DB=false. ENV takes precedence.

# 4. Resolution:
# Option A: Update DB to match ENV (preferred)
UPDATE preview_settings SET value = 'true' WHERE key = 'preview_allow_drafts';

# Option B: Update ENV to match DB (requires redeploy)
# Edit .env file: PREVIEW_ALLOW_DRAFTS=false
# Deploy: npm run deploy

# Option C: Remove ENV override entirely
# Edit .env file: remove PREVIEW_ALLOW_DRAFTS line
# Deploy: npm run deploy
# Result: DB value will be used (true)
```

---

## Flag Conflicts: Never Do This

### ❌ Never Read ENV Directly in Business Logic

```typescript
// WRONG - Causes inconsistency
if (process.env.PREVIEW_ALLOW_DRAFTS === 'true') {
  // This bypasses DB and code defaults
  // No warning on conflicts
}

// RIGHT - Always use helper
const allowDrafts = await getPreviewFlag('allow_drafts');
if (allowDrafts) {
  // Consistent, validated, warned-on conflicts
}
```

### ❌ Never Update DB Without Considering ENV

```typescript
// WRONG - Silent failure if ENV is set
db.preview_settings.update('allow_drafts', false);
// If ENV=true, this has NO effect

// RIGHT - Check ENV first
const envValue = process.env.PREVIEW_ALLOW_DRAFTS;
if (envValue !== undefined) {
  throw new Error(
    'Cannot update DB when ENV is set. ' +
    'Remove ENV override first or update ENV instead.'
  );
}
db.preview_settings.update('allow_drafts', false);
```

### ❌ Never Hardcode Flags Without Fallbacks

```typescript
// WRONG - No fallback if DB fails
const allowDrafts = await db.preview_settings.get('allow_drafts');

// RIGHT - Always have fallbacks
const allowDrafts = await getPreviewFlag('allow_drafts');
// Handles: ENV, DB, Code, DB failures
```

---

## Flag Management API

### Read Flag (Public API)

```typescript
// Frontend: Use React Hook
export function usePreviewFlag(name: string): boolean {
  const [value, setValue] = useState(false);
  
  useEffect(() => {
    fetch(`/api/preview/flags/${name}`)
      .then(res => res.json())
      .then(data => setValue(data.value));
  }, [name]);
  
  return value;
}

// Backend: Use helper
const allowDrafts = await getPreviewFlag('allow_drafts');
```

### Update Flag (Admin/Dev Only)

```typescript
// Admin endpoint (protected)
app.post('/admin/preview/flags', async (c) => {
  const { flag, value } = await c.req.json();
  
  // Verify ENV is not set for this flag
  const envKey = `PREVIEW_${flag.toUpperCase()}`;
  if (process.env[envKey] !== undefined) {
    return c.json({
      error: 'Cannot update DB when ENV is set',
      envValue: process.env[envKey],
      dbValue: value,
    }, 400);
  }
  
  // Update DB
  await db.preview_settings.update(flag, value);
  
  return c.json({ success: true, flag, value });
});
```

---

## Deployment Playbook

### Before Deploy: Flag Audit

```bash
# 1. Check all ENV flags
echo "ENV Flags:"
env | grep PREVIEW_

# 2. Check all DB flags
echo "DB Flags:"
psql -c "SELECT key, value FROM preview_settings;"

# 3. Check for conflicts
npm run validate:flags

# Expected output:
# [PREVIEW] All flag conflicts resolved ✓
```

### During Deploy: ENV Changes

```bash
# 1. Update .env file
# Add/remove/modify PREVIEW_* variables

# 2. Restart application
# Systemd: sudo systemctl restart neighbor-gigs
# Docker: docker-compose restart app

# 3. Verify startup logs
journalctl -u neighbor-gigs -f
# Should see: "[STARTUP] All validation checks passed ✓"
```

### After Deploy: Verify

```bash
# 1. Check application logs for conflicts
grep "FLAG CONFLICT" /var/log/app.log

# 2. Test feature flag behavior
curl https://your-app.com/api/preview/test
# Should return current flag values

# 3. Verify monitoring
# Check: /admin/preview/flags dashboard
```

---

## Testing Flag Resolution

### Unit Tests

```typescript
// flags/preview.test.ts
describe('getPreviewFlag', () => {
  beforeEach(() => {
    delete process.env.PREVIEW_ALLOW_DRAFTS;
    db.preview_settings.get.mockReset();
  });
  
  it('ENV overrides DB and code', async () => {
    process.env.PREVIEW_ALLOW_DRAFTS = 'true';
    db.preview_settings.get.mockResolvedValue('false');
    
    const result = await getPreviewFlag('allow_drafts');
    expect(result).toBe(true); // ENV wins
  });
  
  it('DB overrides code when ENV not set', async () => {
    delete process.env.PREVIEW_ALLOW_DRAFTS;
    db.preview_settings.get.mockResolvedValue('false');
    
    const result = await getPreviewFlag('allow_drafts');
    expect(result).toBe(false); // DB wins
  });
  
  it('Code default when ENV and DB not set', async () => {
    delete process.env.PREVIEW_ALLOW_DRAFTS;
    db.preview_settings.get.mockResolvedValue(null);
    
    const result = await getPreviewFlag('allow_drafts');
    expect(result).toBe(true); // Code default wins
  });
  
  it('Uses code default when DB fails', async () => {
    delete process.env.PREVIEW_ALLOW_DRAFTS;
    db.preview_settings.get.mockRejectedValue(new Error('DB offline'));
    
    const result = await getPreviewFlag('allow_drafts');
    expect(result).toBe(true); // Code default
  });
});
```

### Integration Tests

```typescript
// flags/integration.test.ts
describe('Flag Precedence - Integration', () => {
  it('complete resolution flow', async () => {
    // Setup: ENV set, DB conflicting, Code default different
    process.env.PREVIEW_ALLOW_DRAFTS = 'true';
    db.preview_settings.get.mockResolvedValue('false'); // DB says false
    
    // Test: Should be ON (ENV wins)
    const result = await getPreviewFlag('allow_drafts');
    expect(result).toBe(true);
    
    // Verify: Warning was logged
    expect(console.warn).toHaveBeenCalledWith(
      expect.stringContaining('Flag conflict for "allow_drafts"')
    );
  });
});
```

---

## Decision Log Template

### When You Change a Flag

Create a decision log entry:

```markdown
# Flag Change Decision Log

**Date:** 2026-01-20
**Changed by:** [Your Name]
**Flag:** PREVIEW_ALLOW_DRAFTS

## Context
[Why are you changing this flag?]

## Decision
- **ENV change:** Yes/No
- **DB change:** Yes/No
- **Previous value:** [old]
- **New value:** [new]

## Impact Analysis
- Users affected: [description]
- Risk level: [low/medium/high]
- Rollback plan: [steps]

## Verification
- [ ] Flag read correctly after change
- [ ] No conflicts detected at startup
- [ ] Feature works as expected
- [ ] Monitoring shows no errors

## Sign-off
[Name] - [Date]
```

---

## Emergency Procedures

### If Flags Are Completely Broken

**Symptoms:**
- All preview features working incorrectly
- Flags returning unexpected values
- Startup warnings about conflicts

**Immediate Action:**
```bash
# 1. Check current state
curl /api/preview/status

# 2. Compare ENV vs DB
echo "ENV:"
env | grep PREVIEW_ | sort
echo ""
echo "DB:"
psql -c "SELECT key, value FROM preview_settings ORDER BY key;"

# 3. If ENV is source of truth:
#    - Deploy ENV changes to match desired state
#    - Restart application

# 4. If DB is source of truth:
#    - Remove conflicting ENV variables
#    - Restart application

# 5. If both are wrong:
#    - Update DB first (no deploy needed)
#    - Verify fix
#    - Update ENV for next deploy
```

### If ENV Variables Are Wrong in Production

**Symptom:** Wrong ENV values deployed

**Fix:**
```bash
# 1. Edit environment configuration
# For systemd: /etc/systemd/system/neighbor-gigs.service
# For Docker: docker-compose.yml

# 2. Reload systemd (if applicable)
sudo systemctl daemon-reload

# 3. Restart application
sudo systemctl restart neighbor-gigs

# 4. Verify
journalctl -u neighbor-gigs -f
```

---

## Summary

**Canonical Rule:** ENV > DB > Code. Always. No exceptions.

**Key Principles:**
1. ENV is source of truth for deployments
2. DB is for runtime hotfixes
3. Code defaults are fallbacks
4. Always warn on conflicts
5. Never bypass the helper function

**All code MUST:**
- Use `getPreviewFlag()` helper
- Log conflicts at startup
- Validate ENV doesn't conflict with DB
- Document all flag changes

**Result:** No more flag-related production incidents.
