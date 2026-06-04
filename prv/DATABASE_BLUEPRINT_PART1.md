# PRV — Database Blueprint · Part 1
**Coverage:** Foundation · Identity · Roles & Permissions · Approval Engine · Group Architecture · Projects · Attendance · Workforce · HR
**Total entities this part:** ~65 tables
**Status:** Approved Architecture
**Date:** 2026-06-03

---

## Database Standards (Applied Everywhere)

| Standard | Rule |
|---------|------|
| Timestamps | All `TIMESTAMPTZ` — stored UTC, displayed in company timezone |
| Monetary values | All `NUMERIC(19,4)` — never FLOAT |
| Currency codes | `CHAR(3)` — ISO 4217 (RON, EUR, GBP) |
| Primary keys | `UUID` — `gen_random_uuid()` default |
| Soft delete | All tables: `deleted_at TIMESTAMPTZ` + `deleted_by UUID` |
| Multi-tenancy | All tables: `company_id UUID NOT NULL` (except group/platform-level) |
| Ordering | User-orderable entities: `position VARCHAR(255)` fractional index |
| Naming | snake_case, plural tables, singular columns |
| Enums | PostgreSQL native ENUM types |
| JSON fields | `JSONB` — never `JSON` |

### Universal Columns (every table)
```
id          UUID          PRIMARY KEY DEFAULT gen_random_uuid()
company_id  UUID          NOT NULL REFERENCES companies(id)  ← except global tables
created_at  TIMESTAMPTZ   NOT NULL DEFAULT now()
updated_at  TIMESTAMPTZ   NOT NULL DEFAULT now()
deleted_at  TIMESTAMPTZ   NULL
deleted_by  UUID          NULL REFERENCES users(id)
```

---

## RLS Policy Patterns

```
Pattern A — Standard (90% of tables):
  USING (company_id = auth.jwt() ->> 'company_id' AND deleted_at IS NULL)

Pattern B — Group CEO:
  USING (
    (company_id = auth.jwt() ->> 'company_id')
    OR (company_id IN (
      SELECT company_id FROM group_memberships
      WHERE group_id = auth.jwt() ->> 'group_id'
        AND status = 'ACTIVE'
    ))
    AND deleted_at IS NULL
  )

Pattern C — Own record only (Workers, Sellers):
  USING (user_id = auth.jwt() ->> 'user_id' AND deleted_at IS NULL)

Pattern D — Sysadmin JIT:
  USING (
    EXISTS (
      SELECT 1 FROM sysadmin_access_sessions
      WHERE sysadmin_id = auth.jwt() ->> 'user_id'
        AND company_id = <table>.company_id
        AND expires_at > NOW()
        AND revoked_at IS NULL
    )
    AND deleted_at IS NULL
  )

Pattern E — Global (no company_id):
  No RLS — application-layer enforcement only
```

---

# SECTION 1 — FOUNDATION

---

## 1.1 companies

**Purpose:** Root tenant entity. Every row in every other table traces back to a company.
**RLS:** Pattern E (global — read by authenticated users for their own company)
**Soft Delete:** Yes

| Column | Type | Nullable | Description |
|--------|------|----------|-------------|
| id | UUID | NOT NULL | Primary key |
| name | VARCHAR(255) | NOT NULL | Company legal name |
| display_name | VARCHAR(255) | NOT NULL | Brand name shown in UI |
| slug | VARCHAR(100) | NOT NULL UNIQUE | URL-safe identifier |
| logo_url | TEXT | NULL | Supabase Storage URL |
| primary_color | CHAR(7) | NULL | Hex color for branding |
| base_currency | CHAR(3) | NOT NULL DEFAULT 'RON' | ISO 4217 |
| primary_timezone | VARCHAR(50) | NOT NULL DEFAULT 'Europe/Bucharest' | IANA timezone |
| country_code | CHAR(2) | NOT NULL DEFAULT 'RO' | ISO 3166-1 alpha-2 |
| vat_number | VARCHAR(50) | NULL | Tax registration number |
| registration_number | VARCHAR(50) | NULL | Company registration |
| address_line1 | VARCHAR(255) | NULL | Street address |
| address_line2 | VARCHAR(255) | NULL | Suite, floor |
| city | VARCHAR(100) | NULL | City |
| postal_code | VARCHAR(20) | NULL | Postal/ZIP code |
| phone | VARCHAR(50) | NULL | Main contact phone |
| email | VARCHAR(255) | NULL | Main contact email |
| website | TEXT | NULL | Company website |
| status | ENUM('ACTIVE','SUSPENDED','TRIAL','OFFBOARDED') | NOT NULL DEFAULT 'TRIAL' | |
| subscription_tier | ENUM('STARTER','PROFESSIONAL','ENTERPRISE') | NOT NULL DEFAULT 'STARTER' | |
| trial_ends_at | TIMESTAMPTZ | NULL | If in trial |
| max_users | INT | NOT NULL DEFAULT 10 | Subscription limit |
| max_storage_gb | INT | NOT NULL DEFAULT 10 | Storage quota |
| ai_budget_monthly_ron | NUMERIC(19,4) | NULL | Monthly AI spend limit |
| settings | JSONB | NOT NULL DEFAULT '{}' | Feature flags, preferences |
| created_at | TIMESTAMPTZ | NOT NULL | |
| updated_at | TIMESTAMPTZ | NOT NULL | |
| deleted_at | TIMESTAMPTZ | NULL | |

**Indexes:** `slug`, `status`, `subscription_tier`

---

## 1.2 company_settings

**Purpose:** Extended company configuration — module-specific settings, integrations, branding.
**RLS:** Pattern A

| Column | Type | Nullable | Description |
|--------|------|----------|-------------|
| id | UUID | NOT NULL | |
| company_id | UUID | NOT NULL FK companies | |
| module | VARCHAR(100) | NOT NULL | e.g., 'projects', 'shop', 'hr' |
| key | VARCHAR(255) | NOT NULL | Setting key |
| value | JSONB | NOT NULL | Setting value |
| set_by | UUID | FK users | Who last changed this |

**Indexes:** `(company_id, module)`, `(company_id, module, key)` UNIQUE

---

## 1.3 users

**Purpose:** Platform user accounts. One user can be a member of multiple companies.
**RLS:** Pattern E (users table is global — membership scopes access)

| Column | Type | Nullable | Description |
|--------|------|----------|-------------|
| id | UUID | NOT NULL | Matches Supabase Auth user ID |
| email | VARCHAR(255) | NOT NULL UNIQUE | Primary identifier |
| email_verified_at | TIMESTAMPTZ | NULL | Email verification timestamp |
| phone | VARCHAR(50) | NULL | |
| phone_verified_at | TIMESTAMPTZ | NULL | |
| full_name | VARCHAR(255) | NOT NULL | Display name |
| avatar_url | TEXT | NULL | Profile photo |
| preferred_language | CHAR(5) | NOT NULL DEFAULT 'ro-RO' | BCP 47 language tag |
| preferred_timezone | VARCHAR(50) | NULL | User's own timezone (overrides company) |
| mfa_enabled | BOOLEAN | NOT NULL DEFAULT false | |
| mfa_methods | JSONB | NOT NULL DEFAULT '[]' | Array of enrolled MFA methods |
| passkey_enabled | BOOLEAN | NOT NULL DEFAULT false | |
| last_sign_in_at | TIMESTAMPTZ | NULL | |
| sign_in_count | INT | NOT NULL DEFAULT 0 | |
| gdpr_consent_at | TIMESTAMPTZ | NULL | When GDPR consent was given |
| gdpr_consent_version | VARCHAR(20) | NULL | Version of privacy policy consented to |
| marketing_opt_in | BOOLEAN | NOT NULL DEFAULT false | |
| status | ENUM('ACTIVE','SUSPENDED','PENDING_VERIFICATION') | NOT NULL DEFAULT 'PENDING_VERIFICATION' | |
| created_at | TIMESTAMPTZ | NOT NULL | |
| updated_at | TIMESTAMPTZ | NOT NULL | |
| deleted_at | TIMESTAMPTZ | NULL | |

