-- Product Variants (roadmap 9.1). A sellable variation of a product along option
-- axes (size / colour / material / …), each with its own SKU, optional price
-- override, and stock. Company-scoped.

CREATE TABLE "product_variants" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "company_id" uuid NOT NULL REFERENCES "companies"("id") ON DELETE CASCADE,
  "product_id" uuid NOT NULL REFERENCES "products"("id") ON DELETE CASCADE,
  "name" varchar(160) NOT NULL,
  "sku" varchar(100),
  "barcode" varchar(100),
  "options" jsonb DEFAULT '{}'::jsonb NOT NULL,
  "price" numeric(12,2),
  "stock_quantity" integer DEFAULT 0 NOT NULL,
  "is_active" boolean DEFAULT true NOT NULL,
  "sort_order" integer DEFAULT 0 NOT NULL,
  "created_at" timestamptz DEFAULT now() NOT NULL,
  "updated_at" timestamptz DEFAULT now() NOT NULL
);

CREATE INDEX "product_variants_company_id_idx" ON "product_variants" ("company_id");
CREATE INDEX "product_variants_product_id_idx" ON "product_variants" ("product_id");
