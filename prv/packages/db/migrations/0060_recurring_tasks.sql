-- Phase 6.2 — Recurring tasks (auto-generate a task on a project on a cadence).

CREATE TABLE IF NOT EXISTS "recurring_tasks" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "company_id" uuid NOT NULL REFERENCES "companies"("id") ON DELETE CASCADE,
  "project_id" uuid NOT NULL REFERENCES "projects"("id") ON DELETE CASCADE,
  "created_by_user_id" uuid REFERENCES "users"("id") ON DELETE SET NULL,
  "title" varchar(255) NOT NULL,
  "description" text,
  "priority" "project_task_priority" NOT NULL DEFAULT 'medium',
  "estimated_hours" numeric(8,2),
  "assignee_id" uuid REFERENCES "users"("id") ON DELETE SET NULL,
  "frequency" varchar(10) NOT NULL,
  "send_hour_utc" integer NOT NULL DEFAULT 7,
  "enabled" boolean NOT NULL DEFAULT true,
  "next_run_at" timestamptz NOT NULL,
  "last_run_at" timestamptz,
  "created_at" timestamptz NOT NULL DEFAULT now(),
  "updated_at" timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS "recurring_tasks_company_id_idx" ON "recurring_tasks" ("company_id");
CREATE INDEX IF NOT EXISTS "recurring_tasks_project_id_idx" ON "recurring_tasks" ("project_id");
CREATE INDEX IF NOT EXISTS "recurring_tasks_due_idx" ON "recurring_tasks" ("enabled", "next_run_at");
