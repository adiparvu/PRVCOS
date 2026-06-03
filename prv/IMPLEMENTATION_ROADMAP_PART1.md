# PRV IMPLEMENTATION ROADMAP — PART 1
# Phases 0–12

**Document**: Implementation Roadmap Part 1 of 2
**Status**: Blueprint — Approved Architecture
**Source of Truth**: CLAUDE.md, PRODUCT_VISION.md, ROLE_ARCHITECTURE.md, SECURITY_ARCHITECTURE.md, NAVIGATION_ARCHITECTURE.md, DASHBOARD_ARCHITECTURE.md, DATABASE_ARCHITECTURE.md, DESIGN_SYSTEM.md, MODULE_ARCHITECTURE (Parts 1–4 + Supplement)

---

## ROADMAP PHILOSOPHY

```
Build foundations first.
Never build modules before architecture.
Never build UI before permissions.
Never build dashboards before data.
Never build AI before analytics.
```

Every phase produces something the next phase depends on.
No phase begins before the previous phase is complete and verified.
No production code until all architecture blueprints are approved.

### The Five Laws of PRV Development

**Law 1 — Architecture First**
Every system, feature, and module begins with a blueprint.
No code before the specification. No specification before the use case.

**Law 2 — Security Is Not a Feature**
Security is not a layer added later. Security is woven into Phase 2 and never bypassed.
Every API route: authenticated. Every query: scoped. Every action: audited.

**Law 3 — The 10-Year Test**
Every decision must answer: "Will this hold at 10× scale?"
If not — find a different approach before writing a single line.

**Law 4 — Apple-Grade Experience**
PRV must feel like a first-party Apple product.
Must feel like: Apple + Apple Business Manager + Apple Wallet + Apple Home
combined with: Linear + Notion + Things.
Must never feel like: Legacy ERP. Legacy Admin Panel.

**Law 5 — Role-Aware Reality**
The system knows who you are.
Every user sees a completely different application.
The CEO experience is not the Worker experience. Both are perfect for their role.

---

## MASTER TIMELINE OVERVIEW

| Phase | Name | Duration | Cumulative Week | Category |
|-------|------|----------|----------------|----------|
| 0 | Architecture Validation | 2w | 2 | Foundation |
| 1 | Foundation | 3w | 5 | Foundation |
| 2 | Auth & Security | 5w | 10 | Foundation |
| 3 | Multi-Company Core | 5w | 15 | Foundation |
| 4 | Design System | 7w | 22 | Foundation |
| 5 | Navigation System | 4w | 26 | Foundation |
| 6 | Projects Module | 9w | 35 | Core Module |
| 7 | Attendance & Workforce | 7w | 42 | Core Module |
| **MVP** | | | **Week 42** | |
| 8 | HR Module | 6w | 48 | Business Module |
| 9 | Shop Module | 9w | 57 | Business Module |
| 10 | CRM Module | 6w | 63 | Business Module |
| 11 | Finance Module | 7w | 70 | Business Module |
| 12 | Document Center | 5w | 75 | Business Module |
| 13 | Communication Center | 5w | 80 | Platform Layer |
| 14 | Notification Center | 4w | 84 | Platform Layer |
| 15 | Analytics Platform | 7w | 91 | Intelligence |
| 16 | Command Center | 4w | 95 | Intelligence |
| 17 | AI Platform | 6w | 101 | Intelligence |
| 18 | Safety Module | 4w | 105 | Operations |
| 19 | Knowledge Base | 4w | 109 | Operations |
| 20 | Learning Center | 5w | 114 | Operations |
| 21 | Procurement | 5w | 119 | Operations |
| 22 | Tools & Fleet | 6w | 125 | Operations |
| 23 | Public App | 8w | 133 | Public Facing |
| 24 | Polish & Optimization | 6w | 139 | Quality |
| 25 | Launch Preparation | 6w | 145 | Launch |

**Total: 145 weeks ≈ 2.8 years**
**MVP: Week 42 (~10 months)**
**Full Platform: Week 145 (~33 months)**

---

## TECHNOLOGY STACK

| Layer | Technology | Purpose |
|-------|-----------|---------|
| Framework | Next.js (App Router) + TypeScript | Web application |
| Styling | Tailwind CSS + Liquid Glass utilities | Design system |
| Mobile | React Native + Expo | iOS + Android |
| Database | PostgreSQL 16 (Supabase) | Primary data store |
| ORM | Drizzle ORM | Type-safe database access |
| Auth | Supabase Auth | Authentication + sessions |
| Storage | Supabase Storage | Files, media, documents |
| Realtime | Supabase Realtime | Live updates, presence, messaging |
| Background Jobs | Inngest | Async processing, workflows, cron |
| Search | Typesense | Full-text search, instant results |
| AI | Anthropic Claude API + Vercel AI SDK | AI assistant, insights, automation |
| Email | Resend | Transactional emails |
| Cache | Redis (Upstash) | Sessions, hot data, rate limiting |
| CDN + Security | Cloudflare | Edge, DDoS protection, WAF |
| Error Tracking | Sentry | Error monitoring + alerting |
| Logging | Axiom | Structured logging, dashboards |
| Testing | Vitest (unit) + Playwright (E2E) | Quality assurance |
| Monorepo | pnpm + Turborepo + Changesets | Package management |

---

## PHASE 0: ARCHITECTURE VALIDATION
**Duration**: 2 weeks
**Cumulative Week**: 2

### Goals
Validate that all architecture blueprints are complete, consistent, and production-ready before a single line of code is written. Identify all gaps, conflicts, and risks.

### Deliverables

#### 0.1 — Architecture Review
```
Review all blueprint documents against PRV requirements:

CLAUDE.md
  □ Golden Rules complete and non-contradictory
  □ Design requirements specified
  □ Architecture requirements complete
  □ Security requirements complete
  □ Scalability requirements defined

PRODUCT_VISION.md
  □ 18 platforms defined
  □ CEO 60-Second Rule specified
  □ Multi-company structure defined
  □ Multi-store structure defined
  □ Platform support defined (iPhone, iPad, Android, Web, macOS)

ROLE_ARCHITECTURE.md
  □ All 19 roles defined
  □ Global permission matrix complete
  □ Scope system defined
  □ Zero Trust validation rules defined
  □ Temporary access rules defined

SECURITY_ARCHITECTURE.md
  □ 7-gate auth chain complete
  □ Encryption strategy specified (TLS 1.3, AES-256-GCM)
  □ Audit log specification complete
  □ GDPR compliance addressed
  □ Backup strategy defined (RPO <5min, RTO <30min)

NAVIGATION_ARCHITECTURE.md
  □ All 19 role navigation bars defined
  □ Max 3 levels enforced throughout
  □ Universal Search specified
  □ Command Palette (⌘K) specified
  □ Bottom Sheet patterns defined

DASHBOARD_ARCHITECTURE.md
  □ 8-zone widget structure defined
  □ 50+ widgets specified
  □ My Day Engine defined for all 19 roles
  □ CEO 60-Second Rule validated in architecture

DATABASE_ARCHITECTURE.md
  □ All 151 entities defined
  □ company_id on every tenant-scoped table
  □ RLS policies specified
  □ All relationships documented

MODULE_ARCHITECTURE (Parts 1–4 + Supplement)
  □ All 21 modules defined
  □ 13 sections per module present
  □ Cross-module integration rules defined
  □ Approval bus specified

DESIGN_SYSTEM.md
  □ Liquid Glass 4 levels specified
  □ Typography 11-level system defined
  □ Motion curves defined
  □ Haptic 9 patterns defined
  □ 50+ component types specified
```

#### 0.2 — Gap Analysis
```
Identify what is missing, underspecified, or contradictory.

Gap analysis matrix:
  Component                | Defined? | Sufficient? | Gaps
  -------------------------|----------|-------------|------
  Role permissions         |    ?     |      ?      |  ?
  Database entities        |    ?     |      ?      |  ?
  API contracts            |    ?     |      ?      |  ?
  Navigation per role      |    ?     |      ?      |  ?
  Component specifications |    ?     |      ?      |  ?
  Module cross-references  |    ?     |      ?      |  ?
  Approval workflows       |    ?     |      ?      |  ?
  Notification contracts   |    ?     |      ?      |  ?

Resolution: Every gap identified in Phase 0 must be resolved
before Phase 1 begins. No gaps carry forward.
```

#### 0.3 — Risk Analysis
```
Technical Risks to evaluate:
  - RLS performance at scale (100k+ rows per table)
  - Supabase Realtime connection limits under load
  - AI API cost at scale (Claude usage per company)
  - Mobile performance on older devices (iPhone 12 minimum)
  - Background job queue saturation (Inngest throughput)
  - Search index size (Typesense at 10M+ documents)

Architecture Risks:
  - Module coupling (circular dependencies between modules)
  - Permission system conflicts (role overlap scenarios)
  - Navigation depth violations (>3 levels creeping in)
  - Data model gaps (missing relationships discovered during build)

8 Key Technology Decisions to lock before Phase 1:
  | Decision | Options Considered | Choice | Rationale |
  |----------|-------------------|--------|-----------|
  | Mobile framework | RN / Flutter / PWA | React Native + Expo | Code sharing with web |
  | State management | Zustand / Jotai / Redux | Zustand | Simple, no boilerplate |
  | Form library | React Hook Form / Formik | React Hook Form | Performance |
  | Date handling | date-fns / Day.js / Luxon | date-fns | Tree-shakable |
  | Validation | Zod / Yup / Valibot | Zod | TypeScript-native |
  | Realtime strategy | Supabase / Socket.io / SSE | Supabase Realtime | Integrated |
  | Background jobs | Inngest / BullMQ / Trigger.dev | Inngest | Serverless-native |
  | Search | Typesense / Meilisearch / Algolia | Typesense | Self-hostable, fast |
```

### Phase 0 Exit Criteria
```
□ All 9 blueprint documents reviewed and signed off
□ Zero unresolved gaps
□ All 8 technology decisions confirmed
□ Risk register created and accepted
□ Phase 1 scope confirmed
□ No code written
```

---

## PHASE 1: FOUNDATION
**Duration**: 3 weeks
**Cumulative Week**: 5

### Goals
Create the project infrastructure that all 25 subsequent phases will build on. No business logic. No modules. Infrastructure, conventions, and tooling only.

### Deliverables

