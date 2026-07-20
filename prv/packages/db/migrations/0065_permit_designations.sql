-- Phase 18.3 safe-variant — per-company supervisor / safety-officer designations.

DO $$ BEGIN
  CREATE TYPE "permit_designation_role" AS ENUM ('supervisor', 'safety_officer');
EXCEPTION WHEN duplicate_object THEN null; END $$;

CREATE TABLE IF NOT EXISTS "permit_designations" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "company_id" uuid NOT NULL REFERENCES "companies"("id") ON DELETE CASCADE,
  "user_id" uuid NOT NULL REFERENCES "users"("id") ON DELETE CASCADE,
  "role" "permit_designation_role" NOT NULL,
  "created_by_user_id" uuid REFERENCES "users"("id") ON DELETE SET NULL,
  "created_at" timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS "permit_designations_company_id_idx" ON "permit_designations" ("company_id");
CREATE INDEX IF NOT EXISTS "permit_designations_user_id_idx" ON "permit_designations" ("user_id");
CREATE UNIQUE INDEX IF NOT EXISTS "permit_designations_company_user_role_unique" ON "permit_designations" ("company_id", "user_id", "role");
