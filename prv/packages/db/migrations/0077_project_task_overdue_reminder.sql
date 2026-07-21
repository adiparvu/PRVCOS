-- Phase 6.2 — Project task overdue reminder.
-- One-time stamp so the daily sweep nudges an assignee exactly once when their
-- open task passes its due date (claim-on-null). The task PATCH route clears
-- this on a due-date change so a rescheduled task can be nudged again; reaching
-- a terminal status (done / cancelled) leaves the candidate set.

ALTER TABLE project_tasks
  ADD COLUMN IF NOT EXISTS overdue_notified_at timestamptz;
