-- Performance Reviews (roadmap 8.4). Review cycles (annual / semi-annual /
-- quarterly) and per-employee review submissions moving through a self →
-- manager → HR → sign-off workflow, each stage capturing a rating + comments.
-- Company-scoped.

CREATE TYPE "review_cadence" AS ENUM ('annual', 'semi_annual', 'quarterly');
CREATE TYPE "review_cycle_status" AS ENUM ('draft', 'active', 'closed');
CREATE TYPE "review_stage" AS ENUM ('self_review', 'manager_review', 'hr_review', 'signed_off');

CREATE TABLE "review_cycles" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "company_id" uuid NOT NULL REFERENCES "companies"("id") ON DELETE CASCADE,
  "name" varchar(160) NOT NULL,
  "cadence" "review_cadence" DEFAULT 'annual' NOT NULL,
  "status" "review_cycle_status" DEFAULT 'draft' NOT NULL,
  "period_start" date,
  "period_end" date,
  "due_date" date,
  "created_by_id" uuid REFERENCES "users"("id") ON DELETE SET NULL,
  "created_at" timestamptz DEFAULT now() NOT NULL,
  "updated_at" timestamptz DEFAULT now() NOT NULL
);

CREATE TABLE "reviews" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "company_id" uuid NOT NULL REFERENCES "companies"("id") ON DELETE CASCADE,
  "cycle_id" uuid NOT NULL REFERENCES "review_cycles"("id") ON DELETE CASCADE,
  "user_id" uuid NOT NULL REFERENCES "users"("id") ON DELETE CASCADE,
  "reviewer_id" uuid REFERENCES "users"("id") ON DELETE SET NULL,
  "stage" "review_stage" DEFAULT 'self_review' NOT NULL,
  "self_rating" integer,
  "manager_rating" integer,
  "hr_rating" integer,
  "overall_rating" integer,
  "self_comments" text,
  "manager_comments" text,
  "hr_comments" text,
  "signed_off_at" timestamptz,
  "created_at" timestamptz DEFAULT now() NOT NULL,
  "updated_at" timestamptz DEFAULT now() NOT NULL
);

CREATE UNIQUE INDEX "reviews_cycle_user_unique" ON "reviews" ("cycle_id", "user_id");
CREATE INDEX "review_cycles_company_id_idx" ON "review_cycles" ("company_id");
CREATE INDEX "reviews_company_id_idx" ON "reviews" ("company_id");
CREATE INDEX "reviews_cycle_id_idx" ON "reviews" ("cycle_id");
CREATE INDEX "reviews_user_id_idx" ON "reviews" ("user_id");