#### 1.1 — Repository Structure (Monorepo)
```
prv/
├── apps/
│   ├── web/                    # Next.js App Router (main application)
│   ├── ios/                    # React Native + Expo (iOS)
│   ├── android/                # React Native + Expo (Android)
│   └── storybook/              # Liquid Glass component documentation
├── packages/
│   ├── ui/                     # Liquid Glass component library (@prv/ui)
│   ├── auth/                   # Auth utilities, hooks, providers (@prv/auth)
│   ├── db/                     # Drizzle schema, migrations, queries (@prv/db)
│   ├── types/                  # Shared TypeScript types (@prv/types)
│   ├── config/                 # Shared ESLint, TypeScript, Tailwind (@prv/config)
│   ├── ai/                     # AI utilities, prompts, tool definitions (@prv/ai)
│   ├── notifications/          # Notification bus interface (@prv/notifications)
│   └── utils/                  # Shared utilities (@prv/utils)
├── tooling/
│   ├── eslint/                 # ESLint configuration
│   ├── prettier/               # Prettier configuration
│   └── typescript/             # TypeScript base configs
├── turbo.json                  # Turborepo pipeline
├── pnpm-workspace.yaml         # pnpm workspace configuration
├── package.json                # Root package.json
└── .changeset/                 # Changesets configuration
```

#### 1.2 — Monorepo Strategy
```
Tools: pnpm + Turborepo + Changesets

Turborepo pipeline:
  build:      depends on ^build (builds dependencies first)
  test:       depends on ^build
  lint:       no dependencies (runs in parallel)
  type-check: depends on ^build

Package naming convention:
  @prv/ui, @prv/auth, @prv/db, @prv/types, @prv/config, @prv/ai,
  @prv/notifications, @prv/utils

Internal packages: importMode = "source" (no build step needed in dev)
Import alias: @/* → src/* in all apps and packages
```

#### 1.3 — Coding Standards
```
TypeScript (strict):
  strict: true
  noUncheckedIndexedAccess: true
  exactOptionalPropertyTypes: true
  No any — use unknown with type guards
  Prefer type for objects; interface for extendable contracts

Naming Conventions:
  Files:     kebab-case         (user-profile.tsx)
  Components:PascalCase         (UserProfile)
  Functions: camelCase          (getUserProfile)
  Constants: SCREAMING_SNAKE    (MAX_RETRY_COUNT)
  DB tables: snake_case         (user_profiles)
  DB columns:snake_case         (created_at)
  API routes:kebab-case         (/api/user-profiles)
  Types:     PascalCase         (UserProfile)

File Organization:
  - One component per file
  - Co-locate tests: user-profile.test.tsx
  - Co-locate stories: user-profile.stories.tsx
  - Barrel exports via index.ts per directory

API Conventions:
  - REST: /api/[resource] (plural nouns)
  - Verbs: POST create, GET read, PATCH update, DELETE delete
  - Response: { data: T } | { error: { code, message, details? } }
  - Pagination: cursor-based (not offset)
  - Errors: { code: string, message: string, details?: unknown }
```

#### 1.4 — Environment Strategy
```
Environments:
  local       → developer machine (local Supabase CLI + local services)
  preview     → per-PR deployment (Vercel preview + dev Supabase)
  staging     → pre-production (mirrors production configuration)
  production  → live (Vercel production + Supabase production)

Environment variables:
  .env.local      → never committed (gitignored)
  .env.example    → committed (shows all required keys, no values)
  Vercel env      → preview + staging + production values via dashboard

Required variables:
  DATABASE_URL               → Supabase PostgreSQL connection string
  SUPABASE_URL               → Supabase project URL
  SUPABASE_ANON_KEY          → Public browser-safe key
  SUPABASE_SERVICE_ROLE_KEY  → Server-only secret key
  ANTHROPIC_API_KEY          → Claude API (server only)
  RESEND_API_KEY             → Email sending (server only)
  TYPESENSE_API_KEY          → Search
  TYPESENSE_HOST             → Search host
  UPSTASH_REDIS_REST_URL     → Redis URL
  UPSTASH_REDIS_REST_TOKEN   → Redis token
  INNGEST_EVENT_KEY          → Background jobs
  INNGEST_SIGNING_KEY        → Inngest webhook verification
  SENTRY_DSN                 → Error tracking
  NEXT_PUBLIC_APP_URL        → App base URL (public, browser-safe)
```

#### 1.5 — CI/CD Strategy
```
Tool: GitHub Actions

ci.yml — runs on every PR:
  1. pnpm install (with lockfile cache)
  2. turbo run type-check
  3. turbo run lint
  4. turbo run test (unit tests)
  5. turbo run build
  6. Playwright smoke tests (critical paths only)

deploy-staging.yml — on merge to main:
  1. Full CI pipeline
  2. Deploy to Vercel (staging)
  3. Run DB migrations (staging)
  4. Full Playwright E2E suite against staging
  5. Notify team on success/failure

deploy-production.yml — on version tag (v*.*.*):
  1. Full CI pipeline
  2. Deploy to Vercel (production)
  3. Run DB migrations (production — with backup first)
  4. Smoke tests in production
  5. Sentry release notification

Branch strategy:
  main      → auto-deploys to staging
  feature/* → PR required, CI required, 1 reviewer minimum
  hotfix/*  → expedited review, deploy after 1 reviewer approval
  release/* → version bump via Changesets, changelog auto-generated
```

#### 1.6 — Logging Strategy
```
Tool: Axiom (structured JSON logs)

Log levels:
  DEBUG    → development only, verbose, never in production
  INFO     → normal operations, user actions, state transitions
  WARN     → unexpected but recoverable (retry, fallback triggered)
  ERROR    → operation failed, user impact likely, alert required
  CRITICAL → system-level failure, immediate response required

Log structure (every log entry includes):
  {
    level:      LogLevel,
    message:    string,
    timestamp:  ISO8601,
    requestId:  string,    // end-to-end tracing
    userId?:    string,    // who triggered this
    companyId?: string,    // multi-tenant context
    module?:    string,    // which PRV module
    action?:    string,    // create / update / delete / view
    entityType?:string,
    entityId?:  string,
    duration?:  number,    // ms — for performance tracking
    error?:     { code, message, stack? },
    metadata?:  Record<string, unknown>
  }

Rules:
  - Never log passwords, tokens, or secrets
  - Never log raw PII (reference userId, not email/name)
  - Always include requestId for traceability
  - Always include companyId for multi-tenant debugging
  - Production: no stack traces in logs (Sentry captures them separately)
```

#### 1.7 — Error Handling Strategy
```
Error taxonomy:
  ValidationError  → input doesn't meet requirements    (400)
  AuthError        → not authenticated                   (401)
  ForbiddenError   → not authorized for this resource   (403)
  NotFoundError    → resource doesn't exist              (404)
  ConflictError    → state conflict (duplicate, locked)  (409)
  RateLimitError   → too many requests                   (429)
  InternalError    → unexpected server error             (500)
  ServiceError     → downstream service unavailable      (502/503)

Error handling rules:
  - Never swallow errors silently
  - Always return typed error objects (not raw Error instances)
  - Log at appropriate level: validation=INFO, internal=ERROR
  - User-facing messages: descriptive, zero technical stack traces
  - Machine-readable codes: for client-side programmatic handling

API error response format:
  {
    error: {
      code: 'VALIDATION_ERROR',
      message: 'Email address is invalid',
      details?: [{ field: 'email', message: 'Must be a valid email' }]
    }
  }

Client-side error boundaries:
  - Global:        catches unhandled React errors → full-page error state
  - Module-level:  catches module errors → module error state
  - Component:     for isolated components (charts, widgets, data tables)
```

### Phase 1 Exit Criteria
```
□ Monorepo: pnpm install && turbo run build — succeeds with zero errors
□ CI pipeline: all jobs green on sample PR
□ All 4 environments accessible (local, preview, staging, production)
□ ESLint: zero errors
□ TypeScript: zero errors
□ Storybook: launches (empty — no components yet)
□ All required environment variables documented in .env.example
□ No business logic written
```

---

## PHASE 2: AUTHENTICATION & SECURITY
**Duration**: 5 weeks
**Cumulative Week**: 10

### Goals
Build the complete security layer. Every module in Phases 6–23 depends on this foundation being correct and unbreakable.

### Deliverables

#### 2.1 — Authentication (Full Spectrum)
```
Authentication methods:
  1. Email + Password (Supabase Auth — bcrypt hashing)
  2. Magic Link (email one-time secure link)
  3. OAuth: Google (work accounts), Apple (Sign in with Apple — iOS required)
  4. MFA TOTP (Google Authenticator, Authy, 1Password compatible)
  5. Passkeys / WebAuthn (Face ID, Touch ID, Windows Hello, YubiKey)
  6. Biometric re-authentication (within-session sensitive action confirmation)

Session Management:
  - Access token: JWT, 15-minute lifetime
  - Refresh token: 7-day lifetime, rotating (new token on every refresh)
  - Device binding: session tied to device fingerprint
  - Concurrent session limit: configurable per company (default: 5 active sessions)
  - Session list: user can see all active sessions with device + location
  - Session revocation: user can revoke individual sessions
  - Force logout: admin can revoke all sessions for any user
  - Remember Device: 30-day trusted device (skips MFA on same device)
```

#### 2.2 — Authorization (Zero Trust — 7 Gates)
```
Every API request passes through all 7 gates in order.
No gate can be skipped. No exceptions.

Gate 1 — User Authentication
  → Valid JWT present?
  → Token expired? → Attempt refresh or reject with 401
  → User account active? → Check users.status = 'active'

Gate 2 — Session Validation
  → Session active (not revoked)?
  → Device trusted?
  → Session within IP allowlist (if company has IP restriction configured)?

Gate 3 — Account Status
  → User account not suspended or terminated?
  → Company account active (not expired/suspended)?
  → Password reset pending? → Force password reset before proceeding

Gate 4 — Role Verification
  → User has active role assignment?
  → Role not expired (for temporary roles)?
  → Role valid for this company context?

Gate 5 — Permission Check
  → User's role grants this specific permission (e.g., finance:invoice:approve)?
  → Permission not individually revoked?
  → MFA required for this permission? → Verify MFA token

Gate 6 — Scope Validation
  → User's scope includes this company_id?
  → User's scope includes this specific resource (store, project, team)?
  → Cross-company access explicitly granted (CEO only)?

Gate 7 — Execute + Audit
  → Execute the authorized operation
  → Write immutable audit log entry
  → Return result
```

