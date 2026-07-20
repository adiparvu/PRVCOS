-- Phase 18.3 follow-up — Permit-to-Work suspend / reinstate / revoke states.

ALTER TYPE "permit_status" ADD VALUE IF NOT EXISTS 'suspended';
ALTER TYPE "permit_status" ADD VALUE IF NOT EXISTS 'revoked';

ALTER TABLE "safety_permits"
  ADD COLUMN IF NOT EXISTS "suspended_by" uuid REFERENCES "users"("id") ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS "suspended_at" timestamptz,
  ADD COLUMN IF NOT EXISTS "suspension_reason" text,
  ADD COLUMN IF NOT EXISTS "reinstated_by" uuid REFERENCES "users"("id") ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS "reinstated_at" timestamptz,
  ADD COLUMN IF NOT EXISTS "revoked_by" uuid REFERENCES "users"("id") ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS "revoked_at" timestamptz,
  ADD COLUMN IF NOT EXISTS "revocation_reason" text;
