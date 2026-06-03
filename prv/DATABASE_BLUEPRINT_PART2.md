# PRV — Database Blueprint Part 2
**Version:** 1.0
**Status:** APPROVED ARCHITECTURE
**Date:** 2026-06-03
**Scope:** Renovation Services · Shop · CRM · Finance · Documents · Communication · Supplier Management · Procurement · Tools & Fleet

---

## Table of Contents

- Section 9: Renovation Services
- Section 10: Shop
- Section 11: CRM
- Section 12: Finance
- Section 13: Document Center
- Section 14: Communication Center
- Section 15: Supplier Management
- Section 16: Procurement
- Section 17: Tools Management
- Section 18: Fleet Management

---

## Section 9 — Renovation Services (Module 22)

The Renovation Services module is the primary revenue platform. It manages the full lifecycle of renovation projects: client intake → estimation → contracting → execution → sign-off → invoicing.

---

### Table: renovation_projects

**Purpose:** Master record for each renovation engagement. One per client project.
**RLS Pattern:** Pattern 3 (scope-based — assigned employees + company)

| Column | Type | Null | Description |
|--------|------|------|-------------|
| id | UUID | NOT NULL | Primary key |
| company_id | UUID | NOT NULL | FK → companies.id |
| project_code | TEXT | NOT NULL | Human-readable code e.g. REN-2026-0041 |
| title | TEXT | NOT NULL | Project name |
| description | TEXT | NULL | Full brief |
| client_id | UUID | NOT NULL | FK → crm_clients.id |
| client_contact_id | UUID | NULL | FK → crm_contacts.id — primary contact |
| status | TEXT | NOT NULL | inquiry / estimation / contracted / in_progress / paused / completed / cancelled |
| priority | TEXT | NOT NULL | low / medium / high / critical |
| project_type | TEXT | NOT NULL | residential / commercial / industrial / public |
| address_line1 | TEXT | NOT NULL | Site address |
| address_line2 | TEXT | NULL | |
| city | TEXT | NOT NULL | |
| county | TEXT | NOT NULL | |
| country | TEXT | NOT NULL | Default: 'RO' |
| coordinates | POINT | NULL | GPS coordinates |
| estimated_start_date | DATE | NULL | |
| estimated_end_date | DATE | NULL | |
| actual_start_date | DATE | NULL | |
| actual_end_date | DATE | NULL | |
| estimated_value | NUMERIC(19,4) | NULL | Budget estimate |
| contracted_value | NUMERIC(19,4) | NULL | Final signed contract value |
| currency | CHAR(3) | NOT NULL | ISO 4217 default 'RON' |
| project_manager_id | UUID | NULL | FK → users.id |
| site_supervisor_id | UUID | NULL | FK → users.id |
| completion_percentage | NUMERIC(5,2) | NOT NULL | 0.00–100.00 |
| approval_instance_id | UUID | NULL | FK → approval_instances.id |
| approved_at | TIMESTAMPTZ | NULL | |
| approved_by | UUID | NULL | FK → users.id |
| notes | TEXT | NULL | Internal notes |
| metadata | JSONB | NOT NULL | Default '{}' |
| is_deleted | BOOLEAN | NOT NULL | Default false |
| deleted_at | TIMESTAMPTZ | NULL | |
| deleted_by | UUID | NULL | FK → users.id |
| created_at | TIMESTAMPTZ | NOT NULL | Default now() |
| updated_at | TIMESTAMPTZ | NOT NULL | Default now() |
| created_by | UUID | NOT NULL | FK → users.id |

**Indexes:**
- `(company_id, status)` — active project lists
- `(client_id)` — client history
- `(project_manager_id)` — PM workload
- `(status, estimated_end_date)` — deadline tracking
- `project_code` UNIQUE per company

**Relationships:**
- → crm_clients (many-to-one)
- → users (project manager, supervisor, approver)
- → approval_instances (sign-off workflow)
- ← renovation_phases (one-to-many)
- ← renovation_estimates (one-to-many)
- ← renovation_contracts (one-to-many)
- ← renovation_site_reports (one-to-many)
- ← renovation_materials (one-to-many)

---

### Table: renovation_phases

**Purpose:** Work phases within a renovation project (e.g., Demolition, Electrical, Finishing).
**RLS Pattern:** Pattern 3

| Column | Type | Null | Description |
|--------|------|------|-------------|
| id | UUID | NOT NULL | Primary key |
| company_id | UUID | NOT NULL | FK → companies.id |
| project_id | UUID | NOT NULL | FK → renovation_projects.id |
| phase_number | INTEGER | NOT NULL | Order within project |
| title | TEXT | NOT NULL | Phase name |
| description | TEXT | NULL | |
| status | TEXT | NOT NULL | pending / in_progress / paused / completed / cancelled |
| planned_start_date | DATE | NULL | |
| planned_end_date | DATE | NULL | |
| actual_start_date | DATE | NULL | |
| actual_end_date | DATE | NULL | |
| estimated_cost | NUMERIC(19,4) | NULL | |
| actual_cost | NUMERIC(19,4) | NULL | |
| completion_percentage | NUMERIC(5,2) | NOT NULL | Default 0 |
| requires_client_approval | BOOLEAN | NOT NULL | Default false |
| approval_instance_id | UUID | NULL | FK → approval_instances.id |
| client_approved_at | TIMESTAMPTZ | NULL | |
| supervisor_id | UUID | NULL | FK → users.id |
| lexorank | TEXT | NOT NULL | Ordering within project |
| is_deleted | BOOLEAN | NOT NULL | Default false |
| deleted_at | TIMESTAMPTZ | NULL | |
| created_at | TIMESTAMPTZ | NOT NULL | Default now() |
| updated_at | TIMESTAMPTZ | NOT NULL | Default now() |
| created_by | UUID | NOT NULL | FK → users.id |

**Indexes:**
- `(project_id, phase_number)`
- `(project_id, status)`
- `(company_id, status)`

---

### Table: renovation_tasks

**Purpose:** Granular work items within a phase. Assigned to workers or teams.
**RLS Pattern:** Pattern 3

| Column | Type | Null | Description |
|--------|------|------|-------------|
| id | UUID | NOT NULL | Primary key |
| company_id | UUID | NOT NULL | FK → companies.id |
| project_id | UUID | NOT NULL | FK → renovation_projects.id |
| phase_id | UUID | NOT NULL | FK → renovation_phases.id |
| title | TEXT | NOT NULL | |
| description | TEXT | NULL | |
| task_type | TEXT | NOT NULL | labor / inspection / delivery / procurement / approval |
| status | TEXT | NOT NULL | todo / in_progress / blocked / review / done |
| priority | TEXT | NOT NULL | low / medium / high / urgent |
| assigned_to | UUID | NULL | FK → users.id |
| assigned_team_id | UUID | NULL | FK → teams.id |
| estimated_hours | NUMERIC(6,2) | NULL | |
| actual_hours | NUMERIC(6,2) | NULL | |
| due_date | DATE | NULL | |
| completed_at | TIMESTAMPTZ | NULL | |
| completed_by | UUID | NULL | FK → users.id |
| blocked_reason | TEXT | NULL | |
| lexorank | TEXT | NOT NULL | |
| is_deleted | BOOLEAN | NOT NULL | Default false |
| deleted_at | TIMESTAMPTZ | NULL | |
| created_at | TIMESTAMPTZ | NOT NULL | Default now() |
| updated_at | TIMESTAMPTZ | NOT NULL | Default now() |
| created_by | UUID | NOT NULL | FK → users.id |

---

### Table: renovation_estimates

**Purpose:** Detailed cost estimates for a renovation project. Multiple drafts possible; one marked as accepted.
**RLS Pattern:** Pattern 3

| Column | Type | Null | Description |
|--------|------|------|-------------|
| id | UUID | NOT NULL | Primary key |
| company_id | UUID | NOT NULL | FK → companies.id |
| project_id | UUID | NOT NULL | FK → renovation_projects.id |
| estimate_number | TEXT | NOT NULL | Human-readable e.g. EST-2026-0041-v2 |
| version | INTEGER | NOT NULL | Default 1 |
| status | TEXT | NOT NULL | draft / sent_to_client / accepted / rejected / superseded |
| valid_until | DATE | NULL | |
| subtotal | NUMERIC(19,4) | NOT NULL | Sum of line items |
| discount_amount | NUMERIC(19,4) | NOT NULL | Default 0 |
| discount_percentage | NUMERIC(5,2) | NOT NULL | Default 0 |
| tax_amount | NUMERIC(19,4) | NOT NULL | Default 0 |
| tax_rate | NUMERIC(5,2) | NOT NULL | Default 19 (Romanian VAT) |
| total | NUMERIC(19,4) | NOT NULL | |
| currency | CHAR(3) | NOT NULL | Default 'RON' |
| prepared_by | UUID | NOT NULL | FK → users.id |
| approved_by | UUID | NULL | FK → users.id (internal approval) |
| approved_at | TIMESTAMPTZ | NULL | |
| client_viewed_at | TIMESTAMPTZ | NULL | When client opened estimate |
| client_responded_at | TIMESTAMPTZ | NULL | |
| client_response_note | TEXT | NULL | |
| notes | TEXT | NULL | |
| pdf_document_id | UUID | NULL | FK → documents.id |
| is_deleted | BOOLEAN | NOT NULL | Default false |
| deleted_at | TIMESTAMPTZ | NULL | |
| created_at | TIMESTAMPTZ | NOT NULL | Default now() |
| updated_at | TIMESTAMPTZ | NOT NULL | Default now() |
| created_by | UUID | NOT NULL | FK → users.id |

**Relationships:**
- → renovation_projects (many-to-one)
- ← renovation_estimate_lines (one-to-many)
- → documents (generated PDF)

---

### Table: renovation_estimate_lines

**Purpose:** Individual line items in an estimate (labor, materials, subcontractors, overhead).
**RLS Pattern:** Pattern 3

| Column | Type | Null | Description |
|--------|------|------|-------------|
| id | UUID | NOT NULL | Primary key |
| company_id | UUID | NOT NULL | FK → companies.id |
| estimate_id | UUID | NOT NULL | FK → renovation_estimates.id |
| line_number | INTEGER | NOT NULL | Display order |
| category | TEXT | NOT NULL | labor / materials / subcontractor / equipment / overhead / other |
| description | TEXT | NOT NULL | |
| unit | TEXT | NULL | m², ml, pcs, hours, etc. |
| quantity | NUMERIC(12,4) | NOT NULL | |
| unit_price | NUMERIC(19,4) | NOT NULL | |
| total_price | NUMERIC(19,4) | NOT NULL | quantity × unit_price |
| notes | TEXT | NULL | |
| product_id | UUID | NULL | FK → products.id (if from shop catalog) |
| supplier_id | UUID | NULL | FK → suppliers.id |
| created_at | TIMESTAMPTZ | NOT NULL | Default now() |
| updated_at | TIMESTAMPTZ | NOT NULL | Default now() |

---

### Table: renovation_contracts

**Purpose:** Signed contracts for renovation projects. Version-controlled.
**RLS Pattern:** Pattern 3

| Column | Type | Null | Description |
|--------|------|------|-------------|
| id | UUID | NOT NULL | Primary key |
| company_id | UUID | NOT NULL | FK → companies.id |
| project_id | UUID | NOT NULL | FK → renovation_projects.id |
| estimate_id | UUID | NULL | FK → renovation_estimates.id |
| contract_number | TEXT | NOT NULL | |
| status | TEXT | NOT NULL | draft / sent / signed / active / completed / terminated |
| contract_value | NUMERIC(19,4) | NOT NULL | |
| currency | CHAR(3) | NOT NULL | Default 'RON' |
| start_date | DATE | NULL | |
| end_date | DATE | NULL | |
| signed_by_company_at | TIMESTAMPTZ | NULL | |
| signed_by_company_user | UUID | NULL | FK → users.id |
| signed_by_client_at | TIMESTAMPTZ | NULL | |
| client_signature_method | TEXT | NULL | ink / digital / esign |
| termination_date | DATE | NULL | |
| termination_reason | TEXT | NULL | |
| payment_terms | JSONB | NOT NULL | Payment schedule structure |
| document_id | UUID | NULL | FK → documents.id |
| is_deleted | BOOLEAN | NOT NULL | Default false |
| deleted_at | TIMESTAMPTZ | NULL | |
| created_at | TIMESTAMPTZ | NOT NULL | Default now() |
| updated_at | TIMESTAMPTZ | NOT NULL | Default now() |
| created_by | UUID | NOT NULL | FK → users.id |