#### 2.3 — Row-Level Security (RLS)
```
Implementation: PostgreSQL RLS policies on every tenant-scoped table

Standard tenant isolation policy:
  CREATE POLICY "company_isolation" ON [table]
    USING (
      company_id = (
        SELECT company_id FROM user_sessions
        WHERE user_id = auth.uid()
        AND is_active = true
        LIMIT 1
      )
    );

CEO multi-company policy:
  CREATE POLICY "ceo_multi_company" ON [table]
    USING (
      company_id IN (
        SELECT company_id FROM user_company_access
        WHERE user_id = auth.uid()
        AND is_active = true
      )
    );

Sysadmin bypass policy:
  CREATE POLICY "sysadmin_full_access" ON [table]
    USING (
      EXISTS (
        SELECT 1 FROM users
        WHERE id = auth.uid()
        AND role = 'SYSADMIN'
        AND is_active = true
      )
    );

RLS requirements:
  - Every RLS policy must have a supporting index (company_id index minimum)
  - Benchmark: RLS evaluation adds < 1ms per query at 1M rows
  - All RLS policies tested with automated test matrix
    (19 roles × representative tables — verifies isolation is correct)
```

#### 2.4 — MFA Implementation
```
TOTP (RFC 6238):
  - Compatible: Google Authenticator, Authy, 1Password, Bitwarden
  - Setup: QR code + manual entry backup
  - Backup codes: 10 single-use recovery codes at setup
  - Backup codes: encrypted at rest (AES-256-GCM), shown only once
  - Enforcement: configurable per company (Optional / Encouraged / Required)
  - MFA required for: financial approvals, document signing,
    role changes, account settings, bulk exports

Passkeys / WebAuthn:
  - Platform: Face ID (iOS), Touch ID (iOS/Mac), Windows Hello, Android biometric
  - Roaming: YubiKey (enterprise tier)
  - Registration: user registers biometric credential on device
  - Primary auth: Face ID can replace password entirely
  - Re-authentication: configurable per sensitive operation
```

#### 2.5 — Trusted Devices
```
Device registration:
  - On first MFA-verified login: user prompted to trust device
  - Device fingerprint: FingerprintJS (browser) or native device ID (mobile)
  - Stored in: device_sessions table (device_id, name, user_id, last_seen)
  - Trusted duration: 30 days (configurable per company)
  - User can name devices: "iPhone 15 Pro – Personal", "MacBook Pro – Work"
  - User can view + revoke trusted devices from profile settings
  - Admin can revoke all trusted devices for any user

Risk-based step-up authentication:
  - New device from known location → MFA required once
  - New device from new country → MFA required + email alert
  - Known device, suspicious activity pattern → step-up re-auth
  - Device not seen for 90+ days → re-trust required
```

#### 2.6 — Audit Logs
```
Audit log table (append-only, tamper-evident):
  id:              UUID PRIMARY KEY
  event_id:        UUID UNIQUE         — unique event identifier
  prev_hash:       TEXT NOT NULL       — SHA-256 of previous log entry
  hash:            TEXT NOT NULL       — SHA-256(prev_hash + this entry data)
  timestamp:       TIMESTAMPTZ NOT NULL DEFAULT NOW()
  user_id:         UUID → users(id)
  impersonated_by: UUID                — if admin acts as user
  company_id:      UUID → companies(id)
  module:          TEXT NOT NULL       — 'projects', 'finance', 'hr', etc.
  action:          TEXT NOT NULL       — 'create', 'update', 'delete', 'view'
  entity_type:     TEXT NOT NULL
  entity_id:       UUID
  before_state:    JSONB               — snapshot before change
  after_state:     JSONB               — snapshot after change
  ip_address:      INET
  user_agent:      TEXT
  request_id:      UUID
  result:          TEXT NOT NULL       — 'success', 'failure', 'blocked'
  failure_reason:  TEXT

Audit log rules:
  - Append-only: no UPDATE or DELETE (enforced by RLS + trigger that blocks them)
  - SHA-256 chaining: tamper detection (if any entry is altered, chain breaks)
  - Logged events: every write operation, every sensitive read (PII/financial/contracts)
  - Auth events: login, logout, MFA, failed attempts, session revocation
  - Retention: minimum 7 years (regulatory requirement)
  - Export: JSON/CSV for compliance audits
  - Access: Sysadmin + HR Director (own company HR events)
```

#### 2.7 — Security Monitoring
```
Automated monitoring alerts:

Event                              | Threshold          | Alert To
-----------------------------------|--------------------|-----------------------
Failed login attempts              | 5 in 5 minutes     | User + Sysadmin (WARN)
Failed login attempts              | 10 in 5 minutes    | Account locked + Sysadmin (CRITICAL)
Login from new country             | Any                | User via email (INFO)
Login from new device              | Any                | User via email (INFO)
Privilege escalation attempt       | Any                | Sysadmin (CRITICAL + immediate)
Bulk data export (>1000 records)   | Any                | Sysadmin (WARN)
Admin action on user account       | Any                | Sysadmin + affected user
RLS policy bypass attempt          | Any                | Sysadmin (CRITICAL — block + alert)
Multiple MFA failures              | 3 in 10 minutes    | User + Sysadmin (WARN)
Session from blocked IP            | Any                | Block request + Sysadmin (CRITICAL)
Audit log integrity failure        | Any                | Sysadmin (CRITICAL — immediate)

Security dashboard (Sysadmin):
  - All active sessions across all companies
  - Failed login heat map (by time and location)
  - Recent audit events (filterable by company, module, action)
  - Open security alerts queue
  - Account lockouts list
  - Security score per company (0–100)
```

### Phase 2 Exit Criteria
```
□ Email/password login: E2E test passing
□ OAuth (Google + Apple): E2E test passing
□ MFA TOTP: setup + verification E2E passing
□ Face ID / Passkeys: tested on physical iOS device
□ Session refresh rotation: verified working
□ RLS: automated test matrix passes (19 roles × all access scenarios)
□ Audit log: every login event captured with SHA-256 chain verified
□ Security monitoring: all alert triggers tested and firing correctly
□ Zero known P0/P1 security vulnerabilities
□ Security code review: completed by at least 2 engineers
```

---

## PHASE 3: MULTI-COMPANY CORE
**Duration**: 5 weeks
**Cumulative Week**: 15

### Goals
Build the organizational architecture that every module depends on — companies, divisions, departments, teams, users, roles, permissions, and scopes.

### Deliverables

#### 3.1 — Company Hierarchy
```
Structure:
  PRV Group (Sysadmin level — spans all companies)
  └── Company (e.g., PRV Renovations, PRV Projects, PRV Shop)
      └── Division (e.g., North Region, South Region)
          └── Department (e.g., Sales, Operations, Finance, HR)
              └── Team (e.g., Project Team Alpha)

company table:
  id, name, slug, logo_url, timezone, currency, locale,
  country_code, address, tax_id, website,
  subscription_tier, subscription_status, subscription_expires_at,
  settings (JSONB), is_active, created_at, updated_at

Rules:
  - CEO: access to all companies in their PRV Group
  - Co-CEO: access to assigned companies only
  - All other roles: one company only (unless explicitly cross-company granted)
  - company_id is immutable once assigned
  - Future companies plug in without schema changes
```

#### 3.2 — Users
```
users table:
  id, email, phone, full_name, display_name, avatar_url,
  timezone, locale, preferred_language,
  is_active, is_mfa_enabled, mfa_secret (encrypted),
  last_login_at, created_at, updated_at

user_company_memberships table:
  user_id, company_id, role_id,
  division_id (nullable), department_id (nullable), team_id (nullable),
  employment_type (full_time / part_time / contractor / intern),
  joined_at, left_at, is_active

One user → multiple companies (different role per company)
```

#### 3.3 — 19 Roles (Type-Safe)
```typescript
export const ROLES = {
  // CORE
  SYSADMIN: 'SYSADMIN',
  CEO: 'CEO',
  CO_CEO: 'CO_CEO',

  // ATTENDANCE
  WORKER: 'WORKER',
  TEAM_LEADER: 'TEAM_LEADER',
  OMS: 'OMS',
  OPS_MANAGER: 'OPS_MANAGER',
  HR_MANAGER: 'HR_MANAGER',

  // PROJECTS
  PROJECT_WORKER: 'PROJECT_WORKER',
  PROJECT_TEAM_LEADER: 'PROJECT_TEAM_LEADER',
  PROJECT_OMS: 'PROJECT_OMS',
  PROJECT_OPM: 'PROJECT_OPM',
  PROJECT_DIRECTOR: 'PROJECT_DIRECTOR',

  // SHOP
  SELLER: 'SELLER',
  STORE_MANAGER: 'STORE_MANAGER',
  SHOP_DIRECTOR: 'SHOP_DIRECTOR',

  // ANALYTICS
  APP_SUPPORT: 'APP_SUPPORT',
  DATA_ANALYST: 'DATA_ANALYST',
  QA_TESTER: 'QA_TESTER',
} as const;

export type Role = (typeof ROLES)[keyof typeof ROLES];
```

#### 3.4 — 8-Level Scope System
```typescript
export const SCOPES = {
  GLOBAL:     'GLOBAL',      // Sysadmin — all companies
  COMPANY:    'COMPANY',     // CEO, Co-CEO — full company
  REGION:     'REGION',      // Regional scoped roles
  DIVISION:   'DIVISION',    // Division-level access
  DEPARTMENT: 'DEPARTMENT',  // Department-level access
  TEAM:       'TEAM',        // Team-level access
  STORE:      'STORE',       // Single store access
  SELF:       'SELF',        // Own records only
} as const;

export type Scope = (typeof SCOPES)[keyof typeof SCOPES];

// Scope validation — used in every API route handler
function validateScope(
  user: AuthUser,
  requiredScope: Scope,
  resourceId: string
): boolean {
  // Validates user's scope level encompasses the required scope
  // and that the specific resource is within their authorized resources
}
```

#### 3.5 — Permission Catalog
```
Permission format: module:resource:action

Examples:
  projects:project:create    projects:project:read
  projects:project:update    projects:project:delete
  projects:budget:approve    projects:task:assign
  attendance:checkin:create  attendance:schedule:manage
  shop:inventory:manage      shop:discount:approve
  finance:invoice:approve    finance:payroll:view
  hr:contract:manage         hr:review:conduct
  document:vault:access      document:sign:request

Permission assignment rules:
  - Roles have default permission sets (from ROLE_ARCHITECTURE.md)
  - Company admins can RESTRICT permissions (never expand beyond role maximum)
  - Custom roles: CEO can create custom roles within their company
  - All permission checks happen at runtime via Gate 5 of 7-gate chain
```

