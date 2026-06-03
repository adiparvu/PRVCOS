# PRV — Master Architecture Blueprint · Part 1
**Sections:** System Architecture · Module Architecture · Navigation Architecture
**Version:** 1.0 — Post Architecture Review · All 5 Decisions Incorporated
**Status:** APPROVED ARCHITECTURE — Awaiting Implementation
**Date:** 2026-06-03

---

## Architectural Decisions Incorporated

| Decision | Resolution |
|---------|-----------|
| Approval Engine | Shared Engine Library — built Phase 3, used by all 23 modules |
| Supplier Management | Standalone Module 23 — clean separation from Procurement |
| Zero Trust | 10-gate chain — ROLE_ARCHITECTURE.md is canonical |
| Public App Phase 0 | Static marketing shell deployed Week 2 |
| Group CEO | Formal Group scope level (Level 7) + Group CEO role |

---

# 1. SYSTEM ARCHITECTURE

---

## 1.1 System Identity

**PRV** is a Company Operating System — not a CRM, ERP, or project manager, but a unified operating system for renovation and construction companies. It combines 18 user-facing platforms into a single ecosystem with a shared identity layer, shared data layer, and shared intelligence layer.

**Primary markets:** Renovation companies, construction firms, multi-company holding groups
**Primary device:** iPhone (premium) · iPad · Android · Web · macOS
**Primary users:** 19 employee roles + 1 Group CEO role + external clients + external suppliers
**Scale target:** 100+ companies · 1,000+ stores · 10,000+ employees · millions of records

---

## 1.2 Platform Topology

```
PRV ECOSYSTEM
│
├── PUBLIC LAYER (no authentication required)
│     ├── Public Presentation Platform → Module 01: Public Application
│     ├── Renovation Services Platform → Module 22: Renovation Services (public pages)
│     └── Shop Platform → Module 06: Shop (product catalog, public pages)
│
├── CLIENT LAYER (authenticated clients)
│     ├── Client Portal (embedded in Module 01)
│     ├── Project Progress (embedded in Module 22)
│     └── Order Tracking (embedded in Module 06)
│
├── SUPPLIER LAYER (authenticated suppliers)
│     └── Supplier Portal (embedded in Module 23)
│
└── BUSINESS OS LAYER (authenticated employees, role-based)
      ├── CORE MODULES
      │     ├── Module 02: Projects
      │     ├── Module 03: Attendance
      │     ├── Module 04: Workforce
      │     ├── Module 05: HR
      │     ├── Module 06: Shop
      │     ├── Module 07: CRM
      │     ├── Module 08: Finance
      │     ├── Module 09: Document Center
      │     ├── Module 10: Communication Center
      │     └── Module 22: Renovation Services (internal)
      │
      ├── INTELLIGENCE MODULES
      │     ├── Module 11: Notification Center
      │     ├── Module 12: Analytics
      │     └── Module 13: AI Center
      │
      ├── OPERATIONS MODULES
      │     ├── Module 15: Procurement
      │     ├── Module 16: Tool Management
      │     ├── Module 17: Fleet Management
      │     ├── Module 18: Knowledge Base
      │     ├── Module 19: Learning Center
      │     ├── Module 20: Safety Center
      │     └── Module 23: Supplier Management
      │
      └── EXECUTIVE LAYER
            ├── Module 14: Approval Center (Shared Engine UI)
            └── Module 21: Command Center (Group CEO + Company CEO)
```

---

## 1.3 Confirmed Technology Stack

All TBD entries are resolved. This is the definitive stack.

### Core Framework
| Layer | Technology | Version | Purpose |
|-------|-----------|---------|---------|
| Framework | Next.js App Router | Latest stable | Full-stack React framework |
| Language | TypeScript | 5.x | Type safety across entire codebase |
| Styling | Tailwind CSS | 3.x | Utility-first, Liquid Glass utilities |
| Monorepo | pnpm + Turborepo | Latest | Workspace management, build caching |
| Versioning | Changesets | Latest | Semantic versioning, changelogs |

