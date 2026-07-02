-- Projects core field completion (roadmap 6.1). Adds the project type, priority,
-- director/manager roles, actual start/end dates, approved/spent budget, and a
-- cached 0–100 health score to the generic projects table.

CREATE TYPE "project_type" AS ENUM ('renovation', 'installation', 'maintenance', 'consultation', 'other');
CREATE TYPE "project_priority" AS ENUM ('critical', 'high', 'medium', 'low');

ALTER TABLE "projects" ADD COLUMN "type" "project_type" DEFAULT 'renovation' NOT NULL;
ALTER TABLE "projects" ADD COLUMN "priority" "project_priority" DEFAULT 'medium' NOT NULL;
ALTER TABLE "projects" ADD COLUMN "project_manager_id" uuid REFERENCES "users"("id") ON DELETE SET NULL;
ALTER TABLE "projects" ADD COLUMN "project_director_id" uuid REFERENCES "users"("id") ON DELETE SET NULL;
ALTER TABLE "projects" ADD COLUMN "approved_budget" numeric(12,2);
ALTER TABLE "projects" ADD COLUMN "spent_budget" numeric(12,2);
ALTER TABLE "projects" ADD COLUMN "actual_start_date" date;
ALTER TABLE "projects" ADD COLUMN "actual_end_date" date;
ALTER TABLE "projects" ADD COLUMN "health_score" integer;

CREATE INDEX "projects_manager_id_idx" ON "projects" ("project_manager_id");