#### 3.6 — Company Settings
```
Configurable per company (stored in companies.settings JSONB):

General:
  - Name, logo, timezone, currency, locale
  - Fiscal year start month (1–12)
  - Default working hours per day (e.g., 8)
  - Working days (Mon–Fri default; configurable)

Security:
  - MFA policy: Optional / Encouraged / Required
  - Session duration (default: 15m access / 7d refresh)
  - Trusted device duration (default: 30 days)
  - IP allowlist (optional; if set, only these IPs allowed)
  - Password policy: min length, complexity, rotation interval

Modules:
  - Which modules enabled (feature flags at company level)
  - Per-module settings (overtime rules, approval thresholds)

Notifications:
  - Default notification preferences for new users
  - Email notification allowed domains

Integrations:
  - Third-party integrations enabled/configured
  - API keys for integrations
```

### Phase 3 Exit Criteria
```
□ Company CRUD: create, read, update, deactivate — with RLS
□ User creation + role assignment: working
□ All 19 roles: defined in database as constants
□ Scope system: enforced in automated test scenarios
□ Permission catalog: all module permissions defined
□ Test: Worker (Company 1) cannot access any Company 2 data
□ Test: CEO (Companies 1+2) can access both companies
□ Test: Store Manager sees only their assigned store
□ Test: Sysadmin has access to all companies
□ Company settings: fully configurable via API
```

---

## PHASE 4: DESIGN SYSTEM
**Duration**: 7 weeks
**Cumulative Week**: 22

### Goals
Build the complete Liquid Glass Design System. Every visual element, component, and interaction used in Phases 6–23 comes from this library. No module-specific UI at this phase.

### Deliverables

#### 4.1 — Typography
```
Font: SF Pro / SF Pro Display (native iOS/macOS)
      system-ui (web fallback), Inter (alternative)

11-Level Type Scale:
  Level | Name       | Size | Weight | Line-height | Use
  ------|------------|------|--------|-------------|--------------------
  1     | Display XL | 48px | 700    | 1.1         | Hero headers
  2     | Display L  | 40px | 700    | 1.1         | Section headers
  3     | Display M  | 34px | 700    | 1.15        | Page titles
  4     | Title L    | 28px | 600    | 1.2         | Module titles
  5     | Title M    | 22px | 600    | 1.25        | Card titles
  6     | Title S    | 18px | 600    | 1.3         | Section headings
  7     | Body L     | 17px | 400    | 1.5         | Primary content
  8     | Body M     | 15px | 400    | 1.5         | Secondary content
  9     | Body S     | 13px | 400    | 1.45        | Supporting text
  10    | Caption    | 11px | 400    | 1.4         | Labels, metadata
  11    | Micro      | 10px | 400    | 1.3         | Timestamps, badges

Text opacity (monochrome — no color):
  Primary:    rgba(255,255,255, 0.95)
  Secondary:  rgba(255,255,255, 0.65)
  Tertiary:   rgba(255,255,255, 0.35)
  Quaternary: rgba(255,255,255, 0.15)
```

#### 4.2 — Colors
```
Background:
  #000000         — pure black base
  #0A0A0A         — elevated surface 1
  #111111         — elevated surface 2 (behind modals)

Glass: see section 4.3 (rgba white layers)

Text: white with opacity (see 4.1 — no separate color palette)

Borders:
  rgba(255,255,255, 0.12)   — standard borders
  rgba(255,255,255, 0.32)   — top specular edge highlight

Semantic (status signals only — never decorative):
  Success:  rgba(52, 199, 89, 0.85)
  Warning:  rgba(255, 159, 10, 0.85)
  Error:    rgba(255, 69, 58, 0.85)
  Info:     rgba(255,255,255, 0.65)

Rule: Zero decorative color. Color communicates system status only.
```

#### 4.3 — Materials (Liquid Glass — 4 Levels)
```
Glass 1 — Base (Cards, Panels, Widgets):
  background:      rgba(255,255,255, 0.06)
  backdrop-filter: blur(32px) saturate(140%)
  border:          1px solid rgba(255,255,255, 0.10)
  box-shadow:      0 4px 16px rgba(0,0,0, 0.40)
  top specular:    inset 0 1px 0 rgba(255,255,255, 0.25)

Glass 2 — Elevated (Menus, Dropdowns, Popovers):
  background:      rgba(255,255,255, 0.10)
  backdrop-filter: blur(48px) saturate(180%)
  border:          1px solid rgba(255,255,255, 0.14)
  box-shadow:      0 8px 32px rgba(0,0,0, 0.50)
  top specular:    inset 0 1px 0 rgba(255,255,255, 0.30)

Glass 3 — Modal (Sheets, Modals, Full Overlays):
  background:      rgba(255,255,255, 0.16)
  backdrop-filter: blur(64px) saturate(200%)
  border:          1px solid rgba(255,255,255, 0.18)
  box-shadow:      0 16px 48px rgba(0,0,0, 0.60)
  top specular:    inset 0 1px 0 rgba(255,255,255, 0.35)

Glass 4 — Critical (Emergency modals, Alerts, Lockdown):
  background:      rgba(255,255,255, 0.22)
  backdrop-filter: blur(80px) saturate(220%)
  border:          1px solid rgba(255,255,255, 0.24)
  box-shadow:      0 24px 64px rgba(0,0,0, 0.70),
                   0 8px 24px rgba(0,0,0, 0.40)
  top specular:    inset 0 1px 0 rgba(255,255,255, 0.40)

Shadow elevation scale:
  E0 (pressed):  0 2px 4px rgba(0,0,0, 0.30)
  E1 (resting):  0 4px 16px rgba(0,0,0, 0.40)
  E2 (raised):   0 8px 32px rgba(0,0,0, 0.50)
  E3 (floating): 0 16px 48px rgba(0,0,0, 0.60)
  E4 (overlay):  0 24px 64px rgba(0,0,0, 0.70) + 0 8px 24px rgba(0,0,0, 0.40)
```

#### 4.4 — Motion
```
Spring curves:
  Bounce:     cubic-bezier(0.34, 1.56, 0.64, 1)  — interactive/playful
  Smooth:     cubic-bezier(0.40, 0.00, 0.20, 1)  — standard transitions
  Decelerate: cubic-bezier(0.00, 0.00, 0.20, 1)  — elements entering view
  Accelerate: cubic-bezier(0.40, 0.00, 1.00, 1)  — elements leaving view
  Sharp:      cubic-bezier(0.40, 0.00, 0.60, 1)  — quick, precise actions

Duration scale:
  Instant:    100ms — button press, toggle flip
  Fast:       200ms — icon change, color shift, badge update
  Standard:   300ms — component transition, tab switch
  Moderate:   400ms — sheet presentation, modal entry
  Deliberate: 500ms — page transitions, major state changes
  Slow:       600ms — orchestrated multi-element animations

Animation patterns:
  Overlay entry: scale(0.96→1.0) + blur(0→glasslevel) + opacity(0→1)
  Sheet entry:   translateY(100%→0) + opacity(0→1)
  Toast entry:   translateY(16px→0) + opacity(0→1)
  Card expand:   scale(1.0→1.02) + shadow increase
  
Rules:
  - Never: instant appear/disappear
  - Never: CSS linear timing on any user-facing animation
  - Always: respect prefers-reduced-motion (fade-only fallbacks)
```

#### 4.5 — Haptics
```
9 Haptic Patterns (iOS UIFeedbackGenerator equivalents):

Pattern           | When to Use
------------------|------------------------------------------------
Selection         | List item tap, picker change, toggle
Light Impact      | Button tap, tab switch, link press
Medium Impact     | Card tap, sheet dismiss, confirm action
Heavy Impact      | Delete confirmation, error, destructive action
Success           | Task complete, save success, payment done
Warning           | Validation error, limit reached, caution
Error             | Failed action, blocked operation, invalid input
Rigid             | Sheet snap position, pull-to-refresh trigger
Soft              | Long-press initiate, peek preview open

Rules:
  - Every tap has at minimum Light Impact
  - Destructive actions always use Heavy Impact
  - Success states always use Success haptic
  - Error states always use Error haptic
  - Max frequency: 1 haptic per 100ms
```

#### 4.6 — Corner Radius System
```
4px   — micro    (chips, small badges, input borders)
8px   — small    (small buttons, tags)
12px  — medium   (standard buttons, list item highlights)
16px  — standard (cards, form fields, panels)
20px  — cards    (elevated card content areas)
24px  — panels   (major section panels)
32px  — sheets   (bottom sheets, modals)
44px  — floating (tab bar, FAB, large pills)
100px — pill     (capsule pills, status badges, tags)
```

#### 4.7 — Spacing (8pt Grid)
```
4px  — spacing-1  (tightest — icon-label gap, inline elements)
8px  — spacing-2  (tight — badge padding, list row inner gap)
12px — spacing-3  (compact — button padding vertical)
16px — spacing-4  (standard — card padding, section gap)
20px — spacing-5  (comfortable — modal content padding)
24px — spacing-6  (relaxed — section header margin)
32px — spacing-8  (spacious — major section separation)
40px — spacing-10 (generous — page margins)
48px — spacing-12 (large — hero section padding)
64px — spacing-16 (xl — major layout zone separation)
```

