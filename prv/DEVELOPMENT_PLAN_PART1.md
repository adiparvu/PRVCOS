# PRV — Development Plan Part 1
**Version:** 1.0
**Status:** APPROVED — Ready for Implementation
**Date:** 2026-06-03
**Scope:** Epic Catalog · Feature Registry · Milestone Definitions · Dependency Graph

---

## Overview

PRV is structured into **26 Epics** spanning **63 two-week Sprints** (~126 weeks / ~2.5 years). Each Epic maps to one or more implementation phases from the approved roadmap. This document defines the complete work decomposition down to feature level.

**Sprint Cadence:** 2 weeks per sprint
**Team Cadence:** Sprint Planning (Monday Week 1) → Daily Standups → Sprint Review + Retro (Friday Week 2)
**Release Cadence:** Continuous deployment to staging; production releases at milestone gates

---

## Epic Catalog

### Epic 01 — Platform Foundation & Infrastructure

**Phase:** 0 (Weeks 1–4, Sprints 1–2)
**Goal:** Establish the monorepo, CI/CD pipeline, database, and all developer tooling before any feature work begins.

#### Features

| Feature ID | Feature Name | Description | Priority |
|-----------|-------------|-------------|---------|
| F01-01 | Monorepo Setup | Turborepo + pnpm workspace with `apps/web`, `apps/mobile`, `apps/marketing`, `packages/ui`, `packages/db`, `packages/approval-engine`, `packages/ai-engine` | P0 |
| F01-02 | Database Bootstrap | Supabase project provisioned, connection pooling (PgBouncer), read replica configured, Row-Level Security enabled globally | P0 |
| F01-03 | CI/CD Pipeline | GitHub Actions: lint → type-check → test → build → deploy (staging auto, production manual) | P0 |
| F01-04 | Environment Configuration | `.env` schema, environment validation (Zod), secrets management | P0 |
| F01-05 | TypeScript Config | Strict TS config, shared tsconfig in `packages/tsconfig`, path aliases | P0 |
| F01-06 | Linting & Formatting | ESLint (enterprise ruleset) + Prettier + Husky pre-commit hooks | P0 |
| F01-07 | Logging Infrastructure | Structured logging (Pino), log shipping to Logtail/Axiom | P1 |
| F01-08 | Error Monitoring | Sentry (web + mobile), error grouping, source maps | P1 |
| F01-09 | Background Job Infrastructure | Inngest setup, 5-priority queue configuration, job monitoring dashboard | P0 |
| F01-10 | Cache Layer | Redis (Upstash) setup, rate limiting primitives, session store | P0 |
| F01-11 | File Storage | Supabase Storage buckets configured (documents, images, avatars), access policies | P0 |
| F01-12 | Email Infrastructure | Resend/SendGrid integration, email template system, domain verification | P1 |
| F01-13 | Search Infrastructure | Typesense cluster provisioned, admin key + scoped key strategy, collection schemas | P1 |
| F01-14 | Mobile Project Setup | Expo (React Native) project in `apps/mobile`, EAS Build configured, OTA updates | P0 |
| F01-15 | Marketing Site Shell | Next.js static site in `apps/marketing`, deployed to Vercel | P1 |
| F01-16 | Database Migration System | Migration runner, migration history table, seed scripts | P0 |
| F01-17 | Developer Documentation | README, CONTRIBUTING.md, local dev setup guide, architecture decision log | P2 |

---

### Epic 02 — Authentication & Security

**Phase:** 1 (Weeks 5–12, Sprints 3–6)
**Goal:** Implement the full 10-gate Zero Trust authentication and session management system. No feature can ship until auth is complete.

#### Features

| Feature ID | Feature Name | Description | Priority |
|-----------|-------------|-------------|---------|
| F02-01 | Email/Password Auth | Registration, login, email verification, password hashing (bcrypt) | P0 |
| F02-02 | TOTP MFA | Time-based one-time password, QR code enrollment, backup codes | P0 |
| F02-03 | SMS MFA | SMS OTP via Twilio, phone verification | P1 |
| F02-04 | Session Management | httpOnly SameSite=Strict JWT cookies, refresh token rotation, session table | P0 |
| F02-05 | Device Registry | Device fingerprinting, trusted device management, `devices` table | P0 |
| F02-06 | Face ID / Biometric | React Native biometrics (iOS Face ID, Android), local key storage | P0 |
| F02-07 | Password Reset Flow | Email-based reset, token expiry (15 min), rate limiting | P0 |
| F02-08 | Account Lockout | Brute force protection, exponential backoff, unlock flow | P0 |
| F02-09 | Re-authentication Gate | Sensitive action triggers re-auth (approve high-value, view salary) | P0 |
| F02-10 | Zero Trust Middleware | 10-gate request chain: auth → MFA → role → permission → scope → company → rate_limit → DLP → execute → audit | P0 |
| F02-11 | Rate Limiting | Redis sliding window, per-user + per-IP + per-endpoint limits | P0 |
| F02-12 | DLP Scanning | Data loss prevention middleware — detect mass export patterns | P1 |
| F02-13 | Audit Log Writer | Real-time SHA-256 chained audit log, async write, chain verification | P0 |
| F02-14 | Security Event Logger | High-priority security event capture, severity classification | P0 |
| F02-15 | Sysadmin JIT Protocol | Just-In-Time access: 2h max, justification required, 4-eyes approval, session timer | P0 |
| F02-16 | API Key System | Create / revoke API keys, HMAC signing, key hash storage | P1 |
| F02-17 | GDPR Erasure Pipeline | Data erasure request flow, per-table anonymization, audit chain preservation | P1 |

---

### Epic 03 — Multi-Company Architecture

**Phase:** 2 (Weeks 13–22, Sprints 7–11)
**Goal:** Build the full multi-tenancy layer: company isolation, group architecture, RLS policies, scope engine, and the foundational entity schema.

#### Features

