# Manual Migration Upload Guide

**Status:** Active workflow (Supabase credentials consistently fail)  
**Last Updated:** 2026-01-21  
**Decision:** Use manual SQL upload via Supabase SQL Editor instead of CLI/automation

---

## 🎯 Decision Summary

Due to persistent Supabase credential issues, migrations are now prepared for **manual upload**. This approach is:

- ✅ **Reliable**: No authentication failures
- ✅ **Observable**: You see SQL execution results immediately
- ✅ **Safe**: Each migration applied individually with verification
- ✅ **Audit-friendly**: Supabase keeps migration history

---

## 📋 Current Migration Status

### Phase 1 Migrations (Ready for Manual Upload)

All migrations are in `/home/workspace/neighborgigs/db/migrations/phase1_ordered/` in **exact execution order**:

| # | File | Purpose | Critical |
|---|---|---|---|
| 1 | `001_initial_schema.sql` | Base tables (users, wallets, tasks) | |
| 2 | `002_rpc_functions.sql` | Core RPC functions | |
| 3 | `003_wallet_canonical_model.sql` | Wallet ledger model & balance logic | 🔴 |
| 4 | `003_add_broadcast_columns.sql` | Broadcast fields for tasks | |
| 5 | `003_broadcast_location.sql` | Location fields for broadcasts | |
| 6 | `003_broadcasts_support.sql` | Broadcast RPC functions | |
| 7 | `003_auto_on_move.sql` | Auto-enable on-move RPC | |
| 8 | `004_add_broadcast_id_to_task_requests.sql` | Add broadcast_id column | |
| 9 | `004_broadcast_idempotency.sql` | Idempotency for broadcasts | |
| 10 | `006_respond_to_broadcast.sql` | Respond to broadcast RPC | |
| 11 | `007_idempotency_fix.sql` | Idempotency fixes | |
| 12 | `008_fix_idempotency_rpc_text_keys.sql` | Fix RPC text keys | |
| 13 | `009_create_request_idempotency.sql` | Create request idempotency | |
| 14 | `009_decline_request_rpc.sql` | Decline request RPC | 🔴 |
| 15 | `010_fix_missing_wallets.sql` | Wallet bug fix | |

**⚠️ Critical Migrations:**
- `003_wallet_canonical_model.sql` - Financial data model
- `009_decline_request_rpc.sql` - Core RPC for request handling

---

## 🚀 Manual Upload Workflow

### Step 1: Backup Production Database

```bash
# Option A: Via Supabase Dashboard
# 1. Go to https://supabase.com/dashboard/project/{your-project}/storage
# 2. Click "Backups" in left sidebar
# 3. Click "Create backup"

# Option B: Via psql (if credentials work for backup)
pg_dump -h kxpglaetbawiugqmihfj.supabase.co \
  -U postgres \
  -d postgres \
  > backup_before_migrations_$(date +%Y%m%d_%H%M%S).sql
```

### Step 2: Test on Staging (If Available)

If you have a staging Supabase project:
1. Upload migrations to staging first
2. Verify all RPCs work
3. Run test scenarios

### Step 3: Apply Migrations Manually

**For each migration file in order:**

1. **Open Supabase SQL Editor**
   - Navigate to: `https://supabase.com/dashboard/project/{your-project}/sql`
   - Click "New query"

2. **Copy & Paste SQL**
   - Open the migration file on your computer
   - Copy entire content
   - Paste into SQL Editor

3. **Review & Run**
   - Review the SQL for any obvious errors
   - Click "Run" or press `Cmd/Ctrl + Enter`
   - Check the output panel for errors

4. **Verify Success**
   - Look for: `Success` message or `Query returned successfully`
   - If errors occur, stop and investigate before continuing

5. **Record Progress**
   - Mark migration as complete in your tracking system
   - Note any warnings or issues

### Step 4: Apply in Exact Order

**Execution Order (Copy these sequentially):**

```bash
# Navigate to migration directory
cd /home/workspace/neighborgigs/db/migrations/phase1_ordered

# Files in this EXACT order:
# 001_initial_schema.sql
# 002_rpc_functions.sql
# 003_wallet_canonical_model.sql
# 003_add_broadcast_columns.sql
# 003_broadcast_location.sql
# 003_broadcasts_support.sql
# 003_auto_on_move.sql
# 004_add_broadcast_id_to_task_requests.sql
# 004_broadcast_idempotency.sql
# 006_respond_to_broadcast.sql
# 007_idempotency_fix.sql
# 008_fix_idempotency_rpc_text_keys.sql
# 009_create_request_idempotency.sql
# 009_decline_request_rpc.sql
# 010_fix_missing_wallets.sql
```

