-- Sprint 14: Recurring Invoices — scheduled auto-generation of invoices

CREATE TYPE "recurring_frequency" AS ENUM ('weekly', 'monthly', 'quarterly', 'annual');

CREATE TABLE "recurring_invoices" (
  "id"                    uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "company_id"            uuid NOT NULL REFERENCES "companies"("id") ON DELETE CASCADE,
  "client_id"             uuid REFERENCES "clients"("id") ON DELETE SET NULL,
  "project_id"            uuid REFERENCES "projects"("id") ON DELETE SET NULL,
  "created_by_user_id"    uuid REFERENCES "users"("id") ON DELETE SET NULL,
  "template_invoice_id"   uuid REFERENCES "invoices"("id") ON DELETE SET NULL,
  "name"                  varchar(255) NOT NULL,
  "frequency"             "recurring_frequency" NOT NULL DEFAULT 'monthly',
  "next_run_date"         date NOT NULL,
  "end_date"              date,
  "is_active"             boolean NOT NULL DEFAULT true,
  "subtotal"              numeric(12, 2) NOT NULL,
  "vat_rate"              numeric(5, 2) NOT NULL DEFAULT 19,
  "vat_amount"            numeric(12, 2) NOT NULL,
  "total"                 numeric(12, 2) NOT NULL,
  "currency"              varchar(3) NOT NULL DEFAULT 'RON',
  "notes"                 text,
  "last_run_at"           timestamptz,
  "run_count"             integer NOT NULL DEFAULT 0,
  "created_at"            timestamptz NOT NULL DEFAULT now(),
  "updated_at"            timestamptz NOT NULL DEFAULT now(),
  "deleted_at"            timestamptz
);

CREATE INDEX "recurring_invoices_company_id_idx" ON "recurring_invoices"("company_id");
CREATE INDEX "recurring_invoices_next_run_idx"    ON "recurring_invoices"("next_run_date");
CREATE INDEX "recurring_invoices_is_active_idx"   ON "recurring_invoices"("is_active");
