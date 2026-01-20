-- Migration 004: Fix Missing Wallets for Existing Users
-- Some users have transactions in wallet_transactions but no row in wallets table
-- This causes get_wallet() RPC to return NULL, breaking the app

-- 1. Create missing wallets for all users who don't have one
INSERT INTO wallets (id, user_id, available_usd, pending_usd, created_at)
SELECT gen_random_uuid(), u.id, 0, 0, NOW()
FROM users u
LEFT JOIN wallets w ON w.user_id = u.id
WHERE w.id IS NULL
ON CONFLICT DO NOTHING;

-- 2. Verify - should return 0 rows if successful
-- SELECT u.id, u.first_name
-- FROM users u
-- LEFT JOIN wallets w ON w.user_id = u.id
-- WHERE w.id IS NULL;