| Feature ID | Feature Name | Description | Priority |
|-----------|-------------|-------------|---------|
| F03-01 | Company Entity | `companies`, `company_settings` tables, company creation API | P0 |
| F03-02 | User Entity | `users`, `user_profiles`, `company_memberships` tables | P0 |
| F03-03 | RLS Policy Engine | 5 RLS patterns implemented and tested across all foundation tables | P0 |
| F03-04 | Scope Middleware | 9-level scope resolver: Record → Team → Dept → Store → Region → Company → Group → Platform → Global | P0 |
| F03-05 | Company Isolation Tests | Automated tests verifying data never leaks across company boundaries | P0 |
| F03-06 | Group Architecture | `company_groups`, `group_memberships`, `group_kpi_snapshots` tables + Group CEO resolution | P0 |
| F03-07 | Multi-Company User | User can belong to multiple companies, active company context switching | P1 |
| F03-08 | Group KPI Aggregation | Nightly background job: aggregate company KPIs into group snapshots | P1 |
| F03-09 | Company Onboarding API | Create company, set up admin user, module enablement | P0 |
| F03-10 | Timezone Handling | IANA timezone per company, all timestamps stored UTC, displayed in company TZ | P0 |
| F03-11 | Currency Config | Per-company default currency, NUMERIC(19,4) for all monetary values | P0 |

---

### Epic 04 — Roles & Permissions

**Phase:** 2–3 (Weeks 13–30, Sprints 7–15)
**Goal:** Complete RBAC system — all 20 roles, permission catalog, temporary grants, and the permission check engine.

#### Features

| Feature ID | Feature Name | Description | Priority |
|-----------|-------------|-------------|---------|
| F04-01 | Role Registry | `roles` table, all 20 system roles seeded | P0 |
| F04-02 | Permission Catalog | `permissions` table, all permissions across 23 modules defined | P0 |
| F04-03 | Role-Permission Map | `role_permissions` junction, default permission sets per role | P0 |
| F04-04 | User Role Assignment | `user_role_assignments`, scope-aware role assignment API | P0 |
| F04-05 | Permission Check Engine | Runtime permission check function, used in Zero Trust middleware | P0 |
| F04-06 | Custom Roles | Company-level custom role creation, permission builder UI | P1 |
| F04-07 | Temporary Access Grants | `temporary_access_grants`, time-limited permission elevation | P1 |
| F04-08 | Role Inheritance | Manager roles inherit subordinate permissions where applicable | P0 |
| F04-09 | Permission Audit | Every permission check logged in audit_logs | P0 |
| F04-10 | Role Management UI | Role list, role detail, assign/remove roles to users, custom role builder | P1 |
| F04-11 | Scope Binding | Permission + scope validation combined (can this user act on this specific entity?) | P0 |

---

### Epic 05 — Design System & Navigation

**Phase:** 4 (Weeks 21–30, Sprints 11–15, concurrent with Phase 3)
**Goal:** Complete Liquid Glass design system, all navigation patterns, and shared component library usable by all subsequent epics.

#### Features

| Feature ID | Feature Name | Description | Priority |
|-----------|-------------|-------------|---------|
| F05-01 | Design Tokens | Color (B&W palette), spacing, radius, shadow, blur, typography scales — as CSS variables + Expo tokens | P0 |
| F05-02 | Glass Surface System | 4 glass levels (6%/10%/16%/22% opacity + blur 16/32/48/64px), top specular shine | P0 |
| F05-03 | Typography System | Font scale (title1→caption2), weight hierarchy, opacity hierarchy (95/65/35/15%) | P0 |
| F05-04 | Floating Tab Bar | Glass, rounded, 5 tabs, floating above content, spring-animated selection | P0 |
| F05-05 | Bottom Sheet System | 8 sheet types: Standard, Action, Form, Confirmation, Filter, Preview, Overlay, Fullscreen | P0 |
| F05-06 | Glass Card Component | Expandable glass cards, specular edge, floating shadow, spring expand animation | P0 |
| F05-07 | Glass Button System | Primary (white/inverted), Secondary (glass), Destructive, Icon variants, loading states | P0 |
| F05-08 | Glass Input System | Text inputs, search bar, textarea, select, date picker — all glass-styled | P0 |
| F05-09 | Toast Notifications | Glass toasts: emerge from bottom, auto-dismiss, progress bar, 4 severity levels | P0 |
| F05-10 | Context Menu | Long-press glass context menus, haptic trigger, action list | P0 |
| F05-11 | Command Palette | ⌘K glass search overlay, universal search, recent items, action shortcuts | P1 |
| F05-12 | Loading States | Shimmer skeleton (glass-tinted), spinner, progress bars | P0 |
| F05-13 | Empty States | Illustrated empty states per context, action CTA | P1 |
| F05-14 | Error States | Network error, permission denied, not found — per glass style | P0 |
| F05-15 | Navigation Shell | Tab bar, header, back navigation, deep-link resolver | P0 |
| F05-16 | Haptic Library | Haptic feedback map: every action type → haptic weight | P0 |
| F05-17 | Spring Animation Library | Bounce curve, smooth curve, emerge scale + blur + opacity | P0 |
| F05-18 | Dynamic Island Framework | Compact / expanded / minimal state templates + live activity updater | P1 |
| F05-19 | iPad Adaptive Layout | Split-view, sidebar + detail, adaptive column grid | P1 |
| F05-20 | Web Responsive Layout | Breakpoints: mobile 375 / tablet 768 / desktop 1280 / wide 1440 | P1 |
| F05-21 | Theme System | Light / Dark / System theme switching — per-user preference, synced across devices via `user_preferences` table; replaces "Dark Mode Only" baseline (overridden by Appearance & Personalization System, Sprint 05) | P0 |
| F05-22 | Glass Style System | Translucid / Tinted / Adaptive glass style variants — per-user preference; Adaptive auto-increases opacity on data-heavy screens while preserving Liquid Glass language | P0 |
| F05-23 | Appearance Provider | `AppearanceProvider` React context in `packages/ui`; applies `data-theme` + `data-glass` attributes to `<html>` SSR-safe; zero flash-of-wrong-theme; localStorage for instant load, server-synced via `/api/preferences` | P0 |

