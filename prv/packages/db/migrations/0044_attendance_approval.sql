-- Timesheet approval (Phase 5). Records who signed off an attendance entry and
-- when — orthogonal to the present/late status, so a manager can approve a
-- day's attendance for payroll without changing the attendance state itself.

ALTER TABLE "attendance_records" ADD COLUMN "approved_by_user_id" uuid REFERENCES "users"("id") ON DELETE SET NULL;
ALTER TABLE "attendance_records" ADD COLUMN "approved_at" timestamptz;
