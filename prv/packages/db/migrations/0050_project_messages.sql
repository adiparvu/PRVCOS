-- Project message thread (Phase 23.6). A per-project conversation between the
-- client (portal account) and company staff (user).

CREATE TYPE "project_message_author" AS ENUM ('client', 'staff');

CREATE TABLE "project_messages" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "company_id" uuid NOT NULL REFERENCES "companies"("id") ON DELETE CASCADE,
  "project_id" uuid NOT NULL REFERENCES "projects"("id") ON DELETE CASCADE,
  "author_type" "project_message_author" NOT NULL,
  "author_user_id" uuid REFERENCES "users"("id") ON DELETE SET NULL,
  "author_portal_account_id" uuid REFERENCES "portal_accounts"("id") ON DELETE SET NULL,
  "body" text NOT NULL,
  "created_at" timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX "project_messages_project_id_idx" ON "project_messages" ("project_id");
CREATE INDEX "project_messages_company_id_idx" ON "project_messages" ("company_id");