### Data Layer
| Layer | Technology | Purpose |
|-------|-----------|---------|
| Database | PostgreSQL 16 (Supabase) | Primary datastore, RLS multi-tenancy |
| ORM | Drizzle ORM | Type-safe queries, schema migrations |
| Auth | Supabase Auth | Passkeys, MFA, OAuth, magic links |
| Storage | Supabase Storage | Files, images, documents |
| Real-time | Layered (see Integration Architecture) | Live updates by priority tier |
| Cache | Redis via Upstash | Sessions, rate limits, AI cache, pub/sub |

### Application Layer
| Layer | Technology | Purpose |
|-------|-----------|---------|
| State Management | Zustand | Client state, role context, company context |
| Server State | TanStack Query | API cache, optimistic updates, invalidation |
| Background Jobs | Inngest | Priority-queued async tasks |
| Search | Typesense | Full-text search, multi-tenant isolation |
| AI | Anthropic Claude API + Vercel AI SDK | AI Assistant, Agents, Recommendations |
| Email | Resend | Transactional email, notifications |

### Infrastructure
| Layer | Technology | Purpose |
|-------|-----------|---------|
| Hosting | Vercel | Next.js deployment, edge functions |
| CDN / Edge | Cloudflare | Global CDN, DDoS protection, edge cache |
| Monitoring | Sentry | Error tracking, performance monitoring |
| Logging | Axiom | Structured logs, query analytics |
| Testing | Vitest + Playwright | Unit, integration, E2E testing |

---

## 1.4 Monorepo Structure

```
prv/
├── apps/
│     ├── web/                 # Next.js App Router (Business OS + Public App)
│     ├── mobile/              # React Native (iOS + Android)
│     └── marketing/           # Static Next.js marketing shell (Phase 0)
│
├── packages/
│     ├── ui/                  # Liquid Glass component library (shared)
│     ├── db/                  # Drizzle schema, migrations, RLS policies
│     ├── auth/                # Supabase Auth wrappers, session management
│     ├── approval-engine/     # Shared Approval Engine library (Phase 3)
│     ├── ai-engine/           # AI tool manifest, permission enforcement
│     ├── notifications/       # Notification dispatch, channel routing
│     ├── analytics/           # Event tracking, snapshot generation
│     ├── search/              # Typesense client, index management
│     ├── validators/          # Zod schemas shared across apps
│     ├── config/              # Shared ESLint, TypeScript, Tailwind configs
│     └── types/               # Shared TypeScript types across all packages
│
├── tooling/
│     ├── eslint-config/
│     ├── typescript-config/
│     └── vitest-config/
│
├── .env.example
├── pnpm-workspace.yaml
├── turbo.json
└── package.json
```

---

## 1.5 Deployment Architecture

```
PRODUCTION ENVIRONMENT

User Devices (iOS / Android / Web / macOS)
        │
        ▼
Cloudflare (Global CDN + DDoS + WAF)
        │
        ├──► Static Assets (Cloudflare Cache — images, JS, CSS)
        │
        ▼
Vercel Edge Network
        │
        ├──► Next.js Middleware (auth validation, rate limiting, geo-routing)
        │
        ▼
Vercel Serverless Functions (App Router Route Handlers)
        │
        ├──► Supabase PostgreSQL 16 (Primary — writes)
        ├──► Supabase PostgreSQL 16 (Read Replica — analytics, dashboards)
        ├──► Supabase Auth (authentication, session management)
        ├──► Supabase Storage (files, images, documents)
        ├──► Supabase Realtime (critical events, security alerts)
        ├──► Upstash Redis (sessions, rate limits, AI cache, pub/sub)
        ├──► Typesense Cloud (search index)
        ├──► Inngest Cloud (background job queue)
        └──► Anthropic Claude API (AI features)

SUPPORTING SERVICES
        ├──► Resend (email delivery)
        ├──► Sentry (error monitoring)
        └──► Axiom (log analytics)

ENVIRONMENTS
        ├── Production     — prv.app (main)
        ├── Staging        — staging.prv.app (pre-release validation)
        ├── Preview        — {branch}.prv.app (per PR, ephemeral)
        └── Development    — localhost:3000 (local dev)
```

---

## 1.6 Multi-Company Architecture Overview

PRV is a multi-tenant system. Tenancy operates at three levels:

