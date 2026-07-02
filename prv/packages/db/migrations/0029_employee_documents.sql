-- HR Compliance Documents (roadmap 8.5). Typed per-employee documents (ID, right
-- to work, professional certs) with expiry + a verification workflow
-- (pending → verified / rejected). The compliance dashboard derives % compliant
-- and the expiring-soon queue from these rows. Company-scoped.

CREATE TYPE "compliance_doc_type" AS ENUM ('passport', 'visa', 'id_card', 'driving_license', 'work_permit', 'certification', 'medical', 'other');
CREATE TYPE "compliance_doc_status" AS ENUM ('pending', 'verified', 'rejected');

CREATE TABLE "employee_documents" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "company_id" uuid NOT NULL REFERENCES "companies"("id") ON DELETE CASCADE,
  "user_id" uuid NOT NULL REFERENCES "users"("id") ON DELETE CASCADE,
  "doc_type" "compliance_doc_type" DEFAULT 'other' NOT NULL,
  "title" varchar(160) NOT NULL,
  "reference" varchar(120),
  "issued_date" date,
  "expiry_date" date,
  "status" "compliance_doc_status" DEFAULT 'pending' NOT NULL,
  "document_id" uuid,
  "notes" text,
  "verified_by_user_id" uuid REFERENCES "users"("id") ON DELETE SET NULL,
  "verified_at" timestamptz,
  "created_by_id" uuid REFERENCES "users"("id") ON DELETE SET NULL,
  "created_at" timestamptz DEFAULT now() NOT NULL,
  "updated_at" timestamptz DEFAULT now() NOT NULL
);

CREATE INDEX "employee_documents_company_id_idx" ON "employee_documents" ("company_id");
CREATE INDEX "employee_documents_user_id_idx" ON "employee_documents" ("user_id");
CREATE INDEX "employee_documents_expiry_idx" ON "employee_documents" ("expiry_date");