#### 4.8 — Components (50+ Required)
```
Navigation Components:
  GlassTabBar           — floating bottom navigation (role-configured)
  GlassNavigationBar    — floating top bar (title + actions)
  GlassBackButton       — glass pill back navigation
  GlassFloatingHeader   — scroll-reactive collapsible header

Container Components:
  GlassCard             — Glass 1 (standard content cards)
  GlassPanel            — Glass 1 (section containers)
  GlassModal            — Glass 3 (full overlay dialogs)
  GlassSheet            — Glass 3 (bottom sheet — primary workflow entry)
  GlassOverlay          — Glass 3 backdrop (behind modals)
  GlassDrawer           — Glass 2 (side panel — settings, filters)
  GlassBanner           — Glass 2 (top alert banner)
  GlassPopover          — Glass 2 (anchored tooltip/menu)

Interactive Components:
  GlassButton           — variants: primary / secondary / ghost / destructive
  GlassIconButton       — icon-only circular glass button
  GlassFAB              — floating action button
  GlassToggle           — boolean on/off with spring animation
  GlassCheckbox         — checkbox with check animation
  GlassRadio            — radio button group
  GlassSegmentedControl — multi-option selector (tabs within sheet)
  GlassSlider           — range input

Form Components:
  GlassInput            — text input field
  GlassTextarea         — multi-line text input
  GlassSelect           — dropdown selector
  GlassDatePicker       — native iOS-style date picker
  GlassTimePicker       — time selection
  GlassSearchInput      — search field with clear + voice

Display Components:
  GlassAvatar           — user photo with status ring
  GlassBadge            — count/status badge (pill)
  GlassChip             — selectable chip / filter tag
  GlassTag              — informational label
  GlassProgressBar      — horizontal progress indicator
  GlassProgressRing     — circular progress (for scores, %)
  GlassDivider          — section separator (subtle line)
  GlassSkeleton         — loading placeholder animation

Feedback Components:
  GlassToast            — notification toast (floats from bottom, auto-dismiss)
  GlassAlert            — inline contextual alert
  GlassEmptyState       — empty list / zero results state
  GlassLoadingSpinner   — activity indicator

Data Display Components:
  GlassTable            — data table (sortable, filterable columns)
  GlassList             — list container
  GlassListItem         — list row with leading/trailing
  GlassGrid             — masonry/grid container
  GlassGridItem         — grid card
  GlassStatCard         — KPI card (value + label + trend arrow)
  GlassSparkline        — inline mini chart (last 7/30 days)

Specialized Components:
  GlassContextMenu      — long-press context menu (Glass 2, positioned)
  GlassActionSheet      — iOS-style bottom action list
  GlassCommandPalette   — ⌘K search + actions overlay
  GlassSearchOverlay    — full-screen search with results
  GlassDynamicIsland    — Dynamic Island live context component
  GlassWidget           — dashboard widget container
  GlassLiveActivity     — Lock Screen Live Activity component
```

#### 4.9 — Dynamic Island
```
All 19 roles have dedicated Dynamic Island states:

Compact (collapsed — minimal info):
  CEO:             "↑ $47K today"
  Worker:          "⏱ 3h 24m"
  Team Leader:     "8/10 on-site"
  Store Manager:   "↑ $4,280 today"
  Project OPM:     "3 critical"
  HR Manager:      "2 pending"
  Finance:         "3 overdue"
  Project Worker:  "Task: active"
  (all 19 defined — see NAVIGATION_ARCHITECTURE.md)

Expanded (tapped — more detail):
  CEO:             Revenue today + top alert
  Worker:          Current task + clock status
  Team Leader:     Team attendance + next task
  Store Manager:   Revenue + low stock count
  Project OPM:     Budget burn + milestone due
  HR Manager:      Leave requests + headcount
  Finance:         Cash position + receivables

States:
  Default:    Show role-relevant metric
  Active:     Live operation (clock-in timer, active call, voice note)
  Alert:      Urgent item requiring immediate attention
  Recording:  Voice note being recorded
```

#### 4.10 — Widgets
```
Widget types (6 categories):
  1. KPI        — single metric with trend indicator and sparkline
  2. Status     — real-time state (attendance live, active orders)
  3. Action     — quick action from dashboard (clock in, create task)
  4. List       — top N items (tasks due, recent orders, alerts)
  5. Chart      — mini visualization (bar, donut, area, sparkline)
  6. AI         — AI insight or recommendation card

Widget sizes:
  Small:  2×2 — single stat, status indicator
  Medium: 4×2 — chart + context, list (3–5 items)
  Large:  4×4 — detailed chart, full list, complex status
  XL:     4×6 — dashboard feature widget (CEO cockpit, calendar)
```

### Phase 4 Exit Criteria
```
□ Storybook: all 50+ components documented with all visual states
□ Glass materials: all 4 levels rendering correctly in browser + on device
□ Typography: all 11 levels rendering with correct weights and opacity
□ Motion: all 5 curves implemented, spring animations working
□ Haptics: all 9 patterns working on physical iOS device
□ Dynamic Island: all 19 role states rendering (with demo data)
□ Widgets: all 6 categories rendering in all 3 sizes
□ Accessibility: all components pass axe-core (WCAG 2.1 AA)
□ Responsive: all components function from 375px (iPhone SE) to 1920px
□ No module-specific content in any component
```

---

## PHASE 5: NAVIGATION SYSTEM
**Duration**: 4 weeks
**Cumulative Week**: 26

### Goals
Build the dynamic navigation architecture. Role-aware navigation that every module plugs into.

### Deliverables

#### 5.1 — Dynamic Navigation
```typescript
// Navigation is data — not hardcoded in components
// Loaded after authentication based on user role

interface NavigationManifest {
  role: Role;
  tabs: NavigationTab[];
  quickActions: QuickAction[];
  commandPaletteItems: CommandItem[];
  dynamicIslandConfig: DynamicIslandConfig;
}

interface NavigationTab {
  id: string;
  label: string;
  icon: IconName;
  activeIcon?: IconName;
  module: ModuleId;
  defaultScreen: ScreenId;
  badge?: { type: 'count' | 'dot'; source: string }; // dynamic badge
}

// Every role gets its own manifest — no shared manifest
// Manifest loaded on auth, cached in session
// Example: CEO manifest
const CEO_NAV: NavigationManifest = {
  role: ROLES.CEO,
  tabs: [
    { id: 'command',      label: 'Command',      icon: 'command',    module: 'command-center',  defaultScreen: 'cockpit' },
    { id: 'operations',   label: 'Operations',   icon: 'grid',       module: 'operations',      defaultScreen: 'overview' },
    { id: 'people',       label: 'People',       icon: 'people',     module: 'workforce',       defaultScreen: 'overview' },
    { id: 'finance',      label: 'Finance',      icon: 'chart-line', module: 'finance',         defaultScreen: 'overview' },
    { id: 'intelligence', label: 'Intelligence', icon: 'brain',      module: 'analytics',       defaultScreen: 'overview' },
  ],
};

// All 19 role navigation manifests defined in NAVIGATION_ARCHITECTURE.md
```

#### 5.2 — Floating Tab Bar
```
Specifications:
  Position:     16px above device safe area (bottom)
  Material:     Glass 2 (blur 48px, rgba(255,255,255, 0.10))
  Shape:        Pill — corner radius 44px
  Width:        Content-hugging (not full width)
  Alignment:    Centered horizontally

Tab states:
  Active:   White icon (95%) + white label (95%)
  Inactive: White icon (35%), no label shown
  Badge:    White pill counter (top-right of icon)

Behavior:
  - Haptic: Light Impact on every tab switch
  - Animation: spring Bounce curve (300ms) on active indicator
  - Scroll behavior: always visible (does not hide on scroll)
  - Safe area: respects iPhone home indicator inset

19 role tab bars:
  CEO / Co-CEO:    Command / Operations / People / Finance / Intelligence
  Sysadmin:        System / Companies / Security / Logs / Settings
  Worker:          Today / Tasks / Attendance / Inbox / Profile
  Team Leader:     Team / Tasks / Attendance / Reports / Inbox
  OMS:             Schedule / Attendance / Workforce / Reports / Inbox
  Ops Manager:     Overview / People / Projects / Reports / Inbox
  HR Manager:      People / Recruitment / Payroll / Compliance / Inbox
  Project Worker:  Today / Tasks / Projects / Inbox / Profile
  Project TL:      Team / Tasks / Projects / Reports / Inbox
  Project OMS:     Schedule / Projects / Resources / Reports / Inbox
  Project OPM:     Portfolio / Projects / Resources / Finance / Reports
  Project Director:Portfolio / Teams / Finance / Analytics / Settings
  Seller:          Sales / Customers / Products / Orders / Inbox
  Store Manager:   Dashboard / Inventory / Orders / Staff / Reports
  Shop Director:   Overview / Stores / Inventory / Analytics / Finance
  App Support:     Tickets / Users / System / Logs / Inbox
  Data Analyst:    Analytics / Reports / Data / Dashboards / Inbox
  QA Tester:       Test Plans / Bugs / Releases / Reports / Inbox
```

#### 5.3 — Universal Search
```
Trigger:
  - Tap floating search bar (pinned to top of screen)
  - ⌘K (keyboard shortcut — web and iPad)
  - Swipe-down gesture from top of any screen (mobile)

Search overlay (Glass 3 full-screen):
  - Instant results as user types (Typesense — target <50ms)
  - Role-filtered: user only sees entities they can access
  - AI-powered semantic search (find by meaning, not only keywords)
  - Result categories: People / Projects / Tasks / Documents /
    Orders / Customers / Products / Reports / etc.
  - Recent searches (last 10)
  - Suggested actions: "Create new project", "Add employee"
  - Voice search (iOS native)
  - Keyboard navigation: ↑↓ to navigate, Enter to select, Esc to close

Result item anatomy:
  [module icon] Title
               Subtitle (secondary info)
               [module tag]
  Actions: tap → navigate, long-press → quick actions sheet
```

#### 5.4 — Command Palette
```
Trigger: ⌘K (keyboard) / gesture (mobile)
Material: Glass 3 full-screen overlay

Contents (role-aware):
  - All navigation destinations
  - All create actions ("New Project", "New Invoice", "Add Employee")
  - Module shortcuts ("Open Finance", "Open HR Dashboard")
  - Recent items visited
  - System actions ("Switch Company", "My Settings", "Lock Session")

Behavior:
  - Fuzzy search across all items
  - Most recent and most frequently used items appear first
  - Keyboard: ↑↓ navigate, Enter execute, Esc close
  - Mobile: scrollable list, tap to execute
  - Empty state: show top suggested actions
```

#### 5.5 — Universal Inbox
```
Centralized hub for all notifications, approvals, mentions, and alerts.

Tabs:
  All       — unified feed of everything
  Mentions  — @user mentions from Communication Center
  Approvals — pending approval requests (role-filtered)
  Alerts    — system alerts requiring attention
  Updates   — non-urgent module updates

Features:
  - Unread count badge per tab
  - Mark as read: single item, bulk, all
  - Inline actions: approve/reject without leaving inbox
  - Deep link: tap → navigate to source entity
  - Priority sort: critical items surfaced first
  - Filter by module
  - Filter by date range
  - Search within inbox
```