### Level 1 — Company Tenant (Primary)
Every row in every table carries `company_id`. PostgreSQL Row-Level Security (RLS) enforces isolation at the database level — queries from Company A cannot return Company B's data regardless of application code.

### Level 2 — Group Tenant (New — Decision 5)
A Group is a named set of companies under common ownership. The `company_groups` and `group_memberships` tables define ownership. The Group CEO role (scope level 7) can aggregate data across all companies in their group. Group-level queries pass through all company boundaries explicitly — no single bypass gate.

### Level 3 — Platform Tenant (Sysadmin)
The Sysadmin role (scope level 9: Global) can access all companies for support purposes, subject to the JIT (Just-In-Time) access protocol with mandatory justification, time limits, and company admin notification.

```
TENANCY HIERARCHY

Platform (Sysadmin — JIT access)
  └── Group (Group CEO)
        ├── Company A (CEO A — company_id = 'abc')
        │     ├── Store A1 (Store Manager)
        │     └── Store A2 (Store Manager)
        └── Company B (CEO B — company_id = 'xyz')
              └── Store B1 (Store Manager)
```

---

## 1.7 Phase 0 Public App — Marketing Shell

A minimal static Next.js site is deployed in Phase 0 (Week 1–2), separate from the Business OS:

**Deployment:** `prv.app` (or company-specific domain)
**Pages:** Home · Services · Portfolio (placeholder) · Contact
**Technology:** Next.js static generation · Tailwind · Liquid Glass design tokens
**Backend:** Contact form only → Resend email delivery
**No auth, no database, no API keys**

The marketing shell evolves into the full Public App (Module 01) in Phase 23 when all backend modules are operational.

---

## 1.8 System Quality Targets

| Dimension | Target |
|-----------|--------|
| Availability | 99.9% uptime (8.7h downtime/year max) |
| API Response Time | P95 < 200ms (Business OS), P95 < 100ms (Public App) |
| Dashboard Load | CEO 60-Second Rule — KPIs visible within 60s of app open |
| Auth Speed | Login + MFA + full session < 3s |
| Search Latency | < 100ms (Typesense), < 500ms (PostgreSQL fallback) |
| Real-time Latency | < 500ms (critical events), < 5s (dashboard widgets) |
| Offline Support | Attendance + Tasks + Safety — functional without internet |
| RPO | < 5 minutes (Recovery Point Objective) |
| RTO | < 30 minutes (Recovery Time Objective) |
| Scale Target | 100 companies · 10,000 employees · millions of records |

---

# 2. MODULE ARCHITECTURE

---

## 2.1 Module Principles

**23 modules. One system.**

Every module follows the same 13-section blueprint:
1. Purpose & Scope
2. Users & Roles
3. Permissions Matrix
4. Scope Levels
5. Navigation Structure (max 3 levels)
6. Dashboard Integration
7. Notifications
8. Analytics
9. AI Integration
10. Documents
11. Workflows
12. Automations
13. Approvals (via shared Approval Engine)

Every module integrates with: Roles & Permissions · Scope · Notifications · Analytics · AI · Search · Audit Logs · Security.

---

## 2.2 Module Dependency Graph

```
FOUNDATION (Phase 0–3)
  Auth & Security ──────────────────────────────────┐
  Multi-Company Core (Roles, Scopes, Permissions) ───┤
  Approval Engine Library ───────────────────────────┤
  Design System ─────────────────────────────────────┤
  Navigation System ─────────────────────────────────┘
          │
          ▼ (all modules depend on foundation)

MVP CORE (Phase 6–7)
  Module 02: Projects ─────► Module 03: Attendance
                    └───────► Module 04: Workforce
                                    └──► Module 05: HR

REVENUE CORE (Phase 7.5)
  Module 22: Renovation Services ─► Module 02: Projects
                                 ├─► Module 07: CRM
                                 ├─► Module 08: Finance
                                 └─► Module 09: Documents

COMMERCE LAYER (Phase 9–12)
  Module 06: Shop ─────────► Module 08: Finance
  Module 07: CRM ──────────► Module 08: Finance
  Module 08: Finance ───────► Module 09: Documents
  Module 09: Documents ─────► Module 10: Communication

INTELLIGENCE LAYER (Phase 14–17)
  Module 11: Notifications ─► All modules (cross-cutting)
  Module 12: Analytics ─────► All modules (reads from all)
  Module 13: AI Center ─────► All modules (cross-cutting)

OPERATIONS LAYER (Phase 18–22)
  Module 15: Procurement ───► Module 08: Finance
  Module 16: Tool Mgmt ─────► Module 02: Projects
  Module 17: Fleet Mgmt ────► Module 02: Projects
  Module 20: Safety ────────► Module 02: Projects · Module 22: Renovation
  Module 23: Supplier Mgmt ─► Module 15: Procurement

EXECUTIVE LAYER (Phase 16 + ongoing)
  Module 14: Approval Center ─► All modules (via Approval Engine)
  Module 21: Command Center ──► All modules (reads from all)

PUBLIC LAYER (Phase 23)
  Module 01: Public App ──────► Module 22: Renovation · Module 06: Shop
                             ├─► Module 07: CRM (Client Portal)
                             └─► Module 08: Finance (Invoice delivery)
```

