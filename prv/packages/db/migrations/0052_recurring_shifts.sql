-- Recurring shifts (Phase 7.2). Series frequency + inclusive end date live on
-- every occurrence; generated occurrences link back to the origin via
-- parent_shift_id.

CREATE TYPE "shift_recurrence_freq" AS ENUM ('daily', 'weekly', 'biweekly', 'monthly');

ALTER TABLE "shifts" ADD COLUMN "recurrence_freq" "shift_recurrence_freq";
ALTER TABLE "shifts" ADD COLUMN "recurrence_until" varchar(10);
ALTER TABLE "shifts" ADD COLUMN "parent_shift_id" uuid;

CREATE INDEX "shifts_parent_shift_id_idx" ON "shifts" ("parent_shift_id");
