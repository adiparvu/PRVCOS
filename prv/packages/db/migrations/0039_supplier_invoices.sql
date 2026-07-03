-- Accounts Payable — supplier invoices (roadmap 11.6). A bill received from a
-- supplier, optionally matched to a purchase order, moving through
-- received → scheduled → paid (or cancelled). Overdue is derived from due_date.

CREATE TYPE "payable_status" AS ENUM ('received', 'scheduled', 'paid', 'cancelled');

CREATE TABLE "supplier_invoices" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "company_id" uuid NOT NULL REFERENCES "companies"("id") ON DELETE CASCADE,
  "supplier_id" uuid REFERENCES "suppliers"("id") ON DELETE SET NULL,
  "purchase_order_id" uuid REFERENCES "purchase_orders"("id") ON DELETE SET NULL,
  "invoice_number" varchar(60) NOT NULL,
  "status" "payable_status" DEFAULT 'received' NOT NULL,
  "issue_date" date,
  "due_date" date NOT NULL,
  "scheduled_date" date,
  "paid_date" date,
  "amount" numeric(12,2) NOT NULL,
  "tax_amount" numeric(12,2) DEFAULT '0' NOT NULL,
  "paid_amount" numeric(12,2) DEFAULT '0' NOT NULL,
  "currency" varchar(3) DEFAULT 'RON' NOT NULL,
  "notes" text,
  "created_by_id" uuid REFERENCES "users"("id") ON DELETE SET NULL,
  "created_at" timestamptz DEFAULT now() NOT NULL,
  "updated_at" timestamptz DEFAULT now() NOT NULL
);

CREATE INDEX "supplier_invoices_company_id_idx" ON "supplier_invoices" ("company_id");
CREATE INDEX "supplier_invoices_supplier_id_idx" ON "supplier_invoices" ("supplier_id");
CREATE INDEX "supplier_invoices_status_idx" ON "supplier_invoices" ("status");
CREATE INDEX "supplier_invoices_due_date_idx" ON "supplier_invoices" ("due_date");