---

## 2.3 Shared Approval Engine

**Decision 1 confirmed:** The Approval Engine is a shared library (`packages/approval-engine`), built in Phase 3, used by all 23 modules. No module implements its own approval logic.

### Approval Chain Types

| Type | Description | Example |
|------|-------------|---------|
| Sequential | Approvers in order — each must approve before next | Worker → TL → Manager → Director |
| Parallel | All approvers simultaneously — all must approve | Finance + Legal + CEO simultaneously |
| Quorum | X of N approvers must approve | 2 of 3 directors must approve |
| Threshold | Single approver, role determined by value threshold | < 5,000 RON: Manager; ≥ 5,000: Director; ≥ 50,000: CEO |
| Cross-Module | Approval chain spans multiple modules | Project PO → Finance → CEO |
| Cross-Company | Approval requires Group CEO (Decision 5) | Inter-company resource transfer |

### Approval SLA Matrix

| Priority | L2 (Workers) | L3 (Managers) | L4 (Directors) | L5 (CEO) |
|---------|-------------|--------------|---------------|---------|
| Critical | 2h | 1h | 30min | 15min |
| High | 8h | 4h | 2h | 1h |
| Normal | 48h | 24h | 8h | 4h |
| Low | 5 days | 3 days | 2 days | 1 day |

**Escalation:** If SLA breaches, approval automatically escalates to the next role level with a notification. If the escalated approver also breaches SLA, it escalates to CEO. If CEO breaches SLA for Critical approvals, a system alert is sent to Sysadmin.

### Module 14 — Approval Center as UI Layer

Module 14 (Approval Center) is not a standalone backend. It is a UI dashboard that visualizes the shared Approval Engine:
- **Pending Approvals Inbox** — all approvals awaiting the current user's action across all 23 modules
- **Approval History** — audit trail of all approvals the user has given or received
- **Delegation Manager** — set up delegation rules (when on leave, delegate to X)
- **SLA Monitor** — for managers: view approaching and breached SLAs across their team
- **Approval Templates** — configure approval chains per workflow type (admin only)

---

## 2.4 Module 22 — Renovation Services (New)

**The primary revenue platform. Previously missing. Now formally specified.**

### Purpose
Manage the complete renovation project lifecycle: from client inquiry to project completion, payment, warranty, and review. Specific to renovation/construction workflows — not general project management.

### Users
| Role | Access |
|------|--------|
| CEO / Co-CEO | Full read + executive oversight |
| Project Director | All renovation projects |
| Project OPM | Assigned projects |
| Project TL | Own teams' tasks |
| Project Worker | Own tasks + site updates |
| HR Manager | Subcontractor management |
| Finance Manager | Budgets, payments, invoices |
| Client (external) | Own project only — Client Portal |

### Renovation Project Lifecycle

```
INQUIRY → QUOTE → SIGNED CONTRACT
    │
    ▼
PHASE PLANNING (rooms, materials, labor)
    │
    ▼
PHASE EXECUTION (per phase: Demolition / Rough-in / Finishing / Punch List)
    │   ├── Daily progress updates
    │   ├── Photo documentation (before/after per room)
    │   ├── Material tracking (used vs planned)
    │   ├── Subcontractor coordination
    │   └── Client milestone approval (via Approval Engine)
    │
    ▼
FINAL INSPECTION + CLIENT SIGN-OFF
    │
    ▼
INVOICE + PAYMENT
    │
    ▼
WARRANTY PERIOD (tracked, reminders automated)
    │
    ▼
REVIEW REQUEST → Public App portfolio
```

