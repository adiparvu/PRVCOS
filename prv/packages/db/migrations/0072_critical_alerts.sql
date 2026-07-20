-- Phase 14.5 — Critical alerts (acknowledgement + escalation).
-- requires_ack marks a notification that must be explicitly acknowledged (shown
-- as a persistent banner). acknowledged_at records the acknowledgement;
-- ack_escalated_at guards the one-time escalation to the recipient's manager.

ALTER TABLE notifications
  ADD COLUMN IF NOT EXISTS requires_ack boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS acknowledged_at timestamptz,
  ADD COLUMN IF NOT EXISTS ack_escalated_at timestamptz;
