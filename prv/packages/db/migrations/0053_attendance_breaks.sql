-- Break tracking on attendance (Phase 7.1). One break per shift: start, end and
-- the derived duration in minutes.

ALTER TABLE "attendance_records" ADD COLUMN "break_start" timestamptz;
ALTER TABLE "attendance_records" ADD COLUMN "break_end" timestamptz;
ALTER TABLE "attendance_records" ADD COLUMN "break_minutes" integer;