---

### Epic 06 — Shared Services

**Phase:** 3 (Weeks 21–28, Sprints 11–14)
**Goal:** Build the cross-module shared library components — Approval Engine, Universal Search, Universal Inbox, Notification dispatcher, and Realtime infrastructure.

#### Features

| Feature ID | Feature Name | Description | Priority |
|-----------|-------------|-------------|---------|
| F06-01 | Approval Engine Library | `packages/approval-engine`: createApprovalChain, submitForApproval, processApproval, delegateApproval, escalateApproval, getApprovalStatus | P0 |
| F06-02 | Approval Template System | Template creation, multi-stage chain configuration, role-based approver resolution | P0 |
| F06-03 | Approval UI Components | Approval inbox widget, approval detail sheet, approval history timeline | P0 |
| F06-04 | Notification Dispatcher | Template rendering, channel routing (push/email/SMS/in-app), queue-based send | P0 |
| F06-05 | Push Notification Setup | FCM (Android), APNs (iOS), web push, device token management | P0 |
| F06-06 | Real-time Layer | Supabase Realtime (critical), SSE (dashboard), Redis pub/sub (chat), polling fallback | P0 |
| F06-07 | Universal Search | Typesense integration, scoped search keys per company, multi-entity search | P1 |
| F06-08 | Universal Inbox | Aggregated notifications + approvals + messages in one inbox | P1 |
| F06-09 | Offline Support | Service Worker, IndexedDB sync queue, conflict resolution strategy | P2 |
| F06-10 | Webhook Infrastructure | Outbound HMAC-SHA256 webhooks, retry queue, delivery log | P2 |
| F06-11 | Background Job Patterns | Inngest functions for: nightly aggregations, report generation, sync jobs | P0 |

---

### Epic 07 — Project Management (Module 02)

**Phase:** 6 (Weeks 30–38, Sprints 15–19)
**Goal:** Full project management with Kanban, Sprint, Backlog, Milestones, Team assignment, and Budget tracking.

#### Features

| Feature ID | Feature Name | Description | Priority |
|-----------|-------------|-------------|---------|
| F07-01 | Project CRUD | Create, read, update, archive projects. Project card list. | P0 |
| F07-02 | Kanban Board | Drag-and-drop columns, LexoRank ordering, real-time sync | P0 |
| F07-03 | Task CRUD | Create/edit/delete tasks. Assignee, due date, priority, estimate. | P0 |
| F07-04 | Task Detail | Comments thread, file attachments, history log, status transitions | P0 |
| F07-05 | Sprint System | Sprint creation, backlog → sprint assignment, sprint start/complete | P0 |
| F07-06 | Backlog Management | Prioritized backlog, filter/sort, bulk actions | P0 |
| F07-07 | Milestones | Milestone creation, linked tasks, timeline view | P1 |
| F07-08 | Team Membership | Add/remove members, role-in-project, workload view | P0 |
| F07-09 | Project Budget | Budget allocation, expense tracking, budget vs actual chart | P1 |
| F07-10 | Sprint Reports | Burndown chart, velocity, completed vs planned | P1 |
| F07-11 | Project Search | Full-text search via Typesense, filter by status/member/date | P1 |
| F07-12 | Approval Integration | Project approval gates using Approval Engine | P1 |
| F07-13 | Notifications | Task assigned, task overdue, blocker added, sprint ending, milestone due | P0 |
| F07-14 | AI Project Assistant | AI chat anchored to project context | P2 |

---

### Epic 08 — Attendance & Workforce (Modules 03 & 04)

**Phase:** 7 (Weeks 38–46, Sprints 19–23)
**Goal:** Complete attendance tracking (clock-in/out, leave, overtime, schedules) and workforce structure (departments, positions, teams).

#### Features

| Feature ID | Feature Name | Description | Priority |
|-----------|-------------|-------------|---------|
| F08-01 | Clock In / Out | GPS-verified clock-in, photo capture option, offline queue | P0 |
| F08-02 | Attendance Record | Daily attendance log, late/absent classification, hours calculation | P0 |
| F08-03 | Leave Request | Multi-type leave, balance tracking, manager approval flow | P0 |
| F08-04 | Leave Calendar | Company-wide leave calendar, team view, department view | P0 |
| F08-05 | Leave Types | Configurable leave types, accrual rules, carry-over policy | P1 |
| F08-06 | Overtime Requests | Overtime request, manager approval, payroll integration trigger | P0 |
| F08-07 | Schedule Builder | Shift creation, recurring shifts, bulk assignment, visual timeline | P0 |
| F08-08 | Attendance Reports | Attendance rate, late arrival, absence report, export | P1 |
| F08-09 | Department Structure | Create/edit departments, parent-child hierarchy | P0 |
| F08-10 | Position Management | Define positions, link to departments, salary bands | P0 |
| F08-11 | Team Management | Create teams, assign members, team lead assignment | P0 |
| F08-12 | Org Chart | Visual organizational hierarchy, zoomable, PDF export | P1 |
| F08-13 | Dynamic Island: Clock | Live timer during clocked-in session | P1 |
| F08-14 | Notifications | Shift reminder, late alert, leave approved/rejected, overtime approved | P0 |

---

### Epic 09 — Human Resources (Module 05)

**Phase:** 8 (Weeks 46–52, Sprints 23–26)
**Goal:** Complete employee lifecycle management: hiring, onboarding, contracts, performance reviews, payroll coordination.

#### Features

