-- Product ↔ Supplier sourcing links (roadmap 9.4). Which suppliers can supply a
-- product, at what cost / lead time, with one flagged preferred. Company-scoped;
-- one link per (product, supplier).

CREATE TABLE "product_suppliers" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "company_id" uuid NOT NULL REFERENCES "companies"("id") ON DELETE CASCADE,
  "product_id" uuid NOT NULL REFERENCES "products"("id") ON DELETE CASCADE,
  "supplier_id" uuid NOT NULL REFERENCES "suppliers"("id") ON DELETE CASCADE,
  "supplier_sku" varchar(100),
  "cost" numeric(12,2),
  "lead_time_days" integer,
  "min_order_qty" integer,
  "is_preferred" boolean DEFAULT false NOT NULL,
  "notes" text,
  "created_at" timestamptz DEFAULT now() NOT NULL,
  "updated_at" timestamptz DEFAULT now() NOT NULL
);

CREATE UNIQUE INDEX "product_suppliers_product_supplier_unique" ON "product_suppliers" ("product_id", "supplier_id");
CREATE INDEX "product_suppliers_company_id_idx" ON "product_suppliers" ("company_id");
CREATE INDEX "product_suppliers_product_id_idx" ON "product_suppliers" ("product_id");
CREATE INDEX "product_suppliers_supplier_id_idx" ON "product_suppliers" ("supplier_id");