### Renovation-Specific Features
- **Phase-based progress** (not generic task lists) — Demolition, Rough-in, Finishing, Punch List, Handover
- **Room-by-room photo documentation** — before/after organized by space
- **Material specification** — planned vs used tracking, auto-flag overages
- **Client milestone approval** — clients approve each phase via Client Portal
- **Site visit scheduling** — calendar integration for inspector, client, TL
- **Subcontractor management** — assign external workers to specific phases
- **Building permit tracking** — document upload + expiry alerts
- **Warranty management** — 2-year warranty tracking with automated reminder schedule
- **Before/after portfolio export** — auto-generates portfolio entry for Public App

### Navigation (3 levels max)
```
Level 1 (Tab): Renovation
Level 2 (List): Active Projects · Phases · Schedule · Materials · Documents
Level 3 (Detail): Project Detail / Phase Detail / Room Photos / Material List
Actions via: Bottom Sheet (add photo, update status, log material)
```

### AI Integration
- **Auto-generate phase schedule** from project type + square meters
- **Material quantity estimation** from room dimensions + finish type
- **Risk detection** — flag projects falling behind schedule before deadline
- **Client communication draft** — AI drafts phase completion messages to client
- **Cost vs budget anomaly** — real-time alert when spend trajectory exceeds budget

---

## 2.5 Module 23 — Supplier Management (New)

**Standalone module — not sub-module of Procurement. Decision 2 confirmed.**

### Purpose
Manage the complete supplier relationship lifecycle: from qualification and onboarding through performance tracking, certification management, and (for approved suppliers) access to the Supplier Portal.

### Users
| Role | Access |
|------|--------|
| CEO / Co-CEO | Full read + executive oversight |
| Procurement Director | Full module access |
| Finance Manager | Supplier payment terms, credit |
| HR Manager | Subcontractor suppliers |
| Supplier (external) | Own profile, POs, invoices — Supplier Portal |

### Supplier Lifecycle

```
DISCOVERY → QUALIFICATION → ONBOARDING → APPROVED SUPPLIER
    │                                           │
    │                                           ▼
    │                                   ACTIVE RELATIONSHIP
    │                                       ├── PO receipt + acknowledgment
    │                                       ├── Invoice submission
    │                                       ├── Delivery confirmation
    │                                       ├── Performance scoring
    │                                       └── Certification renewal alerts
    │
    ▼
PERIODIC REVIEW → PREFERRED / APPROVED / SUSPENDED / TERMINATED
```

### Supplier-Specific Features
- **Qualification checklist** — legal documents, certifications, references, site visit
- **Supplier performance scoring** — quality (0–100), delivery (0–100), pricing (0–100), weighted total
- **Certification tracking** — ISO, safety, trade-specific certifications with expiry dates + renewal alerts
- **Supplier Portal** — external-facing: suppliers view their POs, submit invoices, update delivery status, renew certifications
- **Supplier scorecards** — monthly automated performance reports sent to supplier contacts
- **Preferred supplier list** — curated list for procurement team (ranked by performance score)
- **Contract lifecycle** — contract upload, term tracking, renewal workflow
- **Dispute management** — structured dispute log with resolution tracking

### Supplier Portal (External Access)
The Supplier Portal is a separate, simplified UX for external suppliers:
- View their open and historical POs
- Submit invoices against POs
- Update delivery status
- Upload certification renewals
- View their performance scorecard
- Contact the procurement team

Suppliers authenticate via a separate auth pathway (email + password, no SSO). Supplier accounts are company-isolated — a supplier registered with Company A cannot see Company B's POs.

### Navigation (3 levels max)
```
Level 1 (Tab): Suppliers
Level 2 (List): Suppliers · Certifications · Portal · Performance · Contracts
Level 3 (Detail): Supplier Profile / Certification Detail / Performance History
Actions via: Bottom Sheet (send PO, request certification, log dispute)
```

---

