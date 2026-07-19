-- Phase 12.2 — Document file version control.
-- The live file stays on the documents row; each replacement snapshots the prior
-- file into document_versions before overwriting, so no upload loses history.

ALTER TABLE "documents"
  ADD COLUMN IF NOT EXISTS "version_number" integer NOT NULL DEFAULT 1;

CREATE TABLE IF NOT EXISTS "document_versions" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "document_id" uuid NOT NULL REFERENCES "documents"("id") ON DELETE CASCADE,
  "company_id" uuid NOT NULL REFERENCES "companies"("id") ON DELETE CASCADE,
  "uploaded_by_user_id" uuid REFERENCES "users"("id") ON DELETE SET NULL,
  "version" integer NOT NULL,
  "file_url" text NOT NULL,
  "file_name" varchar(500) NOT NULL,
  "file_size_bytes" varchar(20),
  "mime_type" varchar(100),
  "change_note" text,
  "created_at" timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS "document_versions_document_id_idx" ON "document_versions" ("document_id");
CREATE INDEX IF NOT EXISTS "document_versions_company_id_idx" ON "document_versions" ("company_id");
CREATE UNIQUE INDEX IF NOT EXISTS "document_versions_document_version_unique" ON "document_versions" ("document_id", "version");
