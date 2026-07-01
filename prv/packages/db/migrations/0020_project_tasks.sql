-- Project Tasks (roadmap 6.2). The Kanban-able task board for a project:
-- lifecycle backlog→todo→in_progress→review→done→cancelled, subtasks (one level
-- via parent_task_id), a single blocking dependency (depends_on_task_id), time
-- tracking, and per-column ordering (order_index). Self-references are added
-- after table creation.

CREATE TYPE "project_task_status" AS ENUM ('backlog', 'todo', 'in_progress', 'review', 'done', 'cancelled');
CREATE TYPE "project_task_priority" AS ENUM ('low', 'medium', 'high', 'critical');

CREATE TABLE "project_tasks" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "company_id" uuid NOT NULL REFERENCES "companies"("id") ON DELETE CASCADE,
  "project_id" uuid NOT NULL REFERENCES "projects"("id") ON DELETE CASCADE,
  "title" varchar(255) NOT NULL,
  "description" text,
  "status" "project_task_status" DEFAULT 'backlog' NOT NULL,
  "priority" "project_task_priority" DEFAULT 'medium' NOT NULL,
  "assignee_id" uuid REFERENCES "users"("id") ON DELETE SET NULL,
  "assigned_by_id" uuid REFERENCES "users"("id") ON DELETE SET NULL,
  "due_date" date,
  "started_at" timestamptz,
  "completed_at" timestamptz,
  "estimated_hours" numeric(8,2),
  "actual_hours" numeric(8,2),
  "parent_task_id" uuid REFERENCES "project_tasks"("id") ON DELETE CASCADE,
  "depends_on_task_id" uuid REFERENCES "project_tasks"("id") ON DELETE SET NULL,
  "order_index" integer DEFAULT 0 NOT NULL,
  "tags" jsonb DEFAULT '[]'::jsonb NOT NULL,
  "created_at" timestamptz DEFAULT now() NOT NULL,
  "updated_at" timestamptz DEFAULT now() NOT NULL
);

CREATE INDEX "project_tasks_company_id_idx" ON "project_tasks" ("company_id");
CREATE INDEX "project_tasks_project_id_idx" ON "project_tasks" ("project_id");
CREATE INDEX "project_tasks_project_status_idx" ON "project_tasks" ("project_id", "status");
CREATE INDEX "project_tasks_assignee_id_idx" ON "project_tasks" ("assignee_id");
CREATE INDEX "project_tasks_parent_id_idx" ON "project_tasks" ("parent_task_id");