## 2.6 Cross-Module Integration Rules

Every module-to-module interaction follows a standardized event schema:

```
Module Event Standard:
{
  event_id:      UUID
  event_type:    string   (e.g., "project.task.completed")
  source_module: number   (module number, 1–23)
  company_id:    UUID     (mandatory — never cross-company without Group auth)
  actor_id:      UUID     (who triggered the event)
  actor_role:    string   (role at time of event)
  resource_type: string   (entity type)
  resource_id:   UUID     (entity ID)
  payload:       JSONB    (event-specific data)
  timestamp:     TIMESTAMPTZ (UTC)
  correlation_id: UUID   (traces multi-step workflows)
}
```

**Key cross-module flows:**

| Source Module | Event | Target Module(s) | Action |
|--------------|-------|-----------------|--------|
| Renovation (22) | Phase completed | Finance (08) | Create milestone invoice |
| Renovation (22) | Client approved phase | Projects (02) | Advance project status |
| Procurement (15) | PO approved | Finance (08) | Reserve budget |
| Procurement (15) | PO created | Supplier Mgmt (23) | Notify supplier via Portal |
| Shop (06) | Order placed | Finance (08) | Create receivable |
| Shop (06) | Inventory low | Procurement (15) | Auto-create purchase request |
| Attendance (03) | Absence detected | HR (05) | Trigger leave workflow |
| Safety (20) | Incident reported | Projects (02) | Flag project, pause phase |
| Safety (20) | Critical incident | Command Center (21) | Immediate CEO alert |
| AI Center (13) | Recommendation generated | Dashboard | Surface to relevant role |
| All modules | Any action | Notification (11) | Route notification |
| All modules | Any action | Analytics (12) | Record event |
| All modules | Any action | Audit Log | Immutable record |

---

# 3. NAVIGATION ARCHITECTURE

---

## 3.1 Navigation Laws (Non-Negotiable)

**Law 1 — Maximum 3 Levels**
`Tab → List/Grid → Detail`
Actions via Bottom Sheet, Context Menu, or Command Palette — never via a 4th navigation level.

**Law 2 — Always Floating**
Tab bars, search bars, action buttons — all float above content. Never solid, never full-width, never attached to screen edges (except system chrome). Floating glass elements on pure black background.

**Law 3 — Role-Adaptive**
The navigation adapts to the authenticated user's role. A Worker and a CEO see entirely different tab bars, entirely different dashboards. The same app feels like a different product for each role.

**Law 4 — Context-Aware**
Navigation reflects current company context. Group CEO sees a company indicator in the header. Switching companies resets all navigation state to the new company context.

**Law 5 — Action-First**
Common actions are one tap away. No action requires more than 3 taps from the home tab. Complex multi-step workflows use Bottom Sheets (stepped), not new screens.

---

## 3.2 Navigation Pattern Hierarchy

| Priority | Pattern | Use Case |
|---------|---------|---------|
| 1 | **Floating Tab Bar** | Primary navigation between modules |
| 2 | **Bottom Sheet** | Secondary workflows, quick actions, forms |
| 3 | **Context Menu** (long-press) | Tertiary actions on specific items |
| 4 | **Command Palette** (⌘K) | Global search, quick navigation, power users |
| 5 | **Search Overlay** | Universal search across all modules |
| 6 | **Peek Preview** | View record without navigating |
| 7 | **Overlay / Drawer** | Settings, filters, non-destructive configuration |

---

## 3.3 Role-Based Tab Bars

Each of the 20 roles (19 original + Group CEO) has a unique floating tab bar. Tabs are computed from the role's permission matrix — tabs the user cannot access are not shown (not grayed out, not locked — simply absent).

### Group CEO Tab Bar (New — Decision 5)
```
⌂ Group Command    — Group KPI cockpit · All companies overview · Group alerts
◎ Companies        — Company switcher · Per-company drill-down · Comparative view
⟁ Group Finance    — Consolidated P&L · Revenue by company · Group forecasts
✦ Intelligence     — Group analytics · AI group insights · Group reports
◈ Settings         — Group profile · Company management · Access control
```

