# PRV DATABASE ARCHITECTURE
# Pasul 7 — Complete Database Blueprint · Source of Truth

**Version**: 1.0  
**Status**: Official Blueprint  
**Scope**: All 18 Platforms · All 18 Roles · Enterprise Scale  
**Depends on**: ROLE_ARCHITECTURE.md · SECURITY_ARCHITECTURE.md · DASHBOARD_ARCHITECTURE.md · CLAUDE.md

---

## TABLE OF CONTENTS

1. [Database Philosophy & Design Principles](#1-database-philosophy--design-principles)
2. [Entity Architecture](#2-entity-architecture)
3. [Relationship Architecture](#3-relationship-architecture)
4. [Multi-Company Model](#4-multi-company-model)
5. [Permission Model](#5-permission-model)
6. [Notification Data Model](#6-notification-data-model)
7. [Analytics Data Model](#7-analytics-data-model)
8. [AI Data Model](#8-ai-data-model)
9. [Audit Data Model](#9-audit-data-model)
10. [Security Data Model](#10-security-data-model)
11. [Future Expansion Model](#11-future-expansion-model)
12. [Entity Catalog & Summary](#12-entity-catalog--summary)

---

## 1. DATABASE PHILOSOPHY & DESIGN PRINCIPLES

### 1.1 Core Principles

**Single Source of Truth** — Every piece of data lives in exactly one place. No denormalized copies, no shadow tables, no duplicated columns for convenience. When data must appear in multiple contexts, it is referenced — never copied.

**Everything Connected** — No entity exists in isolation. Every record is traceable to: who created it, which company owns it, which role can access it, what happened to it over its lifetime.

**Every Object Must Support**:
- **Ownership** — `company_id`, `created_by`, `owner_id` on every entity
- **Permissions** — every record linked to the permission model
- **Audit Logs** — every write operation produces an audit entry
- **Notifications** — every significant event produces a notification
- **Analytics** — every entity class feeds the analytics pipeline
- **AI** — every entity class is indexable and queryable by the AI platform

### 1.2 Universal Column Contract

Every table in the PRV database carries these columns without exception:

| Column | Type | Description |
|--------|------|-------------|
| `id` | UUID | Primary key, globally unique, non-sequential |
| `company_id` | UUID → companies | Tenant isolation key. NULL only for global platform tables |
| `created_at` | TIMESTAMPTZ | Creation timestamp (UTC) |
| `updated_at` | TIMESTAMPTZ | Last modification timestamp (UTC), auto-updated |
| `created_by` | UUID → users | User who created the record |
| `updated_by` | UUID → users | User who last modified the record |
| `deleted_at` | TIMESTAMPTZ | Soft delete timestamp. NULL = active |
| `deleted_by` | UUID → users | User who soft-deleted the record |

**Soft Delete Policy**: No record is ever hard-deleted except by explicit data retention policy execution. All queries filter `deleted_at IS NULL` by default (enforced at ORM layer, not application layer).

**UUID Policy**: All IDs are UUID v4. Sequential integers are never used as primary keys (prevents enumeration attacks, allows horizontal sharding).

### 1.3 Multi-Tenancy Strategy

PRV uses **Row-Level Multi-Tenancy**: all companies share the same database schema, with `company_id` enforcing isolation on every row.

**Enforcement Layers**:
1. **ORM Layer**: Every query builder automatically injects `WHERE company_id = :session_company_id`
2. **Row-Level Security** (PostgreSQL RLS): Database-enforced policy as a second line
3. **Audit Verification**: Post-query audit checks detect cross-company data leaks

**Global Tables** (no `company_id`, platform-level):
- `platform_config`
- `feature_flags`
- `platform_modules`
- `countries`
- `currencies`
- `timezones`

### 1.4 Naming Conventions

| Convention | Example |
|-----------|---------|
| Tables: plural snake_case | `project_phases`, `audit_logs` |
| Foreign keys: `{entity}_id` | `project_id`, `user_id` |
| Boolean flags: `is_{state}` | `is_active`, `is_archived` |
| Timestamps: `{action}_at` | `approved_at`, `sent_at` |
| Actor columns: `{action}_by` | `approved_by`, `assigned_by` |
| Enum columns: noun | `status`, `type`, `level` |
| JSON columns: `{noun}_data` | `metadata`, `settings_data` |

### 1.5 Indexing Strategy

| Index Type | When Applied |
|-----------|-------------|
| Primary (UUID) | Always, on `id` |
| Compound (company + entity) | `(company_id, {entity_id})` on all FK references |
| Compound (company + status) | `(company_id, status)` on all status-filtered queries |
| Compound (company + time) | `(company_id, created_at DESC)` on all timeline views |
| Partial (active records) | `WHERE deleted_at IS NULL` on high-volume tables |
| Full-text | On `name`, `description`, `content` for search |
| JSONB GIN | On `metadata`, `settings_data` for flexible queries |

---

## 2. ENTITY ARCHITECTURE

### 2.1 FOUNDATION LAYER — Organizational Hierarchy

#### `groups` — PRV Group (Top Level)
```
groups
├── id: UUID — Primary key
├── name: VARCHAR(255) — "PRV Group"
├── slug: VARCHAR(100) — URL-safe identifier, unique
├── logo_file_id: UUID → file_objects
├── settings_data: JSONB — Group-level configuration
├── is_active: BOOLEAN
└── [Universal Columns]
```
*Note: groups has no `company_id` — it IS the root.*

#### `companies` — Company Entities
```
companies
├── id: UUID
├── group_id: UUID → groups
├── name: VARCHAR(255) — "PRV Renovations"
├── slug: VARCHAR(100) — unique within group
├── legal_name: VARCHAR(500) — Official legal name
├── tax_id: VARCHAR(100) — Tax registration number
├── registration_number: VARCHAR(100)
├── type: ENUM(renovation, projects, shop, services, holding, other)
├── status: ENUM(active, suspended, archived, onboarding)
├── logo_file_id: UUID → file_objects
├── country_code: CHAR(2) — ISO country
├── currency_code: CHAR(3) — ISO currency
├── timezone: VARCHAR(100)
├── address_data: JSONB — {street, city, state, postal_code, country}
├── contact_data: JSONB — {phone, email, website}
├── settings_data: JSONB — Company-level configuration overrides
├── onboarded_at: TIMESTAMPTZ
├── subscription_plan: ENUM(starter, growth, enterprise, custom)
├── subscription_expires_at: TIMESTAMPTZ
└── [Universal Columns — company_id references self.id]
```

#### `divisions` — Company Divisions
```
divisions
├── id: UUID
├── company_id: UUID → companies
├── name: VARCHAR(255)
├── code: VARCHAR(20) — Short code (e.g., "DIV-001")
├── description: TEXT
├── parent_division_id: UUID → divisions — Self-referential (nested divisions)
├── manager_id: UUID → users
├── is_active: BOOLEAN
└── [Universal Columns]
```

#### `departments` — Departments within Divisions
```
departments
├── id: UUID
├── company_id: UUID → companies
├── division_id: UUID → divisions
├── name: VARCHAR(255)
├── code: VARCHAR(20)
├── description: TEXT
├── manager_id: UUID → users
├── cost_center_code: VARCHAR(50) — For Finance integration
├── budget_limit: DECIMAL(15,2)
├── is_active: BOOLEAN
└── [Universal Columns]
```

#### `teams` — Operational Teams
```
teams
├── id: UUID
├── company_id: UUID → companies
├── department_id: UUID → departments — Nullable (teams can be cross-dept)
├── name: VARCHAR(255)
├── code: VARCHAR(20)
├── type: ENUM(renovation, project, sales, support, admin, custom)
├── leader_id: UUID → users
├── description: TEXT
├── capacity: INTEGER — Max team members
├── is_active: BOOLEAN
├── metadata: JSONB — Team-specific attributes
└── [Universal Columns]
```

#### `locations` — Physical Locations (Stores, Sites, Warehouses, Offices)
```
locations
├── id: UUID
├── company_id: UUID → companies
├── name: VARCHAR(255)
├── code: VARCHAR(50)
├── type: ENUM(store, warehouse, office, site, depot, external)
├── status: ENUM(active, inactive, under_construction, closed)
├── address_data: JSONB — Full address
├── coordinates: POINT — Latitude/longitude (for mapping)
├── region_id: UUID → regions
├── manager_id: UUID → users
├── phone: VARCHAR(50)
├── email: VARCHAR(255)
├── timezone: VARCHAR(100)
├── operating_hours: JSONB — {mon: {open, close}, ...}
├── metadata: JSONB
└── [Universal Columns]
```

#### `regions` — Geographic Groupings of Locations
```
regions
├── id: UUID
├── company_id: UUID → companies
├── name: VARCHAR(255)
├── code: VARCHAR(20)
├── manager_id: UUID → users
└── [Universal Columns]
```

---

### 2.2 IDENTITY LAYER — Users & Profiles

#### `users` — Core User Identity
```
users
├── id: UUID
├── company_id: UUID → companies — Primary company
├── email: VARCHAR(255) — Unique globally (not per company)
├── phone: VARCHAR(50)
├── phone_verified_at: TIMESTAMPTZ
├── email_verified_at: TIMESTAMPTZ
├── status: ENUM(active, inactive, suspended, invited, pending_setup)
├── invitation_token: VARCHAR(255) — One-time invite token
├── invitation_expires_at: TIMESTAMPTZ
├── invited_by: UUID → users
├── last_login_at: TIMESTAMPTZ
├── last_active_at: TIMESTAMPTZ
├── login_count: INTEGER
├── locale: VARCHAR(10) — "ro-RO", "en-GB"
├── timezone: VARCHAR(100)
└── [Universal Columns]
```
*Note: email is globally unique — one email = one user identity, regardless of how many companies they work for.*

#### `user_profiles` — Personal Information (GDPR-separated)
```
user_profiles
├── id: UUID
├── user_id: UUID → users (1:1)
├── company_id: UUID → companies
├── first_name: VARCHAR(100)
├── last_name: VARCHAR(100)
├── display_name: VARCHAR(200)
├── avatar_file_id: UUID → file_objects
├── date_of_birth: DATE — Encrypted at rest
├── gender: ENUM(male, female, other, not_specified)
├── nationality: CHAR(2)
├── personal_id_number: VARCHAR(50) — Encrypted at rest
├── address_data: JSONB — Encrypted at rest
├── emergency_contact_data: JSONB — Encrypted at rest
├── bio: TEXT
├── skills: TEXT[] — Array of skill tags
├── certifications: JSONB — [{name, issued_by, issued_at, expires_at, file_id}]
└── [Universal Columns]
```

#### `user_company_memberships` — User's Access Across Companies
```
user_company_memberships
├── id: UUID
├── user_id: UUID → users
├── company_id: UUID → companies
├── status: ENUM(active, suspended, terminated, on_leave)
├── employee_number: VARCHAR(50) — Company-specific employee ID
├── job_title: VARCHAR(200)
├── department_id: UUID → departments
├── team_id: UUID → teams
├── employment_type: ENUM(full_time, part_time, contractor, intern, freelance)
├── start_date: DATE
├── end_date: DATE — Nullable
├── contract_file_id: UUID → file_objects
├── salary_data: JSONB — Encrypted at rest {amount, currency, frequency}
├── manager_id: UUID → users
└── [Universal Columns]
```

#### `user_team_memberships` — Team Assignments
```
user_team_memberships
├── id: UUID
├── company_id: UUID → companies
├── user_id: UUID → users
├── team_id: UUID → teams
├── role_in_team: ENUM(member, leader, deputy_leader)
├── assigned_at: TIMESTAMPTZ
├── assigned_by: UUID → users
├── expires_at: TIMESTAMPTZ — Nullable (temporary assignments)
└── [Universal Columns]
```

---

### 2.3 ROLE & PERMISSION LAYER

#### `roles` — Role Definitions
```
roles
├── id: UUID
├── company_id: UUID → companies — Nullable for global/platform roles
├── name: VARCHAR(100) — "OMS", "Team Leader"
├── slug: VARCHAR(100) — "oms", "team_leader"
├── description: TEXT
├── type: ENUM(global, company, custom)
├── level: INTEGER — Hierarchy level (1=Superadmin, 10=Worker)
├── parent_role_id: UUID → roles — For inheritance
├── is_system: BOOLEAN — System roles cannot be deleted
├── color: VARCHAR(7) — UI color for role badge
├── icon: VARCHAR(100) — SF Symbol name
└── [Universal Columns]
```

#### `permissions` — Permission Definitions
```
permissions
├── id: UUID
├── module: VARCHAR(100) — "projects", "finance", "shop"
├── resource: VARCHAR(100) — "task", "invoice", "order"
├── action: ENUM(create, read, update, delete, approve, export, import, admin)
├── slug: VARCHAR(200) — "projects.task.create"
├── description: TEXT
├── security_level: ENUM(L1, L2, L3, L4, L5)
├── requires_mfa: BOOLEAN
└── [Universal Columns — no company_id, permissions are platform-defined]
```

#### `role_permissions` — Role → Permission Assignments
```
role_permissions
├── id: UUID
├── role_id: UUID → roles
├── permission_id: UUID → permissions
├── is_granted: BOOLEAN — Can be explicitly denied (false) for inheritance overrides
├── conditions: JSONB — Optional conditions: {max_amount, own_records_only, ...}
└── [Universal Columns]
```

#### `user_role_assignments` — User → Role in Scope
```
user_role_assignments
├── id: UUID
├── company_id: UUID → companies
├── user_id: UUID → users
├── role_id: UUID → roles
├── scope_type: ENUM(global, company, division, department, team, location, project)
├── scope_id: UUID — ID of the scoped entity (nullable for global/company scope)
├── is_primary: BOOLEAN — User's primary role for dashboard/nav
├── assigned_at: TIMESTAMPTZ
├── assigned_by: UUID → users
├── expires_at: TIMESTAMPTZ — Nullable; used for temporary project access
├── revoked_at: TIMESTAMPTZ
├── revoked_by: UUID → users
├── revocation_reason: TEXT
└── [Universal Columns]
```

#### `permission_overrides` — Per-User Permission Exceptions
```
permission_overrides
├── id: UUID
├── company_id: UUID → companies
├── user_id: UUID → users
├── permission_id: UUID → permissions
├── is_granted: BOOLEAN — Grant or deny above/below role default
├── scope_type: ENUM(same as user_role_assignments)
├── scope_id: UUID
├── reason: TEXT — Required justification for override
├── approved_by: UUID → users
├── expires_at: TIMESTAMPTZ — All overrides must expire
└── [Universal Columns]
```

---

### 2.4 PROJECT MODULE

#### `projects`
```
projects
├── id: UUID
├── company_id: UUID → companies
├── name: VARCHAR(500)
├── code: VARCHAR(50) — Unique per company: "PRJ-2026-001"
├── description: TEXT
├── type: ENUM(renovation, construction, maintenance, custom)
├── status: ENUM(draft, active, on_hold, delayed, completed, cancelled, archived)
├── priority: ENUM(low, medium, high, critical)
├── location_id: UUID → locations — Work site
├── client_id: UUID → customers
├── director_id: UUID → users — Project Director
├── project_opm_id: UUID → users — Project OMS
├── start_date: DATE
├── planned_end_date: DATE
├── actual_end_date: DATE
├── budget_total: DECIMAL(15,2)
├── budget_currency: CHAR(3)
├── contract_value: DECIMAL(15,2)
├── cost_to_date: DECIMAL(15,2) — Computed, refreshed async
├── address_data: JSONB — Project site address (may differ from location)
├── coordinates: POINT
├── health_score: SMALLINT — 0–100, computed by Health Engine
├── is_billable: BOOLEAN
├── metadata: JSONB
└── [Universal Columns]
```

#### `project_phases`
```
project_phases
├── id: UUID
├── company_id: UUID → companies
├── project_id: UUID → projects
├── name: VARCHAR(255)
├── description: TEXT
├── order_index: SMALLINT — Display order
├── status: ENUM(pending, active, completed, skipped)
├── start_date: DATE
├── planned_end_date: DATE
├── actual_end_date: DATE
├── budget_allocated: DECIMAL(15,2)
└── [Universal Columns]
```

#### `milestones`
```
milestones
├── id: UUID
├── company_id: UUID → companies
├── project_id: UUID → projects
├── phase_id: UUID → project_phases
├── name: VARCHAR(500)
├── description: TEXT
├── status: ENUM(pending, in_progress, completed, overdue, cancelled)
├── due_date: DATE
├── completed_at: TIMESTAMPTZ
├── completed_by: UUID → users
├── is_client_visible: BOOLEAN
├── is_critical_path: BOOLEAN
├── dependencies: UUID[] — Array of milestone IDs this depends on
└── [Universal Columns]
```

#### `tasks`
```
tasks
├── id: UUID
├── company_id: UUID → companies
├── project_id: UUID → projects
├── phase_id: UUID → project_phases
├── milestone_id: UUID → milestones — Nullable
├── parent_task_id: UUID → tasks — Nullable (for subtasks)
├── title: VARCHAR(500)
├── description: TEXT
├── type: ENUM(task, subtask, checklist_item, issue, bug, request)
├── status: ENUM(backlog, todo, in_progress, blocked, review, done, cancelled)
├── priority: ENUM(low, medium, high, critical)
├── assigned_to: UUID → users
├── assigned_team_id: UUID → teams
├── reporter_id: UUID → users
├── due_date: DATE
├── estimated_hours: DECIMAL(6,2)
├── actual_hours: DECIMAL(6,2) — Computed from time_entries
├── completion_percentage: SMALLINT — 0–100
├── is_blocked: BOOLEAN
├── blocked_reason: TEXT
├── location_id: UUID → locations
├── tags: TEXT[]
├── metadata: JSONB
└── [Universal Columns]
```

#### `task_assignments` — Multiple assignees per task
```
task_assignments
├── id: UUID
├── company_id: UUID → companies
├── task_id: UUID → tasks
├── user_id: UUID → users
├── role: ENUM(primary, secondary, reviewer, observer)
├── assigned_at: TIMESTAMPTZ
├── assigned_by: UUID → users
└── [Universal Columns]
```

#### `time_entries` — Time tracked against tasks
```
time_entries
├── id: UUID
├── company_id: UUID → companies
├── task_id: UUID → tasks
├── project_id: UUID → projects
├── user_id: UUID → users
├── started_at: TIMESTAMPTZ
├── ended_at: TIMESTAMPTZ
├── duration_minutes: INTEGER — Computed: ended_at - started_at
├── description: TEXT
├── is_billable: BOOLEAN
├── approved_at: TIMESTAMPTZ
├── approved_by: UUID → users
└── [Universal Columns]
```

#### `project_team_assignments`
```
project_team_assignments
├── id: UUID
├── company_id: UUID → companies
├── project_id: UUID → projects
├── team_id: UUID → teams
├── role_on_project: ENUM(primary, support, subcontractor)
├── assigned_from: DATE
├── assigned_until: DATE
└── [Universal Columns]
```

#### `project_issues`
```
project_issues
├── id: UUID
├── company_id: UUID → companies
├── project_id: UUID → projects
├── reported_by: UUID → users
├── assigned_to: UUID → users
├── title: VARCHAR(500)
├── description: TEXT
├── type: ENUM(safety, quality, delay, material, workforce, design, other)
├── severity: ENUM(low, medium, high, critical)
├── status: ENUM(open, investigating, resolved, escalated, closed)
├── resolution: TEXT
├── resolved_at: TIMESTAMPTZ
├── resolved_by: UUID → users
└── [Universal Columns]
```

#### `project_journal_entries`
```
project_journal_entries
├── id: UUID
├── company_id: UUID → companies
├── project_id: UUID → projects
├── author_id: UUID → users
├── entry_date: DATE
├── content: TEXT
├── weather_conditions: VARCHAR(100)
├── workers_present: INTEGER
├── work_completed: TEXT
├── materials_used: JSONB — [{name, quantity, unit}]
├── issues_noted: TEXT
└── [Universal Columns]
```

---

### 2.5 ATTENDANCE MODULE

#### `shifts`
```
shifts
├── id: UUID
├── company_id: UUID → companies
├── name: VARCHAR(100) — "Morning", "Evening", "Night"
├── start_time: TIME
├── end_time: TIME
├── crosses_midnight: BOOLEAN
├── break_minutes: INTEGER
├── overtime_threshold_minutes: INTEGER
├── location_id: UUID → locations
└── [Universal Columns]
```

#### `schedules`
```
schedules
├── id: UUID
├── company_id: UUID → companies
├── name: VARCHAR(255)
├── type: ENUM(fixed, rotating, flexible)
├── team_id: UUID → teams
├── location_id: UUID → locations
├── effective_from: DATE
├── effective_until: DATE
├── rotation_cycle_days: INTEGER — For rotating schedules
├── schedule_data: JSONB — Day-by-day assignments
└── [Universal Columns]
```

#### `schedule_assignments` — User → Schedule → Shift
```
schedule_assignments
├── id: UUID
├── company_id: UUID → companies
├── user_id: UUID → users
├── schedule_id: UUID → schedules
├── shift_id: UUID → shifts
├── date: DATE
├── location_id: UUID → locations
├── assigned_by: UUID → users
└── [Universal Columns]
```

#### `attendance_entries`
```
attendance_entries
├── id: UUID
├── company_id: UUID → companies
├── user_id: UUID → users
├── date: DATE
├── schedule_assignment_id: UUID → schedule_assignments
├── shift_id: UUID → shifts
├── location_id: UUID → locations
├── check_in_at: TIMESTAMPTZ
├── check_in_method: ENUM(app, face_id, qr_code, nfc, manual, biometric)
├── check_in_coordinates: POINT — GPS at check-in
├── check_in_device_id: UUID → trusted_devices
├── check_in_photo_file_id: UUID → file_objects
├── check_out_at: TIMESTAMPTZ
├── check_out_method: ENUM(same options)
├── check_out_coordinates: POINT
├── check_out_device_id: UUID → trusted_devices
├── break_minutes: INTEGER — Actual break taken
├── regular_minutes: INTEGER — Computed: standard hours
├── overtime_minutes: INTEGER — Computed: beyond threshold
├── status: ENUM(present, absent, late, early_leave, half_day, on_leave)
├── is_approved: BOOLEAN
├── approved_by: UUID → users
├── approved_at: TIMESTAMPTZ
├── notes: TEXT
└── [Universal Columns]
```

#### `leave_types`
```
leave_types
├── id: UUID
├── company_id: UUID → companies
├── name: VARCHAR(100) — "Annual Leave", "Sick Leave", "Unpaid"
├── code: VARCHAR(20)
├── is_paid: BOOLEAN
├── annual_allowance_days: DECIMAL(5,1)
├── carry_over_days: DECIMAL(5,1)
├── requires_approval: BOOLEAN
├── min_notice_days: INTEGER
├── max_consecutive_days: INTEGER
└── [Universal Columns]
```

#### `leave_requests`
```
leave_requests
├── id: UUID
├── company_id: UUID → companies
├── user_id: UUID → users
├── leave_type_id: UUID → leave_types
├── start_date: DATE
├── end_date: DATE
├── total_days: DECIMAL(5,1)
├── reason: TEXT
├── status: ENUM(pending, approved, rejected, cancelled, recalled)
├── approved_by: UUID → users
├── approved_at: TIMESTAMPTZ
├── rejection_reason: TEXT
├── cover_person_id: UUID → users
└── [Universal Columns]
```

#### `overtime_records`
```
overtime_records
├── id: UUID
├── company_id: UUID → companies
├── user_id: UUID → users
├── attendance_entry_id: UUID → attendance_entries
├── date: DATE
├── overtime_minutes: INTEGER
├── reason: TEXT
├── type: ENUM(regular, weekend, holiday)
├── rate_multiplier: DECIMAL(4,2) — 1.5x, 2x
├── status: ENUM(pending, approved, rejected, compensated)
├── approved_by: UUID → users
└── [Universal Columns]
```

---

### 2.6 SHOP MODULE

#### `product_categories`
```
product_categories
├── id: UUID
├── company_id: UUID → companies
├── parent_id: UUID → product_categories — Nested categories
├── name: VARCHAR(255)
├── slug: VARCHAR(255)
├── description: TEXT
├── image_file_id: UUID → file_objects
├── order_index: SMALLINT
├── is_active: BOOLEAN
└── [Universal Columns]
```

#### `products`
```
products
├── id: UUID
├── company_id: UUID → companies
├── category_id: UUID → product_categories
├── supplier_id: UUID → suppliers
├── name: VARCHAR(500)
├── slug: VARCHAR(500)
├── sku: VARCHAR(100) — Unique per company
├── barcode: VARCHAR(100)
├── description: TEXT
├── short_description: TEXT
├── type: ENUM(physical, digital, service, bundle)
├── status: ENUM(active, draft, discontinued, out_of_stock, archived)
├── base_price: DECIMAL(12,4)
├── currency: CHAR(3)
├── cost_price: DECIMAL(12,4)
├── tax_rate: DECIMAL(5,4)
├── weight_kg: DECIMAL(8,3)
├── dimensions_data: JSONB — {length_cm, width_cm, height_cm}
├── is_sellable: BOOLEAN
├── is_purchasable: BOOLEAN
├── track_inventory: BOOLEAN
├── min_stock_level: DECIMAL(12,3)
├── reorder_point: DECIMAL(12,3)
├── attributes: JSONB — Flexible product attributes
├── seo_data: JSONB — {title, description, keywords}
└── [Universal Columns]
```

#### `product_variants`
```
product_variants
├── id: UUID
├── company_id: UUID → companies
├── product_id: UUID → products
├── name: VARCHAR(255) — "Red XL", "Blue M"
├── sku: VARCHAR(100) — Unique per company
├── barcode: VARCHAR(100)
├── price_override: DECIMAL(12,4) — Nullable; uses product.base_price if null
├── cost_price_override: DECIMAL(12,4)
├── attributes: JSONB — {color: "Red", size: "XL"}
├── is_active: BOOLEAN
└── [Universal Columns]
```

#### `inventory_items` — Stock per Location per Variant
```
inventory_items
├── id: UUID
├── company_id: UUID → companies
├── product_id: UUID → products
├── variant_id: UUID → product_variants — Nullable for non-variant products
├── location_id: UUID → locations
├── quantity_on_hand: DECIMAL(12,3)
├── quantity_reserved: DECIMAL(12,3) — Allocated to open orders
├── quantity_available: DECIMAL(12,3) — Computed: on_hand - reserved
├── quantity_incoming: DECIMAL(12,3) — On active POs
├── last_counted_at: TIMESTAMPTZ — Last physical count
├── last_counted_by: UUID → users
└── [Universal Columns]
```

#### `inventory_movements` — Every Stock Change
```
inventory_movements
├── id: UUID
├── company_id: UUID → companies
├── product_id: UUID → products
├── variant_id: UUID → product_variants
├── location_id: UUID → locations
├── type: ENUM(purchase, sale, return, transfer_in, transfer_out, adjustment, write_off, count)
├── quantity: DECIMAL(12,3) — Positive = increase, negative = decrease
├── unit_cost: DECIMAL(12,4)
├── reference_type: VARCHAR(50) — "order", "purchase_order", "transfer"
├── reference_id: UUID — ID of triggering record
├── notes: TEXT
└── [Universal Columns]
```

#### `suppliers`
```
suppliers
├── id: UUID
├── company_id: UUID → companies
├── name: VARCHAR(500)
├── code: VARCHAR(50)
├── type: ENUM(manufacturer, distributor, wholesaler, retailer, service)
├── status: ENUM(active, inactive, blacklisted, pending_approval)
├── tax_id: VARCHAR(100)
├── payment_terms_days: INTEGER
├── currency: CHAR(3)
├── address_data: JSONB
├── contact_data: JSONB
├── performance_score: DECIMAL(4,2) — 0.00–5.00, computed
├── on_time_delivery_rate: DECIMAL(5,4) — Computed
├── quality_score: DECIMAL(4,2) — Computed from reviews
└── [Universal Columns]
```

#### `purchase_orders`
```
purchase_orders
├── id: UUID
├── company_id: UUID → companies
├── supplier_id: UUID → suppliers
├── location_id: UUID → locations — Delivery destination
├── project_id: UUID → projects — Nullable (project-specific PO)
├── number: VARCHAR(50) — Unique per company: "PO-2026-0042"
├── status: ENUM(draft, pending_approval, approved, sent, partial, received, cancelled)
├── order_date: DATE
├── expected_delivery_date: DATE
├── actual_delivery_date: DATE
├── subtotal: DECIMAL(15,2)
├── tax_amount: DECIMAL(15,2)
├── total: DECIMAL(15,2)
├── currency: CHAR(3)
├── notes: TEXT
├── approved_by: UUID → users
├── approved_at: TIMESTAMPTZ
└── [Universal Columns]
```

#### `purchase_order_items`
```
purchase_order_items
├── id: UUID
├── company_id: UUID → companies
├── purchase_order_id: UUID → purchase_orders
├── product_id: UUID → products
├── variant_id: UUID → product_variants
├── quantity_ordered: DECIMAL(12,3)
├── quantity_received: DECIMAL(12,3)
├── unit_price: DECIMAL(12,4)
├── tax_rate: DECIMAL(5,4)
├── line_total: DECIMAL(15,2)
└── [Universal Columns]
```

#### `orders` — Customer Sales Orders
```
orders
├── id: UUID
├── company_id: UUID → companies
├── location_id: UUID → locations — Originating store
├── customer_id: UUID → customers — Nullable (guest orders)
├── cashier_id: UUID → users
├── number: VARCHAR(50) — "ORD-2026-00892"
├── channel: ENUM(pos, online, phone, app)
├── status: ENUM(pending, confirmed, processing, shipped, delivered, completed, cancelled, refunded)
├── subtotal: DECIMAL(15,2)
├── discount_amount: DECIMAL(15,2)
├── tax_amount: DECIMAL(15,2)
├── shipping_amount: DECIMAL(15,2)
├── total: DECIMAL(15,2)
├── currency: CHAR(3)
├── payment_status: ENUM(pending, partial, paid, refunded, failed)
├── payment_method: ENUM(cash, card, bank_transfer, online, mixed)
├── shipping_address_data: JSONB
├── notes: TEXT
├── fulfilled_at: TIMESTAMPTZ
├── cancelled_at: TIMESTAMPTZ
├── cancellation_reason: TEXT
├── coupon_id: UUID → coupons
└── [Universal Columns]
```

#### `order_items`
```
order_items
├── id: UUID
├── company_id: UUID → companies
├── order_id: UUID → orders
├── product_id: UUID → products
├── variant_id: UUID → product_variants
├── quantity: DECIMAL(12,3)
├── unit_price: DECIMAL(12,4)
├── discount_amount: DECIMAL(12,4)
├── tax_rate: DECIMAL(5,4)
├── line_total: DECIMAL(15,2)
└── [Universal Columns]
```

#### `order_returns`
```
order_returns
├── id: UUID
├── company_id: UUID → companies
├── order_id: UUID → orders
├── processed_by: UUID → users
├── number: VARCHAR(50)
├── status: ENUM(requested, approved, received, refunded, rejected)
├── reason: ENUM(defective, wrong_item, not_needed, damaged, other)
├── notes: TEXT
├── refund_amount: DECIMAL(15,2)
├── refund_method: ENUM(original, store_credit, cash, bank)
├── approved_by: UUID → users
└── [Universal Columns]
```

#### `promotions`
```
promotions
├── id: UUID
├── company_id: UUID → companies
├── name: VARCHAR(255)
├── type: ENUM(percentage, fixed_amount, buy_x_get_y, free_shipping, bundle)
├── status: ENUM(draft, active, paused, expired)
├── discount_value: DECIMAL(10,4)
├── min_order_value: DECIMAL(12,2)
├── max_discount_amount: DECIMAL(12,2)
├── applicable_to: ENUM(all, category, product, customer_segment)
├── applicable_ids: UUID[] — Category/product/segment IDs
├── location_ids: UUID[] — Store restrictions (empty = all stores)
├── starts_at: TIMESTAMPTZ
├── ends_at: TIMESTAMPTZ
├── usage_limit: INTEGER — Null = unlimited
├── usage_count: INTEGER — Computed
└── [Universal Columns]
```

---

### 2.7 CRM MODULE

#### `customers`
```
customers
├── id: UUID
├── company_id: UUID → companies
├── user_id: UUID → users — Nullable (link to app user account)
├── type: ENUM(individual, business)
├── status: ENUM(lead, prospect, active, inactive, churned, vip)
├── first_name: VARCHAR(100)
├── last_name: VARCHAR(100)
├── company_name: VARCHAR(500)
├── email: VARCHAR(255)
├── phone: VARCHAR(50)
├── address_data: JSONB
├── tax_id: VARCHAR(100)
├── source: ENUM(organic, referral, advertising, shop, event, other)
├── assigned_to: UUID → users — Account owner
├── lifetime_value: DECIMAL(15,2) — Computed
├── total_orders: INTEGER — Computed
├── average_order_value: DECIMAL(12,2) — Computed
├── last_order_at: TIMESTAMPTZ
├── nps_score: SMALLINT — -100 to 100
├── tags: TEXT[]
├── notes: TEXT
├── metadata: JSONB
└── [Universal Columns]
```

#### `leads`
```
leads
├── id: UUID
├── company_id: UUID → companies
├── assigned_to: UUID → users
├── converted_to_customer_id: UUID → customers
├── first_name: VARCHAR(100)
├── last_name: VARCHAR(100)
├── company_name: VARCHAR(500)
├── email: VARCHAR(255)
├── phone: VARCHAR(50)
├── source: ENUM(website, referral, social, advertising, cold_call, event, other)
├── status: ENUM(new, contacted, qualified, proposal_sent, negotiating, won, lost, dormant)
├── interest: TEXT
├── estimated_value: DECIMAL(15,2)
├── probability: SMALLINT — 0–100 %
├── expected_close_date: DATE
├── lost_reason: TEXT
├── converted_at: TIMESTAMPTZ
└── [Universal Columns]
```

#### `quotes`
```
quotes
├── id: UUID
├── company_id: UUID → companies
├── customer_id: UUID → customers
├── lead_id: UUID → leads — Nullable
├── project_id: UUID → projects — Nullable
├── number: VARCHAR(50) — "QT-2026-0021"
├── status: ENUM(draft, sent, viewed, accepted, rejected, expired, converted)
├── valid_until: DATE
├── subtotal: DECIMAL(15,2)
├── discount_amount: DECIMAL(15,2)
├── tax_amount: DECIMAL(15,2)
├── total: DECIMAL(15,2)
├── currency: CHAR(3)
├── terms: TEXT
├── notes: TEXT
├── sent_at: TIMESTAMPTZ
├── viewed_at: TIMESTAMPTZ
├── accepted_at: TIMESTAMPTZ
├── converted_to_order_id: UUID → orders
└── [Universal Columns]
```

#### `quote_items`
```
quote_items
├── id: UUID
├── company_id: UUID → companies
├── quote_id: UUID → quotes
├── product_id: UUID → products — Nullable (free-form line items allowed)
├── description: VARCHAR(500)
├── quantity: DECIMAL(12,3)
├── unit_price: DECIMAL(12,4)
├── discount_percent: DECIMAL(5,2)
├── tax_rate: DECIMAL(5,4)
├── line_total: DECIMAL(15,2)
└── [Universal Columns]
```

#### `customer_activities`
```
customer_activities
├── id: UUID
├── company_id: UUID → companies
├── customer_id: UUID → customers
├── lead_id: UUID → leads
├── user_id: UUID → users — Who logged the activity
├── type: ENUM(call, email, meeting, note, site_visit, demo, proposal)
├── direction: ENUM(inbound, outbound)
├── subject: VARCHAR(500)
├── notes: TEXT
├── outcome: TEXT
├── scheduled_at: TIMESTAMPTZ
├── completed_at: TIMESTAMPTZ
└── [Universal Columns]
```

#### `customer_segments`
```
customer_segments
├── id: UUID
├── company_id: UUID → companies
├── name: VARCHAR(255)
├── description: TEXT
├── type: ENUM(manual, dynamic)
├── criteria: JSONB — For dynamic segments: {min_ltv, min_orders, tags, ...}
├── member_count: INTEGER — Computed, refreshed async
└── [Universal Columns]
```

---

### 2.8 FINANCE MODULE

#### `invoices`
```
invoices
├── id: UUID
├── company_id: UUID → companies
├── customer_id: UUID → customers
├── project_id: UUID → projects — Nullable
├── order_id: UUID → orders — Nullable
├── number: VARCHAR(50) — "INV-2026-00312"
├── type: ENUM(invoice, proforma, credit_note, debit_note)
├── status: ENUM(draft, sent, viewed, partial, paid, overdue, cancelled, written_off)
├── issue_date: DATE
├── due_date: DATE
├── subtotal: DECIMAL(15,2)
├── discount_amount: DECIMAL(15,2)
├── tax_amount: DECIMAL(15,2)
├── total: DECIMAL(15,2)
├── paid_amount: DECIMAL(15,2) — Computed from payments
├── outstanding_amount: DECIMAL(15,2) — Computed: total - paid_amount
├── currency: CHAR(3)
├── exchange_rate: DECIMAL(12,6)
├── payment_terms: VARCHAR(100)
├── bank_account_data: JSONB
├── notes: TEXT
├── sent_at: TIMESTAMPTZ
├── paid_at: TIMESTAMPTZ
└── [Universal Columns]
```

#### `payments`
```
payments
├── id: UUID
├── company_id: UUID → companies
├── invoice_id: UUID → invoices
├── order_id: UUID → orders
├── customer_id: UUID → customers
├── amount: DECIMAL(15,2)
├── currency: CHAR(3)
├── method: ENUM(cash, bank_transfer, card, online, check, other)
├── status: ENUM(pending, processing, completed, failed, refunded, disputed)
├── reference: VARCHAR(255) — Bank/payment reference
├── paid_at: TIMESTAMPTZ
├── notes: TEXT
├── reconciled_at: TIMESTAMPTZ
├── reconciled_by: UUID → users
└── [Universal Columns]
```

#### `expenses`
```
expenses
├── id: UUID
├── company_id: UUID → companies
├── submitted_by: UUID → users
├── department_id: UUID → departments
├── project_id: UUID → projects — Nullable
├── expense_report_id: UUID → expense_reports — Nullable
├── category_id: UUID → expense_categories
├── description: VARCHAR(500)
├── amount: DECIMAL(12,2)
├── currency: CHAR(3)
├── exchange_rate: DECIMAL(12,6)
├── date: DATE
├── vendor: VARCHAR(255)
├── receipt_file_id: UUID → file_objects
├── status: ENUM(draft, submitted, approved, rejected, paid, cancelled)
├── approved_by: UUID → users
├── approved_at: TIMESTAMPTZ
├── rejection_reason: TEXT
└── [Universal Columns]
```

#### `budgets`
```
budgets
├── id: UUID
├── company_id: UUID → companies
├── name: VARCHAR(255)
├── type: ENUM(company, department, project, location)
├── owner_id: UUID — ID of company/department/project/location
├── period_type: ENUM(monthly, quarterly, annual, project)
├── period_start: DATE
├── period_end: DATE
├── currency: CHAR(3)
├── status: ENUM(draft, approved, active, closed)
├── approved_by: UUID → users
└── [Universal Columns]
```

#### `budget_lines`
```
budget_lines
├── id: UUID
├── company_id: UUID → companies
├── budget_id: UUID → budgets
├── category: VARCHAR(255)
├── description: TEXT
├── planned_amount: DECIMAL(15,2)
├── actual_amount: DECIMAL(15,2) — Computed from expenses
├── variance: DECIMAL(15,2) — Computed: planned - actual
├── month: DATE — First day of the month (for monthly breakdown)
└── [Universal Columns]
```

#### `revenue_records`
```
revenue_records
├── id: UUID
├── company_id: UUID → companies
├── source_type: ENUM(invoice, order, subscription, other)
├── source_id: UUID
├── amount: DECIMAL(15,2)
├── currency: CHAR(3)
├── recognized_at: TIMESTAMPTZ
├── period_month: DATE — For period reporting
├── category: VARCHAR(100)
└── [Universal Columns]
```

---

### 2.9 DOCUMENT MODULE

#### `documents`
```
documents
├── id: UUID
├── company_id: UUID → companies
├── category_id: UUID → document_categories
├── name: VARCHAR(500)
├── type: ENUM(contract, invoice, policy, hr_document, project_document, product, photo, other)
├── classification: ENUM(public, internal, confidential, restricted, executive_vault)
├── status: ENUM(draft, active, pending_review, approved, expired, archived, superseded)
├── owner_id: UUID → users
├── related_to_type: VARCHAR(50) — "project", "customer", "employee"
├── related_to_id: UUID — Polymorphic reference
├── current_version_id: UUID → document_versions
├── expires_at: TIMESTAMPTZ
├── signed_at: TIMESTAMPTZ
├── tags: TEXT[]
├── metadata: JSONB
└── [Universal Columns]
```

#### `document_versions`
```
document_versions
├── id: UUID
├── company_id: UUID → companies
├── document_id: UUID → documents
├── version_number: INTEGER — 1, 2, 3 ...
├── file_id: UUID → file_objects
├── change_summary: TEXT
├── size_bytes: BIGINT
├── mime_type: VARCHAR(100)
├── checksum_sha256: CHAR(64) — Integrity verification
├── is_current: BOOLEAN
└── [Universal Columns]
```

#### `document_approvals`
```
document_approvals
├── id: UUID
├── company_id: UUID → companies
├── document_id: UUID → documents
├── workflow_instance_id: UUID → workflow_instances
├── approver_id: UUID → users
├── order_index: SMALLINT — Step in approval chain
├── status: ENUM(pending, approved, rejected, skipped, delegated)
├── decision_at: TIMESTAMPTZ
├── decision_notes: TEXT
├── delegated_to: UUID → users
└── [Universal Columns]
```

#### `document_signatures`
```
document_signatures
├── id: UUID
├── company_id: UUID → companies
├── document_id: UUID → documents
├── signer_id: UUID → users
├── type: ENUM(internal, external)
├── status: ENUM(pending, signed, declined, expired)
├── signed_at: TIMESTAMPTZ
├── signature_data: JSONB — Encrypted signature metadata
├── ip_address: INET
├── device_fingerprint: VARCHAR(255)
├── signature_image_file_id: UUID → file_objects
└── [Universal Columns]
```

---

### 2.10 COMMUNICATION MODULE

#### `conversations`
```
conversations
├── id: UUID
├── company_id: UUID → companies
├── type: ENUM(direct, group, project_channel, team_channel, announcement)
├── name: VARCHAR(255) — Nullable for DMs
├── description: TEXT
├── related_to_type: VARCHAR(50) — "project", "order"
├── related_to_id: UUID
├── is_archived: BOOLEAN
├── last_message_at: TIMESTAMPTZ
├── last_message_preview: VARCHAR(500)
└── [Universal Columns]
```

#### `conversation_members`
```
conversation_members
├── id: UUID
├── company_id: UUID → companies
├── conversation_id: UUID → conversations
├── user_id: UUID → users
├── role: ENUM(admin, member, observer)
├── joined_at: TIMESTAMPTZ
├── last_read_at: TIMESTAMPTZ
├── is_muted: BOOLEAN
├── muted_until: TIMESTAMPTZ
└── [Universal Columns]
```

#### `messages`
```
messages
├── id: UUID
├── company_id: UUID → companies
├── conversation_id: UUID → conversations
├── sender_id: UUID → users
├── content: TEXT
├── content_type: ENUM(text, markdown, system)
├── parent_message_id: UUID → messages — Thread reply
├── is_edited: BOOLEAN
├── edited_at: TIMESTAMPTZ
├── is_pinned: BOOLEAN
└── [Universal Columns]
```

#### `inbox_items`
```
inbox_items
├── id: UUID
├── company_id: UUID → companies
├── user_id: UUID → users — Recipient
├── type: ENUM(notification, approval, task, message, mention, alert)
├── priority: ENUM(P0, P1, P2, P3)
├── title: VARCHAR(500)
├── body: TEXT
├── source_module: VARCHAR(100)
├── source_type: VARCHAR(100) — "task", "leave_request", "invoice"
├── source_id: UUID
├── action_url: VARCHAR(500)
├── is_read: BOOLEAN
├── read_at: TIMESTAMPTZ
├── is_actioned: BOOLEAN
├── actioned_at: TIMESTAMPTZ
├── expires_at: TIMESTAMPTZ
└── [Universal Columns]
```

---

### 2.11 FILE STORAGE MODULE

#### `file_objects`
```
file_objects
├── id: UUID
├── company_id: UUID → companies
├── bucket_id: UUID → storage_buckets
├── name: VARCHAR(500) — Original file name
├── storage_key: VARCHAR(1000) — Path in object storage
├── mime_type: VARCHAR(100)
├── size_bytes: BIGINT
├── checksum_sha256: CHAR(64)
├── width_px: INTEGER — Images/videos only
├── height_px: INTEGER — Images/videos only
├── duration_seconds: INTEGER — Videos/audio only
├── is_public: BOOLEAN
├── cdn_url: VARCHAR(1000)
├── retention_policy_id: UUID → retention_policies
├── expires_at: TIMESTAMPTZ
├── archived_at: TIMESTAMPTZ
├── metadata: JSONB — EXIF, custom attributes
└── [Universal Columns]
```

#### `storage_buckets`
```
storage_buckets
├── id: UUID
├── company_id: UUID → companies — Nullable for shared buckets
├── name: VARCHAR(100)
├── type: ENUM(public, private, restricted, archive)
├── provider: ENUM(s3, gcs, azure, local)
├── region: VARCHAR(50)
├── encryption: BOOLEAN
├── versioning: BOOLEAN
└── [Universal Columns]
```

#### `retention_policies`
```
retention_policies
├── id: UUID
├── company_id: UUID → companies
├── name: VARCHAR(255)
├── document_type: VARCHAR(100)
├── retain_days: INTEGER
├── archive_after_days: INTEGER
├── delete_after_days: INTEGER
├── legal_hold: BOOLEAN — If true, deletion blocked regardless of policy
└── [Universal Columns]
```

---

### 2.12 WORKFLOW MODULE

#### `workflow_definitions`
```
workflow_definitions
├── id: UUID
├── company_id: UUID → companies
├── name: VARCHAR(255)
├── description: TEXT
├── module: VARCHAR(100) — "finance", "hr", "projects"
├── trigger_type: VARCHAR(100) — "expense_submitted", "leave_requested"
├── is_active: BOOLEAN
├── steps: JSONB — Ordered step definitions
├── version: INTEGER
└── [Universal Columns]
```

#### `workflow_instances`
```
workflow_instances
├── id: UUID
├── company_id: UUID → companies
├── definition_id: UUID → workflow_definitions
├── triggered_by: UUID → users
├── subject_type: VARCHAR(100) — "expense", "leave_request"
├── subject_id: UUID
├── status: ENUM(active, completed, cancelled, escalated, failed)
├── current_step: INTEGER
├── completed_at: TIMESTAMPTZ
├── escalated_at: TIMESTAMPTZ
└── [Universal Columns]
```

#### `workflow_step_instances`
```
workflow_step_instances
├── id: UUID
├── company_id: UUID → companies
├── workflow_instance_id: UUID → workflow_instances
├── step_index: SMALLINT
├── step_name: VARCHAR(255)
├── assignee_id: UUID → users
├── assignee_role_id: UUID → roles
├── status: ENUM(pending, in_progress, completed, rejected, skipped, escalated)
├── due_at: TIMESTAMPTZ
├── decision_at: TIMESTAMPTZ
├── decision: ENUM(approved, rejected, delegated)
├── decision_notes: TEXT
├── delegated_to: UUID → users
└── [Universal Columns]
```

#### `automation_rules`
```
automation_rules
├── id: UUID
├── company_id: UUID → companies
├── name: VARCHAR(255)
├── trigger_event: VARCHAR(200) — "task.status_changed", "order.created"
├── conditions: JSONB — [{field, operator, value}]
├── actions: JSONB — [{type, params}]
├── is_active: BOOLEAN
├── run_count: INTEGER
├── last_run_at: TIMESTAMPTZ
└── [Universal Columns]
```

---

### 2.13 SETTINGS & CONFIGURATION

#### `settings`
```
settings
├── id: UUID
├── company_id: UUID → companies — Nullable for global settings
├── user_id: UUID → users — Nullable for company/global
├── module: VARCHAR(100) — "notifications", "dashboard", "security"
├── key: VARCHAR(200)
├── value: JSONB
├── value_type: ENUM(string, integer, boolean, json, encrypted)
└── [Universal Columns]
```
*Settings use a 3-level hierarchy: Global → Company → User (lower overrides higher)*

#### `feature_flags`
```
feature_flags
├── id: UUID
├── key: VARCHAR(200) — "new_dashboard_v2", "ai_beta"
├── description: TEXT
├── is_enabled_globally: BOOLEAN
├── company_overrides: JSONB — {company_id: bool}
├── role_overrides: JSONB — {role_slug: bool}
└── [Universal Columns — no company_id]
```

---

## 3. RELATIONSHIP ARCHITECTURE

### 3.1 Organizational Hierarchy

```
groups (1)
  └─── companies (N)
         ├─── divisions (N)
         │      └─── departments (N)
         │              └─── teams (N)
         │                     └─── user_team_memberships (N)
         ├─── locations (N) — stores, sites, warehouses
         │      └─── regions (N)
         └─── users via user_company_memberships (N)
```

**Cascade Rules**:
- `groups` → `companies`: Restrict delete (cannot delete group with active companies)
- `companies` → all child entities: Soft-delete cascade (deactivate, never hard delete)
- `divisions` → `departments`: Restrict delete (move departments first)
- `departments` → `teams`: Restrict delete

### 3.2 User Relationship Map

```
users (1)
  ├─── user_profiles (1:1) — Personal data
  ├─── user_company_memberships (N) — Works at N companies
  ├─── user_team_memberships (N) — Member of N teams
  ├─── user_role_assignments (N) — Holds N roles at different scopes
  ├─── attendance_entries (N)
  ├─── tasks assigned to user (N)
  ├─── messages sent (N)
  ├─── inbox_items (N)
  ├─── audit_logs (N) — every action they took
  ├─── trusted_devices (N)
  └─── user_sessions (N)
```

### 3.3 Project Relationship Map

```
projects (1)
  ├─── project_phases (N, ordered)
  │      └─── milestones (N)
  │              └─── tasks (N)
  │                     ├─── task_assignments (N users)
  │                     ├─── time_entries (N)
  │                     └─── subtasks (N, self-ref on tasks)
  ├─── project_team_assignments (N teams)
  ├─── project_issues (N)
  ├─── project_journal_entries (N)
  ├─── documents (N, via related_to)
  ├─── file_objects (N, via related_to)
  ├─── invoices (N)
  ├─── purchase_orders (N)
  └─── expenses (N)
```

### 3.4 Order Relationship Map

```
orders (1)
  ├─── order_items (N)
  │      ├─── products (1)
  │      └─── product_variants (1)
  ├─── order_returns (N)
  ├─── payments (N)
  ├─── invoices (1)
  ├─── customers (1)
  └─── locations (1, originating store)
```

### 3.5 Permission Relationship Map

```
roles (1)
  ├─── role_permissions (N) → permissions (N) [many-to-many]
  ├─── role_inheritance: parent_role_id (self-ref) — inherits parent's permissions
  └─── user_role_assignments (N)
         ├─── users (1)
         ├─── scope_type + scope_id — which entity the role applies to
         └─── expires_at — temporary access support

permissions (1)
  ├─── role_permissions (N)
  └─── permission_overrides (N) — per-user exceptions
```

### 3.6 Document Relationship Map

```
documents (1)
  ├─── document_versions (N) — full version history
  │      └─── file_objects (1 per version)
  ├─── document_approvals (N)
  │      └─── workflow_instances (1)
  ├─── document_signatures (N)
  └─── related_to: polymorphic → projects | customers | users | products
```

### 3.7 Finance Relationship Map

```
invoices (1)
  ├─── invoice_items (N)
  │      └─── products (1, optional)
  ├─── payments (N)
  ├─── customers (1)
  └─── projects (1, optional)

budgets (1)
  ├─── budget_lines (N)
  └─── owner: polymorphic → companies | departments | projects | locations

expenses (1)
  ├─── expense_reports (N:1 grouping)
  ├─── file_objects (1 receipt)
  └─── projects (1, optional)
```

### 3.8 Polymorphic Reference Pattern

Several entities use polymorphic references (`reference_type` + `reference_id`) to link to any other entity:

| Entity | Uses Polymorphic Ref For |
|--------|------------------------|
| `documents` | `related_to_type` + `related_to_id` |
| `inbox_items` | `source_type` + `source_id` |
| `audit_logs` | `subject_type` + `subject_id` |
| `notifications` | `source_type` + `source_id` |
| `inventory_movements` | `reference_type` + `reference_id` |
| `analytics_events` | `subject_type` + `subject_id` |
| `budgets` | `owner_type` (implicit via type ENUM) + `owner_id` |

**Polymorphic Reference Rules**:
- The combination `(type, id)` is indexed
- Referential integrity enforced at application layer (not DB FK, due to polymorphism)
- Cascade soft-deletes propagated by application events

---

## 4. MULTI-COMPANY MODEL

### 4.1 Isolation Guarantee

Every query in the system is company-scoped. The isolation model has four enforcement layers:

```
Layer 1: Session Token
  JWT contains: { user_id, company_id, role_ids[], scope_data }
  Every request extracts company_id from the validated token.

Layer 2: ORM Query Injection
  Base query class automatically appends:
  WHERE company_id = :session.company_id AND deleted_at IS NULL

Layer 3: PostgreSQL Row-Level Security
  Policy: company_isolation_policy
  USING (company_id = current_setting('app.company_id')::uuid)
  Applied to all tables except global tables.

Layer 4: Audit Verification
  Post-query sampling: verify returned rows match session company_id.
  Alert triggered on any mismatch.
```

### 4.2 Cross-Company Access (CEO / Superadmin)

Users with multi-company scope (CEO of PRV Group, Superadmin) can query across companies:

```
cross_company_access
├── id: UUID
├── user_id: UUID → users
├── access_type: ENUM(read_all, admin_all, scoped)
├── company_ids: UUID[] — Null = all companies in group
├── granted_by: UUID → users
├── granted_at: TIMESTAMPTZ
├── expires_at: TIMESTAMPTZ
└── [Universal Columns — no company_id enforcement here]
```

When a cross-company user makes a query:
- The ORM receives a list of `company_ids` instead of a single value
- RLS policy checks `company_id = ANY(:company_ids)`
- Audit log records which companies were accessed
- The user must still explicitly select a "context company" for write operations

### 4.3 Company Data Segregation

Each company's data is logically isolated but physically co-located (except for high-security tenants who can request dedicated database instances).

**Data that is NEVER shared across companies**:
- All business data (orders, projects, employees, finances, customers)
- All documents and files
- All communications
- All audit logs

**Data that IS shared (platform-level)**:
- `platform_config` — Platform settings
- `feature_flags` — Feature availability
- `permission` definitions — Permission catalog
- `roles` where `type = 'global'` — System roles (can be extended per company)
- `countries`, `currencies`, `timezones` — Reference data

### 4.4 Company Onboarding Data Model

```
company_onboarding_progress
├── id: UUID
├── company_id: UUID → companies
├── step: VARCHAR(100) — "basic_info", "roles_setup", "users_invited"
├── status: ENUM(pending, in_progress, completed, skipped)
├── completed_at: TIMESTAMPTZ
└── [Universal Columns]
```

### 4.5 Inter-Company Operations

When PRV Group needs inter-company transactions (e.g., PRV Renovations invoices PRV Shop):

```
inter_company_transactions
├── id: UUID
├── from_company_id: UUID → companies
├── to_company_id: UUID → companies
├── type: ENUM(invoice, expense_recharge, resource_loan, transfer)
├── amount: DECIMAL(15,2)
├── currency: CHAR(3)
├── reference_id: UUID — ID in source company's records
├── status: ENUM(pending, approved, settled, disputed)
├── approved_by: UUID → users
└── [Universal Columns — company_id = from_company_id]
```

---

## 5. PERMISSION MODEL

### 5.1 Permission Resolution Algorithm

When checking if a user can perform an action:

```
FUNCTION can(user_id, permission_slug, scope_type, scope_id):
  
  1. Load user's active role assignments for (scope_type, scope_id)
  2. For each role: collect role's permissions (direct + inherited)
  3. Check permission_overrides for explicit grants/denials (user-level)
  4. Resolution order (highest priority wins):
     a. permission_overrides (explicit user grant/deny) — HIGHEST
     b. role_permissions for most specific scope role
     c. role_permissions for parent scope role
     d. Implicit deny — LOWEST (deny if not found)
  5. Log permission check to audit (async, non-blocking)
  6. Return: granted | denied
```

### 5.2 Role Inheritance Model

```
Superadmin
  └─── Company Owner (inherits from Superadmin for own company)
         ├─── Regional Manager
         │      └─── Operations Manager
         │             └─── OMS
         │                    └─── Team Leader
         │                           └─── Worker
         ├─── Project Director
         │      └─── Project OMS (Project Operations Manager)
         │             └─── Project Team Leader
         │                    └─── Project Worker
         ├─── Shop Director
         │      └─── Store Manager
         │             └─── Cashier
         ├─── HR Manager
         ├─── Finance Manager
         ├─── Analyst
         └─── Procurement Manager
```

**Inheritance Rules**:
- A role inherits ALL permissions of its parent role
- Parent permissions can be explicitly overridden (denied) at child level
- `role_permissions.is_granted = false` on a specific permission = explicit deny
- Explicit deny at child level overrides inherited grant from parent
- Custom roles can inherit from any role, creating hybrid permission sets

### 5.3 Scope Model

The permission scope defines the boundary within which a role's permissions apply:

| Scope Level | Scope Type | Example |
|-------------|-----------|---------|
| L0 | `global` | Superadmin sees all companies |
| L1 | `company` | CEO sees all divisions, departments, teams |
| L2 | `division` | Division Director sees own division |
| L3 | `department` | Department Head sees own department |
| L4 | `team` | Team Leader sees own team |
| L5 | `location` | Store Manager sees own store |
| L6 | `project` | Project OMS sees own projects |
| L7 | `self` | Worker sees own records only |

A user can hold multiple role assignments at different scopes simultaneously:
- "OMS at Scope:Team(Team Alpha)" + "Project Worker at Scope:Project(Omega)"

### 5.4 Temporary Access Model

For project-based temporary role grants (per ROLE_ARCHITECTURE.md):

```
When user assigned to project:
  user_role_assignments INSERT:
    role_id = project_worker_role
    scope_type = project
    scope_id = project.id
    expires_at = project.planned_end_date + 7 days
    
When user removed from project:
  user_role_assignments UPDATE:
    revoked_at = NOW()
    revoked_by = assigning_manager_id
    revocation_reason = "Removed from project"
```

Expiration is enforced at query time (the ORM checks `expires_at > NOW()`), not by a background job. This ensures no grace-period gaps from job scheduling delays.

### 5.5 Permission Audit Trail

Every permission check is optionally logged (rate-limited to avoid flood):

```
permission_checks (high-volume, partitioned by month)
├── id: UUID
├── user_id: UUID
├── permission_slug: VARCHAR(200)
├── scope_type: VARCHAR(50)
├── scope_id: UUID
├── result: ENUM(granted, denied)
├── resolution_path: JSONB — Which rule granted/denied
├── checked_at: TIMESTAMPTZ
└── [No universal columns — immutable, no updates]
```

*This table is append-only. Partitioned by month. Archived after 90 days.*

---

## 6. NOTIFICATION DATA MODEL

### 6.1 Core Notification Tables

#### `notifications`
```
notifications
├── id: UUID
├── company_id: UUID → companies
├── recipient_id: UUID → users
├── type: ENUM(push, in_app, email, sms)
├── priority: ENUM(P0, P1, P2, P3)
├── template_id: UUID → notification_templates
├── title: VARCHAR(500)
├── body: TEXT
├── data: JSONB — Deep link, action buttons, metadata
├── source_module: VARCHAR(100)
├── source_type: VARCHAR(100)
├── source_id: UUID
├── status: ENUM(pending, sent, delivered, read, failed)
├── sent_at: TIMESTAMPTZ
├── delivered_at: TIMESTAMPTZ
├── read_at: TIMESTAMPTZ
├── failed_reason: TEXT
└── [Universal Columns]
```

#### `notification_templates`
```
notification_templates
├── id: UUID
├── company_id: UUID → companies — Nullable for global templates
├── event_slug: VARCHAR(200) — "task.assigned", "leave.approved"
├── channel: ENUM(push, email, sms, in_app)
├── locale: VARCHAR(10)
├── subject: VARCHAR(500) — For email
├── title_template: TEXT — Mustache/Handlebars
├── body_template: TEXT
├── is_active: BOOLEAN
└── [Universal Columns]
```

#### `notification_preferences`
```
notification_preferences
├── id: UUID
├── company_id: UUID → companies
├── user_id: UUID → users
├── event_slug: VARCHAR(200)
├── channel: ENUM(push, email, sms, in_app)
├── is_enabled: BOOLEAN
├── quiet_hours_start: TIME
├── quiet_hours_end: TIME
├── digest_frequency: ENUM(immediate, hourly, daily, weekly, never)
└── [Universal Columns]
```

#### `notification_digest_queue`
```
notification_digest_queue
├── id: UUID
├── company_id: UUID → companies
├── user_id: UUID → users
├── notification_id: UUID → notifications
├── digest_frequency: ENUM(hourly, daily, weekly)
├── scheduled_for: TIMESTAMPTZ
├── sent_at: TIMESTAMPTZ
└── [Universal Columns]
```

### 6.2 Notification Event Pipeline

```
Business Event Occurs →
  notification_events table INSERT (raw event) →
  Notification Rules Engine evaluates:
    - Who should receive it (role-based fanout)
    - Which channels (user preferences)
    - Priority (event priority × role priority)
    - Template selection (locale + channel) →
  For immediate: notifications INSERT → delivery queues →
  For digest: notification_digest_queue INSERT →
  Digest job runs at scheduled time → batch notifications INSERT →
  Delivery agents (push/email/sms) process queues →
  Status updated on delivery confirmation
```

#### `notification_events` (raw event log, append-only)
```
notification_events
├── id: UUID
├── company_id: UUID → companies
├── event_slug: VARCHAR(200)
├── actor_id: UUID → users
├── subject_type: VARCHAR(100)
├── subject_id: UUID
├── payload: JSONB — Full event data for template rendering
├── occurred_at: TIMESTAMPTZ
└── [No universal columns — immutable]
```

### 6.3 Push Notification Infrastructure

#### `push_tokens`
```
push_tokens
├── id: UUID
├── company_id: UUID → companies
├── user_id: UUID → users
├── device_id: UUID → trusted_devices
├── platform: ENUM(ios, android, web)
├── token: TEXT — FCM or APNs token
├── is_active: BOOLEAN
├── last_used_at: TIMESTAMPTZ
└── [Universal Columns]
```

---

## 7. ANALYTICS DATA MODEL

### 7.1 Analytics Architecture

PRV uses a **two-tier analytics model**:
- **Tier 1 — Raw Events**: Append-only event stream (analytics_events). Every user action and business event.
- **Tier 2 — Computed Snapshots**: Pre-aggregated materialized views and snapshot tables, computed from raw events.

Dashboards always read from Tier 2. Raw events feed into Tier 2 via scheduled jobs and streaming aggregators.

### 7.2 Raw Event Collection

#### `analytics_events` (high-volume, partitioned by month)
```
analytics_events
├── id: UUID
├── company_id: UUID
├── event_name: VARCHAR(200) — "project.task.completed", "shop.order.placed"
├── actor_id: UUID — User who triggered the event
├── subject_type: VARCHAR(100)
├── subject_id: UUID
├── properties: JSONB — Event-specific properties
├── session_id: UUID — User's app session
├── device_type: ENUM(mobile, tablet, desktop)
├── platform: ENUM(ios, android, web, macos)
├── ip_address: INET
├── occurred_at: TIMESTAMPTZ
└── [No company-level universal columns — append-only]
```

*Partitioned by `(company_id, occurred_at)` — monthly partitions. Rows never updated or deleted (analytics integrity).*

### 7.3 KPI Tables

#### `kpi_definitions`
```
kpi_definitions
├── id: UUID
├── company_id: UUID — Nullable for global KPI definitions
├── name: VARCHAR(255)
├── slug: VARCHAR(200)
├── module: VARCHAR(100)
├── formula: TEXT — Human-readable formula description
├── unit: ENUM(currency, percentage, count, hours, ratio, score)
├── direction: ENUM(higher_better, lower_better, target_range)
├── roles_eligible: TEXT[] — Role slugs
├── refresh_interval_seconds: INTEGER
└── [Universal Columns]
```

#### `kpi_targets`
```
kpi_targets
├── id: UUID
├── company_id: UUID → companies
├── kpi_definition_id: UUID → kpi_definitions
├── scope_type: VARCHAR(50)
├── scope_id: UUID
├── period_type: ENUM(daily, weekly, monthly, quarterly, annual)
├── period_start: DATE
├── target_value: DECIMAL(20,6)
├── set_by: UUID → users
└── [Universal Columns]
```

#### `kpi_snapshots` (computed, partitioned by month)
```
kpi_snapshots
├── id: UUID
├── company_id: UUID
├── kpi_definition_id: UUID → kpi_definitions
├── scope_type: VARCHAR(50)
├── scope_id: UUID
├── period_type: ENUM(same as kpi_targets)
├── period_start: DATE
├── value: DECIMAL(20,6)
├── previous_value: DECIMAL(20,6) — Prior period
├── target_value: DECIMAL(20,6) — From kpi_targets
├── variance_from_target: DECIMAL(20,6) — Computed
├── computed_at: TIMESTAMPTZ
└── [No universal columns — computed data]
```

### 7.4 Module Analytics Snapshot Tables

Each module has its own snapshot table computed from raw events + operational data:

#### `project_analytics_snapshots`
```
project_analytics_snapshots
├── id: UUID
├── company_id: UUID
├── project_id: UUID → projects
├── snapshot_date: DATE
├── tasks_total: INTEGER
├── tasks_completed: INTEGER
├── tasks_overdue: INTEGER
├── completion_percentage: DECIMAL(5,2)
├── team_count: INTEGER
├── hours_logged: DECIMAL(10,2)
├── issues_open: INTEGER
├── budget_spent: DECIMAL(15,2)
├── budget_remaining: DECIMAL(15,2)
├── health_score: SMALLINT
├── delay_days: INTEGER
└── [No universal columns]
```

#### `shop_analytics_snapshots` (daily)
```
shop_analytics_snapshots
├── id: UUID
├── company_id: UUID
├── location_id: UUID → locations
├── snapshot_date: DATE
├── orders_count: INTEGER
├── revenue: DECIMAL(15,2)
├── average_order_value: DECIMAL(12,2)
├── items_sold: INTEGER
├── returns_count: INTEGER
├── returns_value: DECIMAL(12,2)
├── conversion_rate: DECIMAL(7,4)
├── new_customers: INTEGER
├── top_product_id: UUID → products
└── [No universal columns]
```

#### `attendance_analytics_snapshots` (daily)
```
attendance_analytics_snapshots
├── id: UUID
├── company_id: UUID
├── team_id: UUID → teams
├── location_id: UUID → locations
├── snapshot_date: DATE
├── scheduled_count: INTEGER
├── present_count: INTEGER
├── absent_count: INTEGER
├── late_count: INTEGER
├── on_leave_count: INTEGER
├── attendance_rate: DECIMAL(5,4)
├── total_hours_worked: DECIMAL(10,2)
├── total_overtime_hours: DECIMAL(8,2)
└── [No universal columns]
```

#### `finance_analytics_snapshots` (daily)
```
finance_analytics_snapshots
├── id: UUID
├── company_id: UUID
├── snapshot_date: DATE
├── revenue: DECIMAL(15,2)
├── expenses: DECIMAL(15,2)
├── gross_profit: DECIMAL(15,2)
├── net_profit: DECIMAL(15,2)
├── outstanding_receivables: DECIMAL(15,2)
├── outstanding_payables: DECIMAL(15,2)
├── cash_position: DECIMAL(15,2)
├── budget_utilization: DECIMAL(5,4)
└── [No universal columns]
```

### 7.5 Anomaly Detection Tables

#### `anomaly_detections`
```
anomaly_detections
├── id: UUID
├── company_id: UUID → companies
├── kpi_id: UUID → kpi_definitions
├── scope_type: VARCHAR(50)
├── scope_id: UUID
├── detected_at: TIMESTAMPTZ
├── anomaly_type: ENUM(spike, drop, trend_change, missing_data, outlier)
├── severity: ENUM(low, medium, high, critical)
├── expected_value: DECIMAL(20,6)
├── actual_value: DECIMAL(20,6)
├── deviation_percent: DECIMAL(8,4)
├── description: TEXT
├── status: ENUM(open, acknowledged, resolved, false_positive)
├── resolved_at: TIMESTAMPTZ
├── resolved_by: UUID → users
└── [Universal Columns]
```

---

## 8. AI DATA MODEL

### 8.1 AI Conversation Store

#### `ai_conversations`
```
ai_conversations
├── id: UUID
├── company_id: UUID → companies
├── user_id: UUID → users
├── context_type: VARCHAR(100) — "dashboard", "project", "report"
├── context_id: UUID — Scoped to current entity (nullable)
├── title: VARCHAR(500) — Auto-generated from first message
├── status: ENUM(active, archived)
├── message_count: INTEGER
├── last_message_at: TIMESTAMPTZ
└── [Universal Columns]
```

#### `ai_messages`
```
ai_messages
├── id: UUID
├── company_id: UUID → companies
├── conversation_id: UUID → ai_conversations
├── role: ENUM(user, assistant, system)
├── content: TEXT
├── tokens_used: INTEGER
├── model_version: VARCHAR(100)
├── latency_ms: INTEGER
├── tool_calls: JSONB — Tools invoked by AI
├── data_sources_accessed: TEXT[] — Which modules were queried
├── scope_boundary: JSONB — What data the AI was allowed to see
└── [Universal Columns]
```

### 8.2 AI Insights Store

#### `ai_insights`
```
ai_insights
├── id: UUID
├── company_id: UUID → companies
├── type: ENUM(recommendation, risk, forecast, anomaly, optimization, executive_briefing)
├── target_role: TEXT[] — Role slugs this insight is for
├── target_user_id: UUID → users — Nullable (role-targeted = null)
├── title: VARCHAR(500)
├── summary: TEXT
├── detail: TEXT
├── confidence: DECIMAL(4,3) — 0.000–1.000
├── impact: ENUM(low, medium, high, critical)
├── data_sources: TEXT[] — Which modules contributed
├── related_to_type: VARCHAR(100)
├── related_to_id: UUID
├── proposed_action: TEXT
├── action_deep_link: VARCHAR(500)
├── status: ENUM(active, actioned, dismissed, expired, superseded)
├── actioned_at: TIMESTAMPTZ
├── actioned_by: UUID → users
├── dismissed_at: TIMESTAMPTZ
├── dismissed_by: UUID → users
├── expires_at: TIMESTAMPTZ
└── [Universal Columns]
```

#### `ai_insight_feedback`
```
ai_insight_feedback
├── id: UUID
├── company_id: UUID → companies
├── insight_id: UUID → ai_insights
├── user_id: UUID → users
├── feedback: ENUM(helpful, not_helpful, wrong, acted_on)
├── notes: TEXT
└── [Universal Columns]
```

### 8.3 AI Forecasts Store

#### `ai_forecasts`
```
ai_forecasts
├── id: UUID
├── company_id: UUID → companies
├── forecast_type: ENUM(revenue, demand, workforce, cash, project_completion, inventory)
├── scope_type: VARCHAR(50)
├── scope_id: UUID
├── period_type: ENUM(daily, weekly, monthly, quarterly)
├── forecast_horizon: INTEGER — Number of periods ahead
├── generated_at: TIMESTAMPTZ
├── model_version: VARCHAR(100)
├── accuracy_score: DECIMAL(5,4) — Compared to actuals after the fact
└── [Universal Columns]
```

#### `ai_forecast_points`
```
ai_forecast_points
├── id: UUID
├── company_id: UUID → companies
├── forecast_id: UUID → ai_forecasts
├── period_start: DATE
├── period_end: DATE
├── predicted_value: DECIMAL(20,6)
├── lower_bound: DECIMAL(20,6) — 90% confidence lower
├── upper_bound: DECIMAL(20,6) — 90% confidence upper
├── actual_value: DECIMAL(20,6) — Populated after period ends
└── [No universal columns — computed]
```

### 8.4 AI Risk Detection Store

#### `ai_risk_detections`
```
ai_risk_detections
├── id: UUID
├── company_id: UUID → companies
├── risk_type: ENUM(financial, operational, workforce, compliance, security, supply_chain)
├── title: VARCHAR(500)
├── description: TEXT
├── severity: ENUM(low, medium, high, critical)
├── probability: DECIMAL(4,3) — 0.000–1.000
├── impact_assessment: TEXT
├── affected_entity_type: VARCHAR(100)
├── affected_entity_id: UUID
├── detected_signals: JSONB — What data patterns triggered detection
├── recommended_actions: JSONB — [{action, priority, owner_role}]
├── status: ENUM(open, mitigating, resolved, accepted, false_positive)
├── resolved_at: TIMESTAMPTZ
├── resolved_by: UUID → users
└── [Universal Columns]
```

### 8.5 AI Model Configuration

#### `ai_model_configs`
```
ai_model_configs
├── id: UUID
├── company_id: UUID → companies — Nullable for global
├── feature: VARCHAR(200) — "chat", "forecasting", "risk_detection"
├── model_provider: VARCHAR(100)
├── model_id: VARCHAR(200)
├── parameters: JSONB — Temperature, max_tokens, etc.
├── is_active: BOOLEAN
├── rate_limit_per_minute: INTEGER
└── [Universal Columns]
```

---

## 9. AUDIT DATA MODEL

### 9.1 Audit Log — Immutable Chain

The audit log is the most critical table in PRV. It is:
- **Append-only**: no UPDATE or DELETE ever runs on this table
- **Immutable integrity**: each row includes a SHA-256 hash chaining to the previous row
- **Partitioned**: by `(company_id, occurred_at)` — monthly partitions
- **Archived**: partitions older than 1 year moved to cold storage, but never deleted

#### `audit_logs`
```
audit_logs
├── id: UUID
├── company_id: UUID — No FK constraint (must survive company deletion)
├── sequence_number: BIGINT — Monotonic per company (enables gap detection)
├── actor_id: UUID — User who performed the action (null for system)
├── actor_role: VARCHAR(100) — Role slug at time of action (snapshot)
├── actor_email: VARCHAR(255) — Snapshot (in case user deleted)
├── action: ENUM(create, read, update, delete, approve, reject, export, import,
│                login, logout, mfa_verify, permission_change, scope_change,
│                escalate, transfer, archive, restore, sign, revoke)
├── module: VARCHAR(100) — "projects", "finance", "shop", "auth"
├── resource_type: VARCHAR(100) — "task", "invoice", "order"
├── resource_id: UUID — ID of affected record
├── resource_snapshot: JSONB — State of resource AT TIME of action (before state)
├── changes: JSONB — {field: {from, to}} for updates
├── ip_address: INET
├── device_id: UUID — Snapshot reference
├── device_fingerprint: VARCHAR(255)
├── session_id: UUID
├── user_agent: TEXT
├── location: JSONB — {country, city, coordinates} if available
├── scope_company_id: UUID — Which company context the action was in
├── integrity_hash: CHAR(64) — SHA-256 of this row + previous row's hash
├── previous_hash: CHAR(64) — Previous row's integrity_hash
├── occurred_at: TIMESTAMPTZ — Time of action (nanosecond precision)
└── [NO universal columns — this table has no created_by/updated_by/deleted_at]
```

### 9.2 Audit Events Catalog

| Module | Events Tracked |
|--------|---------------|
| Auth | login, logout, login_failed, mfa_required, mfa_success, mfa_failed, password_reset, session_revoked |
| Users | create, update, suspend, reactivate, delete, role_assigned, role_revoked, scope_changed |
| Projects | create, update, status_change, phase_complete, milestone_complete, task_assign, issue_escalate, delete |
| Finance | invoice_create, invoice_send, payment_record, expense_submit, expense_approve, budget_modify, export |
| Shop | order_create, order_cancel, order_refund, return_approve, inventory_adjust, price_change |
| HR | hire, terminate, leave_approve, leave_reject, contract_sign, payroll_run, document_access |
| Documents | upload, view, download, version_create, sign, approve, share, revoke_access, delete |
| Permissions | permission_grant, permission_revoke, role_create, role_modify, override_create |
| Security | device_register, device_revoke, lockdown_activate, policy_change, threat_detected |
| Data | export, bulk_delete, data_access_report, gdpr_request, erasure_execute |

### 9.3 Audit Integrity Verification

```
audit_integrity_checks
├── id: UUID
├── company_id: UUID
├── checked_at: TIMESTAMPTZ
├── checked_from_sequence: BIGINT
├── checked_to_sequence: BIGINT
├── rows_verified: INTEGER
├── integrity_valid: BOOLEAN
├── gaps_detected: JSONB — Missing sequence numbers
├── hash_failures: JSONB — Rows where hash chain broke
├── checked_by: ENUM(system, admin, auditor)
└── [No universal columns]
```

*Integrity checks run nightly. Any failure triggers P0 security alert.*

### 9.4 GDPR-Related Audit Tables

#### `gdpr_requests`
```
gdpr_requests
├── id: UUID
├── company_id: UUID → companies
├── user_id: UUID → users — Subject of the request
├── requested_by: UUID → users — Can be the user themselves or DPO
├── type: ENUM(access, erasure, portability, rectification, restriction, objection)
├── status: ENUM(received, processing, completed, rejected, partially_completed)
├── due_at: TIMESTAMPTZ — 30-day regulatory deadline
├── completed_at: TIMESTAMPTZ
├── notes: TEXT
├── rejection_reason: TEXT
├── export_file_id: UUID → file_objects — For access/portability requests
└── [Universal Columns]
```

---

## 10. SECURITY DATA MODEL

### 10.1 Device Management

#### `trusted_devices`
```
trusted_devices
├── id: UUID
├── company_id: UUID → companies
├── user_id: UUID → users
├── name: VARCHAR(255) — "Ion's iPhone 16 Pro"
├── fingerprint: VARCHAR(500) — Device fingerprint hash
├── platform: ENUM(ios, android, web, macos, windows)
├── os_version: VARCHAR(50)
├── app_version: VARCHAR(50)
├── model: VARCHAR(100)
├── trust_level: ENUM(unknown, low, medium, high, trusted)
├── registered_at: TIMESTAMPTZ
├── registered_ip: INET
├── last_seen_at: TIMESTAMPTZ
├── last_seen_ip: INET
├── revoked_at: TIMESTAMPTZ
├── revoked_by: UUID → users
├── revocation_reason: TEXT
├── is_jailbroken: BOOLEAN
├── push_token_id: UUID → push_tokens
├── biometric_enrolled: BOOLEAN
├── risk_score: SMALLINT — 0–100 (0 = safe)
└── [Universal Columns]
```

### 10.2 Session Management

#### `user_sessions`
```
user_sessions
├── id: UUID
├── company_id: UUID → companies
├── user_id: UUID → users
├── device_id: UUID → trusted_devices
├── token_hash: CHAR(64) — SHA-256 of the JWT (never store raw token)
├── refresh_token_hash: CHAR(64)
├── status: ENUM(active, expired, revoked, suspicious)
├── created_at: TIMESTAMPTZ
├── expires_at: TIMESTAMPTZ
├── last_activity_at: TIMESTAMPTZ
├── revoked_at: TIMESTAMPTZ
├── revoked_reason: ENUM(logout, admin_revoke, suspicious_activity, device_revoked, idle_timeout)
├── ip_address: INET
├── user_agent: TEXT
├── company_context_id: UUID → companies — Active company context
└── [Universal Columns]
```

### 10.3 MFA Configuration

#### `user_mfa_configs`
```
user_mfa_configs
├── id: UUID
├── company_id: UUID → companies
├── user_id: UUID → users
├── method: ENUM(totp, sms, email, face_id, hardware_key)
├── is_primary: BOOLEAN
├── is_active: BOOLEAN
├── secret_encrypted: TEXT — Encrypted TOTP secret or token ref
├── phone_number: VARCHAR(50) — For SMS MFA
├── enrolled_at: TIMESTAMPTZ
├── last_used_at: TIMESTAMPTZ
├── backup_codes_hash: TEXT[] — Hashed backup codes
└── [Universal Columns]
```

### 10.4 Security Events

#### `security_events`
```
security_events
├── id: UUID
├── company_id: UUID → companies — Nullable for platform events
├── user_id: UUID → users — Nullable for anonymous events
├── device_id: UUID → trusted_devices
├── event_type: ENUM(
│     failed_login, brute_force_detected, impossible_travel,
│     new_device_login, suspicious_export, mass_data_access,
│     permission_escalation_attempt, session_anomaly,
│     jailbroken_device_attempt, mfa_bypass_attempt,
│     lockdown_triggered, policy_violation
│   )
├── severity: ENUM(info, low, medium, high, critical)
├── description: TEXT
├── ip_address: INET
├── location_data: JSONB — {country, city, coordinates}
├── raw_data: JSONB — Event-specific technical data
├── status: ENUM(open, investigating, resolved, false_positive)
├── resolved_by: UUID → users
├── resolved_at: TIMESTAMPTZ
├── risk_score_impact: SMALLINT — How much this raised the risk score
└── [Universal Columns — no deletion ever]
```

### 10.5 User Risk Scores

#### `user_risk_scores`
```
user_risk_scores
├── id: UUID
├── company_id: UUID → companies
├── user_id: UUID → users
├── current_score: SMALLINT — 0 (safe) – 100 (critical threat)
├── score_computed_at: TIMESTAMPTZ
├── contributing_factors: JSONB — Breakdown of what raised score
├── threshold_low: SMALLINT — Below = no additional auth
├── threshold_medium: SMALLINT — Triggers step-up auth
├── threshold_high: SMALLINT — Triggers session review
├── threshold_critical: SMALLINT — Triggers automatic lockout
└── [Universal Columns]
```

### 10.6 Lockdown System

#### `lockdown_records`
```
lockdown_records
├── id: UUID
├── company_id: UUID → companies — Nullable for platform lockdowns
├── scope: ENUM(user, team, location, company, platform)
├── scope_id: UUID
├── level: ENUM(L1, L2, L3, L4, L5)
├── reason: TEXT
├── triggered_by: UUID → users — Null for auto-triggered
├── trigger_event_id: UUID → security_events
├── restrictions: JSONB — What is blocked at this level
├── activated_at: TIMESTAMPTZ
├── resolved_at: TIMESTAMPTZ
├── resolved_by: UUID → users
└── [Universal Columns]
```

---

## 11. FUTURE EXPANSION MODEL

### 11.1 Platform Module Registry

Every current and future module is registered in the module registry. This enables the platform to expand without schema redesign.

#### `platform_modules`
```
platform_modules
├── id: UUID
├── name: VARCHAR(255)
├── slug: VARCHAR(100) — Unique: "projects", "prv_academy", "marketplace"
├── description: TEXT
├── version: VARCHAR(20)
├── status: ENUM(active, beta, planned, deprecated)
├── is_core: BOOLEAN — Core modules cannot be disabled
├── dependencies: TEXT[] — Other module slugs required
├── schema_version: INTEGER — For migration tracking
└── [Universal Columns — no company_id]
```

#### `company_module_subscriptions`
```
company_module_subscriptions
├── id: UUID
├── company_id: UUID → companies
├── module_id: UUID → platform_modules
├── status: ENUM(active, trial, suspended, cancelled)
├── trial_ends_at: TIMESTAMPTZ
├── settings: JSONB — Module-specific config for this company
├── activated_at: TIMESTAMPTZ
└── [Universal Columns]
```

### 11.2 Generic Entity Extension System

Every entity in PRV can be extended with custom fields without schema changes:

#### `custom_field_definitions`
```
custom_field_definitions
├── id: UUID
├── company_id: UUID → companies
├── entity_type: VARCHAR(100) — "customer", "project", "product"
├── field_key: VARCHAR(100)
├── field_label: VARCHAR(255)
├── field_type: ENUM(text, number, date, boolean, select, multi_select, user, file)
├── options: JSONB — For select/multi_select fields
├── is_required: BOOLEAN
├── is_searchable: BOOLEAN
├── display_order: SMALLINT
└── [Universal Columns]
```

#### `custom_field_values`
```
custom_field_values
├── id: UUID
├── company_id: UUID → companies
├── definition_id: UUID → custom_field_definitions
├── entity_type: VARCHAR(100)
├── entity_id: UUID
├── value_text: TEXT
├── value_number: DECIMAL(20,6)
├── value_date: DATE
├── value_boolean: BOOLEAN
├── value_json: JSONB — For multi-select, user references, etc.
└── [Universal Columns]
```

### 11.3 Planned Future Module Blueprints

#### PRV Academy (Learning Management)
```
Entities to be created when module activates:
├── courses — Course catalog with versions
├── course_modules — Course content sections
├── lessons — Individual lessons (video, text, quiz)
├── enrollments — User → Course assignments
├── lesson_progress — Per-user, per-lesson completion
├── assessments — Quizzes and tests
├── assessment_attempts — User attempt records
├── certificates — Issued on completion
└── learning_paths — Curated course sequences
```

#### PRV Marketplace (Internal Procurement Marketplace)
```
Entities to be created:
├── marketplace_listings — Items available for procurement
├── marketplace_orders — Procurement orders via marketplace
├── vendor_profiles — Approved vendor marketplace pages
├── marketplace_reviews — Vendor + product reviews
└── marketplace_contracts — Negotiated terms
```

#### PRV Property (Real Estate Management)
```
Entities to be created:
├── properties — Property portfolio
├── property_units — Individual units within properties
├── leases — Tenant lease agreements
├── maintenance_requests — Property maintenance
├── property_inspections — Scheduled inspections
└── utility_records — Utility billing per unit
```

#### PRV Rentals (Equipment Rental)
```
Entities to be created:
├── rental_items — Equipment catalog
├── rental_contracts — Customer rental agreements
├── rental_reservations — Booking calendar
├── rental_returns — Return processing
└── rental_damage_reports — Damage on return
```

#### PRV Franchise (Franchise Management)
```
Entities to be created:
├── franchise_agreements — Master franchise contracts
├── franchisee_profiles — Franchisee company profiles
├── royalty_records — Royalty calculations and payments
├── brand_compliance_audits — Compliance check records
└── franchise_support_tickets — Franchisee support
```

### 11.4 Expansion Design Rules

Any future module added to PRV **must**:

1. **Use the Universal Column Contract** — every table has `id`, `company_id`, `created_at`, `updated_at`, `created_by`, `updated_by`, `deleted_at`, `deleted_by`
2. **Register in `platform_modules`** before any data tables are created
3. **Create a `company_module_subscriptions` entry** before any company data is stored
4. **Define permissions** in the `permissions` table using the `{module}.{resource}.{action}` slug pattern
5. **Define notification templates** for every significant event
6. **Define KPI definitions** for every measurable metric
7. **Emit analytics events** for every user action
8. **Write to audit_logs** for every write operation
9. **Support custom fields** via `custom_field_definitions`
10. **Support document attachments** via polymorphic reference to `documents`

---

## 12. ENTITY CATALOG & SUMMARY

### 12.1 Complete Entity List

| # | Entity | Module | Rows Est. (3yr) |
|---|--------|--------|----------------|
| 1 | groups | Foundation | < 10 |
| 2 | companies | Foundation | < 1,000 |
| 3 | divisions | Foundation | < 10,000 |
| 4 | departments | Foundation | < 50,000 |
| 5 | teams | Foundation | < 100,000 |
| 6 | locations | Foundation | < 50,000 |
| 7 | regions | Foundation | < 5,000 |
| 8 | users | Identity | < 1,000,000 |
| 9 | user_profiles | Identity | = users |
| 10 | user_company_memberships | Identity | < 3,000,000 |
| 11 | user_team_memberships | Identity | < 5,000,000 |
| 12 | roles | Permissions | < 10,000 |
| 13 | permissions | Permissions | < 1,000 |
| 14 | role_permissions | Permissions | < 100,000 |
| 15 | user_role_assignments | Permissions | < 5,000,000 |
| 16 | permission_overrides | Permissions | < 100,000 |
| 17 | projects | Projects | < 500,000 |
| 18 | project_phases | Projects | < 2,000,000 |
| 19 | milestones | Projects | < 10,000,000 |
| 20 | tasks | Projects | < 50,000,000 |
| 21 | task_assignments | Projects | < 100,000,000 |
| 22 | time_entries | Projects | < 200,000,000 |
| 23 | project_issues | Projects | < 10,000,000 |
| 24 | project_journal_entries | Projects | < 20,000,000 |
| 25 | project_team_assignments | Projects | < 2,000,000 |
| 26 | shifts | Attendance | < 10,000 |
| 27 | schedules | Attendance | < 100,000 |
| 28 | schedule_assignments | Attendance | < 500,000,000 |
| 29 | attendance_entries | Attendance | < 2,000,000,000 |
| 30 | leave_types | Attendance | < 100,000 |
| 31 | leave_requests | Attendance | < 50,000,000 |
| 32 | overtime_records | Attendance | < 100,000,000 |
| 33 | product_categories | Shop | < 1,000,000 |
| 34 | products | Shop | < 10,000,000 |
| 35 | product_variants | Shop | < 50,000,000 |
| 36 | inventory_items | Shop | < 500,000,000 |
| 37 | inventory_movements | Shop | < 5,000,000,000 |
| 38 | suppliers | Shop | < 1,000,000 |
| 39 | purchase_orders | Shop | < 10,000,000 |
| 40 | purchase_order_items | Shop | < 100,000,000 |
| 41 | orders | Shop | < 100,000,000 |
| 42 | order_items | Shop | < 500,000,000 |
| 43 | order_returns | Shop | < 10,000,000 |
| 44 | promotions | Shop | < 1,000,000 |
| 45 | customers | CRM | < 10,000,000 |
| 46 | leads | CRM | < 50,000,000 |
| 47 | quotes | CRM | < 20,000,000 |
| 48 | quote_items | CRM | < 100,000,000 |
| 49 | customer_activities | CRM | < 500,000,000 |
| 50 | customer_segments | CRM | < 100,000 |
| 51 | invoices | Finance | < 100,000,000 |
| 52 | payments | Finance | < 200,000,000 |
| 53 | expenses | Finance | < 500,000,000 |
| 54 | budgets | Finance | < 1,000,000 |
| 55 | budget_lines | Finance | < 50,000,000 |
| 56 | revenue_records | Finance | < 1,000,000,000 |
| 57 | documents | Documents | < 500,000,000 |
| 58 | document_versions | Documents | < 2,000,000,000 |
| 59 | document_approvals | Documents | < 200,000,000 |
| 60 | document_signatures | Documents | < 100,000,000 |
| 61 | conversations | Communication | < 100,000,000 |
| 62 | conversation_members | Communication | < 500,000,000 |
| 63 | messages | Communication | < 10,000,000,000 |
| 64 | inbox_items | Communication | < 10,000,000,000 |
| 65 | notifications | Notifications | < 10,000,000,000 |
| 66 | notification_events | Notifications | < 50,000,000,000 |
| 67 | push_tokens | Notifications | < 10,000,000 |
| 68 | analytics_events | Analytics | < 100,000,000,000 |
| 69 | kpi_definitions | Analytics | < 10,000 |
| 70 | kpi_targets | Analytics | < 1,000,000 |
| 71 | kpi_snapshots | Analytics | < 1,000,000,000 |
| 72 | anomaly_detections | Analytics | < 100,000,000 |
| 73 | ai_conversations | AI | < 1,000,000,000 |
| 74 | ai_messages | AI | < 10,000,000,000 |
| 75 | ai_insights | AI | < 500,000,000 |
| 76 | ai_forecasts | AI | < 100,000,000 |
| 77 | ai_forecast_points | AI | < 5,000,000,000 |
| 78 | ai_risk_detections | AI | < 100,000,000 |
| 79 | audit_logs | Audit | < 100,000,000,000 |
| 80 | gdpr_requests | Audit | < 10,000,000 |
| 81 | trusted_devices | Security | < 100,000,000 |
| 82 | user_sessions | Security | < 10,000,000,000 |
| 83 | user_mfa_configs | Security | < 5,000,000 |
| 84 | security_events | Security | < 10,000,000,000 |
| 85 | user_risk_scores | Security | < 5,000,000 |
| 86 | lockdown_records | Security | < 1,000,000 |
| 87 | file_objects | Storage | < 50,000,000,000 |
| 88 | storage_buckets | Storage | < 10,000 |
| 89 | retention_policies | Storage | < 10,000 |
| 90 | workflow_definitions | Workflow | < 100,000 |
| 91 | workflow_instances | Workflow | < 1,000,000,000 |
| 92 | workflow_step_instances | Workflow | < 5,000,000,000 |
| 93 | automation_rules | Workflow | < 1,000,000 |
| 94 | settings | Config | < 100,000,000 |
| 95 | feature_flags | Config | < 10,000 |
| 96 | platform_modules | Config | < 1,000 |
| 97 | company_module_subscriptions | Config | < 100,000 |
| 98 | custom_field_definitions | Extension | < 10,000,000 |
| 99 | custom_field_values | Extension | < 100,000,000,000 |
| 100 | cross_company_access | Multi-company | < 10,000 |

### 12.2 Partitioning Strategy (High-Volume Tables)

Tables exceeding 100M rows use partitioning:

| Table | Strategy | Partition Key | Retention |
|-------|----------|--------------|-----------|
| `audit_logs` | Range by month | `(company_id, occurred_at)` | 7 years cold |
| `analytics_events` | Range by month | `(company_id, occurred_at)` | 3 years warm |
| `attendance_entries` | Range by month | `(company_id, date)` | 7 years |
| `notifications` | Range by month | `(company_id, created_at)` | 2 years |
| `inbox_items` | Range by month | `(company_id, created_at)` | 1 year hot, archive |
| `messages` | Range by month | `(company_id, created_at)` | 5 years |
| `inventory_movements` | Range by month | `(company_id, created_at)` | 5 years |
| `user_sessions` | Range by month | `(created_at)` | 90 days hot |
| `security_events` | Range by month | `(company_id, occurred_at)` | 7 years |
| `ai_messages` | Range by month | `(company_id, created_at)` | 1 year |
| `kpi_snapshots` | Range by month | `(company_id, period_start)` | 5 years |

### 12.3 Scalability Targets Met

| Requirement | Design Support |
|-------------|---------------|
| 100+ companies | Row-level multi-tenancy + company_id isolation |
| 1,000+ stores | locations table + region grouping |
| 10,000+ employees | user_company_memberships + team structure |
| Millions of records | Partitioning + indexing strategy |
| Millions of notifications | notification_events pipeline + partitioned notifications |
| Millions of audit events | Append-only partitioned audit_logs, cold archival |
| Future modules | platform_modules registry + custom_field extension system |
| Zero redesign for expansion | Module registry + extension model |

---

*PRV Database Architecture · Pasul 7 · Source of Truth*  
*100 entities · Enterprise scale · Zero Trust data model*  
*Do not modify without approval from Lead Architect.*
