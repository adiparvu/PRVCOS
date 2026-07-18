-- Asset maintenance records (Phase 22.4). One shared ledger for vehicle and
-- tool maintenance, polymorphic by (asset_type, asset_id). A record is
-- out-of-service work while scheduled/in_progress, history once closed.

CREATE TYPE "maintenance_asset_type" AS ENUM ('vehicle', 'tool');
CREATE TYPE "maintenance_status" AS ENUM ('scheduled', 'in_progress', 'completed', 'cancelled');

CREATE TABLE "maintenance_records" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "company_id" uuid NOT NULL REFERENCES "companies"("id") ON DELETE CASCADE,
  "asset_type" "maintenance_asset_type" NOT NULL,
  "asset_id" uuid NOT NULL,
  "type" varchar(60) NOT NULL,
  "status" "maintenance_status" NOT NULL DEFAULT 'scheduled',
  "description" text,
  "provider" varchar(255),
  "cost" numeric(12, 2),
  "odometer_km" integer,
  "scheduled_date" date,
  "completed_at" timestamptz,
  "notes" text,
  "created_by_id" uuid REFERENCES "users"("id") ON DELETE SET NULL,
  "created_at" timestamptz NOT NULL DEFAULT now(),
  "updated_at" timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX "maintenance_records_company_id_idx" ON "maintenance_records" ("company_id");
CREATE INDEX "maintenance_records_asset_idx" ON "maintenance_records" ("asset_type", "asset_id");
CREATE INDEX "maintenance_records_status_idx" ON "maintenance_records" ("status");
