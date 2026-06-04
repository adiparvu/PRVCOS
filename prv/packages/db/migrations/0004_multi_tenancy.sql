-- Sprint 07: Multi-Company Architecture
-- Tables: company_settings, user_profiles, company_memberships
-- RLS: 5 patterns applied to new and key foundation tables

-- ─── Enum ─────────────────────────────────────────────────────────────────────
CREATE TYPE "public"."membership_status" AS ENUM('ACTIVE', 'INACTIVE', 'INVITED', 'SUSPENDED');--> statement-breakpoint

-- ─── company_settings ─────────────────────────────────────────────────────────
CREATE TABLE "company_settings" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"company_id" uuid NOT NULL,
	"module" varchar(100) NOT NULL,
	"key" varchar(255) NOT NULL,
	"value" jsonb NOT NULL,
	"set_by" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "company_settings_company_module_key_unique" UNIQUE("company_id","module","key")
);
--> statement-breakpoint

-- ─── user_profiles ────────────────────────────────────────────────────────────
CREATE TABLE "user_profiles" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"company_id" uuid NOT NULL,
	"employee_number" varchar(50),
	"job_title" varchar(255),
	"bio" text,
	"emergency_contact_name" varchar(255),
	"emergency_contact_phone" varchar(50),
	"date_of_birth" date,
	"hire_date" date,
	"national_id" varchar(100),
	"bank_iban" varchar(50),
	"address" jsonb,
	"skills" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"certifications" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "user_profiles_user_id_unique" UNIQUE("user_id")
);
--> statement-breakpoint

-- ─── company_memberships ──────────────────────────────────────────────────────
CREATE TABLE "company_memberships" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"company_id" uuid NOT NULL,
	"user_id" uuid NOT NULL,
	"primary_role" varchar(100) NOT NULL,
	"additional_roles" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"scope_level" smallint DEFAULT 1 NOT NULL,
	"scope_target_type" varchar(50),
	"scope_target_id" uuid,
	"status" "membership_status" DEFAULT 'INVITED' NOT NULL,
	"invited_by" uuid,
	"invited_at" timestamp with time zone,
	"activated_at" timestamp with time zone,
	"deactivated_at" timestamp with time zone,
	"deactivation_reason" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "company_memberships_company_user_unique" UNIQUE("company_id","user_id")
);
--> statement-breakpoint

-- ─── Foreign Keys ─────────────────────────────────────────────────────────────
ALTER TABLE "company_settings"
	ADD CONSTRAINT "company_settings_company_id_companies_id_fk"
	FOREIGN KEY ("company_id") REFERENCES "public"."companies"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "company_settings"
	ADD CONSTRAINT "company_settings_set_by_users_id_fk"
	FOREIGN KEY ("set_by") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint

ALTER TABLE "user_profiles"
	ADD CONSTRAINT "user_profiles_user_id_users_id_fk"
	FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_profiles"
	ADD CONSTRAINT "user_profiles_company_id_companies_id_fk"
	FOREIGN KEY ("company_id") REFERENCES "public"."companies"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint

ALTER TABLE "company_memberships"
	ADD CONSTRAINT "company_memberships_company_id_companies_id_fk"
	FOREIGN KEY ("company_id") REFERENCES "public"."companies"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "company_memberships"
	ADD CONSTRAINT "company_memberships_user_id_users_id_fk"
	FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "company_memberships"
	ADD CONSTRAINT "company_memberships_invited_by_users_id_fk"
	FOREIGN KEY ("invited_by") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint

-- ─── Indexes ──────────────────────────────────────────────────────────────────
CREATE INDEX "company_settings_company_module_idx" ON "company_settings" USING btree ("company_id","module");--> statement-breakpoint
CREATE INDEX "user_profiles_company_user_idx" ON "user_profiles" USING btree ("company_id","user_id");--> statement-breakpoint
CREATE INDEX "user_profiles_employee_number_idx" ON "user_profiles" USING btree ("employee_number");--> statement-breakpoint
CREATE INDEX "company_memberships_company_role_idx" ON "company_memberships" USING btree ("company_id","primary_role");--> statement-breakpoint
CREATE INDEX "company_memberships_user_id_idx" ON "company_memberships" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "company_memberships_status_idx" ON "company_memberships" USING btree ("status");--> statement-breakpoint

-- ═══════════════════════════════════════════════════════════════════════════════
-- ROW-LEVEL SECURITY — 5 PATTERNS
-- Session variables set per-request via withRLS():
--   SET LOCAL app.company_id = '<uuid>';
--   SET LOCAL app.user_id   = '<uuid>';
-- ═══════════════════════════════════════════════════════════════════════════════

-- ─── Pattern 1 (self-only) — user_profiles ────────────────────────────────────
-- A user can only see and modify their own profile row.
ALTER TABLE "user_profiles" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE POLICY "rls_user_profiles_self_select" ON "user_profiles"
	FOR SELECT USING (
		user_id = current_setting('app.user_id', true)::uuid
	);--> statement-breakpoint
CREATE POLICY "rls_user_profiles_self_modify" ON "user_profiles"
	FOR ALL USING (
		user_id = current_setting('app.user_id', true)::uuid
	);--> statement-breakpoint

-- ─── Pattern 2 (company read) — company_settings ─────────────────────────────
-- Any member of the company can read settings; only company-scoped writes allowed.
ALTER TABLE "company_settings" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE POLICY "rls_company_settings_company_select" ON "company_settings"
	FOR SELECT USING (
		company_id = current_setting('app.company_id', true)::uuid
	);--> statement-breakpoint
CREATE POLICY "rls_company_settings_company_modify" ON "company_settings"
	FOR ALL USING (
		company_id = current_setting('app.company_id', true)::uuid
	);--> statement-breakpoint

-- ─── Pattern 3 (scope-based) — company_memberships ───────────────────────────
-- A user can see memberships in their own company context.
-- Elevated scope (managers and above) see all memberships; workers see only own.
ALTER TABLE "company_memberships" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE POLICY "rls_company_memberships_company_select" ON "company_memberships"
	FOR SELECT USING (
		company_id = current_setting('app.company_id', true)::uuid
		AND (
			-- Scope level >= 6 (COMPANY) sees all members in this company
			(current_setting('app.scope_level', true)::int >= 6)
			OR
			-- Lower scopes see only own membership row
			user_id = current_setting('app.user_id', true)::uuid
		)
	);--> statement-breakpoint
CREATE POLICY "rls_company_memberships_company_modify" ON "company_memberships"
	FOR ALL USING (
		company_id = current_setting('app.company_id', true)::uuid
	);--> statement-breakpoint

-- ─── Pattern 4 (elevated read) — user_audit_log ──────────────────────────────
-- Security-sensitive table: readable only by company members, full write by system.
ALTER TABLE "user_audit_log" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE POLICY "rls_user_audit_log_elevated_select" ON "user_audit_log"
	FOR SELECT USING (
		company_id = current_setting('app.company_id', true)::uuid
		AND current_setting('app.scope_level', true)::int >= 4
	);--> statement-breakpoint
CREATE POLICY "rls_user_audit_log_system_insert" ON "user_audit_log"
	FOR INSERT WITH CHECK (true);--> statement-breakpoint

-- ─── Pattern 5 (system-only) — migration_history ─────────────────────────────
-- System metadata table; no row-level reads by application users.
ALTER TABLE "migration_history" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE POLICY "rls_migration_history_deny_all" ON "migration_history"
	FOR ALL USING (false);--> statement-breakpoint
-- Service role bypasses RLS — this policy blocks all application-layer access