| Feature ID | Feature Name | Description | Priority |
|-----------|-------------|-------------|---------|
| F09-01 | Employee Profile | Full employee record, personal info, position, status | P0 |
| F09-02 | Onboarding Wizard | Step-by-step new employee setup: profile → contract → account → docs → checklist | P0 |
| F09-03 | Contract Management | Contract creation, version history, expiry tracking, e-signature | P0 |
| F09-04 | Employee Documents | Personal document storage: ID, certificates, signed contracts | P0 |
| F09-05 | Performance Reviews | Review template, cycle management, rating, feedback, approval | P1 |
| F09-06 | Payroll Run | Payroll period, employee inclusion, deductions, payslip generation, approval | P0 |
| F09-07 | Payslip Generation | PDF payslip per employee, download, archive | P0 |
| F09-08 | Salary Management | Salary record, change request, approval chain, history | P1 |
| F09-09 | Offboarding | Offboarding checklist, final settlement, account deactivation | P1 |
| F09-10 | HR Reports | Headcount, turnover, tenure, cost per hire, compensation bands | P1 |
| F09-11 | Certificate Expiry Tracker | Track expiring employee licenses/certifications, alerts | P1 |
| F09-12 | Notifications | Contract expiry, payslip ready, review due, onboarding step | P0 |

---

### Epic 10 — Renovation Services (Module 22)

**Phase:** 7.5 (Weeks 42–54, Sprints 21–27)
**Goal:** The primary revenue platform. Full renovation project lifecycle from inquiry to sign-off and invoicing.

#### Features

| Feature ID | Feature Name | Description | Priority |
|-----------|-------------|-------------|---------|
| F10-01 | Renovation Project CRUD | Create/edit/archive renovation projects, status machine, project code | P0 |
| F10-02 | Phase Management | Define phases, sequence, progress tracking, phase dependencies | P0 |
| F10-03 | Site Task Board | On-site task management, supervisor-optimized mobile UI | P0 |
| F10-04 | Estimation Builder | Line-item estimator: labor / materials / subcontractors, tax calculation, PDF generation | P0 |
| F10-05 | Estimate Approval | Internal approval + client send + client acceptance flow | P0 |
| F10-06 | Contract Management | Contract generation from accepted estimate, e-signature, version history | P0 |
| F10-07 | Daily Site Report | Mobile-optimized form: workers, work done, materials, photos, % delta | P0 |
| F10-08 | Site Photo Gallery | Timestamped photos from site reports, client-approved gallery | P0 |
| F10-09 | Material Request | Request materials from site, approval, conversion to purchase order | P0 |
| F10-10 | Phase Sign-Off | Client approval workflow for phase completion, digital signature | P0 |
| F10-11 | Client Approval Center | Client-facing phase sign-off with digital signature and photo gallery | P0 |
| F10-12 | Worker Attendance (Site) | Workers clocked in on site, supervisor clock-in management | P0 |
| F10-13 | Invoice Integration | Renovation project → invoice generation trigger | P0 |
| F10-14 | Project AI Assistant | AI insights for timeline, cost variance, risk prediction | P2 |
| F10-15 | Notifications | Delivery expected, material approved, phase sign-off needed, daily report due | P0 |

---

### Epic 11 — Shop & Inventory (Module 06)

**Phase:** 9 (Weeks 56–64, Sprints 28–32)
**Goal:** Full e-commerce platform: product catalog, POS, inventory management across multiple locations, order management, and discount system.

#### Features

| Feature ID | Feature Name | Description | Priority |
|-----------|-------------|-------------|---------|
| F11-01 | Product Catalog | CRUD: products, categories (hierarchical), images, attributes | P0 |
| F11-02 | Product Variants | Variant generation, variant-specific pricing, SKU management | P0 |
| F11-03 | Price Tier Management | Volume pricing, client-type pricing, date-bound pricing | P1 |
| F11-04 | Inventory Management | Multi-location stock, quantity tracking, reorder points | P0 |
| F11-05 | POS Interface | Barcode scan, cart builder, payment processing, receipt | P0 |
| F11-06 | Order Management | Order creation, fulfillment pipeline, status tracking | P0 |
| F11-07 | Return Processing | Return request, refund, restock option | P0 |
| F11-08 | Discount System | Discount codes, % and fixed, conditions, approval for high-value | P0 |
| F11-09 | Inventory Movements | Immutable ledger of all stock changes, movement history | P0 |
| F11-10 | Stock Counts | Manual inventory count entry, discrepancy report | P1 |
| F11-11 | Stock Transfers | Transfer between locations, receipt confirmation | P1 |
| F11-12 | Product Search | Typesense full-text search, barcode scanner | P0 |
| F11-13 | Shop Analytics | Revenue by product/category/store, top sellers | P1 |
| F11-14 | Notifications | Stock-out, low stock, large order, discount approval needed | P0 |

---

### Epic 12 — CRM & Client Portal (Module 07)

**Phase:** 11 (Weeks 68–76, Sprints 34–38)
**Goal:** Client relationship management — clients, contacts, opportunities, quotes — plus the authenticated client portal.

#### Features

| Feature ID | Feature Name | Description | Priority |
|-----------|-------------|-------------|---------|
| F12-01 | Client Management | Client CRUD, client type, status, account manager assignment | P0 |
| F12-02 | Contact Management | Multiple contacts per client, primary contact, portal access grant | P0 |
| F12-03 | Client Address Book | Multiple address types, default billing/shipping | P0 |
| F12-04 | Interaction Log | Log calls, emails, meetings, visits, outcomes | P0 |
| F12-05 | Opportunity Pipeline | Kanban funnel, probability, expected value, close date | P0 |
| F12-06 | Quote Management | Quote generation, approval, send to client, acceptance tracking | P0 |
| F12-07 | Client Portal Auth | External client login, magic link or email/password, limited scope | P0 |
| F12-08 | Client Project View | Portal: project progress, phases, photos, timeline | P0 |
| F12-09 | Client Document Center | Portal: contracts, estimates, invoices — view/download/sign | P0 |
| F12-10 | Client Messaging | Portal: message project team, read-only history | P0 |
| F12-11 | Client Invoice View | Portal: outstanding invoices, payment instructions | P0 |
| F12-12 | Quote Accept Flow | Client accepts/rejects estimate via portal | P0 |
| F12-13 | Notifications | New inquiry, opportunity stage change, quote accepted/rejected | P0 |

