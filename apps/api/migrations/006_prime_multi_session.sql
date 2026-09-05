-- PRIME multi-session v0.2 — leases, expiry, and task dependency waves.
-- Does not replace v0.1 tables. No RLS. No external systems.

ALTER TABLE execution_sessions
  ADD COLUMN IF NOT EXISTS expires_at timestamptz;

ALTER TABLE execution_tasks
  ADD COLUMN IF NOT EXISTS lease_expires_at timestamptz,
  ADD COLUMN IF NOT EXISTS depends_on_task_types text[] NOT NULL DEFAULT '{}';

CREATE INDEX IF NOT EXISTS idx_execution_sessions_expires_at
  ON execution_sessions (expires_at)
  WHERE expires_at IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_execution_tasks_lease_expires_at
  ON execution_tasks (lease_expires_at)
  WHERE lease_expires_at IS NOT NULL;
