-- Employment Contracts (roadmap 8.1). The employment lifecycle: an employee's
-- contract with type, dates, salary snapshot, and a version chain (amendments
-- create a new version and supersede the prior one; history is kept), plus a
-- termination record and digital-signing timestamp. Company-scoped.

CREATE TYPE "employment_contract_type" AS ENUM ('permanent', 'fixed_term', 'contractor', 'intern');
CREATE TYPE "employment_contract_status" AS ENUM ('draft', 'active', 'expired', 'terminated', 'superseded');
CREATE TYPE "employment_pay_period" AS ENUM ('hourly', 'monthly', 'annual');

CREATE TABLE "employment_contracts" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "company_id" uuid NOT NULL REFERENCES "companies"("id") ON DELETE CASCADE,
  "user_id" uuid NOT NULL REFERENCES "users"("id") ON DELETE CASCADE,
  "type" "employment_contract_type" DEFAULT 'permanent' NOT NULL,
  "status" "employment_contract_status" DEFAULT 'draft' NOT NULL,
  "role_title" varchar(160) NOT NULL,
  "start_date" date NOT NULL,
  "end_date" date,
  "salary_amount" numeric(12,2),
  "salary_currency" varchar(3) DEFAULT 'RON' NOT NULL,
  "pay_period" "employment_pay_period" DEFAULT 'monthly' NOT NULL,
  "notice_period_days" integer,
  "terms" text,
  "version" integer DEFAULT 1 NOT NULL,
  "supersedes_id" uuid REFERENCES "employment_contracts"("id") ON DELETE SET NULL,
  "termination_reason" text,
  "termination_date" date,
  "final_working_day" date,
  "signed_at" timestamptz,
  "created_by_id" uuid REFERENCES "users"("id") ON DELETE SET NULL,
  "created_at" timestamptz DEFAULT now() NOT NULL,
  "updated_at" timestamptz DEFAULT now() NOT NULL
);

CREATE INDEX "employment_contracts_company_id_idx" ON "employment_contracts" ("company_id");
CREATE INDEX "employment_contracts_user_id_idx" ON "employment_contracts" ("user_id");
CREATE INDEX "employment_contracts_status_idx" ON "employment_contracts" ("status");
CREATE INDEX "employment_contracts_end_date_idx" ON "employment_contracts" ("end_date");