#### 5.6 — Universal Calendar
```
Aggregates events from all modules in one view:
  - Project milestones and deadlines
  - Shift schedules and attendance leave
  - HR: review dates, contract renewals, probation ends
  - Finance: invoice due dates, payment schedules
  - Procurement: expected delivery dates
  - Compliance: certification expiry dates
  - Safety: scheduled inspections

Views:
  Month / Week / Day / Agenda (list view)

Features:
  - Toggle module calendars on/off
  - Monochrome styling — white at varying opacity per category
  - Tap event: peek preview sheet (no navigation)
  - Long-press: context menu (edit, duplicate, share, delete)
  - Add event: creates directly in relevant module
```

#### 5.7 — Favorites & Recents
```
Favorites:
  - Any entity can be favorited: project, employee, product, report, etc.
  - Persisted to database (sync across devices)
  - Role-filtered (can only favorite accessible items)
  - Accessible from search and Quick Actions

Recents:
  - Last 20 viewed entities (per module)
  - Stored locally (privacy — not synced to server)
  - Appear in search results (in Recents section)
  - Clear recents option in settings
```

### Phase 5 Exit Criteria
```
□ All 19 role tab bars: rendering with correct tabs and icons
□ Tab switch: spring animation + haptic working on device
□ Universal Search: returns results <100ms from Typesense
□ Search: role-filtered (Worker cannot find CEO-level data)
□ Command Palette: opens with ⌘K, actions execute correctly
□ Universal Inbox: shows real notifications from test events
□ Universal Calendar: aggregates events from multiple test modules
□ Favorites: persist across browser sessions and devices
□ Max 3 navigation levels: verified no screen exceeds this
```

---

## PHASE 6: PROJECTS MODULE
**Duration**: 9 weeks
**Cumulative Week**: 35

### Goals
Build the complete PRV Projects module — full project lifecycle with tasks, resources, budgets, documents, photos, and analytics.

### Deliverables

#### 6.1 — Projects
```
Project lifecycle:
  Draft → Planning → Active → On Hold → Completed → Cancelled

Key fields:
  id, company_id, name, code, description, type, status,
  client_id, project_director_id, project_manager_id,
  start_date, end_date, actual_start_date, actual_end_date,
  total_budget, spent_budget, approved_budget,
  health_score (0–100, calculated),
  priority (critical / high / medium / low),
  tags, metadata, created_at, updated_at

Project types: Renovation / Installation / Maintenance / Consultation / Other

Views:
  - Overview: phases, milestones, health score, key stats
  - Gantt chart: interactive timeline with dependency arrows
  - Kanban board: drag-and-drop task cards by status
  - List view: dense table with sort and filter
  - Timeline view: team allocation over time

Features:
  - Project creation wizard (guided, step-by-step)
  - Phase management (phases with milestones per phase)
  - Risk register per project
  - Project activity log (all changes, comments, actions)
  - Project templates (create from blueprint)
  - Archive completed projects
```

#### 6.2 — Tasks
```
Task lifecycle:
  Backlog → To Do → In Progress → Review → Done → Cancelled

Key fields:
  id, project_id, company_id, title, description,
  assignee_id, assigned_by_id,
  status, priority,
  due_date, started_at, completed_at,
  estimated_hours, actual_hours,
  parent_task_id (subtasks — 1 level only),
  depends_on_task_id (blocks),
  tags, order_index, created_at, updated_at

Features:
  - Subtasks (one level deep)
  - Task dependencies (A must complete before B)
  - Time tracking (start/stop timer, manual entry)
  - Comments with @mentions (links to Communication Center)
  - File attachments (links to Document Center)
  - Activity log per task
  - Recurring tasks (daily / weekly / monthly / custom)
  - Task templates
  - Bulk actions: assign, change priority, mark complete
```

#### 6.3 — Resources
```
Resource management:
  - Assign employees to projects with allocation % (e.g., 50% on A, 50% on B)
  - Availability calendar per employee
  - Workload view: color-coded over/under-allocation
  - Conflict detection: employee already 100% allocated → auto-flag
  - Equipment assignment (placeholder for Phase 22 Tools & Fleet)
  - External resource tracking (contractors, freelancers)
  - Resource utilization report (% time by project)
```

#### 6.4 — Budgets
```
Budget structure:
  - Total project budget
  - Budget by category: labor / materials / equipment / overhead / contingency
  - Budget by phase or milestone
  - Budget revisions with reason (all versions kept)
  - Approval workflow for increases (integrated with Approval system)

Budget tracking:
  - Committed costs (approved POs and contracts)
  - Actual costs (paid invoices and expenses)
  - Budget vs. actual (real-time, by category)
  - Earned Value Analysis:
    → Budget at Completion (BAC)
    → Estimate to Complete (ETC)
    → Estimate at Completion (EAC)
    → Cost Performance Index (CPI)
    → Schedule Performance Index (SPI)
  - Burn rate (average weekly/monthly spend)
  - Budget health indicator (Green < 90% / Amber 90–100% / Red > 100%)
```

#### 6.5 — Documents & Photos
```
Documents (integration with Phase 12 Document Center):
  - Attach any Document Center file to a project
  - Upload direct from project (auto-routes to Document Center)
  - Required documents checklist per project type
  - Document approval flow within project context

Photos:
  - Before/after photo sets (tagged to project phase)
  - Photo albums per project phase
  - Caption + date stamp + phase label
  - Client-shareable albums (via Phase 23 Client Portal)
  - Photo progress documentation (timestamped milestones)
  - AI auto-tagging Phase 17 will enhance
```

#### 6.6 — Analytics
```
Project analytics (role-filtered):
  - Active projects: count + total portfolio value
  - On-time delivery rate: % projects completed by deadline
  - Budget accuracy: % completed within approved budget
  - Average project duration by type
  - Health distribution: % Green / Amber / Red
  - Revenue by project / type / period
  - Gross margin per project
  - Task velocity: tasks completed per week per team
  - Resource utilization: % of capacity used
  - Top performing project managers (by delivery + budget metrics)

Access levels:
  CEO: all companies, all projects
  Project Director: all projects within their scope
  Project OPM: assigned projects
  Project Manager: own projects only
  Worker: own task analytics only
```

### Phase 6 Exit Criteria
```
□ Full project lifecycle: Draft → Completed, all transitions
□ Tasks: CRUD, subtasks, dependencies, time tracking
□ Gantt chart: renders, drag-and-drop to adjust dates
□ Budget: real-time tracking as expenses added
□ Photos: upload on mobile + web, organized in albums
□ Analytics: all KPIs calculating with test data
□ Role access: Worker → own tasks only; CEO → all projects
□ Notifications: task assigned → assignee receives notification
□ CEO 60-Second Rule: project KPIs on dashboard within 60 seconds
```

---

## PHASE 7: ATTENDANCE & WORKFORCE
**Duration**: 7 weeks
**Cumulative Week**: 42

### Goals
Build the complete attendance and workforce management system. The most daily-use module — every worker interacts with it every day.

### Deliverables

#### 7.1 — Attendance
```
Clock-in methods:
  1. App tap (button with GPS location capture — required)
  2. QR code scan (site-placed code)
  3. Biometric (Face ID on device)
  4. Manual by TL/OMS (with reason + audit log)
  5. Bulk import (historical data migration)

Attendance record:
  id, user_id, company_id, date,
  clock_in_time, clock_out_time,
  break_start, break_end, break_duration_minutes,
  location_lat, location_lng, location_accuracy,
  clock_in_method (app / qr / biometric / manual),
  status (present / absent / late / partial / on_leave / holiday),
  hours_worked, overtime_minutes,
  notes, approved_by, created_at, updated_at

Auto-detection:
  - Late arrival: flagged if clock-in > X minutes past shift start
  - Early departure: flagged if clock-out before shift end
  - Overtime: calculated automatically from shift schedule
  - Location anomaly: GPS outside expected site → flagged for TL review
  - Missing clock-out: alert at shift end if not clocked out
```

#### 7.2 — Shifts
```
Shift scheduling:
  - Shift record: date, start time, end time, location, required headcount
  - Assign employees to shifts (single or bulk)
  - Recurring shifts: daily / weekly / biweekly / monthly
  - Shift templates: save patterns for quick assignment
  - Shift swap: employee requests swap → TL approves → both shifts updated
  - Week copy: duplicate entire previous week's schedule
  - Drag-and-drop schedule builder (calendar grid)
  - Conflict detection: employee double-scheduled → auto-flag

Schedule views:
  Week view (calendar grid by employee)
  Month view (summary)
  Employee view (all shifts for one person)
  Location view (all employees at one site on one day)
```

#### 7.3 — Leave
```
Leave types:
  Annual / Sick / Medical / Parental / Bereavement /
  Study / Unpaid / Compassionate / Custom (company-defined)

Leave request flow:
  Employee submits (dates, type, notes)
    → TL reviews → approve / reject / escalate
    → HR final sign-off (for extended or sensitive types)
    → Calendar updated, shift removed, team notified
    → Payroll: balance deducted

Leave balance tracking:
  - Accrual rules: configurable (monthly accrual, hire-date based)
  - Balance per employee per leave type
  - Carry-over rules: configurable per company
  - Leave calendar: team view (who is absent on what dates)
  - Public holiday calendar (per country / region)

Analytics:
  - Leave utilization rate by department
  - Absenteeism patterns (day of week, month)
  - Leave balance distribution (who has high/low balance)
  - Cost of leave per department
```

#### 7.4 — Workforce
```
Org chart:
  - Visual hierarchy: Company → Division → Department → Team
  - Employee cards: photo, role, contact, current status
  - Drill-down navigation by clicking nodes
  - Search within org chart
  - Export to PDF or image

Employee directory:
  - List with filters: role, department, status, location, employment type
  - Employee profile: photo, contact, role, skills, certifications
  - Quick actions: message (Communication), assign task (Projects)
  - Headcount summary per organizational unit

Headcount analytics:
  - Total headcount by company / division / department
  - Headcount trend chart (hiring vs. attrition over time)
  - Turnover rate (annualized)
  - Department size distribution
  - Employment type breakdown (full-time / part-time / contractor)
```

#### 7.5 — Performance
```
Performance tracking:
  Daily:      Task completion rate (from Projects module data)
  Weekly:     TL observation note (qualitative, short form)
  Monthly:    Structured performance summary form
  Quarterly:  Formal review cycle (links to HR Phase 8)

Performance metrics per employee:
  - Attendance rate (% of scheduled days present)
  - Punctuality rate (% of days on time)
  - Task completion rate (% assigned tasks done by deadline)
  - Overtime hours (monthly total)
  - Leave days used (monthly)
  - Manager rating (1–5, per review period)

Performance dashboard (TL / OMS):
  - Team performance heatmap (employee × metric)
  - Top performers / underperformers
  - Attendance trend (weekly)
  - Anomaly alerts (sudden drop in any metric)
```

