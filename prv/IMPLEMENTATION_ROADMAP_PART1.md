# PRV IMPLEMENTATION ROADMAP — PART 1
# Phases 0–12: Architecture · Foundation · Security · Core · Design · Navigation · Business Modules
# Pasul 10 — Enterprise Implementation Blueprint · Source of Truth

**Version**: 1.0
**Status**: Official Blueprint
**Part**: 1 of 2
**Covers**: Phases 0–12
**Philosophy**: Build foundations first. Never build modules before architecture. Never build UI before permissions. Never build dashboards before data. Never build AI before analytics.
**Depends on**: All Pasul 1–9 blueprints

---

## TABLE OF CONTENTS

- [Roadmap Philosophy](#roadmap-philosophy)
- [Master Timeline Overview](#master-timeline-overview)
- [Phase 0: Architecture Validation](#phase-0-architecture-validation)
- [Phase 1: Foundation](#phase-1-foundation)
- [Phase 2: Authentication & Security](#phase-2-authentication--security)
- [Phase 3: Multi-Company Core](#phase-3-multi-company-core)
- [Phase 4: Design System](#phase-4-design-system)
- [Phase 5: Navigation System](#phase-5-navigation-system)
- [Phase 6: Projects Module](#phase-6-projects-module)
- [Phase 7: Attendance & Workforce](#phase-7-attendance--workforce)
- [Phase 8: HR Module](#phase-8-hr-module)
- [Phase 9: Shop Module](#phase-9-shop-module)
- [Phase 10: CRM Module](#phase-10-crm-module)
- [Phase 11: Finance Module](#phase-11-finance-module)
- [Phase 12: Document Center](#phase-12-document-center)

---

## ROADMAP PHILOSOPHY

### Core Principle: Foundations Before Features

Every architectural decision must support 10+ years of operation. This roadmap is not optimized for speed to market — it is optimized for correctness, security, and long-term scalability. A poorly built foundation cannot be fixed without rebuilding everything on top of it.

### The Five Laws of PRV Development

| Law | Statement |
|-----|-----------|
| 1 | Never build a module before the architecture it depends on is complete and tested |
| 2 | Never build a UI before the permission system controlling it is enforced |
| 3 | Never build a dashboard before the data models feeding it are stable |
| 4 | Never build AI features before the analytics layer they depend on is operational |
| 5 | Never build for the happy path — build for 10 million records, 100 companies, 10,000 users from day one |

### What PRV Must Feel Like

**Must feel like:**
- Apple Human Interface Guidelines applied to enterprise
- Apple Business Manager + Apple Wallet + Apple Home — unified
- Linear's precision and speed
- Notion's flexibility
- Things' focus and clarity

**Must never feel like:**
- Legacy ERP (SAP, Oracle)
- Legacy admin panels (Django Admin, phpAdmin)
- A collection of tools glued together
- A desktop app ported to mobile

---

## MASTER TIMELINE OVERVIEW

| Phase | Name | Duration | Cumulative | Type |
|-------|------|----------|-----------|------|
| 0 | Architecture Validation | 2 weeks | W2 | Foundation |
| 1 | Foundation | 3 weeks | W5 | Foundation |
| 2 | Authentication & Security | 5 weeks | W10 | Foundation |
| 3 | Multi-Company Core | 5 weeks | W15 | Foundation |
| 4 | Design System | 7 weeks | W22 | Foundation |
| 5 | Navigation System | 4 weeks | W26 | Foundation |
| 6 | Projects Module | 9 weeks | W35 | Module |
| 7 | Attendance & Workforce | 7 weeks | W42 | Module |
| 8 | HR Module | 6 weeks | W48 | Module |
| 9 | Shop Module | 9 weeks | W57 | Module |
| 10 | CRM Module | 6 weeks | W63 | Module |
| 11 | Finance Module | 7 weeks | W70 | Module |
| 12 | Document Center | 5 weeks | W75 | Module |
| 13 | Communication Center | 5 weeks | W80 | Module |
| 14 | Notification Center | 4 weeks | W84 | Platform |
| 15 | Analytics Platform | 7 weeks | W91 | Platform |
| 16 | Command Center | 6 weeks | W97 | Platform |
| 17 | AI Platform | 9 weeks | W106 | Platform |
| 18 | Safety Module | 5 weeks | W111 | Module |
| 19 | Knowledge Base | 4 weeks | W115 | Module |
| 20 | Learning Center | 5 weeks | W120 | Module |
| 21 | Procurement | 5 weeks | W125 | Module |
| 22 | Tools & Fleet | 5 weeks | W130 | Module |
| 23 | Public App | 7 weeks | W137 | Module |
| 24 | Polish & Optimization | 7 weeks | W144 | Quality |
| 25 | Launch Preparation | 5 weeks | W149 | Launch |

**Total: ~149 weeks (~2.9 years) for full 25-platform build with a full team.**

MVP available at Week 42 (after Phase 7). See Part 2 for MVP Strategy.

---

## PHASE 0: ARCHITECTURE VALIDATION

**Duration**: 2 weeks
**Type**: Foundation — No Code
**Parallel**: Can run simultaneously with team onboarding

### Goal

Validate all 9 blueprint documents (Pasul 1–9) before any code is written. Identify gaps, conflicts, and risks. Produce signed-off architecture that the entire team aligns to before touching a keyboard.

### Deliverables

| Deliverable | Description | Owner |
|------------|-------------|-------|
| Architecture Review Document | Line-by-line review of all 9 Pasul blueprints | Lead Architect |
| Gap Analysis Report | Any missing definitions, ambiguous specs, or conflicting requirements | Lead Architect + Lead Engineer |
| Risk Analysis Report | Technical risks, scalability risks, security risks, timeline risks | Lead Architect |
| Technology Stack Decision | Final confirmation of all technology choices (see Phase 1) | Lead Architect + Lead Engineer |
| Database Schema First Draft | ERD based on DATABASE_ARCHITECTURE.md — before any migration | Lead DB Architect |
| API Contract First Draft | API surface area and versioning strategy | Lead Backend Engineer |
| Architecture Sign-Off | All leads confirm architecture is buildable as specified | All Leads |

### Key Decisions to Validate

| Decision | Question | Must Answer Before Proceeding |
|----------|----------|-------------------------------|
| Multi-tenancy model | Row-Level Security vs schema-per-tenant vs database-per-tenant | ✅ |
| Auth provider | Build custom vs Supabase Auth vs Auth0 vs Clerk | ✅ |
| Real-time engine | WebSockets vs Server-Sent Events vs Supabase Realtime | ✅ |
| AI provider | OpenAI vs Anthropic vs Azure OpenAI vs mixed | ✅ |
| Mobile strategy | React Native vs Native (Swift + Kotlin) vs PWA-first | ✅ |
| Storage provider | Supabase Storage vs AWS S3 vs Cloudflare R2 | ✅ |
| Search engine | PostgreSQL full-text vs Elasticsearch vs Typesense vs Meilisearch | ✅ |
| Background jobs | Inngest vs Bull/Redis vs Temporal vs Supabase Edge Functions | ✅ |

### Success Criteria

- All 9 blueprints reviewed and confirmed implementable
- No blocking architectural contradictions
- All technology stack choices finalized
- Risk register created with mitigation plans
- Team aligned on all decisions
- No code written

### Dependencies

- Pasul 1–9 documents complete ✅ (verified)

---

## PHASE 1: FOUNDATION

**Duration**: 3 weeks
**Type**: Foundation — Infrastructure Only
**Parallel**: Design system work can begin (Phase 4) — parallel track

### Goal

Create the technical foundation that every module will be built on. This is the skeleton that supports everything. No corners cut, no shortcuts — this is permanent infrastructure.

### Deliverables

#### 1.1 Repository Structure

```
prv/
├── apps/
│   ├── web/                    # Next.js web application
│   ├── ios/                    # Swift iOS app (future phase)
│   ├── android/                # Kotlin Android app (future phase)
│   └── docs/                   # Internal documentation site
├── packages/
│   ├── ui/                     # Shared component library (design system)
│   ├── auth/                   # Shared auth utilities
│   ├── db/                     # Database client, migrations, seeds
│   ├── api/                    # API type definitions and client
│   ├── config/                 # Shared configuration (ESLint, TS, etc.)
│   ├── utils/                  # Shared utilities (dates, formatting, etc.)
│   ├── analytics/              # Analytics tracking utilities
│   ├── notifications/          # Notification utilities
│   └── ai/                     # AI client utilities
├── infrastructure/
│   ├── database/               # Migration files, seeds
│   ├── docker/                 # Docker compose for local dev
│   └── terraform/              # Infrastructure as code
└── scripts/
    └── setup/                  # Environment setup scripts
```

#### 1.2 Monorepo Strategy

| Tool | Purpose | Choice |
|------|---------|--------|
| Package manager | Workspace management | pnpm |
| Monorepo orchestration | Build and task running | Turborepo |
| Version management | Package versioning | Changesets |
| Type checking | Cross-package types | TypeScript project references |

#### 1.3 Technology Stack (Finalized)

| Layer | Technology | Version | Rationale |
|-------|-----------|---------|-----------|
| Framework | Next.js (App Router) | Latest stable | SSR, RSC, API Routes |
| Language | TypeScript | 5.x | Type safety across all packages |
| Styling | Tailwind CSS + CSS custom properties | Latest | Design token integration |
| Database | PostgreSQL 16 | 16.x | JSONB, RLS, full-text search, partitioning |
| ORM | Drizzle ORM | Latest | Type-safe, close to SQL, excellent performance |
| Auth | Supabase Auth | Latest | MFA, OAuth, JWT, session management |
| Storage | Supabase Storage (+ R2 fallback) | Latest | File storage with access control |
| Real-time | Supabase Realtime | Latest | WebSocket-based live updates |
| Background Jobs | Inngest | Latest | Type-safe event-driven workflows |
| Search | Typesense | Latest | Fast, typo-tolerant, self-hosted capable |
| AI | Anthropic Claude API + Vercel AI SDK | Latest | Primary AI provider |
| Email | Resend | Latest | Transactional email |
| Push Notifications | Expo (mobile) + Web Push | Latest | Cross-platform push |
| Caching | Redis (Upstash) | Latest | Session cache, rate limiting, queue |
| CDN | Cloudflare | Latest | Edge performance |
| Monitoring | Sentry | Latest | Error tracking |
| Logging | Axiom | Latest | Structured log aggregation |
| Testing | Vitest + Playwright + Testing Library | Latest | Unit + E2E + Component |

#### 1.4 Coding Standards

| Standard | Rule |
|---------|------|
| TypeScript | Strict mode. No `any`. All function params typed. All return types typed. |
| File naming | `kebab-case.ts` for all files. `PascalCase.tsx` for React components. |
| Import order | External → Internal packages → Local files → Types |
| Component structure | Props interface → Component → Export. Never default exports for components. |
| Error handling | Never swallow errors. Every catch block: log + either rethrow or return typed error |
| Database queries | All through Drizzle ORM. No raw SQL except in migrations. |
| API routes | Every route: authenticate → authorize → validate input → execute → audit log |
| Comments | Only when WHY is non-obvious. No what/how comments. No TODO in production code. |
| Testing | Every utility function: unit tested. Every API route: integration tested. Every critical flow: E2E tested. |

#### 1.5 Environment Strategy

| Environment | Purpose | Database | Deployment |
|-------------|---------|----------|-----------|
| `local` | Developer machines | Docker PostgreSQL | Local |
| `preview` | PR preview deployments | Supabase branch DB | Vercel Preview |
| `staging` | Pre-production testing | Supabase staging project | Vercel Staging |
| `production` | Live system | Supabase production project | Vercel Production |

Environment variables: never committed. Managed via `.env.local` locally and environment secrets in CI/CD.

#### 1.6 CI/CD Strategy

```
Developer pushes branch
  → Lint check (ESLint + Prettier)
  → Type check (tsc --noEmit)
  → Unit tests (Vitest)
  → Build check (turbo build)
  → Preview deployment (Vercel)

PR merged to main
  → All checks above
  → Integration tests
  → E2E tests (Playwright, headless)
  → Deploy to staging

Manual staging approval
  → Deploy to production
  → Smoke tests
  → Rollback available for 24h
```

#### 1.7 Logging Strategy

| Level | When to Use | Destination |
|-------|------------|-------------|
| `debug` | Development only; never in production | Local console only |
| `info` | Normal operation events | Axiom |
| `warn` | Unexpected but handled situations | Axiom + Sentry |
| `error` | Errors requiring investigation | Axiom + Sentry (alert) |
| `critical` | System-threatening errors | Axiom + Sentry + PagerDuty |

Every log entry: `{ level, timestamp, service, trace_id, user_id, company_id, message, metadata }`

#### 1.8 Error Handling Strategy

| Boundary | Strategy |
|---------|---------|
| API Routes | try/catch → return typed `{ error: AppError }` — never expose stack traces |
| Server Components | ErrorBoundary per section — partial failures don't kill the page |
| Client Components | Error boundary + retry button where appropriate |
| Background Jobs | 3 retry attempts with exponential backoff; dead letter queue for permanent failures |
| Database | Transactional writes — no partial state; rollback on any error |
| External APIs | Circuit breaker pattern; graceful degradation |

### Success Criteria

- Monorepo builds cleanly with zero type errors
- All CI/CD pipelines green
- Preview deployment working
- All environment variables documented
- Coding standards documented and ESLint enforced
- No business logic — only infrastructure

### Dependencies

- Phase 0 complete ✅
- All technology decisions made ✅

---

## PHASE 2: AUTHENTICATION & SECURITY

**Duration**: 5 weeks
**Type**: Foundation — Security Layer
**Priority**: CRITICAL — nothing else ships without this

### Goal

Build the complete security layer that every module will rely on. Authentication, authorization, MFA, biometric (Face ID on iOS), trusted devices, session management, audit logging, and security monitoring. This must be bullet-proof before any business data is stored.

### Deliverables

#### 2.1 Authentication System

**Implementation scope:**

| Feature | Implementation | Notes |
|---------|---------------|-------|
| Email + Password | Supabase Auth | Argon2id hashing, breached password check |
| OAuth (Google, Apple) | Supabase Auth providers | Required for Apple ecosystem |
| Sign in with Apple | Supabase + Apple OAuth | Mandatory for iOS App Store |
| MFA — TOTP | Supabase Auth MFA | Authenticator app (Google Authenticator, 1Password) |
| MFA — SMS (fallback) | Supabase Auth + Resend | Only as fallback, not primary |
| Face ID (iOS) | WebAuthn / Passkeys | Native biometric, no password needed |
| Touch ID (macOS) | WebAuthn / Passkeys | macOS native |
| Magic Link | Supabase Auth | For initial setup and recovery |
| Session persistence | Secure httpOnly cookies | 30-day refresh tokens |

**Authentication flow (7-gate Zero Trust as specified in SECURITY_ARCHITECTURE.md):**
```
Request
  → Gate 1: Token validation (JWT signature + expiry)
  → Gate 2: Session validation (not revoked, not expired)
  → Gate 3: User validation (account active, not suspended)
  → Gate 4: Role validation (role exists, role active)
  → Gate 5: Permission validation (action allowed for role)
  → Gate 6: Scope validation (company_id / store_id / resource_id matches)
  → Gate 7: Company isolation (RLS enforced at DB level)
  → Execute + Audit Log
```

#### 2.2 Authorization System

**Row-Level Security (RLS) on all tables:**

Every table has:
- `company_id` column (multi-tenancy)
- RLS policy: `auth.jwt() ->> 'company_id' = company_id`
- Role-based policies per operation (SELECT / INSERT / UPDATE / DELETE)

**Permission middleware for all API routes:**

```typescript
// Every API route uses this pattern:
withAuth({
  requiredPermission: 'projects.tasks.create',
  scope: 'project',  // validates project ownership
  audit: true        // logs this action
})
```

**Permission catalog:** All permissions defined in ROLE_ARCHITECTURE.md, implemented as typed constants.

#### 2.3 Multi-Factor Authentication

| MFA Method | When Required | Flow |
|-----------|--------------|------|
| TOTP | All roles — first login | Setup forced on first login |
| Biometric (Face ID / Touch ID) | iOS / macOS apps | Enrolled after initial MFA setup |
| Re-authentication | Sensitive actions (financial, delete, approve) | Biometric prompt → action proceeds |
| Recovery codes | All users | 8 codes generated at MFA setup; stored encrypted |

#### 2.4 Trusted Device Management

| Feature | Implementation |
|---------|---------------|
| Device fingerprinting | Browser fingerprint + device ID stored |
| Trust duration | 30 days (configurable per company) |
| Revocation | User can revoke devices from Account settings |
| New device alert | Email notification on new device login |
| Suspicious device | Different country / unusual time → force MFA re-challenge |

#### 2.5 Session Management

| Parameter | Value | Configurable |
|-----------|-------|-------------|
| Access token TTL | 1 hour | No |
| Refresh token TTL | 30 days | Yes (per company: 1–90 days) |
| Concurrent sessions | Max 5 | Yes |
| Idle timeout | 4 hours (configurable) | Yes |
| Force logout | Admin can revoke any session | Always |
| Session list | User can see all active sessions | Always |

#### 2.6 Audit Logging

**Implemented as specified in SECURITY_ARCHITECTURE.md:**

Every audit event:
```
event_id (UUID v7)
timestamp (microsecond precision)
actor_user_id
actor_role
company_id
action (enum: CREATE / READ_SENSITIVE / UPDATE / DELETE / APPROVE / REJECT / EXPORT / LOGIN / LOGOUT / MFA / DEVICE)
resource_type
resource_id
old_value (JSONB, encrypted for sensitive)
new_value (JSONB, encrypted for sensitive)
ip_address
device_id
session_id
chain_hash (SHA-256 of previous event hash + this event payload)
```

Storage: `audit_logs` table with append-only trigger (UPDATE/DELETE blocked by trigger).
Partitioned by month for query performance. Replicated to cold storage daily.

#### 2.7 Security Monitoring

| Monitor | Trigger | Action |
|---------|---------|--------|
| Failed login × 5 | 5 consecutive failures | Lock account 15 min + alert owner |
| Failed login × 10 | 10 consecutive failures | Lock account 4h + notify Admin |
| New device from new country | First login from new country | Force MFA + notify user |
| Impossible travel | Login from two countries within 1h | Suspend session + alert Admin |
| Mass data export | Export > 1,000 records | Alert Admin + require CEO approval |
| Privilege escalation attempt | Permission denied × 3 | Alert Security + flag account |
| Audit log gap | Chain hash mismatch | CRITICAL alert + auto-lockdown |

### Database Migrations (Phase 2 Scope)

Tables created in this phase:
- `users`
- `sessions`
- `trusted_devices`
- `mfa_configurations`
- `security_events`
- `audit_logs`
- `password_reset_tokens`
- `magic_link_tokens`

All tables: row-level security enabled. All sensitive columns: encrypted at application level (in addition to DB encryption at rest).

### Success Criteria

- Authentication: login, MFA, biometric, OAuth all functional
- Every API route protected — unauthenticated requests return 401
- Every permission check functional — unauthorized requests return 403
- RLS enforced: cannot query another company's data (tested)
- Audit log: every action logged; chain hash verified
- Session management: tokens expire, revocation works
- Security monitoring: alerts fire correctly
- Penetration test checklist completed (OWASP Top 10 verified)

### Dependencies

- Phase 0 ✅
- Phase 1 ✅

---

## PHASE 3: MULTI-COMPANY CORE

**Duration**: 5 weeks
**Type**: Foundation — Data Architecture
**Priority**: CRITICAL — all modules depend on this

### Goal

Build the organizational data architecture: the hierarchy of groups, companies, divisions, departments, teams, users, roles, permissions, and scopes. This becomes the core that every single module sits on. No module can be built without this being stable.

### Deliverables

#### 3.1 Company Architecture

**Hierarchy (as specified in PRODUCT_VISION.md and DATABASE_ARCHITECTURE.md):**

```
prv_groups (root)
  └── companies (PRV Renovations, PRV Shop, PRV Projects...)
        ├── divisions
        │     └── departments
        │           └── teams
        │                 └── users (via memberships)
        └── regions (Shop companies only)
              └── stores
                    └── users (via memberships)
```

**Tables implemented:**
- `prv_groups`
- `companies`
- `divisions`
- `departments`
- `teams`
- `locations` (sites, offices, warehouses)
- `regions` (shop geographic regions)
- `stores`

Every table: `company_id` FK, RLS enabled, `created_at`, `updated_at`, `deleted_at` (soft delete), `created_by`, `audit_log` trigger.

#### 3.2 User System

**Tables implemented:**
- `users` (extended from auth.users)
- `user_profiles` (name, photo, contact, preferences)
- `company_memberships` (user ↔ company, with role assignment)
- `team_memberships` (user ↔ team)

A user can belong to multiple companies. Each company membership has its own role. The active company context is stored in the session token.

#### 3.3 Role System

**Implementation of ROLE_ARCHITECTURE.md:**

19 roles defined as constants:
```
CORE: CEO, CO_CEO, SYSADMIN
ATTENDANCE: WORKER, TEAM_LEADER, OMS, OPS_MANAGER, HR
PROJECTS: PROJECT_WORKER, PROJECT_TL, PROJECT_OMS, OPM, PROJECT_DIRECTOR
SHOP: SELLER, STORE_MANAGER, SHOP_DIRECTOR
ANALYTICS: APP_SUPPORT, DATA_ANALYST, QA_TESTER
```

**Tables implemented:**
- `roles` (role catalog)
- `permissions` (permission catalog — all permissions from ROLE_ARCHITECTURE.md)
- `role_permissions` (role ↔ permission mapping)
- `custom_roles` (company-configurable roles)
- `custom_role_permissions`

**Permission check middleware:**
```typescript
hasPermission(userId, companyId, 'projects.phases.manage')
hasScope(userId, companyId, 'project', projectId)
```

#### 3.4 Scope System

**8-level scope hierarchy:**

| Scope Level | Entity | Description |
|-------------|--------|-------------|
| 1 | Global | Sysadmin only |
| 2 | Group | All companies in PRV Group |
| 3 | Company | Own company |
| 4 | Division | Own division |
| 5 | Department | Own department |
| 6 | Team | Own team |
| 7 | Project | Assigned projects |
| 8 | Self | Own records only |

Scope enforcement: every query passes through scope middleware that appends appropriate WHERE clauses.

#### 3.5 Company Settings

**Tables implemented:**
- `company_settings` (all configurable thresholds, feature flags, preferences)
- `company_branding` (name, logo, colors, domain)
- `company_integrations` (third-party integrations per company)

Company settings include:
- MFA requirements
- Session timeout
- Notification preferences
- Approval thresholds (expense limits, etc.)
- Feature flags (enable/disable modules per company)
- Timezone and locale

### Admin Interface (Phase 3 Deliverable)

At end of Phase 3: an internal admin interface exists for:
- Creating companies
- Creating users
- Assigning roles
- Configuring permissions
- Testing scope isolation

This is not the end-user UI — it is a functional admin tool for testing and seeding data.

### Success Criteria

- Multi-company isolation verified: user of Company A cannot access Company B data (automated test)
- All 19 roles created with correct permissions
- Scope enforcement working at all 8 levels
- Company settings configurable
- Admin interface functional
- 1,000 test records per entity (stress test)
- No N+1 query problems

### Dependencies

- Phase 2 ✅ (Auth required for all user operations)

---

## PHASE 4: DESIGN SYSTEM

**Duration**: 7 weeks
**Type**: Foundation — UI Layer
**Parallel**: Can run parallel to Phase 2 (Design) and Phase 3 (Engineering)

### Goal

Build the complete PRV Liquid Glass Design System as a shared component library (`packages/ui`). Every component, token, animation, and pattern defined in DESIGN_SYSTEM.md implemented as reusable, typed, accessible React components. No module-specific UI — only foundational building blocks.

### Deliverables

#### 4.1 Design Tokens

All tokens from DESIGN_SYSTEM.md Appendix A implemented as CSS custom properties:

```css
/* Glass Materials */
--glass-1-bg: rgba(255, 255, 255, 0.06);
--glass-1-blur: 32px;
--glass-2-bg: rgba(255, 255, 255, 0.10);
--glass-2-blur: 48px;
--glass-3-bg: rgba(255, 255, 255, 0.16);
--glass-3-blur: 64px;
--glass-4-bg: rgba(255, 255, 255, 0.22);
--glass-4-blur: 80px;

/* Specular highlights, shadows, borders — all from DESIGN_SYSTEM.md */
/* Typography scale — all 11 levels */
/* Spacing 8pt grid */
/* Corner radius 9-value scale */
/* Motion curves */
/* Z-index elevation stack */
```

All tokens available as Tailwind CSS utilities via plugin.

#### 4.2 Typography System

| Token | Value | Use |
|-------|-------|-----|
| `text-display` | 34px / 700 / SF Pro | Hero headers |
| `text-title-1` | 28px / 700 / SF Pro | Screen titles |
| `text-title-2` | 22px / 700 / SF Pro | Section headers |
| `text-title-3` | 20px / 600 / SF Pro | Card titles |
| `text-headline` | 17px / 600 / SF Pro | List headers |
| `text-body` | 17px / 400 / SF Pro | Primary content |
| `text-callout` | 16px / 400 / SF Pro | Secondary content |
| `text-subhead` | 15px / 400 / SF Pro | Captions |
| `text-footnote` | 13px / 400 / SF Pro | Labels |
| `text-caption-1` | 12px / 400 / SF Pro | Micro text |
| `text-caption-2` | 11px / 400 / SF Pro | Status indicators |

`font-variant-numeric: tabular-nums` applied to all KPI and data display text.
`Dynamic Type` support: all text respects system font size preferences.

#### 4.3 Glass Material Components

| Component | Glass Level | Backdrop Blur | Notes |
|-----------|------------|--------------|-------|
| `GlassCard` | Glass 1 | 32px | Cards, panels, list items |
| `GlassSheet` | Glass 2 | 48px | Bottom sheets, menus |
| `GlassModal` | Glass 3 | 64px | Modals, overlays, command palette |
| `GlassOverlay` | Glass 4 | 80px | Full-screen overlays, critical modals |

All glass components: top specular highlight (`inset 0 1px 0 rgba(255,255,255,0.25)`), floating shadow, border (`rgba(255,255,255,0.12)`).

#### 4.4 Core Components

Every component: typed props, accessible (ARIA), responsive, supports Reduced Motion, dark mode only (B&W Liquid Glass).

| Component | Description |
|-----------|-------------|
| `FloatingTabBar` | Floating glass pill tab bar, 5 tabs, role-adaptive icons |
| `FloatingSearchBar` | Floating glass pill search input, top of screen |
| `FloatingActionButton` | Glass circle FAB, role-specific primary action |
| `BottomSheet` | 5 sizes (Small/Medium/Large/Full/Peek), spring animation, drag handle |
| `ContextMenu` | Glass context menu, long-press trigger, spring appear |
| `Toast` | Glass toast notification, emerge from bottom, 4 types |
| `Modal` | Glass modal, scale + opacity entrance, backdrop blur |
| `CommandPalette` | Glass command palette, ⌘K trigger, NLP-ready input |
| `SearchOverlay` | Full-screen glass search, live results, role-filtered |
| `PeekPreview` | Glass peek card, hover/force-touch trigger |
| `ExpandableCard` | Glass card with expand/collapse spring animation |
| `Input` | Glass input field, floating label, validation states |
| `Button` | 4 variants: Primary (white filled) / Secondary (glass) / Destructive (white, red text) / Ghost |
| `Badge` | Status badges: 6 types (success/warning/error/info/neutral/purple) |
| `Skeleton` | Glass skeleton loaders matching actual content shape |
| `EmptyState` | Contextual empty states with icon + message + CTA |
| `StickyHeader` | Blur-on-scroll header, title appears on scroll |
| `PageTransition` | Slide-in/out page transitions, spring physics |
| `KPICard` | Data display card with metric, trend, sparkline |
| `AvatarStack` | Overlapping user avatars with count overflow |
| `ProgressRing` | Circular progress indicator, animated |
| `StatusDot` | Inline status indicator dot with pulse animation |

#### 4.5 Motion System

All animations implemented as:
1. CSS custom property-driven (token-based)
2. Framer Motion variants (for React components)
3. Reduced Motion safe (prefers-reduced-motion respected)

| Curve | CSS Value | Use |
|-------|----------|-----|
| Spring Bounce | `cubic-bezier(0.34, 1.56, 0.64, 1)` | Appearing elements, modals, sheets |
| Spring Natural | `cubic-bezier(0.25, 1.25, 0.50, 1)` | Navigation, transitions |
| Smooth | `cubic-bezier(0.4, 0, 0.2, 1)` | Standard state changes |
| Decelerate | `cubic-bezier(0, 0, 0.2, 1)` | Elements entering screen |
| Accelerate | `cubic-bezier(0.4, 0, 1, 1)` | Elements leaving screen |

#### 4.6 Haptic System (iOS)

Haptic patterns defined as constants for iOS native implementation (future Phase):

| Pattern | Trigger Examples |
|---------|----------------|
| `impact.light` | Toggle, checkbox, selection |
| `impact.medium` | Button tap, tab switch |
| `impact.heavy` | Drag start, force press |
| `selection` | Picker scroll, list item select |
| `notification.success` | Save, confirm, approve |
| `notification.warning` | Alert, caution, SLA approaching |
| `notification.error` | Error, reject, failure |
| `impact.rigid` | Snap, lock-in, drag end |
| `impact.soft` | Hover, gentle interaction |

#### 4.7 Dynamic Island Components

Dynamic Island states defined as typed React components (for future iOS native bridge):
- Minimal state: icon + value per role
- Compact state: 2-section layout per role
- Expanded state: full context per role

All 19 roles × 3 states defined from DESIGN_SYSTEM.md.

#### 4.8 Widget System

Home Screen widget components defined:
- Small (2×2): Single KPI
- Medium (4×2): KPI + sparkline
- Large (4×4): Full dashboard section
- Lock Screen: Inline metric

### Storybook

All components documented in Storybook with:
- All prop variants
- All states (default / hover / focused / disabled / loading / error)
- Dark mode only
- Motion enabled/disabled
- Accessibility audit per component

### Success Criteria

- All components from DESIGN_SYSTEM.md implemented
- Storybook running with full component library
- Zero accessibility violations (axe-core audit)
- All animations implement Reduced Motion fallback
- Design tokens as CSS custom properties
- All components typed with TypeScript
- No module-specific logic in design system

### Dependencies

- Phase 1 ✅
- DESIGN_SYSTEM.md blueprint ✅

---

## PHASE 5: NAVIGATION SYSTEM

**Duration**: 4 weeks
**Type**: Foundation — Navigation Layer
**Requires**: Phase 3 (roles for dynamic navigation) + Phase 4 (components)

### Goal

Build the complete navigation architecture — the shell that all modules live inside. Dynamic tab bars that adapt to role, Universal Search, Command Palette, Universal Inbox, Universal Calendar, and Favorites. This shell must be complete before any module is built inside it.

### Deliverables

#### 5.1 Dynamic Navigation Engine

Navigation manifest system: each role has a defined navigation manifest (from NAVIGATION_ARCHITECTURE.md).

```typescript
// Navigation manifest drives the entire navigation UI
const navigationManifest: Record<Role, NavigationConfig> = {
  CEO: {
    tabs: [
      { id: 'command', icon: 'house', label: 'Command', module: 'command-center' },
      { id: 'operations', icon: 'grid', label: 'Operations', module: 'operations' },
      { id: 'people', icon: 'person.2', label: 'People', module: 'people' },
      { id: 'finance', icon: 'chart.bar', label: 'Finance', module: 'finance' },
      { id: 'intelligence', icon: 'sparkle', label: 'Intelligence', module: 'analytics' },
    ],
    // ... command palette actions, quick actions, etc.
  },
  WORKER: { /* different tabs */ },
  // ... all 19 roles
}
```

#### 5.2 Floating Tab Bar

- Floating glass pill, centered, above content
- 5 tabs per role (defined in manifest)
- Active tab: white filled icon
- Inactive tabs: 35% opacity
- Badge indicators (unread count, alert count)
- Long-press on tab → context menu with section shortcuts

#### 5.3 Universal Search

- Floating glass search bar (top of screen)
- Results filtered by user's role + scope + company
- Results grouped: Projects / People / Documents / Tasks / Products / Customers
- Keyboard shortcut: `⌘F` (desktop) / search icon tap (mobile)
- Real-time results (Typesense integration)
- Recent searches persisted
- No results → Knowledge Base suggestions

#### 5.4 Command Palette

- `⌘K` on desktop, floating button on mobile
- Glass full-screen overlay
- 6 command types: Navigate / Create / Find / Approve / Ask AI / Recent
- Role-filtered commands (only shows actions user has permission for)
- Keyboard navigable
- AI-powered query: "What is our revenue this month?" → routes to AI Center

#### 5.5 Universal Inbox

- Aggregates all notifications, messages, mentions, approval requests
- Grouped: Needs Action / Unread / All
- One-tap actions inline (approve, reply, navigate)
- Swipe to dismiss (with confirmation for approvals)
- Unread count badge on tab bar and Dynamic Island

#### 5.6 Universal Calendar

- Aggregates events from all modules (milestones, shifts, meetings, deadlines)
- Role-filtered events (only relevant to user's scope)
- Month / Week / Day views
- Event tap → bottom sheet with source module context
- Conflict detection

#### 5.7 Favorites & Recents

- Pin any record from any module to Favorites
- Accessible from tab bar shortcut
- Recents: last 20 records accessed, auto-tracked
- Synced across devices

### Shell Layout

```
[Dynamic Island — live context]
[Floating Search Bar — top]
─────────────────────────────
[Module Content Area]
(fills entire screen including behind tab bar)
─────────────────────────────
[Floating Tab Bar — bottom, glass pill]
[Home Indicator Area — content scrolls behind]
```

### Success Criteria

- All 19 role navigation manifests implemented and correct
- Tab bar adapts to role on login
- Universal Search returns results within 100ms
- Command Palette opens within 50ms
- Universal Inbox aggregates from all connected sources
- Calendar aggregates events from all modules
- Navigation max depth 3 levels enforced

### Dependencies

- Phase 3 ✅ (roles for navigation manifests)
- Phase 4 ✅ (glass components, animations)

---

## PHASE 6: PROJECTS MODULE

**Duration**: 9 weeks
**Type**: Business Module
**Priority**: MVP Critical — first business module

### Goal

Build PRV Projects — the complete renovation and construction project lifecycle management system. This is the primary operational module for PRV Renovations and PRV Projects companies.

### Deliverables

#### 6.1 Projects Core

| Feature | Description |
|---------|-------------|
| Project CRUD | Create, view, edit, archive projects with all metadata |
| Project Status | Defined statuses: Draft / Active / On Track / At Risk / Delayed / Completed / Closed |
| Project Types | Renovation / Construction / Fit-Out / Maintenance / Commercial |
| Project Assignment | Assign OPM, Director, client |
| Project Card View | Glass card grid with health indicator (RAG status) |
| Project List View | Sortable, filterable list |
| Project Search | Full-text search via Typesense |
| Project Detail | Tabbed detail screen (all 15 tabs from MODULE_ARCHITECTURE.md) |

#### 6.2 Project Phases

| Feature | Description |
|---------|-------------|
| Phase CRUD | Create phases with name, start/end dates, dependencies |
| Phase Dependencies | Phase B cannot start until Phase A complete |
| Phase Status | Not Started / In Progress / Complete / Approved |
| Phase Completion | Approval flow triggered on completion |
| Phase Progress | Auto-calculated from tasks |
| Phase Timeline | Gantt-style visualization |

#### 6.3 Tasks & Subtasks

| Feature | Description |
|---------|-------------|
| Task CRUD | Create, assign, prioritize, due date, phase link |
| Subtasks | Unlimited subtask nesting (max 3 levels for navigation rule) |
| Task Status | Not Started / In Progress / Complete / Blocked / Verified |
| Task Assignment | Assign to any team member in project |
| Task Priority | Critical / High / Medium / Low |
| Task Time Logging | Log hours per task per day |
| Task Comments | Threaded comments (via Communication module) |
| Bulk Operations | Select multiple tasks → reassign / status change / delete |

#### 6.4 Project Team

| Feature | Description |
|---------|-------------|
| Team Members | View all assigned team members with role |
| Add / Remove Members | OPM can manage team |
| Allocation View | % allocation per member |
| Skill Visibility | Certifications relevant to project type |

#### 6.5 Project Materials

| Feature | Description |
|---------|-------------|
| Materials List | All materials with quantity, unit, cost, supplier |
| Delivery Status | Ordered / In Transit / Delivered / Returned |
| PO Links | Link materials to Procurement POs |
| Cost Tracking | Planned vs actual material cost |

#### 6.6 Project Budget

| Feature | Description |
|---------|-------------|
| Budget Baseline | Set planned budget per category |
| Cost Entries | Log actual costs (labor / materials / subcontractors / overhead) |
| Budget View | Planned vs actual per category, total variance |
| Variance Alerts | Automated alerts at 10% / 20% / 30% thresholds |
| Change Orders | Formal scope+cost change request with approval flow |

#### 6.7 Project Photos

| Feature | Description |
|---------|-------------|
| Photo Upload | Camera + gallery; multi-select |
| AI Auto-Tagging | Phase, date, location, content type |
| Approval Queue | Internal approval → optional client-visible toggle |
| Gallery View | Grid view; filterable by phase, date, type |
| Before/After | Side-by-side comparison slider |

#### 6.8 Project Documents

| Feature | Description |
|---------|-------------|
| Document Upload | Any file type; linked to Document Center |
| Document Categories | Contract / Permit / Specification / Drawing / Report / Other |
| Version History | Full version history per document |
| Digital Signatures | Request signature from client or internal party |

#### 6.9 Project Analytics

Per-project KPI dashboard:
- Health score (composite)
- Schedule variance (planned vs actual timeline)
- Budget variance (planned vs actual cost)
- Task velocity (tasks completed per week, trend)
- Team utilization

#### 6.10 Project Automations (Phase 6 scope)

From MODULE_ARCHITECTURE_SUPPLEMENT.md:
- Auto-create project channel on project activation
- Auto-notify team on kickoff
- Task overdue alerts (T+24h, T+72h)
- Budget variance alerts (10%, 20%, 30%)
- Phase unlock on completion approval
- Weekly report auto-generation
- Material procurement auto-request

### Success Criteria

- Full project lifecycle (create → active → complete → close)
- Task completion tracked and verified
- Budget tracking functional
- Photo upload + approval chain working
- All approval flows functional (phase completion, change orders)
- Role-based access enforced (Worker sees only own tasks)
- Automations firing correctly
- Analytics dashboard populated from real data

### Dependencies

- Phase 3 ✅ (multi-company, roles, permissions)
- Phase 4 ✅ (design system components)
- Phase 5 ✅ (navigation shell)

---

## PHASE 7: ATTENDANCE & WORKFORCE

**Duration**: 7 weeks
**Type**: Business Module
**Priority**: MVP Critical

### Goal

Build PRV Attendance (real-time GPS + QR check-in system) and PRV Workforce (employee registry). These two modules together form the workforce management foundation.

### Deliverables — Attendance

#### 7.1 Check-In / Check-Out

| Feature | Description |
|---------|-------------|
| Check-In Flow | GPS verification → QR fallback → photo fallback |
| Geofence Engine | Per-site configurable radius (default 100m) |
| QR Verification | QR code per site; scan at check-in |
| Check-Out Flow | Duration summary + optional note |
| Real-time Status | TL/OMS sees live attendance grid |
| Late Detection | Auto-flag after T+15min / T+30min / T+60min |

#### 7.2 Schedules & Shifts

| Feature | Description |
|---------|-------------|
| Shift Creation | OMS creates shifts: worker / date / site / hours |
| Schedule View | Worker sees weekly schedule |
| Manager View | OMS sees team schedule grid |
| Schedule Gaps | Auto-detection and alert |
| Shift Templates | Reusable shift templates per role/site type |

#### 7.3 Leave Management

| Feature | Description |
|---------|-------------|
| Leave Request | Worker submits: type, dates, reason, documents |
| Leave Types | Annual / Sick / Personal / Unpaid / Compassionate |
| Leave Balance | Configured per type; auto-deducted on approval |
| Approval Flow | Worker → TL → OMS → Ops Manager (by duration) |
| Leave Calendar | Team leave visualization |

#### 7.4 Overtime

| Feature | Description |
|---------|-------------|
| Overtime Request | Worker submits; includes hours, project, reason |
| Approval Flow | Worker → OMS → Ops Manager |
| Overtime Cap | Configurable weekly cap; alerts at threshold |

#### 7.5 Attendance Analytics

- Attendance rate (by team / site / period)
- Punctuality rate
- Overtime cost trend
- Leave utilization
- Workforce availability forecast (next 14 days)

### Deliverables — Workforce

#### 7.6 Employee Profiles

| Feature | Description |
|---------|-------------|
| Employee Record | Full profile linked to auth.users |
| Org Chart | Interactive hierarchical org chart |
| Team Management | Create teams, assign members, assign TL |
| Department Management | Create departments, assign teams |

#### 7.7 Certifications

| Feature | Description |
|---------|-------------|
| Certification Registry | All certifications per employee |
| Expiry Tracking | 90/60/30 day alerts |
| Verification | HR uploads and verifies documents |
| Assignment Block | Block task assignment if certification expired |

#### 7.8 Equipment Assignment

| Feature | Description |
|---------|-------------|
| Assign Tool | Link from Tool Management module |
| Assign Vehicle | Link from Fleet Management module |
| Assignment History | Full history per employee |

#### 7.9 Workforce Analytics

- Headcount by department / team
- Certification compliance rate
- Skills coverage map
- Average tenure
- Turnover rate

### Success Criteria

- GPS check-in functional with geofence enforcement
- QR fallback working
- Leave approval chain complete
- Org chart renders correctly for all company structures
- Certification expiry automation firing correctly
- Payroll export ready (for Phase 8)

### Dependencies

- Phase 3 ✅
- Phase 6 (Projects — for site linking at check-in) ✅

---

## PHASE 8: HR MODULE

**Duration**: 6 weeks
**Type**: Business Module

### Goal

Build PRV HR — the complete HR operations layer covering contracts, payroll, recruitment, performance reviews, and compliance.

### Deliverables

#### 8.1 Contracts

| Feature | Description |
|---------|-------------|
| Contract Templates | Configurable templates per contract type |
| Contract Creation | Auto-populated from employee record |
| Digital Signature | Request signature via Document Center |
| Renewal Workflow | 90/60/30 day expiry alerts + renewal flow |
| Contract Archive | Full version history |

#### 8.2 Payroll

| Feature | Description |
|---------|-------------|
| Payroll Configuration | Pay periods, pay types, deduction types |
| Attendance Import | Auto-import approved timesheets |
| Payroll Run | HR runs payroll: review → anomaly check → approve |
| Payslip Generation | Auto-generate PDF payslips |
| Payslip Distribution | Push notification + in-app + email |
| Finance Integration | Auto-post payroll expense to Finance |
| Payroll Analytics | Cost trend by department |

#### 8.3 Recruitment

| Feature | Description |
|---------|-------------|
| Job Positions | Open positions with job description |
| Candidate Pipeline | Kanban: Applied → Screening → Interview → Offer → Hired/Rejected |
| Interview Scheduling | Calendar integration |
| Offer Letter | Generated from template; digital signature |
| Rejection Communication | Auto-send rejection emails |
| Hire Trigger | On hire: create employee record + trigger onboarding |

#### 8.4 Performance Reviews

| Feature | Description |
|---------|-------------|
| Review Cycles | Configure: quarterly / semi-annual / annual |
| Self-Assessment | Employee completes self-assessment form |
| Manager Review | Manager completes evaluation form |
| Calibration | HR calibrates scores |
| Development Plan | AI-suggested learning path post-review |
| Acknowledgement | Employee digitally signs review |

#### 8.5 Compliance

| Feature | Description |
|---------|-------------|
| Compliance Checklist | Per-role mandatory requirements |
| Compliance Score | % employees with all requirements met |
| Gap Report | Employees with missing items |
| Deadline Tracking | Automated alerts for approaching deadlines |

### Success Criteria

- Complete payroll cycle functional (configure → run → distribute)
- Recruitment pipeline operational
- Performance review cycle end-to-end
- Compliance tracking accurate
- All approval flows working (payroll → Finance → CEO)

### Dependencies

- Phase 7 ✅ (Attendance for timesheets, Workforce for employee records)

---

## PHASE 9: SHOP MODULE

**Duration**: 9 weeks
**Type**: Business Module
**Priority**: MVP Critical (for PRV Shop company)

### Goal

Build PRV Shop — multi-store, multi-warehouse retail and inventory management with full POS capabilities.

### Deliverables

#### 9.1 Product Catalog

| Feature | Description |
|---------|-------------|
| Products | Full CRUD with variants (color / size / material) |
| Categories | Hierarchical categories with images |
| Attributes | Custom attributes per category |
| Pricing | Per-store pricing, cost price, margin calculation |
| Product Photos | Gallery, primary photo |
| Product Search | Typesense full-text + attribute filtering |

#### 9.2 Inventory Management

| Feature | Description |
|---------|-------------|
| Stock Per Location | Inventory tracked per store + warehouse |
| Reorder Thresholds | Per-SKU per-location configurable thresholds |
| Low Stock Alerts | Automated when below threshold |
| Stock Movements | Every movement logged (sale, return, transfer, adjustment) |
| Stock Transfers | Between stores and warehouses |
| Inventory Audit | Scheduled inventory count feature |

#### 9.3 Orders

| Feature | Description |
|---------|-------------|
| Online Orders | From Public App; full fulfillment workflow |
| Order Status | Pending / Processing / Packed / Shipped / Delivered / Cancelled |
| Returns | Return authorization + refund workflow |
| Order Analytics | GMV, AOV, volume trends |

#### 9.4 POS System

| Feature | Description |
|---------|-------------|
| POS Interface | Seller-optimized screen; product search/scan |
| Barcode Scanner | Camera-based or peripheral scanner support |
| Payment Types | Cash / Card / Split |
| Promotions Application | Auto-apply eligible promotions |
| Discounts | Seller applies within limit; above limit → manager approval |
| Receipt | Print and digital (email/push) |
| Session Management | Open / close register with cash count |

#### 9.5 Coupons & Promotions

| Feature | Description |
|---------|-------------|
| Coupon Codes | Create, manage, track usage |
| Promotions | Percentage / fixed / buy-X-get-Y; date-range scheduled |
| Promotion Auto-Apply | Eligible orders auto-discounted |

#### 9.6 Suppliers (Shop Context)

| Feature | Description |
|---------|-------------|
| Supplier Profiles | Contact, products, payment terms |
| Performance Scores | On-time delivery, quality, accuracy |
| PO History | All orders placed with supplier |

#### 9.7 Shop Analytics

- GMV and revenue per store / network
- Gross margin by product / category
- Sell-through rate
- Top products
- Inventory turnover
- Dead stock detection

### Success Criteria

- Full POS transaction cycle working
- Multi-store isolation correct (Store A cannot see Store B)
- Inventory accurately decremented on sale
- Reorder automation firing
- Online order flow end-to-end
- Shop Director sees network-wide data

### Dependencies

- Phase 3 ✅ (multi-company, store scope)
- Phase 4 ✅ (POS UI)

---

## PHASE 10: CRM MODULE

**Duration**: 6 weeks
**Type**: Business Module

### Goal

Build PRV CRM — full customer relationship lifecycle from lead to long-term retention.

### Deliverables

#### 10.1 Lead Management

| Feature | Description |
|---------|-------------|
| Lead CRUD | Create, assign, track leads |
| Lead Sources | Public App quote / manual / import |
| Pipeline View | Kanban board: stages from New Lead → Won/Lost |
| Lead Scoring | AI-powered prioritization |
| Assignment Rules | Round-robin or territory-based auto-assignment |
| SLA Tracking | First contact SLA with escalation |

#### 10.2 Customer Management

| Feature | Description |
|---------|-------------|
| Customer 360 | All touchpoints: projects, orders, quotes, invoices, communications |
| Customer Profiles | Contact info, preferences, history |
| Customer Health Score | Activity-based health indicator |
| CLV | Calculated lifetime value (12m and 36m) |

#### 10.3 Quotes

| Feature | Description |
|---------|-------------|
| Quote Builder | Service / product line items, pricing, tax |
| Quote PDF | Auto-generated professional PDF |
| Quote Sending | Email delivery with read receipt |
| Quote Versioning | Full revision history |
| Quote Acceptance | Digital acknowledgement or DocuSign |
| Approval Flow | Discount > threshold → manager approval |

#### 10.4 Activity Logging

| Feature | Description |
|---------|-------------|
| Activity Types | Call / Meeting / Email / Note / Site Visit |
| Outcome Tracking | Result and next action per activity |
| Follow-Up Reminders | Auto-created from activity outcomes |
| Activity Timeline | Chronological history per customer |

#### 10.5 Customer Analytics

- Pipeline value by stage
- Conversion rate (lead → customer)
- Win / loss ratio
- Average deal size
- CLV distribution
- Churn indicators

### Success Criteria

- Lead-to-customer conversion flow complete
- Quote building and sending functional
- Customer 360 view populated from Projects + Finance data
- CLV calculated correctly

### Dependencies

- Phase 3 ✅
- Phase 6 ✅ (Projects for project-customer link)
- Phase 9 ✅ (Shop for purchase history in Customer 360)

---

## PHASE 11: FINANCE MODULE

**Duration**: 7 weeks
**Type**: Business Module
**Priority**: MVP Critical (required for business operations)

### Goal

Build PRV Finance — multi-company financial management covering invoicing, expenses, budgets, cashflow, and profitability.

### Deliverables

#### 11.1 Invoices

| Feature | Description |
|---------|-------------|
| Invoice Creation | Line items, tax, payment terms, linked project/order |
| Invoice Templates | Configurable per company |
| Invoice Sending | Email + portal delivery |
| Payment Recording | Mark paid, record payment method |
| Overdue Management | Automated reminder schedule |
| Invoice PDF | Professional PDF generation |

#### 11.2 Expenses

| Feature | Description |
|---------|-------------|
| Expense Submission | Amount, category, vendor, receipt upload |
| Expense Categories | Configurable per company |
| Approval Flow | Tiered by amount and category |
| Auto-Posting | Approved expenses auto-posted to ledger |
| Receipt OCR | AI extracts data from receipt photos |

#### 11.3 Budgets

| Feature | Description |
|---------|-------------|
| Company Budget | Annual company-level budget by category |
| Department Budgets | Per-department budget allocation |
| Project Budgets | Per-project budget (linked from Phase 6) |
| Variance Tracking | Planned vs actual with alerts |

#### 11.4 Cashflow

| Feature | Description |
|---------|-------------|
| Cashflow View | Rolling 30/60/90 day view |
| Inflows | Confirmed invoices, scheduled payments |
| Outflows | Confirmed expenses, payroll, scheduled payments |
| AI Forecast | ML-based cashflow projection |

#### 11.5 Profitability

| Feature | Description |
|---------|-------------|
| Project P&L | Revenue - all costs per project |
| Service P&L | Revenue by service type |
| Product Margin | Shop product margin tracking |
| Company P&L | Full income statement |
| Multi-Company Consolidation | Group-level consolidated P&L |

#### 11.6 Financial Reports

- Income Statement (P&L)
- Balance Sheet (simplified)
- Cashflow Statement
- Budget Variance Report
- Accounts Receivable Aging
- Payroll Cost Report

### Success Criteria

- Complete invoice lifecycle (create → send → pay)
- Expense approval chain working
- Budget vs actual calculation correct
- Multi-company consolidation accurate
- Financial reports generating correctly

### Dependencies

- Phase 8 ✅ (Payroll for labor costs)
- Phase 9 ✅ (Shop revenue)
- Phase 10 ✅ (CRM quotes → invoices)

---

## PHASE 12: DOCUMENT CENTER

**Duration**: 5 weeks
**Type**: Platform Module

### Goal

Build PRV Document Center — the unified document storage, versioning, signing, sharing, and retention layer that all modules depend on for document management.

### Deliverables

#### 12.1 Document Storage

| Feature | Description |
|---------|-------------|
| File Upload | Any file type; multi-file; drag-and-drop |
| Storage Backend | Supabase Storage (S3-compatible) |
| File Preview | In-app preview for PDF, images, office documents |
| Security Levels | 5-tier: Public / Internal / Confidential / Restricted / Executive Vault |
| Access Control | Named grants per document |
| Search | Full-text search in document content (via OCR for PDFs) |

#### 12.2 Version Control

| Feature | Description |
|---------|-------------|
| Version Upload | Upload new version of existing document |
| Version History | All versions with author, date, change notes |
| Version Comparison | Side-by-side diff for text documents |
| Rollback | Revert to previous version (preserves all) |

#### 12.3 Digital Signatures

| Feature | Description |
|---------|-------------|
| Signature Requests | Send to named signatories with deadline |
| Signature Order | Sequential or parallel signing |
| In-App Signature | Native signature pad (iOS, mouse/stylus on desktop) |
| Audit Trail | Timestamp, IP, device per signature |
| Completion Lock | Document locked after all signatures |

#### 12.4 Sharing & Retention

| Feature | Description |
|---------|-------------|
| Internal Sharing | Grant named access to specific users |
| External Sharing | Secure link for clients (no PRV account needed) |
| Retention Policies | Per-category configurable retention periods |
| Auto-Archive | Documents archived at retention date |
| Destruction Log | Audit record of destroyed documents |

### Success Criteria

- All modules can store and retrieve documents via document_id reference
- 5-tier security levels enforced
- Digital signature complete cycle working
- Retention automation running
- Full-text search functional

### Dependencies

- Phase 3 ✅ (company scope, permissions)
- All previous module phases (documents now created by each module)

---

*PRV Implementation Roadmap Part 1 · Phases 0–12 · Pasul 10 · Source of Truth*
*Do not modify without approval from Lead Architect.*
*See Part 2 for Phases 13–25 + Team Structure + Release Strategy + MVP Strategy + Enterprise Strategy + 10-Year Plan.*
