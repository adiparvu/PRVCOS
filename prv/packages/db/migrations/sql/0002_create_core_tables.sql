-- ============================================================
-- Migration 0002: Core company & user tables (Sprint 03)
-- ============================================================

-- ─── Enums ────────────────────────────────────────────────────────────────

CREATE TYPE company_type AS ENUM (
  'renovations', 'projects', 'shop', 'services', 'other'
);

CREATE TYPE company_status AS ENUM (
  'active', 'suspended', 'onboarding', 'churned'
);

CREATE TYPE user_status AS ENUM (
  'active', 'inactive', 'suspended', 'onboarding', 'offboarded'
);

CREATE TYPE system_role AS ENUM (
  -- Core
  'group_ceo', 'ceo', 'co_ceo', 'system_administrator',
  -- Attendance
  'worker', 'team_leader', 'oms', 'operations_manager', 'department_head', 'hr_payroll',
  -- Projects
  'project_worker', 'project_team_leader', 'project_oms',
  'project_operations_manager', 'project_director',
  -- Shop
  'seller', 'store_manager', 'shop_director',
  -- Analytics
  'app_support_specialist', 'data_analyst', 'qa_tester'
);

CREATE TYPE scope_level AS ENUM (
  'SCOPE_RECORD', 'SCOPE_TEAM', 'SCOPE_DEPARTMENT', 'SCOPE_STORE',
  'SCOPE_REGION', 'SCOPE_COMPANY', 'SCOPE_GROUP', 'SCOPE_PLATFORM', 'SCOPE_GLOBAL'
);

-- ─── Companies ─────────────────────────────────────────────────────────────

CREATE TABLE companies (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  group_id            UUID,

  name                VARCHAR(255)    NOT NULL,
  slug                VARCHAR(100)    NOT NULL UNIQUE,
  type                company_type    NOT NULL DEFAULT 'other',
  status              company_status  NOT NULL DEFAULT 'onboarding',

  logo_url            TEXT,
  cover_url           TEXT,
  primary_color       VARCHAR(7),

  email               VARCHAR(254),
  phone               VARCHAR(32),
  website             TEXT,

  country             VARCHAR(2)      NOT NULL DEFAULT 'RO',
  region              VARCHAR(100),
  city                VARCHAR(100),
  address             TEXT,
  postal_code         VARCHAR(20),

  vat_number          VARCHAR(50),
  registration_number VARCHAR(50),

  settings            JSONB           NOT NULL DEFAULT '{}',

  created_at          TIMESTAMPTZ     NOT NULL DEFAULT NOW(),
  updated_at          TIMESTAMPTZ     NOT NULL DEFAULT NOW(),
  deleted_at          TIMESTAMPTZ,
  is_active           BOOLEAN         NOT NULL DEFAULT TRUE
);

-- ─── Stores ────────────────────────────────────────────────────────────────

CREATE TABLE stores (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id  UUID            NOT NULL REFERENCES companies(id) ON DELETE CASCADE,

  name        VARCHAR(255)    NOT NULL,
  code        VARCHAR(50)     NOT NULL,
  region      VARCHAR(100),

  phone       VARCHAR(32),
  email       VARCHAR(254),
  address     TEXT,
  city        VARCHAR(100),

  is_active   BOOLEAN         NOT NULL DEFAULT TRUE,
  settings    JSONB           NOT NULL DEFAULT '{}',

  created_at  TIMESTAMPTZ     NOT NULL DEFAULT NOW(),
  updated_at  TIMESTAMPTZ     NOT NULL DEFAULT NOW()
);

CREATE INDEX stores_company_id_idx ON stores(company_id);

-- ─── Departments ───────────────────────────────────────────────────────────

CREATE TABLE departments (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id    UUID            NOT NULL REFERENCES companies(id) ON DELETE CASCADE,

  name          VARCHAR(255)    NOT NULL,
  code          VARCHAR(50)     NOT NULL,
  parent_id     UUID            REFERENCES departments(id) ON DELETE SET NULL,
  head_user_id  UUID,           -- FK added after users table

  is_active     BOOLEAN         NOT NULL DEFAULT TRUE,

  created_at    TIMESTAMPTZ     NOT NULL DEFAULT NOW(),
  updated_at    TIMESTAMPTZ     NOT NULL DEFAULT NOW()
);

CREATE INDEX departments_company_id_idx ON departments(company_id);

-- ─── Teams ─────────────────────────────────────────────────────────────────

CREATE TABLE teams (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id      UUID            NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  department_id   UUID            REFERENCES departments(id) ON DELETE SET NULL,
  store_id        UUID            REFERENCES stores(id) ON DELETE SET NULL,

  name            VARCHAR(255)    NOT NULL,
  code            VARCHAR(50)     NOT NULL,
  lead_user_id    UUID,           -- FK added after users table

  is_active       BOOLEAN         NOT NULL DEFAULT TRUE,

  created_at      TIMESTAMPTZ     NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ     NOT NULL DEFAULT NOW()
);

CREATE INDEX teams_company_id_idx ON teams(company_id);

-- ─── Users ─────────────────────────────────────────────────────────────────

