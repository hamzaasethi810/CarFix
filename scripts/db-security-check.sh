#!/usr/bin/env bash
#
# Verifies the database privilege model: the application's runtime role must be
# able to read and write rows, and must NOT be able to destroy anything.
#
# Run after applying prisma/roles.sql, and again after any migration that adds
# tables — new tables inherit grants via ALTER DEFAULT PRIVILEGES, and this
# proves it actually happened.
#
#   ./scripts/db-security-check.sh
#
# Uses DATABASE_URL from .env unless one is passed as $1.

set -uo pipefail

APP_URL="${1:-}"
if [ -z "$APP_URL" ]; then
  APP_URL=$(grep -E '^DATABASE_URL=' .env | head -1 | cut -d= -f2- | tr -d '"')
fi

if [ -z "$APP_URL" ]; then
  echo "No DATABASE_URL found. Pass one as the first argument." >&2
  exit 2
fi

pass=0
fail=0

# A destructive statement must be refused.
denied() {
  local label="$1" sql="$2"
  local out
  out=$(psql "$APP_URL" -tAc "$sql" 2>&1)
  if grep -qiE "permission denied|must be owner" <<<"$out"; then
    echo "  ok       blocked: $label"
    pass=$((pass + 1))
  else
    echo "  FAIL     ALLOWED: $label -> ${out:-(succeeded)}"
    fail=$((fail + 1))
  fi
}

# A normal data operation must succeed.
allowed() {
  local label="$1" sql="$2"
  if psql "$APP_URL" -q -c "$sql" >/dev/null 2>&1; then
    echo "  ok       permitted: $label"
    pass=$((pass + 1))
  else
    echo "  FAIL     BLOCKED: $label"
    fail=$((fail + 1))
  fi
}

echo "Runtime role must not be able to destroy data"
denied "DROP TABLE"            'DROP TABLE "Mechanic" CASCADE;'
denied "DROP TABLE (receipts)" 'DROP TABLE "Receipt" CASCADE;'
denied "TRUNCATE experiences"  'TRUNCATE "MechanicExperience" CASCADE;'
denied "TRUNCATE users"        'TRUNCATE "User" CASCADE;'
denied "CREATE TABLE"          'CREATE TABLE _priv_probe(x int);'
denied "ALTER TABLE"           'ALTER TABLE "User" ADD COLUMN _probe text;'
denied "DROP SCHEMA"           'DROP SCHEMA public CASCADE;'
denied "CREATE ROLE"           'CREATE ROLE _probe LOGIN SUPERUSER;'
denied "self-escalate"         'ALTER ROLE carfix_app SUPERUSER;'

echo
echo "Runtime role must still be able to work"
allowed "SELECT" 'SELECT 1 FROM "Mechanic" LIMIT 1;'
allowed "INSERT" 'BEGIN; INSERT INTO "Service"(id,name) VALUES ($$_probe$$,$$_probe$$); ROLLBACK;'
allowed "UPDATE" 'BEGIN; UPDATE "Mechanic" SET name = name; ROLLBACK;'
allowed "DELETE" 'BEGIN; DELETE FROM "Service" WHERE id = $$_nonexistent$$; ROLLBACK;'

echo
echo "Role attributes"
psql "$APP_URL" -tAc "
  SELECT '  ' || rolname || ': superuser=' || rolsuper || ' createdb=' || rolcreatedb || ' createrole=' || rolcreaterole
  FROM pg_roles WHERE rolname = current_user;"

echo
if [ "$fail" -gt 0 ]; then
  echo "$fail check(s) FAILED, $pass passed."
  exit 1
fi
echo "All $pass checks passed."
