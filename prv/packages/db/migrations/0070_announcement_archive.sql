-- Phase 13.4 — Announcement expiry auto-archive.
-- Adds a non-destructive archived_at stamp. The hourly cron sets it once an
-- announcement passes expires_at; the active feed hides archived announcements
-- while they remain in history (distinct from deleted_at).

ALTER TABLE announcements
  ADD COLUMN IF NOT EXISTS archived_at timestamptz;

-- Helps the hourly expiry sweep find due, not-yet-archived announcements.
CREATE INDEX IF NOT EXISTS announcements_expires_at_idx ON announcements (expires_at);
