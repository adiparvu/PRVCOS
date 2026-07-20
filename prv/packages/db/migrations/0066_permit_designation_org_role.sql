-- Phase 18.3 reconciliation — record how each permit approver maps into the org chain.
ALTER TABLE "permit_designations" ADD COLUMN IF NOT EXISTS "org_role" varchar(80);
