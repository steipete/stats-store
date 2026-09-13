#!/usr/bin/env bash
set -euo pipefail

case "${PGDATABASE:-}" in
  *_test) ;;
  *) echo 'PGDATABASE must name a disposable database ending in _test.' >&2; exit 1 ;;
esac

cd "$(dirname "$0")/.."
psql -X -v ON_ERROR_STOP=1 -q <<'SQL'
DO $$ BEGIN
  IF NOT EXISTS (SELECT FROM pg_roles WHERE rolname = 'anon') THEN CREATE ROLE anon; END IF;
  IF NOT EXISTS (SELECT FROM pg_roles WHERE rolname = 'authenticated') THEN CREATE ROLE authenticated; END IF;
END $$;
CREATE PUBLICATION supabase_realtime;
SQL

for migration in scripts/[0-9]*.sql supabase/migrations/*.sql; do
  printf 'Apply %s\n' "$migration"
  psql -X -v ON_ERROR_STOP=1 -q --single-transaction -f "$migration" >/dev/null
done

for test_file in tests/database/*.sql; do
  printf 'Check %s\n' "$test_file"
  psql -X -v ON_ERROR_STOP=1 -q -f "$test_file"
done
printf 'Database bootstrap, migrations, and regression checks passed.\n'
