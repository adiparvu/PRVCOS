-- Add a profile skills array to users (Skills & Expertise on the person profile)

ALTER TABLE "users" ADD COLUMN "skills" jsonb NOT NULL DEFAULT '[]'::jsonb;
