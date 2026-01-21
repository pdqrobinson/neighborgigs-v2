# Correct Migration Order for NeighborGigs

**Critical:** Always run migrations in this exact order. This prevents dependency conflicts and ensures schemas evolve correctly.

**Last Updated:** 2026-01-21  
**Why:** Original numbering had conflicts (multiple 003_ and 004_ files) causing deployment failures.

---

## ⚠️ SUPABASE CREDENTIALS ISSUE - MANUAL UPLOAD WORKFLOW

**Decision:** Due to persistent Supabase credential authentication failures, migrations are now deployed via **manual upload** instead of CLI automation.

**What this means:**
- ❌ No longer using `psql` command-line tool
- ❌ No automated migration scripts
- ✅ Manual upload via Supabase SQL Editor
- ✅ Individual migration verification
- ✅ Safe, observable, audit-friendly process

**New workflow document:** See `MANUAL_MIGRATION_UPLOAD.md` for step-by-step instructions.

**Why this is better:**
- Eliminates credential authentication failures
- Provides immediate feedback on each migration
- Maintains Supabase's built-in migration tracking
- Allows verification between each step
- Easier to audit and troubleshoot

---

## 🔴 Correct Migration Order

| Order | Filename | Purpose | Dependencies |
|-------|----------|---------|--------------|
| 1 | `001_initial_schema.sql` | Base tables (users, wallets, tasks, etc.) | None |
| 2 | `002_rpc_functions.sql` | Core RPC functions | Requires 001 |
| 3 | `003_wallet_canonical_model.sql` | Wallet ledger model (renames ledger_entries → wallet_transactions) | Requires 002 (uses RPCs) |
| 4 | `004_broadcast_add_columns.sql` | Add broadcast fields to tasks/task_requests | Requires 001 |
| 5 | `005_broadcast_rpc_functions.sql` | Broadcast RPCs | Requires 004 |
| 6 | `006_idempotency_base.sql` | Idempotency table | None |
| 7 | `007_idempotency_text_keys.sql` | Fix key format consistency | Requires 006 |
| 8 | `008_request_idempotency.sql` | Request RPCs with idempotency | Requires 007 |
| 9 | `009_decline_request_rpc.sql` | Decline RPC (CRITICAL - APPLY THIS) | Requires 008 |
| 10 | `010_fix_missing_wallets.sql` | Fix missing wallet rows | Requires 003 |
| 11 | `011_auto_on_move.sql` | Auto-enable on_move on task accept | Requires 001 |
| 12 | `012_phase2_preview_tables.sql` | Phase 2 analytics tables | Phase 2 preparation |

---

## 🚀 Deployment Steps

### 1. Backup Production
```bash
# Always backup before migrations
pg_dump -h [HOST] -U [USER] [DB_NAME] > backup_before_phase1_ordering.sql
```

### 2. Test on Staging
```bash
# Test migrations in staging environment first
for file in phase1_ordered/*.sql; do
  echo "Applying $file..."
  psql -v ON_ERROR_STOP=1 -h [STAGING_HOST] -d [STAGING_DB] -f "$file"
  if [ $? -ne 0 ]; then
    echo "❌ Migration failed on $file"
    exit 1
  fi
done
echo "✅ All migrations applied successfully to staging"
```

### 3. Apply to Production
```bash
# Clear any cached connections before applying
# Give Supabase 1-2 minutes to clear caches

# Apply in correct order
for file in phase1_ordered/*.sql; do
  echo "🌟 Applying $file..."
  psql -v ON_ERROR_STOP=1 -h [PROD_HOST] -d [PROD_DB] -f "$file"
  if [ $? -ne 0 ]; then
    echo "❌ CRITICAL: Migration failed on $file"
    echo "Restore from backup and investigate"
    exit 1
  fi
done

# Run data integrity checks
echo "🔍 Running post-migration checks..."
./scripts/run-integrity-checks.sh
```

### 4. Verify Success
```bash
# Test critical functionality
./scripts/test-critical-rpcs.sh

# Check user-facing features
./scripts/test-user-flows.sh

# Monitor for 24 hours
./scripts/monitor-errors.sh &
```

---

## 🛡️ Rollback Plan

### If Migration Fails

**Immediate Actions:**
1. Stop all user traffic (maintenance mode)
2. Restore from pre-migration backup
3. Investigate failure reason
4. Fix issue in staging
5. Test again on staging
6. Apply to production

**Rollback Commands:**
```bash
# Restore from backup
psql -h [HOST] -d [DB_NAME] < backup_before_phase1_ordering.sql

# Clear any new tables created during failed migration
drop table if exists broadcast_requests cascade;
drop table if exists idempotency_keys cascade;
-- Add other rollback drops based on failure point
```

### Partial Migration Handling

If some migrations succeeded and others failed:

```bash
# Find the failure point
# Restore from backup
# Identify which tables/schemas were successfully modified
# Create targeted fix migration
# Apply only the remaining ordered migrations
```

---

## 📋 Dependencies Details

