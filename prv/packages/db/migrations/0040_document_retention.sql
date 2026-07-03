-- Document Retention & Expiry Intelligence (Phase 12.5). Legal-hold flags on
-- documents block archival/erasure; per-type retention policies drive the
-- effective expiry and auto-archive behaviour.

ALTER TABLE "documents" ADD COLUMN "legal_hold" boolean DEFAULT false NOT NULL;
ALTER TABLE "documents" ADD COLUMN "legal_hold_reason" text;

CREATE TABLE "retention_policies" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "company_id" uuid NOT NULL REFERENCES "companies"("id") ON DELETE CASCADE,
  "document_type" "document_type" NOT NULL,
  "retention_months" integer DEFAULT 60 NOT NULL,
  "auto_archive" boolean DEFAULT true NOT NULL,
  "created_at" timestamptz DEFAULT now() NOT NULL,
  "updated_at" timestamptz DEFAULT now() NOT NULL,
  CONSTRAINT "retention_policies_company_type_unique" UNIQUE ("company_id", "document_type")
);

CREATE INDEX "retention_policies_company_id_idx" ON "retention_policies" ("company_id");
