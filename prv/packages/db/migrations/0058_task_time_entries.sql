-- Phase 6.2 — Task time tracking (start/stop timer per task).

CREATE TABLE IF NOT EXISTS "task_time_entries" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "company_id" uuid NOT NULL REFERENCES "companies"("id") ON DELETE CASCADE,
  "task_id" uuid NOT NULL REFERENCES "project_tasks"("id") ON DELETE CASCADE,
  "user_id" uuid NOT NULL REFERENCES "users"("id") ON DELETE CASCADE,
  "started_at" timestamptz NOT NULL DEFAULT now(),
  "ended_at" timestamptz,
  "duration_minutes" integer,
  "note" text,
  "created_at" timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS "task_time_entries_task_id_idx" ON "task_time_entries" ("task_id");
CREATE INDEX IF NOT EXISTS "task_time_entries_user_id_idx" ON "task_time_entries" ("user_id");
CREATE INDEX IF NOT EXISTS "task_time_entries_company_id_idx" ON "task_time_entries" ("company_id");