#### 7.6 — Equipment Assignment
```
Lightweight equipment tracking (placeholder — full build in Phase 22):
  - Employee ↔ equipment assignments recorded
  - Fields: employee_id, equipment_type, serial_number,
    assigned_date, expected_return_date, returned_date, condition
  - Simple audit trail (who assigned, when)

Phase 22 (Tools & Fleet) will build:
  Full asset registry, checkout system, maintenance scheduling, tracking
```

### Phase 7 Exit Criteria — MVP GATE
```
All of the following must be met for MVP release:

□ Clock-in/out: working on iOS device with GPS capture
□ Shifts: create, assign, recurring shifts working
□ Leave: full request → approve → calendar update flow
□ Org chart: renders with real organizational data
□ Workforce directory: search + filter working
□ Performance: TL can view team metrics dashboard
□ Notifications: attendance anomaly alerts firing correctly
□ CEO Dashboard: company-wide attendance KPIs visible
□ RLS verified:
    Worker: own records only
    TL: own team records
    OMS: own department
    OPS Manager: own company
    CEO: all companies
□ E2E test coverage: ≥70% of all critical user paths
□ API performance: P95 response time < 500ms
□ Mobile: 60fps scrolling on iPhone 12
□ Zero P0 or P1 open security vulnerabilities
□ CEO 60-Second Rule: CEO achieves company overview in < 60 seconds

MVP = Phases 0–7 complete.
PRV Projects + Attendance + Workforce: operational and stable.
Ready for pilot companies.
```

---

## PHASE 8: HR MODULE
**Duration**: 6 weeks
**Cumulative Week**: 48

### Goals
Build the HR system — full employment lifecycle from contract to offboarding.

### Deliverables

#### 8.1 — Contracts
```
Contract management:
  - Employment contract creation (templates per employment type)
  - Contract types: Permanent / Fixed-term / Contractor / Intern
  - Key fields: start date, end date (if fixed), salary, role, benefits, terms
  - Contract versioning: every amendment creates new version (history kept)
  - Digital signing: integrated with Document Center Phase 12
  - Expiry alerts: 60 / 30 / 14 / 7 days before expiry
  - Renewal workflow: alert → review → new contract issued
  - Termination record: reason, notice period, final working day, offboarding checklist
  - Historical archive: all contracts per employee
```

#### 8.2 — Payroll
```
Payroll structure:
  - Base salary (from contract)
  - Overtime (calculated from Phase 7 Attendance data)
  - Bonuses (performance, project, seasonal)
  - Allowances (travel, meals, equipment)
  - Deductions (tax, social contributions, benefits)

Payroll processing:
  - Calculate per pay period (monthly / biweekly / weekly)
  - Payslip generation (PDF, auto-delivered to employee's inbox)
  - Payroll approval workflow (HR Manager → Finance Director)
  - Multi-currency (per company configuration)
  - Tax calculation hooks (configurable tax brackets per country)
  - Payroll history per employee (full history)
  - Export for accounting software (CSV format)

Payroll analytics:
  - Total payroll cost by month / department
  - Average salary by role / department
  - Overtime cost trend
  - Payroll as % of revenue
```

#### 8.3 — Recruitment
```
Pipeline stages:
  Sourcing → Screening → Phone Screen → Interview → Assessment → Offer → Hired / Rejected

Features:
  - Job requisition management (internal workflow to open a role)
  - Candidate profiles: CV upload, notes, interview scores
  - Interview scheduling (links to Phase 5 Universal Calendar)
  - Interview feedback forms (structured, per round)
  - Offer letter generation (template-based, customizable)
  - Background check record
  - Onboarding checklist: auto-generated on hire with standard tasks
  - Rejection templates (professional response emails via Resend)

Recruitment analytics:
  - Time-to-hire (requisition open → offer accepted)
  - Source-of-hire breakdown
  - Offer acceptance rate
  - Interview-to-offer conversion rate
  - Cost-per-hire
```

#### 8.4 — Reviews
```
Performance review system:
  - Review cycles: Annual / Semi-annual / Quarterly (configurable per company)
  - Review form builder: configurable questions by category
    (Technical Skills / Soft Skills / Goals / Values / Development)
  - 360-degree feedback: self-assessment, manager, up to 5 peers
  - Review scheduling: bulk create review cycles for all eligible employees
  - Review workflow: employee self-review → manager evaluation → HR finalize
  - Employee sign-off: employee must acknowledge review
  - Goals: SMART goals set at review, tracked in next period
  - Historical reviews: complete history per employee
  - Calibration: HR can view distribution across company (rating calibration)
```

#### 8.5 — Compliance
```
Compliance tracking:
  - Document checklist per role (ID, right to work, role-specific certifications)
  - Document expiry tracking: passport, visa, driving license, professional certs
  - Renewal workflow: alert → HR requests update → employee uploads → HR verifies
  - Working time compliance: legal max hours check (from Attendance data)
  - GDPR: employee data retention policy, access request handling
  - Disciplinary records: warnings, PIPs, with required documentation
  - Equal opportunity: reporting structure
  - Health and safety: medical check records (links to Phase 18 Safety)

Compliance dashboard (HR Manager):
  - % compliant by document type
  - Expiring within 30 days (alert queue)
  - Non-compliant employees list
  - Audit export: full compliance status per employee (PDF / CSV)
```

### Phase 8 Exit Criteria
```
□ Employment contract: create from template, sign digitally, store in Document Center
□ Payroll: calculates with overtime from Attendance data, payslip PDF delivered
□ Recruitment: full pipeline end-to-end
□ Performance review: full cycle (self → manager → HR → sign-off)
□ Compliance: tracking with automated expiry alerts
□ Role access: HR Manager sees all; Worker sees only own records
```

---

## PHASE 9: SHOP MODULE
**Duration**: 9 weeks
**Cumulative Week**: 57

### Goals
Build the full commerce platform — multi-store products, inventory, orders, suppliers, promotions, and reviews.

### Deliverables

#### 9.1 — Products
```
Product catalog:
  - Product fields: name, SKU, barcode, category, brand, description
  - Variants: size / color / material / any custom dimension
  - Pricing: base price, sale price, cost price, margin (calculated)
  - Multi-currency pricing
  - Status: Active / Draft / Discontinued
  - Product images (multiple, sortable, primary image)
  - SEO fields: slug, meta title, meta description (for Public App Phase 23)
  - Tags and categories (hierarchical)
  - Related products / cross-sells / upsells
```

#### 9.2 — Inventory
```
Inventory management:
  - Stock levels per location (store / warehouse)
  - Stock movements: Receive / Transfer / Adjust / Write-off / Return
  - Movement log: every change recorded with reason + user
  - Low stock alerts: configurable threshold per product per location
  - Reorder point: auto-trigger purchase request to Procurement (Phase 21)
  - Inventory valuation: FIFO / AVCO / Specific Identification (configurable)
  - Stock take / cycle count: mobile-first scanning flow
  - Barcode + QR code scanning
  - Batch / lot tracking (expiry-managed products)
  - Multi-location transfer workflow
```

#### 9.3 — Orders
```
Order lifecycle:
  Draft → Confirmed → Processing → Shipped → Delivered → Completed
  (Cancel and Return paths at any applicable stage)

Features:
  - Multi-store order routing
  - POS (Point of Sale): scan + sell flow for in-store
  - Order creation: manual, from quote (CRM), from online (Public App)
  - Order splitting (fulfill from multiple locations)
  - Return / refund flow (creates credit or refund record)
  - Order tracking (internal status)
  - Packing list and delivery note PDF
  - Order notifications: customer (via Phase 14) + staff

Order analytics:
  - Orders per day / week / month
  - Average Order Value (AOV)
  - Top-selling products
  - Return rate by product / category
  - Order fulfillment time
```

#### 9.4 — Suppliers
```
Basic supplier management (full procurement platform in Phase 21):
  - Supplier profile: company name, contacts, payment terms, categories
  - Product-supplier links (which supplier for which products)
  - Supplier order history (POs received)
  - Preferred supplier flag per product category

Phase 21 (Procurement) completes:
  Full PO lifecycle, 3-way matching, supplier scorecards, analytics
```

#### 9.5 — Promotions
```
Promotion engine:
  - Types: % off / fixed amount / buy X get Y / free shipping / bundle deal
  - Scope: all products / specific categories / specific SKUs
  - Conditions: min order value / min quantity / coupon code / specific customer segment
  - Date range: precise start + end date/time
  - Usage limits: total uses / per-customer limit
  - Stackability: can this combine with other active promotions?
  - Coupon codes: generate single or bulk codes
  - Auto-apply: promotion applies automatically without code

Promotions analytics:
  - Revenue impact (orders with promotion vs. without)
  - Usage rate (# uses vs. limit)
  - Discount cost (total discount given)
  - Conversion lift (% increase in orders during promotion)
```

#### 9.6 — Reviews
```
Product review system:
  - Customer reviews from Public App and Client Portal (Phase 23)
  - Rating: 1–5 stars
  - Text review + photo attachments
  - Moderation: approve / reject / flag
  - Verified purchase badge (auto-applied when linked to an order)
  - Store reply (public response from store)
  - Review analytics: average rating, sentiment trend, review velocity

At this phase: review management interface (moderation + response)
Phase 23 (Public App) builds the customer-facing review submission
```

### Phase 9 Exit Criteria
```
□ Product catalog: CRUD with variants, images, pricing
□ Inventory: stock movements tracked, low stock alerts firing
□ Reorder trigger: low stock → purchase request auto-created
□ Order: full lifecycle from creation to completion
□ POS: scan product, add to cart, complete sale
□ Promotions: discount engine applying correctly
□ Multi-store: Seller sees own store; Shop Director sees all stores
□ Reviews: moderation workflow working
```

---

## PHASE 10: CRM MODULE
**Duration**: 6 weeks
**Cumulative Week**: 63

### Goals
Build the customer relationship management platform — lead to loyal customer.

### Deliverables