---

### Table: renovation_site_reports

**Purpose:** Daily or event-based site reports submitted by supervisors.
**RLS Pattern:** Pattern 3

| Column | Type | Null | Description |
|--------|------|------|-------------|
| id | UUID | NOT NULL | Primary key |
| company_id | UUID | NOT NULL | FK → companies.id |
| project_id | UUID | NOT NULL | FK → renovation_projects.id |
| phase_id | UUID | NULL | FK → renovation_phases.id |
| report_date | DATE | NOT NULL | |
| report_type | TEXT | NOT NULL | daily / incident / inspection / milestone |
| submitted_by | UUID | NOT NULL | FK → users.id |
| weather_conditions | TEXT | NULL | |
| workers_on_site | INTEGER | NULL | |
| work_performed | TEXT | NOT NULL | |
| issues_encountered | TEXT | NULL | |
| materials_used | JSONB | NOT NULL | Default '[]' — [{material_id, quantity, unit}] |
| completion_delta | NUMERIC(5,2) | NULL | % progress added this report |
| photos | JSONB | NOT NULL | Default '[]' — document IDs |
| client_visible | BOOLEAN | NOT NULL | Default false |
| is_deleted | BOOLEAN | NOT NULL | Default false |
| deleted_at | TIMESTAMPTZ | NULL | |
| created_at | TIMESTAMPTZ | NOT NULL | Default now() |
| updated_at | TIMESTAMPTZ | NOT NULL | Default now() |

**Indexes:**
- `(project_id, report_date)`
- `(company_id, report_date)`

---

### Table: renovation_material_requests

**Purpose:** Material procurement requests generated from renovation projects.
**RLS Pattern:** Pattern 3

| Column | Type | Null | Description |
|--------|------|------|-------------|
| id | UUID | NOT NULL | Primary key |
| company_id | UUID | NOT NULL | FK → companies.id |
| project_id | UUID | NOT NULL | FK → renovation_projects.id |
| phase_id | UUID | NULL | FK → renovation_phases.id |
| requested_by | UUID | NOT NULL | FK → users.id |
| status | TEXT | NOT NULL | pending / approved / ordered / delivered / cancelled |
| needed_by_date | DATE | NULL | |
| approval_instance_id | UUID | NULL | FK → approval_instances.id |
| approved_by | UUID | NULL | FK → users.id |
| approved_at | TIMESTAMPTZ | NULL | |
| purchase_order_id | UUID | NULL | FK → purchase_orders.id |
| notes | TEXT | NULL | |
| is_deleted | BOOLEAN | NOT NULL | Default false |
| deleted_at | TIMESTAMPTZ | NULL | |
| created_at | TIMESTAMPTZ | NOT NULL | Default now() |
| updated_at | TIMESTAMPTZ | NOT NULL | Default now() |
| created_by | UUID | NOT NULL | FK → users.id |

**Relationships:**
- ← renovation_material_request_lines (one-to-many)
- → purchase_orders (when approved)

---

### Table: renovation_material_request_lines

**Purpose:** Individual materials in a request.
**RLS Pattern:** Pattern 3

| Column | Type | Null | Description |
|--------|------|------|-------------|
| id | UUID | NOT NULL | Primary key |
| company_id | UUID | NOT NULL | FK → companies.id |
| request_id | UUID | NOT NULL | FK → renovation_material_requests.id |
| product_id | UUID | NULL | FK → products.id |
| description | TEXT | NOT NULL | |
| unit | TEXT | NOT NULL | |
| quantity_requested | NUMERIC(12,4) | NOT NULL | |
| quantity_approved | NUMERIC(12,4) | NULL | |
| estimated_unit_price | NUMERIC(19,4) | NULL | |
| supplier_id | UUID | NULL | FK → suppliers.id |
| notes | TEXT | NULL | |
| created_at | TIMESTAMPTZ | NOT NULL | Default now() |

---

## Section 10 — Shop (Module 06)

The Shop module is a full-featured e-commerce and internal product catalog. Serves public customers, direct clients, and internal procurement.

---

### Table: product_categories

**Purpose:** Hierarchical product taxonomy. Supports unlimited nesting.
**RLS Pattern:** Pattern 2 (company-scoped read)

| Column | Type | Null | Description |
|--------|------|------|-------------|
| id | UUID | NOT NULL | Primary key |
| company_id | UUID | NOT NULL | FK → companies.id |
| parent_id | UUID | NULL | FK → product_categories.id (self-referential) |
| name | TEXT | NOT NULL | |
| slug | TEXT | NOT NULL | URL-safe identifier |
| description | TEXT | NULL | |
| image_url | TEXT | NULL | |
| is_active | BOOLEAN | NOT NULL | Default true |
| is_public | BOOLEAN | NOT NULL | Default true |
| lexorank | TEXT | NOT NULL | Display order |
| metadata | JSONB | NOT NULL | Default '{}' |
| is_deleted | BOOLEAN | NOT NULL | Default false |
| deleted_at | TIMESTAMPTZ | NULL | |
| created_at | TIMESTAMPTZ | NOT NULL | Default now() |
| updated_at | TIMESTAMPTZ | NOT NULL | Default now() |
| created_by | UUID | NOT NULL | FK → users.id |

**Indexes:**
- `(company_id, slug)` UNIQUE
- `(company_id, parent_id)`
- `(company_id, is_active, is_public)`

---

### Table: products

**Purpose:** Master product/service catalog. Supports physical products, digital products, and services.
**RLS Pattern:** Pattern 2

| Column | Type | Null | Description |
|--------|------|------|-------------|
| id | UUID | NOT NULL | Primary key |
| company_id | UUID | NOT NULL | FK → companies.id |
| category_id | UUID | NULL | FK → product_categories.id |
| sku | TEXT | NOT NULL | Stock Keeping Unit |
| barcode | TEXT | NULL | EAN/UPC |
| name | TEXT | NOT NULL | |
| slug | TEXT | NOT NULL | |
| description | TEXT | NULL | |
| short_description | TEXT | NULL | |
| product_type | TEXT | NOT NULL | physical / digital / service / bundle |
| status | TEXT | NOT NULL | draft / active / inactive / discontinued |
| base_price | NUMERIC(19,4) | NOT NULL | Before any discounts |
| cost_price | NUMERIC(19,4) | NULL | Internal cost |
| currency | CHAR(3) | NOT NULL | Default 'RON' |
| tax_rate | NUMERIC(5,2) | NOT NULL | Default 19 |
| tax_included | BOOLEAN | NOT NULL | Default false |
| weight_kg | NUMERIC(8,4) | NULL | |
| dimensions_cm | JSONB | NULL | {length, width, height} |
| unit | TEXT | NULL | pcs, kg, m, m², l |
| min_order_quantity | NUMERIC(12,4) | NOT NULL | Default 1 |
| is_public | BOOLEAN | NOT NULL | Default true |
| is_featured | BOOLEAN | NOT NULL | Default false |
| requires_approval_for_discount | BOOLEAN | NOT NULL | Default false |
| metadata | JSONB | NOT NULL | Default '{}' |
| search_vector | TSVECTOR | NULL | Full-text search |
| is_deleted | BOOLEAN | NOT NULL | Default false |
| deleted_at | TIMESTAMPTZ | NULL | |
| created_at | TIMESTAMPTZ | NOT NULL | Default now() |
| updated_at | TIMESTAMPTZ | NOT NULL | Default now() |
| created_by | UUID | NOT NULL | FK → users.id |

**Indexes:**
- `(company_id, sku)` UNIQUE
- `(company_id, slug)` UNIQUE
- `(company_id, status, is_public)` — storefront queries
- `(company_id, category_id)`
- GIN index on `search_vector`
- `barcode` — inventory scanning

**Relationships:**
- ← product_variants (one-to-many)
- ← product_images (one-to-many)
- ← product_attributes (one-to-many)
- ← product_price_tiers (one-to-many)
- ← inventory_items (one-to-many)

---

### Table: product_variants

**Purpose:** Variant SKUs for configurable products (size, color, material combinations).
**RLS Pattern:** Pattern 2

| Column | Type | Null | Description |
|--------|------|------|-------------|
| id | UUID | NOT NULL | Primary key |
| company_id | UUID | NOT NULL | FK → companies.id |
| product_id | UUID | NOT NULL | FK → products.id |
| sku | TEXT | NOT NULL | Variant-specific SKU |
| barcode | TEXT | NULL | |
| name | TEXT | NOT NULL | e.g. "Blue / XL" |
| attributes | JSONB | NOT NULL | {color: "Blue", size: "XL"} |
| price_override | NUMERIC(19,4) | NULL | NULL = use product base_price |
| cost_price | NUMERIC(19,4) | NULL | |
| weight_kg | NUMERIC(8,4) | NULL | |
| is_active | BOOLEAN | NOT NULL | Default true |
| is_deleted | BOOLEAN | NOT NULL | Default false |
| deleted_at | TIMESTAMPTZ | NULL | |
| created_at | TIMESTAMPTZ | NOT NULL | Default now() |
| updated_at | TIMESTAMPTZ | NOT NULL | Default now() |

**Indexes:**
- `(company_id, sku)` UNIQUE
- `(product_id, is_active)`

---

### Table: product_price_tiers

**Purpose:** Volume pricing and client-type pricing tiers.
**RLS Pattern:** Pattern 2

| Column | Type | Null | Description |
|--------|------|------|-------------|
| id | UUID | NOT NULL | Primary key |
| company_id | UUID | NOT NULL | FK → companies.id |
| product_id | UUID | NOT NULL | FK → products.id |
| variant_id | UUID | NULL | FK → product_variants.id |
| tier_name | TEXT | NOT NULL | e.g. "Wholesale", "VIP Client" |
| client_type | TEXT | NULL | individual / business / internal / wholesale |
| min_quantity | NUMERIC(12,4) | NOT NULL | Default 1 |
| price | NUMERIC(19,4) | NOT NULL | |
| currency | CHAR(3) | NOT NULL | Default 'RON' |
| valid_from | DATE | NULL | |
| valid_until | DATE | NULL | |
| is_active | BOOLEAN | NOT NULL | Default true |
| created_at | TIMESTAMPTZ | NOT NULL | Default now() |
| updated_at | TIMESTAMPTZ | NOT NULL | Default now() |
| created_by | UUID | NOT NULL | FK → users.id |

---

### Table: product_images

**Purpose:** Product image gallery with ordering.
**RLS Pattern:** Pattern 2

| Column | Type | Null | Description |
|--------|------|------|-------------|
| id | UUID | NOT NULL | Primary key |
| company_id | UUID | NOT NULL | FK → companies.id |
| product_id | UUID | NOT NULL | FK → products.id |
| variant_id | UUID | NULL | FK → product_variants.id |
| url | TEXT | NOT NULL | |
| alt_text | TEXT | NULL | |
| is_primary | BOOLEAN | NOT NULL | Default false |
| lexorank | TEXT | NOT NULL | |
| created_at | TIMESTAMPTZ | NOT NULL | Default now() |
| created_by | UUID | NOT NULL | FK → users.id |

---

### Table: inventory_locations

**Purpose:** Physical storage locations (warehouses, store rooms, site storage).
**RLS Pattern:** Pattern 3

| Column | Type | Null | Description |
|--------|------|------|-------------|
| id | UUID | NOT NULL | Primary key |
| company_id | UUID | NOT NULL | FK → companies.id |
| name | TEXT | NOT NULL | |
| location_type | TEXT | NOT NULL | warehouse / store_room / site / vehicle |
| address | TEXT | NULL | |
| is_active | BOOLEAN | NOT NULL | Default true |
| is_deleted | BOOLEAN | NOT NULL | Default false |
| deleted_at | TIMESTAMPTZ | NULL | |
| created_at | TIMESTAMPTZ | NOT NULL | Default now() |
| updated_at | TIMESTAMPTZ | NOT NULL | Default now() |
| created_by | UUID | NOT NULL | FK → users.id |

---

### Table: inventory_items

**Purpose:** Stock levels per product/variant per location.
**RLS Pattern:** Pattern 3

