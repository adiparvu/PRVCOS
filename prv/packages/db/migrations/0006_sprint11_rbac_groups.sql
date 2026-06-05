-- Sprint 11: RBAC, Group Architecture, Auth Lockouts, Backup Codes, Password Reset
-- Migration: 0006_sprint11_rbac_groups

-- ─── Enums ──────────────────────────────────────────────────────────────────

CREATE TYPE role_type AS ENUM ('system', 'custom');
CREATE TYPE grant_status AS ENUM ('active', 'expired', 'revoked');

-- ─── RBAC Tables ────────────────────────────────────────────────────────────

CREATE TABLE roles (
  id                 UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id         UUID REFERENCES companies(id) ON DELETE CASCADE,
  name               VARCHAR(100) NOT NULL,
  slug               VARCHAR(100) NOT NULL,
  description        TEXT,
  type               role_type NOT NULL DEFAULT 'custom',
  default_scope_level VARCHAR(30) NOT NULL DEFAULT 'SCOPE_RECORD',
  is_active          BOOLEAN NOT NULL DEFAULT true,
  created_at         TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at         TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT roles_company_slug_unique UNIQUE (company_id, slug)
);

CREATE INDEX roles_company_id_idx ON roles(company_id);

CREATE TABLE permissions (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  key         VARCHAR(200) NOT NULL UNIQUE,
  module      VARCHAR(100) NOT NULL,
  action      VARCHAR(100) NOT NULL,
  description TEXT,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX permissions_module_idx ON permissions(module);
CREATE INDEX permissions_key_idx ON permissions(key);

CREATE TABLE role_permissions (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  role_id       UUID NOT NULL REFERENCES roles(id) ON DELETE CASCADE,
  permission_id UUID NOT NULL REFERENCES permissions(id) ON DELETE CASCADE,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT role_permissions_role_perm_unique UNIQUE (role_id, permission_id)
);

CREATE INDEX role_permissions_role_id_idx ON role_permissions(role_id);
CREATE INDEX role_permissions_perm_id_idx ON role_permissions(permission_id);

CREATE TABLE user_role_assignments (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  company_id  UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  role_id     UUID NOT NULL REFERENCES roles(id) ON DELETE CASCADE,
  assigned_by UUID REFERENCES users(id) ON DELETE SET NULL,
  assigned_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  reason      TEXT,
  is_active   BOOLEAN NOT NULL DEFAULT true,
  revoked_at  TIMESTAMPTZ,
  revoked_by  UUID REFERENCES users(id) ON DELETE SET NULL,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT user_role_assignments_user_company_role_unique UNIQUE (user_id, company_id, role_id)
);

CREATE INDEX user_role_assignments_user_company_idx ON user_role_assignments(user_id, company_id);
CREATE INDEX user_role_assignments_role_id_idx ON user_role_assignments(role_id);

CREATE TABLE temporary_access_grants (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id             UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  company_id          UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  granted_role_id     UUID NOT NULL REFERENCES roles(id) ON DELETE CASCADE,
  granted_permissions JSONB NOT NULL DEFAULT '[]',
  reason              TEXT NOT NULL,
  granted_by          UUID NOT NULL REFERENCES users(id),
  approved_by         UUID REFERENCES users(id) ON DELETE SET NULL,
  status              grant_status NOT NULL DEFAULT 'active',
  starts_at           TIMESTAMPTZ NOT NULL DEFAULT now(),
  expires_at          TIMESTAMPTZ NOT NULL,
  revoked_at          TIMESTAMPTZ,
  revoked_by          UUID REFERENCES users(id) ON DELETE SET NULL,
  inngest_job_id      VARCHAR(255),
  created_at          TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at          TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX temp_grants_user_company_idx ON temporary_access_grants(user_id, company_id);
CREATE INDEX temp_grants_status_expires_idx ON temporary_access_grants(status, expires_at);
CREATE INDEX temp_grants_user_id_idx ON temporary_access_grants(user_id);

-- ─── Auth Lockout ────────────────────────────────────────────────────────────

CREATE TABLE auth_lockouts (
  id                      UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  identifier              VARCHAR(254) NOT NULL,
  failed_attempts         VARCHAR(10) NOT NULL DEFAULT '0',
  locked_until            TIMESTAMPTZ,
  last_failed_at          TIMESTAMPTZ,
  unlock_token            VARCHAR(128),
  unlock_token_expires_at TIMESTAMPTZ,
  unlocked_at             TIMESTAMPTZ,
  unlocked_by             UUID REFERENCES users(id) ON DELETE SET NULL,
  created_at              TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at              TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX auth_lockouts_identifier_idx ON auth_lockouts(identifier);

-- ─── MFA Backup Codes ────────────────────────────────────────────────────────

CREATE TABLE mfa_backup_codes (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id    UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  code_hash  VARCHAR(64) NOT NULL,
  used_at    TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX mfa_backup_codes_user_id_idx ON mfa_backup_codes(user_id);
CREATE INDEX mfa_backup_codes_hash_idx ON mfa_backup_codes(code_hash);

-- ─── Password Reset Tokens ───────────────────────────────────────────────────

CREATE TABLE password_reset_tokens (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  token_hash  VARCHAR(64) NOT NULL,
  expires_at  TIMESTAMPTZ NOT NULL,
  used_at     TIMESTAMPTZ,
  ip_address  VARCHAR(45),
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX password_reset_tokens_user_id_idx ON password_reset_tokens(user_id);
CREATE INDEX password_reset_tokens_hash_idx ON password_reset_tokens(token_hash);

-- ─── Group Architecture ──────────────────────────────────────────────────────

CREATE TABLE company_groups (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name        VARCHAR(255) NOT NULL,
  slug        VARCHAR(100) NOT NULL UNIQUE,
  description TEXT,
  logo_url    TEXT,
  owner_id    UUID REFERENCES users(id) ON DELETE SET NULL,
  settings    JSONB NOT NULL DEFAULT '{}',
  is_active   BOOLEAN NOT NULL DEFAULT true,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX company_groups_owner_idx ON company_groups(owner_id);
CREATE INDEX company_groups_slug_idx ON company_groups(slug);

CREATE TABLE group_memberships (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  group_id    UUID NOT NULL REFERENCES company_groups(id) ON DELETE CASCADE,
  company_id  UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  added_by    UUID REFERENCES users(id) ON DELETE SET NULL,
  is_active   BOOLEAN NOT NULL DEFAULT true,
  joined_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
  left_at     TIMESTAMPTZ,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT group_memberships_group_company_unique UNIQUE (group_id, company_id)
);

CREATE INDEX group_memberships_group_id_idx ON group_memberships(group_id);
CREATE INDEX group_memberships_company_id_idx ON group_memberships(company_id);

CREATE TABLE group_kpi_snapshots (
  id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  group_id              UUID NOT NULL REFERENCES company_groups(id) ON DELETE CASCADE,
  snapshot_date         VARCHAR(10) NOT NULL,
  total_revenue         NUMERIC(19,4) NOT NULL DEFAULT 0,
  total_active_projects VARCHAR(20) NOT NULL DEFAULT '0',
  total_active_employees VARCHAR(20) NOT NULL DEFAULT '0',
  total_open_alerts     VARCHAR(20) NOT NULL DEFAULT '0',
  company_breakdown     JSONB NOT NULL DEFAULT '[]',
  companies_included    VARCHAR(20) NOT NULL DEFAULT '0',
  aggregated_at         TIMESTAMPTZ NOT NULL DEFAULT now(),
  duration_ms           VARCHAR(20),
  created_at            TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT group_kpi_snapshots_group_date_unique UNIQUE (group_id, snapshot_date)
);

CREATE INDEX group_kpi_snapshots_group_id_idx ON group_kpi_snapshots(group_id);
CREATE INDEX group_kpi_snapshots_date_idx ON group_kpi_snapshots(snapshot_date);

-- ─── Seed: All 21 System Roles ───────────────────────────────────────────────
-- company_id = NULL means system role (shared / built-in)

INSERT INTO roles (id, company_id, name, slug, type, default_scope_level, description) VALUES
  -- Core
  (gen_random_uuid(), NULL, 'Group CEO',               'group_ceo',               'system', 'SCOPE_GROUP',      'Sees all companies in the group'),
  (gen_random_uuid(), NULL, 'CEO',                     'ceo',                     'system', 'SCOPE_COMPANY',    'Full access to own company'),
  (gen_random_uuid(), NULL, 'Co-CEO',                  'co_ceo',                  'system', 'SCOPE_COMPANY',    'Shared executive access'),
  (gen_random_uuid(), NULL, 'System Administrator',    'system_administrator',    'system', 'SCOPE_PLATFORM',   'Platform-level technical access'),
  -- Attendance
  (gen_random_uuid(), NULL, 'Worker',                  'worker',                  'system', 'SCOPE_RECORD',     'Own records only'),
  (gen_random_uuid(), NULL, 'Team Leader',             'team_leader',             'system', 'SCOPE_TEAM',       'Own team records'),
  (gen_random_uuid(), NULL, 'OMS',                     'oms',                     'system', 'SCOPE_TEAM',       'Operational monitoring'),
  (gen_random_uuid(), NULL, 'Operations Manager',      'operations_manager',      'system', 'SCOPE_DEPARTMENT', 'Department-level operations'),
  (gen_random_uuid(), NULL, 'Department Head',         'department_head',         'system', 'SCOPE_DEPARTMENT', 'Department oversight'),
  (gen_random_uuid(), NULL, 'HR & Payroll',            'hr_payroll',              'system', 'SCOPE_COMPANY',    'HR and payroll access'),
  -- Projects
  (gen_random_uuid(), NULL, 'Project Worker',          'project_worker',          'system', 'SCOPE_RECORD',     'Own project tasks'),
  (gen_random_uuid(), NULL, 'Project Team Leader',     'project_team_leader',     'system', 'SCOPE_TEAM',       'Project team coordination'),
  (gen_random_uuid(), NULL, 'Project OMS',             'project_oms',             'system', 'SCOPE_TEAM',       'Project operational monitoring'),
  (gen_random_uuid(), NULL, 'Project Operations Manager', 'project_operations_manager', 'system', 'SCOPE_DEPARTMENT', 'Project operations oversight'),
  (gen_random_uuid(), NULL, 'Project Director',        'project_director',        'system', 'SCOPE_COMPANY',    'All project visibility'),
  -- Shop
  (gen_random_uuid(), NULL, 'Seller',                  'seller',                  'system', 'SCOPE_STORE',      'Own store products and orders'),
  (gen_random_uuid(), NULL, 'Store Manager',           'store_manager',           'system', 'SCOPE_STORE',      'Full store management'),
  (gen_random_uuid(), NULL, 'Shop Director',           'shop_director',           'system', 'SCOPE_COMPANY',    'All stores visibility'),
  -- Analytics
  (gen_random_uuid(), NULL, 'App Support Specialist',  'app_support_specialist',  'system', 'SCOPE_COMPANY',    'Support and monitoring access'),
  (gen_random_uuid(), NULL, 'Data Analyst',            'data_analyst',            'system', 'SCOPE_COMPANY',    'Analytics read access'),
  (gen_random_uuid(), NULL, 'QA Tester',               'qa_tester',               'system', 'SCOPE_COMPANY',    'QA and testing access');

-- ─── Seed: Permission catalog ─────────────────────────────────────────────────

INSERT INTO permissions (key, module, action) VALUES
  ('employees.read',               'employees',      'read'),
  ('employees.create',             'employees',      'create'),
  ('employees.update',             'employees',      'update'),
  ('employees.delete',             'employees',      'delete'),
  ('employees.suspend',            'employees',      'suspend'),
  ('employees.export',             'employees',      'export'),
  ('clients.read',                 'clients',        'read'),
  ('clients.create',               'clients',        'create'),
  ('clients.update',               'clients',        'update'),
  ('clients.delete',               'clients',        'delete'),
  ('suppliers.read',               'suppliers',      'read'),
  ('suppliers.create',             'suppliers',      'create'),
  ('suppliers.update',             'suppliers',      'update'),
  ('suppliers.delete',             'suppliers',      'delete'),
  ('projects.read',                'projects',       'read'),
  ('projects.create',              'projects',       'create'),
  ('projects.update',              'projects',       'update'),
  ('projects.delete',              'projects',       'delete'),
  ('projects.archive',             'projects',       'archive'),
  ('products.read',                'products',       'read'),
  ('products.create',              'products',       'create'),
  ('products.update',              'products',       'update'),
  ('products.delete',              'products',       'delete'),
  ('orders.read',                  'orders',         'read'),
  ('orders.create',                'orders',         'create'),
  ('orders.update',                'orders',         'update'),
  ('orders.cancel',                'orders',         'cancel'),
  ('invoices.read',                'invoices',       'read'),
  ('invoices.create',              'invoices',       'create'),
  ('invoices.update',              'invoices',       'update'),
  ('invoices.delete',              'invoices',       'delete'),
  ('invoices.send',                'invoices',       'send'),
  ('documents.read',               'documents',      'read'),
  ('documents.create',             'documents',      'create'),
  ('documents.update',             'documents',      'update'),
  ('documents.delete',             'documents',      'delete'),
  ('documents.sign',               'documents',      'sign'),
  ('fleet.read',                   'fleet',          'read'),
  ('fleet.create',                 'fleet',          'create'),
  ('fleet.update',                 'fleet',          'update'),
  ('fleet.assign',                 'fleet',          'assign'),
  ('tools.read',                   'tools',          'read'),
  ('tools.create',                 'tools',          'create'),
  ('tools.update',                 'tools',          'update'),
  ('tools.assign',                 'tools',          'assign'),
  ('teams.read',                   'teams',          'read'),
  ('teams.create',                 'teams',          'create'),
  ('teams.update',                 'teams',          'update'),
  ('teams.delete',                 'teams',          'delete'),
  ('companies.read',               'companies',      'read'),
  ('companies.update',             'companies',      'update'),
  ('companies.suspend',            'companies',      'suspend'),
  ('roles.read',                   'roles',          'read'),
  ('roles.assign',                 'roles',          'assign'),
  ('analytics.read',               'analytics',      'read'),
  ('analytics.export',             'analytics',      'export'),
  ('social_profiles.view',         'social_profiles','view'),
  ('social_profiles.edit_own',     'social_profiles','edit_own'),
  ('social_profiles.edit_others',  'social_profiles','edit_others'),
  ('social_profiles.delete_own',   'social_profiles','delete_own'),
  ('social_profiles.delete_others','social_profiles','delete_others'),
  ('presence.view_team',           'presence',       'view_team'),
  ('presence.view_company',        'presence',       'view_company'),
  ('presence.set_manual',          'presence',       'set_manual'),
  ('presence.override_others',     'presence',       'override_others'),
  ('business_card.view_own',       'business_card',  'view_own'),
  ('business_card.view_others',    'business_card',  'view_others'),
  ('business_card.share',          'business_card',  'share'),
  ('business_card.public_link',    'business_card',  'public_link'),
  ('data_export.gdpr',             'data_export',    'gdpr'),
  ('settings.company.read',        'settings',       'company_read'),
  ('settings.company.update',      'settings',       'company_update'),
  ('settings.security.read',       'settings',       'security_read'),
  ('settings.security.update',     'settings',       'security_update'),
  ('user.preferences.update',      'user',           'preferences_update');
