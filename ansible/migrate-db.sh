#!/bin/bash
set -e

# Supabase connection details
SUPABASE_HOST="aws-1-eu-west-1.pooler.supabase.com"
SUPABASE_PORT="6543"
SUPABASE_USER="postgres.cxpesevjvpeygcnxkbse"
SUPABASE_DB="postgres"
SUPABASE_PASSWORD='*$95lydtiDhdV!'

# Local connection details
LOCAL_HOST="finance-postgres"
LOCAL_PORT="5432"
LOCAL_USER="postgres"
LOCAL_DB="postgres"
LOCAL_PASSWORD='*$95lydtiDhdV!'

echo "=== Database Migration: Supabase -> Local PostgreSQL ==="
echo ""

# Step 1: Dump from Supabase
echo "Step 1: Dumping data from Supabase..."
PGPASSWORD="$SUPABASE_PASSWORD" pg_dump \
  -h "$SUPABASE_HOST" \
  -p "$SUPABASE_PORT" \
  -U "$SUPABASE_USER" \
  -d "$SUPABASE_DB" \
  --no-owner \
  --no-acl \
  --clean \
  --if-exists \
  -F c \
  -f /tmp/supabase_dump.backup

echo "Dump completed: /tmp/supabase_dump.backup"

# Step 2: Restore to local PostgreSQL
echo ""
echo "Step 2: Restoring to local PostgreSQL..."
PGPASSWORD="$LOCAL_PASSWORD" pg_restore \
  -h "$LOCAL_HOST" \
  -p "$LOCAL_PORT" \
  -U "$LOCAL_USER" \
  -d "$LOCAL_DB" \
  --no-owner \
  --no-acl \
  --clean \
  --if-exists \
  /tmp/supabase_dump.backup || true

echo ""
echo "=== Migration complete! ==="

# Cleanup
rm -f /tmp/supabase_dump.backup
