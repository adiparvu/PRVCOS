CREATE TABLE IF NOT EXISTS "purchase_order_items" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "purchase_order_id" uuid NOT NULL REFERENCES "purchase_orders"("id") ON DELETE CASCADE,
  "description" text NOT NULL,
  "ref" varchar(100),
  "unit" varchar(50) NOT NULL DEFAULT 'buc',
  "quantity" numeric(10, 3) NOT NULL,
  "unit_price" numeric(12, 2) NOT NULL,
  "total" numeric(12, 2) NOT NULL,
  "sort_order" integer NOT NULL DEFAULT 0
);

CREATE INDEX IF NOT EXISTS "purchase_order_items_po_id_idx" ON "purchase_order_items" ("purchase_order_id");
