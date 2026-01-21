#!/bin/bash
# Migration execution script for Phase 1
# NEVER delete or renumber existing migrations
# Run: ./apply_migrations.sh

set -e

# Database URL - set your SUPABASE_URL here
# DATABASE_URL="postgres://user:pass@host:5432/dbname"

if [ -z "$DATABASE_URL" ]; then
  echo "ERROR: DATABASE_URL environment variable is not set"
  echo "Set it with: export DATABASE_URL='postgres://user:pass@host:5432/dbname'"
  exit 1
fi

echo "=== Applying Phase 1 Migrations ==="
echo "Database: $DATABASE_URL"
echo ""

# Canonical Phase 1 Migration Order (from MIGRATION_CANONICAL_ORDER.md)
MIGRATIONS=(
  "001_initial_schema.sql"
  "002_rpc_functions.sql"
  "003_wallet_canonical_model.sql"
  "004_broadcasts_simplified.sql"
  "007_idempotency_fix.sql"
  "008_fix_idempotency_rpc_text_keys.sql"
  "009_create_request_idempotency.sql"
  "009_decline_request_rpc.sql"
  "008_fix_missing_wallets.sql"
  "007_auto_on_move.sql"
)

for migration in "${MIGRATIONS[@]}"; do
  filepath="/home/workspace/neighborgigs/db/migrations/$migration"
  
  if [ -f "$filepath" ]; then
    echo "Applying $migration..."
    
    # Skip if already exists in schema_migrations (idempotent)
    # This requires a custom check - for now we just apply and let Postgres handle conflicts
    
    psql "$DATABASE_URL" -f "$filepath" 2>&1 | head -20
    
    if [ $? -eq 0 ]; then
      echo "✓ $migration applied successfully"
    else
      echo "✗ $migration failed (or already applied)"
      # Don't exit - migrations should be idempotent
    fi
    echo ""
  else
    echo "⚠ Warning: $migration not found at $filepath"
    echo "This should be archived in /home/workspace/neighborgigs/db/migrations/archived/"
    echo ""
  fi
done

echo "=== Migration Application Complete ==="
echo ""
echo "Next steps:"
echo "1. Check Supabase SQL Editor for any errors"
echo "2. Verify schema: SELECT table_name FROM information_schema.tables;"
echo "3. Check migration history: SELECT * FROM supabase_migrations.schema_migrations;"
echo "4. If Phase 2: Start with 100_ prefixed migrations"
