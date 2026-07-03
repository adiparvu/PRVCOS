-- Document Sharing (Phase 12.3). Internal (user) or external (token link) shares
-- of a document, with permission level, optional expiry/password, revoke, and an
-- access log for external link views.

CREATE TYPE "document_share_scope" AS ENUM ('internal', 'external');
CREATE TYPE "document_share_permission" AS ENUM ('view', 'download', 'edit', 'manage');

CREATE TABLE "document_shares" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "company_id" uuid NOT NULL REFERENCES "companies"("id") ON DELETE CASCADE,
  "document_id" uuid NOT NULL REFERENCES "documents"("id") ON DELETE CASCADE,
  "created_by_id" uuid REFERENCES "users"("id") ON DELETE SET NULL,
  "scope" "document_share_scope" DEFAULT 'internal' NOT NULL,
  "permission" "document_share_permission" DEFAULT 'view' NOT NULL,
  "grantee_user_id" uuid REFERENCES "users"("id") ON DELETE CASCADE,
  "token" varchar(64),
  "password_protected" boolean DEFAULT false NOT NULL,
  "expires_at" timestamptz,
  "revoked_at" timestamptz,
  "access_count" integer DEFAULT 0 NOT NULL,
  "last_accessed_at" timestamptz,
  "note" text,
  "created_at" timestamptz DEFAULT now() NOT NULL,
  "updated_at" timestamptz DEFAULT now() NOT NULL
);

CREATE TABLE "document_share_access_log" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "share_id" uuid NOT NULL REFERENCES "document_shares"("id") ON DELETE CASCADE,
  "accessed_at" timestamptz DEFAULT now() NOT NULL,
  "ip_address" varchar(45),
  "user_agent" text
);

CREATE INDEX "document_shares_company_id_idx" ON "document_shares" ("company_id");
CREATE INDEX "document_shares_document_id_idx" ON "document_shares" ("document_id");
CREATE INDEX "document_shares_token_idx" ON "document_shares" ("token");
CREATE INDEX "document_share_access_log_share_id_idx" ON "document_share_access_log" ("share_id");
