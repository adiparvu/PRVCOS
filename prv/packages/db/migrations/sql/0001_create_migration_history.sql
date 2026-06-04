-- Migration: 0001_create_migration_history
-- This is the bootstrap migration — applied manually on first setup
-- All subsequent migrations are tracked by the migration runner

CREATE TABLE IF NOT EXISTS migration_history (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  version         VARCHAR(32) NOT NULL UNIQUE,
  name            VARCHAR(255) NOT NULL,
  applied_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  applied_by      VARCHAR(100) NOT NULL DEFAULT 'system',
  checksum        VARCHAR(64) NOT NULL,
  execution_time_ms TEXT,
  success         BOOLEAN NOT NULL DEFAULT TRUE,
  error_message   TEXT
);

-- Index for fast lookup of applied versions
CREATE INDEX IF NOT EXISTS idx_migration_history_version ON migration_history (version);
CREATE INDEX IF NOT EXISTS idx_migration_history_applied_at ON migration_history (applied_at);

-- Record this bootstrap migration itself
INSERT INTO migration_history (version, name, applied_by, checksum, success)
VALUES (
  '0001',
  'create_migration_history',
  'bootstrap',
  'bootstrap',
  TRUE
)
ON CONFLICT (version) DO NOTHING;