---

### Epic 13 — Finance & Accounting (Module 08)

**Phase:** 12 (Weeks 74–84, Sprints 37–42)
**Goal:** Complete financial operations: invoicing (including Romanian e-Factura), payment tracking, expense management, budgets, P&L.

#### Features

| Feature ID | Feature Name | Description | Priority |
|-----------|-------------|-------------|---------|
| F13-01 | Invoice Generation | Create invoices: from project, from order, manual. Line items, tax, PDF. | P0 |
| F13-02 | Invoice Series Management | Invoice series (FC, etc.), sequential numbering, per-company config | P0 |
| F13-03 | e-Factura Integration | ANAF API integration, XML generation, submission, status polling | P0 |
| F13-04 | Payment Recording | Record incoming payments, payment methods, bank reference | P0 |
| F13-05 | Payment Allocation | Allocate payment to one or multiple invoices (partial/split) | P0 |
| F13-06 | AR Management | Outstanding invoices, aged AR report, overdue alerts, collection queue | P0 |
| F13-07 | Expense Claims | Employee expense submission, receipt upload, manager approval, payroll sync | P0 |
| F13-08 | Budget Management | Budget creation (annual/project/department), approval, tracking | P0 |
| F13-09 | Cost Centers | Cost center hierarchy, revenue and cost allocation | P1 |
| F13-10 | P&L Statement | Computed P&L by period, revenue breakdown, expense breakdown, export | P0 |
| F13-11 | Cash Flow Forecast | 30/60/90-day projection based on AR/AP schedule | P1 |
| F13-12 | VAT Report | Period VAT summary, export for accounting | P1 |
| F13-13 | Approval Integration | Invoice approval, expense approval, budget approval | P0 |
| F13-14 | Notifications | Invoice paid, invoice overdue, expense submitted, budget overrun | P0 |

---

### Epic 14 — Document Center (Module 09)

**Phase:** 12 (Weeks 74–84, Sprints 37–42, concurrent with Finance)
**Goal:** Centralized document management: folders, versioning, GDPR access log, share tokens, e-signatures.

#### Features

| Feature ID | Feature Name | Description | Priority |
|-----------|-------------|-------------|---------|
| F14-01 | Folder Structure | Hierarchical folders, visibility levels, type classification | P0 |
| F14-02 | Document Upload | Multi-file upload, version creation, checksum validation | P0 |
| F14-03 | Document Viewer | In-app PDF/image viewer, glass overlay | P0 |
| F14-04 | Version History | Per-document version list, restore/compare | P1 |
| F14-05 | Access Log | Immutable view/download/print log, GDPR audit | P0 |
| F14-06 | Document Sharing | Internal + external share tokens, password protection, expiry | P1 |
| F14-07 | Document Search | Full-text search via Typesense, tag filtering | P1 |
| F14-08 | E-signature Flow | Sign document in-app: review → draw/type signature → OTP → submit | P1 |
| F14-09 | Document Templates | Reusable templates for contracts, reports, policies | P1 |
| F14-10 | Retention Policy | Auto-archive based on retention_date, GDPR compliance | P1 |
| F14-11 | Module Integration | All modules link documents: invoices, contracts, POs, site reports | P0 |

---

### Epic 15 — Communication Center (Module 10)

**Phase:** 13 (Weeks 80–88, Sprints 40–44)
**Goal:** Internal messaging platform. Channels, DMs, threads, reactions, file attachments — powered by Redis pub/sub real-time.

#### Features

| Feature ID | Feature Name | Description | Priority |
|-----------|-------------|-------------|---------|
| F15-01 | Channel Management | Create/archive public and private channels, auto-create project channels | P0 |
| F15-02 | Channel Membership | Join/leave, admin roles, member roster | P0 |
| F15-03 | Message Sending | Text, rich text, emoji, mentions, real-time delivery | P0 |
| F15-04 | Message Threading | Reply in thread, thread view, thread reply count | P0 |
| F15-05 | Reactions | Emoji reactions, reaction counts, per-user reaction | P0 |
| F15-06 | File Attachments | Upload files to messages, save to Document Center | P0 |
| F15-07 | Message Search | Full-text search across channels (Typesense) | P1 |
| F15-08 | Unread Badges | Per-channel unread count, last_read_at tracking | P0 |
| F15-09 | Mute / Notification Prefs | Per-channel notification preferences | P1 |
| F15-10 | Direct Messages | 1:1 DMs, cross-company DMs for Group CEO | P0 |
| F15-11 | AI Summary | AI-generated channel summary for catching up | P2 |

---

### Epic 16 — Notification Center (Module 11)

**Phase:** 14 (Weeks 88–96, Sprints 44–48)
**Goal:** Universal notification delivery: template system, preference management, in-app inbox, push, email, SMS delivery and tracking.

#### Features

| Feature ID | Feature Name | Description | Priority |
|-----------|-------------|-------------|---------|
| F16-01 | Notification Templates | Template registry, multi-channel rendering, Handlebars variables | P0 |
| F16-02 | Notification Inbox | In-app inbox: unread, read, archived, action buttons | P0 |
| F16-03 | Push Delivery | APNs + FCM delivery, device token management, batch push | P0 |
| F16-04 | Email Delivery | Transactional emails via Resend/SendGrid, HTML templates | P0 |
| F16-05 | SMS Delivery | Critical alerts via Twilio, opt-in management | P1 |
| F16-06 | Delivery Tracking | Per-channel delivery status, retry queue, failure handling | P0 |
| F16-07 | User Preferences | Per-template, per-channel opt-out, quiet hours | P0 |
| F16-08 | Batch Notifications | Announcements to roles/departments, digest emails | P1 |
| F16-09 | Suppression Window | Deduplication within configurable time window | P1 |
| F16-10 | Notification Analytics | Delivery rates, open rates, click rates by template | P2 |

