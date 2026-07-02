-- Order Returns & Refunds (roadmap 9.3). A return moves through a
-- requested → approved → received → refunded workflow (or rejected), with a set
-- of returned line items driving the refund amount. Company-scoped.

CREATE TYPE "return_reason" AS ENUM ('damaged', 'wrong_item', 'defective', 'not_needed', 'other');
CREATE TYPE "return_status" AS ENUM ('requested', 'approved', 'received', 'refunded', 'rejected');

CREATE TABLE "order_returns" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "company_id" uuid NOT NULL REFERENCES "companies"("id") ON DELETE CASCADE,
  "order_id" uuid NOT NULL REFERENCES "orders"("id") ON DELETE CASCADE,
  "return_number" varchar(30) NOT NULL,
  "reason" "return_reason" DEFAULT 'other' NOT NULL,
  "status" "return_status" DEFAULT 'requested' NOT NULL,
  "refund_amount" numeric(12,2) DEFAULT '0' NOT NULL,
  "restock" boolean DEFAULT true NOT NULL,
  "notes" text,
  "created_by_id" uuid REFERENCES "users"("id") ON DELETE SET NULL,
  "created_at" timestamptz DEFAULT now() NOT NULL,
  "updated_at" timestamptz DEFAULT now() NOT NULL
);

CREATE TABLE "order_return_items" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "company_id" uuid NOT NULL REFERENCES "companies"("id") ON DELETE CASCADE,
  "return_id" uuid NOT NULL REFERENCES "order_returns"("id") ON DELETE CASCADE,
  "product_id" uuid REFERENCES "products"("id") ON DELETE SET NULL,
  "name" varchar(255) NOT NULL,
  "quantity" integer DEFAULT 1 NOT NULL,
  "unit_price" numeric(12,2) DEFAULT '0' NOT NULL,
  "line_total" numeric(12,2) DEFAULT '0' NOT NULL
);

CREATE INDEX "order_returns_company_id_idx" ON "order_returns" ("company_id");
CREATE INDEX "order_returns_order_id_idx" ON "order_returns" ("order_id");
CREATE INDEX "order_returns_status_idx" ON "order_returns" ("status");
CREATE INDEX "order_return_items_return_id_idx" ON "order_return_items" ("return_id");
