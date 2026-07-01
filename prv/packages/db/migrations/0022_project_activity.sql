-- Project Activity Log (roadmap 6.7). A dedicated per-project timeline (distinct
-- from the immutable company audit log) recording human-readable events —
-- task/milestone/member/budget/risk changes, status transitions, and free-text
-- comments — for display in the project detail. Company-scoped.

CREATE TYPE "project_activity_kind" AS ENUM ('task', 'milestone', 'member', 'budget', 'risk', 'status', 'comment', 'document', 'general');

CREATE TABLE "project_activity" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "company_id" uuid NOT NULL REFERENCES "companies"("id") ON DELETE CASCADE,
  "project_id" uuid NOT NULL REFERENCES "projects"("id") ON DELETE CASCADE,
  "actor_id" uuid REFERENCES "users"("id") ON DELETE SET NULL,
  "kind" "project_activity_kind" DEFAULT 'general' NOT NULL,
  "summary" text NOT NULL,
  "entity_type" varchar(48),
  "entity_id" varchar(128),
  "metadata" jsonb,
  "created_at" timestamptz DEFAULT now() NOT NULL
);

CREATE INDEX "project_activity_project_id_idx" ON "project_activity" ("project_id");
CREATE INDEX "project_activity_project_created_idx" ON "project_activity" ("project_id", "created_at");
CREATE INDEX "project_activity_company_id_idx" ON "project_activity" ("company_id");