### CEO Tab Bar
```
⌂ Command         — Dashboard · KPIs · AI · Alerts · CEO Cockpit
⊞ Operations      — Projects · Attendance · Workforce · Shop overview
◎ People          — HR · Org chart · Payroll summary
⟁ Finance         — Revenue · Expenses · Reports · Forecasts
✦ Intelligence    — Analytics · AI · Full reports
```

### Project Director Tab Bar
```
⌂ Dashboard       — My KPIs · Team status · Deadlines
⊞ Projects        — All projects · Gantt · Resources
◎ Teams           — All teams · Capacity · Performance
⟁ Reports         — Project analytics · Budget reports
◈ Settings        — Module settings · Approval chains
```

### Project TL Tab Bar
```
⌂ My Day          — Today's tasks · Team status · Alerts
⊞ Projects        — My projects · Sprints · Board
◎ Team            — My team · Attendance · Performance
⟁ Reports         — My project reports
```

### Project Worker Tab Bar
```
⌂ My Day          — My tasks · Today's schedule · Alerts
⊞ Tasks           — Task list · Board · Calendar
◎ Team            — My team (read-only)
⟁ Updates         — Project news · Announcements
```

### Ops Manager (OMS) Tab Bar
```
⌂ Operations      — Live status · All sites · Alerts
⊞ Projects        — All projects (operational view)
◎ Workforce       — Attendance · Scheduling · Overtime
⟁ Reports         — Operational reports
◈ Approvals       — Pending approvals inbox
```

### HR Tab Bar
```
⌂ Dashboard       — Headcount · Attendance summary · Pending requests
◎ People          — Employee directory · Org chart · Contracts
⟁ Payroll         — Payroll runs · Compensation · Benefits
⊞ Requests        — Leave · Overtime · Document requests
◈ Reports         — HR analytics · Headcount · Turnover
```

### Store Manager Tab Bar
```
⌂ My Store        — Store KPIs · Today's team · Revenue
⊞ Operations      — Inventory · Orders · Cashier status
◎ Team            — Schedule · Attendance · Performance
⟁ Reports         — Store analytics · Daily reports
```

### Shop Director Tab Bar
```
⌂ All Stores      — Network KPIs · Store comparison · Alerts
⊞ Operations      — Inventory network · Orders · Transfers
◎ People          — All store teams · Schedule management
⟁ Finance         — Revenue · Margins · Forecasts
✦ Analytics       — Shop analytics · Category performance
```

### Seller Tab Bar
```
⌂ My Day          — Today's sales · Targets · Customers
⊞ Products        — Product catalog · Inventory (read)
◎ Customers       — My customers · Orders
⟁ Reports         — My sales performance
```

### Finance Manager / CFO Tab Bar
```
⌂ Finance Home    — P&L · Cash flow · KPIs · Alerts
⊞ Transactions    — Invoices · Payments · Expenses
◎ Reports         — Balance sheet · Forecasts · Tax
⟁ Approvals       — Payment approvals · Budget approvals
◈ Settings        — Chart of accounts · Tax configuration
```

### Sysadmin Tab Bar
```
⌂ System Health   — All companies · System status · Alerts
⊞ Companies       — Company management · User management
◎ Security        — Audit logs · Active sessions · Incidents
⟁ Settings        — Platform configuration · Integrations
◈ Support         — JIT access log · Error tracking
```

---

## 3.4 Navigation Component Specifications

### Floating Tab Bar
- **Position:** Bottom, 20px above safe area
- **Style:** Glass 2 (`rgba(255,255,255,0.10)` + `blur(48px)`) + top specular
- **Shape:** Pill (`border-radius: 32px`)
- **Size:** 5 tabs max · 64px height · 56px wide per tab
- **Active state:** White fill tab icon + white label · light impact haptic
- **Badge:** Unread count · white on glass · positioned top-right of icon
- **Animation:** Spring (`cubic-bezier(0.34, 1.56, 0.64, 1)`) on active state transition

### Bottom Sheet — 8 Types

| Type | Height | Use |
|------|--------|-----|
| Peek | 30% screen | Quick preview, single action |
| Half | 50% screen | Short forms, 3–5 options |
| Three-Quarter | 75% screen | Medium forms, lists |
| Full | 95% screen | Complex forms, multi-step |
| Stepped | Full + steps indicator | Multi-step workflows |
| List Picker | 50–75% screen | Select from list |
| Confirmation | 40% screen | Confirm destructive action |
| Context | 35% screen | Context-specific actions |