#### 10.1 — Leads
```
Lead lifecycle stages:
  New → Contacted → Qualified → Proposal Sent → Negotiation → Won / Lost

Lead schema:
  id, company_id, name, email, phone, company_name, source,
  status, assigned_to_id,
  estimated_value, close_probability,
  expected_close_date, actual_close_date,
  lost_reason (if Lost),
  tags, notes, created_at, updated_at

Lead sources: Website / Referral / Social / Cold Outreach / Event / Phone / Walk-in / Ad

Pipeline views:
  - Kanban: drag leads between stages (value-weighted column headers)
  - List: sortable and filterable table
  - Forecast: probability-weighted pipeline value by stage

Lead management:
  - Assignment to sales rep or team
  - Stale lead alerts (no activity for X days)
  - Lead rotation rules (round-robin or manual)
  - Merge duplicate leads
  - Convert lead → customer (with all history carried over)
```

#### 10.2 — Customers
```
Customer profiles:
  - Contact info: name, company, email, phone, address
  - Type: Individual / Business
  - Account manager assigned
  - Tags and segments (for targeted communication)
  - Customer health score (engagement + recency + value — calculated)
  
  Full cross-module history on profile:
  - Communication history (messages, calls, emails)
  - Quote history (linked to CRM quotes)
  - Project history (linked to Projects module)
  - Order history (linked to Shop module)
  - Invoice history (linked to Finance module)
  - Notes and files
```

#### 10.3 — Quotes
```
Quote management:
  - Create from lead, customer, or standalone
  - Line items: products (from Shop catalog), services, hours
  - Discount: per line item or overall %
  - Tax: configurable rates
  - Terms: payment terms, validity period, notes
  - Versioning: every revision saves a new version
  - PDF: generate branded quote PDF
  - Email delivery: send to customer (Resend)
  - Status tracking: Draft → Sent → Viewed → Accepted / Rejected / Expired
  - Convert quote → invoice (Finance module, 1-click)
  - Convert quote → project (Projects module, 1-click)
```

#### 10.4 — Activities
```
Activity types: Call / Email / Meeting / Demo / Proposal / Follow-up / Note / Task

Activity features:
  - Schedule activities (with Calendar sync)
  - Log activity outcomes (what was discussed, next steps)
  - Overdue activity alerts
  - Activity timeline per lead/customer (chronological, full history)
  - Activity templates (standard outreach sequences)
  - Auto-log: email sent via Resend → logged as activity
```

#### 10.5 — Customer Analytics
```
CRM analytics:
  - Pipeline value (total + by stage + probability-weighted)
  - Win rate (% of leads → Won)
  - Average deal size
  - Average sales cycle length (days from New to Won/Lost)
  - Revenue by source
  - Conversion funnel (leads entering vs. exiting each stage)
  - Lead velocity: new leads per week/month trend
  - Top performing sales reps
  - Customer Lifetime Value (CLV) by segment
  - Churn tracking: customers with no activity in X days
```

### Phase 10 Exit Criteria
```
□ Lead pipeline: kanban + list view, drag-and-drop between stages
□ Lead → Customer conversion: working with history preserved
□ Quote: create, send, track acceptance, convert to invoice
□ Customer profile: cross-module history visible
□ Activity timeline: full chronological log
□ Analytics: pipeline KPIs calculating correctly
□ Role access: Seller sees own leads; Sales Director sees all
```

---

## PHASE 11: FINANCE MODULE
**Duration**: 7 weeks
**Cumulative Week**: 70

### Goals
Build the complete financial platform — revenue, expenses, cash flow, budgets, forecasting, invoices.

### Deliverables

#### 11.1 — Revenue
```
Revenue tracking:
  - Invoice creation: from CRM quote, project, or manual
  - Line items: products, services, hours
  - Tax: configurable rates + calculations
  - Multi-currency invoices (with FX rate capture)
  - Invoice lifecycle: Draft → Sent → Viewed → Partial → Paid → Overdue → Written-off
  - Payment recording (full or partial)
  - Credit notes and refunds
  - Recurring invoices (subscription billing)
  - Invoice PDF with company branding
  - Automated payment reminders (email via Resend — 7d, 3d, overdue)
```

#### 11.2 — Expenses
```
Expense management:
  - Employee expense submission (category, amount, date, receipt photo)
  - Receipt OCR (manual at this phase — AI Phase 17 adds auto-extraction)
  - Expense categories (configurable per company)
  - Approval workflow (employee → manager → finance director)
  - Reimbursement tracking (paid / pending)
  - Expense policy rules (per diem limits, prohibited categories)
  - Expense export for accounting software
  - Expense analytics by category / department / project
```

#### 11.3 — Cashflow
```
Cash flow management:
  - Cash position: real-time estimate (known receivables − known payables)
  - Cash in: paid invoices + expected from outstanding receivables
  - Cash out: scheduled payments, payroll, recurring expenses
  - 30 / 60 / 90-day forecast
  - Cash flow statement: operating / investing / financing activities
  - Low cash alert: configurable threshold notification
```

#### 11.4 — Budgets
```
Budget management:
  - Annual budget: by department / project / cost center
  - Monthly breakdown within annual budget
  - Budget vs. actual: real-time tracking as expenses + payroll posted
  - Budget revisions: with reason (all versions preserved)
  - Forecast update: auto-project remainder based on actual spend pace
  - Budget alerts: approaching (80%) and exceeded (100%) thresholds
  - Budget analytics: variance analysis, spend efficiency per category
```

#### 11.5 — Forecasts
```
Financial forecasting:
  - Revenue forecast: weighted pipeline (from CRM) + committed contracts
  - Expense forecast: budget + historical run rate
  - P&L forecast: 3 / 6 / 12 months
  - Break-even analysis
  - Scenario modeling: optimistic / base / conservative

Note: AI Phase 17 will enhance all forecasting with Claude-powered
analysis and anomaly detection.
```

#### 11.6 — Invoices (Accounts Payable)
```
Supplier invoice management:
  - Receive supplier invoices (manual upload or email)
  - Match to purchase order (manual at this phase)
  - Payment scheduling (due date, payment date, method)
  - Payment approval workflow (Finance Director → CEO for large amounts)
  - Aging report: overdue payables by days bracket
  - Cash outflow planning (upcoming payments calendar)

Phase 21 (Procurement) will complete:
  Automated 3-way matching (PO ↔ GRN ↔ Invoice)
```

### Phase 11 Exit Criteria
```
□ Invoice: create, send, record payment, PDF generation
□ Expense: submit, approve, reimburse workflow
□ Cash flow: real-time position calculating
□ Budget: vs. actual live tracking
□ Multi-company: CEO sees consolidated view across companies
□ Finance Director: full company financial access
□ Worker: zero access to Finance module data
□ Audit: every financial event logged
```

---

## PHASE 12: DOCUMENT CENTER
**Duration**: 5 weeks
**Cumulative Week**: 75

### Goals
Build the central document management system — the secure vault for all company documents, referenced by every other module.

### Deliverables

#### 12.1 — Storage
```
Backend: Supabase Storage (S3-compatible)
CDN: Cloudflare (for fast global delivery)

Document schema:
  id, company_id, name, description,
  file_path, file_type, file_size,
  folder_id,
  module (which module created this: projects / hr / finance / etc.),
  entity_type, entity_id (linked source entity),
  security_level (public / internal / confidential / restricted / executive),
  version_number, is_latest_version,
  owner_id, created_by_id,
  tags, metadata,
  expires_at, archived_at,
  created_at, updated_at

Folder structure:
  /company-name/
  ├── HR/           (contracts, payslips, reviews, compliance)
  ├── Finance/      (invoices, expenses, bank statements, reports)
  ├── Projects/     (per-project subfolders — auto-created)
  ├── Legal/        (contracts, NDA, regulatory)
  ├── Safety/       (incident reports, risk assessments, PTW)
  └── General/      (uncategorized company documents)

Auto-organization:
  Module uploads (e.g., HR contract) → routes to correct folder automatically
```

#### 12.2 — Versions
```
Version control:
  - Every upload creates new version (never overwrites)
  - Version history: version number, date, uploaded by, file size, change note
  - Restore previous version (confirmation required, creates new version)
  - Latest version: always the default view
  - Version count: displayed as badge on document card
  - Comparison: side-by-side for text-based documents
```

#### 12.3 — Sharing
```
Internal sharing:
  - Share with specific users, roles, or teams
  - Permission level: View only / Download / Edit / Manage
  - Revoke internal access at any time

External sharing:
  - Generate secure time-limited link
  - Options: view-only / download allowed / password protection / expiry date
  - Revoke external link at any time
  - Access log: every external view and download tracked

Document security levels:
  1. Public       — all company employees can view
  2. Internal     — specified roles or individuals
  3. Confidential — need-to-know; every access logged
  4. Restricted   — HR/Finance Directors + CEO only
  5. Executive Vault — CEO only (absolute zero access to all others)
```

#### 12.4 — Signatures
```
Digital signature workflow:
  - Request signature: select signatories, set signing order
  - Signatory: receives email with secure signing link
  - Signing: drawn/typed signature + identity verification
  - Certificate: tamper-proof PDF certificate of completion
  - Audit trail: who signed, when, IP address, device
  - Reminder: auto-send if not signed in X days (configurable)
  - Expiry: signature request expires if not completed in Y days

Statuses: Draft → Sent → Partially Signed → Completed → Expired / Declined
```

#### 12.5 — Retention
```
Retention policies (configurable per company):
  Document type             | Default retention
  --------------------------|------------------
  Employment contracts      | 7 years post-termination
  Invoices                  | 7 years (tax compliance)
  Safety incident reports   | 10 years
  Performance reviews       | 5 years
  General correspondence    | 3 years
  Project documents         | 5 years post-completion

Features:
  - Auto-archive on expiry (file kept, document hidden from active view)
  - Legal hold: prevent deletion during litigation (override retention)
  - Approaching expiry alert: 30 / 14 days before archival
  - GDPR right to erasure: request processed with legal hold check
  - Audit trail: every archival and deletion logged
```

### Phase 12 Exit Criteria
```
□ Document upload: all file types, all sizes within limits
□ Folder navigation: all appropriate roles can browse
□ Version control: upload new version, view history, restore
□ Security levels: Executive Vault accessible by CEO only
□ Digital signatures: end-to-end signing flow with certificate
□ Retention: policy enforced, expiry alerts sending
□ Sharing: internal + external links working with access logging
□ RLS: Finance Director can access Finance folder; Worker cannot
```

---

*Part 1 covers Phases 0–12 (Foundation through Document Center)*
*Continues in IMPLEMENTATION_ROADMAP_PART2.md (Phases 13–25 + Strategic Deliverables)*
*MVP Checkpoint: end of Phase 7 (Week 42)*
