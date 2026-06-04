CREATE TYPE "public"."company_status" AS ENUM('active', 'suspended', 'onboarding', 'churned');--> statement-breakpoint
CREATE TYPE "public"."company_type" AS ENUM('renovations', 'projects', 'shop', 'services', 'other');--> statement-breakpoint
CREATE TYPE "public"."scope_level" AS ENUM('SCOPE_RECORD', 'SCOPE_TEAM', 'SCOPE_DEPARTMENT', 'SCOPE_STORE', 'SCOPE_REGION', 'SCOPE_COMPANY', 'SCOPE_GROUP', 'SCOPE_PLATFORM', 'SCOPE_GLOBAL');--> statement-breakpoint
CREATE TYPE "public"."system_role" AS ENUM('group_ceo', 'ceo', 'co_ceo', 'system_administrator', 'worker', 'team_leader', 'oms', 'operations_manager', 'department_head', 'hr_payroll', 'project_worker', 'project_team_leader', 'project_oms', 'project_operations_manager', 'project_director', 'seller', 'store_manager', 'shop_director', 'app_support_specialist', 'data_analyst', 'qa_tester');--> statement-breakpoint
CREATE TYPE "public"."user_status" AS ENUM('active', 'inactive', 'suspended', 'onboarding', 'offboarded');--> statement-breakpoint
CREATE TYPE "public"."security_event_severity" AS ENUM('low', 'medium', 'high', 'critical');--> statement-breakpoint
CREATE TYPE "public"."security_event_type" AS ENUM('auth_failure', 'mfa_failure', 'mfa_required', 'session_expired', 'insufficient_scope', 'insufficient_role', 'company_mismatch', 'rate_limit_exceeded', 'dlp_triggered', 'privilege_escalation', 'account_locked', 'device_untrusted', 'reauth_required');--> statement-breakpoint
CREATE TABLE "migration_history" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"version" varchar(32) NOT NULL,
	"name" varchar(255) NOT NULL,
	"applied_at" timestamp with time zone DEFAULT now() NOT NULL,
	"applied_by" varchar(100) DEFAULT 'system' NOT NULL,
	"checksum" varchar(64) NOT NULL,
	"execution_time_ms" text,
	"success" boolean DEFAULT true NOT NULL,
	"error_message" text,
	CONSTRAINT "migration_history_version_unique" UNIQUE("version")
);
--> statement-breakpoint
CREATE TABLE "companies" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"group_id" uuid,
	"name" varchar(255) NOT NULL,
	"slug" varchar(100) NOT NULL,
	"type" "company_type" DEFAULT 'other' NOT NULL,
	"status" "company_status" DEFAULT 'onboarding' NOT NULL,
	"logo_url" text,
	"cover_url" text,
	"primary_color" varchar(7),
	"email" varchar(254),
	"phone" varchar(32),
	"website" text,
	"country" varchar(2) DEFAULT 'RO' NOT NULL,
	"region" varchar(100),
	"city" varchar(100),
	"address" text,
	"postal_code" varchar(20),
	"vat_number" varchar(50),
	"registration_number" varchar(50),
	"settings" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"deleted_at" timestamp with time zone,
	"is_active" boolean DEFAULT true NOT NULL,
	CONSTRAINT "companies_slug_unique" UNIQUE("slug")
);
--> statement-breakpoint
CREATE TABLE "departments" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"company_id" uuid NOT NULL,
	"name" varchar(255) NOT NULL,
	"code" varchar(50) NOT NULL,
	"parent_id" uuid,
	"head_user_id" uuid,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "stores" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"company_id" uuid NOT NULL,
	"name" varchar(255) NOT NULL,
	"code" varchar(50) NOT NULL,
	"region" varchar(100),
	"phone" varchar(32),
	"email" varchar(254),
	"address" text,
	"city" varchar(100),
	"is_active" boolean DEFAULT true NOT NULL,
	"settings" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "teams" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"company_id" uuid NOT NULL,
	"department_id" uuid,
	"store_id" uuid,
	"name" varchar(255) NOT NULL,
	"code" varchar(50) NOT NULL,
	"lead_user_id" uuid,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "user_audit_log" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"company_id" uuid NOT NULL,
	"actor_id" uuid NOT NULL,
	"target_user_id" uuid,
	"action" varchar(100) NOT NULL,
	"entity_type" varchar(100),
	"entity_id" uuid,
	"diff" jsonb,
	"ip_address" varchar(45),
	"user_agent" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "user_devices" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"device_id" uuid NOT NULL,
	"name" varchar(255),
	"user_agent" text,
	"platform" varchar(50),
	"is_trusted" boolean DEFAULT false NOT NULL,
	"trust_expires_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"last_seen_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "user_devices_device_id_unique" UNIQUE("device_id")
);
--> statement-breakpoint
CREATE TABLE "user_mfa_methods" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"method" varchar(20) NOT NULL,
	"identifier" varchar(255),
	"secret_encrypted" text,
	"is_primary" boolean DEFAULT false NOT NULL,
	"is_verified" boolean DEFAULT false NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"verified_at" timestamp with time zone,
	"last_used_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "users" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"company_id" uuid NOT NULL,
	"supabase_id" uuid,
	"email" varchar(254) NOT NULL,
	"phone" varchar(32),
	"first_name" varchar(100) NOT NULL,
	"last_name" varchar(100) NOT NULL,
	"avatar_url" text,
	"bio" text,
	"employee_id" varchar(100),
	"job_title" varchar(255),
	"department_id" uuid,
	"team_id" uuid,
	"store_id" uuid,
	"manager_id" uuid,
	"role" "system_role" NOT NULL,
	"scope_level" "scope_level" NOT NULL,
	"status" "user_status" DEFAULT 'onboarding' NOT NULL,
	"mfa_enabled" boolean DEFAULT false NOT NULL,
	"security_level" varchar(20) DEFAULT 'standard' NOT NULL,
	"max_session_ttl_seconds" varchar(20),
	"locale" varchar(10) DEFAULT 'ro-RO' NOT NULL,
	"timezone" varchar(50) DEFAULT 'Europe/Bucharest' NOT NULL,
	"settings" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"metadata" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"last_login_at" timestamp with time zone,
	"deleted_at" timestamp with time zone,
	"is_active" boolean DEFAULT true NOT NULL,
	CONSTRAINT "users_supabase_id_unique" UNIQUE("supabase_id"),
	CONSTRAINT "users_company_email_unique" UNIQUE("company_id","email")
);
--> statement-breakpoint
CREATE TABLE "audit_logs" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"sequence_number" bigserial NOT NULL,
	"company_id" uuid NOT NULL,
	"actor_id" uuid,
	"session_id" varchar(36),
	"action" varchar(100) NOT NULL,
	"entity_type" varchar(100),
	"entity_id" uuid,
	"payload" jsonb,
	"method" varchar(10),
	"path" varchar(500),
	"ip_address" varchar(45),
	"user_agent" text,
	"gate_failed" integer DEFAULT 0 NOT NULL,
	"error_code" varchar(50),
	"prev_hash" varchar(64) NOT NULL,
	"entry_hash" varchar(64) NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "security_events" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"company_id" uuid,
	"actor_id" uuid,
	"event_type" "security_event_type" NOT NULL,
	"severity" "security_event_severity" NOT NULL,
	"metadata" jsonb,
	"ip_address" varchar(45),
	"user_agent" text,
	"path" varchar(500),
	"session_id" varchar(36),
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "departments" ADD CONSTRAINT "departments_company_id_companies_id_fk" FOREIGN KEY ("company_id") REFERENCES "public"."companies"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "stores" ADD CONSTRAINT "stores_company_id_companies_id_fk" FOREIGN KEY ("company_id") REFERENCES "public"."companies"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "teams" ADD CONSTRAINT "teams_company_id_companies_id_fk" FOREIGN KEY ("company_id") REFERENCES "public"."companies"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "teams" ADD CONSTRAINT "teams_department_id_departments_id_fk" FOREIGN KEY ("department_id") REFERENCES "public"."departments"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "teams" ADD CONSTRAINT "teams_store_id_stores_id_fk" FOREIGN KEY ("store_id") REFERENCES "public"."stores"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_audit_log" ADD CONSTRAINT "user_audit_log_company_id_companies_id_fk" FOREIGN KEY ("company_id") REFERENCES "public"."companies"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_audit_log" ADD CONSTRAINT "user_audit_log_actor_id_users_id_fk" FOREIGN KEY ("actor_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_audit_log" ADD CONSTRAINT "user_audit_log_target_user_id_users_id_fk" FOREIGN KEY ("target_user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_devices" ADD CONSTRAINT "user_devices_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_mfa_methods" ADD CONSTRAINT "user_mfa_methods_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "users" ADD CONSTRAINT "users_company_id_companies_id_fk" FOREIGN KEY ("company_id") REFERENCES "public"."companies"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "users" ADD CONSTRAINT "users_department_id_departments_id_fk" FOREIGN KEY ("department_id") REFERENCES "public"."departments"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "users" ADD CONSTRAINT "users_team_id_teams_id_fk" FOREIGN KEY ("team_id") REFERENCES "public"."teams"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "users" ADD CONSTRAINT "users_store_id_stores_id_fk" FOREIGN KEY ("store_id") REFERENCES "public"."stores"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "audit_logs" ADD CONSTRAINT "audit_logs_company_id_companies_id_fk" FOREIGN KEY ("company_id") REFERENCES "public"."companies"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "audit_logs" ADD CONSTRAINT "audit_logs_actor_id_users_id_fk" FOREIGN KEY ("actor_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "security_events" ADD CONSTRAINT "security_events_company_id_companies_id_fk" FOREIGN KEY ("company_id") REFERENCES "public"."companies"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "security_events" ADD CONSTRAINT "security_events_actor_id_users_id_fk" FOREIGN KEY ("actor_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "user_audit_log_company_id_idx" ON "user_audit_log" USING btree ("company_id");--> statement-breakpoint
CREATE INDEX "user_audit_log_actor_id_idx" ON "user_audit_log" USING btree ("actor_id");--> statement-breakpoint
CREATE INDEX "user_audit_log_created_at_idx" ON "user_audit_log" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX "user_devices_user_id_idx" ON "user_devices" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "user_mfa_methods_user_id_idx" ON "user_mfa_methods" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "users_company_id_idx" ON "users" USING btree ("company_id");--> statement-breakpoint
CREATE INDEX "users_email_idx" ON "users" USING btree ("email");--> statement-breakpoint
CREATE INDEX "users_supabase_id_idx" ON "users" USING btree ("supabase_id");--> statement-breakpoint
CREATE INDEX "audit_logs_company_id_idx" ON "audit_logs" USING btree ("company_id");--> statement-breakpoint
CREATE INDEX "audit_logs_actor_id_idx" ON "audit_logs" USING btree ("actor_id");--> statement-breakpoint
CREATE INDEX "audit_logs_created_at_idx" ON "audit_logs" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX "audit_logs_company_seq_idx" ON "audit_logs" USING btree ("company_id","sequence_number");--> statement-breakpoint
CREATE INDEX "security_events_company_id_idx" ON "security_events" USING btree ("company_id");--> statement-breakpoint
CREATE INDEX "security_events_actor_id_idx" ON "security_events" USING btree ("actor_id");--> statement-breakpoint
CREATE INDEX "security_events_event_type_idx" ON "security_events" USING btree ("event_type");--> statement-breakpoint
CREATE INDEX "security_events_severity_idx" ON "security_events" USING btree ("severity");--> statement-breakpoint
CREATE INDEX "security_events_created_at_idx" ON "security_events" USING btree ("created_at");