**Indexes:** `email`, `status`, `last_sign_in_at`

---

## 1.3a user_preferences

**Purpose:** Per-user appearance & personalization settings. One row per user. Synced across all devices.  
**RLS:** Pattern C (own record only — users read/write only their own row)  
**Added:** Appearance & Personalization System (Sprint 05 — overrides F05-21 "Dark Mode Only")

| Column | Type | Nullable | Default | Description |
|--------|------|----------|---------|-------------|
| id | UUID | NOT NULL | gen_random_uuid() | Primary key |
| user_id | UUID | NOT NULL FK users UNIQUE | — | One row per user |
| theme | ENUM('light','dark','system') | NOT NULL | 'system' | Chosen theme mode |
| glass_style | ENUM('translucid','tinted','adaptive') | NOT NULL | 'adaptive' | Chosen glass style |
| sync_enabled | BOOLEAN | NOT NULL | true | Whether prefs sync across devices |
| updated_at | TIMESTAMPTZ | NOT NULL | NOW() | Last modified |
| synced_at | TIMESTAMPTZ | NULL | — | Last confirmed server sync |

**Indexes:** `user_id` (unique — enforces one row per user)  
**Cascade:** ON DELETE CASCADE  
**Enums introduced:** `theme_enum('light','dark','system')`, `glass_style_enum('translucid','tinted','adaptive')`

---

## 1.4 user_profiles

**Purpose:** Extended user data — profile fields not needed for authentication.
**RLS:** Pattern A (linked via company_memberships)

| Column | Type | Nullable | Description |
|--------|------|----------|-------------|
| id | UUID | NOT NULL | |
| user_id | UUID | NOT NULL FK users UNIQUE | One profile per user |
| company_id | UUID | NOT NULL FK companies | |
| employee_number | VARCHAR(50) | NULL | Company-assigned employee ID |
| job_title | VARCHAR(255) | NULL | Official job title |
| bio | TEXT | NULL | Short professional bio |
| emergency_contact_name | VARCHAR(255) | NULL | |
| emergency_contact_phone | VARCHAR(50) | NULL | |
| date_of_birth | DATE | NULL | |
| hire_date | DATE | NULL | |
| national_id | VARCHAR(100) | NULL | CNP or equivalent — encrypted |
| bank_iban | VARCHAR(50) | NULL | Salary payment IBAN — encrypted |
| address | JSONB | NULL | Home address — encrypted |
| skills | JSONB | NOT NULL DEFAULT '[]' | Array of skill tags |
| certifications | JSONB | NOT NULL DEFAULT '[]' | Professional certifications |

**Indexes:** `(company_id, user_id)`, `employee_number`

---

## 1.5 company_memberships

**Purpose:** Defines a user's relationship with a company — role, scope, status.
**RLS:** Pattern A

| Column | Type | Nullable | Description |
|--------|------|----------|-------------|
| id | UUID | NOT NULL | |
| company_id | UUID | NOT NULL FK companies | |
| user_id | UUID | NOT NULL FK users | |
| primary_role | VARCHAR(100) | NOT NULL | Main role identifier |
| additional_roles | JSONB | NOT NULL DEFAULT '[]' | Secondary roles (additive permissions) |
| scope_level | SMALLINT | NOT NULL DEFAULT 1 | 1–9 scope level |
| scope_target_type | VARCHAR(50) | NULL | 'company', 'region', 'store', 'department', 'team' |
| scope_target_id | UUID | NULL | The specific entity for scope |
| status | ENUM('ACTIVE','INACTIVE','INVITED','SUSPENDED') | NOT NULL DEFAULT 'INVITED' | |
| invited_by | UUID | NULL FK users | |
| invited_at | TIMESTAMPTZ | NULL | |
| activated_at | TIMESTAMPTZ | NULL | |
| deactivated_at | TIMESTAMPTZ | NULL | |
| deactivation_reason | TEXT | NULL | |

**Indexes:** `(company_id, user_id)` UNIQUE where status='ACTIVE', `(company_id, primary_role)`, `user_id`

---

## 1.6 devices

**Purpose:** Registered devices for users — trust levels, push tokens, session management.
**RLS:** Pattern C (own devices only for standard users, admin can view all)

| Column | Type | Nullable | Description |
|--------|------|----------|-------------|
| id | UUID | NOT NULL | |
| user_id | UUID | NOT NULL FK users | |
| company_id | UUID | NOT NULL FK companies | |
| device_fingerprint | VARCHAR(255) | NOT NULL | Unique device identifier hash |
| device_name | VARCHAR(255) | NULL | User-provided or auto-detected name |
| device_type | ENUM('IPHONE','IPAD','ANDROID','WEB','MACOS','WINDOWS') | NOT NULL | |
| os_version | VARCHAR(50) | NULL | |
| app_version | VARCHAR(50) | NULL | |
| push_token | TEXT | NULL | FCM or APNs token — encrypted |
| push_token_updated_at | TIMESTAMPTZ | NULL | |
| trust_level | ENUM('TRUSTED','KNOWN','UNKNOWN','REVOKED') | NOT NULL DEFAULT 'UNKNOWN' | |
| trusted_at | TIMESTAMPTZ | NULL | When elevated to TRUSTED |
| trusted_by | UUID | NULL FK users | Admin who approved |
| revoked_at | TIMESTAMPTZ | NULL | When device was revoked |
| revoked_by | UUID | NULL FK users | |
| revocation_reason | TEXT | NULL | |
| last_seen_at | TIMESTAMPTZ | NULL | Last API call from this device |
| last_seen_ip | INET | NULL | |

**Indexes:** `(user_id, trust_level)`, `device_fingerprint`, `push_token`

---

## 1.7 active_sessions

**Purpose:** Currently active user sessions — supports revocation propagation and security dashboard.
**RLS:** Pattern C (own sessions) + Admin can view company sessions

| Column | Type | Nullable | Description |
|--------|------|----------|-------------|
| id | UUID | NOT NULL | |
| user_id | UUID | NOT NULL FK users | |
| company_id | UUID | NOT NULL FK companies | |
| device_id | UUID | NULL FK devices | |
| session_token_hash | VARCHAR(255) | NOT NULL | SHA-256 hash of session token |
| role | VARCHAR(100) | NOT NULL | Role at session creation |
| scope_level | SMALLINT | NOT NULL | Scope level at session creation |
| mfa_verified | BOOLEAN | NOT NULL DEFAULT false | |
| ip_address | INET | NULL | |
| user_agent | TEXT | NULL | |
| geo_country | CHAR(2) | NULL | ISO country code |
| created_at | TIMESTAMPTZ | NOT NULL | |
| expires_at | TIMESTAMPTZ | NOT NULL | |
| last_seen_at | TIMESTAMPTZ | NOT NULL | |
| revoked_at | TIMESTAMPTZ | NULL | |
| revocation_reason | ENUM('LOGOUT','DEVICE_REVOKED','PERMISSION_CHANGE','COMPANY_SWITCH','ADMIN_REVOKE','EXPIRED') | NULL | |

