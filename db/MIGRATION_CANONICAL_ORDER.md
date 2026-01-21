# Migration Canonical Order (Authoritative)

**Created:** 2026-01-20  
**Purpose:** This document defines the authoritative order of Phase 1 migrations.  
**Rule:** NEVER delete or renumber existing migrations. This is the law.

---

## 🔴 CRITICAL SENIOR-DEV RULE

**NEVER delete or renumber a migration that may already be applied to any environment.**

- ❌ Not dev
- ❌ Not staging  
- ❌ Not prod
- ❌ Not Supabase's internal migration table

If you violate that, you don't get a clean slate — you get Schrödinger's database.

---

## Phase 1 Migrations (Frozen - Do Not Touch)

These migrations are FROZEN. No renaming, deletion, or reordering is allowed.

### Canonical Execution Order

The following is the logical execution order. File names are historical and do not reflect actual execution order.

| # | File | Description | Status | Critical |
|---|---|---|---|---|
| 1 | `001_initial_schema.sql` | Initial tables (users, wallets, task_requests) | ✅ Complete | |
| 2 | `002_rpc_functions.sql` | Base RPC functions | ✅ Complete | |
| 3 | `003_wallet_canonical_model.sql` | **CRITICAL: Wallet model & balance logic** | ✅ Complete | 🔴 |
| 4 | `003_add_broadcast_columns.sql` | Add broadcast fields to task_requests | ✅ Complete | |
| 5 | `003_broadcast_location.sql` | Location fields for broadcasts | ✅ Complete | |
| 6 | `003_broadcasts_support.sql` | Broadcast RPC functions | ✅ Complete | |
| 7 | `003_auto_on_move.sql` | Auto-on-move RPC function | ✅ Complete | |
| 8 | `004_add_broadcast_id_to_task_requests.sql` | Add broadcast_id column | ✅ Complete | |
| 9 | `004_broadcast_idempotency.sql` | Idempotency for broadcasts | ✅ Complete | |
| 10 | `006_respond_to_broadcast.sql` | Respond to broadcast RPC | ✅ Complete | |
| 11 | `007_idempotency_fix.sql` | Idempotency fixes | ✅ Complete | |
| 12 | `008_fix_idempotency_rpc_text_keys.sql` | Fix RPC text keys | ✅ Complete | |
| 13 | `009_create_request_idempotency.sql` | Create request idempotency | ✅ Complete | |
| 14 | `009_decline_request_rpc.sql` | **Decline request RPC (needs fix)** | ⚠️ Incomplete | 🔴 |
| 15 | `010_fix_missing_wallets.sql` | Wallet bug fix | ✅ Complete | |
| 16 | `011_auto_on_move.sql` | Auto-on-move (final) | ✅ Complete | |

---

## 🚨 Critical Migration: `003_wallet_canonical_model.sql`

**Why this is critical:**

1. **Renames `ledger_entries` to `wallet_transactions`** - This is a table rename that cannot be undone
2. **Adds canonical wallet logic** - Core financial operations depend on this
3. **Creates balance calculation functions** - These are referenced by your app
4. **Backfills data** - Historical data integrity depends on this

**What happens if you delete/reorder this:**
- Column "user_id" already exists
- Relation "wallet_transactions" does not exist
- Functions like `get_ledger_balance_cents()` fail
- Silent partial schema states
- Financial data corruption

**Never touch this file.** If you need to fix issues, add a new migration AFTER the current ones.

---

## Duplicate/Obsolete Migrations (Safe to Archive)

These files are duplicates or abandoned and were NEVER applied to any environment:

| File | Reason | Action |
|---|---|---|
| `005_phase1_offer_model_clean.sql` | Duplicate of `005_phase1_offer_model.sql` (clean version) | ✅ Safe to archive |
| `004_fix_missing_wallets.sql` | Bug fix already included in `010_fix_missing_wallets.sql` | ✅ Safe to archive |

**How to archive safely:**
```bash
mkdir -p /home/workspace/neighborgigs/db/migrations/archived
mv /home/workspace/neighborgigs/db/migrations/005_phase1_offer_model_clean.sql /home/workspace/neighborgigs/db/migrations/archived/
mv /home/workspace/neighborgigs/db/migrations/004_fix_missing_wallets.sql /home/workspace/neighborgigs/db/migrations/archived/
```

