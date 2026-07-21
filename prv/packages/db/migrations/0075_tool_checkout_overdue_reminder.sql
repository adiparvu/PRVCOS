-- Phase 22.1 — Tool checkout custody-overdue reminder.
-- One-time stamp so the daily sweep reminds a custodian exactly once when their
-- open checkout passes its expected return time (claim-on-null). Returning the
-- tool closes the checkout, so it leaves the candidate set.

ALTER TABLE tool_checkouts
  ADD COLUMN IF NOT EXISTS overdue_notified_at timestamptz;
