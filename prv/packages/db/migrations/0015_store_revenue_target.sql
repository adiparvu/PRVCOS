-- Add a monthly revenue goal to stores for manager-dashboard performance tracking

ALTER TABLE "stores" ADD COLUMN "monthly_revenue_target" numeric(14, 2);
