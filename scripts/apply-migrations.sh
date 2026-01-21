#!/bin/bash

# NeighborGigs Database Migration Script
# This script applies all Phase 1 migrations to Supabase

set -e  # Exit on error

echo "=== NeighborGigs Phase One Database Migrations ==="
echo ""

# Connection string
DB_CONNECTION="postgresql://postgres.kxpglaetbawiugqmihfj:[YOUR-PASSWORD]@aws-1-us-east-1.pooler.supabase.com:6543/postgres"

# Migration files
MIGRATION_DIR="/home/workspace/neighborgigs/db/migrations"
SEED_FILE="/home/workspace/neighborgigs/db/seed_demo_data.sql"

# Check if connection string is set up
if [[ "$DB_CONNECTION" == *"[YOUR-PASSWORD]"* ]]; then
  echo "❌ Error: Please replace [YOUR-PASSWORD] in the connection string"
  echo ""
  echo "Your connection string template:"
  echo "postgresql://postgres.kxpglaetbawiugqmihfj:[YOUR-PASSWORD]@aws-1-us-east-1.pooler.supabase.com:6543/postgres"
  echo ""
  echo "To get your password:"
  echo "1. Go to https://supabase.com/dashboard/project/kxpglaetbawiugqmihfj/settings/database"
  echo "2. Scroll to 'Connection string' section"
  echo "3. Copy the 'URI' for 'Transaction mode'"
  echo ""
  exit 1
fi

# Apply migration 001: Initial Schema
echo "📊 Applying Migration 001: Initial Schema..."
if psql "$DB_CONNECTION" -f "$MIGRATION_DIR/001_initial_schema.sql"; then
  echo "✅ Migration 001 completed successfully"
else
  echo "❌ Migration 001 failed"
  exit 1
fi

echo ""
echo "📊 Applying Migration 002: RPC Functions..."
if psql "$DB_CONNECTION" -f "$MIGRATION_DIR/002_rpc_functions.sql"; then
  echo "✅ Migration 002 completed successfully"
else
  echo "❌ Migration 002 failed"
  exit 1
fi

echo ""
echo "📊 Seeding demo data..."
if psql "$DB_CONNECTION" -f "$SEED_FILE"; then
  echo "✅ Demo data seeded successfully"
else
  echo "❌ Demo data seeding failed"
  exit 1
fi

echo ""
echo "========================================"
echo "✅ All migrations applied successfully!"
echo "========================================"
echo ""
echo "Database is ready for Phase One!"
