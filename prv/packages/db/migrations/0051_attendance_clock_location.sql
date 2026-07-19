-- Worker clock-in/out GPS capture (Phase 7.1). Records the location a clock
-- press was made from and how it was made, alongside the existing gps_verified
-- flag on the attendance record.

ALTER TABLE "attendance_records" ADD COLUMN "location_lat" numeric(9, 6);
ALTER TABLE "attendance_records" ADD COLUMN "location_lng" numeric(9, 6);
ALTER TABLE "attendance_records" ADD COLUMN "location_accuracy_m" integer;
ALTER TABLE "attendance_records" ADD COLUMN "clock_in_method" varchar(20);
