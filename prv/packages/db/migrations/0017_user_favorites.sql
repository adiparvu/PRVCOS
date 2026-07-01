-- Universal Favorites (roadmap 5.7). Any entity in any module can be favorited
-- by a user; rows persist server-side so favorites sync across devices. Scoped
-- to (company, user). A favorite is a pointer (entity_type + entity_id) plus a
-- denormalized label/href snapshot so the command palette can render and
-- navigate without re-resolving every referenced entity.

CREATE TABLE "user_favorites" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "company_id" uuid NOT NULL REFERENCES "companies"("id") ON DELETE CASCADE,
  "user_id" uuid NOT NULL REFERENCES "users"("id") ON DELETE CASCADE,
  "entity_type" varchar(48) NOT NULL,
  "entity_id" varchar(128) NOT NULL,
  "label" varchar(200) NOT NULL,
  "href" varchar(512) NOT NULL,
  "created_at" timestamptz DEFAULT now() NOT NULL
);

CREATE INDEX "user_favorites_user_id_idx" ON "user_favorites" ("user_id");
CREATE INDEX "user_favorites_company_id_idx" ON "user_favorites" ("company_id");
CREATE UNIQUE INDEX "user_favorites_user_entity_unique" ON "user_favorites" ("user_id", "entity_type", "entity_id");
