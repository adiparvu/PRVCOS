-- Promotions & coupons (roadmap 9.5). A promotion is a discount rule that either
-- auto-applies or is redeemed by a coupon code, with a validity window, minimum
-- spend, and usage caps. Company-scoped.

CREATE TYPE "promotion_type" AS ENUM ('percentage', 'fixed_amount', 'free_shipping');
CREATE TYPE "promotion_scope" AS ENUM ('order', 'product', 'category');
CREATE TYPE "promotion_status" AS ENUM ('draft', 'active', 'paused', 'expired');

CREATE TABLE "promotions" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "company_id" uuid NOT NULL REFERENCES "companies"("id") ON DELETE CASCADE,
  "name" varchar(160) NOT NULL,
  "description" text,
  "type" "promotion_type" DEFAULT 'percentage' NOT NULL,
  "scope" "promotion_scope" DEFAULT 'order' NOT NULL,
  "value" numeric(10,2) DEFAULT '0' NOT NULL,
  "min_subtotal" numeric(12,2) DEFAULT '0' NOT NULL,
  "code" varchar(40),
  "status" "promotion_status" DEFAULT 'draft' NOT NULL,
  "starts_at" date,
  "ends_at" date,
  "usage_limit" integer,
  "usage_count" integer DEFAULT 0 NOT NULL,
  "per_customer_limit" integer,
  "stackable" boolean DEFAULT false NOT NULL,
  "auto_apply" boolean DEFAULT false NOT NULL,
  "created_by_id" uuid REFERENCES "users"("id") ON DELETE SET NULL,
  "created_at" timestamptz DEFAULT now() NOT NULL,
  "updated_at" timestamptz DEFAULT now() NOT NULL
);

CREATE INDEX "promotions_company_id_idx" ON "promotions" ("company_id");
CREATE INDEX "promotions_code_idx" ON "promotions" ("company_id", "code");
CREATE INDEX "promotions_status_idx" ON "promotions" ("status");
