-- Sprint 14: Budgets — per-category, per-period spend caps

CREATE TYPE "budget_period_type" AS ENUM ('monthly', 'quarterly', 'annual');

CREATE TABLE "budgets" (
  "id"                  uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "company_id"          uuid NOT NULL REFERENCES "companies"("id") ON DELETE CASCADE,
  "store_id"            uuid REFERENCES "stores"("id") ON DELETE SET NULL,
  "created_by_user_id"  uuid REFERENCES "users"("id") ON DELETE SET NULL,
  "name"                varchar(255) NOT NULL,
  "category"            "expense_category" NOT NULL,
  "period_type"         "budget_period_type" NOT NULL DEFAULT 'monthly',
  "period_key"          varchar(10) NOT NULL,
  "cap_amount"          numeric(12, 2) NOT NULL,
  "currency"            varchar(3) NOT NULL DEFAULT 'RON',
  "notes"               text,
  "created_at"          timestamptz NOT NULL DEFAULT now(),
  "updated_at"          timestamptz NOT NULL DEFAULT now(),
  "deleted_at"          timestamptz
);

CREATE INDEX "budgets_company_id_idx" ON "budgets"("company_id");
CREATE INDEX "budgets_period_key_idx" ON "budgets"("period_key");
CREATE INDEX "budgets_category_idx"   ON "budgets"("category");
