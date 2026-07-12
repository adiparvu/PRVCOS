-- Add a "cancelled" state to shifts (Phase 7). Cancelling a shift keeps the
-- record for history and reporting (distinct from a soft-delete), so managers
-- can call off a scheduled shift without losing its assignment/attendance data.

ALTER TYPE "shift_status" ADD VALUE IF NOT EXISTS 'cancelled';
