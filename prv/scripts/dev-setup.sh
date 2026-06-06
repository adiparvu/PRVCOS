#!/usr/bin/env bash
# PRV — First-time local development setup
# Run from the prv/ directory: bash scripts/dev-setup.sh
set -euo pipefail

BOLD='\033[1m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

step() { echo -e "\n${BOLD}$1${NC}"; }
ok()   { echo -e "  ${GREEN}✓${NC} $1"; }
warn() { echo -e "  ${YELLOW}⚠${NC}  $1"; }
fail() { echo -e "  ${RED}✗${NC} $1"; exit 1; }

echo -e "${BOLD}PRV — Local Development Setup${NC}"
echo "================================"

# ─── 1. Prerequisites ──────────────────────────────────────────────────────
step "Checking prerequisites..."

command -v docker  >/dev/null 2>&1 || fail "Docker is required but not installed. https://docs.docker.com/get-docker/"
command -v pnpm    >/dev/null 2>&1 || fail "pnpm is required. Install: npm install -g pnpm@10"
command -v node    >/dev/null 2>&1 || fail "Node.js >=22 is required. https://nodejs.org"

NODE_VERSION=$(node -e "process.stdout.write(process.version)")
MAJOR=${NODE_VERSION#v}; MAJOR=${MAJOR%%.*}
[ "$MAJOR" -ge 22 ] || fail "Node.js >=22 required (found $NODE_VERSION)"

docker info >/dev/null 2>&1 || fail "Docker daemon is not running. Start Docker Desktop and retry."

ok "Prerequisites satisfied"

# ─── 2. Environment file ───────────────────────────────────────────────────
step "Setting up environment..."

if [ ! -f ".env.local" ]; then
  cp .env.local.example .env.local
  ok "Created .env.local from .env.local.example"
  warn "Open .env.local and fill in ANTHROPIC_API_KEY and any Supabase keys before running the app."
else
  ok ".env.local already exists (skipped)"
fi

# ─── 3. Docker services ────────────────────────────────────────────────────
step "Starting Docker services (PostgreSQL + Redis)..."

docker compose up -d postgres redis

echo "  Waiting for PostgreSQL..."
RETRIES=30
until docker compose exec -T postgres pg_isready -U postgres -q 2>/dev/null; do
  RETRIES=$((RETRIES - 1))
  [ "$RETRIES" -gt 0 ] || fail "PostgreSQL did not become ready in time"
  sleep 1
done
ok "PostgreSQL is ready (localhost:5432)"

RETRIES=15
until docker compose exec -T redis redis-cli ping 2>/dev/null | grep -q PONG; do
  RETRIES=$((RETRIES - 1))
  [ "$RETRIES" -gt 0 ] || fail "Redis did not become ready in time"
  sleep 1
done
ok "Redis is ready (localhost:6379)"

# ─── 4. Install dependencies ───────────────────────────────────────────────
step "Installing dependencies..."
pnpm install --frozen-lockfile
ok "Dependencies installed"

# ─── 5. Run database migrations ────────────────────────────────────────────
step "Running database migrations..."
DATABASE_DIRECT_URL=postgresql://postgres:password@localhost:5432/prv_dev \
  pnpm --filter @prv/db db:migrate:run
ok "Migrations complete"

# ─── 6. Done ───────────────────────────────────────────────────────────────
echo ""
echo -e "${BOLD}Setup complete!${NC}"
echo ""
echo "  Start the dev server:  pnpm dev"
echo "  Stop Docker services:  docker compose down"
echo "  Reset the database:    docker compose down -v && bash scripts/dev-setup.sh"
echo ""
echo "  (Optional) Full Supabase local stack:"
echo "    npm install -g supabase"
echo "    supabase start    # first run downloads ~2 GB"
echo "    supabase status   # copy keys into .env.local"