| Column | Type | Null | Description |
|--------|------|------|-------------|
| id | UUID | NOT NULL | Primary key |
| company_id | UUID | NOT NULL | FK → companies.id |
| product_id | UUID | NOT NULL | FK → products.id |
| variant_id | UUID | NULL | FK → product_variants.id |
| location_id | UUID | NOT NULL | FK → inventory_locations.id |
| quantity_on_hand | NUMERIC(12,4) | NOT NULL | Current stock |
| quantity_reserved | NUMERIC(12,4) | NOT NULL | Default 0 (committed to orders) |
| quantity_available | NUMERIC(12,4) | NOT NULL | Generated: on_hand - reserved |
| reorder_point | NUMERIC(12,4) | NULL | Trigger low-stock alert |
| reorder_quantity | NUMERIC(12,4) | NULL | Preferred replenishment qty |
| last_counted_at | TIMESTAMPTZ | NULL | Last physical count |
| created_at | TIMESTAMPTZ | NOT NULL | Default now() |
| updated_at | TIMESTAMPTZ | NOT NULL | Default now() |

**Indexes:**
- `(company_id, product_id, variant_id, location_id)` UNIQUE
- `(company_id, location_id)`
- `(quantity_available)` partial — WHERE quantity_available <= reorder_point (low stock)

---

### Table: inventory_movements

**Purpose:** Immutable ledger of all stock changes. Never updated, only inserted.
**RLS Pattern:** Pattern 3

| Column | Type | Null | Description |
|--------|------|------|-------------|
| id | UUID | NOT NULL | Primary key |
| company_id | UUID | NOT NULL | FK → companies.id |
| product_id | UUID | NOT NULL | FK → products.id |
| variant_id | UUID | NULL | FK → product_variants.id |
| location_id | UUID | NOT NULL | FK → inventory_locations.id |
| movement_type | TEXT | NOT NULL | purchase / sale / return / adjustment / transfer / consumption |
| quantity_delta | NUMERIC(12,4) | NOT NULL | Positive=in, Negative=out |
| quantity_before | NUMERIC(12,4) | NOT NULL | Snapshot before change |
| quantity_after | NUMERIC(12,4) | NOT NULL | Snapshot after change |
| reference_type | TEXT | NULL | order / purchase_order / site_report / manual |
| reference_id | UUID | NULL | Generic FK to source record |
| reason | TEXT | NULL | |
| performed_by | UUID | NOT NULL | FK → users.id |
| created_at | TIMESTAMPTZ | NOT NULL | Default now() |

**Indexes:**
- `(company_id, product_id, created_at DESC)` — stock history
- `(company_id, location_id, created_at DESC)`
- `(reference_type, reference_id)` — trace back to source

---

### Table: shop_orders

**Purpose:** Customer and internal orders. Covers B2C, B2B, and internal requisitions.
**RLS Pattern:** Pattern 1 (own record) for clients; Pattern 3 for internal

| Column | Type | Null | Description |
|--------|------|------|-------------|
| id | UUID | NOT NULL | Primary key |
| company_id | UUID | NOT NULL | FK → companies.id |
| order_number | TEXT | NOT NULL | Human-readable e.g. ORD-2026-00421 |
| order_type | TEXT | NOT NULL | b2c / b2b / internal / renovation |
| status | TEXT | NOT NULL | pending / confirmed / processing / shipped / delivered / completed / cancelled / refunded |
| customer_id | UUID | NULL | FK → crm_clients.id (for B2B) |
| customer_user_id | UUID | NULL | FK → users.id (for portal users) |
| customer_name | TEXT | NOT NULL | Snapshot at order time |
| customer_email | TEXT | NOT NULL | |
| customer_phone | TEXT | NULL | |
| shipping_address | JSONB | NOT NULL | Address snapshot |
| billing_address | JSONB | NOT NULL | |
| subtotal | NUMERIC(19,4) | NOT NULL | |
| discount_amount | NUMERIC(19,4) | NOT NULL | Default 0 |
| discount_code | TEXT | NULL | |
| tax_amount | NUMERIC(19,4) | NOT NULL | Default 0 |
| shipping_amount | NUMERIC(19,4) | NOT NULL | Default 0 |
| total | NUMERIC(19,4) | NOT NULL | |
| currency | CHAR(3) | NOT NULL | Default 'RON' |
| payment_status | TEXT | NOT NULL | pending / partial / paid / refunded |
| payment_method | TEXT | NULL | cash / card / transfer / credit |
| paid_at | TIMESTAMPTZ | NULL | |
| notes | TEXT | NULL | |
| internal_notes | TEXT | NULL | Not visible to customer |
| requires_discount_approval | BOOLEAN | NOT NULL | Default false |
| approval_instance_id | UUID | NULL | FK → approval_instances.id |
| renovation_project_id | UUID | NULL | FK → renovation_projects.id |
| fulfilled_by | UUID | NULL | FK → users.id |
| fulfilled_at | TIMESTAMPTZ | NULL | |
| metadata | JSONB | NOT NULL | Default '{}' |
| is_deleted | BOOLEAN | NOT NULL | Default false |
| deleted_at | TIMESTAMPTZ | NULL | |
| created_at | TIMESTAMPTZ | NOT NULL | Default now() |
| updated_at | TIMESTAMPTZ | NOT NULL | Default now() |
| created_by | UUID | NOT NULL | FK → users.id |

**Indexes:**
- `(company_id, order_number)` UNIQUE
- `(company_id, status, created_at DESC)` — order management
- `(customer_id)` — client order history
- `(renovation_project_id)` — project-linked orders

---

### Table: shop_order_lines

**Purpose:** Individual line items per order.
**RLS Pattern:** Pattern 1/3 (inherits from parent order)

| Column | Type | Null | Description |
|--------|------|------|-------------|
| id | UUID | NOT NULL | Primary key |
| company_id | UUID | NOT NULL | FK → companies.id |
| order_id | UUID | NOT NULL | FK → shop_orders.id |
| product_id | UUID | NOT NULL | FK → products.id |
| variant_id | UUID | NULL | FK → product_variants.id |
| sku_snapshot | TEXT | NOT NULL | SKU at time of order |
| name_snapshot | TEXT | NOT NULL | Product name at time of order |
| quantity | NUMERIC(12,4) | NOT NULL | |
| unit_price | NUMERIC(19,4) | NOT NULL | Price at time of order |
| discount_amount | NUMERIC(19,4) | NOT NULL | Default 0 |
| tax_amount | NUMERIC(19,4) | NOT NULL | Default 0 |
| line_total | NUMERIC(19,4) | NOT NULL | |
| fulfillment_status | TEXT | NOT NULL | pending / picked / packed / shipped / delivered |
| created_at | TIMESTAMPTZ | NOT NULL | Default now() |
| updated_at | TIMESTAMPTZ | NOT NULL | Default now() |

---

### Table: discount_codes

**Purpose:** Promotional and client-specific discount codes.
**RLS Pattern:** Pattern 3

| Column | Type | Null | Description |
|--------|------|------|-------------|
| id | UUID | NOT NULL | Primary key |
| company_id | UUID | NOT NULL | FK → companies.id |
| code | TEXT | NOT NULL | |
| discount_type | TEXT | NOT NULL | percentage / fixed_amount / free_shipping |
| discount_value | NUMERIC(19,4) | NOT NULL | |
| currency | CHAR(3) | NULL | Required if fixed_amount |
| minimum_order_value | NUMERIC(19,4) | NULL | |
| max_uses | INTEGER | NULL | NULL = unlimited |
| uses_count | INTEGER | NOT NULL | Default 0 |
| valid_from | TIMESTAMPTZ | NULL | |
| valid_until | TIMESTAMPTZ | NULL | |
| requires_approval | BOOLEAN | NOT NULL | Default false |
| applicable_to | TEXT | NOT NULL | all / category / product / client_type |
| restriction_ids | UUID[] | NOT NULL | Default '{}' — product or category IDs |
| is_active | BOOLEAN | NOT NULL | Default true |
| created_by | UUID | NOT NULL | FK → users.id |
| created_at | TIMESTAMPTZ | NOT NULL | Default now() |
| updated_at | TIMESTAMPTZ | NOT NULL | Default now() |

**Indexes:**
- `(company_id, code)` UNIQUE
- `(company_id, is_active, valid_until)` — storefront lookup

---

## Section 11 — CRM (Module 07)

CRM manages client relationships from first contact through lifetime value. Includes client portal access for renovation clients and B2B customers.

---

### Table: crm_clients

**Purpose:** Organization-level client record. A client is a company or individual that has or may have a commercial relationship.
**RLS Pattern:** Pattern 3

| Column | Type | Null | Description |
|--------|------|------|-------------|
| id | UUID | NOT NULL | Primary key |
| company_id | UUID | NOT NULL | FK → companies.id |
| client_code | TEXT | NOT NULL | e.g. CLT-0041 |
| client_type | TEXT | NOT NULL | individual / business |
| status | TEXT | NOT NULL | prospect / active / inactive / vip / blacklisted |
| display_name | TEXT | NOT NULL | |
| legal_name | TEXT | NULL | For business clients |
| tax_id | TEXT | NULL | CUI / CNP (encrypted at rest) |
| registration_number | TEXT | NULL | ORC number for businesses |
| industry | TEXT | NULL | |
| website | TEXT | NULL | |
| annual_revenue_bracket | TEXT | NULL | For segmentation |
| account_manager_id | UUID | NULL | FK → users.id — assigned sales rep |
| source | TEXT | NULL | referral / direct / online / event / partner |
| tags | TEXT[] | NOT NULL | Default '{}' |
| lifetime_value | NUMERIC(19,4) | NOT NULL | Default 0 — computed periodically |
| credit_limit | NUMERIC(19,4) | NULL | |
| payment_terms_days | INTEGER | NULL | Default net days |
| notes | TEXT | NULL | |
| metadata | JSONB | NOT NULL | Default '{}' |
| is_deleted | BOOLEAN | NOT NULL | Default false |
| deleted_at | TIMESTAMPTZ | NULL | |
| created_at | TIMESTAMPTZ | NOT NULL | Default now() |
| updated_at | TIMESTAMPTZ | NOT NULL | Default now() |
| created_by | UUID | NOT NULL | FK → users.id |

**Indexes:**
- `(company_id, client_code)` UNIQUE
- `(company_id, status)`
- `(account_manager_id)` — sales rep workload
- `(company_id, tags)` GIN — tag filtering

---

### Table: crm_contacts

**Purpose:** Individual persons at a client organization. Many contacts per client.
**RLS Pattern:** Pattern 3

| Column | Type | Null | Description |
|--------|------|------|-------------|
| id | UUID | NOT NULL | Primary key |
| company_id | UUID | NOT NULL | FK → companies.id |
| client_id | UUID | NOT NULL | FK → crm_clients.id |
| first_name | TEXT | NOT NULL | |
| last_name | TEXT | NOT NULL | |
| title | TEXT | NULL | Mr / Ms / Dr / Ing |
| role_at_client | TEXT | NULL | Decision-maker / Technical / Finance |
| email | TEXT | NULL | |
| phone | TEXT | NULL | |
| mobile | TEXT | NULL | |
| is_primary | BOOLEAN | NOT NULL | Default false |
| has_portal_access | BOOLEAN | NOT NULL | Default false |
| portal_user_id | UUID | NULL | FK → users.id — if portal account created |
| preferred_language | CHAR(2) | NOT NULL | Default 'ro' |
| notes | TEXT | NULL | |
| is_deleted | BOOLEAN | NOT NULL | Default false |
| deleted_at | TIMESTAMPTZ | NULL | |
| created_at | TIMESTAMPTZ | NOT NULL | Default now() |
| updated_at | TIMESTAMPTZ | NOT NULL | Default now() |
| created_by | UUID | NOT NULL | FK → users.id |

**Indexes:**
- `(company_id, client_id, is_primary)` — primary contact lookup
- `(portal_user_id)` — portal auth
- `(company_id, email)` — deduplication

---

### Table: crm_addresses

**Purpose:** Address book for clients (billing, shipping, site, HQ).
**RLS Pattern:** Pattern 3

