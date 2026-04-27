#!/bin/bash
set -e
pnpm install --frozen-lockfile
pnpm --filter db push

# Backfill task position values for any environment whose `tasks` rows still
# have the default position=0 (introduced by the in-column reorder feature).
# Without this, midpoint inserts between two zeroed neighbors collapse to 0
# and reorder becomes a no-op. Idempotent: only acts when zeroed rows remain.
if [ -n "$DATABASE_URL" ]; then
  psql "$DATABASE_URL" -v ON_ERROR_STOP=1 <<'SQL' >/dev/null
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'tasks' AND column_name = 'position'
  ) AND EXISTS (
    SELECT 1 FROM tasks
    GROUP BY project_id, status
    HAVING COUNT(*) > 1 AND COUNT(DISTINCT position) < COUNT(*)
  ) THEN
    UPDATE tasks t
       SET position = sub.rn
      FROM (
        SELECT id,
               ROW_NUMBER() OVER (PARTITION BY project_id, status ORDER BY position, id) AS rn
          FROM tasks
      ) sub
     WHERE t.id = sub.id;
  END IF;
END
$$;
SQL
fi
