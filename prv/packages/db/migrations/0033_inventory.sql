-- Multi-location Inventory (roadmap 9.2). Stock levels per (product, store) and
-- an append-only movement log. Supersedes the scalar products.stock_quantity for
-- real inventory management. Company-scoped.

CREATE TYPE "stock_movement_type" AS ENUM ('receive', 'sale', 'adjust', 'writeoff', 'return', 'count');

CREATE TABLE "stock_levels" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "company_id" uuid NOT NULL REFERENCES "companies"("id") ON DELETE CASCADE,
  "product_id" uuid NOT NULL REFERENCES "products"("id") ON DELETE CASCADE,
  "store_id" uuid NOT NULL REFERENCES "stores"("id") ON DELETE CASCADE,
  "quantity" integer DEFAULT 0 NOT NULL,
  "minimum" integer DEFAULT 0 NOT NULL,
  "reorder_point" integer,
  "updated_at" timestamptz DEFAULT now() NOT NULL,
  "created_at" timestamptz DEFAULT now() NOT NULL
);

CREATE TABLE "stock_movements" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "company_id" uuid NOT NULL REFERENCES "companies"("id") ON DELETE CASCADE,
  "product_id" uuid NOT NULL REFERENCES "products"("id") ON DELETE CASCADE,
  "store_id" uuid NOT NULL REFERENCES "stores"("id") ON DELETE CASCADE,
  "type" "stock_movement_type" NOT NULL,
  "delta" integer NOT NULL,
  "balance_after" integer NOT NULL,
  "reason" text,
  "created_by_id" uuid REFERENCES "users"("id") ON DELETE SET NULL,
  "created_at" timestamptz DEFAULT now() NOT NULL
);

CREATE UNIQUE INDEX "stock_levels_product_store_unique" ON "stock_levels" ("product_id", "store_id");
CREATE INDEX "stock_levels_company_id_idx" ON "stock_levels" ("company_id");
CREATE INDEX "stock_levels_store_id_idx" ON "stock_levels" ("store_id");
CREATE INDEX "stock_movements_company_id_idx" ON "stock_movements" ("company_id");
CREATE INDEX "stock_movements_product_id_idx" ON "stock_movements" ("product_id");
CREATE INDEX "stock_movements_store_id_idx" ON "stock_movements" ("store_id");
CREATE INDEX "stock_movements_created_at_idx" ON "stock_movements" ("created_at");
