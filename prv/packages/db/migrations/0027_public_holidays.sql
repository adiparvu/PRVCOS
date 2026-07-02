-- Public Holidays (roadmap 7.3). Per-company holiday calendar used to exclude
-- non-working days from leave / working-day counts. A recurring holiday repeats
-- on the same month-day every year; a one-off applies only to its stored year.
-- Company-scoped.

CREATE TABLE "public_holidays" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "company_id" uuid NOT NULL REFERENCES "companies"("id") ON DELETE CASCADE,
  "name" varchar(160) NOT NULL,
  "date" date NOT NULL,
  "country" varchar(8) DEFAULT 'RO' NOT NULL,
  "region" varchar(80),
  "is_recurring" boolean DEFAULT true NOT NULL,
  "created_at" timestamptz DEFAULT now() NOT NULL,
  "updated_at" timestamptz DEFAULT now() NOT NULL
);

CREATE UNIQUE INDEX "public_holidays_company_date_country_unique" ON "public_holidays" ("company_id", "date", "country");
CREATE INDEX "public_holidays_company_id_idx" ON "public_holidays" ("company_id");
CREATE INDEX "public_holidays_date_idx" ON "public_holidays" ("date");