**Indexes:** `(user_id, revoked_at)`, `session_token_hash`, `(company_id, created_at)`

---

# SECTION 2 — GROUP ARCHITECTURE

---

## 2.1 company_groups

**Purpose:** Named ownership groups — one entity owns multiple companies.
**RLS:** Pattern E (global) — read by Group CEO who belongs to the group
**Note:** No company_id — this is above company level

| Column | Type | Nullable | Description |
|--------|------|----------|-------------|
| id | UUID | NOT NULL | |
| name | VARCHAR(255) | NOT NULL | Group name (e.g., "PRV Holding") |
| legal_entity_name | VARCHAR(255) | NULL | Legal name of holding entity |
| owner_user_id | UUID | NOT NULL FK users | Ultimate owner |
| base_currency | CHAR(3) | NOT NULL DEFAULT 'RON' | Group reporting currency |
| primary_timezone | VARCHAR(50) | NOT NULL DEFAULT 'Europe/Bucharest' | |
| status | ENUM('ACTIVE','SUSPENDED') | NOT NULL DEFAULT 'ACTIVE' | |
| created_at | TIMESTAMPTZ | NOT NULL | |
| updated_at | TIMESTAMPTZ | NOT NULL | |
| deleted_at | TIMESTAMPTZ | NULL | |

**Indexes:** `owner_user_id`, `status`

---

## 2.2 group_memberships

**Purpose:** Defines which companies belong to which group.
**RLS:** Pattern E — Group CEO sees their own groups; Sysadmin sees all

| Column | Type | Nullable | Description |
|--------|------|----------|-------------|
| id | UUID | NOT NULL | |
| group_id | UUID | NOT NULL FK company_groups | |
| company_id | UUID | NOT NULL FK companies | |
| joined_at | TIMESTAMPTZ | NOT NULL | When company joined group |
| status | ENUM('ACTIVE','INACTIVE') | NOT NULL DEFAULT 'ACTIVE' | |
| reporting_currency | CHAR(3) | NULL | Override group currency for this company |

**Indexes:** `(group_id, company_id)` UNIQUE, `company_id`

---

## 2.3 group_kpi_snapshots

**Purpose:** Pre-computed group-level KPI aggregations for Group CEO dashboard.
**Generated:** Nightly Inngest job. Not real-time.
**RLS:** Pattern E — Group CEO for their group only

| Column | Type | Nullable | Description |
|--------|------|----------|-------------|
| id | UUID | NOT NULL | |
| group_id | UUID | NOT NULL FK company_groups | |
| snapshot_date | DATE | NOT NULL | Date of snapshot |
| company_count | INT | NOT NULL | Number of active companies |
| total_revenue_ron | NUMERIC(19,4) | NOT NULL | Total revenue, converted to group currency |
| total_expenses_ron | NUMERIC(19,4) | NOT NULL | |
| total_profit_ron | NUMERIC(19,4) | NOT NULL | |
| total_employees | INT | NOT NULL | |
| active_projects | INT | NOT NULL | |
| pending_approvals | INT | NOT NULL | |
| per_company_data | JSONB | NOT NULL | Array of per-company KPI objects |
| ai_insights | JSONB | NULL | AI-generated group insights for this snapshot |
| created_at | TIMESTAMPTZ | NOT NULL | |

**Indexes:** `(group_id, snapshot_date)` UNIQUE, `(group_id, snapshot_date DESC)`

---

## 2.4 sysadmin_access_sessions

**Purpose:** JIT (Just-In-Time) access log for Sysadmin per-company access.
**RLS:** Pattern E — Sysadmin reads own; company Admin reads sessions for their company

| Column | Type | Nullable | Description |
|--------|------|----------|-------------|
| id | UUID | NOT NULL | |
| sysadmin_id | UUID | NOT NULL FK users | |
| company_id | UUID | NOT NULL FK companies | Target company |
| access_type | ENUM('NORMAL','BREAK_GLASS') | NOT NULL | |
| reason_category | VARCHAR(100) | NOT NULL | Dropdown category |
| reason_text | TEXT | NOT NULL | Free-text justification |
| co_signer_id | UUID | NULL FK users | Required for BREAK_GLASS |
| started_at | TIMESTAMPTZ | NOT NULL | |
| expires_at | TIMESTAMPTZ | NOT NULL | Max 2h NORMAL, 4h BREAK_GLASS |
| revoked_at | TIMESTAMPTZ | NULL | Early termination |
| revoked_by | UUID | NULL FK users | |
| company_admin_notified_at | TIMESTAMPTZ | NULL | When notification was sent |
| actions_taken_count | INT | NOT NULL DEFAULT 0 | Audit event counter |

**Indexes:** `(sysadmin_id, started_at)`, `(company_id, started_at)`, `(expires_at, revoked_at)`

---

# SECTION 3 — ROLES & PERMISSIONS

---

## 3.1 roles

**Purpose:** Canonical role definitions — the 20 defined roles.
**RLS:** Pattern E (global read-only reference table)

| Column | Type | Nullable | Description |
|--------|------|----------|-------------|
| id | UUID | NOT NULL | |
| code | VARCHAR(100) | NOT NULL UNIQUE | e.g., 'PROJECT_WORKER', 'CEO', 'GROUP_CEO' |
| name | VARCHAR(255) | NOT NULL | Display name |
| category | ENUM('CORE','ATTENDANCE','PROJECTS','SHOP','ANALYTICS','GROUP') | NOT NULL | |
| base_scope_level | SMALLINT | NOT NULL | Default scope level for this role |
| max_scope_level | SMALLINT | NOT NULL | Maximum achievable scope |
| description | TEXT | NULL | |
| is_system_role | BOOLEAN | NOT NULL DEFAULT true | System roles cannot be deleted |
| created_at | TIMESTAMPTZ | NOT NULL | |

**Indexes:** `code` UNIQUE, `category`

---

## 3.2 permissions

**Purpose:** Granular permission catalog — format: `{module}.{resource}.{action}`.
**RLS:** Pattern E (global read-only reference)

| Column | Type | Nullable | Description |
|--------|------|----------|-------------|
| id | UUID | NOT NULL | |
| code | VARCHAR(255) | NOT NULL UNIQUE | e.g., 'projects.task.create' |
| module | VARCHAR(100) | NOT NULL | e.g., 'projects' |
| resource | VARCHAR(100) | NOT NULL | e.g., 'task' |
| action | VARCHAR(100) | NOT NULL | e.g., 'create' |
| description | TEXT | NULL | |
| min_scope_level | SMALLINT | NOT NULL DEFAULT 1 | Minimum scope required |
| is_sensitive | BOOLEAN | NOT NULL DEFAULT false | Requires re-auth |
| is_audited | BOOLEAN | NOT NULL DEFAULT true | Generate audit log entry |

**Indexes:** `code` UNIQUE, `(module, resource)`, `is_sensitive`

---

## 3.3 role_permissions

