-- Migration 0002: Foreign key integrity fixes (P-16, P-17, P-30)
-- Adds missing self-referential FKs and fixes securityLevel column type.

-- P-16: Add self-referential FK for users.manager_id
ALTER TABLE "users"
  ADD CONSTRAINT "users_manager_id_fk"
  FOREIGN KEY ("manager_id") REFERENCES "users"("id")
  ON DELETE SET NULL;

-- P-17: Add FK for companies.group_id (self-referential group hierarchy)
ALTER TABLE "companies"
  ADD CONSTRAINT "companies_group_id_fk"
  FOREIGN KEY ("group_id") REFERENCES "companies"("id")
  ON DELETE SET NULL;

-- P-16: Add self-referential FK for departments.parent_id
ALTER TABLE "departments"
  ADD CONSTRAINT "departments_parent_id_fk"
  FOREIGN KEY ("parent_id") REFERENCES "departments"("id")
  ON DELETE SET NULL;

-- P-30: Add security_level enum and migrate column from varchar to enum
CREATE TYPE "public"."security_level" AS ENUM('L2', 'L3', 'L4', 'L5');

ALTER TABLE "users"
  ALTER COLUMN "security_level" DROP DEFAULT;

ALTER TABLE "users"
  ALTER COLUMN "security_level"
  TYPE "public"."security_level"
  USING (
    CASE "security_level"
      WHEN 'standard' THEN 'L2'::security_level
      WHEN 'elevated' THEN 'L3'::security_level
      WHEN 'high'     THEN 'L4'::security_level
      WHEN 'critical' THEN 'L5'::security_level
      WHEN 'L2'       THEN 'L2'::security_level
      WHEN 'L3'       THEN 'L3'::security_level
      WHEN 'L4'       THEN 'L4'::security_level
      WHEN 'L5'       THEN 'L5'::security_level
      ELSE 'L2'::security_level  -- safe default
    END
  );

ALTER TABLE "users"
  ALTER COLUMN "security_level" SET DEFAULT 'L2'::security_level,
  ALTER COLUMN "security_level" SET NOT NULL;