---

### Epic 17 — Analytics Platform (Module 12)

**Phase:** 15 (Weeks 96–104, Sprints 48–52)
**Goal:** Three-layer analytics: raw event capture → daily rollups → dashboard widgets and saved reports.

#### Features

| Feature ID | Feature Name | Description | Priority |
|-----------|-------------|-------------|---------|
| F17-01 | Event Tracking | Auto-capture all navigation, action, business events into analytics_events | P0 |
| F17-02 | Daily Rollup Jobs | Nightly Inngest jobs computing analytics_daily_rollups per metric | P0 |
| F17-03 | KPI Cards | Real-time KPI card components, refresh on schedule | P0 |
| F17-04 | Charts Library | Line, bar, donut, area charts — all glass-styled | P0 |
| F17-05 | Dashboard Widgets | Configurable widget grid, drag-to-arrange, size variants | P0 |
| F17-06 | Report Builder | Metric + dimension + period + chart type → saved report | P1 |
| F17-07 | Report Runner | On-demand and scheduled report execution, output to PDF/CSV | P1 |
| F17-08 | Revenue Analytics | Revenue by source, period, client, project — drill-down | P0 |
| F17-09 | Workforce Analytics | Headcount, attendance, turnover, tenure charts | P1 |
| F17-10 | Project Analytics | Completion rate, cycle time, budget vs actual | P1 |
| F17-11 | Shop Analytics | Sales, product performance, inventory turnover | P1 |
| F17-12 | Custom Report Scheduling | Schedule reports, email delivery to recipients | P2 |

---

### Epic 18 — Command Center (Module 21)

**Phase:** 16 (Weeks 100–106, Sprints 50–53)
**Goal:** Executive dashboards for CEO, Co-CEO, and Group CEO. The 60-second rule dashboard. Group-level consolidated KPI cockpit.

#### Features

| Feature ID | Feature Name | Description | Priority |
|-----------|-------------|-------------|---------|
| F18-01 | CEO Dashboard | 60-second rule: all critical KPIs in one screen, auto-refresh | P0 |
| F18-02 | Group CEO Dashboard | Consolidated multi-company view, per-company drill-down | P0 |
| F18-03 | Alert Center | Critical alert aggregation, resolve/escalate, alert history | P0 |
| F18-04 | Real-time KPI Updates | Supabase Realtime for live KPI refresh without polling | P0 |
| F18-05 | Executive AI Insights | AI-generated daily insight brief, forecast cards | P1 |
| F18-06 | KPI Target Management | Set revenue targets, project targets, attendance targets | P1 |
| F18-07 | Approval Quick-Fire | Batch approval UI optimized for high-volume approvers | P0 |
| F18-08 | Cross-Company Comparison | Group CEO: side-by-side company performance | P1 |

---

### Epic 19 — AI Platform (Module 13)

**Phase:** 17 (Weeks 104–112, Sprints 52–56)
**Goal:** AI Center with role-scoped assistants, proactive insights, knowledge extraction, and cost governance.

#### Features

| Feature ID | Feature Name | Description | Priority |
|-----------|-------------|-------------|---------|
| F19-01 | AI Chat Interface | Role-scoped chat, conversation history, context injection | P0 |
| F19-02 | AI Agent Types | 6 agent types: general, project, finance, HR, renovation, report builder | P0 |
| F19-03 | AI Tool Permission Manifest | Gate 4 enforcement: all AI tool calls checked against user permissions | P0 |
| F19-04 | Proactive Insights Engine | Background AI job: generate daily insights per company | P0 |
| F19-05 | Insight Dashboard | Insight feed, severity, dismiss, act, share | P0 |
| F19-06 | Report Builder AI | Natural language → report query → executed report | P1 |
| F19-07 | Knowledge Extraction | AI extracts facts from documents, stores in knowledge base | P2 |
| F19-08 | Vector Search | pgvector HNSW semantic similarity search for knowledge | P2 |
| F19-09 | AI Cost Dashboard | Token usage, cost per company/model/agent, budget alerts | P1 |
| F19-10 | Prompt Injection Defense | Structural separation of system vs user prompts, output validation | P0 |
| F19-11 | AI Feedback | Thumbs up/down per message, feedback analytics | P1 |

---

### Epic 20 — Safety Center (Module 20)

**Phase:** 18 (Weeks 108–114, Sprints 54–57)
**Goal:** Workplace safety management: incidents, inspections, briefings, acknowledgments.

#### Features

| Feature ID | Feature Name | Description | Priority |
|-----------|-------------|-------------|---------|
| F20-01 | Incident Reporting | Safety incident form, severity levels, regulatory reporting flag | P0 |
| F20-02 | Incident Investigation | Assign investigator, root cause, corrective actions, close | P0 |
| F20-03 | Safety Inspections | Checklist-based inspections, pass/fail, corrective actions | P0 |
| F20-04 | Safety Briefings | Deliver briefing, worker acknowledgment, digital signature | P0 |
| F20-05 | Safety Dashboard | Incident frequency rate, inspection results, open items | P1 |
| F20-06 | Integration | Linked to renovation projects, departments, fleet | P0 |

---

### Epic 21 — Knowledge Base (Module 18)

**Phase:** 19 (Weeks 110–114, Sprints 55–57)
**Goal:** Internal company knowledge repository with spaces, articles, versioning, AI-enhanced tagging and search.

#### Features

