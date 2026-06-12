-- Portal Platform: external portal accounts (clients, suppliers, subcontractors, employees)
-- Magic-link auth, fully isolated from internal user auth.
-- Migration: 0009_client_portal

DO $$ BEGIN
  CREATE TYPE portal_type AS ENUM ('client', 'supplier', 'subcontractor', 'employee');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

CREATE TABLE IF NOT EXISTS portal_accounts (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id    UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,

  portal_type   portal_type NOT NULL DEFAULT 'client',

  -- Entity binding: exactly one set, matching portal_type
  client_id     UUID REFERENCES clients(id) ON DELETE CASCADE,
  contact_id    UUID REFERENCES client_contacts(id) ON DELETE SET NULL,
  supplier_id   UUID REFERENCES suppliers(id) ON DELETE CASCADE,

  email         VARCHAR(254) NOT NULL,
  name          VARCHAR(255) NOT NULL,

  is_active     BOOLEAN NOT NULL DEFAULT true,
  last_login_at TIMESTAMPTZ,

  created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS portal_accounts_company_email_type_uq
  ON portal_accounts(company_id, email, portal_type);
CREATE INDEX IF NOT EXISTS portal_accounts_company_id_idx ON portal_accounts(company_id);
CREATE INDEX IF NOT EXISTS portal_accounts_client_id_idx  ON portal_accounts(client_id);
CREATE INDEX IF NOT EXISTS portal_accounts_email_idx      ON portal_accounts(email);

CREATE TABLE IF NOT EXISTS portal_magic_tokens (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  account_id  UUID NOT NULL REFERENCES portal_accounts(id) ON DELETE CASCADE,

  -- SHA-256 hex of the raw token; raw token only ever lives in the email link
  token_hash  VARCHAR(64) NOT NULL,
  expires_at  TIMESTAMPTZ NOT NULL,
  used_at     TIMESTAMPTZ,

  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS portal_magic_tokens_hash_uq   ON portal_magic_tokens(token_hash);
CREATE INDEX IF NOT EXISTS portal_magic_tokens_account_id_idx   ON portal_magic_tokens(account_id);

CREATE TABLE IF NOT EXISTS portal_sessions (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  account_id   UUID NOT NULL REFERENCES portal_accounts(id) ON DELETE CASCADE,
  company_id   UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,

  token_hash   VARCHAR(64) NOT NULL,
  expires_at   TIMESTAMPTZ NOT NULL,
  revoked_at   TIMESTAMPTZ,

  ip_address   VARCHAR(45),
  user_agent   TEXT,

  created_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
  last_seen_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS portal_sessions_hash_uq     ON portal_sessions(token_hash);
CREATE INDEX IF NOT EXISTS portal_sessions_account_id_idx     ON portal_sessions(account_id);
CREATE INDEX IF NOT EXISTS portal_sessions_company_id_idx     ON portal_sessions(company_id);