| Column | Type | Null | Description |
|--------|------|------|-------------|
| id | UUID | NOT NULL | Primary key |
| company_id | UUID | NOT NULL | FK → companies.id |
| client_id | UUID | NOT NULL | FK → crm_clients.id |
| address_type | TEXT | NOT NULL | billing / shipping / site / hq / other |
| is_default | BOOLEAN | NOT NULL | Default false |
| label | TEXT | NULL | "Main Warehouse", "Bucharest HQ" |
| line1 | TEXT | NOT NULL | |
| line2 | TEXT | NULL | |
| city | TEXT | NOT NULL | |
| county | TEXT | NOT NULL | |
| postal_code | TEXT | NULL | |
| country | TEXT | NOT NULL | Default 'RO' |
| coordinates | POINT | NULL | |
| created_at | TIMESTAMPTZ | NOT NULL | Default now() |
| updated_at | TIMESTAMPTZ | NOT NULL | Default now() |

---

### Table: crm_interactions

**Purpose:** Log of all client touchpoints: calls, emails, meetings, site visits.
**RLS Pattern:** Pattern 3

| Column | Type | Null | Description |
|--------|------|------|-------------|
| id | UUID | NOT NULL | Primary key |
| company_id | UUID | NOT NULL | FK → companies.id |
| client_id | UUID | NOT NULL | FK → crm_clients.id |
| contact_id | UUID | NULL | FK → crm_contacts.id |
| interaction_type | TEXT | NOT NULL | call / email / meeting / site_visit / demo / proposal / other |
| direction | TEXT | NOT NULL | inbound / outbound |
| subject | TEXT | NOT NULL | |
| summary | TEXT | NULL | |
| outcome | TEXT | NULL | interested / follow_up / not_interested / converted / no_answer |
| occurred_at | TIMESTAMPTZ | NOT NULL | |
| duration_minutes | INTEGER | NULL | |
| performed_by | UUID | NOT NULL | FK → users.id |
| follow_up_required | BOOLEAN | NOT NULL | Default false |
| follow_up_date | DATE | NULL | |
| follow_up_note | TEXT | NULL | |
| linked_opportunity_id | UUID | NULL | FK → crm_opportunities.id |
| metadata | JSONB | NOT NULL | Default '{}' |
| created_at | TIMESTAMPTZ | NOT NULL | Default now() |
| updated_at | TIMESTAMPTZ | NOT NULL | Default now() |

**Indexes:**
- `(company_id, client_id, occurred_at DESC)`
- `(performed_by, occurred_at DESC)`
- `(company_id, follow_up_required, follow_up_date)` — follow-up queue

---

### Table: crm_opportunities

**Purpose:** Sales pipeline opportunities. Funnel stage tracking.
**RLS Pattern:** Pattern 3

| Column | Type | Null | Description |
|--------|------|------|-------------|
| id | UUID | NOT NULL | Primary key |
| company_id | UUID | NOT NULL | FK → companies.id |
| client_id | UUID | NOT NULL | FK → crm_clients.id |
| title | TEXT | NOT NULL | |
| description | TEXT | NULL | |
| stage | TEXT | NOT NULL | lead / qualified / proposal / negotiation / closed_won / closed_lost |
| probability_percentage | INTEGER | NOT NULL | 0–100 |
| estimated_value | NUMERIC(19,4) | NULL | |
| currency | CHAR(3) | NOT NULL | Default 'RON' |
| expected_close_date | DATE | NULL | |
| actual_close_date | DATE | NULL | |
| lost_reason | TEXT | NULL | |
| owner_id | UUID | NOT NULL | FK → users.id |
| renovation_project_id | UUID | NULL | FK → renovation_projects.id (if converted) |
| source | TEXT | NULL | |
| tags | TEXT[] | NOT NULL | Default '{}' |
| is_deleted | BOOLEAN | NOT NULL | Default false |
| deleted_at | TIMESTAMPTZ | NULL | |
| created_at | TIMESTAMPTZ | NOT NULL | Default now() |
| updated_at | TIMESTAMPTZ | NOT NULL | Default now() |
| created_by | UUID | NOT NULL | FK → users.id |

**Indexes:**
- `(company_id, stage, expected_close_date)` — pipeline view
- `(owner_id, stage)` — rep pipeline
- `(company_id, client_id)` — client opportunities

---

### Table: crm_quotes

**Purpose:** Formal quotes sent to clients. Links to renovation estimates or shop product quotes.
**RLS Pattern:** Pattern 3

| Column | Type | Null | Description |
|--------|------|------|-------------|
| id | UUID | NOT NULL | Primary key |
| company_id | UUID | NOT NULL | FK → companies.id |
| client_id | UUID | NOT NULL | FK → crm_clients.id |
| opportunity_id | UUID | NULL | FK → crm_opportunities.id |
| quote_number | TEXT | NOT NULL | |
| status | TEXT | NOT NULL | draft / sent / viewed / accepted / rejected / expired |
| valid_until | DATE | NULL | |
| total | NUMERIC(19,4) | NOT NULL | |
| currency | CHAR(3) | NOT NULL | Default 'RON' |
| approval_instance_id | UUID | NULL | FK → approval_instances.id |
| approved_by | UUID | NULL | FK → users.id |
| approved_at | TIMESTAMPTZ | NULL | |
| sent_at | TIMESTAMPTZ | NULL | |
| client_viewed_at | TIMESTAMPTZ | NULL | |
| client_responded_at | TIMESTAMPTZ | NULL | |
| document_id | UUID | NULL | FK → documents.id |
| notes | TEXT | NULL | |
| is_deleted | BOOLEAN | NOT NULL | Default false |
| deleted_at | TIMESTAMPTZ | NULL | |
| created_at | TIMESTAMPTZ | NOT NULL | Default now() |
| updated_at | TIMESTAMPTZ | NOT NULL | Default now() |
| created_by | UUID | NOT NULL | FK → users.id |

---

## Section 12 — Finance (Module 08)

Finance manages invoicing, payments, budgets, and financial reporting across all company revenue streams.

---

### Table: invoices

**Purpose:** All outgoing invoices (to clients). Covers renovation, shop, and service invoices.
**RLS Pattern:** Pattern 3

| Column | Type | Null | Description |
|--------|------|------|-------------|
| id | UUID | NOT NULL | Primary key |
| company_id | UUID | NOT NULL | FK → companies.id |
| invoice_number | TEXT | NOT NULL | Legal invoice number |
| invoice_series | TEXT | NOT NULL | Series prefix e.g. "FC" |
| invoice_type | TEXT | NOT NULL | tax_invoice / proforma / credit_note / receipt |
| status | TEXT | NOT NULL | draft / issued / sent / partially_paid / paid / overdue / cancelled |
| client_id | UUID | NOT NULL | FK → crm_clients.id |
| contact_id | UUID | NULL | FK → crm_contacts.id |
| renovation_project_id | UUID | NULL | FK → renovation_projects.id |
| order_id | UUID | NULL | FK → shop_orders.id |
| issue_date | DATE | NOT NULL | |
| due_date | DATE | NOT NULL | |
| delivery_date | DATE | NULL | Romanian legal requirement |
| subtotal | NUMERIC(19,4) | NOT NULL | |
| discount_amount | NUMERIC(19,4) | NOT NULL | Default 0 |
| tax_amount | NUMERIC(19,4) | NOT NULL | |
| total | NUMERIC(19,4) | NOT NULL | |
| paid_amount | NUMERIC(19,4) | NOT NULL | Default 0 |
| outstanding_amount | NUMERIC(19,4) | NOT NULL | Generated: total - paid_amount |
| currency | CHAR(3) | NOT NULL | Default 'RON' |
| exchange_rate | NUMERIC(12,6) | NULL | If non-RON |
| payment_terms_days | INTEGER | NOT NULL | |
| payment_instructions | TEXT | NULL | Bank details |
| notes | TEXT | NULL | Legal notes / delivery info |
| internal_notes | TEXT | NULL | |
| approval_instance_id | UUID | NULL | FK → approval_instances.id |
| issued_by | UUID | NOT NULL | FK → users.id |
| document_id | UUID | NULL | FK → documents.id |
| e_invoice_id | TEXT | NULL | ANAF e-Factura ID |
| e_invoice_status | TEXT | NULL | pending / submitted / accepted / rejected |
| metadata | JSONB | NOT NULL | Default '{}' |
| is_deleted | BOOLEAN | NOT NULL | Default false |
| deleted_at | TIMESTAMPTZ | NULL | |
| created_at | TIMESTAMPTZ | NOT NULL | Default now() |
| updated_at | TIMESTAMPTZ | NOT NULL | Default now() |
| created_by | UUID | NOT NULL | FK → users.id |

**Indexes:**
- `(company_id, invoice_number)` UNIQUE
- `(company_id, status, due_date)` — overdue tracking
- `(client_id, status)` — client AR
- `(company_id, issue_date)` — period reports
- `(e_invoice_id)` — ANAF integration

---

### Table: invoice_lines

**Purpose:** Line items on invoices.
**RLS Pattern:** Pattern 3

| Column | Type | Null | Description |
|--------|------|------|-------------|
| id | UUID | NOT NULL | Primary key |
| company_id | UUID | NOT NULL | FK → companies.id |
| invoice_id | UUID | NOT NULL | FK → invoices.id |
| line_number | INTEGER | NOT NULL | |
| description | TEXT | NOT NULL | |
| unit | TEXT | NULL | |
| quantity | NUMERIC(12,4) | NOT NULL | |
| unit_price | NUMERIC(19,4) | NOT NULL | |
| discount_amount | NUMERIC(19,4) | NOT NULL | Default 0 |
| tax_rate | NUMERIC(5,2) | NOT NULL | Default 19 |
| tax_amount | NUMERIC(19,4) | NOT NULL | |
| line_total | NUMERIC(19,4) | NOT NULL | |
| product_id | UUID | NULL | FK → products.id |
| ncpc_code | TEXT | NULL | Romanian customs classification |
| created_at | TIMESTAMPTZ | NOT NULL | Default now() |

---

### Table: payments

**Purpose:** Incoming payment records against invoices. Supports partial payments and multi-invoice payments.
**RLS Pattern:** Pattern 3

| Column | Type | Null | Description |
|--------|------|------|-------------|
| id | UUID | NOT NULL | Primary key |
| company_id | UUID | NOT NULL | FK → companies.id |
| payment_number | TEXT | NOT NULL | |
| payment_method | TEXT | NOT NULL | bank_transfer / cash / card / check / crypto |
| payment_date | DATE | NOT NULL | |
| amount | NUMERIC(19,4) | NOT NULL | |
| currency | CHAR(3) | NOT NULL | Default 'RON' |
| exchange_rate | NUMERIC(12,6) | NULL | |
| client_id | UUID | NOT NULL | FK → crm_clients.id |
| bank_reference | TEXT | NULL | Transaction reference from bank |
| receipt_number | TEXT | NULL | Cash register receipt if applicable |
| notes | TEXT | NULL | |
| approval_instance_id | UUID | NULL | FK → approval_instances.id |
| processed_by | UUID | NOT NULL | FK → users.id |
| reconciled | BOOLEAN | NOT NULL | Default false |
| reconciled_at | TIMESTAMPTZ | NULL | |
| reconciled_by | UUID | NULL | FK → users.id |
| is_deleted | BOOLEAN | NOT NULL | Default false |
| deleted_at | TIMESTAMPTZ | NULL | |
| created_at | TIMESTAMPTZ | NOT NULL | Default now() |
| updated_at | TIMESTAMPTZ | NOT NULL | Default now() |
| created_by | UUID | NOT NULL | FK → users.id |

---

### Table: payment_allocations

**Purpose:** Maps payments to invoices (many-to-many with amounts). Supports partial and split payments.
**RLS Pattern:** Pattern 3

| Column | Type | Null | Description |
|--------|------|------|-------------|
| id | UUID | NOT NULL | Primary key |
| company_id | UUID | NOT NULL | FK → companies.id |
| payment_id | UUID | NOT NULL | FK → payments.id |
| invoice_id | UUID | NOT NULL | FK → invoices.id |
| allocated_amount | NUMERIC(19,4) | NOT NULL | |
| allocated_at | TIMESTAMPTZ | NOT NULL | Default now() |
| allocated_by | UUID | NOT NULL | FK → users.id |

**Indexes:**
- `(payment_id, invoice_id)` UNIQUE
- `(invoice_id)` — payment history per invoice

---

### Table: expense_claims