| Feature ID | Feature Name | Description | Priority |
|-----------|-------------|-------------|---------|
| F21-01 | Spaces | Create/manage knowledge spaces by department/topic | P0 |
| F21-02 | Article Editor | Rich text MDX editor, version auto-save, publish workflow | P0 |
| F21-03 | Article Search | Full-text search (Typesense), AI-suggested related articles | P0 |
| F21-04 | Article Feedback | Helpful / Not helpful, improvement suggestions | P1 |
| F21-05 | Version History | Article revision history, restore | P1 |
| F21-06 | AI Article Summary | Auto-generate excerpt and AI tags on publish | P2 |

---

### Epic 22 — Learning Center (Module 19)

**Phase:** 20 (Weeks 113–118, Sprints 57–59)
**Goal:** Structured LMS: courses, lessons, quizzes, enrollments, progress tracking, certificates.

#### Features

| Feature ID | Feature Name | Description | Priority |
|-----------|-------------|-------------|---------|
| F22-01 | Course Management | Create/edit/publish courses, categories, difficulty, pass score | P0 |
| F22-02 | Lesson Builder | Video, article, quiz, document lesson types | P0 |
| F22-03 | Enrollment System | Self-enroll, HR-assign, mandatory role-based enrollment | P0 |
| F22-04 | Progress Tracking | Lesson-level progress, completion %, time spent | P0 |
| F22-05 | Quiz Engine | Question bank, quiz attempts, scoring, pass/fail | P0 |
| F22-06 | Certificate Generation | PDF certificate on completion, expiry tracking | P1 |
| F22-07 | Mandatory Training | Role-based mandatory course assignment, compliance tracking | P1 |
| F22-08 | Learning Reports | Completion rates, scores, compliance status per department | P1 |

---

### Epic 23 — Procurement Center (Module 15)

**Phase:** 21 (Weeks 116–122, Sprints 58–61)
**Goal:** End-to-end procurement: purchase orders, goods receipt, 3-way matching, supplier invoice management.

#### Features

| Feature ID | Feature Name | Description | Priority |
|-----------|-------------|-------------|---------|
| F23-01 | Purchase Order CRUD | Create/edit/cancel POs, line items, supplier selection | P0 |
| F23-02 | PO Approval | Multi-level approval chain via Approval Engine | P0 |
| F23-03 | PO Send to Supplier | PDF generation, email to supplier, portal notification | P0 |
| F23-04 | Goods Receipt | Confirm delivery, per-line acceptance, discrepancy logging | P0 |
| F23-05 | 3-Way Matching | PO ↔ Goods Receipt ↔ Supplier Invoice matching | P0 |
| F23-06 | Supplier Invoice Management | Receive, match, approve, schedule payment | P0 |
| F23-07 | Material Request Handling | Convert renovation material requests to POs | P0 |
| F23-08 | Procurement Reports | Spend analysis, supplier performance, cycle time | P1 |

---

### Epic 24 — Supplier Management (Module 23)

**Phase:** 21.5 (Weeks 119–124, Sprints 60–62)
**Goal:** Vendor relationship management, performance evaluations, price lists, and the external Supplier Portal.

#### Features

| Feature ID | Feature Name | Description | Priority |
|-----------|-------------|-------------|---------|
| F24-01 | Supplier Registry | Supplier CRUD, type, status, onboarding approval | P0 |
| F24-02 | Supplier Contacts | Multiple contacts, primary designation, portal access | P0 |
| F24-03 | Supplier Evaluations | Scoring: quality, delivery, price, communication, compliance | P0 |
| F24-04 | Supplier Documents | Insurance, certificates, compliance docs with expiry tracking | P0 |
| F24-05 | Price Lists | Agreed pricing, line items, validity dates, approval | P0 |
| F24-06 | Supplier Portal | External portal: view POs, acknowledge, submit invoices, update catalog | P0 |
| F24-07 | Portal Notifications | Email + push: new PO, payment issued, document expiry | P0 |
| F24-08 | Supplier Performance Dashboard | Aggregate scores, trend charts, evaluation history | P1 |

---

### Epic 25 — Tools & Fleet Management (Modules 16 & 17)

**Phase:** 22 (Weeks 122–128, Sprints 61–64)
**Goal:** Asset management for tools/equipment and vehicles. Assignments, maintenance, compliance, fuel tracking.

#### Features

| Feature ID | Feature Name | Description | Priority |
|-----------|-------------|-------------|---------|
| F25-01 | Tool Registry | Asset CRUD, barcode, status, location, assignment | P0 |
| F25-02 | Tool Assignment | Assign to user or project, return, condition tracking | P0 |
| F25-03 | Tool Maintenance | Maintenance records, scheduled service, completion | P1 |
| F25-04 | Vehicle Registry | Vehicle CRUD, plate, VIN, compliance dates, GPS | P0 |
| F25-05 | Vehicle Assignment | Assign to driver or project, odometer, return | P0 |
| F25-06 | Fuel Logging | Fuel fill-up entries, consumption analytics | P0 |
| F25-07 | Vehicle Maintenance | Service records, scheduled maintenance, provider | P0 |
| F25-08 | Compliance Tracking | ITP, insurance, vignette expiry alerts, renewal flow | P0 |
| F25-09 | Trip Logging | Manual or GPS trip log, purpose, distance | P1 |
| F25-10 | Fleet Reports | Fuel cost, utilization, maintenance cost, compliance status | P1 |

---

### Epic 26 — Public Application & Launch (Module 01)

**Phase:** 23–25 (Weeks 120–130, Sprints 60–65)
**Goal:** Marketing website (Phase 0 shell already done), full public app (portfolio, services, shop, quote request), final polish, performance, and production launch.

#### Features

