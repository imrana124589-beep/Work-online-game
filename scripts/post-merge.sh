#!/bin/bash
set -e
pnpm install --frozen-lockfile

# Defensive cleanup before `drizzle-kit push`. Task #9 added foreign keys to
# `activities` (member_id, project_id, task_id) with ON DELETE CASCADE. If any
# environment still contains rows whose referenced row was already deleted
# (orphans accumulated before the FKs existed), creating the constraint would
# fail. The deletes below are idempotent and become no-ops once the FKs are
# active, since the FKs themselves prevent new orphans.
if [ -n "$DATABASE_URL" ]; then
  psql "$DATABASE_URL" -v ON_ERROR_STOP=1 <<'SQL' >/dev/null
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema = 'public' AND table_name = 'activities'
  ) THEN
    DELETE FROM activities
      WHERE member_id IS NOT NULL
        AND member_id NOT IN (SELECT id FROM members);
    DELETE FROM activities
      WHERE project_id IS NOT NULL
        AND project_id NOT IN (SELECT id FROM projects);
    DELETE FROM activities
      WHERE task_id IS NOT NULL
        AND task_id NOT IN (SELECT id FROM tasks);
  END IF;
END
$$;
SQL
fi

pnpm --filter db push
