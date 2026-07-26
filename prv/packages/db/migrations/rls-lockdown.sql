-- RLS lockdown — defense-in-depth for every table in the public schema.
--
-- Applied by `pnpm db:rls` (part of `pnpm db:provision`), AFTER drizzle-kit
-- push has created the tables. Idempotent: safe to re-run after every push,
-- including on tables created since the last run.
--
-- What this protects against
-- ──────────────────────────
-- The application reaches Postgres through the service role, which has
-- BYPASSRLS — nothing here changes application behaviour. The exposure this
-- closes is direct PostgREST access: the Supabase anon key ships inside every
-- web and mobile bundle, and without RLS enabled, that key can read any table
-- through the auto-generated REST API. With RLS enabled and no matching
-- policy, PostgREST's `anon`/`authenticated` roles get default-deny.
--
-- Why no FORCE ROW LEVEL SECURITY
-- ───────────────────────────────
-- FORCE would subject the table owner (the app's connection) to RLS as well.
-- The app enforces tenancy in the query layer and does not set
-- `app.company_id` outside the (currently unused) withRLS() helper, so FORCE
-- would return empty results everywhere. If the direct-SQL path via withRLS()
-- is ever adopted route-wide, revisit FORCE table by table.
--
-- The company_isolation policy
-- ────────────────────────────
-- For every table with a company_id column, a policy grants access only when
-- the transaction-local `app.company_id` matches (the contract of withRLS()
-- in packages/db/src/rls.ts). current_setting(..., true) returns NULL when
-- the variable is unset, which matches no rows — so any role subject to RLS
-- that does not explicitly set the variable still sees nothing. Policies are
-- additive (OR), so the narrower per-table policies from migration 0004 keep
-- working unchanged.

-- 1) Enable RLS on every table in public (idempotent by nature).
DO $$
DECLARE
  r record;
BEGIN
  FOR r IN
    SELECT tablename FROM pg_tables WHERE schemaname = 'public'
  LOOP
    EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY', r.tablename);
  END LOOP;
END $$;

-- 2) Company-isolation policy on every table that carries company_id.
DO $$
DECLARE
  r record;
BEGIN
  FOR r IN
    SELECT c.table_name
    FROM information_schema.columns c
    JOIN pg_tables t
      ON t.schemaname = 'public' AND t.tablename = c.table_name
    WHERE c.table_schema = 'public' AND c.column_name = 'company_id'
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS company_isolation ON public.%I', r.table_name);
    EXECUTE format(
      'CREATE POLICY company_isolation ON public.%I FOR ALL '
      || 'USING (company_id = current_setting(''app.company_id'', true)::uuid) '
      || 'WITH CHECK (company_id = current_setting(''app.company_id'', true)::uuid)',
      r.table_name
    );
  END LOOP;
END $$;

-- 3) Report — visible in provision output so a regression is noticed.
DO $$
DECLARE
  total int;
  enabled int;
  policied int;
BEGIN
  SELECT count(*) INTO total FROM pg_tables WHERE schemaname = 'public';
  SELECT count(*) INTO enabled
    FROM pg_tables WHERE schemaname = 'public' AND rowsecurity;
  SELECT count(DISTINCT tablename) INTO policied
    FROM pg_policies WHERE schemaname = 'public' AND policyname = 'company_isolation';
  RAISE NOTICE 'RLS lockdown: % / % tables RLS-enabled, % with company_isolation policy',
    enabled, total, policied;
  IF enabled < total THEN
    RAISE EXCEPTION 'RLS lockdown incomplete: % of % tables enabled', enabled, total;
  END IF;
END $$;