**Purpose:** Maps which permissions each role has by default.
**RLS:** Pattern E (global read-only reference)

| Column | Type | Nullable | Description |
|--------|------|----------|-------------|
| id | UUID | NOT NULL | |
| role_id | UUID | NOT NULL FK roles | |
| permission_id | UUID | NOT NULL FK permissions | |
| granted | BOOLEAN | NOT NULL DEFAULT true | false = explicit deny |

**Indexes:** `(role_id, permission_id)` UNIQUE

---

## 3.4 user_role_assignments

**Purpose:** Per-user, per-company role overrides and custom permission grants.
**RLS:** Pattern A — HR and Admin can manage; users can read own

| Column | Type | Nullable | Description |
|--------|------|----------|-------------|
| id | UUID | NOT NULL | |
| company_id | UUID | NOT NULL FK companies | |
| user_id | UUID | NOT NULL FK users | |
| role_id | UUID | NOT NULL FK roles | |
| scope_level | SMALLINT | NOT NULL | |
| scope_target_type | VARCHAR(50) | NULL | |
| scope_target_id | UUID | NULL | |
| custom_permission_grants | JSONB | NOT NULL DEFAULT '[]' | Additional permissions beyond role |
| custom_permission_denies | JSONB | NOT NULL DEFAULT '[]' | Explicit denials |
| assigned_by | UUID | NOT NULL FK users | |
| assigned_at | TIMESTAMPTZ | NOT NULL | |
| valid_until | TIMESTAMPTZ | NULL | Expiry for time-limited assignments |

**Indexes:** `(company_id, user_id)`, `(company_id, role_id)`, `valid_until`

---

## 3.5 temporary_access_grants

**Purpose:** Temporary elevated access for specific resources.
**RLS:** Pattern A — Admins manage; users can read own

| Column | Type | Nullable | Description |
|--------|------|----------|-------------|
| id | UUID | NOT NULL | |
| company_id | UUID | NOT NULL FK companies | |
| user_id | UUID | NOT NULL FK users | Recipient |
| resource_type | VARCHAR(100) | NOT NULL | e.g., 'project', 'store' |
| resource_id | UUID | NOT NULL | Specific entity |
| granted_role_id | UUID | NOT NULL FK roles | Temporary role |
| granted_by | UUID | NOT NULL FK users | Must be higher role |
| granted_at | TIMESTAMPTZ | NOT NULL | |
| expires_at | TIMESTAMPTZ | NOT NULL | Mandatory expiry |
| revoked_at | TIMESTAMPTZ | NULL | Early revocation |
| revoked_by | UUID | NULL FK users | |
| revocation_reason | TEXT | NULL | |
| status | ENUM('ACTIVE','EXPIRED','REVOKED') | NOT NULL DEFAULT 'ACTIVE' | |

**Indexes:** `(user_id, status)`, `(resource_type, resource_id)`, `expires_at`

---

# SECTION 4 — APPROVAL ENGINE

---

## 4.1 approval_templates

**Purpose:** Reusable approval chain configurations per company. Set up by admins.
**RLS:** Pattern A — Admin roles create; all authorized users can read

| Column | Type | Nullable | Description |
|--------|------|----------|-------------|
| id | UUID | NOT NULL | |
| company_id | UUID | NOT NULL FK companies | |
| code | VARCHAR(100) | NOT NULL | e.g., 'renovation_phase_sign_off' |
| name | VARCHAR(255) | NOT NULL | Display name |
| module | VARCHAR(100) | NOT NULL | Which module uses this template |
| chain_type | ENUM('SEQUENTIAL','PARALLEL','QUORUM','THRESHOLD','CROSS_MODULE','CROSS_COMPANY') | NOT NULL | |
| quorum_count | INT | NULL | For QUORUM type: X of N |
| threshold_rules | JSONB | NULL | For THRESHOLD type: value → role mapping |
| steps | JSONB | NOT NULL | Ordered array of approval steps |
| sla_hours_critical | INT | NOT NULL DEFAULT 2 | |
| sla_hours_high | INT | NOT NULL DEFAULT 8 | |
| sla_hours_normal | INT | NOT NULL DEFAULT 48 | |
| sla_hours_low | INT | NOT NULL DEFAULT 120 | |
| auto_approve_below | NUMERIC(19,4) | NULL | Auto-approve if value below threshold |
| is_active | BOOLEAN | NOT NULL DEFAULT true | |
| created_by | UUID | NOT NULL FK users | |

**Indexes:** `(company_id, module)`, `(company_id, code)` UNIQUE

---

## 4.2 approval_chains

**Purpose:** Active approval chain instances tied to specific business entities.
**RLS:** Pattern A

| Column | Type | Nullable | Description |
|--------|------|----------|-------------|
| id | UUID | NOT NULL | |
| company_id | UUID | NOT NULL FK companies | |
| template_id | UUID | NOT NULL FK approval_templates | |
| entity_type | VARCHAR(100) | NOT NULL | e.g., 'renovation_phase' |
| entity_id | UUID | NOT NULL | The entity being approved |
| entity_value | NUMERIC(19,4) | NULL | Monetary or quantitative value |
| entity_currency | CHAR(3) | NULL | |
| submitted_by | UUID | NOT NULL FK users | |
| priority | ENUM('CRITICAL','HIGH','NORMAL','LOW') | NOT NULL DEFAULT 'NORMAL' | |
| status | ENUM('PENDING','IN_PROGRESS','APPROVED','REJECTED','CANCELLED','EXPIRED') | NOT NULL DEFAULT 'PENDING' | |
| current_step | INT | NOT NULL DEFAULT 1 | |
| total_steps | INT | NOT NULL | |
| context | JSONB | NOT NULL DEFAULT '{}' | Extra data for approvers |
| due_at | TIMESTAMPTZ | NOT NULL | SLA deadline |
| completed_at | TIMESTAMPTZ | NULL | |
| completion_note | TEXT | NULL | |

**Indexes:** `(entity_type, entity_id)`, `(company_id, status)`, `(status, due_at)`

---

## 4.3 approval_instances

**Purpose:** Individual approval actions within a chain — one per approver per step.
**RLS:** Pattern A — approvers see their own; managers see team's

| Column | Type | Nullable | Description |
|--------|------|----------|-------------|
| id | UUID | NOT NULL | |
| company_id | UUID | NOT NULL FK companies | |
| chain_id | UUID | NOT NULL FK approval_chains | |
| step_number | INT | NOT NULL | Which step in the chain |
| approver_id | UUID | NULL FK users | NULL = pending assignment |
| approver_role | VARCHAR(100) | NOT NULL | Required role for this step |
| status | ENUM('PENDING','NOTIFIED','VIEWED','APPROVED','REJECTED','DELEGATED','ESCALATED','EXPIRED') | NOT NULL DEFAULT 'PENDING' | |
| notified_at | TIMESTAMPTZ | NULL | |
| viewed_at | TIMESTAMPTZ | NULL | |
| actioned_at | TIMESTAMPTZ | NULL | |
| due_at | TIMESTAMPTZ | NOT NULL | Step-level SLA |
| is_delegated | BOOLEAN | NOT NULL DEFAULT false | |
| delegated_to | UUID | NULL FK users | |
| delegated_at | TIMESTAMPTZ | NULL | |

**Indexes:** `(chain_id, step_number)`, `(approver_id, status)`, `due_at`

