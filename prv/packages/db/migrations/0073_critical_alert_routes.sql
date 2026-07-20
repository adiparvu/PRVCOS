-- Phase 14.5 — Critical alert routing config.
-- Admin-declared map: company-level critical trigger -> explicit recipient user.

CREATE TABLE IF NOT EXISTS critical_alert_routes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  trigger_key varchar(100) NOT NULL,
  route_to_user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  is_active boolean NOT NULL DEFAULT true,
  created_by_id uuid REFERENCES users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT critical_alert_routes_company_trigger_unique UNIQUE (company_id, trigger_key)
);

CREATE INDEX IF NOT EXISTS critical_alert_routes_company_id_idx
  ON critical_alert_routes (company_id);
