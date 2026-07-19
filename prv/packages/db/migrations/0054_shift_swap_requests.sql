-- Shift swap requests (Phase 7.2). A worker requests to swap/give up a shift
-- they are assigned to; a team leader approves (reassigning) or rejects.

CREATE TYPE "shift_swap_status" AS ENUM ('pending', 'approved', 'rejected', 'cancelled');

CREATE TABLE "shift_swap_requests" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "company_id" uuid NOT NULL REFERENCES "companies"("id") ON DELETE CASCADE,
  "shift_id" uuid NOT NULL REFERENCES "shifts"("id") ON DELETE CASCADE,
  "requester_id" uuid NOT NULL REFERENCES "users"("id") ON DELETE CASCADE,
  "target_user_id" uuid REFERENCES "users"("id") ON DELETE SET NULL,
  "status" "shift_swap_status" NOT NULL DEFAULT 'pending',
  "note" text,
  "decided_by_id" uuid REFERENCES "users"("id") ON DELETE SET NULL,
  "decided_at" timestamptz,
  "created_at" timestamptz NOT NULL DEFAULT now(),
  "updated_at" timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX "shift_swap_requests_company_id_idx" ON "shift_swap_requests" ("company_id");
CREATE INDEX "shift_swap_requests_shift_id_idx" ON "shift_swap_requests" ("shift_id");
CREATE INDEX "shift_swap_requests_status_idx" ON "shift_swap_requests" ("status");
