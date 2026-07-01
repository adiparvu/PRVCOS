-- Project Resource Allocations (roadmap 6.3). Assigns an employee to a project
-- at a given capacity (allocation_percentage 0–100). Summing a user's active
-- allocations across projects yields utilization; > 100 flags an over-allocation
-- conflict. Company-scoped; one row per (project, user).

CREATE TABLE "project_allocations" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "company_id" uuid NOT NULL REFERENCES "companies"("id") ON DELETE CASCADE,
  "project_id" uuid NOT NULL REFERENCES "projects"("id") ON DELETE CASCADE,
  "user_id" uuid NOT NULL REFERENCES "users"("id") ON DELETE CASCADE,
  "allocation_percentage" integer DEFAULT 0 NOT NULL,
  "role_label" varchar(120),
  "start_date" date,
  "end_date" date,
  "notes" text,
  "created_by_id" uuid REFERENCES "users"("id") ON DELETE SET NULL,
  "created_at" timestamptz DEFAULT now() NOT NULL,
  "updated_at" timestamptz DEFAULT now() NOT NULL
);

CREATE UNIQUE INDEX "project_allocations_project_user_unique" ON "project_allocations" ("project_id", "user_id");
CREATE INDEX "project_allocations_company_id_idx" ON "project_allocations" ("company_id");
CREATE INDEX "project_allocations_project_id_idx" ON "project_allocations" ("project_id");
CREATE INDEX "project_allocations_user_id_idx" ON "project_allocations" ("user_id");