---

## 🛡️ Safety Procedures

### Before Each Migration

**Check for Conflicts:**
```sql
-- Run this in SQL Editor before applying a migration
-- to see if tables/columns already exist
SELECT table_name, column_name 
FROM information_schema.columns 
WHERE table_schema = 'public' 
ORDER BY table_name, ordinal_position;
```

**Expected State for Critical Migrations:**

For `003_wallet_canonical_model.sql`:
- Should see: `ledger_entries` table (old name)
- Will create: `wallet_transactions` table
- Will rename: `ledger_entries` → `wallet_transactions`

### After Each Migration

**Verify Core Functionality:**
```sql
-- After 001_initial_schema.sql
SELECT tablename FROM pg_tables WHERE schemaname = 'public' ORDER BY tablename;

-- After 002_rpc_functions.sql
SELECT proname FROM pg_proc WHERE proname LIKE '%rpc%' ORDER BY proname;

-- After 003_wallet_canonical_model.sql
SELECT * FROM wallet_transactions LIMIT 1;
SELECT proname FROM pg_proc WHERE proname LIKE 'get_wallet%';

-- After 009_decline_request_rpc.sql
SELECT proname FROM pg_proc WHERE proname LIKE 'decline_request%';
```

### If Migration Fails

**Immediate Actions:**
1. **STOP** - Don't apply more migrations
2. Copy error message from SQL Editor
3. Restore from backup if critical
4. Document the failure in your notes
5. Fix the issue (may need to create a new forward migration)

**Common Errors & Solutions:**

| Error | Likely Cause | Solution |
|-------|--------------|----------|
| `column "X" already exists` | Migration already applied | Skip this migration or check `schema_migrations` |
| `function "X" does not exist` | Missing dependency | Apply earlier migrations in correct order |
| `relation "X" does not exist` | Missing base tables | Ensure 001_initial_schema.sql applied |
| `duplicate key value violates unique constraint` | Idempotency issue | Check idempotency_keys table |

---

## 📋 Post-Migration Verification

### Critical Tests to Run

**1. RPC Functionality Check**
```sql
-- Test basic RPCs exist
SELECT proname, nargs 
FROM pg_proc 
WHERE proname IN (
  'accept_request',
  'complete_task',
  'get_wallet',
  'create_broadcast_with_idempotency',
  'respond_to_broadcast_with_idempotency',
  'decline_request_with_idempotency'
)
ORDER BY proname;
```

**2. Wallet Balance Calculation**
```sql
-- Test wallet functions
SELECT 
  u.first_name,
  get_available_balance_cents(u.id) as available,
  get_pending_balance_cents(u.id) as pending
FROM users u
LIMIT 3;
```

**3. Idempotency Keys Table**
```sql
-- Verify idempotency table structure
SELECT column_name, data_type
FROM information_schema.columns
WHERE table_name = 'idempotency_keys'
ORDER BY ordinal_position;

-- Check for existing keys
SELECT * FROM idempotency_keys LIMIT 5;
```

**4. RPC Return Types**
```sql
-- Test decline_request RPC returns JSON
SELECT 
  proname,
  prorettype::regtype as return_type,
  proargtypes::regtype[] as arg_types
FROM pg_proc
WHERE proname LIKE '%decline_request%';
```

### User Flow Tests

**Manual Test Checklist:**
- [ ] User can create broadcast
- [ ] Helper can respond to broadcast
- [ ] Helper can decline request (uses new RPC)
- [ ] Task completion credits wallet
- [ ] Wallet balance shows correctly
- [ ] On-the-move auto-enables on task accept

**Test Script (Node.js/Bun):**
```javascript
// test-migrations.js
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

async function testRPCs() {
  // Test decline RPC
  const { data, error } = await supabase.rpc('decline_request_with_idempotency', {
    p_idempotency_key: 'test:decline:123',
    p_request_id: '00000000-0000-0000-0000-000000000001',
    p_helper_id: '00000000-0000-0000-0000-000000000002'
  })
  
  console.log('Decline RPC result:', data, error)
  
  // Run again with same key - should be idempotent
  const { data: data2, error: error2 } = await supabase.rpc('decline_request_with_idempotency', {
    p_idempotency_key: 'test:decline:123',
    p_request_id: '00000000-0000-0000-0000-000000000001',
    p_helper_id: '00000000-0000-0000-0000-000000000002'
  })
  
  console.log('Second call result:', data2, error2)
}

testRPCs()
```

