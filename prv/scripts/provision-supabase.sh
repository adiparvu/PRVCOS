#!/usr/bin/env bash
# PRV — Provision a Supabase project (schema + RLS + seed + demo login)
#
# Run from the prv/ directory:  bash scripts/provision-supabase.sh
#
# Operationalises DEPLOYMENT.md §2. It exists because that sequence has four
# traps that are silent when hit by hand:
#   1. `drizzle-kit push` reads DATABASE_URL, but DDL through the transaction
#      pooler (6543) is unreliable — it must run against the direct 5432 URL.
#   2. `push --force` DROPS columns and tables to reconcile with the schema.
#   3. `db:seed` refuses NODE_ENV=production, yet must run BEFORE the demo user
#      (which needs an existing company row).
#   4. Tables pushed after the last `db:rls` run start with RLS OFF, which
#      exposes them through PostgREST to the publishable key.
set -euo pipefail

BOLD='\033[1m'; GREEN='\033[0;32m'; YELLOW='\033[1;33m'; RED='\033[0;31m'; NC='\033[0m'
step() { echo -e "\n${BOLD}$1${NC}"; }
ok()   { echo -e "  ${GREEN}✓${NC} $1"; }
warn() { echo -e "  ${YELLOW}⚠${NC}  $1"; }
fail() { echo -e "  ${RED}✗${NC} $1"; exit 1; }

ALLOW_EXISTING=0
DEMO_EMAIL=""
DEMO_PASSWORD=""
for arg in "$@"; do
  case "$arg" in
    --allow-existing) ALLOW_EXISTING=1 ;;
    --demo-email=*)   DEMO_EMAIL="${arg#*=}" ;;
    --demo-password=*) DEMO_PASSWORD="${arg#*=}" ;;
    *) fail "Unknown argument: $arg" ;;
  esac
done

echo -e "${BOLD}PRV — Supabase provisioning${NC}"
echo "==============================="

# ─── 1. Prerequisites ─────────────────────────────────────────────────────────
step "Checking prerequisites..."
command -v psql >/dev/null 2>&1 || fail "psql is required (extensions + RLS are .sql files). macOS: brew install libpq"
command -v pnpm >/dev/null 2>&1 || fail "pnpm is required. npm install -g pnpm@10"
[ -f package.json ] || fail "Run this from the prv/ directory."
ok "psql and pnpm present"

# Load prv/.env.local if present — it is gitignored and holds the real values.
if [ -f .env.local ]; then
  set -a; . ./.env.local; set +a
  ok "loaded .env.local"
fi

: "${DATABASE_DIRECT_URL:?DATABASE_DIRECT_URL is required — Supabase → Settings → Database → Connection string → Direct (port 5432)}"
: "${SUPABASE_URL:?SUPABASE_URL is required}"
: "${SUPABASE_SERVICE_ROLE_KEY:?SUPABASE_SERVICE_ROLE_KEY is required (sb_secret_… — server only)}"

case "$DATABASE_DIRECT_URL" in
  *:5432/*) ok "DATABASE_DIRECT_URL points at 5432" ;;
  *) fail "DATABASE_DIRECT_URL must be the DIRECT connection on port 5432, not the pooler. DDL through the pooler fails unpredictably." ;;
esac

# ─── 2. Connectivity + destructive-change guard ───────────────────────────────
step "Probing the database..."
# Bounded, or an unreachable host hangs for the OS TCP timeout with no output.
PGCONNECT_TIMEOUT=10 psql "$DATABASE_DIRECT_URL" -tAc "SELECT 1" >/dev/null 2>&1 \
  || fail "Cannot reach the database. Check the password in the URL, and that outbound TCP 5432 is not blocked by your network."
ok "connection established"

EXISTING=$(psql "$DATABASE_DIRECT_URL" -tAc \
  "SELECT count(*) FROM pg_tables WHERE schemaname = 'public'")
echo "  public schema currently holds ${EXISTING} table(s)"

if [ "$EXISTING" -gt 0 ] && [ "$ALLOW_EXISTING" -eq 0 ]; then
  fail "Refusing to run: \`drizzle-kit push --force\` DROPS tables and columns to match the schema, which would destroy existing data.
     This guard exists because the command gives no warning of its own.
     If this database is genuinely disposable, re-run with --allow-existing."
fi
[ "$EXISTING" -gt 0 ] && warn "--allow-existing given: proceeding against a NON-EMPTY database"

# ─── 3. Schema ────────────────────────────────────────────────────────────────
step "Installing extensions (pgcrypto + pgvector)..."
pnpm --filter @prv/db db:extensions
ok "extensions installed"

step "Pushing the schema (179 tables)..."
# Trap 1: push reads DATABASE_URL. Override it for this step only — the value is
# scoped to the child process and never written back to .env.local.
DATABASE_URL="$DATABASE_DIRECT_URL" pnpm --filter @prv/db exec drizzle-kit push --force
ok "schema pushed"

step "Locking down RLS on every table..."
pnpm --filter @prv/db db:rls
ok "RLS applied (the script raises on its own if any public table is left uncovered)"

# ─── 4. Data ──────────────────────────────────────────────────────────────────
step "Seeding baseline data (roles, permissions, company, demo records)..."
NODE_ENV=development DATABASE_URL="$DATABASE_DIRECT_URL" pnpm --filter @prv/db db:seed
ok "seeded"

if [ -n "$DEMO_EMAIL" ] && [ -n "$DEMO_PASSWORD" ]; then
  step "Creating the demo/review auth account..."
  # Seeded users have no Supabase Auth identity and therefore cannot log in.
  DATABASE_URL="$DATABASE_DIRECT_URL" \
    pnpm --filter @prv/db db:provision:user "$DEMO_EMAIL" "$DEMO_PASSWORD" --create-app-row
  ok "demo account created"
  warn "Give this account a NON-privileged role. An App Store reviewer with an owner account can read real payroll and personal data."
else
  warn "No demo account created (pass --demo-email=… --demo-password=… to create one)."
fi

# ─── 5. Verify, rather than assume ────────────────────────────────────────────
step "Verifying..."
TABLES=$(psql "$DATABASE_DIRECT_URL" -tAc "SELECT count(*) FROM pg_tables WHERE schemaname='public'")
NO_RLS=$(psql "$DATABASE_DIRECT_URL" -tAc \
  "SELECT count(*) FROM pg_tables t JOIN pg_class c ON c.relname=t.tablename
    WHERE t.schemaname='public' AND c.relnamespace='public'::regnamespace AND NOT c.relrowsecurity")
echo "  tables in public:      $TABLES"
echo "  tables without RLS:    $NO_RLS"
[ "$NO_RLS" -eq 0 ] || fail "$NO_RLS table(s) have RLS disabled — they are reachable through PostgREST with the publishable key. Re-run: pnpm --filter @prv/db db:rls"
ok "every public table has RLS enabled"

echo -e "\n${GREEN}${BOLD}Provisioning complete.${NC}"
echo "Next, in order (DEPLOYMENT.md §4-§7):"
echo "  1. Switch DATABASE_URL back to the POOLER (6543) for the running app."
echo "  2. Deploy the web app with every variable from DEPLOYMENT.md §1."
echo "  3. Sync Inngest — deploying does NOT register the 27 crons."
echo "  4. Verify the Resend domain, or magic links silently never arrive."
echo "  5. Smoke test: GET /api/health must report database: ok, redis: ok."