---

## 4.4 approval_actions

**Purpose:** Audit record of each approval action taken.
**RLS:** Pattern A — read by chain participants; immutable after creation

| Column | Type | Nullable | Description |
|--------|------|----------|-------------|
| id | UUID | NOT NULL | |
| company_id | UUID | NOT NULL FK companies | |
| instance_id | UUID | NOT NULL FK approval_instances | |
| chain_id | UUID | NOT NULL FK approval_chains | |
| actor_id | UUID | NOT NULL FK users | |
| action | ENUM('APPROVED','REJECTED','DELEGATED','REQUESTED_INFO','ESCALATED') | NOT NULL | |
| comment | TEXT | NULL | |
| attachments | JSONB | NOT NULL DEFAULT '[]' | Array of file URLs |
| ip_address | INET | NULL | |
| taken_at | TIMESTAMPTZ | NOT NULL | |

**Indexes:** `(chain_id, taken_at)`, `(actor_id, taken_at)`, `(instance_id, taken_at)`

---

## 4.5 approval_delegates

**Purpose:** Standing delegation rules — when user is absent, delegate to X.
**RLS:** Pattern A — users manage own; admins can view all

| Column | Type | Nullable | Description |
|--------|------|----------|-------------|
| id | UUID | NOT NULL | |
| company_id | UUID | NOT NULL FK companies | |
| delegator_id | UUID | NOT NULL FK users | Who is delegating |
| delegate_id | UUID | NOT NULL FK users | Who receives the delegation |
| scope | ENUM('ALL','MODULE','SPECIFIC_CHAIN') | NOT NULL DEFAULT 'ALL' | |
| module | VARCHAR(100) | NULL | If scope = MODULE |
| template_id | UUID | NULL FK approval_templates | If scope = SPECIFIC_CHAIN |
| valid_from | TIMESTAMPTZ | NOT NULL | |
| valid_until | TIMESTAMPTZ | NOT NULL | |
| is_active | BOOLEAN | NOT NULL DEFAULT true | |
| created_by | UUID | NOT NULL FK users | |

**Indexes:** `(delegator_id, is_active)`, `(delegate_id, is_active)`, `valid_until`

---

# SECTION 5 — PROJECTS

---

## 5.1 projects

**Purpose:** Core project entity — applies to both general projects and renovation projects.
**RLS:** Pattern A — scope-filtered by user's project membership

| Column | Type | Nullable | Description |
|--------|------|----------|-------------|
| id | UUID | NOT NULL | |
| company_id | UUID | NOT NULL FK companies | |
| code | VARCHAR(50) | NOT NULL | Auto-generated project code |
| name | VARCHAR(255) | NOT NULL | |
| description | TEXT | NULL | |
| type | ENUM('GENERAL','RENOVATION','INTERNAL','CLIENT') | NOT NULL DEFAULT 'GENERAL' | |
| status | ENUM('DRAFT','PLANNING','ACTIVE','ON_HOLD','COMPLETED','CANCELLED') | NOT NULL DEFAULT 'DRAFT' | |
| priority | ENUM('LOW','NORMAL','HIGH','CRITICAL') | NOT NULL DEFAULT 'NORMAL' | |
| client_id | UUID | NULL FK clients | CRM client reference |
| project_director_id | UUID | NULL FK users | |
| project_manager_id | UUID | NULL FK users | |
| department_id | UUID | NULL FK departments | |
| budget_ron | NUMERIC(19,4) | NULL | Approved budget |
| budget_currency | CHAR(3) | NOT NULL DEFAULT 'RON' | |
| actual_cost_ron | NUMERIC(19,4) | NOT NULL DEFAULT 0 | Running total |
| start_date | DATE | NULL | |
| end_date | DATE | NULL | |
| actual_start_date | DATE | NULL | |
| actual_end_date | DATE | NULL | |
| progress_pct | SMALLINT | NOT NULL DEFAULT 0 | 0–100 |
| tags | JSONB | NOT NULL DEFAULT '[]' | |
| custom_fields | JSONB | NOT NULL DEFAULT '{}' | |
| position | VARCHAR(255) | NULL | Ordering in project list |

**Indexes:** `(company_id, status)`, `(company_id, type)`, `client_id`, `code`
**Partition:** None (managed by company_id + status filtering)

---

## 5.2 project_members

**Purpose:** Who is assigned to a project and in what role.
**RLS:** Pattern A

| Column | Type | Nullable | Description |
|--------|------|----------|-------------|
| id | UUID | NOT NULL | |
| company_id | UUID | NOT NULL FK companies | |
| project_id | UUID | NOT NULL FK projects | |
| user_id | UUID | NOT NULL FK users | |
| role | ENUM('DIRECTOR','OPM','TL','WORKER','OBSERVER') | NOT NULL | |
| joined_at | TIMESTAMPTZ | NOT NULL | |
| left_at | TIMESTAMPTZ | NULL | |
| invited_by | UUID | NULL FK users | |

**Indexes:** `(project_id, user_id)` UNIQUE where left_at IS NULL, `(user_id, role)`

---

## 5.3 tasks

**Purpose:** Atomic units of work within a project.
**RLS:** Pattern A — scope filtered to user's assigned tasks or full project access by role

| Column | Type | Nullable | Description |
|--------|------|----------|-------------|
| id | UUID | NOT NULL | |
| company_id | UUID | NOT NULL FK companies | |
| project_id | UUID | NOT NULL FK projects | |
| sprint_id | UUID | NULL FK sprints | |
| milestone_id | UUID | NULL FK milestones | |
| parent_task_id | UUID | NULL FK tasks | Sub-task relationship |
| title | VARCHAR(500) | NOT NULL | |
| description | TEXT | NULL | |
| type | ENUM('TASK','BUG','STORY','EPIC','SUBTASK') | NOT NULL DEFAULT 'TASK' | |
| status | ENUM('BACKLOG','TODO','IN_PROGRESS','IN_REVIEW','DONE','CANCELLED') | NOT NULL DEFAULT 'BACKLOG' | |
| priority | ENUM('LOW','NORMAL','HIGH','CRITICAL') | NOT NULL DEFAULT 'NORMAL' | |
| assignee_id | UUID | NULL FK users | Primary assignee |
| reporter_id | UUID | NOT NULL FK users | Who created the task |
| due_date | DATE | NULL | |
| estimated_hours | NUMERIC(5,2) | NULL | |
| actual_hours | NUMERIC(5,2) | NOT NULL DEFAULT 0 | |
| story_points | INT | NULL | |
| tags | JSONB | NOT NULL DEFAULT '[]' | |
| custom_fields | JSONB | NOT NULL DEFAULT '{}' | |
| position | VARCHAR(255) | NULL | Fractional index for ordering |
| completed_at | TIMESTAMPTZ | NULL | |

**Indexes:** `(project_id, status)`, `(assignee_id, status)`, `(sprint_id, position)`, `due_date`

---

## 5.4 sprints

**Purpose:** Time-boxed iteration containers for tasks.
**RLS:** Pattern A

