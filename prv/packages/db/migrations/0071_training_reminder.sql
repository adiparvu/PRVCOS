-- Phase 18.3 — Certification expiry reminder.
-- One-time reminder stamp so the daily cron alerts a worker exactly once per
-- certificate when it enters the expiry warning window (or is already expired).

ALTER TABLE safety_training_records
  ADD COLUMN IF NOT EXISTS reminder_sent_at timestamptz;
