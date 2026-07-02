-- CRM Activities (roadmap 10.4). A scheduled or logged touchpoint against a lead
-- or customer (both live in "clients") — calls, emails, meetings, demos,
-- proposals, follow-ups, notes and tasks — with an optional due date and a
-- completion timestamp + outcome once done. Company-scoped.

CREATE TYPE "crm_activity_type" AS ENUM ('call', 'email', 'meeting', 'demo', 'proposal', 'follow_up', 'note', 'task');

CREATE TABLE "crm_activities" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "company_id" uuid NOT NULL REFERENCES "companies"("id") ON DELETE CASCADE,
  "client_id" uuid NOT NULL REFERENCES "clients"("id") ON DELETE CASCADE,
  "actor_id" uuid REFERENCES "users"("id") ON DELETE SET NULL,
  "type" "crm_activity_type" DEFAULT 'note' NOT NULL,
  "subject" varchar(255) NOT NULL,
  "notes" text,
  "outcome" text,
  "due_at" timestamptz,
  "completed_at" timestamptz,
  "created_at" timestamptz DEFAULT now() NOT NULL,
  "updated_at" timestamptz DEFAULT now() NOT NULL
);

CREATE INDEX "crm_activities_company_id_idx" ON "crm_activities" ("company_id");
CREATE INDEX "crm_activities_client_id_idx" ON "crm_activities" ("client_id");
CREATE INDEX "crm_activities_due_at_idx" ON "crm_activities" ("due_at");