| Column | Type | Nullable | Description |
|--------|------|----------|-------------|
| id | UUID | NOT NULL | |
| company_id | UUID | NOT NULL FK companies | |
| project_id | UUID | NOT NULL FK projects | |
| name | VARCHAR(255) | NOT NULL | e.g., "Sprint 1", "Week 3" |
| goal | TEXT | NULL | Sprint goal statement |
| status | ENUM('PLANNED','ACTIVE','COMPLETED','CANCELLED') | NOT NULL DEFAULT 'PLANNED' | |
| start_date | DATE | NOT NULL | |
| end_date | DATE | NOT NULL | |
| capacity_hours | NUMERIC(6,2) | NULL | Team capacity for this sprint |
| velocity | INT | NULL | Story points completed |
| retrospective_notes | TEXT | NULL | |

**Indexes:** `(project_id, status)`, `(project_id, start_date)`

---

## 5.5 milestones

**Purpose:** Major project checkpoints and deliverables.
**RLS:** Pattern A

| Column | Type | Nullable | Description |
|--------|------|----------|-------------|
| id | UUID | NOT NULL | |
| company_id | UUID | NOT NULL FK companies | |
| project_id | UUID | NOT NULL FK projects | |
| name | VARCHAR(255) | NOT NULL | |
| description | TEXT | NULL | |
| due_date | DATE | NOT NULL | |
| status | ENUM('PENDING','IN_PROGRESS','COMPLETED','MISSED') | NOT NULL DEFAULT 'PENDING' | |
| completed_at | TIMESTAMPTZ | NULL | |
| completion_note | TEXT | NULL | |
| client_visible | BOOLEAN | NOT NULL DEFAULT false | Shown in Client Portal |

**Indexes:** `(project_id, due_date)`, `(project_id, status)`

---

## 5.6 project_budgets

**Purpose:** Budget line items and actual spending per project.
**RLS:** Pattern A — Finance roles and Project Directors

| Column | Type | Nullable | Description |
|--------|------|----------|-------------|
| id | UUID | NOT NULL | |
| company_id | UUID | NOT NULL FK companies | |
| project_id | UUID | NOT NULL FK projects | |
| category | VARCHAR(100) | NOT NULL | e.g., 'materials', 'labor', 'equipment' |
| budget_amount | NUMERIC(19,4) | NOT NULL | |
| budget_currency | CHAR(3) | NOT NULL DEFAULT 'RON' | |
| actual_amount | NUMERIC(19,4) | NOT NULL DEFAULT 0 | |
| committed_amount | NUMERIC(19,4) | NOT NULL DEFAULT 0 | Approved but not yet spent |
| notes | TEXT | NULL | |

**Indexes:** `(project_id, category)`

---

## 5.7 kanban_boards

**Purpose:** Visual board configurations per project.
**RLS:** Pattern A

| Column | Type | Nullable | Description |
|--------|------|----------|-------------|
| id | UUID | NOT NULL | |
| company_id | UUID | NOT NULL FK companies | |
| project_id | UUID | NOT NULL FK projects | |
| name | VARCHAR(255) | NOT NULL | |
| is_default | BOOLEAN | NOT NULL DEFAULT false | |

---

## 5.8 kanban_columns

**Purpose:** Status columns within a kanban board.
**RLS:** Pattern A

| Column | Type | Nullable | Description |
|--------|------|----------|-------------|
| id | UUID | NOT NULL | |
| company_id | UUID | NOT NULL FK companies | |
| board_id | UUID | NOT NULL FK kanban_boards | |
| name | VARCHAR(100) | NOT NULL | |
| mapped_status | ENUM (task statuses) | NOT NULL | Which task status this column shows |
| color | CHAR(7) | NULL | Column header color |
| wip_limit | INT | NULL | Work-in-progress limit |
| position | VARCHAR(255) | NOT NULL | Fractional index |

**Indexes:** `(board_id, position)`

---

# SECTION 6 — ATTENDANCE

---

## 6.1 attendance_records

**Purpose:** Individual check-in/check-out records. Highest-volume operational table.
**RLS:** Pattern A — own records for workers; team for TLs; all for HR/Ops
**Partition:** `(company_id, check_in_at)` — monthly composite partitions

| Column | Type | Nullable | Description |
|--------|------|----------|-------------|
| id | UUID | NOT NULL | |
| company_id | UUID | NOT NULL FK companies | |
| user_id | UUID | NOT NULL FK users | |
| date | DATE | NOT NULL | Attendance date |
| check_in_at | TIMESTAMPTZ | NULL | Check-in timestamp (UTC) |
| check_out_at | TIMESTAMPTZ | NULL | Check-out timestamp (UTC) |
| location_timezone | VARCHAR(50) | NOT NULL | Site timezone |
| check_in_location | JSONB | NULL | {lat, lng, address} |
| check_out_location | JSONB | NULL | |
| check_in_method | ENUM('APP','QR','BIOMETRIC','MANUAL','OFFLINE_SYNC') | NOT NULL | |
| check_out_method | ENUM('APP','QR','BIOMETRIC','MANUAL','OFFLINE_SYNC','AUTO') | NULL | |
| status | ENUM('PRESENT','ABSENT','LATE','EARLY_DEPARTURE','HALF_DAY','ON_LEAVE') | NOT NULL | |
| late_minutes | INT | NOT NULL DEFAULT 0 | Minutes late at check-in |
| early_departure_minutes | INT | NOT NULL DEFAULT 0 | |
| total_hours | NUMERIC(4,2) | NULL | Computed on check-out |
| overtime_hours | NUMERIC(4,2) | NOT NULL DEFAULT 0 | Hours beyond schedule |
| notes | TEXT | NULL | Manager notes |
| approved_by | UUID | NULL FK users | Manager who approved |
| is_offline_sync | BOOLEAN | NOT NULL DEFAULT false | Synced from offline queue |
| offline_created_at | TIMESTAMPTZ | NULL | Device timestamp when offline |

**Indexes:** `(company_id, user_id, date)`, `(company_id, date)`, `(user_id, status)`

---

## 6.2 leave_requests

**Purpose:** Employee leave and time-off requests.
**RLS:** Pattern A — own for workers; team for TLs; all for HR

| Column | Type | Nullable | Description |
|--------|------|----------|-------------|
| id | UUID | NOT NULL | |
| company_id | UUID | NOT NULL FK companies | |
| user_id | UUID | NOT NULL FK users | Requester |
| leave_type_id | UUID | NOT NULL FK leave_types | |
| start_date | DATE | NOT NULL | |
| end_date | DATE | NOT NULL | |
| total_days | NUMERIC(3,1) | NOT NULL | Accounts for half-days |
| reason | TEXT | NULL | |
| status | ENUM('DRAFT','PENDING','APPROVED','REJECTED','CANCELLED') | NOT NULL DEFAULT 'DRAFT' | |
| approval_chain_id | UUID | NULL FK approval_chains | |
| reviewed_by | UUID | NULL FK users | |
| reviewed_at | TIMESTAMPTZ | NULL | |
| review_comment | TEXT | NULL | |
| cover_user_id | UUID | NULL FK users | Who covers during absence |
| attachments | JSONB | NOT NULL DEFAULT '[]' | Medical certificates etc. |

**Indexes:** `(company_id, user_id, start_date)`, `(company_id, status)`, `(start_date, end_date)`

---

## 6.3 leave_types

**Purpose:** Company-defined leave types with balances and rules.
**RLS:** Pattern A