CREATE TABLE users (
  id                      UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id              UUID            NOT NULL REFERENCES companies(id) ON DELETE CASCADE,

  supabase_id             UUID            UNIQUE,
  email                   VARCHAR(254)    NOT NULL,
  phone                   VARCHAR(32),

  first_name              VARCHAR(100)    NOT NULL,
  last_name               VARCHAR(100)    NOT NULL,
  avatar_url              TEXT,
  bio                     TEXT,

  employee_id             VARCHAR(100),
  job_title               VARCHAR(255),
  department_id           UUID            REFERENCES departments(id) ON DELETE SET NULL,
  team_id                 UUID            REFERENCES teams(id) ON DELETE SET NULL,
  store_id                UUID            REFERENCES stores(id) ON DELETE SET NULL,
  manager_id              UUID            REFERENCES users(id) ON DELETE SET NULL,

  role                    system_role     NOT NULL,
  scope_level             scope_level     NOT NULL,
  status                  user_status     NOT NULL DEFAULT 'onboarding',
  mfa_enabled             BOOLEAN         NOT NULL DEFAULT FALSE,

  security_level          VARCHAR(20)     NOT NULL DEFAULT 'standard',
  max_session_ttl_seconds VARCHAR(20),

  locale                  VARCHAR(10)     NOT NULL DEFAULT 'ro-RO',
  timezone                VARCHAR(50)     NOT NULL DEFAULT 'Europe/Bucharest',

  settings                JSONB           NOT NULL DEFAULT '{}',
  metadata                JSONB           NOT NULL DEFAULT '{}',

  created_at              TIMESTAMPTZ     NOT NULL DEFAULT NOW(),
  updated_at              TIMESTAMPTZ     NOT NULL DEFAULT NOW(),
  last_login_at           TIMESTAMPTZ,
  deleted_at              TIMESTAMPTZ,
  is_active               BOOLEAN         NOT NULL DEFAULT TRUE,

  CONSTRAINT users_company_email_unique UNIQUE (company_id, email)
);

CREATE INDEX users_company_id_idx      ON users(company_id);
CREATE INDEX users_email_idx           ON users(email);
CREATE INDEX users_supabase_id_idx     ON users(supabase_id);

-- Back-fill FK for departments and teams head/lead
ALTER TABLE departments ADD CONSTRAINT departments_head_user_id_fk
  FOREIGN KEY (head_user_id) REFERENCES users(id) ON DELETE SET NULL;

ALTER TABLE teams ADD CONSTRAINT teams_lead_user_id_fk
  FOREIGN KEY (lead_user_id) REFERENCES users(id) ON DELETE SET NULL;

-- ─── User MFA Methods ──────────────────────────────────────────────────────

CREATE TABLE user_mfa_methods (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id           UUID            NOT NULL REFERENCES users(id) ON DELETE CASCADE,

  method            VARCHAR(20)     NOT NULL,
  identifier        VARCHAR(255),
  secret_encrypted  TEXT,
  is_primary        BOOLEAN         NOT NULL DEFAULT FALSE,
  is_verified       BOOLEAN         NOT NULL DEFAULT FALSE,

  created_at        TIMESTAMPTZ     NOT NULL DEFAULT NOW(),
  verified_at       TIMESTAMPTZ,
  last_used_at      TIMESTAMPTZ
);

CREATE INDEX user_mfa_methods_user_id_idx ON user_mfa_methods(user_id);

-- ─── User Devices ──────────────────────────────────────────────────────────

CREATE TABLE user_devices (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id           UUID            NOT NULL REFERENCES users(id) ON DELETE CASCADE,

  device_id         UUID            NOT NULL UNIQUE,
  name              VARCHAR(255),
  user_agent        TEXT,
  platform          VARCHAR(50),
  is_trusted        BOOLEAN         NOT NULL DEFAULT FALSE,
  trust_expires_at  TIMESTAMPTZ,

  created_at        TIMESTAMPTZ     NOT NULL DEFAULT NOW(),
  last_seen_at      TIMESTAMPTZ     NOT NULL DEFAULT NOW()
);

CREATE INDEX user_devices_user_id_idx ON user_devices(user_id);

-- ─── User Audit Log ────────────────────────────────────────────────────────

CREATE TABLE user_audit_log (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id      UUID            NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  actor_id        UUID            NOT NULL REFERENCES users(id),
  target_user_id  UUID            REFERENCES users(id),

  action          VARCHAR(100)    NOT NULL,
  entity_type     VARCHAR(100),
  entity_id       UUID,
  diff            JSONB,
  ip_address      VARCHAR(45),
  user_agent      TEXT,

  created_at      TIMESTAMPTZ     NOT NULL DEFAULT NOW()
);

CREATE INDEX user_audit_log_company_id_idx ON user_audit_log(company_id);
CREATE INDEX user_audit_log_actor_id_idx   ON user_audit_log(actor_id);
CREATE INDEX user_audit_log_created_at_idx ON user_audit_log(created_at);

-- ─── updated_at triggers ───────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER companies_updated_at  BEFORE UPDATE ON companies  FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE TRIGGER stores_updated_at     BEFORE UPDATE ON stores     FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE TRIGGER departments_updated_at BEFORE UPDATE ON departments FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE TRIGGER teams_updated_at      BEFORE UPDATE ON teams      FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE TRIGGER users_updated_at      BEFORE UPDATE ON users      FOR EACH ROW EXECUTE FUNCTION set_updated_at();