| Feature ID | Feature Name | Description | Priority |
|-----------|-------------|-------------|---------|
| F26-01 | Public Homepage | Hero, services, portfolio, before/after gallery, reviews, contact | P0 |
| F26-02 | Public Shop | Product catalog, cart, checkout, order tracking | P0 |
| F26-03 | Quote Request Flow | Service selection → project description → contact info → submit | P0 |
| F26-04 | Portfolio Gallery | Completed projects, filters, image gallery | P1 |
| F26-05 | SEO Optimization | Next.js metadata, sitemap, structured data, Core Web Vitals | P1 |
| F26-06 | Performance Audit | Lighthouse, bundle analysis, lazy loading, image optimization | P0 |
| F26-07 | Accessibility Audit | WCAG 2.1 AA, screen reader test, keyboard navigation | P0 |
| F26-08 | Security Pentest | OWASP Top 10 review, penetration testing | P0 |
| F26-09 | Load Testing | k6 or Artillery load test against production targets | P0 |
| F26-10 | Data Migration | Import historical data (if applicable), validation, rollback plan | P1 |
| F26-11 | Production Runbook | Incident response, on-call rotation, SLA definitions | P1 |
| F26-12 | User Acceptance Testing | UAT with real users per role, bug resolution | P0 |

---

## Milestone Definitions

Milestones represent binary gates — the project either passes or it doesn't ship. Each milestone unlocks the next phase.

| Milestone | Name | Target Week | Exit Criteria |
|-----------|------|------------|---------------|
| M0 | Infrastructure Ready | Week 4 | Monorepo builds, DB migrates, CI passes, all dev tooling operational |
| M1 | Auth Complete | Week 12 | 10-gate Zero Trust chain verified, all auth flows tested, security review passed |
| M2 | Multi-Tenancy Stable | Week 22 | Company isolation verified (cross-company data leak tests pass), RLS policies audited |
| M3 | Foundation Stable | Week 30 | Roles + permissions + design system + shared services all operational |
| M4 | MVP Alpha | Week 42 | Projects + Attendance + Workforce live for internal team testing |
| M5 | Revenue Platform Live | Week 54 | Renovation Services + HR operational — first real client project can be managed |
| M6 | Commerce Live | Week 64 | Shop + POS operational, inventory management live |
| M7 | Client Portal Live | Week 76 | CRM + Client Portal — clients can log in and see their projects |
| M8 | Finance Live | Week 84 | Invoicing + e-Factura + AP/AR fully operational, ANAF integration tested |
| M9 | Platform Complete | Week 96 | All 23 modules live (Notifications + Analytics complete) |
| M10 | Intelligence Live | Week 106 | Command Center + AI Platform operational |
| M11 | Full Platform | Week 122 | All remaining modules: Safety, KB, Learning, Procurement, Suppliers, Tools, Fleet |
| M12 | Public Launch | Week 128 | Public app live, load tested, security reviewed, UAT complete |

---

## Epic Dependency Graph

An epic cannot begin until all its dependencies are complete.

```
Epic 01 (Infrastructure)
    └── Epic 02 (Auth)
            └── Epic 03 (Multi-Company)
                    └── Epic 04 (Roles & Permissions)
                    └── Epic 05 (Design System) ─── runs parallel
                    └── Epic 06 (Shared Services) ── runs parallel
                            │
                            ├── Epic 07 (Projects) ──────────────── M4
                            ├── Epic 08 (Attendance & Workforce) ── M4
                            │
                            ├── Epic 09 (HR) ──────────────────────── M5
                            ├── Epic 10 (Renovation Services) ─────── M5
                            │
                            ├── Epic 11 (Shop & Inventory) ────────── M6
                            │
                            ├── Epic 12 (CRM & Client Portal) ──────── M7
                            │
                            ├── Epic 13 (Finance) ──────────────────── M8
                            ├── Epic 14 (Document Center) ─────────── M8 (concurrent)
                            │
                            ├── Epic 15 (Communication) ────────────── depends: Epic 14
                            ├── Epic 16 (Notifications) ───────────── depends: Epic 15
                            │
                            ├── Epic 17 (Analytics) ────────────────── depends: Epics 07-16
                            ├── Epic 18 (Command Center) ───────────── depends: Epic 17
                            ├── Epic 19 (AI Platform) ──────────────── depends: Epic 17, 18
                            │
                            ├── Epic 20 (Safety) ──────────────────── depends: Epics 08, 10
                            ├── Epic 21 (Knowledge Base) ──────────── independent
                            ├── Epic 22 (Learning Center) ─────────── depends: Epic 09
                            │
                            ├── Epic 23 (Procurement) ─────────────── depends: Epics 11, 24
                            ├── Epic 24 (Supplier Management) ──────── depends: Epic 23
                            │
                            ├── Epic 25 (Tools & Fleet) ───────────── depends: Epics 08, 10
                            │
                            └── Epic 26 (Public App + Launch) ──────── depends: ALL complete
```

### Critical Path

The longest dependency chain defines the minimum duration:

```
Epic 01 → Epic 02 → Epic 03 → Epic 04+05+06 → Epic 07+08 → Epic 09+10 
→ Epic 11 → Epic 12 → Epic 13+14 → Epic 15 → Epic 16 → Epic 17 → Epic 18 
→ Epic 19 → Epic 26 (Launch)
```

Total critical path: ~126 weeks

### Parallel Opportunities

These epic pairs can run simultaneously with separate teams:
- Epic 05 (Design System) + Epic 03 (Multi-Company) — front-end team + back-end team
- Epic 09 (HR) + Epic 10 (Renovation) — parallel module teams
- Epic 13 (Finance) + Epic 14 (Documents) — same phase, independent features
- Epic 20 (Safety) + Epic 21 (Knowledge Base) — independent, same window
- Epic 23 (Procurement) + Epic 24 (Supplier) — tight coupling but can overlap

---

*End of DEVELOPMENT_PLAN_PART1.md — Continues in DEVELOPMENT_PLAN_PART2.md*

*Part 2 covers: Sprint Plan (Sprints 1–38, Phases 0–12)*
*Part 3 covers: Sprint Plan (Sprints 39–65, Phases 13–25) + Dependencies Matrix + Definition of Done + Team Structure + Risk Register*
