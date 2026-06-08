-- ============================================================
-- Migration 0003: Expenses table (Sprint 07)
-- ============================================================

-- ─── Enums ────────────────────────────────────────────────────────────────

CREATE TYPE expense_category AS ENUM (
  'materials',
  'labor',
  'equipment',
  'transport',
  'rent',
  'utilities',
  'marketing',
  'salaries',
  'subscriptions',
  'other'
);

CREATE TYPE expense_status AS ENUM (
  'draft',
  'submitted',
  'approved',
  'rejected',
  'paid'
);

-- ─── Expenses ────────────────────────────────────────────────────────────

CREATE TABLE expenses (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id       UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  store_id         UUID REFERENCES stores(id) ON DELETE SET NULL,
  submitted_by_id  UUID REFERENCES users(id) ON DELETE SET NULL,

  title            VARCHAR(255) NOT NULL,
  category         expense_category NOT NULL DEFAULT 'other',
  status           expense_status NOT NULL DEFAULT 'draft',

  amount           NUMERIC(12, 2) NOT NULL,
  currency         VARCHAR(3) NOT NULL DEFAULT 'RON',

  date             DATE NOT NULL,
  notes            TEXT,
  receipt_url      TEXT,

  created_at       TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at       TIMESTAMPTZ NOT NULL DEFAULT now(),
  deleted_at       TIMESTAMPTZ
);

CREATE INDEX expenses_company_id_idx ON expenses(company_id);
CREATE INDEX expenses_date_idx       ON expenses(date);
CREATE INDEX expenses_status_idx     ON expenses(status);
CREATE INDEX expenses_category_idx   ON expenses(category);