---

## 🔄 Alternative: psql CLI (If Credentials Work)

If you get psql working for a specific project:

```bash
# Set connection string
export DATABASE_URL="postgres://postgres:{password}@kxpglaetbawiugqmihfj.supabase.co:6543/postgres"

# Apply in order (from phase1_ordered directory)
psql -v ON_ERROR_STOP=1 "$DATABASE_URL" -f 001_initial_schema.sql
psql -v ON_ERROR_STOP=1 "$DATABASE_URL" -f 002_rpc_functions.sql
psql -v ON_ERROR_STOP=1 "$DATABASE_URL" -f 003_wallet_canonical_model.sql
# ... continue for all files
```

---

## 📝 Migration Tracking Template

Create a tracking document to record your progress:

```markdown
# Migration Application Log

**Environment:** Production / Staging  
**Started:** [DATE TIME]  
**Completed:** [DATE TIME]  
**Applied By:** [YOUR NAME]

| # | Migration File | Applied At | Status | Notes |
|---|----------------|------------|--------|-------|
| 1 | 001_initial_schema.sql | [TIME] | ✅ | |
| 2 | 002_rpc_functions.sql | [TIME] | ✅ | |
| 3 | 003_wallet_canonical_model.sql | [TIME] | ✅ | |
| ... | ... | ... | ... | ... |

## Issues Encountered
- [List any errors, warnings, or unexpected behavior]

## Verification Results
- [Paste output from verification queries]

## Next Steps
- [ ] Apply remaining migrations
- [ ] Run integration tests
- [ ] Monitor for 24 hours
- [ ] Document any production issues
```

---

## 🆘 Troubleshooting

### Supabase SQL Editor Issues

**"Query timed out"**
- Split large migrations into smaller chunks
- Add `--` comments to explain sections
- Check for infinite loops in triggers

**"Function already exists"**
- Migration may have been partially applied
- Use `CREATE OR REPLACE` (already in our migrations)
- Check `pg_proc` for existing functions

**"Transaction conflict"**
- Try running migration during low-traffic period
- Use `BEGIN;` and `COMMIT;` blocks explicitly

### Database State Issues

**Check what's already applied:**
```sql
-- View Supabase migration history
SELECT version, executed_at 
FROM supabase_migrations.schema_migrations 
ORDER BY version;
```

**If migrations are partially applied:**
1. Identify last successfully applied migration
2. Resume from next migration in sequence
3. Document the gap

---

## 🎯 Success Criteria

**Migration is successful when:**

✅ All 15 Phase 1 migrations applied without errors  
✅ All RPC functions return 200 (no "function does not exist")  
✅ Wallet balance calculations work  
✅ Decline endpoint uses new idempotent RPC  
✅ No duplicate key errors in production  
✅ Broadcast creation works  
✅ Task completion credits wallet correctly  
✅ Withdrawal debits wallet correctly  
✅ 24 hours of production monitoring with no critical errors  

---

## 📚 Reference Documents

- `MIGRATION_ORDER.md` - Migration order and dependencies
- `MANUAL_MIGRATION_UPLOAD.md` - This document (manual upload workflow)
- `db/migrations/phase1_ordered/` - Actual SQL files in execution order
- `db/MIGRATION_CANONICAL_ORDER.md` - Authoritative migration order (never modify)

---

## ⚠️ Important Reminders

1. **NEVER** modify or delete migrations that may be applied to any environment
2. **ALWAYS** create new forward migrations for fixes
3. **ALWAYS** back up before applying migrations
4. **ALWAYS** test on staging if available
5. **DOCUMENT** all issues and resolutions
6. **NEVER** modify Supabase's `schema_migrations` table directly

---

## 📞 Support

If you encounter critical issues:
1. Stop all migrations immediately
2. Restore from backup if needed
3. Document the exact error message
4. Check migration dependencies
5. Create forward migration to fix (don't delete/reorder)

For urgent help:
- Email: help@zocomputer.com
- Discord: https://discord.gg/invite/zocomputer
- Zo Support: https://support.zocomputer.com
