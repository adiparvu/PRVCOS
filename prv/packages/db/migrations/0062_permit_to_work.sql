-- Phase 18.3 — Permit-to-Work (two-stage approval modelled on the permit row).

DO $$ BEGIN
  CREATE TYPE "permit_type" AS ENUM ('hot_work', 'confined_space', 'working_at_height', 'electrical', 'excavation');
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
  CREATE TYPE "permit_status" AS ENUM ('draft', 'pending_supervisor', 'pending_safety_officer', 'approved', 'active', 'closed', 'rejected', 'expired');
EXCEPTION WHEN duplicate_object THEN null; END $$;

CREATE TABLE IF NOT EXISTS "safety_permits" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "company_id" uuid NOT NULL REFERENCES "companies"("id") ON DELETE CASCADE,
  "project_id" uuid REFERENCES "projects"("id") ON DELETE SET NULL,
  "requested_by" uuid NOT NULL REFERENCES "users"("id") ON DELETE RESTRICT,
  "supervisor_id" uuid REFERENCES "users"("id") ON DELETE SET NULL,
  "safety_officer_id" uuid REFERENCES "users"("id") ON DELETE SET NULL,
  "type" "permit_type" NOT NULL,
  "status" "permit_status" NOT NULL DEFAULT 'draft',
  "title" varchar(300) NOT NULL,
  "description" text NOT NULL,
  "location" varchar(300),
  "valid_from" timestamptz NOT NULL,
  "valid_to" timestamptz NOT NULL,
  "risk_assessment" jsonb NOT NULL DEFAULT '[]'::jsonb,
  "ppe" jsonb NOT NULL DEFAULT '[]'::jsonb,
  "type_details" jsonb NOT NULL DEFAULT '{}'::jsonb,
  "supervisor_approved_by" uuid REFERENCES "users"("id") ON DELETE SET NULL,
  "supervisor_approved_at" timestamptz,
  "safety_officer_approved_by" uuid REFERENCES "users"("id") ON DELETE SET NULL,
  "safety_officer_approved_at" timestamptz,
  "rejected_by" uuid REFERENCES "users"("id") ON DELETE SET NULL,
  "rejected_at" timestamptz,
  "rejection_reason" text,
  "activated_by" uuid REFERENCES "users"("id") ON DELETE SET NULL,
  "activated_at" timestamptz,
  "closed_by" uuid REFERENCES "users"("id") ON DELETE SET NULL,
  "closed_at" timestamptz,
  "close_out_notes" text,
  "created_at" timestamptz NOT NULL DEFAULT now(),
  "updated_at" timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS "safety_permits_company_id_idx" ON "safety_permits" ("company_id");
CREATE INDEX IF NOT EXISTS "safety_permits_project_id_idx" ON "safety_permits" ("project_id");
CREATE INDEX IF NOT EXISTS "safety_permits_status_idx" ON "safety_permits" ("status");
CREATE INDEX IF NOT EXISTS "safety_permits_type_idx" ON "safety_permits" ("type");
CREATE INDEX IF NOT EXISTS "safety_permits_valid_to_idx" ON "safety_permits" ("valid_to");
CREATE INDEX IF NOT EXISTS "safety_permits_requested_by_idx" ON "safety_permits" ("requested_by");
