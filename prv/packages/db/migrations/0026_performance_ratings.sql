-- Performance Ratings (roadmap 7.5). A manager's qualitative 1–5 score per
-- employee per review period, complementing the quantitative attendance /
-- punctuality / task-completion metrics the dashboard derives from existing
-- data. Company-scoped; one rating per (user, period).

CREATE TABLE "performance_ratings" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "company_id" uuid NOT NULL REFERENCES "companies"("id") ON DELETE CASCADE,
  "user_id" uuid NOT NULL REFERENCES "users"("id") ON DELETE CASCADE,
  "rated_by_user_id" uuid REFERENCES "users"("id") ON DELETE SET NULL,
  "period" varchar(20) NOT NULL,
  "rating" integer NOT NULL,
  "note" text,
  "created_at" timestamptz DEFAULT now() NOT NULL,
  "updated_at" timestamptz DEFAULT now() NOT NULL
);

CREATE UNIQUE INDEX "performance_ratings_user_period_unique" ON "performance_ratings" ("user_id", "period");
CREATE INDEX "performance_ratings_company_id_idx" ON "performance_ratings" ("company_id");
CREATE INDEX "performance_ratings_user_id_idx" ON "performance_ratings" ("user_id");