All Bottom Sheets:
- Glass 3 (`rgba(255,255,255,0.16)` + `blur(64px)`)
- `border-radius: 32px` top corners
- Drag handle: `rgba(255,255,255,0.35)` · 4px × 36px · centered top
- Rise animation: `translateY(100%) → 0` + `opacity 0 → 1` · spring physics
- Dismiss: drag down past 30% threshold OR tap outside

### Command Palette (⌘K)
- Triggered by: ⌘K (desktop) · search icon long-press (mobile)
- Style: Glass 3 overlay · centered · max-width 600px
- Real-time Typesense search across all authorized modules
- Sections: Recent · Actions · Go To · People · Documents
- Keyboard navigation: ↑↓ arrows · Enter to select · Esc to dismiss
- Role-aware: results filtered to user's permission scope

### File Browser (Document Center Exception)
Document Center uses the **File Browser Pattern** — not navigation levels:
- Level 1 (Tab): Document Center
- Level 2: Document Center Home (recents, favorites, company root folders)
- Level 3: **Folder Browser** — single screen that updates as user traverses folders
- Breadcrumb trail within Level 3 shows path but does not count as navigation levels
- Folder traversal = content state change within Level 3 screen
- This pattern does NOT violate the 3-level navigation rule

---

## 3.5 Platform Adaptive Layouts

### iPhone (Primary)
- Floating tab bar (bottom)
- Full-screen views with glass navigation
- Bottom Sheets for all secondary workflows
- Dynamic Island: role-specific live context
- Live Activities: real-time data on lock screen

### iPad (Two-Panel)
- Left panel: Sidebar navigation (Glass 1) replacing tab bar
- Right panel: Detail view
- Optional third panel: Inspector / metadata
- Split view: 320px sidebar + remaining content area
- Sidebar collapses to floating icon strip in compact mode

### Web / macOS
- Left sidebar: Role-specific navigation tree
- Top bar: Search · Notifications · Profile · Company switcher
- Main content: adaptive grid
- Command Palette always available (⌘K)
- Keyboard shortcuts for all primary actions

---

## 3.6 Dynamic Island Specifications

All 20 roles have role-specific Dynamic Island states:

| Role | Live Activity | Compact | Expanded |
|------|--------------|---------|----------|
| Group CEO | Group revenue vs target (live) | Group alert count | Group KPI overview |
| CEO | Revenue + active alerts | Alert count | Today's KPI snapshot |
| Project Director | Active project count | Deadline alerts | Project health overview |
| Project TL | Active sprint progress | Task due count | Sprint burndown |
| Project Worker | Current task + timer | Task complete count | My tasks today |
| OMS | Site incidents (live) | Operations alerts | Site status grid |
| HR | Leave requests pending | Approval count | Attendance overview |
| Store Manager | Store revenue (live) | Store alerts | Store KPI snapshot |
| Shop Director | Network revenue (live) | Network alerts | Store comparison |
| Seller | Today's sales vs target | Items sold | Sales progress bar |
| Finance Manager | Cash position (live) | Payment alerts | P&L snapshot |
| Sysadmin | System health (live) | Error count | Company health grid |

---

## 3.7 Universal Inbox

The Universal Inbox aggregates all incoming items requiring attention across all 23 modules, filtered to the user's role:

**Inbox sections (ordered):**
1. **Action Required** — approvals pending, tasks overdue, responses needed
2. **Mentions** — direct mentions in comments, messages, tasks
3. **Updates** — progress on items the user follows
4. **Alerts** — system alerts, security alerts, SLA breaches
5. **Announcements** — company-wide announcements from management

**Inbox rules:**
- Items older than 30 days that required no action are auto-archived
- Starred items are pinned regardless of age
- Priority items (security, safety, critical approvals) are always at the top regardless of date
- Group CEO sees inbox aggregated across all companies in their group

---

*Part 1 Complete — Continues in MASTER_ARCHITECTURE_BLUEPRINT_PART2.md*
*Part 2 covers: Security Architecture · Data Architecture · Integration Architecture*
