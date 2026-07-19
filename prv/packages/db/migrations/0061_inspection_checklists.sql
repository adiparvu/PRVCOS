-- Phase 18.2 — Inspection checklists (reusable templates + executed item results).

CREATE TABLE IF NOT EXISTS "inspection_templates" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "company_id" uuid NOT NULL REFERENCES "companies"("id") ON DELETE CASCADE,
  "created_by_user_id" uuid REFERENCES "users"("id") ON DELETE SET NULL,
  "name" varchar(200) NOT NULL,
  "description" text,
  "items" jsonb NOT NULL DEFAULT '[]'::jsonb,
  "created_at" timestamptz NOT NULL DEFAULT now(),
  "updated_at" timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS "inspection_templates_company_id_idx" ON "inspection_templates" ("company_id");

CREATE TABLE IF NOT EXISTS "inspection_item_results" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "company_id" uuid NOT NULL REFERENCES "companies"("id") ON DELETE CASCADE,
  "inspection_id" uuid NOT NULL REFERENCES "safety_inspections"("id") ON DELETE CASCADE,
  "item_index" integer NOT NULL,
  "label" varchar(500) NOT NULL,
  "weight" integer NOT NULL DEFAULT 1,
  "critical" boolean NOT NULL DEFAULT false,
  "result" varchar(8) NOT NULL,
  "note" text,
  "photo_url" text,
  "corrective_task_id" uuid,
  "created_at" timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS "inspection_item_results_inspection_id_idx" ON "inspection_item_results" ("inspection_id");
CREATE INDEX IF NOT EXISTS "inspection_item_results_company_id_idx" ON "inspection_item_results" ("company_id");