### 001 → Other Migrations
- **Provides:** Base tables (users, wallets, tasks, task_requests)
- **Required By:** All other migrations

### 002 → 003
- **003** calls `complete_task` RPC defined in **002**
- **003** references wallet tables from **001**
- **Cannot run 003 before 002**

### 003 → 010
- **010** fixes `get_wallet` function (calls `get_wallet()` RPC from **003**)
- Must run **003** (renames table) before **010** (fixes table content)

### 007 → 008, 009
- **008** builds on idempotency functions from **007**
- **009** depends on **008** for request idempotency
- **009** is the critical decline RPC we must apply

### Phase 1 → Phase 2
- Phase 2 migrations can reference Phase 1 tables
- But Phase 2 development should start only after Phase 1 is stable

---

## 🔧 Troubleshooting

### Common Issues

**"Function does not exist" errors**
- Migration order wrong (e.g., 003 before 002)
- Supabase cache stale after migration
- Fix: Reorder migrations, redeploy

**"Table does not exist" errors**
- Base schema migration not run (001 missing)
- Wrong database connection
- Fix: Verify 001 applied, check connection

**"Duplicate key" errors**
- Migration run multiple times
- Using `IF NOT EXISTS` incorrectly
- Fix: Add `ON CONFLICT` or skip already-applied migrations

**"Authentication failed" / "Connection refused"**
- Supabase credentials not working
- Fix: **Use manual upload workflow** (see `MANUAL_MIGRATION_UPLOAD.md`)

### Supabase Credential Issues

**Why CLI/automation fails:**
- Supabase's password-based auth is unreliable
- Connection pooling timeouts
- SSL/TLS negotiation failures
- Role permission inconsistencies

**Solution: Manual Upload**
1. Go to Supabase SQL Editor
2. Copy migration SQL
3. Paste and run manually
4. Verify success before next migration

**Manual workflow advantages:**
- ✅ No credential issues
- ✅ Immediate feedback
- ✅ Step-by-step control
- ✅ Built-in Supabase migration tracking

### Verification Queries

**After Full Migration, Run:**
```sql
-- Check core tables exist
SELECT schemaname, tablename
FROM pg_tables
WHERE schemaname = 'public'
ORDER BY tablename;

-- Check key RPCs exist
SELECT proname
FROM pg_proc
WHERE proname LIKE '%rpc%' OR proname LIKE 'get_wallet%'
ORDER BY proname;

-- Check idempotency working
SELECT * FROM idempotency_keys LIMIT 1;

-- Check wallet balances work
SELECT u.first_name, get_available_balance_cents(u.id)
FROM users u LIMIT 3;
```

---

## 📋 Migration Tracking

**Current Workflow:** Manual upload via Supabase SQL Editor

**Active Migration Files:**
- Location: `/home/workspace/neighborgigs/db/migrations/phase1_ordered/`
- Total: 15 migrations (as of 2026-01-21)
- Status: Ready for manual upload

**Manual Upload Process:**
1. Open `MANUAL_MIGRATION_UPLOAD.md`
2. Follow step-by-step instructions
3. Track progress in migration log
4. Verify after each migration

**When automation is restored:**
- The migration files in `phase1_ordered/` remain unchanged
- Scripts can be updated to use psql if credentials work
- Manual workflow remains as reliable fallback

---

## 🎯 Success Metrics

### Verified Working After Migration
- [ ] All RPCs return 200 (no function not found)
- [ ] Wallet balance calculations work
- [ ] Decline endpoint uses new RPC
- [ ] No duplicate key errors
- [ ] Broadcast creation works
- [ ] Task completion credits wallet
- [ ] Withdrawal debits wallet

### Production Ready When
- [ ] 24 hours no errors in logs
- [ ] All critical user flows tested
- [ ] Backups verified restorable
- [ ] Rollback plan tested
- [ ] Manual upload process documented

---

## 📋 Deployment Checklist

- [ ] Backup taken
- [ ] Staging tested
- [ ] Production panel "maintenance mode" on
- [ ] Slow period selected (low user activity)
- [ ] Teammates informed
- [ ] Run migrations in exact order
- [ ] Run integrity checks
- [ ] Test critical flows
- [ ] Turn maintenance mode off
- [ ] Monitor for 24 hours
- [ ] Document issues/resolutions

---

## 🎯 Phase 2 Ready When

This migration ordering is complete and verified. Then you can safely start Phase 2 development without database conflicts.

**Investment:** 2-3 hours to fix ordering + documentation  
**Return:** Prevents 5-7 weeks of Phase 2 debugging

---

## 🔄 Transition Notes

**Current State (2026-01-21):**
- Migrations prepared for manual upload
- Supabase credentials unreliable
- CLI automation blocked

**Future State (if credentials fixed):**
- Can switch back to psql automation
- Manual workflow remains as fallback
- Migration files unchanged

**Decision Rationale:**
- Manual upload is more reliable than CLI
- Immediate verification at each step
- No credential authentication failures
- Better for audit trail
- Easier troubleshooting

---

**Remember:** Migration order matters. Run them in exact sequence. Use manual upload workflow.

🚀