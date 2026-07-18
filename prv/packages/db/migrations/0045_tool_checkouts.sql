-- Tool checkout / return custody ledger (Phase 22.1). Each row is one checkout
-- session: who took the tool, when it is due back, and — once returned — its
-- condition and any damage. At most one open (unreturned) checkout per tool,
-- enforced by a partial unique index.

CREATE TYPE "tool_checkout_status" AS ENUM ('open', 'returned');

CREATE TABLE "tool_checkouts" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "company_id" uuid NOT NULL REFERENCES "companies"("id") ON DELETE CASCADE,
  "tool_id" uuid NOT NULL REFERENCES "tools"("id") ON DELETE CASCADE,
  "custodian_id" uuid REFERENCES "users"("id") ON DELETE SET NULL,
  "checked_out_by" uuid REFERENCES "users"("id") ON DELETE SET NULL,
  "returned_by" uuid REFERENCES "users"("id") ON DELETE SET NULL,
  "status" "tool_checkout_status" NOT NULL DEFAULT 'open',
  "checked_out_at" timestamptz NOT NULL DEFAULT now(),
  "expected_return_at" timestamptz,
  "returned_at" timestamptz,
  "checkout_notes" text,
  "return_condition_notes" text,
  "damage_reported" boolean NOT NULL DEFAULT false,
  "damage_notes" text,
  "created_at" timestamptz NOT NULL DEFAULT now(),
  "updated_at" timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX "tool_checkouts_company_id_idx" ON "tool_checkouts" ("company_id");
CREATE INDEX "tool_checkouts_tool_id_idx" ON "tool_checkouts" ("tool_id");
CREATE INDEX "tool_checkouts_custodian_id_idx" ON "tool_checkouts" ("custodian_id");

-- At most one open checkout per tool.
CREATE UNIQUE INDEX "tool_checkouts_one_open_per_tool"
  ON "tool_checkouts" ("tool_id")
  WHERE "status" = 'open';
