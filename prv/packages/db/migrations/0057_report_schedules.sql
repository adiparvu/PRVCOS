-- Phase 15.4 — Scheduled report delivery.
-- Recurring email of a company report; an hourly sweep delivers due schedules.

DO $$ BEGIN
  CREATE TYPE "report_schedule_frequency" AS ENUM ('daily', 'weekly', 'monthly');
EXCEPTION WHEN duplicate_object THEN null; END $$;

CREATE TABLE IF NOT EXISTS "report_schedules" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "company_id" uuid NOT NULL,
  "created_by_user_id" uuid,
  "name" varchar(200) NOT NULL,
  "report_type" varchar(40) NOT NULL DEFAULT 'company_kpi',
  "frequency" "report_schedule_frequency" NOT NULL,
  "send_hour_utc" integer NOT NULL DEFAULT 7,
  "recipients" jsonb NOT NULL DEFAULT '[]'::jsonb,
  "enabled" boolean NOT NULL DEFAULT true,
  "next_run_at" timestamptz NOT NULL,
  "last_run_at" timestamptz,
  "last_status" varchar(20),
  "last_error" text,
  "created_at" timestamptz NOT NULL DEFAULT now(),
  "updated_at" timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS "report_schedules_company_id_idx" ON "report_schedules" ("company_id");
CREATE INDEX IF NOT EXISTS "report_schedules_due_idx" ON "report_schedules" ("enabled", "next_run_at");