**Purpose:** Employee expense reimbursement requests.
**RLS Pattern:** Pattern 1 (own) + Pattern 3 (managers)

| Column | Type | Null | Description |
|--------|------|------|-------------|
| id | UUID | NOT NULL | Primary key |
| company_id | UUID | NOT NULL | FK → companies.id |
| employee_id | UUID | NOT NULL | FK → employees.id |
| user_id | UUID | NOT NULL | FK → users.id |
| claim_number | TEXT | NOT NULL | |
| status | TEXT | NOT NULL | draft / submitted / approved / rejected / paid |
| total_amount | NUMERIC(19,4) | NOT NULL | |
| currency | CHAR(3) | NOT NULL | Default 'RON' |
| period_month | INTEGER | NOT NULL | |
| period_year | INTEGER | NOT NULL | |
| project_id | UUID | NULL | FK → renovation_projects.id or projects.id |
| approval_instance_id | UUID | NULL | FK → approval_instances.id |
| approved_by | UUID | NULL | FK → users.id |
| approved_at | TIMESTAMPTZ | NULL | |
| paid_at | TIMESTAMPTZ | NULL | |
| notes | TEXT | NULL | |
| is_deleted | BOOLEAN | NOT NULL | Default false |
| deleted_at | TIMESTAMPTZ | NULL | |
| created_at | TIMESTAMPTZ | NOT NULL | Default now() |
| updated_at | TIMESTAMPTZ | NOT NULL | Default now() |

**Relationships:**
- ← expense_claim_lines (one-to-many)

---

### Table: expense_claim_lines

**Purpose:** Individual expense items within a claim.
**RLS Pattern:** Pattern 1/3

| Column | Type | Null | Description |
|--------|------|------|-------------|
| id | UUID | NOT NULL | Primary key |
| company_id | UUID | NOT NULL | FK → companies.id |
| claim_id | UUID | NOT NULL | FK → expense_claims.id |
| expense_date | DATE | NOT NULL | |
| category | TEXT | NOT NULL | travel / meals / accommodation / materials / tools / other |
| description | TEXT | NOT NULL | |
| amount | NUMERIC(19,4) | NOT NULL | |
| currency | CHAR(3) | NOT NULL | Default 'RON' |
| tax_amount | NUMERIC(19,4) | NOT NULL | Default 0 |
| receipt_document_id | UUID | NULL | FK → documents.id |
| notes | TEXT | NULL | |
| created_at | TIMESTAMPTZ | NOT NULL | Default now() |
| updated_at | TIMESTAMPTZ | NOT NULL | Default now() |

---

### Table: budgets

**Purpose:** Budget allocations per department, project, or cost center. Tracks planned vs actual.
**RLS Pattern:** Pattern 3

| Column | Type | Null | Description |
|--------|------|------|-------------|
| id | UUID | NOT NULL | Primary key |
| company_id | UUID | NOT NULL | FK → companies.id |
| budget_name | TEXT | NOT NULL | |
| budget_type | TEXT | NOT NULL | annual / quarterly / project / department |
| status | TEXT | NOT NULL | draft / active / locked / closed |
| fiscal_year | INTEGER | NOT NULL | |
| period_start | DATE | NULL | |
| period_end | DATE | NULL | |
| total_allocated | NUMERIC(19,4) | NOT NULL | |
| total_spent | NUMERIC(19,4) | NOT NULL | Default 0 |
| total_committed | NUMERIC(19,4) | NOT NULL | Default 0 — approved but unpaid |
| currency | CHAR(3) | NOT NULL | Default 'RON' |
| department_id | UUID | NULL | FK → departments.id |
| project_id | UUID | NULL | Generic — renovation or management project |
| owner_id | UUID | NOT NULL | FK → users.id |
| approval_instance_id | UUID | NULL | FK → approval_instances.id |
| approved_by | UUID | NULL | FK → users.id |
| approved_at | TIMESTAMPTZ | NULL | |
| notes | TEXT | NULL | |
| is_deleted | BOOLEAN | NOT NULL | Default false |
| deleted_at | TIMESTAMPTZ | NULL | |
| created_at | TIMESTAMPTZ | NOT NULL | Default now() |
| updated_at | TIMESTAMPTZ | NOT NULL | Default now() |
| created_by | UUID | NOT NULL | FK → users.id |

---

### Table: cost_centers

**Purpose:** Logical groupings for financial reporting (e.g., North Region, Showroom BUC).
**RLS Pattern:** Pattern 3

| Column | Type | Null | Description |
|--------|------|------|-------------|
| id | UUID | NOT NULL | Primary key |
| company_id | UUID | NOT NULL | FK → companies.id |
| code | TEXT | NOT NULL | |
| name | TEXT | NOT NULL | |
| cost_center_type | TEXT | NOT NULL | department / project / location / product_line |
| parent_id | UUID | NULL | FK → cost_centers.id |
| is_active | BOOLEAN | NOT NULL | Default true |
| created_at | TIMESTAMPTZ | NOT NULL | Default now() |
| updated_at | TIMESTAMPTZ | NOT NULL | Default now() |
| created_by | UUID | NOT NULL | FK → users.id |

---

## Section 13 — Document Center (Module 09)

Centralized document management for all internal and client-facing documents. Integrates with all other modules.

---

### Table: document_folders

**Purpose:** Hierarchical folder structure. Company-scoped, optional department/project scope.
**RLS Pattern:** Pattern 3

| Column | Type | Null | Description |
|--------|------|------|-------------|
| id | UUID | NOT NULL | Primary key |
| company_id | UUID | NOT NULL | FK → companies.id |
| parent_id | UUID | NULL | FK → document_folders.id |
| name | TEXT | NOT NULL | |
| description | TEXT | NULL | |
| folder_type | TEXT | NOT NULL | general / contracts / hr / projects / invoices / renovation / system |
| visibility | TEXT | NOT NULL | company / department / team / private |
| department_id | UUID | NULL | FK → departments.id |
| project_id | UUID | NULL | Generic project reference |
| is_locked | BOOLEAN | NOT NULL | Default false — no new uploads |
| lexorank | TEXT | NOT NULL | |
| is_deleted | BOOLEAN | NOT NULL | Default false |
| deleted_at | TIMESTAMPTZ | NULL | |
| created_at | TIMESTAMPTZ | NOT NULL | Default now() |
| updated_at | TIMESTAMPTZ | NOT NULL | Default now() |
| created_by | UUID | NOT NULL | FK → users.id |

---

### Table: documents

**Purpose:** Master document record. One record per logical document regardless of number of versions.
**RLS Pattern:** Pattern 3

| Column | Type | Null | Description |
|--------|------|------|-------------|
| id | UUID | NOT NULL | Primary key |
| company_id | UUID | NOT NULL | FK → companies.id |
| folder_id | UUID | NULL | FK → document_folders.id |
| title | TEXT | NOT NULL | |
| document_type | TEXT | NOT NULL | contract / invoice / report / image / spreadsheet / presentation / form / other |
| description | TEXT | NULL | |
| status | TEXT | NOT NULL | draft / review / approved / published / archived |
| current_version_id | UUID | NULL | FK → document_versions.id |
| current_version_number | INTEGER | NOT NULL | Default 1 |
| is_template | BOOLEAN | NOT NULL | Default false |
| requires_signature | BOOLEAN | NOT NULL | Default false |
| signed_at | TIMESTAMPTZ | NULL | |
| approval_instance_id | UUID | NULL | FK → approval_instances.id |
| approved_at | TIMESTAMPTZ | NULL | |
| approved_by | UUID | NULL | FK → users.id |
| visibility | TEXT | NOT NULL | company / department / team / private / client |
| department_id | UUID | NULL | FK → departments.id |
| tags | TEXT[] | NOT NULL | Default '{}' |
| linked_entity_type | TEXT | NULL | renovation_project / contract / employee / invoice |
| linked_entity_id | UUID | NULL | Generic FK to source entity |
| retention_date | DATE | NULL | When document should be archived/deleted per policy |
| is_deleted | BOOLEAN | NOT NULL | Default false |
| deleted_at | TIMESTAMPTZ | NULL | |
| created_at | TIMESTAMPTZ | NOT NULL | Default now() |
| updated_at | TIMESTAMPTZ | NOT NULL | Default now() |
| created_by | UUID | NOT NULL | FK → users.id |

**Indexes:**
- `(company_id, folder_id)`
- `(company_id, document_type, status)`
- `(linked_entity_type, linked_entity_id)` — reverse lookup
- `(company_id, tags)` GIN

---

### Table: document_versions

**Purpose:** Immutable version history. Each upload creates a new version.
**RLS Pattern:** Pattern 3

| Column | Type | Null | Description |
|--------|------|------|-------------|
| id | UUID | NOT NULL | Primary key |
| company_id | UUID | NOT NULL | FK → companies.id |
| document_id | UUID | NOT NULL | FK → documents.id |
| version_number | INTEGER | NOT NULL | |
| file_name | TEXT | NOT NULL | Original filename |
| file_size_bytes | BIGINT | NOT NULL | |
| mime_type | TEXT | NOT NULL | |
| storage_path | TEXT | NOT NULL | S3/Supabase path |
| checksum_sha256 | TEXT | NOT NULL | File integrity |
| change_summary | TEXT | NULL | What changed in this version |
| uploaded_by | UUID | NOT NULL | FK → users.id |
| created_at | TIMESTAMPTZ | NOT NULL | Default now() |

**Indexes:**
- `(document_id, version_number)` UNIQUE
- `(company_id, created_at DESC)` — recent uploads

---

### Table: document_access_log

**Purpose:** Immutable record of every document view/download. GDPR audit trail.
**RLS Pattern:** Pattern 4 (managers can read, no writes)

| Column | Type | Null | Description |
|--------|------|------|-------------|
| id | UUID | NOT NULL | Primary key |
| company_id | UUID | NOT NULL | FK → companies.id |
| document_id | UUID | NOT NULL | FK → documents.id |
| version_id | UUID | NULL | FK → document_versions.id |
| user_id | UUID | NOT NULL | FK → users.id |
| access_type | TEXT | NOT NULL | view / download / print / share |
| ip_address | INET | NULL | |
| user_agent | TEXT | NULL | |
| accessed_at | TIMESTAMPTZ | NOT NULL | Default now() |

**Indexes:**
- `(document_id, accessed_at DESC)` — document access history
- `(company_id, user_id, accessed_at DESC)` — user activity
- Partitioned by month for scalability

---

### Table: document_shares

**Purpose:** Temporary or permanent share links for internal or external document sharing.
**RLS Pattern:** Pattern 3

| Column | Type | Null | Description |
|--------|------|------|-------------|
| id | UUID | NOT NULL | Primary key |
| company_id | UUID | NOT NULL | FK → companies.id |
| document_id | UUID | NOT NULL | FK → documents.id |
| share_token | TEXT | NOT NULL | Cryptographically random token |
| share_type | TEXT | NOT NULL | internal_user / external_link / client_portal |
| shared_with_user_id | UUID | NULL | FK → users.id (for internal) |
| shared_with_email | TEXT | NULL | For external |
| permissions | TEXT | NOT NULL | view / comment / download |
| expires_at | TIMESTAMPTZ | NULL | |
| max_views | INTEGER | NULL | |
| views_count | INTEGER | NOT NULL | Default 0 |
| password_hash | TEXT | NULL | Optional password protection |
| revoked_at | TIMESTAMPTZ | NULL | |
| revoked_by | UUID | NULL | FK → users.id |
| created_by | UUID | NOT NULL | FK → users.id |
| created_at | TIMESTAMPTZ | NOT NULL | Default now() |

**Indexes:**
- `(share_token)` UNIQUE — link resolution
- `(company_id, document_id)` — manage shares per document

---

## Section 14 — Communication Center (Module 10)

Internal messaging platform. Channels, direct messages, threads, reactions, and file attachments.

---

### Table: comm_channels

**Purpose:** Named channels for team or topic-based communication. Similar to Slack channels.
**RLS Pattern:** Pattern 3