| Column | Type | Nullable | Description |
|--------|------|----------|-------------|
| id | UUID | NOT NULL | |
| company_id | UUID | NOT NULL FK companies | |
| name | VARCHAR(100) | NOT NULL | e.g., "Annual Leave", "Sick Leave" |
| code | VARCHAR(50) | NOT NULL | Internal code |
| paid | BOOLEAN | NOT NULL DEFAULT true | |
| days_per_year | NUMERIC(4,1) | NULL | NULL = unlimited |
| carry_over_days | NUMERIC(4,1) | NOT NULL DEFAULT 0 | |
| requires_approval | BOOLEAN | NOT NULL DEFAULT true | |
| requires_document | BOOLEAN | NOT NULL DEFAULT false | e.g., medical certificate |
| advance_notice_days | INT | NOT NULL DEFAULT 1 | Min days before start |
| color | CHAR(7) | NOT NULL DEFAULT '#FFFFFF' | Calendar color |
| is_active | BOOLEAN | NOT NULL DEFAULT true | |

**Indexes:** `(company_id, is_active)`, `(company_id, code)` UNIQUE

---

## 6.4 overtime_requests

**Purpose:** Overtime authorization requests.
**RLS:** Pattern A

| Column | Type | Nullable | Description |
|--------|------|----------|-------------|
| id | UUID | NOT NULL | |
| company_id | UUID | NOT NULL FK companies | |
| user_id | UUID | NOT NULL FK users | |
| date | DATE | NOT NULL | |
| start_time | TIME | NOT NULL | |
| end_time | TIME | NOT NULL | |
| hours | NUMERIC(4,2) | NOT NULL | |
| reason | TEXT | NOT NULL | |
| status | ENUM('PENDING','APPROVED','REJECTED') | NOT NULL DEFAULT 'PENDING' | |
| approval_chain_id | UUID | NULL FK approval_chains | |
| pay_multiplier | NUMERIC(3,2) | NOT NULL DEFAULT 1.5 | |

**Indexes:** `(company_id, user_id, date)`, `(company_id, status)`

---

## 6.5 schedules

**Purpose:** Work schedule templates.
**RLS:** Pattern A

| Column | Type | Nullable | Description |
|--------|------|----------|-------------|
| id | UUID | NOT NULL | |
| company_id | UUID | NOT NULL FK companies | |
| name | VARCHAR(255) | NOT NULL | e.g., "Standard 8-17", "Night Shift" |
| type | ENUM('FIXED','FLEXIBLE','SHIFT','CUSTOM') | NOT NULL | |
| work_days | JSONB | NOT NULL | Array of weekday numbers (1=Mon) |
| start_time | TIME | NULL | For FIXED type |
| end_time | TIME | NULL | For FIXED type |
| hours_per_day | NUMERIC(4,2) | NOT NULL DEFAULT 8 | |
| break_minutes | INT | NOT NULL DEFAULT 60 | |
| overtime_threshold_hours | NUMERIC(4,2) | NOT NULL DEFAULT 8 | |
| is_active | BOOLEAN | NOT NULL DEFAULT true | |

**Indexes:** `(company_id, is_active)`

---

## 6.6 schedule_assignments

**Purpose:** Assigns a schedule to a user for a date range.
**RLS:** Pattern A

| Column | Type | Nullable | Description |
|--------|------|----------|-------------|
| id | UUID | NOT NULL | |
| company_id | UUID | NOT NULL FK companies | |
| user_id | UUID | NOT NULL FK users | |
| schedule_id | UUID | NOT NULL FK schedules | |
| valid_from | DATE | NOT NULL | |
| valid_until | DATE | NULL | NULL = indefinite |
| assigned_by | UUID | NOT NULL FK users | |

**Indexes:** `(user_id, valid_from)`, `(company_id, schedule_id)`

---

# SECTION 7 — WORKFORCE

---

## 7.1 departments

**Purpose:** Organizational units within a company.
**RLS:** Pattern A

| Column | Type | Nullable | Description |
|--------|------|----------|-------------|
| id | UUID | NOT NULL | |
| company_id | UUID | NOT NULL FK companies | |
| name | VARCHAR(255) | NOT NULL | |
| code | VARCHAR(50) | NULL | Internal department code |
| parent_department_id | UUID | NULL FK departments | For nested departments |
| head_user_id | UUID | NULL FK users | Department head |
| description | TEXT | NULL | |
| cost_center_code | VARCHAR(50) | NULL | Finance cost center |
| is_active | BOOLEAN | NOT NULL DEFAULT true | |

**Indexes:** `(company_id, is_active)`, `(company_id, parent_department_id)`

---

## 7.2 positions

**Purpose:** Job positions/titles within a company.
**RLS:** Pattern A

| Column | Type | Nullable | Description |
|--------|------|----------|-------------|
| id | UUID | NOT NULL | |
| company_id | UUID | NOT NULL FK companies | |
| title | VARCHAR(255) | NOT NULL | |
| department_id | UUID | NULL FK departments | |
| level | VARCHAR(50) | NULL | e.g., 'Junior', 'Senior', 'Lead' |
| employment_type | ENUM('FULL_TIME','PART_TIME','CONTRACT','INTERN') | NOT NULL DEFAULT 'FULL_TIME' | |
| salary_band_min | NUMERIC(19,4) | NULL | |
| salary_band_max | NUMERIC(19,4) | NULL | |
| salary_currency | CHAR(3) | NOT NULL DEFAULT 'RON' | |
| headcount_planned | INT | NOT NULL DEFAULT 1 | |
| headcount_actual | INT | NOT NULL DEFAULT 0 | Maintained by trigger/job |
| is_active | BOOLEAN | NOT NULL DEFAULT true | |

**Indexes:** `(company_id, department_id)`, `(company_id, is_active)`

---

## 7.3 teams

**Purpose:** Operational teams within departments or projects.
**RLS:** Pattern A

| Column | Type | Nullable | Description |
|--------|------|----------|-------------|
| id | UUID | NOT NULL | |
| company_id | UUID | NOT NULL FK companies | |
| name | VARCHAR(255) | NOT NULL | |
| department_id | UUID | NULL FK departments | |
| team_lead_id | UUID | NULL FK users | |
| type | ENUM('PROJECT','DEPARTMENT','CROSS_FUNCTIONAL','TEMPORARY') | NOT NULL DEFAULT 'DEPARTMENT' | |
| is_active | BOOLEAN | NOT NULL DEFAULT true | |

**Indexes:** `(company_id, is_active)`, `(company_id, department_id)`

---

## 7.4 team_members

**Purpose:** User membership in teams.
**RLS:** Pattern A

| Column | Type | Nullable | Description |
|--------|------|----------|-------------|
| id | UUID | NOT NULL | |
| company_id | UUID | NOT NULL FK companies | |
| team_id | UUID | NOT NULL FK teams | |
| user_id | UUID | NOT NULL FK users | |
| joined_at | TIMESTAMPTZ | NOT NULL | |
| left_at | TIMESTAMPTZ | NULL | |
| role_in_team | VARCHAR(100) | NULL | e.g., 'lead', 'member', 'observer' |

**Indexes:** `(team_id, user_id)` UNIQUE where left_at IS NULL, `(user_id, left_at)`

---

# SECTION 8 — HR

---

## 8.1 employees

**Purpose:** Formal employment records — extends user + membership with HR-specific data.
**RLS:** Pattern A — HR role; workers see own record; managers see team

