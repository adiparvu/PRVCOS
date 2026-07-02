-- Payroll Line Items (roadmap 8.2). One row per employee per payroll run — the
-- per-employee payslip. Gross = base + overtime + bonus + allowance; net =
-- gross − deduction (computed in the app layer). Run header totals are derived
-- by summing these lines. Company-scoped; one line per (run, user).

CREATE TABLE "payroll_items" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "company_id" uuid NOT NULL REFERENCES "companies"("id") ON DELETE CASCADE,
  "run_id" uuid NOT NULL REFERENCES "payroll_runs"("id") ON DELETE CASCADE,
  "user_id" uuid NOT NULL REFERENCES "users"("id") ON DELETE CASCADE,
  "base_amount" numeric(12,2) DEFAULT '0' NOT NULL,
  "overtime_hours" numeric(8,2) DEFAULT '0' NOT NULL,
  "overtime_amount" numeric(12,2) DEFAULT '0' NOT NULL,
  "bonus_amount" numeric(12,2) DEFAULT '0' NOT NULL,
  "allowance_amount" numeric(12,2) DEFAULT '0' NOT NULL,
  "deduction_amount" numeric(12,2) DEFAULT '0' NOT NULL,
  "gross_amount" numeric(12,2) DEFAULT '0' NOT NULL,
  "net_amount" numeric(12,2) DEFAULT '0' NOT NULL,
  "currency" varchar(3) DEFAULT 'RON' NOT NULL,
  "notes" text,
  "created_at" timestamptz DEFAULT now() NOT NULL,
  "updated_at" timestamptz DEFAULT now() NOT NULL
);

CREATE UNIQUE INDEX "payroll_items_run_user_unique" ON "payroll_items" ("run_id", "user_id");
CREATE INDEX "payroll_items_company_id_idx" ON "payroll_items" ("company_id");
CREATE INDEX "payroll_items_run_id_idx" ON "payroll_items" ("run_id");
CREATE INDEX "payroll_items_user_id_idx" ON "payroll_items" ("user_id");
