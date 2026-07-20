-- Phase 18.3 follow-up — append-only permit stage-transition history.

CREATE TABLE IF NOT EXISTS "permit_events" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "company_id" uuid NOT NULL REFERENCES "companies"("id") ON DELETE CASCADE,
  "permit_id" uuid NOT NULL REFERENCES "safety_permits"("id") ON DELETE CASCADE,
  "actor_id" uuid REFERENCES "users"("id") ON DELETE SET NULL,
  "action" varchar(20) NOT NULL,
  "from_status" varchar(24),
  "to_status" varchar(24) NOT NULL,
  "reason" text,
  "created_at" timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS "permit_events_permit_id_idx" ON "permit_events" ("permit_id");
CREATE INDEX IF NOT EXISTS "permit_events_company_id_idx" ON "permit_events" ("company_id");
