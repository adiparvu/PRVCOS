-- Sprint 9: Add active-context columns to user_presence
-- These columns are written by the heartbeat POST /api/presence and allow
-- the presence system to surface what each user is currently viewing.

ALTER TABLE user_presence
  ADD COLUMN IF NOT EXISTS platform           VARCHAR(20),
  ADD COLUMN IF NOT EXISTS active_route       VARCHAR(500),
  ADD COLUMN IF NOT EXISTS active_entity_type VARCHAR(100),
  ADD COLUMN IF NOT EXISTS active_entity_id   UUID;

COMMENT ON COLUMN user_presence.platform           IS 'Client platform: web | mobile | desktop';
COMMENT ON COLUMN user_presence.active_route       IS 'Current page path the user is viewing';
COMMENT ON COLUMN user_presence.active_entity_type IS 'Entity type the user is currently viewing';
COMMENT ON COLUMN user_presence.active_entity_id   IS 'Entity id the user is currently viewing';
