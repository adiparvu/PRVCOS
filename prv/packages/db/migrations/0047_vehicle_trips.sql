-- Vehicle trip management (Phase 22.3). A single journey per row: driver,
-- optional project, start/end odometer (distance + fuel cost derived), moving
-- in_progress → completed | cancelled.

CREATE TYPE "vehicle_trip_status" AS ENUM ('in_progress', 'completed', 'cancelled');

CREATE TABLE "vehicle_trips" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "company_id" uuid NOT NULL REFERENCES "companies"("id") ON DELETE CASCADE,
  "vehicle_id" uuid NOT NULL REFERENCES "vehicles"("id") ON DELETE CASCADE,
  "driver_id" uuid REFERENCES "users"("id") ON DELETE SET NULL,
  "project_id" uuid REFERENCES "projects"("id") ON DELETE SET NULL,
  "status" "vehicle_trip_status" NOT NULL DEFAULT 'in_progress',
  "purpose" varchar(255),
  "start_odometer_km" integer NOT NULL,
  "end_odometer_km" integer,
  "distance_km" integer,
  "fuel_cost" numeric(12, 2),
  "started_at" timestamptz NOT NULL DEFAULT now(),
  "ended_at" timestamptz,
  "notes" text,
  "created_at" timestamptz NOT NULL DEFAULT now(),
  "updated_at" timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX "vehicle_trips_company_id_idx" ON "vehicle_trips" ("company_id");
CREATE INDEX "vehicle_trips_vehicle_id_idx" ON "vehicle_trips" ("vehicle_id");
CREATE INDEX "vehicle_trips_driver_id_idx" ON "vehicle_trips" ("driver_id");
CREATE INDEX "vehicle_trips_project_id_idx" ON "vehicle_trips" ("project_id");
