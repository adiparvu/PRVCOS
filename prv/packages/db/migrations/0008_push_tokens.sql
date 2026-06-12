-- Push Tokens: Expo push notification token registry per user/device
-- Migration: 0008_push_tokens

CREATE TABLE IF NOT EXISTS push_tokens (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  company_id  UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,

  -- Expo push token, format: ExponentPushToken[xxxxxx]
  token       VARCHAR(200) NOT NULL,

  -- Expo device ID for deduplication (one active token per device)
  device_id   VARCHAR(200) NOT NULL,

  -- 'ios' | 'android' | 'unknown'
  platform    VARCHAR(10) NOT NULL DEFAULT 'unknown',

  is_active   BOOLEAN NOT NULL DEFAULT true,
  last_used_at TIMESTAMPTZ,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),

  CONSTRAINT push_tokens_device_unique UNIQUE (device_id)
);

CREATE INDEX IF NOT EXISTS push_tokens_user_id_idx    ON push_tokens(user_id);
CREATE INDEX IF NOT EXISTS push_tokens_company_id_idx ON push_tokens(company_id);
CREATE INDEX IF NOT EXISTS push_tokens_is_active_idx  ON push_tokens(is_active);