| Column | Type | Nullable | Description |
|--------|------|----------|-------------|
| id | UUID | NOT NULL | |
| company_id | UUID | NOT NULL FK companies | |
| user_id | UUID | NOT NULL UNIQUE FK users | One HR record per user |
| position_id | UUID | NULL FK positions | |
| department_id | UUID | NULL FK departments | |
| team_id | UUID | NULL FK teams | |
| manager_id | UUID | NULL FK users | Direct manager |
| employee_number | VARCHAR(50) | NOT NULL | Auto-generated |
| employment_type | ENUM('FULL_TIME','PART_TIME','CONTRACT','INTERN','SUBCONTRACTOR') | NOT NULL | |
| employment_status | ENUM('ACTIVE','ON_LEAVE','NOTICE_PERIOD','TERMINATED') | NOT NULL DEFAULT 'ACTIVE' | |
| hire_date | DATE | NOT NULL | |
| probation_end_date | DATE | NULL | |
| notice_period_days | INT | NOT NULL DEFAULT 30 | |
| termination_date | DATE | NULL | |
| termination_reason | TEXT | NULL | |
| gross_salary | NUMERIC(19,4) | NULL | Encrypted at application layer |
| salary_currency | CHAR(3) | NOT NULL DEFAULT 'RON' | |
| payment_frequency | ENUM('MONTHLY','BI_WEEKLY','WEEKLY') | NOT NULL DEFAULT 'MONTHLY' | |
| annual_leave_days | NUMERIC(4,1) | NOT NULL DEFAULT 20 | |
| leave_balance | JSONB | NOT NULL DEFAULT '{}' | Current balances per leave type |

**Indexes:** `(company_id, employment_status)`, `(company_id, department_id)`, `employee_number`

---

## 8.2 employee_contracts

**Purpose:** Employment contracts and amendments.
**RLS:** Pattern A — HR and employee (own only)

| Column | Type | Nullable | Description |
|--------|------|----------|-------------|
| id | UUID | NOT NULL | |
| company_id | UUID | NOT NULL FK companies | |
| employee_id | UUID | NOT NULL FK employees | |
| contract_type | ENUM('PERMANENT','FIXED_TERM','PROJECT','INTERNSHIP') | NOT NULL | |
| start_date | DATE | NOT NULL | |
| end_date | DATE | NULL | NULL for permanent |
| gross_salary | NUMERIC(19,4) | NOT NULL | Encrypted |
| salary_currency | CHAR(3) | NOT NULL | |
| working_hours_per_week | NUMERIC(4,2) | NOT NULL DEFAULT 40 | |
| document_id | UUID | NULL FK documents | Signed contract document |
| status | ENUM('DRAFT','ACTIVE','EXPIRED','TERMINATED') | NOT NULL DEFAULT 'DRAFT' | |
| signed_by_employee_at | TIMESTAMPTZ | NULL | |
| signed_by_company_at | TIMESTAMPTZ | NULL | |

**Indexes:** `(employee_id, status)`, `(company_id, status, end_date)`

---

## 8.3 performance_reviews

**Purpose:** Formal employee performance evaluation records.
**RLS:** Pattern A — HR role, reviewer, reviewee (own only)

| Column | Type | Nullable | Description |
|--------|------|----------|-------------|
| id | UUID | NOT NULL | |
| company_id | UUID | NOT NULL FK companies | |
| employee_id | UUID | NOT NULL FK employees | |
| reviewer_id | UUID | NOT NULL FK users | Manager/HR conducting review |
| review_period_start | DATE | NOT NULL | |
| review_period_end | DATE | NOT NULL | |
| type | ENUM('PROBATION','ANNUAL','SEMI_ANNUAL','QUARTERLY','PROJECT') | NOT NULL | |
| status | ENUM('DRAFT','SELF_REVIEW','MANAGER_REVIEW','COMPLETED') | NOT NULL DEFAULT 'DRAFT' | |
| self_assessment | JSONB | NULL | Employee's self-evaluation |
| manager_assessment | JSONB | NULL | Manager's evaluation |
| overall_rating | SMALLINT | NULL | 1–5 |
| strengths | TEXT | NULL | |
| improvements | TEXT | NULL | |
| goals_next_period | JSONB | NULL | |
| completed_at | TIMESTAMPTZ | NULL | |

**Indexes:** `(employee_id, type)`, `(company_id, status)`, `review_period_end`

---

## 8.4 payroll_runs

**Purpose:** Monthly payroll processing runs.
**RLS:** Pattern A — Finance and HR roles only

| Column | Type | Nullable | Description |
|--------|------|----------|-------------|
| id | UUID | NOT NULL | |
| company_id | UUID | NOT NULL FK companies | |
| period_start | DATE | NOT NULL | |
| period_end | DATE | NOT NULL | |
| currency | CHAR(3) | NOT NULL | |
| total_gross | NUMERIC(19,4) | NOT NULL DEFAULT 0 | |
| total_tax | NUMERIC(19,4) | NOT NULL DEFAULT 0 | |
| total_net | NUMERIC(19,4) | NOT NULL DEFAULT 0 | |
| employee_count | INT | NOT NULL DEFAULT 0 | |
| status | ENUM('DRAFT','CALCULATING','REVIEW','APPROVED','PAID','CANCELLED') | NOT NULL DEFAULT 'DRAFT' | |
| approved_by | UUID | NULL FK users | |
| approved_at | TIMESTAMPTZ | NULL | |
| payment_date | DATE | NULL | |
| notes | TEXT | NULL | |

**Indexes:** `(company_id, status)`, `(company_id, period_start)`

---

## 8.5 payroll_items

**Purpose:** Individual payroll entries per employee per run.
**RLS:** Pattern A — Finance/HR; employees see own

| Column | Type | Nullable | Description |
|--------|------|----------|-------------|
| id | UUID | NOT NULL | |
| company_id | UUID | NOT NULL FK companies | |
| payroll_run_id | UUID | NOT NULL FK payroll_runs | |
| employee_id | UUID | NOT NULL FK employees | |
| gross_salary | NUMERIC(19,4) | NOT NULL | |
| overtime_amount | NUMERIC(19,4) | NOT NULL DEFAULT 0 | |
| bonus_amount | NUMERIC(19,4) | NOT NULL DEFAULT 0 | |
| deductions | JSONB | NOT NULL DEFAULT '[]' | Tax, pension, etc. |
| total_deductions | NUMERIC(19,4) | NOT NULL DEFAULT 0 | |
| net_salary | NUMERIC(19,4) | NOT NULL | |
| currency | CHAR(3) | NOT NULL | |
| bank_iban | VARCHAR(50) | NOT NULL | Encrypted — from employee record |
| payment_status | ENUM('PENDING','PAID','FAILED') | NOT NULL DEFAULT 'PENDING' | |
| paid_at | TIMESTAMPTZ | NULL | |
| payslip_document_id | UUID | NULL FK documents | |

**Indexes:** `(payroll_run_id, employee_id)` UNIQUE, `(employee_id, payment_status)`

---

*End of Part 1 — Continues in DATABASE_BLUEPRINT_PART2.md*
*Part 2 covers: Renovation Services · Shop · CRM · Finance · Documents · Communication · Supplier Management · Procurement · Tools & Fleet*
*Part 3 covers: Notifications · Analytics · AI · Audit Logs · Webhooks/API · Knowledge Base · Learning Center · Safety · System*