| Column | Type | Null | Description |
|--------|------|------|-------------|
| id | UUID | NOT NULL | Primary key |
| company_id | UUID | NOT NULL | FK → companies.id |
| name | TEXT | NOT NULL | URL-safe channel name |
| display_name | TEXT | NOT NULL | |
| description | TEXT | NULL | |
| channel_type | TEXT | NOT NULL | public / private / direct / announcement |
| is_archived | BOOLEAN | NOT NULL | Default false |
| member_count | INTEGER | NOT NULL | Default 0 — denormalized for performance |
| last_message_at | TIMESTAMPTZ | NULL | |
| linked_entity_type | TEXT | NULL | project / renovation_project / department |
| linked_entity_id | UUID | NULL | |
| created_by | UUID | NOT NULL | FK → users.id |
| created_at | TIMESTAMPTZ | NOT NULL | Default now() |
| updated_at | TIMESTAMPTZ | NOT NULL | Default now() |

**Indexes:**
- `(company_id, name)` UNIQUE
- `(company_id, channel_type, is_archived)` — channel browser

---

### Table: comm_channel_members

**Purpose:** Channel membership roster.
**RLS Pattern:** Pattern 3

| Column | Type | Null | Description |
|--------|------|------|-------------|
| id | UUID | NOT NULL | Primary key |
| company_id | UUID | NOT NULL | FK → companies.id |
| channel_id | UUID | NOT NULL | FK → comm_channels.id |
| user_id | UUID | NOT NULL | FK → users.id |
| role | TEXT | NOT NULL | member / admin / owner |
| last_read_at | TIMESTAMPTZ | NULL | For unread badge |
| notification_preference | TEXT | NOT NULL | all / mentions / nothing |
| joined_at | TIMESTAMPTZ | NOT NULL | Default now() |
| is_muted | BOOLEAN | NOT NULL | Default false |

**Indexes:**
- `(channel_id, user_id)` UNIQUE
- `(user_id, company_id)` — user's channel list

---

### Table: comm_messages

**Purpose:** Messages in channels or DMs. Supports threading.
**RLS Pattern:** Pattern 1 (own) + Pattern 3 (channel members)

| Column | Type | Null | Description |
|--------|------|------|-------------|
| id | UUID | NOT NULL | Primary key |
| company_id | UUID | NOT NULL | FK → companies.id |
| channel_id | UUID | NOT NULL | FK → comm_channels.id |
| thread_parent_id | UUID | NULL | FK → comm_messages.id (if reply) |
| sender_id | UUID | NOT NULL | FK → users.id |
| message_type | TEXT | NOT NULL | text / file / system / ai_summary |
| content | TEXT | NULL | Plaintext content |
| content_html | TEXT | NULL | Rich text / markdown rendered |
| is_edited | BOOLEAN | NOT NULL | Default false |
| edited_at | TIMESTAMPTZ | NULL | |
| is_deleted | BOOLEAN | NOT NULL | Default false |
| deleted_at | TIMESTAMPTZ | NULL | |
| thread_reply_count | INTEGER | NOT NULL | Default 0 |
| reaction_counts | JSONB | NOT NULL | Default '{}' — {"👍": 3, "❤️": 1} |
| mentions | UUID[] | NOT NULL | Default '{}' — mentioned user IDs |
| linked_entity_type | TEXT | NULL | task / project / renovation_project |
| linked_entity_id | UUID | NULL | |
| metadata | JSONB | NOT NULL | Default '{}' |
| created_at | TIMESTAMPTZ | NOT NULL | Default now() |
| updated_at | TIMESTAMPTZ | NOT NULL | Default now() |

**Indexes:**
- `(channel_id, created_at DESC)` — channel message feed (PARTITIONED by channel or month)
- `(thread_parent_id, created_at)` — thread replies
- `(sender_id, company_id, created_at DESC)`
- `(mentions)` GIN — mention lookup

---

### Table: comm_message_attachments

**Purpose:** Files and media attached to messages.
**RLS Pattern:** Pattern 3

| Column | Type | Null | Description |
|--------|------|------|-------------|
| id | UUID | NOT NULL | Primary key |
| company_id | UUID | NOT NULL | FK → companies.id |
| message_id | UUID | NOT NULL | FK → comm_messages.id |
| document_id | UUID | NULL | FK → documents.id (if saved to doc center) |
| file_name | TEXT | NOT NULL | |
| file_size_bytes | BIGINT | NOT NULL | |
| mime_type | TEXT | NOT NULL | |
| storage_path | TEXT | NOT NULL | |
| thumbnail_path | TEXT | NULL | For images/video |
| created_at | TIMESTAMPTZ | NOT NULL | Default now() |

---

### Table: comm_reactions

**Purpose:** Per-user reactions on messages.
**RLS Pattern:** Pattern 3

| Column | Type | Null | Description |
|--------|------|------|-------------|
| id | UUID | NOT NULL | Primary key |
| company_id | UUID | NOT NULL | FK → companies.id |
| message_id | UUID | NOT NULL | FK → comm_messages.id |
| user_id | UUID | NOT NULL | FK → users.id |
| emoji | TEXT | NOT NULL | Unicode emoji character |
| created_at | TIMESTAMPTZ | NOT NULL | Default now() |

**Indexes:**
- `(message_id, user_id, emoji)` UNIQUE — one reaction per emoji per user

---

## Section 15 — Supplier Management (Module 23)

Standalone module for managing vendor relationships, onboarding, performance, and the external Supplier Portal.

---

### Table: suppliers

**Purpose:** Master supplier/vendor record. External companies that provide goods or services.
**RLS Pattern:** Pattern 3

| Column | Type | Null | Description |
|--------|------|------|-------------|
| id | UUID | NOT NULL | Primary key |
| company_id | UUID | NOT NULL | FK → companies.id |
| supplier_code | TEXT | NOT NULL | e.g. SUP-0041 |
| legal_name | TEXT | NOT NULL | |
| trading_name | TEXT | NULL | |
| supplier_type | TEXT | NOT NULL | materials / services / equipment / subcontractor / logistics |
| status | TEXT | NOT NULL | prospect / onboarding / active / suspended / blacklisted |
| tax_id | TEXT | NULL | CUI (encrypted at rest) |
| registration_number | TEXT | NULL | ORC |
| country | TEXT | NOT NULL | Default 'RO' |
| payment_terms_days | INTEGER | NOT NULL | Default 30 |
| currency | CHAR(3) | NOT NULL | Default 'RON' |
| credit_limit | NUMERIC(19,4) | NULL | |
| current_balance | NUMERIC(19,4) | NOT NULL | Default 0 — outstanding payables |
| rating | NUMERIC(3,2) | NULL | 0.00–5.00 — computed from evaluations |
| account_manager_id | UUID | NULL | FK → users.id — internal relationship owner |
| has_portal_access | BOOLEAN | NOT NULL | Default false |
| approval_instance_id | UUID | NULL | FK → approval_instances.id — onboarding approval |
| approved_at | TIMESTAMPTZ | NULL | |
| approved_by | UUID | NULL | FK → users.id |
| notes | TEXT | NULL | |
| tags | TEXT[] | NOT NULL | Default '{}' |
| metadata | JSONB | NOT NULL | Default '{}' |
| is_deleted | BOOLEAN | NOT NULL | Default false |
| deleted_at | TIMESTAMPTZ | NULL | |
| created_at | TIMESTAMPTZ | NOT NULL | Default now() |
| updated_at | TIMESTAMPTZ | NOT NULL | Default now() |
| created_by | UUID | NOT NULL | FK → users.id |

**Indexes:**
- `(company_id, supplier_code)` UNIQUE
- `(company_id, status, supplier_type)`
- `(company_id, tax_id)` — deduplication

---

### Table: supplier_contacts

**Purpose:** Individual persons at a supplier.
**RLS Pattern:** Pattern 3

| Column | Type | Null | Description |
|--------|------|------|-------------|
| id | UUID | NOT NULL | Primary key |
| company_id | UUID | NOT NULL | FK → companies.id |
| supplier_id | UUID | NOT NULL | FK → suppliers.id |
| first_name | TEXT | NOT NULL | |
| last_name | TEXT | NOT NULL | |
| role_at_supplier | TEXT | NULL | |
| email | TEXT | NULL | |
| phone | TEXT | NULL | |
| is_primary | BOOLEAN | NOT NULL | Default false |
| has_portal_access | BOOLEAN | NOT NULL | Default false |
| portal_user_id | UUID | NULL | FK → users.id |
| is_deleted | BOOLEAN | NOT NULL | Default false |
| deleted_at | TIMESTAMPTZ | NULL | |
| created_at | TIMESTAMPTZ | NOT NULL | Default now() |
| updated_at | TIMESTAMPTZ | NOT NULL | Default now() |

---

### Table: supplier_evaluations

**Purpose:** Periodic performance evaluations of suppliers. Builds rating score.
**RLS Pattern:** Pattern 3

| Column | Type | Null | Description |
|--------|------|------|-------------|
| id | UUID | NOT NULL | Primary key |
| company_id | UUID | NOT NULL | FK → companies.id |
| supplier_id | UUID | NOT NULL | FK → suppliers.id |
| evaluation_date | DATE | NOT NULL | |
| evaluated_by | UUID | NOT NULL | FK → users.id |
| period_covered | TEXT | NOT NULL | e.g. "Q1 2026" |
| quality_score | NUMERIC(3,2) | NOT NULL | 0.00–5.00 |
| delivery_score | NUMERIC(3,2) | NOT NULL | |
| price_competitiveness_score | NUMERIC(3,2) | NOT NULL | |
| communication_score | NUMERIC(3,2) | NOT NULL | |
| compliance_score | NUMERIC(3,2) | NOT NULL | |
| overall_score | NUMERIC(3,2) | NOT NULL | Computed average |
| notes | TEXT | NULL | |
| linked_purchase_order_id | UUID | NULL | FK → purchase_orders.id |
| is_deleted | BOOLEAN | NOT NULL | Default false |
| deleted_at | TIMESTAMPTZ | NULL | |
| created_at | TIMESTAMPTZ | NOT NULL | Default now() |
| updated_at | TIMESTAMPTZ | NOT NULL | Default now() |

---

### Table: supplier_documents

**Purpose:** Compliance and contract documents from suppliers (insurance, certificates, contracts).
**RLS Pattern:** Pattern 3

| Column | Type | Null | Description |
|--------|------|------|-------------|
| id | UUID | NOT NULL | Primary key |
| company_id | UUID | NOT NULL | FK → companies.id |
| supplier_id | UUID | NOT NULL | FK → suppliers.id |
| document_id | UUID | NOT NULL | FK → documents.id |
| document_category | TEXT | NOT NULL | contract / insurance / certificate / compliance / other |
| expiry_date | DATE | NULL | |
| is_verified | BOOLEAN | NOT NULL | Default false |
| verified_by | UUID | NULL | FK → users.id |
| verified_at | TIMESTAMPTZ | NULL | |
| created_at | TIMESTAMPTZ | NOT NULL | Default now() |

---

### Table: supplier_price_lists

**Purpose:** Agreed pricing from suppliers for materials/services.
**RLS Pattern:** Pattern 3

| Column | Type | Null | Description |
|--------|------|------|-------------|
| id | UUID | NOT NULL | Primary key |
| company_id | UUID | NOT NULL | FK → companies.id |
| supplier_id | UUID | NOT NULL | FK → suppliers.id |
| valid_from | DATE | NOT NULL | |
| valid_until | DATE | NULL | |
| currency | CHAR(3) | NOT NULL | Default 'RON' |
| is_active | BOOLEAN | NOT NULL | Default true |
| approved_by | UUID | NULL | FK → users.id |
| created_at | TIMESTAMPTZ | NOT NULL | Default now() |
| updated_at | TIMESTAMPTZ | NOT NULL | Default now() |
| created_by | UUID | NOT NULL | FK → users.id |

**Relationships:**
- ← supplier_price_list_items (one-to-many)

---

### Table: supplier_price_list_items

**Purpose:** Line items in a supplier price list.
**RLS Pattern:** Pattern 3

| Column | Type | Null | Description |
|--------|------|------|-------------|
| id | UUID | NOT NULL | Primary key |
| company_id | UUID | NOT NULL | FK → companies.id |
| price_list_id | UUID | NOT NULL | FK → supplier_price_lists.id |
| product_id | UUID | NULL | FK → products.id (if catalog match) |
| supplier_product_code | TEXT | NULL | Supplier's own product code |
| description | TEXT | NOT NULL | |
| unit | TEXT | NOT NULL | |
| unit_price | NUMERIC(19,4) | NOT NULL | |
| min_order_quantity | NUMERIC(12,4) | NOT NULL | Default 1 |
| lead_time_days | INTEGER | NULL | |
| created_at | TIMESTAMPTZ | NOT NULL | Default now() |

