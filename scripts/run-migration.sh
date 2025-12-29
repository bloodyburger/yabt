#!/bin/bash

# YABT Database Migration Script
# This script runs the SQL migration on your Supabase database
#
# Prerequisites:
# 1. Set SUPABASE_DB_URL environment variable (get from Supabase Dashboard -> Settings -> Database -> Connection String -> URI)
#    Format: postgresql://postgres:[YOUR-PASSWORD]@db.[PROJECT-REF].supabase.co:5432/postgres
#
# 2. Install psql (PostgreSQL client):
#    - Mac: brew install postgresql
#    - Ubuntu: sudo apt-get install postgresql-client
#
# Usage:
#    SUPABASE_DB_URL="postgresql://..." ./scripts/run-migration.sh

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"
SCHEMA_FILE="$PROJECT_ROOT/supabase/schema.sql"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo -e "${YELLOW}🚀 YABT Database Migration${NC}"
echo "================================"

# Check if SUPABASE_DB_URL is set
if [ -z "$SUPABASE_DB_URL" ]; then
    echo -e "${RED}Error: SUPABASE_DB_URL is not set${NC}"
    echo ""
    echo "To get your database URL:"
    echo "1. Go to Supabase Dashboard -> Settings -> Database"
    echo "2. Copy the 'Connection string' (URI format)"
    echo "3. Run: SUPABASE_DB_URL='your_connection_string' ./scripts/run-migration.sh"
    echo ""
    echo "Example:"
    echo "  SUPABASE_DB_URL='postgresql://postgres:yourpassword@db.projectref.supabase.co:5432/postgres' ./scripts/run-migration.sh"
    exit 1
fi

# Check if schema file exists
if [ ! -f "$SCHEMA_FILE" ]; then
    echo -e "${RED}Error: Schema file not found at $SCHEMA_FILE${NC}"
    exit 1
fi

# Check if psql is installed
if ! command -v psql &> /dev/null; then
    echo -e "${RED}Error: psql is not installed${NC}"
    echo ""
    echo "Install PostgreSQL client:"
    echo "  Mac:    brew install postgresql"
    echo "  Ubuntu: sudo apt-get install postgresql-client"
    exit 1
fi

echo -e "${YELLOW}📋 Running schema migration...${NC}"
echo "Schema file: $SCHEMA_FILE"
echo ""

# Run the migration
if psql "$SUPABASE_DB_URL" -f "$SCHEMA_FILE"; then
    echo ""
    echo -e "${GREEN}✅ Migration completed successfully!${NC}"
else
    echo ""
    echo -e "${RED}❌ Migration failed${NC}"
    exit 1
fi
