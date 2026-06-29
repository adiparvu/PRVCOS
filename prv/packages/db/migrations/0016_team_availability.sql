-- Manual scheduling-availability overrides per member per day. The schedule
-- grid derives a baseline from shifts + approved leave; rows here record an
-- explicit override for a specific date, which wins over the baseline.

CREATE TYPE "availability_state" AS ENUM ('yes', 'maybe', 'no');

CREATE TABLE "team_availability" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "company_id" uuid NOT NULL REFERENCES "companies"("id") ON DELETE CASCADE,
  "user_id" uuid NOT NULL REFERENCES "users"("id") ON DELETE CASCADE,
  "set_by_user_id" uuid REFERENCES "users"("id") ON DELETE SET NULL,
  "date" varchar(10) NOT NULL,
  "state" "availability_state" NOT NULL,
  "created_at" timestamptz DEFAULT now() NOT NULL,
  "updated_at" timestamptz DEFAULT now() NOT NULL
);

CREATE INDEX "team_availability_company_id_idx" ON "team_availability" ("company_id");
CREATE INDEX "team_availability_user_id_idx" ON "team_availability" ("user_id");
CREATE UNIQUE INDEX "team_availability_user_date_unique" ON "team_availability" ("company_id", "user_id", "date");
