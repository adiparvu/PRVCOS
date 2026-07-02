-- Leave Balances (roadmap 7.3). One row per (user, leave type, year): annual
-- entitlement, days carried over from the prior year, an optional monthly
-- accrual rate, and running used / pending tallies. Available is computed in the
-- app layer (entitlement + carried_over − used − pending). Company-scoped.

CREATE TABLE "leave_balances" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "company_id" uuid NOT NULL REFERENCES "companies"("id") ON DELETE CASCADE,
  "user_id" uuid NOT NULL REFERENCES "users"("id") ON DELETE CASCADE,
  "type" "leave_type" DEFAULT 'annual' NOT NULL,
  "year" integer NOT NULL,
  "entitlement_days" numeric(6,2) DEFAULT '0' NOT NULL,
  "carried_over_days" numeric(6,2) DEFAULT '0' NOT NULL,
  "accrual_days_per_month" numeric(5,2),
  "used_days" numeric(6,2) DEFAULT '0' NOT NULL,
  "pending_days" numeric(6,2) DEFAULT '0' NOT NULL,
  "created_at" timestamptz DEFAULT now() NOT NULL,
  "updated_at" timestamptz DEFAULT now() NOT NULL
);

CREATE UNIQUE INDEX "leave_balances_user_type_year_unique" ON "leave_balances" ("user_id", "type", "year");
CREATE INDEX "leave_balances_company_id_idx" ON "leave_balances" ("company_id");
CREATE INDEX "leave_balances_user_id_idx" ON "leave_balances" ("user_id");
