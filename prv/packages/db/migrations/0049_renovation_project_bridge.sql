-- Bridge renovation projects to the generic project used by the client portal
-- (Phase 23.6), so renovation site-report photos and progress can surface on
-- the portal project screen.

ALTER TABLE "renovation_projects"
  ADD COLUMN "project_id" uuid REFERENCES "projects"("id") ON DELETE SET NULL;

CREATE INDEX "renovation_projects_project_id_idx" ON "renovation_projects" ("project_id");
