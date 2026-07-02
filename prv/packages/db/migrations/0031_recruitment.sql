-- Recruitment (roadmap 8.3). Job requisitions and the candidate pipeline
-- (sourcing → screening → phone_screen → interview → assessment → offer →
-- hired / rejected). Company-scoped.

CREATE TYPE "requisition_status" AS ENUM ('open', 'on_hold', 'filled', 'closed');
CREATE TYPE "candidate_stage" AS ENUM ('sourcing', 'screening', 'phone_screen', 'interview', 'assessment', 'offer', 'hired', 'rejected');

CREATE TABLE "job_requisitions" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "company_id" uuid NOT NULL REFERENCES "companies"("id") ON DELETE CASCADE,
  "title" varchar(160) NOT NULL,
  "department_id" uuid REFERENCES "departments"("id") ON DELETE SET NULL,
  "employment_type" "employment_contract_type" DEFAULT 'permanent' NOT NULL,
  "headcount" integer DEFAULT 1 NOT NULL,
  "status" "requisition_status" DEFAULT 'open' NOT NULL,
  "hiring_manager_id" uuid REFERENCES "users"("id") ON DELETE SET NULL,
  "location" varchar(160),
  "description" text,
  "opened_at" date,
  "created_by_id" uuid REFERENCES "users"("id") ON DELETE SET NULL,
  "created_at" timestamptz DEFAULT now() NOT NULL,
  "updated_at" timestamptz DEFAULT now() NOT NULL
);

CREATE TABLE "candidates" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "company_id" uuid NOT NULL REFERENCES "companies"("id") ON DELETE CASCADE,
  "requisition_id" uuid NOT NULL REFERENCES "job_requisitions"("id") ON DELETE CASCADE,
  "full_name" varchar(160) NOT NULL,
  "email" varchar(255),
  "phone" varchar(40),
  "source" varchar(80),
  "stage" "candidate_stage" DEFAULT 'sourcing' NOT NULL,
  "rating" integer,
  "cv_url" varchar(512),
  "notes" text,
  "applied_at" date,
  "order_index" integer DEFAULT 0 NOT NULL,
  "created_by_id" uuid REFERENCES "users"("id") ON DELETE SET NULL,
  "created_at" timestamptz DEFAULT now() NOT NULL,
  "updated_at" timestamptz DEFAULT now() NOT NULL
);

CREATE INDEX "job_requisitions_company_id_idx" ON "job_requisitions" ("company_id");
CREATE INDEX "job_requisitions_status_idx" ON "job_requisitions" ("status");
CREATE INDEX "candidates_company_id_idx" ON "candidates" ("company_id");
CREATE INDEX "candidates_requisition_id_idx" ON "candidates" ("requisition_id");
CREATE INDEX "candidates_stage_idx" ON "candidates" ("stage");
