-- Add compensation basis to users for payroll (sensitive; payroll-scoped access)

CREATE TYPE "pay_type" AS ENUM ('hourly', 'monthly', 'annual');

ALTER TABLE "users" ADD COLUMN "pay_type" "pay_type";
ALTER TABLE "users" ADD COLUMN "pay_rate" numeric(12, 2);
