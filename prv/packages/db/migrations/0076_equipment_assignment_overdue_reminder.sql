-- Phase 7.6 — Equipment assignment custody-overdue reminder.
-- One-time stamp so the daily sweep reminds a holder exactly once when their
-- still-assigned equipment passes its expected return date (claim-on-null).
-- Returning the item moves it off "assigned", so it leaves the candidate set.

ALTER TABLE equipment_assignments
  ADD COLUMN IF NOT EXISTS overdue_notified_at timestamptz;
