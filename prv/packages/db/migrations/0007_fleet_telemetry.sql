-- Fleet telemetry: fuel level + daily odometer logs
-- Migration: 0007_fleet_telemetry

-- ─── Add fuel_level_pct to vehicles ─────────────────────────────────────────

ALTER TABLE vehicles ADD COLUMN IF NOT EXISTS fuel_level_pct INTEGER CHECK (fuel_level_pct >= 0 AND fuel_level_pct <= 100);

-- ─── Daily odometer log ──────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS vehicle_daily_logs (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id      UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  vehicle_id      UUID NOT NULL REFERENCES vehicles(id) ON DELETE CASCADE,
  recorded_by     UUID REFERENCES users(id) ON DELETE SET NULL,

  date            DATE NOT NULL,
  odometer_km     INTEGER NOT NULL CHECK (odometer_km >= 0),

  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT now(),

  CONSTRAINT vehicle_daily_logs_vehicle_date_unique UNIQUE (vehicle_id, date)
);

CREATE INDEX IF NOT EXISTS vehicle_daily_logs_company_id_idx ON vehicle_daily_logs (company_id);
CREATE INDEX IF NOT EXISTS vehicle_daily_logs_vehicle_id_idx ON vehicle_daily_logs (vehicle_id);
CREATE INDEX IF NOT EXISTS vehicle_daily_logs_date_idx       ON vehicle_daily_logs (date);
