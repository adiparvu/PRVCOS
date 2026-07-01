-- Project Budget Lines (roadmap 6.4). Budget-by-category breakdown per project.
-- Each line tracks planned (BAC slice) / committed (approved, unpaid) / actual
-- (incurred) amounts that drive Earned Value Analysis. One line per
-- (project, category).

CREATE TYPE "project_budget_category" AS ENUM ('labor', 'materials', 'equipment', 'overhead', 'contingency');

CREATE TABLE "project_budget_lines" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "company_id" uuid NOT NULL REFERENCES "companies"("id") ON DELETE CASCADE,
  "project_id" uuid NOT NULL REFERENCES "projects"("id") ON DELETE CASCADE,
  "category" "project_budget_category" NOT NULL,
  "planned_amount" numeric(14,2) DEFAULT '0' NOT NULL,
  "committed_amount" numeric(14,2) DEFAULT '0' NOT NULL,
  "actual_amount" numeric(14,2) DEFAULT '0' NOT NULL,
  "notes" text,
  "created_at" timestamptz DEFAULT now() NOT NULL,
  "updated_at" timestamptz DEFAULT now() NOT NULL
);

CREATE UNIQUE INDEX "project_budget_lines_project_category_unique" ON "project_budget_lines" ("project_id", "category");
CREATE INDEX "project_budget_lines_company_id_idx" ON "project_budget_lines" ("company_id");
CREATE INDEX "project_budget_lines_project_id_idx" ON "project_budget_lines" ("project_id");
