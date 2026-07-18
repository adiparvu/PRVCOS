-- Procurement 3-way match (Phase 21.4). Extends supplier invoices with the
-- receipt they were reconciled against, the match outcome, and the signed price
-- variance (invoice − value of goods actually received).

ALTER TABLE "supplier_invoices" ADD COLUMN "grn_id" uuid REFERENCES "goods_receipt_notes"("id") ON DELETE SET NULL;
ALTER TABLE "supplier_invoices" ADD COLUMN "match_status" varchar(20) NOT NULL DEFAULT 'unmatched';
ALTER TABLE "supplier_invoices" ADD COLUMN "match_variance" numeric(12, 2);
