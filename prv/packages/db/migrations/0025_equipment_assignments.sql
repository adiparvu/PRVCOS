-- Equipment Assignments (roadmap 7.6). Lightweight employee↔equipment tracking
-- ahead of the full Phase 22 asset registry: who holds what, when issued, when
-- due back, and its condition. Company-scoped.

CREATE TYPE "equipment_condition" AS ENUM ('new', 'good', 'fair', 'poor', 'damaged');
CREATE TYPE "equipment_assignment_status" AS ENUM ('assigned', 'returned', 'lost');

CREATE TABLE "equipment_assignments" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "company_id" uuid NOT NULL REFERENCES "companies"("id") ON DELETE CASCADE,
  "user_id" uuid NOT NULL REFERENCES "users"("id") ON DELETE CASCADE,
  "equipment_type" varchar(80) NOT NULL,
  "label" varchar(160),
  "serial_number" varchar(120),
  "assigned_date" date NOT NULL,
  "expected_return_date" date,
  "returned_date" date,
  "condition" "equipment_condition" DEFAULT 'good' NOT NULL,
  "return_condition" "equipment_condition",
  "status" "equipment_assignment_status" DEFAULT 'assigned' NOT NULL,
  "notes" text,
  "assigned_by_user_id" uuid REFERENCES "users"("id") ON DELETE SET NULL,
  "created_at" timestamptz DEFAULT now() NOT NULL,
  "updated_at" timestamptz DEFAULT now() NOT NULL
);

CREATE INDEX "equipment_assignments_company_id_idx" ON "equipment_assignments" ("company_id");
CREATE INDEX "equipment_assignments_user_id_idx" ON "equipment_assignments" ("user_id");
CREATE INDEX "equipment_assignments_status_idx" ON "equipment_assignments" ("status");
