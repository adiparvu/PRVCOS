-- Passkeys / WebAuthn credentials (Phase 2). Public-key credentials registered
-- by a user's authenticators, verified on assertion. Trusted devices reuse the
-- existing user_devices table (is_trusted / trust_expires_at).

CREATE TABLE "webauthn_credentials" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "user_id" uuid NOT NULL REFERENCES "users"("id") ON DELETE CASCADE,
  "credential_id" text NOT NULL UNIQUE,
  "public_key" text NOT NULL,
  "counter" integer NOT NULL DEFAULT 0,
  "transports" jsonb NOT NULL DEFAULT '[]'::jsonb,
  "device_type" varchar(20),
  "backed_up" boolean NOT NULL DEFAULT false,
  "nickname" varchar(100),
  "created_at" timestamptz NOT NULL DEFAULT now(),
  "last_used_at" timestamptz
);

CREATE INDEX "webauthn_credentials_user_id_idx" ON "webauthn_credentials" ("user_id");
