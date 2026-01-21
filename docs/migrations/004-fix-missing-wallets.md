# Migration 004: Fix Missing Wallets for Existing Users

## Problem

Some users have wallet balances in `wallet_transactions` (from the old `ledger_entries` table) but no row in `wallets` table. When `get_wallet()` RPC runs, it returns NULL because the `wallets` row doesn't exist, causing backend to fail.

## Solution

Ensure every user has a wallet row. For users who don't, create one using their ID.

**Updated:** 2026-01-21 (Manual upload workflow)

---

## ⚠️ SUPABASE CREDENTIALS - MANUAL UPLOAD REQUIRED

**Current Workflow:** Manual upload via Supabase SQL Editor  
**Reason:** Supabase credentials consistently fail for CLI/automation  
**See:** `../MANUAL_MIGRATION_UPLOAD.md` for complete workflow

---

## Instructions

### Option 1: Apply via Supabase SQL Editor (Recommended - Current Workflow)

1. Go to your Supabase project dashboard
2. Navigate to **SQL Editor**
3. Create a new query
4. Copy and paste SQL below
5. Click **Run**
6. Verify success before proceeding to next migration

### Option 2: Apply via psql (Command Line - Credentials May Fail)

```bash
# WARNING: This may fail due to Supabase credential issues
psql -h kxpglaetbawiugqmihfj.supabase.co -U postgres -d postgres -f 004_fix_missing_wallets.sql
```

---

## Migration SQL

```sql
-- 1. Check which users are missing wallets (diagnostic)
-- Run this first to see the problem
SELECT u.id, u.first_name, u.email
FROM users u
LEFT JOIN wallets w ON w.user_id = u.id
WHERE w.id IS NULL;

-- 2. Create missing wallets for all users who don't have one
INSERT INTO wallets (id, user_id, available_usd, pending_usd, created_at)
SELECT gen_random_uuid(), u.id, 0, 0, NOW()
FROM users u
LEFT JOIN wallets w ON w.user_id = u.id
WHERE w.id IS NULL
ON CONFLICT DO NOTHING;

-- 3. Verify all users now have wallets
-- Should return 0 rows if successful
SELECT u.id, u.first_name
FROM users u
LEFT JOIN wallets w ON w.user_id = u.id
WHERE w.id IS NULL;
```

---

## What This Changes

| Before | After |
|---------|--------|
| Users without wallets cause `get_wallet()` to return NULL | All users have a wallet row (even if balance is 0) |
| Backend throws "Failed to fetch wallet" for these users | `get_wallet()` always returns a wallet object |

---

## Optional: Seed Test Balances

If you want to give your demo users some starting balance to test withdrawals:

```sql
-- Give demo users $50 each
UPDATE wallets
SET available_usd = 50.00
WHERE user_id IN (
  '00000000-0000-0000-0000-000000000001',
  '00000000-0000-0000-0000-000000000002',
  '00000000-0000-0000-0000-000000000003'
);

-- Or credit via wallet_transactions (better for canonical model)
INSERT INTO wallet_transactions (id, wallet_id, user_id, type, amount_usd, source, reference_id, status)
SELECT gen_random_uuid(), w.id, w.user_id, 'credit', 50.00, 'demo_seed', NULL, 'completed'
FROM wallets w
WHERE w.user_id IN (
  '00000000-0000-0000-0000-000000000001',
  '00000000-0000-0000-0000-000000000002',
  '00000000-0000-0000-0000-000000000003'
);
```

---

## 📚 Reference

- `../MANUAL_MIGRATION_UPLOAD.md` - Complete manual upload workflow
- `../MIGRATION_ORDER.md` - Migration order and dependencies
- `../MIGRATION_CANONICAL_ORDER.md` - Authoritative migration order
