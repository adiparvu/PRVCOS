-- Phase 14.5 — Milestone-missed critical-alert producer.
-- One-time stamp so the daily cron raises the `ops.milestone_missed` routed
-- critical alert exactly once per phase that slips past its planned end date
-- while still open (claim-on-null). A phase reaching a terminal status simply
-- leaves the candidate set.

ALTER TABLE renovation_phases
  ADD COLUMN IF NOT EXISTS milestone_missed_alerted_at timestamptz;