---

## Section 16 — Procurement (Module 15)

Purchase Order management. Links supplier management, renovation material requests, inventory, and finance.

---

### Table: purchase_orders

**Purpose:** Formal purchase orders sent to suppliers.
**RLS Pattern:** Pattern 3

| Column | Type | Null | Description |
|--------|------|------|-------------|
| id | UUID | NOT NULL | Primary key |
| company_id | UUID | NOT NULL | FK → companies.id |
| po_number | TEXT | NOT NULL | e.g. PO-2026-00421 |
| supplier_id | UUID | NOT NULL | FK → suppliers.id |
| status | TEXT | NOT NULL | draft / pending_approval / approved / sent / acknowledged / partially_delivered / delivered / invoiced / closed / cancelled |
| order_date | DATE | NOT NULL | |
| expected_delivery_date | DATE | NULL | |
| actual_delivery_date | DATE | NULL | |
| delivery_location_id | UUID | NULL | FK → inventory_locations.id |
| subtotal | NUMERIC(19,4) | NOT NULL | |
| tax_amount | NUMERIC(19,4) | NOT NULL | Default 0 |
| shipping_amount | NUMERIC(19,4) | NOT NULL | Default 0 |
| total | NUMERIC(19,4) | NOT NULL | |
| currency | CHAR(3) | NOT NULL | Default 'RON' |
| payment_terms_days | INTEGER | NOT NULL | |
| payment_due_date | DATE | NULL | |
| paid_amount | NUMERIC(19,4) | NOT NULL | Default 0 |
| renovation_project_id | UUID | NULL | FK → renovation_projects.id |
| material_request_id | UUID | NULL | FK → renovation_material_requests.id |
| approval_instance_id | UUID | NULL | FK → approval_instances.id |
| approved_by | UUID | NULL | FK → users.id |
| approved_at | TIMESTAMPTZ | NULL | |
| sent_at | TIMESTAMPTZ | NULL | |
| notes | TEXT | NULL | |
| supplier_reference | TEXT | NULL | Supplier's own order number |
| document_id | UUID | NULL | FK → documents.id — generated PDF |
| is_deleted | BOOLEAN | NOT NULL | Default false |
| deleted_at | TIMESTAMPTZ | NULL | |
| created_at | TIMESTAMPTZ | NOT NULL | Default now() |
| updated_at | TIMESTAMPTZ | NOT NULL | Default now() |
| created_by | UUID | NOT NULL | FK → users.id |

**Indexes:**
- `(company_id, po_number)` UNIQUE
- `(company_id, supplier_id, status)` — supplier AP
- `(company_id, status, expected_delivery_date)` — delivery tracking
- `(renovation_project_id)` — project procurement

---

### Table: purchase_order_lines

**Purpose:** Line items in a purchase order.
**RLS Pattern:** Pattern 3

| Column | Type | Null | Description |
|--------|------|------|-------------|
| id | UUID | NOT NULL | Primary key |
| company_id | UUID | NOT NULL | FK → companies.id |
| po_id | UUID | NOT NULL | FK → purchase_orders.id |
| line_number | INTEGER | NOT NULL | |
| product_id | UUID | NULL | FK → products.id |
| supplier_product_code | TEXT | NULL | |
| description | TEXT | NOT NULL | |
| unit | TEXT | NOT NULL | |
| quantity_ordered | NUMERIC(12,4) | NOT NULL | |
| quantity_received | NUMERIC(12,4) | NOT NULL | Default 0 |
| unit_price | NUMERIC(19,4) | NOT NULL | |
| tax_rate | NUMERIC(5,2) | NOT NULL | Default 19 |
| tax_amount | NUMERIC(19,4) | NOT NULL | |
| line_total | NUMERIC(19,4) | NOT NULL | |
| fully_received | BOOLEAN | NOT NULL | Default false |
| created_at | TIMESTAMPTZ | NOT NULL | Default now() |
| updated_at | TIMESTAMPTZ | NOT NULL | Default now() |

---

### Table: goods_receipts

**Purpose:** Records actual delivery of goods against a purchase order.
**RLS Pattern:** Pattern 3

| Column | Type | Null | Description |
|--------|------|------|-------------|
| id | UUID | NOT NULL | Primary key |
| company_id | UUID | NOT NULL | FK → companies.id |
| receipt_number | TEXT | NOT NULL | |
| po_id | UUID | NOT NULL | FK → purchase_orders.id |
| supplier_id | UUID | NOT NULL | FK → suppliers.id |
| location_id | UUID | NOT NULL | FK → inventory_locations.id |
| received_date | DATE | NOT NULL | |
| received_by | UUID | NOT NULL | FK → users.id |
| status | TEXT | NOT NULL | draft / confirmed / discrepancy |
| supplier_delivery_note | TEXT | NULL | Supplier's own delivery note number |
| notes | TEXT | NULL | |
| created_at | TIMESTAMPTZ | NOT NULL | Default now() |
| updated_at | TIMESTAMPTZ | NOT NULL | Default now() |

**Relationships:**
- ← goods_receipt_lines (one-to-many)
- Triggers inventory_movements on confirmation

---

### Table: goods_receipt_lines

**Purpose:** Items received per goods receipt.
**RLS Pattern:** Pattern 3

| Column | Type | Null | Description |
|--------|------|------|-------------|
| id | UUID | NOT NULL | Primary key |
| company_id | UUID | NOT NULL | FK → companies.id |
| receipt_id | UUID | NOT NULL | FK → goods_receipts.id |
| po_line_id | UUID | NOT NULL | FK → purchase_order_lines.id |
| quantity_received | NUMERIC(12,4) | NOT NULL | |
| quantity_accepted | NUMERIC(12,4) | NOT NULL | |
| quantity_rejected | NUMERIC(12,4) | NOT NULL | Default 0 |
| rejection_reason | TEXT | NULL | |
| created_at | TIMESTAMPTZ | NOT NULL | Default now() |

---

### Table: supplier_invoices

**Purpose:** Incoming invoices FROM suppliers (accounts payable). Matched to purchase orders.
**RLS Pattern:** Pattern 3

| Column | Type | Null | Description |
|--------|------|------|-------------|
| id | UUID | NOT NULL | Primary key |
| company_id | UUID | NOT NULL | FK → companies.id |
| supplier_id | UUID | NOT NULL | FK → suppliers.id |
| po_id | UUID | NULL | FK → purchase_orders.id |
| supplier_invoice_number | TEXT | NOT NULL | As stated on supplier's invoice |
| status | TEXT | NOT NULL | received / matching / matched / approved / scheduled / paid / disputed |
| invoice_date | DATE | NOT NULL | |
| due_date | DATE | NOT NULL | |
| subtotal | NUMERIC(19,4) | NOT NULL | |
| tax_amount | NUMERIC(19,4) | NOT NULL | Default 0 |
| total | NUMERIC(19,4) | NOT NULL | |
| paid_amount | NUMERIC(19,4) | NOT NULL | Default 0 |
| currency | CHAR(3) | NOT NULL | Default 'RON' |
| approval_instance_id | UUID | NULL | FK → approval_instances.id |
| approved_by | UUID | NULL | FK → users.id |
| approved_at | TIMESTAMPTZ | NULL | |
| document_id | UUID | NULL | FK → documents.id |
| dispute_reason | TEXT | NULL | |
| notes | TEXT | NULL | |
| is_deleted | BOOLEAN | NOT NULL | Default false |
| deleted_at | TIMESTAMPTZ | NULL | |
| created_at | TIMESTAMPTZ | NOT NULL | Default now() |
| updated_at | TIMESTAMPTZ | NOT NULL | Default now() |
| created_by | UUID | NOT NULL | FK → users.id |

**Indexes:**
- `(company_id, supplier_id, status)` — AP dashboard
- `(company_id, due_date, status)` — payment schedule
- `(po_id)` — 3-way matching

---

## Section 17 — Tools Management (Module 16)

Tracks company-owned tools, equipment, and consumables. Manages assignment, maintenance, and loss.

---

### Table: tool_categories

**Purpose:** Taxonomy for tools and equipment.
**RLS Pattern:** Pattern 2

| Column | Type | Null | Description |
|--------|------|------|-------------|
| id | UUID | NOT NULL | Primary key |
| company_id | UUID | NOT NULL | FK → companies.id |
| parent_id | UUID | NULL | FK → tool_categories.id |
| name | TEXT | NOT NULL | |
| description | TEXT | NULL | |
| is_active | BOOLEAN | NOT NULL | Default true |
| created_at | TIMESTAMPTZ | NOT NULL | Default now() |
| created_by | UUID | NOT NULL | FK → users.id |

---

### Table: tools

**Purpose:** Individual tool/equipment asset record. Each physical item has one record.
**RLS Pattern:** Pattern 3

| Column | Type | Null | Description |
|--------|------|------|-------------|
| id | UUID | NOT NULL | Primary key |
| company_id | UUID | NOT NULL | FK → companies.id |
| asset_code | TEXT | NOT NULL | e.g. TL-2026-00041 |
| category_id | UUID | NULL | FK → tool_categories.id |
| name | TEXT | NOT NULL | |
| description | TEXT | NULL | |
| brand | TEXT | NULL | |
| model | TEXT | NULL | |
| serial_number | TEXT | NULL | |
| barcode | TEXT | NULL | |
| status | TEXT | NOT NULL | available / assigned / in_maintenance / lost / damaged / retired |
| condition | TEXT | NOT NULL | new / good / fair / poor |
| purchase_date | DATE | NULL | |
| purchase_price | NUMERIC(19,4) | NULL | |
| current_value | NUMERIC(19,4) | NULL | After depreciation |
| currency | CHAR(3) | NOT NULL | Default 'RON' |
| warranty_expiry_date | DATE | NULL | |
| location_id | UUID | NULL | FK → inventory_locations.id |
| assigned_to_user_id | UUID | NULL | FK → users.id |
| assigned_to_project_id | UUID | NULL | FK → renovation_projects.id |
| assigned_at | TIMESTAMPTZ | NULL | |
| next_maintenance_date | DATE | NULL | |
| notes | TEXT | NULL | |
| image_url | TEXT | NULL | |
| is_deleted | BOOLEAN | NOT NULL | Default false |
| deleted_at | TIMESTAMPTZ | NULL | |
| created_at | TIMESTAMPTZ | NOT NULL | Default now() |
| updated_at | TIMESTAMPTZ | NOT NULL | Default now() |
| created_by | UUID | NOT NULL | FK → users.id |

**Indexes:**
- `(company_id, asset_code)` UNIQUE
- `(company_id, status)` — availability dashboard
- `(assigned_to_user_id)` — worker's tools
- `(assigned_to_project_id)` — project equipment

---

### Table: tool_assignments

**Purpose:** History of all tool assignments. Immutable log.
**RLS Pattern:** Pattern 3

| Column | Type | Null | Description |
|--------|------|------|-------------|
| id | UUID | NOT NULL | Primary key |
| company_id | UUID | NOT NULL | FK → companies.id |
| tool_id | UUID | NOT NULL | FK → tools.id |
| assigned_to_user_id | UUID | NULL | FK → users.id |
| assigned_to_project_id | UUID | NULL | FK → renovation_projects.id |
| assignment_type | TEXT | NOT NULL | user / project / location |
| assigned_at | TIMESTAMPTZ | NOT NULL | Default now() |
| assigned_by | UUID | NOT NULL | FK → users.id |
| expected_return_date | DATE | NULL | |
| returned_at | TIMESTAMPTZ | NULL | |
| returned_by | UUID | NULL | FK → users.id |
| condition_on_assignment | TEXT | NOT NULL | |
| condition_on_return | TEXT | NULL | |
| notes | TEXT | NULL | |

**Indexes:**
- `(tool_id, assigned_at DESC)` — tool history
- `(assigned_to_user_id, returned_at)` — active assignments per user

---

### Table: tool_maintenance_records

**Purpose:** Maintenance and repair history for tools.
**RLS Pattern:** Pattern 3