---

## Phase 2 Migration Strategy

### Rule: New Number Range (100+)

All Phase 2 migrations MUST start at `100_` to avoid collisions.

**Example:**
```
100_phase2_preview_core.sql
101_phase2_applications.sql
102_phase2_drafts_optional.sql
103_phase2_preview_events.sql
```

### Why 100+?
- ✅ No overlap with Phase 1 (000-999)
- ✅ Instantly obvious what belongs where
- ✅ Zero chance of collision
- ✅ Battle-tested on long-running systems

---

## Migration History (What Was Actually Applied)

If you need to verify what's in Supabase's `schema_migrations` table:

```sql
-- Check applied migrations
SELECT * FROM supabase_migrations.schema_migrations 
ORDER BY version;
```

**Note:** Do NOT modify this table directly. If there are conflicts, create new forward migrations.

---

## How to Fix Issues (The Correct Way)

### ❌ WRONG (Will Break Everything):
```bash
# DON'T DO THIS
rm 003_wallet_canonical_model.sql
mv 003_wallet_canonical_model.sql 010_wallet_canonical_model.sql
```

### ✅ RIGHT (Safe & Forward-Looking):
```bash
# Add a new migration to fix issues
cat > /home/workspace/neighborgigs/db/migrations/100_fix_wallet_issues.sql << 'EOF'
-- Fix any issues from 003_wallet_canonical_model.sql
-- This runs AFTER all Phase 1 migrations
EOF

# Then add to this document:
# 17. 100_fix_wallet_issues.sql - Fix wallet issues
```

---

## Quick Reference

### Migration Rules
1. ✅ NEVER delete or renumber existing migrations
2. ✅ ALWAYS create new migrations for fixes
3. ✅ ALWAYS use 100+ range for Phase 2
4. ✅ ALWAYS document migration order
5. ✅ NEVER touch Supabase's schema_migrations table

### When Adding New Migrations
1. Choose next sequential number (012, 013, etc. for Phase 1)
2. OR use 100+ range for Phase 2
3. Add to this document
4. Add to migration script if needed

### When You Break Something
1. DON'T delete history
2. Create forward migration to fix
3. Document in this file
4. Update migration execution script

---

## Migration Execution Script

If you need to re-run migrations for a new database, use this order:

```bash
#!/bin/bash
# /home/workspace/neighborgigs/db/apply_migrations.sh

MIGRATIONS=(
  "001_initial_schema.sql"
  "002_rpc_functions.sql"
  "003_wallet_canonical_model.sql"
  "003_add_broadcast_columns.sql"
  "003_broadcast_location.sql"
  "003_broadcasts_support.sql"
  "003_auto_on_move.sql"
  "004_add_broadcast_id_to_task_requests.sql"
  "004_broadcast_idempotency.sql"
  "006_respond_to_broadcast.sql"
  "007_idempotency_fix.sql"
  "008_fix_idempotency_rpc_text_keys.sql"
  "009_create_request_idempotency.sql"
  "009_decline_request_rpc.sql"
  "010_fix_missing_wallets.sql"
  "011_auto_on_move.sql"
)

for migration in "${MIGRATIONS[@]}"; do
  echo "Applying $migration..."
  psql "$DATABASE_URL" -f "/home/workspace/neighborgigs/db/migrations/$migration"
done
```

---

## Migration Audit Checklist

- [ ] Confirm all Phase 1 migrations exist in `/home/workspace/neighborgigs/db/migrations/`
- [ ] Verify `003_wallet_canonical_model.sql` is in Supabase (if already applied)
- [ ] Check if `009_decline_request_rpc.sql` is actually complete (file may be truncated)
- [ ] Verify routes.ts no longer has direct DB writes
- [ ] Create Phase 2 migration template starting at 100

---

## Contact

If you break something:
1. Don't panic
2. Don't delete anything
3. Document what happened
4. Create forward migration to fix
5. Add to this document
6. Ask for help if needed

**Remember:** Migrations are historical records, not editable documents.
