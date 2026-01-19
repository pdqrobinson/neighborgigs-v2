#!/bin/bash

# NeighborGigs Database Migration Script
# This script applies all Phase 1 migrations to Supabase
#
# USAGE: ./apply-migrations-with-password.sh <YOUR_PASSWORD>
# EXAMPLE: ./apply-migrations-with-password.sh my-secret-password

set -e  # Exit on error

if [ -z "$1" ]; then
  echo "❌ Error: Database password required"
  echo ""
  echo "Usage: $0 <PASSWORD>"
  echo "Example: $0 my-database-password"
  echo ""
  echo "To get your password:"
  echo "1. Go to https://supabase.com/dashboard/project/kxpglaetbawiugqmihfj/settings/database"
  echo "2. Scroll to 'Connection string' section"
  echo "3. Copy the password from the URI"
  echo ""
  exit 1
fi

PASSWORD="$1"
DB_CONNECTION="postgresql://postgres.kxpglaetbawiugqmihfj:${PASSWORD}@aws-1-us-east-1.pooler.supabase.com:6543/postgres"

echo "=== NeighborGigs Phase One Database Migrations ==="
echo ""

# Migration files
MIGRATION_DIR="/home/workspace/neighborgigs/db/migrations"
SEED_FILE="/home/workspace/neighborgigs/db/seed_demo_data.sql"

# Test connection
echo "🔌 Testing database connection..."
if psql "$DB_CONNECTION" -c "SELECT version();" > /dev/null 2>&1; then
  echo "✅ Database connection successful"
else
  echo "❌ Database connection failed. Please check your password."
  exit 1
fi

echo ""

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
echo ""
echo "Users created:"
echo "  - Alex (Requester): 00000000-0000-0000-0000-000000000001"
echo "  - Jamie (Helper):   00000000-0000-0000-0000-0000-000000000002"
echo "  - Taylor (Helper):  00000000-0000-0000-0000-0000-000000000003"
echo "  - Jordan (Idle):    00000000-0000-0000-0000-0000-000000000004"
