-- Project Risk Register (roadmap 6.6). Per-project risks with impact +
-- probability (each 1–5) driving a 1–25 severity score (computed in the app
-- layer), plus mitigation, owner, and a status lifecycle. Company-scoped.

CREATE TYPE "project_risk_category" AS ENUM ('schedule', 'cost', 'quality', 'safety', 'resource', 'external', 'other');
CREATE TYPE "project_risk_status" AS ENUM ('open', 'mitigating', 'monitoring', 'closed', 'accepted');

CREATE TABLE "project_risks" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "company_id" uuid NOT NULL REFERENCES "companies"("id") ON DELETE CASCADE,
  "project_id" uuid NOT NULL REFERENCES "projects"("id") ON DELETE CASCADE,
  "title" varchar(255) NOT NULL,
  "description" text,
  "category" "project_risk_category" DEFAULT 'other' NOT NULL,
  "impact" integer DEFAULT 1 NOT NULL,
  "probability" integer DEFAULT 1 NOT NULL,
  "mitigation" text,
  "status" "project_risk_status" DEFAULT 'open' NOT NULL,
  "owner_id" uuid REFERENCES "users"("id") ON DELETE SET NULL,
  "due_date" date,
  "created_by_id" uuid REFERENCES "users"("id") ON DELETE SET NULL,
  "created_at" timestamptz DEFAULT now() NOT NULL,
  "updated_at" timestamptz DEFAULT now() NOT NULL
);

CREATE INDEX "project_risks_company_id_idx" ON "project_risks" ("company_id");
CREATE INDEX "project_risks_project_id_idx" ON "project_risks" ("project_id");
CREATE INDEX "project_risks_owner_id_idx" ON "project_risks" ("owner_id");
