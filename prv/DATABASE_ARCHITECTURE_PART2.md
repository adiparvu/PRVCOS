# PRV DATABASE ARCHITECTURE — PART 2
# Missing & Supplementary Entities

**Version**: 1.0  
**Status**: Official Blueprint — Supplement to DATABASE_ARCHITECTURE.md  
**Purpose**: Defines all entities referenced in Part 1 but not fully specified,  
plus all remaining module entities required by the Pasul 7 specification.

---

## TABLE OF CONTENTS

1. [Dashboard & Widget Entities](#1-dashboard--widget-entities)
2. [Shop — Missing Entities](#2-shop--missing-entities)
3. [Finance — Missing Entities](#3-finance--missing-entities)
4. [Document — Missing Entities](#4-document--missing-entities)
5. [Communication — Missing Entities](#5-communication--missing-entities)
6. [CRM — Missing Entities](#6-crm--missing-entities)
7. [HR — Missing Entities](#7-hr--missing-entities)
8. [Analytics — Missing Snapshot Tables](#8-analytics--missing-snapshot-tables)
9. [Project — Missing Entities](#9-project--missing-entities)
10. [Supplementary Relationship Rules](#10-supplementary-relationship-rules)
11. [Consolidated Entity Catalog Addendum](#11-consolidated-entity-catalog-addendum)

---

## 1. DASHBOARD & WIDGET ENTITIES

From `CLAUDE.md` Core Entities requirement: **Widgets, Dashboards, Settings** must be fully specified.

### `dashboard_definitions` — Saved Dashboard Layouts

A dashboard definition is a named, saved layout. Users can have multiple dashboards and switch between them.

```
dashboard_definitions
├── id: UUID
├── company_id: UUID → companies
├── owner_id: UUID → users — Creator (null for template dashboards)
├── name: VARCHAR(255) — "My Daily Dashboard", "Weekly Review"
├── type: ENUM(personal, role_template, company_template, global_template)
├── role_id: UUID → roles — For role_template type
├── is_default: BOOLEAN — Default on login
├── is_published: BOOLEAN — Visible to others (templates)
├── is_mandatory: BOOLEAN — Company-set, users cannot deviate
├── zone_config: JSONB — Zone visibility + order: [{zone_id, visible, order, collapsed}]
├── quick_actions_order: TEXT[] — Ordered action slugs
├── notification_preferences: JSONB — Zone 2 threshold, AI frequency
├── data_preferences: JSONB — Default period, currency display, number format
├── device_overrides: JSONB — {mobile: {...}, tablet: {...}, desktop: {...}}
├── cloned_from_id: UUID → dashboard_definitions — If forked from template
└── [Universal Columns]
```

### `dashboard_widget_instances` — Widget Placements on a Dashboard

Each row = one widget placed at a specific position on a specific dashboard.

```
dashboard_widget_instances
├── id: UUID
├── company_id: UUID → companies
├── dashboard_id: UUID → dashboard_definitions
├── widget_type: VARCHAR(100) — "kpi.revenue", "team.attendance", "ai.insights"
├── zone: ENUM(my_day, important_now, kpi, activity, quick_actions, ai, inbox, calendar)
├── position_x: SMALLINT — Grid column (0-based)
├── position_y: SMALLINT — Grid row (0-based)
├── size: ENUM(micro, small, medium, large)
├── is_pinned: BOOLEAN — Pinned widgets always stay at top of zone
├── config: JSONB — Widget-specific config: period, breakdown, filters, alert_threshold
├── alert_config: JSONB — {threshold_type, threshold_value, severity, channels}
└── [Universal Columns]
```

### `widget_definitions` — Platform Widget Catalog

All available widget types are registered here. This is the source of truth for the Widget Library.

```
widget_definitions
├── id: UUID
├── type: VARCHAR(100) — Unique slug: "kpi.revenue", "shop.orders_today"
├── category: ENUM(personal, team, project, shop, finance, analytics, executive, ai)
├── name: VARCHAR(255)
├── description: TEXT
├── size_options: TEXT[] — ["small", "medium", "large"]
├── default_size: ENUM(micro, small, medium, large)
├── roles_eligible: TEXT[] — Role slugs. Empty = all roles
├── permissions_required: TEXT[] — Permission slugs required to see this widget
├── scope_minimum: ENUM(self, team, location, department, division, company, global)
├── data_source_module: VARCHAR(100) — Which platform module provides data
├── refresh_interval_seconds: INTEGER
├── supports_drill_down: BOOLEAN
├── supports_comparison: BOOLEAN
├── supports_export: BOOLEAN
├── supports_alert: BOOLEAN
├── is_pinnable: BOOLEAN
├── is_hideable: BOOLEAN
├── is_resizable: BOOLEAN
├── is_active: BOOLEAN
└── [Universal Columns — no company_id, platform-level]
```

### `saved_views` — Saved Dashboard Filter States

```
saved_views
├── id: UUID
├── company_id: UUID → companies
├── user_id: UUID → users
├── name: VARCHAR(255)
├── type: ENUM(dashboard_view, report_filter, search_query, kpi_config)
├── config: JSONB — Full filter/sort/period state
├── is_shared: BOOLEAN
├── share_token: VARCHAR(100) — URL-shareable token
└── [Universal Columns]
```

### `user_favorites` — Pinned Records Across Modules

```
user_favorites
├── id: UUID
├── company_id: UUID → companies
├── user_id: UUID → users
├── entity_type: VARCHAR(100) — "project", "product", "customer", "document"
├── entity_id: UUID
├── entity_name: VARCHAR(500) — Snapshot of name at time of favoriting
├── order_index: SMALLINT — User-defined sort order
├── last_accessed_at: TIMESTAMPTZ
└── [Universal Columns]
```

---

## 2. SHOP — MISSING ENTITIES

### `coupons`

Referenced in `orders.coupon_id` but not previously defined.

```
coupons
├── id: UUID
├── company_id: UUID → companies
├── promotion_id: UUID → promotions — Optional: coupons can be standalone
├── code: VARCHAR(100) — Unique per company: "PROMO2026"
├── type: ENUM(percentage, fixed_amount, free_shipping, free_product)
├── discount_value: DECIMAL(10,4)
├── min_order_value: DECIMAL(12,2)
├── max_discount_amount: DECIMAL(12,2)
├── is_single_use: BOOLEAN — One use per customer
├── usage_limit_total: INTEGER — Max total uses (null = unlimited)
├── usage_limit_per_user: INTEGER
├── usage_count: INTEGER — Computed
├── applicable_to: ENUM(all, category, product, customer_segment)
├── applicable_ids: UUID[]
├── customer_id: UUID → customers — Personal coupon (null = public)
├── starts_at: TIMESTAMPTZ
├── expires_at: TIMESTAMPTZ
├── is_active: BOOLEAN
└── [Universal Columns]
```

### `coupon_usages`

```
coupon_usages
├── id: UUID
├── company_id: UUID → companies
├── coupon_id: UUID → coupons
├── order_id: UUID → orders
├── customer_id: UUID → customers
├── discount_applied: DECIMAL(12,2)
└── [Universal Columns]
```

### `product_reviews`

```
product_reviews
├── id: UUID
├── company_id: UUID → companies
├── product_id: UUID → products
├── variant_id: UUID → product_variants — Nullable
├── customer_id: UUID → customers
├── order_id: UUID → orders — Requires purchase to review
├── rating: SMALLINT — 1–5
├── title: VARCHAR(255)
├── body: TEXT
├── status: ENUM(pending, approved, rejected, flagged)
├── is_verified_purchase: BOOLEAN
├── helpful_count: INTEGER — Upvotes from other customers
├── reported_at: TIMESTAMPTZ — If flagged as inappropriate
├── moderated_by: UUID → users
├── moderated_at: TIMESTAMPTZ
└── [Universal Columns]
```

### `product_review_images`

```
product_review_images
├── id: UUID
├── company_id: UUID → companies
├── review_id: UUID → product_reviews
├── file_id: UUID → file_objects
├── order_index: SMALLINT
└── [Universal Columns]
```

### `warehouses` — Dedicated Warehouse Entity

While `locations` covers warehouses, dedicated warehouse operations require additional fields:

```
warehouses
├── id: UUID
├── company_id: UUID → companies
├── location_id: UUID → locations — Extends the locations record
├── type: ENUM(central, regional, transit, cold_storage, bonded)
├── capacity_sqm: DECIMAL(10,2)
├── capacity_units: INTEGER
├── manager_id: UUID → users
├── accepts_returns: BOOLEAN
├── picking_strategy: ENUM(fifo, lifo, fefo, nearest)
└── [Universal Columns]
```

### `stock_transfers` — Inventory Movement Between Locations

```
stock_transfers
├── id: UUID
├── company_id: UUID → companies
├── from_location_id: UUID → locations
├── to_location_id: UUID → locations
├── status: ENUM(draft, requested, approved, in_transit, received, cancelled)
├── requested_by: UUID → users
├── approved_by: UUID → users
├── shipped_at: TIMESTAMPTZ
├── received_at: TIMESTAMPTZ
├── notes: TEXT
└── [Universal Columns]
```

### `stock_transfer_items`

```
stock_transfer_items
├── id: UUID
├── company_id: UUID → companies
├── transfer_id: UUID → stock_transfers
├── product_id: UUID → products
├── variant_id: UUID → product_variants
├── quantity_requested: DECIMAL(12,3)
├── quantity_shipped: DECIMAL(12,3)
├── quantity_received: DECIMAL(12,3)
└── [Universal Columns]
```

---

## 3. FINANCE — MISSING ENTITIES

### `invoice_items`

Referenced by `invoices` but not previously defined.

```
invoice_items
├── id: UUID
├── company_id: UUID → companies
├── invoice_id: UUID → invoices
├── product_id: UUID → products — Nullable (free-form lines allowed)
├── description: VARCHAR(500)
├── quantity: DECIMAL(12,3)
├── unit_price: DECIMAL(12,4)
├── discount_percent: DECIMAL(5,2)
├── tax_rate: DECIMAL(5,4)
├── tax_amount: DECIMAL(12,4) — Computed
├── line_total: DECIMAL(15,2) — Computed: qty × unit_price × (1 - discount) × (1 + tax)
└── [Universal Columns]
```

### `expense_categories`

Referenced in `expenses.category_id` but not previously defined.

```
expense_categories
├── id: UUID
├── company_id: UUID → companies — Nullable for global categories
├── parent_id: UUID → expense_categories — Nested categories
├── name: VARCHAR(255) — "Travel", "Materials", "Software"
├── code: VARCHAR(20)
├── is_project_billable: BOOLEAN — Can be billed to client
├── requires_receipt: BOOLEAN
├── approval_threshold: DECIMAL(12,2) — Requires approval above this amount
├── is_active: BOOLEAN
└── [Universal Columns]
```

### `expense_reports` — Grouped Expense Submissions

```
expense_reports
├── id: UUID
├── company_id: UUID → companies
├── submitted_by: UUID → users
├── title: VARCHAR(255)
├── period_start: DATE
├── period_end: DATE
├── total_amount: DECIMAL(15,2) — Computed from expenses
├── status: ENUM(draft, submitted, approved, rejected, paid, cancelled)
├── approved_by: UUID → users
├── approved_at: TIMESTAMPTZ
├── rejection_reason: TEXT
├── paid_at: TIMESTAMPTZ
└── [Universal Columns]
```

### `cashflow_entries` — Cashflow Ledger

Tracks every cash movement for cashflow reporting and forecasting.

```
cashflow_entries
├── id: UUID
├── company_id: UUID → companies
├── type: ENUM(inflow, outflow)
├── category: ENUM(revenue, investment, loan, tax_refund, other_in,
│                   opex, capex, payroll, tax, loan_repayment, other_out)
├── amount: DECIMAL(15,2)
├── currency: CHAR(3)
├── description: VARCHAR(500)
├── source_type: VARCHAR(100) — "payment", "expense", "payroll"
├── source_id: UUID — Polymorphic reference
├── effective_date: DATE
├── is_actual: BOOLEAN — False = forecast entry
├── forecast_id: UUID → financial_forecasts — For forecast entries
└── [Universal Columns]
```

### `financial_forecasts`

```
financial_forecasts
├── id: UUID
├── company_id: UUID → companies
├── name: VARCHAR(255) — "Q3 2026 Forecast"
├── type: ENUM(revenue, expense, cashflow, profit_loss, budget_projection)
├── period_type: ENUM(monthly, quarterly, annual)
├── period_start: DATE
├── period_end: DATE
├── status: ENUM(draft, active, superseded)
├── generated_by: ENUM(manual, ai)
├── ai_insight_id: UUID → ai_insights — If AI-generated
├── notes: TEXT
└── [Universal Columns]
```

### `financial_forecast_lines`

```
financial_forecast_lines
├── id: UUID
├── company_id: UUID → companies
├── forecast_id: UUID → financial_forecasts
├── period_date: DATE — First day of period
├── category: VARCHAR(100)
├── description: TEXT
├── forecasted_amount: DECIMAL(15,2)
├── actual_amount: DECIMAL(15,2) — Populated after period ends
├── variance: DECIMAL(15,2) — Computed: actual - forecasted
└── [Universal Columns]
```

### `profitability_records` — Profitability per Entity

Tracks profitability (revenue minus costs) per project, store, department, and period.

```
profitability_records
├── id: UUID
├── company_id: UUID → companies
├── entity_type: ENUM(company, division, department, location, project, team)
├── entity_id: UUID
├── period_type: ENUM(daily, weekly, monthly, quarterly, annual)
├── period_start: DATE
├── period_end: DATE
├── revenue: DECIMAL(15,2)
├── cogs: DECIMAL(15,2) — Cost of goods sold
├── gross_profit: DECIMAL(15,2) — Computed: revenue - cogs
├── gross_margin: DECIMAL(7,4) — Computed: gross_profit / revenue
├── operating_expenses: DECIMAL(15,2)
├── ebitda: DECIMAL(15,2)
├── net_profit: DECIMAL(15,2)
├── net_margin: DECIMAL(7,4)
├── computed_at: TIMESTAMPTZ
└── [No universal columns — computed data, no soft delete]
```

### `tax_records`

```
tax_records
├── id: UUID
├── company_id: UUID → companies
├── type: ENUM(vat, income_tax, social_contribution, other)
├── period_start: DATE
├── period_end: DATE
├── taxable_amount: DECIMAL(15,2)
├── tax_rate: DECIMAL(5,4)
├── tax_due: DECIMAL(15,2)
├── tax_paid: DECIMAL(15,2)
├── due_date: DATE
├── status: ENUM(pending, filed, paid, overdue, disputed)
├── filing_reference: VARCHAR(100)
├── paid_at: TIMESTAMPTZ
└── [Universal Columns]
```

### `payroll_runs`

```
payroll_runs
├── id: UUID
├── company_id: UUID → companies
├── period_start: DATE
├── period_end: DATE
├── payment_date: DATE
├── status: ENUM(draft, processing, approved, paid, failed, cancelled)
├── total_gross: DECIMAL(15,2)
├── total_deductions: DECIMAL(15,2)
├── total_net: DECIMAL(15,2)
├── employee_count: INTEGER
├── approved_by: UUID → users
├── approved_at: TIMESTAMPTZ
└── [Universal Columns]
```

### `payroll_entries` — Per-Employee Payroll Line

```
payroll_entries
├── id: UUID
├── company_id: UUID → companies
├── payroll_run_id: UUID → payroll_runs
├── user_id: UUID → users
├── regular_hours: DECIMAL(8,2)
├── overtime_hours: DECIMAL(8,2)
├── gross_salary: DECIMAL(12,2)
├── deductions: JSONB — [{type, description, amount}]
├── total_deductions: DECIMAL(12,2)
├── net_salary: DECIMAL(12,2)
├── currency: CHAR(3)
├── payment_method: ENUM(bank_transfer, cash, check)
├── bank_account_data: JSONB — Encrypted
├── paid_at: TIMESTAMPTZ
└── [Universal Columns]
```

---

## 4. DOCUMENT — MISSING ENTITIES

### `document_comments`

```
document_comments
├── id: UUID
├── company_id: UUID → companies
├── document_id: UUID → documents
├── version_id: UUID → document_versions — Comment on specific version
├── author_id: UUID → users
├── parent_comment_id: UUID → document_comments — Threaded replies
├── content: TEXT
├── resolved_at: TIMESTAMPTZ
├── resolved_by: UUID → users
└── [Universal Columns]
```

### `document_categories`

Referenced in `documents.category_id` but not previously defined.

```
document_categories
├── id: UUID
├── company_id: UUID → companies — Nullable for global categories
├── parent_id: UUID → document_categories — Nested
├── name: VARCHAR(255)
├── description: TEXT
├── default_classification: ENUM(public, internal, confidential, restricted, executive_vault)
├── default_retention_policy_id: UUID → retention_policies
├── is_active: BOOLEAN
└── [Universal Columns]
```

### `document_access_permissions`

Explicit access grants on documents beyond role-based access.

```
document_access_permissions
├── id: UUID
├── company_id: UUID → companies
├── document_id: UUID → documents
├── grantee_type: ENUM(user, role, team, department)
├── grantee_id: UUID
├── access_level: ENUM(view, comment, edit, approve, admin)
├── granted_by: UUID → users
├── expires_at: TIMESTAMPTZ
└── [Universal Columns]
```

---

## 5. COMMUNICATION — MISSING ENTITIES

### `mentions`

```
mentions
├── id: UUID
├── company_id: UUID → companies
├── mentioned_user_id: UUID → users
├── mentioned_by_id: UUID → users
├── context_type: ENUM(message, comment, task, document)
├── context_id: UUID — ID of the message/comment/task containing the mention
├── is_read: BOOLEAN
├── read_at: TIMESTAMPTZ
└── [Universal Columns]
```

### `announcements`

```
announcements
├── id: UUID
├── company_id: UUID → companies
├── author_id: UUID → users
├── title: VARCHAR(500)
├── content: TEXT
├── type: ENUM(company_wide, division, department, team, location, role)
├── target_ids: UUID[] — Division/department/team/location IDs (empty = all)
├── target_role_slugs: TEXT[] — For role-targeted announcements
├── priority: ENUM(normal, important, critical)
├── requires_acknowledgement: BOOLEAN
├── publish_at: TIMESTAMPTZ
├── expires_at: TIMESTAMPTZ
├── is_pinned: BOOLEAN
├── attachment_ids: UUID[] — → file_objects
└── [Universal Columns]
```

### `announcement_acknowledgements`

```
announcement_acknowledgements
├── id: UUID
├── company_id: UUID → companies
├── announcement_id: UUID → announcements
├── user_id: UUID → users
├── acknowledged_at: TIMESTAMPTZ
└── [Universal Columns]
```

### `message_reactions`

```
message_reactions
├── id: UUID
├── company_id: UUID → companies
├── message_id: UUID → messages
├── user_id: UUID → users
├── emoji: VARCHAR(10) — Unicode emoji
└── [Universal Columns]
```

### `message_attachments`

```
message_attachments
├── id: UUID
├── company_id: UUID → companies
├── message_id: UUID → messages
├── file_id: UUID → file_objects
├── order_index: SMALLINT
└── [Universal Columns]
```

### `activity_feeds` — Per-Entity Activity Stream

```
activity_feeds
├── id: UUID
├── company_id: UUID → companies
├── subject_type: VARCHAR(100) — "project", "order", "customer"
├── subject_id: UUID
├── actor_id: UUID → users
├── action: VARCHAR(200) — Human-readable: "created task", "approved leave"
├── detail: JSONB — Action-specific detail
├── occurred_at: TIMESTAMPTZ
└── [No universal columns — append-only]
```

---

## 6. CRM — MISSING ENTITIES

### `customer_communications`

All recorded communications with customers (calls, emails, visits).

```
customer_communications
├── id: UUID
├── company_id: UUID → companies
├── customer_id: UUID → customers
├── lead_id: UUID → leads — Nullable
├── user_id: UUID → users — PRV employee who handled
├── type: ENUM(email, phone_call, sms, meeting, site_visit, chat, other)
├── direction: ENUM(inbound, outbound)
├── subject: VARCHAR(500)
├── content: TEXT
├── duration_minutes: INTEGER — For calls/meetings
├── outcome: TEXT
├── follow_up_required: BOOLEAN
├── follow_up_date: DATE
├── attachments: UUID[] — → file_objects
├── occurred_at: TIMESTAMPTZ
└── [Universal Columns]
```

### `customer_segment_memberships`

Links customers to segments (both manual and dynamic).

```
customer_segment_memberships
├── id: UUID
├── company_id: UUID → companies
├── segment_id: UUID → customer_segments
├── customer_id: UUID → customers
├── added_at: TIMESTAMPTZ
├── added_by: UUID → users — Null for auto-added (dynamic)
├── is_auto: BOOLEAN — True for dynamic segment membership
└── [Universal Columns]
```

### `customer_lifetime_value_snapshots`

Computed LTV snapshots per customer per period.

```
customer_lifetime_value_snapshots
├── id: UUID
├── company_id: UUID → companies
├── customer_id: UUID → customers
├── snapshot_date: DATE
├── total_revenue: DECIMAL(15,2) — All-time revenue from this customer
├── total_orders: INTEGER
├── average_order_value: DECIMAL(12,2)
├── first_order_at: TIMESTAMPTZ
├── last_order_at: TIMESTAMPTZ
├── active_months: INTEGER — Months with at least one purchase
├── predicted_ltv_12m: DECIMAL(15,2) — AI-predicted next 12 months
├── churn_probability: DECIMAL(5,4) — 0.000–1.000
├── customer_segment: VARCHAR(100) — "champion", "at_risk", "lost"
└── [No universal columns — computed]
```

### `lead_sources`

```
lead_sources
├── id: UUID
├── company_id: UUID → companies
├── name: VARCHAR(255) — "Google Ads", "Referral — Partner A"
├── type: ENUM(organic, paid, referral, social, event, other)
├── utm_source: VARCHAR(100)
├── utm_medium: VARCHAR(100)
├── utm_campaign: VARCHAR(100)
├── cost: DECIMAL(12,2)
├── period_start: DATE
├── period_end: DATE
└── [Universal Columns]
```

---

## 7. HR — MISSING ENTITIES

### `employee_documents`

HR-specific documents for each employee.

```
employee_documents
├── id: UUID
├── company_id: UUID → companies
├── user_id: UUID → users — The employee
├── type: ENUM(id_card, passport, contract, certificate, training, medical, other)
├── document_id: UUID → documents — Links to main document entity
├── issue_date: DATE
├── expiry_date: DATE
├── is_verified: BOOLEAN
├── verified_by: UUID → users
├── verified_at: TIMESTAMPTZ
└── [Universal Columns]
```

### `org_chart_positions`

```
org_chart_positions
├── id: UUID
├── company_id: UUID → companies
├── title: VARCHAR(255) — "Operations Manager"
├── department_id: UUID → departments
├── reports_to_position_id: UUID → org_chart_positions
├── holder_id: UUID → users — Current holder (nullable if vacant)
├── is_vacant: BOOLEAN
├── headcount_target: INTEGER
└── [Universal Columns]
```

### `training_records`

```
training_records
├── id: UUID
├── company_id: UUID → companies
├── user_id: UUID → users
├── training_name: VARCHAR(500)
├── provider: VARCHAR(255)
├── type: ENUM(internal, external, online, certification)
├── completed_at: DATE
├── expires_at: DATE
├── certificate_file_id: UUID → file_objects
├── cost: DECIMAL(10,2)
└── [Universal Columns]
```

### `disciplinary_records`

```
disciplinary_records
├── id: UUID
├── company_id: UUID → companies
├── user_id: UUID → users — The employee
├── type: ENUM(verbal_warning, written_warning, final_warning, suspension, termination)
├── reason: TEXT
├── date: DATE
├── issued_by: UUID → users — HR Manager
├── document_id: UUID → documents — Supporting document
├── employee_acknowledged: BOOLEAN
├── acknowledged_at: TIMESTAMPTZ
└── [Universal Columns]
```

### `public_holidays`

```
public_holidays
├── id: UUID
├── company_id: UUID → companies — Nullable for country defaults
├── country_code: CHAR(2)
├── name: VARCHAR(255)
├── date: DATE
├── is_paid: BOOLEAN
├── applies_to_location_ids: UUID[] — Specific locations; empty = all
└── [Universal Columns]
```

---

## 8. ANALYTICS — MISSING SNAPSHOT TABLES

### `customer_analytics_snapshots` (daily)

```
customer_analytics_snapshots
├── id: UUID
├── company_id: UUID
├── snapshot_date: DATE
├── new_customers: INTEGER
├── active_customers: INTEGER — At least 1 purchase in last 90 days
├── churned_customers: INTEGER — No purchase in 180 days
├── total_leads: INTEGER
├── leads_converted: INTEGER
├── conversion_rate: DECIMAL(7,4)
├── average_ltv: DECIMAL(15,2)
├── nps_score: DECIMAL(5,2)
├── total_quotes_sent: INTEGER
├── quotes_accepted: INTEGER
├── quote_acceptance_rate: DECIMAL(7,4)
└── [No universal columns — computed]
```

### `hr_analytics_snapshots` (daily)

```
hr_analytics_snapshots
├── id: UUID
├── company_id: UUID
├── snapshot_date: DATE
├── total_employees: INTEGER
├── active_employees: INTEGER
├── employees_on_leave: INTEGER
├── new_hires: INTEGER — This period
├── terminations: INTEGER — This period
├── turnover_rate: DECIMAL(7,4)
├── attendance_rate: DECIMAL(7,4)
├── average_tenure_months: DECIMAL(8,2)
├── open_positions: INTEGER
├── training_completions: INTEGER
├── compliance_rate: DECIMAL(7,4) — % employees with valid documents
└── [No universal columns — computed]
```

### `executive_analytics_snapshots` (daily)

Consolidated snapshot for CEO / Executive Cockpit.

```
executive_analytics_snapshots
├── id: UUID
├── company_id: UUID
├── snapshot_date: DATE
├── revenue: DECIMAL(15,2)
├── revenue_vs_target: DECIMAL(7,4)
├── gross_profit: DECIMAL(15,2)
├── net_profit: DECIMAL(15,2)
├── cash_position: DECIMAL(15,2)
├── shop_revenue: DECIMAL(15,2)
├── active_projects: INTEGER
├── delayed_projects: INTEGER
├── workforce_attendance_rate: DECIMAL(7,4)
├── total_employees: INTEGER
├── new_orders: INTEGER
├── customer_nps: DECIMAL(5,2)
├── company_health_index: DECIMAL(5,2)
├── financial_health_score: DECIMAL(5,2)
├── operational_health_score: DECIMAL(5,2)
├── workforce_health_score: DECIMAL(5,2)
├── project_health_score: DECIMAL(5,2)
├── shop_health_score: DECIMAL(5,2)
├── system_health_score: DECIMAL(5,2)
└── [No universal columns — computed]
```

### `crm_analytics_snapshots` (daily)

```
crm_analytics_snapshots
├── id: UUID
├── company_id: UUID
├── snapshot_date: DATE
├── total_customers: INTEGER
├── new_leads: INTEGER
├── leads_qualified: INTEGER
├── pipeline_value: DECIMAL(15,2)
├── won_value: DECIMAL(15,2)
├── lost_value: DECIMAL(15,2)
├── win_rate: DECIMAL(7,4)
├── average_deal_cycle_days: DECIMAL(8,2)
└── [No universal columns — computed]
```

### `platform_usage_analytics` (daily)

For Superadmin and Analytics roles — tracks usage of PRV modules.

```
platform_usage_analytics
├── id: UUID
├── company_id: UUID
├── snapshot_date: DATE
├── module: VARCHAR(100)
├── active_users: INTEGER
├── sessions: INTEGER
├── actions_count: INTEGER
├── avg_session_duration_seconds: INTEGER
├── most_used_feature: VARCHAR(200)
└── [No universal columns — computed]
```

---

## 9. PROJECT — MISSING ENTITIES

### `project_photos`

Dedicated photo store for project sites and progress documentation.

```
project_photos
├── id: UUID
├── company_id: UUID → companies
├── project_id: UUID → projects
├── phase_id: UUID → project_phases — Nullable
├── uploaded_by: UUID → users
├── file_id: UUID → file_objects
├── category: ENUM(before, during, after, issue, safety, progress, material, other)
├── caption: TEXT
├── taken_at: TIMESTAMPTZ — EXIF timestamp if available
├── coordinates: POINT — GPS location if available
├── tags: TEXT[]
├── is_client_visible: BOOLEAN
└── [Universal Columns]
```

### `project_permissions`

Explicit per-user permission overrides within a project.

```
project_permissions
├── id: UUID
├── company_id: UUID → companies
├── project_id: UUID → projects
├── user_id: UUID → users
├── permission_slug: VARCHAR(200) — "projects.task.create", etc.
├── is_granted: BOOLEAN
├── granted_by: UUID → users
├── expires_at: TIMESTAMPTZ
└── [Universal Columns]
```

### `project_contracts`

```
project_contracts
├── id: UUID
├── company_id: UUID → companies
├── project_id: UUID → projects
├── customer_id: UUID → customers
├── type: ENUM(main_contract, subcontract, amendment, nda, warranty)
├── number: VARCHAR(100)
├── value: DECIMAL(15,2)
├── currency: CHAR(3)
├── status: ENUM(draft, negotiating, signed, active, expired, terminated, disputed)
├── document_id: UUID → documents — The contract document
├── signed_at: TIMESTAMPTZ
├── start_date: DATE
├── end_date: DATE
├── payment_terms: TEXT
└── [Universal Columns]
```

### `project_budgets`

Dedicated project budget management (distinct from company-level budgets).

```
project_budgets
├── id: UUID
├── company_id: UUID → companies
├── project_id: UUID → projects
├── version: INTEGER — Budget can be revised; each revision = new version
├── is_current: BOOLEAN
├── status: ENUM(draft, approved, locked)
├── total_budget: DECIMAL(15,2)
├── currency: CHAR(3)
├── contingency_percent: DECIMAL(5,2)
├── approved_by: UUID → users
├── approved_at: TIMESTAMPTZ
└── [Universal Columns]
```

### `project_budget_lines`

```
project_budget_lines
├── id: UUID
├── company_id: UUID → companies
├── project_budget_id: UUID → project_budgets
├── phase_id: UUID → project_phases — Nullable
├── category: ENUM(labor, materials, equipment, subcontractor, overhead, other)
├── description: VARCHAR(500)
├── planned_amount: DECIMAL(15,2)
├── actual_amount: DECIMAL(15,2) — Computed from expenses + POs
├── variance: DECIMAL(15,2) — Computed
└── [Universal Columns]
```

### `project_change_orders`

Formal change requests that alter scope, timeline, or budget.

```
project_change_orders
├── id: UUID
├── company_id: UUID → companies
├── project_id: UUID → projects
├── number: VARCHAR(50) — "CO-001"
├── title: VARCHAR(500)
├── description: TEXT
├── reason: ENUM(scope_change, client_request, unforeseen, design_change, other)
├── budget_impact: DECIMAL(15,2) — Positive = increase, negative = reduction
├── timeline_impact_days: INTEGER
├── status: ENUM(draft, submitted, approved, rejected, implemented)
├── submitted_by: UUID → users
├── approved_by: UUID → users
├── client_approved: BOOLEAN
└── [Universal Columns]
```

---

## 10. SUPPLEMENTARY RELATIONSHIP RULES

### 10.1 Widgets & Dashboards

```
widget_definitions (1) [platform catalog]
  └─── dashboard_widget_instances (N)
         └─── dashboard_definitions (1)
                └─── users (1, as owner)

Users can have N dashboards.
Each dashboard has N widget instances.
Widget instances reference the widget type from the catalog.
Widget instances carry their own config (period, filters) — never shared.
```

### 10.2 Coupon → Order Flow

```
coupons (1)
  ├─── coupon_usages (N)
  │      ├─── orders (1)
  │      └─── customers (1)
  └─── promotions (1, optional)

orders.coupon_id → coupons (FK)
Validation at order creation: check coupon.is_active, expires_at, usage_limit, customer eligibility
```

### 10.3 Payroll → Attendance → Finance

```
attendance_entries (N)
  → overtime_records (N)
    → payroll_entries (N)
      → payroll_runs (1)
        → payments (N)
          → cashflow_entries (N)
```

### 10.4 Profitability Computation Sources

```
profitability_records are computed from:
├── revenue_records (revenue side)
├── expenses (cost side)
├── payroll_entries (labor cost)
├── purchase_order_items (material cost)
└── time_entries (labor hours × rate)

Recomputed nightly for each entity_type × period combination.
```

### 10.5 Project Photos → File Objects

```
project_photos (N)
  └─── file_objects (1)
         └─── storage_buckets (1)

Photos are stored as file_objects with project_photos providing
project context, categorization, visibility flags, and GPS data.
```

### 10.6 Customer LTV Computation

```
customer_lifetime_value_snapshots computed from:
├── orders (total revenue, order count, AOV)
├── payments (confirmed revenue)
├── customer_activities (engagement signals)
└── ai_forecasts (predicted future LTV)

Snapshot runs nightly. Current snapshot = latest where snapshot_date = today.
```

---

## 11. CONSOLIDATED ENTITY CATALOG ADDENDUM

Entities added in Part 2 (supplement to Part 1's 100-entity catalog):

| # | Entity | Module | Notes |
|---|--------|--------|-------|
| 101 | `dashboard_definitions` | Dashboard | Saved dashboard layouts |
| 102 | `dashboard_widget_instances` | Dashboard | Widget placements |
| 103 | `widget_definitions` | Dashboard | Platform widget catalog |
| 104 | `saved_views` | Dashboard | Filter state snapshots |
| 105 | `user_favorites` | Dashboard | Pinned records |
| 106 | `coupons` | Shop | Discount coupon codes |
| 107 | `coupon_usages` | Shop | Coupon redemption log |
| 108 | `product_reviews` | Shop | Customer product reviews |
| 109 | `product_review_images` | Shop | Review photos |
| 110 | `warehouses` | Shop | Warehouse-specific details |
| 111 | `stock_transfers` | Shop | Inter-location transfers |
| 112 | `stock_transfer_items` | Shop | Transfer line items |
| 113 | `invoice_items` | Finance | Invoice line items |
| 114 | `expense_categories` | Finance | Expense classification |
| 115 | `expense_reports` | Finance | Grouped expense submissions |
| 116 | `cashflow_entries` | Finance | Cash movement ledger |
| 117 | `financial_forecasts` | Finance | Financial forecast headers |
| 118 | `financial_forecast_lines` | Finance | Forecast period lines |
| 119 | `profitability_records` | Finance | P&L per entity/period |
| 120 | `tax_records` | Finance | Tax obligation records |
| 121 | `payroll_runs` | Finance/HR | Payroll batch runs |
| 122 | `payroll_entries` | Finance/HR | Per-employee payroll |
| 123 | `document_comments` | Documents | Comments on documents |
| 124 | `document_categories` | Documents | Document classification |
| 125 | `document_access_permissions` | Documents | Explicit doc access grants |
| 126 | `mentions` | Communication | @mention records |
| 127 | `announcements` | Communication | Broadcast announcements |
| 128 | `announcement_acknowledgements` | Communication | Read receipts |
| 129 | `message_reactions` | Communication | Emoji reactions |
| 130 | `message_attachments` | Communication | Files in messages |
| 131 | `activity_feeds` | Communication | Per-entity activity stream |
| 132 | `customer_communications` | CRM | Logged customer interactions |
| 133 | `customer_segment_memberships` | CRM | Segment membership log |
| 134 | `customer_lifetime_value_snapshots` | CRM | LTV computed snapshots |
| 135 | `lead_sources` | CRM | UTM / campaign tracking |
| 136 | `employee_documents` | HR | Per-employee document records |
| 137 | `org_chart_positions` | HR | Organization chart nodes |
| 138 | `training_records` | HR | Employee training log |
| 139 | `disciplinary_records` | HR | HR disciplinary actions |
| 140 | `public_holidays` | HR | Holiday calendar |
| 141 | `customer_analytics_snapshots` | Analytics | CRM daily analytics |
| 142 | `hr_analytics_snapshots` | Analytics | HR daily analytics |
| 143 | `executive_analytics_snapshots` | Analytics | CEO cockpit daily data |
| 144 | `crm_analytics_snapshots` | Analytics | CRM pipeline daily data |
| 145 | `platform_usage_analytics` | Analytics | Module usage tracking |
| 146 | `project_photos` | Projects | Site progress photos |
| 147 | `project_permissions` | Projects | Per-user project permissions |
| 148 | `project_contracts` | Projects | Contract records |
| 149 | `project_budgets` | Projects | Versioned project budgets |
| 150 | `project_budget_lines` | Projects | Budget line items |
| 151 | `project_change_orders` | Projects | Formal scope changes |

**Grand Total: 151 entities** across all 18 platforms.

---

### 11.1 Complete Coverage Verification

| Requirement (Pasul 7) | Covered In |
|-----------------------|-----------|
| Companies, Divisions, Departments, Teams, Users | Part 1 — §2.1, §2.2 |
| Roles, Permissions, Scopes, Assignments | Part 1 — §2.3 |
| **Widgets, Dashboards** | **Part 2 — §1** |
| Settings | Part 1 — §2.13 |
| Audit Logs | Part 1 — §9 |
| Notifications | Part 1 — §6 |
| Projects, Phases, Milestones, Tasks, Subtasks | Part 1 — §2.4 |
| Project Teams, Documents, **Photos**, Journal, Analytics | Part 1 §2.4 + **Part 2 §9** |
| **Project Permissions, Change Orders, Budgets** | **Part 2 — §9** |
| Attendance, Check-In/Out, Shifts, Schedules, Leave, Overtime | Part 1 — §2.5 |
| Products, Categories, Inventory, Warehouses, Orders | Part 1 — §2.6 |
| **Reviews, Coupons**, Suppliers, Promotions | **Part 2 — §2** |
| Leads, Customers, Quotes, Activities | Part 1 — §2.7 |
| **Communications, Segments, LTV** | **Part 2 — §6** |
| Invoices, **Invoice Items**, Payments, Expenses | Part 1 + **Part 2 §3** |
| **Cashflow, Forecasts, Profitability, Payroll** | **Part 2 — §3** |
| Documents, Versions, **Comments**, Approvals, Signatures | Part 1 + **Part 2 §4** |
| Direct Messages, Channels, **Mentions, Announcements** | Part 1 + **Part 2 §5** |
| Activity Feeds, Inbox Items | Part 1 §2.10 + **Part 2 §5** |
| Push, Email, In-App Notifications, Preferences | Part 1 — §6 |
| Project/Shop/Finance/HR/**Customer/Executive** Analytics | Part 1 + **Part 2 §8** |
| AI Assistant, Conversations, Recommendations, Forecasts, Risks | Part 1 — §8 |
| Audit: Create/Update/Delete/Approve/Login/Export | Part 1 — §9 |
| Devices, Sessions, MFA, Security Events, Lockdown | Part 1 — §10 |
| File Storage, Versioning, Retention, Archive | Part 1 — §2.11 |
| Workflows, Approvals, Automations, Escalations | Part 1 — §2.12 |
| Future Modules: Academy, Marketplace, Property, Rentals, Franchise | Part 1 — §11 |
| 100+ companies, 1,000+ stores, 10,000+ employees | Part 1 — §12 |

**All 10 deliverables fully covered across Part 1 + Part 2.**

---

*PRV Database Architecture Part 2 · Pasul 7 Supplement · Source of Truth*  
*Entities 101–151 · All missing entities from Part 1 specification*  
*Do not modify without approval from Lead Architect.*
