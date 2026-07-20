-- Phase 9.2 — Stock-take / cycle-count sessions and counted lines.

DO $$ BEGIN
  CREATE TYPE "stock_take_status" AS ENUM ('draft', 'counting', 'posted', 'cancelled');
EXCEPTION WHEN duplicate_object THEN null; END $$;

CREATE TABLE IF NOT EXISTS "stock_take_sessions" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "company_id" uuid NOT NULL REFERENCES "companies"("id") ON DELETE CASCADE,
  "store_id" uuid NOT NULL REFERENCES "stores"("id") ON DELETE CASCADE,
  "name" varchar(200) NOT NULL,
  "status" "stock_take_status" NOT NULL DEFAULT 'counting',
  "notes" text,
  "created_by_id" uuid REFERENCES "users"("id") ON DELETE SET NULL,
  "posted_by_id" uuid REFERENCES "users"("id") ON DELETE SET NULL,
  "posted_at" timestamptz,
  "created_at" timestamptz NOT NULL DEFAULT now(),
  "updated_at" timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS "stock_take_sessions_company_id_idx" ON "stock_take_sessions" ("company_id");
CREATE INDEX IF NOT EXISTS "stock_take_sessions_store_id_idx" ON "stock_take_sessions" ("store_id");
CREATE INDEX IF NOT EXISTS "stock_take_sessions_status_idx" ON "stock_take_sessions" ("status");

CREATE TABLE IF NOT EXISTS "stock_take_lines" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "session_id" uuid NOT NULL REFERENCES "stock_take_sessions"("id") ON DELETE CASCADE,
  "company_id" uuid NOT NULL REFERENCES "companies"("id") ON DELETE CASCADE,
  "product_id" uuid NOT NULL REFERENCES "products"("id") ON DELETE CASCADE,
  "system_qty" integer NOT NULL,
  "counted_qty" integer NOT NULL,
  "posted" boolean NOT NULL DEFAULT false,
  "created_at" timestamptz NOT NULL DEFAULT now(),
  "updated_at" timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS "stock_take_lines_session_id_idx" ON "stock_take_lines" ("session_id");
CREATE UNIQUE INDEX IF NOT EXISTS "stock_take_lines_session_product_unique" ON "stock_take_lines" ("session_id", "product_id");