| Column | Type | Null | Description |
|--------|------|------|-------------|
| id | UUID | NOT NULL | Primary key |
| company_id | UUID | NOT NULL | FK → companies.id |
| tool_id | UUID | NOT NULL | FK → tools.id |
| maintenance_type | TEXT | NOT NULL | scheduled / corrective / inspection |
| status | TEXT | NOT NULL | scheduled / in_progress / completed / cancelled |
| scheduled_date | DATE | NULL | |
| completed_date | DATE | NULL | |
| performed_by | UUID | NULL | FK → users.id |
| external_service_provider | TEXT | NULL | |
| cost | NUMERIC(19,4) | NULL | |
| currency | CHAR(3) | NOT NULL | Default 'RON' |
| description | TEXT | NOT NULL | |
| parts_replaced | TEXT | NULL | |
| next_maintenance_date | DATE | NULL | |
| document_id | UUID | NULL | FK → documents.id |
| created_at | TIMESTAMPTZ | NOT NULL | Default now() |
| updated_at | TIMESTAMPTZ | NOT NULL | Default now() |
| created_by | UUID | NOT NULL | FK → users.id |

---

## Section 18 — Fleet Management (Module 17)

Manages company vehicles: assignment, maintenance, fuel, insurance, legal compliance, and GPS tracking.

---

### Table: vehicles

**Purpose:** Company vehicle master record.
**RLS Pattern:** Pattern 3

| Column | Type | Null | Description |
|--------|------|------|-------------|
| id | UUID | NOT NULL | Primary key |
| company_id | UUID | NOT NULL | FK → companies.id |
| asset_code | TEXT | NOT NULL | e.g. VEH-2026-0041 |
| registration_plate | TEXT | NOT NULL | |
| vin | TEXT | NULL | Vehicle Identification Number |
| vehicle_type | TEXT | NOT NULL | car / van / truck / pickup / machinery |
| make | TEXT | NOT NULL | |
| model | TEXT | NOT NULL | |
| year | INTEGER | NOT NULL | |
| color | TEXT | NULL | |
| fuel_type | TEXT | NOT NULL | petrol / diesel / electric / hybrid / lpg |
| engine_cc | INTEGER | NULL | |
| payload_kg | NUMERIC(8,2) | NULL | |
| status | TEXT | NOT NULL | available / assigned / in_maintenance / out_of_service / sold |
| odometer_km | NUMERIC(10,2) | NOT NULL | Default 0 |
| assigned_to_user_id | UUID | NULL | FK → users.id |
| assigned_to_project_id | UUID | NULL | FK → renovation_projects.id |
| current_location | POINT | NULL | Last known GPS |
| location_updated_at | TIMESTAMPTZ | NULL | |
| purchase_date | DATE | NULL | |
| purchase_price | NUMERIC(19,4) | NULL | |
| current_value | NUMERIC(19,4) | NULL | |
| currency | CHAR(3) | NOT NULL | Default 'RON' |
| insurance_expiry_date | DATE | NULL | |
| roadworthiness_expiry_date | DATE | NULL | ITP expiry |
| vignette_expiry_date | DATE | NULL | |
| next_service_km | NUMERIC(10,2) | NULL | |
| next_service_date | DATE | NULL | |
| notes | TEXT | NULL | |
| is_deleted | BOOLEAN | NOT NULL | Default false |
| deleted_at | TIMESTAMPTZ | NULL | |
| created_at | TIMESTAMPTZ | NOT NULL | Default now() |
| updated_at | TIMESTAMPTZ | NOT NULL | Default now() |
| created_by | UUID | NOT NULL | FK → users.id |

**Indexes:**
- `(company_id, asset_code)` UNIQUE
- `(company_id, registration_plate)` UNIQUE
- `(company_id, status)` — fleet overview
- `(assigned_to_user_id)` — driver assignment

---

### Table: vehicle_assignments

**Purpose:** Immutable log of vehicle assignment history.
**RLS Pattern:** Pattern 3

| Column | Type | Null | Description |
|--------|------|------|-------------|
| id | UUID | NOT NULL | Primary key |
| company_id | UUID | NOT NULL | FK → companies.id |
| vehicle_id | UUID | NOT NULL | FK → vehicles.id |
| assigned_to_user_id | UUID | NULL | FK → users.id |
| assigned_to_project_id | UUID | NULL | FK → renovation_projects.id |
| assigned_at | TIMESTAMPTZ | NOT NULL | Default now() |
| assigned_by | UUID | NOT NULL | FK → users.id |
| expected_return_date | DATE | NULL | |
| returned_at | TIMESTAMPTZ | NULL | |
| returned_by | UUID | NULL | FK → users.id |
| odometer_on_assignment | NUMERIC(10,2) | NOT NULL | |
| odometer_on_return | NUMERIC(10,2) | NULL | |
| notes | TEXT | NULL | |

---

### Table: vehicle_fuel_logs

**Purpose:** Fuel fill-up records. Supports cost tracking and consumption analysis.
**RLS Pattern:** Pattern 3

| Column | Type | Null | Description |
|--------|------|------|-------------|
| id | UUID | NOT NULL | Primary key |
| company_id | UUID | NOT NULL | FK → companies.id |
| vehicle_id | UUID | NOT NULL | FK → vehicles.id |
| driver_id | UUID | NOT NULL | FK → users.id |
| log_date | DATE | NOT NULL | |
| odometer_km | NUMERIC(10,2) | NOT NULL | |
| fuel_liters | NUMERIC(8,3) | NOT NULL | |
| price_per_liter | NUMERIC(8,4) | NOT NULL | |
| total_cost | NUMERIC(19,4) | NOT NULL | |
| currency | CHAR(3) | NOT NULL | Default 'RON' |
| fuel_station | TEXT | NULL | |
| receipt_document_id | UUID | NULL | FK → documents.id |
| notes | TEXT | NULL | |
| created_at | TIMESTAMPTZ | NOT NULL | Default now() |

**Indexes:**
- `(vehicle_id, log_date DESC)` — fuel history
- `(company_id, log_date DESC)` — fleet fuel costs

---

### Table: vehicle_maintenance_records

**Purpose:** Service and repair history. Similar structure to tool_maintenance_records.
**RLS Pattern:** Pattern 3

| Column | Type | Null | Description |
|--------|------|------|-------------|
| id | UUID | NOT NULL | Primary key |
| company_id | UUID | NOT NULL | FK → companies.id |
| vehicle_id | UUID | NOT NULL | FK → vehicles.id |
| maintenance_type | TEXT | NOT NULL | scheduled / corrective / inspection / legal |
| status | TEXT | NOT NULL | scheduled / in_progress / completed / cancelled |
| scheduled_date | DATE | NULL | |
| completed_date | DATE | NULL | |
| odometer_at_service | NUMERIC(10,2) | NULL | |
| performed_by_user | UUID | NULL | FK → users.id |
| service_center_name | TEXT | NULL | |
| cost | NUMERIC(19,4) | NULL | |
| currency | CHAR(3) | NOT NULL | Default 'RON' |
| description | TEXT | NOT NULL | |
| parts_replaced | TEXT | NULL | |
| next_service_km | NUMERIC(10,2) | NULL | |
| next_service_date | DATE | NULL | |
| document_id | UUID | NULL | FK → documents.id |
| created_at | TIMESTAMPTZ | NOT NULL | Default now() |
| updated_at | TIMESTAMPTZ | NOT NULL | Default now() |
| created_by | UUID | NOT NULL | FK → users.id |

---

### Table: vehicle_trips

**Purpose:** Recorded trips per vehicle. Populated from GPS integration or manual entry.
**RLS Pattern:** Pattern 3

| Column | Type | Null | Description |
|--------|------|------|-------------|
| id | UUID | NOT NULL | Primary key |
| company_id | UUID | NOT NULL | FK → companies.id |
| vehicle_id | UUID | NOT NULL | FK → vehicles.id |
| driver_id | UUID | NOT NULL | FK → users.id |
| trip_purpose | TEXT | NOT NULL | project / client_visit / procurement / personal / other |
| project_id | UUID | NULL | FK → renovation_projects.id |
| start_location | TEXT | NOT NULL | |
| start_coordinates | POINT | NULL | |
| end_location | TEXT | NOT NULL | |
| end_coordinates | POINT | NULL | |
| started_at | TIMESTAMPTZ | NOT NULL | |
| ended_at | TIMESTAMPTZ | NULL | |
| odometer_start | NUMERIC(10,2) | NOT NULL | |
| odometer_end | NUMERIC(10,2) | NULL | |
| distance_km | NUMERIC(8,2) | NULL | Computed: end - start |
| notes | TEXT | NULL | |
| created_at | TIMESTAMPTZ | NOT NULL | Default now() |
| updated_at | TIMESTAMPTZ | NOT NULL | Default now() |

**Indexes:**
- `(vehicle_id, started_at DESC)` — trip history
- `(driver_id, started_at DESC)` — driver trip log
- `(company_id, started_at DESC)` — fleet activity
- Partitioned by month for high-frequency GPS data

---

### Table: vehicle_documents

**Purpose:** Legal documents per vehicle (insurance, ITP, registration).
**RLS Pattern:** Pattern 3

| Column | Type | Null | Description |
|--------|------|------|-------------|
| id | UUID | NOT NULL | Primary key |
| company_id | UUID | NOT NULL | FK → companies.id |
| vehicle_id | UUID | NOT NULL | FK → vehicles.id |
| document_id | UUID | NOT NULL | FK → documents.id |
| document_type | TEXT | NOT NULL | insurance / roadworthiness / registration / vignette / other |
| issue_date | DATE | NULL | |
| expiry_date | DATE | NULL | |
| issuing_authority | TEXT | NULL | |
| created_at | TIMESTAMPTZ | NOT NULL | Default now() |

**Indexes:**
- `(vehicle_id, expiry_date)` — expiry tracking
- `(company_id, document_type, expiry_date)` — fleet compliance overview

---

## Cross-Module Relationship Index (Part 2)

```
renovation_projects ──→ crm_clients (client ownership)
renovation_projects ──→ renovation_phases ──→ renovation_tasks
renovation_projects ──→ renovation_estimates ──→ renovation_estimate_lines
renovation_projects ──→ renovation_contracts
renovation_projects ──→ renovation_site_reports
renovation_projects ──→ renovation_material_requests ──→ purchase_orders
renovation_projects ──→ invoices (billing)

products ──→ product_variants
products ──→ product_price_tiers
products ──→ inventory_items ──→ inventory_locations
inventory_movements ←── shop_orders / purchase_orders / site_reports

shop_orders ──→ shop_order_lines
shop_orders ──→ invoices (auto-generate)
shop_orders ──→ approval_instances (discount approval)

crm_clients ──→ crm_contacts ──→ users (portal access)
crm_clients ──→ crm_interactions
crm_clients ──→ crm_opportunities ──→ renovation_projects (conversion)
crm_clients ──→ crm_quotes ──→ approval_instances

invoices ──→ payment_allocations ←── payments
invoices ──→ e_invoice (ANAF integration via e_invoice_id)
expense_claims ──→ approval_instances
budgets ──→ departments / renovation_projects

documents ──→ document_versions (version history)
documents ──→ document_access_log (audit)
documents ──→ document_shares (access tokens)
documents ←── invoice / contract / PO / site_report (all modules generate docs)

comm_channels ──→ comm_channel_members
comm_messages ──→ comm_reactions
comm_messages ──→ comm_message_attachments ──→ documents

suppliers ──→ supplier_contacts ──→ users (portal access)
suppliers ──→ supplier_evaluations (scoring)
suppliers ──→ supplier_price_lists ──→ supplier_price_list_items
suppliers ──→ supplier_invoices (AP)

purchase_orders ──→ purchase_order_lines
purchase_orders ──→ goods_receipts ──→ goods_receipt_lines
goods_receipts → (triggers) inventory_movements

tools ──→ tool_assignments (history log)
tools ──→ tool_maintenance_records
tools → assigned_to renovation_projects

vehicles ──→ vehicle_assignments (history log)
vehicles ──→ vehicle_fuel_logs
vehicles ──→ vehicle_maintenance_records
vehicles ──→ vehicle_trips → renovation_projects
vehicles ──→ vehicle_documents (compliance)
```

---

*End of Part 2 — Continues in DATABASE_BLUEPRINT_PART3.md*

*Part 3 covers: Notifications · Analytics · AI Data Structures · Audit Logs · Webhooks & API · Knowledge Base · Learning Center · Safety Center · System Tables*
