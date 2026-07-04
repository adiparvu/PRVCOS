-- Announcement read-receipts & acknowledgment (Phase 13.4). Priority, an
-- acknowledgment requirement and expiry on announcements, plus a per-user
-- acknowledgment table (distinct from a passive read).

CREATE TYPE "announcement_priority" AS ENUM ('info', 'important', 'critical');

ALTER TABLE "announcements" ADD COLUMN "priority" "announcement_priority" DEFAULT 'info' NOT NULL;
ALTER TABLE "announcements" ADD COLUMN "acknowledgment_required" boolean DEFAULT false NOT NULL;
ALTER TABLE "announcements" ADD COLUMN "ack_count" integer DEFAULT 0 NOT NULL;
ALTER TABLE "announcements" ADD COLUMN "expires_at" timestamptz;

CREATE TABLE "announcement_acknowledgments" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "announcement_id" uuid NOT NULL REFERENCES "announcements"("id") ON DELETE CASCADE,
  "user_id" uuid NOT NULL REFERENCES "users"("id") ON DELETE CASCADE,
  "company_id" uuid NOT NULL REFERENCES "companies"("id") ON DELETE CASCADE,
  "acknowledged_at" timestamptz DEFAULT now() NOT NULL,
  CONSTRAINT "announcement_acknowledgments_unique" UNIQUE ("announcement_id", "user_id")
);

CREATE INDEX "announcement_acknowledgments_announcement_id_idx" ON "announcement_acknowledgments" ("announcement_id");
CREATE INDEX "announcement_acknowledgments_user_id_idx" ON "announcement_acknowledgments" ("user_id");
