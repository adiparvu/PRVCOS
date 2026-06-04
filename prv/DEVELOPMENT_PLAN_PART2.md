# PRV — Development Plan Part 2
**Version:** 1.0
**Status:** APPROVED — Ready for Implementation
**Date:** 2026-06-03
**Scope:** Sprint Plan — Sprints 1–40 (Phases 0–12)

---

## Sprint Planning Conventions

- **Sprint Duration:** 2 weeks (10 working days)
- **Story Point Scale:** Fibonacci (1, 2, 3, 5, 8, 13, 21)
- **Team Velocity Target:** 40–60 points per sprint (calibrate after Sprint 3)
- **Sprint Start:** Monday morning
- **Sprint End:** Friday afternoon (Sprint Review + Retro)
- **Planning Format:** Sprint Goal → Deliverables → Stories → Acceptance Criteria

Each sprint entry defines:
- **Goal:** One sentence that summarizes what "done" means for this sprint
- **Epic:** Which epic(s) are in scope
- **Key Deliverables:** What shippable artifacts exist at end of sprint
- **Stories:** The work items (abbreviated; full stories in project tracker)
- **Acceptance Criteria:** Binary pass/fail for each deliverable

---

## Phase 0 — Developer Infrastructure
**Weeks 1–4 · Sprints 1–2**

---

### Sprint 01 — Weeks 1–2

**Goal:** Monorepo is set up, CI/CD is green, database is provisioned, and every developer can run the project locally.

**Epic:** 01 (Infrastructure)

**Key Deliverables:**
- Turborepo monorepo with all workspace packages
- GitHub Actions CI pipeline (lint + typecheck + build)
- Supabase project provisioned with PgBouncer and read replica
- Local development: `pnpm dev` starts all services

**Stories:**
- Initialize Turborepo with pnpm workspaces
- Create `apps/web` (Next.js 16), `apps/mobile` (Expo), `apps/marketing`
- Create `packages/ui`, `packages/db`, `packages/approval-engine`, `packages/ai-engine`, `packages/tsconfig`
- Configure strict TypeScript across all packages
- Set up ESLint (enterprise ruleset) + Prettier + Husky
- Provision Supabase project: primary DB + read replica
- Enable pgvector extension
- Set up PgBouncer connection pooling
- Configure Row-Level Security (global enable)
- Create GitHub Actions: lint → typecheck → test → staging deploy
- Set up environment variable schema with Zod validation
- Document local setup in README

**Acceptance Criteria:**
- `pnpm lint` passes with zero errors
- `pnpm typecheck` passes with zero errors
- `pnpm build` succeeds for all apps
- CI pipeline completes in < 10 minutes
- Supabase console shows active primary + replica
- Any team member can run `pnpm dev` and access the app

---

### Sprint 02 — Weeks 3–4

**Goal:** All supporting infrastructure is operational: job queue, cache, file storage, email, search, mobile build, and error monitoring.

**Epic:** 01 (Infrastructure)

**Key Deliverables:**
- Inngest job queue with test event firing
- Redis (Upstash) cache layer with rate limit primitives
- Supabase Storage buckets configured
- Resend/SendGrid email sending verified
- Typesense cluster provisioned
- Expo project builds on EAS
- Sentry error monitoring active on all apps
- Migration runner operational

**Stories:**
- Set up Inngest: workspace, API key, 5-priority queue constants
- Write first test Inngest function (ping job)
- Configure Redis (Upstash): connection, rate limit library setup
- Create Supabase Storage buckets: `documents`, `images`, `avatars`
- Configure storage access policies (authenticated only)
- Integrate Resend: transactional email client, test email send
- Provision Typesense cluster: collections schema draft
- Set up Expo project with EAS Build, first build passes
- Configure OTA updates (Expo Updates)
- Add Sentry to `apps/web` and `apps/mobile`
- Write migration runner using Supabase migrations
- Create `migration_history` table, first migration applied
- Create database seed script for development

**Acceptance Criteria:**
- Inngest dashboard shows test job executed successfully
- Redis ping latency < 5ms
- Test email received in inbox
- Typesense `/health` returns 200
- EAS build produces installable APK/IPA
- Sentry shows test error captured
- First DB migration applies cleanly and is recorded in migration_history

---

## Phase 1 — Authentication & Security
**Weeks 5–12 · Sprints 3–6**

---

### Sprint 03 — Weeks 5–6

**Goal:** Email/password registration and login work end-to-end. Sessions are established with httpOnly cookies. Basic security middleware is in place.

**Epic:** 02 (Authentication)

**Key Deliverables:**
- Registration flow (web + mobile)
- Login flow with session creation
- httpOnly SameSite=Strict cookie sessions
- Email verification
- Active session stored in DB

**Stories:**
- Create `users`, `user_profiles`, `active_sessions`, `devices` tables
- Write registration API: validate email, hash password, create user + session
- Write login API: verify credentials, create session, set cookie
- Email verification: token generation, send email, verify endpoint
- Implement session middleware: parse cookie → verify → attach user to request
- Refresh token rotation logic
- Device fingerprinting on first login
- Registration UI (web): form, validation, success state
- Login UI (web): form, error states, redirect
- Registration/Login screens (mobile): glass-styled forms

**Acceptance Criteria:**
- New user can register and receive verification email
- Verified user can log in and be redirected to dashboard
- Session cookie is httpOnly and SameSite=Strict
- Unverified user is blocked from accessing protected routes
- Session persists across browser refresh
- Mobile app login stores session and navigates to home

---

### Sprint 04 — Weeks 7–8

**Goal:** MFA (TOTP + SMS) is enrolled and enforced. Password reset works. Account lockout prevents brute force.

**Epic:** 02 (Authentication)

**Key Deliverables:**
- TOTP MFA enrollment and verification
- SMS OTP (Twilio) enrollment and verification
- Password reset flow (email-based)
- Account lockout after N failed attempts
- Backup codes for TOTP

**Stories:**
- TOTP: generate secret, QR code, enrollment endpoint, verify code
- Backup codes: generate 10 codes on enrollment, hash and store, verify on use
- SMS OTP: Twilio integration, phone verification, OTP send/verify endpoint
- MFA enforcement middleware: require MFA after primary auth
- Password reset: request endpoint (rate limited), token email, reset endpoint
- Account lockout: track failed attempts in Redis, progressive delay, lock at threshold
- Unlock flow: email-based unlock or admin unlock
- MFA enrollment UI: QR code display, code entry, backup code reveal
- MFA verification UI: code entry screen
- Password reset UI: request form, email sent confirmation, new password form

**Acceptance Criteria:**
- User can enroll TOTP with authenticator app and verify code
- Backup code works after TOTP device is lost
- SMS OTP sends to verified phone number
- Password reset email arrives within 2 minutes
- Account locks after 10 failed login attempts
- Locked account cannot attempt login

---

### Sprint 05 — Weeks 9–10

**Goal:** Zero Trust 10-gate middleware chain is implemented and tested. Audit log writer is operational and producing chained hashes.

**Epic:** 02 (Authentication)

**Key Deliverables:**
- 10-gate request middleware (server-side)
- Audit log writer with SHA-256 chain
- Rate limiting middleware (Redis sliding window)
- Re-authentication gate
- Security event logger

**Stories:**
- Implement middleware chain: auth → MFA check → role load → permission check → scope validate → company check → rate limit → DLP scan → execute → audit write
- Write permission check engine: load user permissions, match against required permission
- Write scope validation: compare user scope level vs required scope, entity ownership check
- Write company isolation check: entity company_id must match user company context
- Rate limit middleware: Redis sliding window, per-user + per-IP + per-endpoint config
- Audit log writer: async writer, SHA-256(sequence + content + prev_hash), store in audit_logs
- Chain verifier: CLI command to verify chain integrity for a company + date range
- Re-auth gate: trigger re-auth for sensitive operations (flag on route definition)
- Security event logger: capture auth failures, privilege escalations, DLP triggers
- Unit tests: each gate tested independently with mock data
- Integration tests: full chain with real test DB

**Acceptance Criteria:**
- All 10 gates execute in < 10ms overhead (p99)
- Unauthorized user receives 403 at correct gate (not 500)
- Wrong company access returns 403 at gate 6
- Rate limit returns 429 after threshold
- Every API request writes exactly one audit log entry
- Audit chain verifier confirms integrity after 1000 sequential writes
- Security events are captured for all auth failures

---

### Sprint 06 — Weeks 11–12

**Goal:** Face ID / biometric login works on mobile. Sysadmin JIT protocol is implemented. GDPR erasure pipeline is built. Auth is complete.

**Epic:** 02 (Authentication)

**Key Deliverables:**
- Face ID / biometric login (iOS + Android)
- Sysadmin JIT access: request → 4-eyes approval → 2h session → audit
- GDPR data erasure request flow
- API key creation and authentication
- Auth milestone M1 sign-off

**Stories:**
- Mobile biometrics: integrate `expo-local-authentication`, store session token in Secure Store
- Biometric login flow: check biometric availability → authenticate → restore session
- JIT access: `sysadmin_access_sessions` table, request endpoint, second-approver notification, start session with timer, auto-expire at 2h
- JIT impersonation: set impersonated user context, log every action as `impersonated_by`
- JIT break-glass: emergency single-approver with mandatory justification + security event
- Data erasure: `data_erasure_requests` table, per-table anonymization plan, execution pipeline, audit proof
- API key: create (show raw key once), store SHA-256 hash, authenticate via Authorization header
- Full auth integration test: register → verify → enroll MFA → login with MFA → Face ID re-login → JIT session → erasure request → API key auth
- Security review of auth implementation (checklist)

**Acceptance Criteria:**
- Face ID login completes in < 2 seconds after approval
- JIT session auto-expires at exactly 2 hours
- All JIT actions have `impersonated_by` in audit log
- Erasure pipeline produces `verification_hash` proof
- API key auth works for all protected endpoints
- M1 milestone checklist signed off

---

## Phase 2 — Multi-Company Architecture
**Weeks 13–22 · Sprints 7–11**

---

### Sprint 07 — Weeks 13–14

**Goal:** Core company and user entities are built with full multi-tenancy isolation. RLS policies enforce company boundaries.

**Epic:** 03 (Multi-Company)

**Key Deliverables:**
- `companies`, `company_settings` tables + API
- `users`, `user_profiles`, `company_memberships` tables
- 5 RLS patterns implemented and applied to all tables
- Company isolation integration tests passing

**Stories:**
- Create and migrate all foundation tables from DATABASE_BLUEPRINT_PART1
- Implement Pattern 1 RLS (self-only) on: active_sessions, user_profiles
- Implement Pattern 2 RLS (company read) on: company_settings
- Implement Pattern 3 RLS (scope-based) on: company_memberships
- Implement Pattern 4 RLS (elevated read) on: security_events
- Implement Pattern 5 RLS (system-only) on: system tables
- Company creation API: validate unique slug, create company, first-admin membership
- User-company membership: add member, set role, company context switching
- Company settings API: read/write settings, cache in Redis
- Integration test suite: cross-company data access attempts all return 0 rows

**Acceptance Criteria:**
- User A at Company A cannot read any row from Company B (verified in 50+ test cases)
- Company creation creates correct default settings
- Membership change is reflected immediately (no cache stale)
- All 5 RLS patterns documented with test coverage

---

### Sprint 08 — Weeks 15–16

**Goal:** Group architecture is operational. Group CEO role can see aggregated data across their companies. Nightly KPI aggregation runs.

**Epic:** 03 (Multi-Company)

**Key Deliverables:**
- `company_groups`, `group_memberships`, `group_kpi_snapshots` tables
- Group CEO user creation and scope assignment
- Group KPI nightly aggregation job
- Multi-company user: context switching

**Stories:**
- Create group tables and migrations
- Group CEO scope resolver: resolve companies in group, validate ownership
- Group membership API: add/remove companies from group
- Group KPI snapshot job (Inngest nightly): aggregate revenue, headcount, projects per company into snapshot
- Group CEO permission gates: can see all company_ids in group, cannot see other groups
- Multi-company user: user belongs to 2+ companies, active_company_id in session, context switch endpoint
- Company switcher UI: glass sheet with company list, switch selection
- Timezone-aware aggregation: convert all timestamps to UTC before aggregating

**Acceptance Criteria:**
- Group CEO can query aggregate KPI for all their companies
- Group CEO cannot access companies outside their group (verified by test)
- Nightly job runs at 02:00 UTC and completes in < 5 minutes
- Company context switch updates RLS policy immediately

---

### Sprint 09 — Weeks 17–18

**Goal:** 9-level scope engine is implemented and tested. Scope middleware correctly resolves entity access for all 20 roles.

**Epic:** 03 (Multi-Company)

**Key Deliverables:**
- Scope resolution engine for all 9 levels
- Scope-aware entity queries for key entity types
- Scope binding tests for all 20 roles

**Stories:**
- Implement scope resolution function: given user + scope_level, return list of accessible entity IDs
- Level 1 (RECORD): accessible IDs = [user.id]
- Level 2 (TEAM): accessible IDs = team member IDs in user's teams
- Level 3 (DEPARTMENT): accessible IDs = all users in user's departments
- Level 4 (STORE): accessible IDs = all users in user's store(s)
- Level 5 (REGION): accessible IDs = all users in user's regions
- Level 6 (COMPANY): accessible IDs = all users in user's company
- Level 7 (GROUP): accessible IDs = all users across group companies
- Level 8/9 (PLATFORM/GLOBAL): all users (platform admin + sysadmin)
- Write scope test matrix: 20 roles × 9 scope levels, verify correct resolution
- Apply scope middleware to key query patterns (employees, projects, renovation)

**Acceptance Criteria:**
- Scope resolution function returns correct IDs for all 20 roles
- Worker (Level 1) can only see own records in all scope-sensitive queries
- Team Lead (Level 2) sees exactly their team members' records
- CEO (Level 6) sees all company records
- Scope resolution adds < 2ms overhead per request

---

### Sprint 10 — Weeks 19–20

**Goal:** Roles and permissions are fully operational. All 20 roles are seeded. Permission check engine handles all cases. Custom roles can be created.

**Epic:** 04 (Roles & Permissions)

**Key Deliverables:**
- All 20 roles seeded with correct default permission sets
- Permission check engine: has_permission(user, permission_key)
- Role assignment API
- Temporary access grant system

**Stories:**
- Create `roles`, `permissions`, `role_permissions`, `user_role_assignments`, `temporary_access_grants` tables
- Seed all 20 roles with correct scope levels
- Define permission catalog: one permission per action per module (e.g., `projects.tasks.create`)
- Map default permissions per role
- Implement `has_permission(user_id, permission_key, company_id)` function
- Role assignment API: assign role to user in company (validates scope compatibility)
- Temporary grant: create grant with expiry, auto-revoke on expiry (Inngest job)
- Custom role creation: company-level, permission builder, save as custom role
- Permission check test suite: 200+ test cases across roles and permissions

**Acceptance Criteria:**
- Worker cannot call any endpoint requiring permissions above Level 1
- CEO can perform all Level 1–6 operations
- Sysadmin passes all permission checks
- Temporary grant works and revokes at exact expiry time
- Custom role works identically to system roles

---

### Sprint 11 — Weeks 21–22

**Goal:** Foundation is complete. All entities from DATABASE_BLUEPRINT_PART1 are migrated. M2 milestone passed.

**Epic:** 03 (Multi-Company), 04 (Roles & Permissions)

**Key Deliverables:**
- All remaining Part 1 DB entities migrated: approval templates, chains, instances
- Company onboarding wizard (backend only)
- Foundation Stable milestone (M2) sign-off

**Stories:**
- Migrate approval engine tables from DATABASE_BLUEPRINT_PART1
- Implement Approval Engine library skeleton: function signatures + types
- Company onboarding API: create company → create admin → assign CEO role → configure defaults
- Platform Admin onboarding wizard backend
- Audit all RLS policies: confirm coverage across all migrated tables
- Foundation integration test suite: end-to-end flow from company creation through role assignment and permission check
- Timezone handling: verify all stored timestamps are UTC, display in company timezone
- NUMERIC(19,4) audit: confirm all monetary columns use correct type
- M2 milestone checklist: all exit criteria verified

**Acceptance Criteria:**
- All Part 1 tables exist and pass migration
- Approval Engine library types compile
- Company onboarding creates functional company in < 3 seconds
- All timestamps store as UTC in DB
- M2 exit criteria signed off by lead architect

---

## Phase 3 + 4 — Design System, Navigation, Shared Services
**Weeks 21–30 · Sprints 11–15 (concurrent with Phase 2 finish)**

---

### Sprint 12 — Weeks 23–24

**Goal:** The core Liquid Glass design token system is built and documented. Glass surfaces, typography, spacing, and color tokens work across web and mobile.

**Epic:** 05 (Design System)

**Key Deliverables:**
- Design token file (CSS variables + Expo tokens)
- 4 glass surface levels (components)
- Typography scale
- Color palette
- Motion curve library

**Stories:**
- Define all design tokens: colors, spacing (4px grid), border-radius scale, blur levels, shadow system
- Implement CSS custom properties in `packages/ui` for web
- Implement Expo/React Native StyleSheet tokens for mobile
- `GlassCard` component: 4 levels, top specular, floating shadow, spring expand
- `GlassPanel` component: background surface for sheets
- `GlassButton` components: Primary, Secondary, Destructive, Icon
- `GlassInput` component: text field, search bar, textarea
- Typography components: mapped to HIG scale (largeTitle → caption2)
- Motion: define spring curve (0.34, 1.56, 0.64, 1), smooth curve, emerge animation
- Storybook (web) for all base components

**Acceptance Criteria:**
- All 4 glass levels render correctly on black background
- Top specular highlight visible on glass cards
- Typography renders at correct sizes and opacities across all screen sizes
- Spring animation completes in < 400ms
- Storybook shows all components at all states

---

### Sprint 13 — Weeks 25–26

**Goal:** Navigation system is complete: floating tab bar, bottom sheets, context menus, Command Palette, and Dynamic Island framework.

**Epic:** 05 (Design System)

**Key Deliverables:**
- Floating Tab Bar (all 5-tab configurations)
- Bottom Sheet System (8 sheet types)
- Glass Context Menu
- Command Palette skeleton
- Dynamic Island framework

**Stories:**
- Floating Tab Bar: glass, rounded-pill, spring-animated selected indicator, above content
- Bottom Sheet: `StandardSheet`, `ActionSheet`, `FormSheet`, `ConfirmationSheet`, `FilterSheet`, `PreviewSheet`, `OverlaySheet`, `FullscreenSheet`
- Sheet animation: rise from bottom (translateY + opacity, spring), dismiss on drag
- Context Menu: long-press trigger, haptic feedback, glass panel, action list
- Command Palette: ⌘K trigger (web), glass overlay, search input, recent items section, skeleton results
- Dynamic Island: compact state template, expanded state template, live activity updater hook
- Glass Toast: 4 severity levels, auto-dismiss (3s), progress bar, spring emerge
- Navigation shell: tab bar + screen container + header (floating glass)
- Deep link resolver: parse route → navigate to correct screen
- Haptic feedback map: impact, notification, selection haptics mapped to action types

**Acceptance Criteria:**
- Tab bar floats 16px above bottom safe area, content scrolls behind it
- Bottom sheet drag-to-dismiss works smoothly (60fps)
- Context menu appears within 50ms of long press
- Command Palette opens in < 200ms
- Dynamic Island compact state shows correct data
- Toast auto-dismisses at 3 seconds with smooth animation

---

### Sprint 14 — Weeks 27–28

**Goal:** Approval Engine library is complete. Notification dispatcher is built. Real-time layer is configured.

**Epic:** 06 (Shared Services)

**Key Deliverables:**
- Approval Engine library (all 6 functions)
- Notification dispatcher (all channels)
- Push notification infrastructure
- Real-time subscriptions

**Stories:**
- `packages/approval-engine`: implement all 6 functions
  - `createApprovalChain(template, context)` → creates chain instance
  - `submitForApproval(entity, chain_id, approvers)` → creates instance
  - `processApproval(instance_id, action, comment)` → advance or close chain
  - `delegateApproval(instance_id, delegate_id, until)` → delegate to another user
  - `escalateApproval(instance_id, reason)` → escalate to next approver
  - `getApprovalStatus(instance_id)` → return current status + history
- Approval Engine integration tests
- Notification dispatcher: load template, render with Handlebars, route to channels
- FCM setup: server key, test push to Android emulator
- APNs setup: certificate, test push to iOS simulator
- Web push: service worker notification handler
- Transactional email templates (HTML): base template, variable injection
- SMS sender: Twilio integration, opt-in check before send
- Real-time: Supabase Realtime subscription helpers, reconnect logic
- Redis pub/sub: channel naming conventions, publish/subscribe pattern

**Acceptance Criteria:**
- Approval chain created from template, advanced through all stages, completed
- Delegation works: delegated approver can approve on behalf
- Push notification received on physical iOS device
- Push notification received on Android emulator
- Notification email renders correctly in Gmail + Outlook
- Real-time DB change propagates to subscribed client in < 500ms

---

### Sprint 15 — Weeks 29–30

**Goal:** Universal Search is operational. Universal Inbox is built. Offline support skeleton. Foundation Stable milestone (M3) signed off.

**Epic:** 06 (Shared Services)

**Key Deliverables:**
- Typesense universal search (multi-entity)
- Universal Inbox (notifications + approvals + messages)
- Service Worker + IndexedDB skeleton
- M3 Milestone sign-off

**Stories:**
- Typesense collections: products, projects, clients, employees, documents, kb_articles
- Scoped search key generation: per-company key with collection filters
- Universal search API: query across collections, merge and rank results
- Search UI: glass overlay, instant results as you type, entity type filters, keyboard navigation
- Universal Inbox: aggregate notifications + pending approvals + unread messages
- Inbox UI: glass panel, unread count badges, action buttons per type
- Service Worker: register, cache shell assets, offline detection
- IndexedDB: schema for offline queue (pending actions, cached entity data)
- Sync protocol: on reconnect, flush offline queue in order, handle conflicts
- M3 milestone: Foundation Stable checklist review and sign-off

**Acceptance Criteria:**
- Search returns results in < 100ms for up to 10,000 records
- Search results from different companies never mix
- Inbox shows correct unread count, decrements on read
- Offline indicator appears when network drops
- Pending actions queue survives app close and sync on reconnect
- M3 exit criteria signed off

---

## Phase 6 — Project Management
**Weeks 30–38 · Sprints 15–19**

---

### Sprint 16 — Weeks 31–32

**Goal:** Projects can be created, managed, and tracked. Kanban board is interactive with real-time sync.

**Epic:** 07 (Projects)

**Key Deliverables:**
- Project CRUD with full API
- Task CRUD
- Kanban board (web + mobile) with drag-and-drop
- Real-time card sync

**Stories:**
- Migrate all project tables from DATABASE_BLUEPRINT_PART1
- Project create/read/update/archive API endpoints
- Task CRUD API with full validation
- LexoRank implementation: insert between, rebalance, move card
- Kanban board UI: 5 columns, drag-to-move cards, spring animation on drop
- Real-time: Supabase Realtime subscription on task table, update board on change
- Task card component: title, assignee avatar, due date, priority badge
- Assignee selection: user picker with team member list
- Due date picker: glass date picker component
- Mobile Kanban: horizontal scroll, tap-to-open, status change via bottom sheet

**Acceptance Criteria:**
- Drag card from To Do to In Progress, position persists on refresh
- Two users moving cards simultaneously: no collision (LexoRank resolves)
- Task created on one device appears on another in < 1 second
- Mobile: swipe horizontally between columns, card status change works

---

### Sprint 17 — Weeks 33–34

**Goal:** Sprint system is operational. Backlog management works. Task detail is complete with comments and attachments.

**Epic:** 07 (Projects)

**Key Deliverables:**
- Sprint creation, planning, start, complete
- Backlog with filter/sort
- Task detail sheet with comments
- File attachments on tasks

**Stories:**
- Sprint tables and API: create sprint, assign tasks from backlog, start, complete
- Sprint board UI: active sprint task list, progress bar, days remaining
- Sprint planning UI: backlog list + sprint column, drag to move between
- Backlog UI: full task list, group by project, sort by priority/due, filter panel
- Task detail bottom sheet: full edit form, comment thread, history log
- Comment system: text + mentions, real-time updates
- File attachments: upload to Supabase Storage, attach to task, preview in sheet
- Sprint completion: move incomplete tasks to next sprint or backlog
- Sprint reports: velocity chart, completed vs planned, team contribution

**Acceptance Criteria:**
- Sprint starts with N tasks from backlog, those tasks are locked to sprint
- Sprint complete moves remaining tasks back to backlog
- Comment appears for all users in < 500ms (real-time)
- Attachment uploads in < 3s for files up to 10MB
- Sprint report generates correctly from completion data

---

### Sprint 18 — Weeks 35–36

**Goal:** Milestones, project budget, team management, and project search are complete.

**Epic:** 07 (Projects)

**Key Deliverables:**
- Milestones with timeline view
- Project budget tracking
- Team membership management
- Project search via Typesense

**Stories:**
- Milestone CRUD: create, edit, mark complete, link tasks
- Milestone timeline view: horizontal timeline UI component
- Project budget: allocation, expense entries, budget vs actual chart
- Budget alerts: Inngest job checking budget consumption daily, notify at 80% + 100%
- Team membership: add/remove members, role in project, workload chart
- Typesense sync: index projects + tasks on change (Inngest job)
- Project search: query by title, description, tags, assignee
- Approval integration: connect project approval gates to Approval Engine
- Project notifications: task assigned, overdue, milestone due, sprint ending

**Acceptance Criteria:**
- Milestone appears on timeline at correct date
- Budget chart updates within 1 second of expense entry
- Team workload shows correct task counts per member
- Search returns project in < 200ms after indexing

---

### Sprint 19 — Weeks 37–38

**Goal:** All Project Management screens are complete across web and mobile. PM role has fully functional navigation and dashboard.

**Epic:** 07 (Projects)

**Key Deliverables:**
- PM Dashboard complete (all widgets)
- All project screens (web + mobile)
- Project notifications flowing
- Epic 07 complete

**Stories:**
- PM Dashboard: project health grid, sprint velocity, task due calendar, blocker feed
- Project list screen with search and filters
- Project detail navigation: Overview → Kanban → Sprint → Backlog → Milestones → Team → Budget → Docs
- Mobile: all project screens responsive, optimized for thumb reach
- AI project summary placeholder (will be enabled in Phase 17)
- Notifications: task assigned, overdue, blocked, sprint ending, milestone due — all flowing to inbox
- Dynamic Island: sprint progress state
- Widget: project health grid (home screen), sprint burndown (dashboard)
- Full Epic 07 regression test

**Acceptance Criteria:**
- PM can complete full project management workflow on mobile without web
- All 14 features in Epic 07 are implemented and tested
- Notification delivery verified for all 9 project notification types

---

## Phase 7 — Attendance & Workforce
**Weeks 38–46 · Sprints 19–23**

---

### Sprint 20 — Weeks 39–40

**Goal:** Clock in/out works on mobile with GPS verification. Attendance records are created. Leave request flow is complete.

**Epic:** 08 (Attendance & Workforce)

**Key Deliverables:**
- Clock in/out (mobile, GPS-verified)
- Attendance record creation
- Leave request + manager approval flow
- Leave type management

**Stories:**
- Migrate all attendance tables from DATABASE_BLUEPRINT_PART1
- Clock-in API: validate GPS, record attendance entry, start timer
- Clock-out API: record clock-out, calculate hours
- Offline clock-in: queue in IndexedDB, sync on reconnect (GPS recorded at tap time)
- Leave request API: type, dates, reason, balance check
- Leave approval workflow: notify manager, manager approves/rejects via approval engine
- Leave balance tracking: per-type remaining days, accrual logic
- Leave types: configurable by HR Manager (name, annual days, carry-over)
- Clock-in UI: big glass button, GPS indicator, confirmation haptic
- Leave request UI: glass form sheet, date range picker, type selector
- Leave calendar UI: monthly grid, color-coded by type

**Acceptance Criteria:**
- Clock-in records GPS coordinates accurately (within 50m)
- Offline clock-in syncs within 30 seconds of reconnect
- Leave request notifies manager within 2 seconds
- Manager approval triggers employee notification within 2 seconds
- Leave balance decrements correctly on approval

---

### Sprint 21 — Weeks 41–42

**Goal:** Schedule builder is operational. Overtime requests work. Company-wide attendance reporting is available.

**Epic:** 08 (Attendance & Workforce)

**Key Deliverables:**
- Schedule builder (create/assign shifts)
- Recurring shifts
- Overtime request + approval
- Attendance reports

**Stories:**
- Schedule tables and API: create shifts, assign to employees, recurring pattern
- Schedule builder UI: weekly grid, drag to create shift, employee assignment
- Recurring shifts: weekly/fortnightly patterns, generate N occurrences
- Shift reminder: push notification 1 hour before shift (Inngest scheduled job)
- Overtime request: API, approval flow via Approval Engine, payroll flag
- Attendance report: per-employee summary, company-wide, export to CSV
- Late arrival classification: auto-flag if clock-in > 15 minutes after shift start
- Absence classification: auto-mark absent if no clock-in by shift_start + 2h
- Daily attendance digest: Inngest job at end of day, email to managers

**Acceptance Criteria:**
- Shift created and visible on employee's schedule immediately
- Recurring shift generates 12 weeks of occurrences
- Shift reminder arrives 1 hour before shift
- Attendance report exports correctly formatted CSV
- Late/absent classifications match business rules

---

### Sprint 22 — Weeks 43–44

**Goal:** Workforce structure is complete: departments, positions, teams, org chart.

**Epic:** 08 (Attendance & Workforce)

**Key Deliverables:**
- Department management (create/edit hierarchy)
- Position management
- Team management
- Org chart (visual)

**Stories:**
- Migrate workforce tables from DATABASE_BLUEPRINT_PART1
- Department CRUD: name, parent department, head assignment
- Position CRUD: title, department, level, salary band
- Team CRUD: name, department, team lead, add/remove members
- Org chart: React/RN org chart library, node = user, edges = reporting lines
- Org chart interactive: zoom, pan, node tap → profile quick view
- Org chart export: PDF generation (server-side rendering)
- Workforce reports: headcount by department, team utilization, position fill rate

**Acceptance Criteria:**
- Org chart renders correctly for 500 employees
- Department hierarchy updates instantly on org chart
- PDF org chart is readable on A3 print
- Team member list matches actual team assignments

---

### Sprint 23 — Weeks 45–46

**Goal:** Attendance and Workforce modules are complete. Dynamic Island clock-in timer works. M4 Alpha milestone sign-off.

**Epic:** 08 (Attendance & Workforce)

**Key Deliverables:**
- Dynamic Island: live clock-in timer
- Worker home screen widgets
- All role dashboards for Attendance scope
- M4 Alpha milestone sign-off

**Stories:**
- Dynamic Island: compact state shows clock-in timer, expanded shows hours today + current task
- Lock Screen widget: clock-in status + hours today
- Home Screen widget: clock-in button + schedule for today
- Role dashboards: HR Manager attendance dashboard, Store Manager schedule, Team Lead today view
- All notifications flowing: shift reminder, late alert, leave approved/rejected
- Attendance month-end job: generate monthly attendance summary per employee
- Performance tuning: attendance queries with 10,000 employees must return < 500ms
- M4 Alpha checklist: Projects + Attendance + Workforce all operational for team testing

**Acceptance Criteria:**
- Dynamic Island timer updates every second while clocked in
- Widget clock-in button works directly from home screen
- Queries with 10,000 attendance records return in < 500ms
- M4 milestone exit criteria signed off

---

## Phase 7.5 — Renovation Services
**Weeks 42–54 · Sprints 21–27**

*Note: Phase 7.5 begins in parallel with Attendance/Workforce (Sprint 21) using a separate team.*

---

### Sprint 21b — Weeks 41–42 (Renovation Team)

**Goal:** Renovation project and phase foundation is complete with estimation builder.

**Epic:** 10 (Renovation Services)

**Key Deliverables:**
- Renovation project CRUD
- Phase management
- Estimate builder with PDF generation

**Stories:**
- Migrate all renovation tables from DATABASE_BLUEPRINT_PART2
- Renovation project API: create/edit/status transitions, project code generation
- Phase API: create phases, reorder (LexoRank), status machine
- Estimate line-item API: labor/materials/subcontractors, tax calculation
- Estimate PDF: server-side PDF generation (Puppeteer/WeasyPrint), Supabase Storage save
- Estimate send: email to client with PDF attachment, mark sent
- Client acceptance: status transition on response (accepted/rejected)
- Renovation project list UI: cards with status, value, client name, phase indicator
- Estimate builder UI: line-item table, add/remove rows, tax display, total preview

**Acceptance Criteria:**
- Renovation project created with correct project code (e.g., REN-2026-0041)
- PDF estimate generates in < 5 seconds with all line items
- Client acceptance email arrives within 3 minutes of send action

---

### Sprint 24 — Weeks 47–48 (Renovation Team)

**Goal:** Site reports and site task board are complete. Daily report submission is optimized for mobile field use.

**Epic:** 10 (Renovation Services)

**Key Deliverables:**
- Daily site report (mobile-optimized)
- Site task board
- Site photos gallery
- Worker clock-in at site

**Stories:**
- Daily site report API: workers present, work done, materials used, % delta, photos
- Photo upload: compress before upload, store in Supabase, attach to report
- Site report UI: mobile form, one-thumb operation, large touch targets, offline queue
- Site task board: same Kanban component as projects, scoped to renovation tasks
- Task completion: photo proof upload, completion note
- Site photos gallery: chronological grid, client-approved filter, full-screen viewer
- Worker clock-in at renovation site: linked to project, supervisor confirmation
- Report history: timeline of all reports for a project

**Acceptance Criteria:**
- Site report can be submitted in < 2 minutes on mobile
- Photo upload works on 4G (< 30 seconds for 5 photos at 12MP)
- Site report saved to offline queue when connectivity lost, submitted when restored
- Supervisor can view worker attendance in real-time

---

### Sprint 25 — Weeks 49–50 (Renovation Team)

**Goal:** Contract management is complete. Material requests flow to procurement. Phase sign-off with client digital signature works.

**Epic:** 10 (Renovation Services)

**Key Deliverables:**
- Contract generation and e-signature
- Material request → purchase order pipeline
- Phase sign-off with client signature
- Client approval center

**Stories:**
- Contract generation: from accepted estimate → contract PDF
- Contract e-signature: draw/type signature, email OTP verification, PDF stamping
- Material request API: items list, needed-by date, approval via Approval Engine
- Approved request → create Purchase Order (draft) in procurement module
- Phase completion workflow: supervisor marks complete → internal approval → client sign-off request
- Client sign-off: portal notification, review photos, sign via Client Portal
- Digital signature on phase: record timestamp, IP, signature method
- Phase sign-off PDF: generated evidence document, stored in Document Center

**Acceptance Criteria:**
- Contract PDF with digital signature is legally formatted (name, date, page count)
- Material request creates PO draft within 1 second of approval
- Client receives phase sign-off email and can sign via portal
- Signed PDF stored in Document Center with audit log entry

---

### Sprint 26 — Weeks 51–52 (Renovation Team + main team joining)

**Goal:** Renovation Services is feature-complete. Invoice integration works. AI placeholder in place.

**Epic:** 10 (Renovation Services)

**Key Deliverables:**
- Renovation → invoice integration
- All role dashboards for renovation
- Renovation notifications complete
- Epic 10 complete

**Stories:**
- Invoice generation trigger: project completion or phase milestone → create invoice draft
- Renovation project dashboard: Site Supervisor, PM, CEO views
- Dynamic Island: project name + phase progress + workers on site
- Notifications: all 8 renovation notification types flowing
- Renovation analytics: projects by status, revenue pipeline, phase cycle times
- Client Portal project view: timeline, photos, documents, messages
- AI summary placeholder in project detail (shows "AI insights coming soon")
- Epic 10 regression test suite

**Acceptance Criteria:**
- Project completion creates invoice draft with correct line items
- CEO can see all renovation projects in command dashboard
- All 15 renovation features from Epic 10 are implemented and tested
- M5 Revenue Platform checklist items for Renovation are verified

---

## Phase 8 — Human Resources
**Weeks 46–52 · Sprints 23–26**

---

### Sprint 24b — Weeks 47–48 (HR Team)

**Goal:** Employee profiles, onboarding wizard, and contract management are operational.

**Epic:** 09 (HR)

**Key Deliverables:**
- Employee profile (full)
- Onboarding wizard (5 steps)
- Contract creation and expiry tracking

**Stories:**
- Migrate all HR tables from DATABASE_BLUEPRINT_PART1
- Employee profile API: full CRUD, personal info, position, status transitions
- Onboarding wizard: 5-step flow → personal details → position → contract → account → docs → checklist
- Account creation during onboarding: create user account, send welcome email
- Contract creation: type, start/end date, salary, probation, status
- Contract version history: new version on change, old version archived
- Contract expiry: Inngest job checks daily, notifies HR at 60/30/14/7 days
- Employee document upload: personal documents folder created on employee creation
- Offboarding checklist: configurable steps, assignment, completion tracking

**Acceptance Criteria:**
- Full employee onboarded in < 5 minutes via wizard
- Employee receives welcome email with login link
- Contract expiry notification arrives at correct intervals
- Offboarding checklist completion is tracked and auditable

---

### Sprint 25b — Weeks 49–50 (HR Team)

**Goal:** Payroll runs are operational. Payslips are generated. Performance reviews work.

**Epic:** 09 (HR)

**Key Deliverables:**
- Payroll run: period, employees, deductions, CEO approval
- Payslip PDF generation
- Performance review cycle

**Stories:**
- Payroll run API: period selection, employee set, deductions/additions, total calculation
- Payroll CEO approval: Approval Engine integration
- Payslip PDF: per-employee, gross/deductions/net, company branding
- Payslip storage: Document Center, accessible to employee
- Payslip notification: push + in-app when available
- Performance review template: criteria, rating scale, comments
- Review cycle: assign reviewer, set deadline, submit, countersign
- Salary change: propose → approve → apply (with history)
- HR reports: headcount, turnover, tenure distribution, compensation bands

**Acceptance Criteria:**
- Payroll run completes calculation for 100 employees in < 10 seconds
- Payslip PDF generates with correct numbers, formatted professionally
- Employee can download own payslip immediately after payroll run approval
- Performance review cycle from open to complete takes defined number of days

---

### Sprint 26b — Weeks 51–52 (HR Team)

**Goal:** HR module is complete. Certificate expiry tracker works. HR role dashboard is complete.

**Epic:** 09 (HR)

**Key Deliverables:**
- Certificate expiry tracker
- HR Manager dashboard
- All HR notifications
- Epic 09 complete

**Stories:**
- Certificate expiry tracker: Inngest daily check, notify at 60/30/14/7 days
- HR dashboard: headcount, hire/departure chart, attendance rate, leave calendar, payroll status
- AI turnover signal placeholder
- All 12 HR notification types flowing
- Mandatory training check: when role assigned, check mandatory courses (Learning integration point — stub)
- HR reports: export to CSV/PDF
- Epic 09 regression test suite
- M5 HR milestone items verified

**Acceptance Criteria:**
- HR dashboard loads in < 2 seconds for company with 500 employees
- Certificate expiry reminder arrives at correct days
- All HR Epic 09 features verified

---

## Phase 9 — Shop & Inventory
**Weeks 56–64 · Sprints 28–32**

---

### Sprint 28 — Weeks 55–56

**Goal:** Product catalog and inventory management are operational across all locations.

**Epic:** 11 (Shop)

**Key Deliverables:**
- Product CRUD (with variants, images, price tiers)
- Category hierarchy
- Multi-location inventory
- Inventory movement ledger

**Stories:**
- Migrate all shop and inventory tables from DATABASE_BLUEPRINT_PART2
- Product API: CRUD, variant generation, image upload, price tier management
- Category API: hierarchical CRUD, slug generation
- Inventory location API: CRUD
- Inventory item API: per-product per-location stock levels
- Inventory movement: immutable ledger, triggers on stock change
- Reorder alert job: Inngest daily check, create notification when below reorder point
- Product search: Typesense sync, full-text search, barcode lookup
- Product list UI: filterable grid/list, category sidebar
- Product detail UI: images, variants, price tiers, stock by location

**Acceptance Criteria:**
- Product creates with 5 variants and syncs to Typesense in < 2 seconds
- Inventory movement creates on every stock change (no exception)
- Barcode scan returns correct product in < 300ms
- Reorder alert triggers correctly when quantity < reorder_point

---

### Sprint 29 — Weeks 57–58

**Goal:** POS interface is fully operational. Order creation, payment processing, and receipt generation work.

**Epic:** 11 (Shop)

**Key Deliverables:**
- POS interface (mobile-first)
- Order creation + cart
- Payment processing (cash, card)
- Receipt generation

**Stories:**
- Order API: create, add lines, apply discount, pay, complete
- POS UI: product search, cart builder, quantity controls, line items
- Barcode scanner integration: Expo Camera, real-time decode, add to cart
- Payment collection sheet: amount, method, change calculator
- Cash register session: open with float, track session sales, close with count
- Receipt: in-app summary + SMS/email option
- Discount application: within-limit auto-apply, above-limit → request flow
- Discount approval: manager receives request, approves in < 30 seconds
- Order fulfillment: order created from non-POS, assigned to fulfillment queue

**Acceptance Criteria:**
- POS checkout (scan → add → pay → receipt) completes in < 30 seconds
- Discount request delivered to manager in < 5 seconds
- Cash session close report matches sum of transactions
- Receipt email arrives within 1 minute

---

### Sprint 30 — Weeks 59–60

**Goal:** Returns processing, stock management tools, and Shop Director dashboard are complete.

**Epic:** 11 (Shop)

**Key Deliverables:**
- Return processing (with refund)
- Stock transfer between locations
- Stock count (manual)
- Shop Director dashboard

**Stories:**
- Return processing API: original order, items, reason, refund calculation
- Refund: cash or card reversal, credit note generation
- Stock transfer API: from/to location, product/qty, approval, movement ledger entries
- Stock count: count session, per-item entry, discrepancy report, submit adjustment
- Shop Director dashboard: revenue by store, top products, fulfillment pipeline
- Shop analytics: revenue, AOV, conversion, return rate, discount usage
- Multi-location stock overview: grid view, filter by product or location
- Store Manager dashboard: today's revenue, staff, register status, low stock

**Acceptance Criteria:**
- Return reduces inventory and creates negative movement entry
- Stock transfer creates two movements (source negative, destination positive)
- Shop Director dashboard loads in < 2 seconds across 10 stores
- Analytics data matches sum of order lines (verified against DB)

---

### Sprint 31 — Weeks 61–62

**Goal:** Order management, discount codes, and product search are complete. Shop notifications flow.

**Epic:** 11 (Shop)

**Key Deliverables:**
- Order management (all states + filters)
- Discount code management
- Product search (Typesense, full-text)
- Shop notifications

**Stories:**
- Order list UI: full filter panel (status, date, store, value, customer), search
- Order detail: all line items, payment history, fulfillment status, print
- Fulfillment pipeline UI: Kanban-style order stages
- Discount code CRUD: create, conditions, uses tracking, deactivate
- Discount analytics: code usage, revenue impact, fraud detection
- Product full-text search: relevance ranking, category filter, price range, in-stock filter
- Notifications: stock-out, low-stock, large order, discount approval, daily summary

**Acceptance Criteria:**
- Order list with 50,000 orders loads in < 1 second (paginated)
- Discount code usage tracked and deactivated when max_uses reached
- Product search returns in < 150ms for 50,000 products

---

### Sprint 32 — Weeks 63–64

**Goal:** Shop module is complete. All Shop features across all roles are verified. M6 Commerce milestone signed off.

**Epic:** 11 (Shop)

**Key Deliverables:**
- Price tier management UI
- Shop module regression test
- M6 Commerce milestone sign-off

**Stories:**
- Price tier management: create tiers, client type pricing, volume pricing, date-bound
- Client-type price resolution: when client type is known, show correct price
- Shop module end-to-end test: product create → inventory → POS sale → order → invoice
- Shop role tests: Shop Director, Store Manager, Cashier full flow
- Performance test: 100 simultaneous POS transactions, latency < 500ms
- M6 Commerce milestone checklist

**Acceptance Criteria:**
- Volume pricing returns correct price for quantity thresholds
- 100 concurrent transactions complete without error
- All Epic 11 features verified
- M6 milestone signed off

---

## Phase 11 — CRM & Client Portal
**Weeks 68–76 · Sprints 34–38**

*(Phase 10 — Communication Center, Phase 12 — Finance continue in parallel)*

---

### Sprint 34 — Weeks 67–68

**Goal:** CRM core is operational: clients, contacts, interactions, and the opportunity pipeline.

**Epic:** 12 (CRM)

**Key Deliverables:**
- Client and contact management
- Interaction log
- Opportunity pipeline (Kanban)

**Stories:**
- Migrate all CRM tables from DATABASE_BLUEPRINT_PART2
- Client API: CRUD, type, status, account manager assignment, lifetime value tracking
- Contact API: multiple per client, primary designation, portal access toggle
- Address book API: multiple address types, geocoding
- Interaction log API: call/email/meeting/visit, outcome, follow-up scheduling
- Opportunity API: pipeline stages, probability, expected value, conversion to project
- Opportunity pipeline UI: horizontal Kanban, expected value labels
- Client list UI: search, filter by status/account manager/tag
- Interaction log UI: timeline, add interaction sheet, follow-up reminder

**Acceptance Criteria:**
- Client created and immediately searchable
- Opportunity stage change triggers follow-up task creation
- Interaction log timestamps correctly in company timezone
- Follow-up reminder notification delivered at scheduled time

---

### Sprint 35 — Weeks 69–70

**Goal:** Quote management is complete. Client portal authentication and project view are live.

**Epic:** 12 (CRM)

**Key Deliverables:**
- Quote generation and client send
- Client portal auth (external users)
- Client project progress view
- Client digital signature on documents

**Stories:**
- Quote API: create from opportunity, line items, PDF generation, send to client
- Quote approval: Approval Engine for quotes over threshold
- Client portal auth: external email/password + email OTP, separated from internal auth
- Client portal session: scoped to their company_id + contact_id
- Client project view: project list, phase timeline, progress % display
- Phase sign-off in portal: review photos + description, draw/type signature, OTP confirm
- Client messaging: send messages to project team from portal
- Client document center: all documents tagged `visibility = client`

**Acceptance Criteria:**
- Client can log in to portal without internal credentials
- Client sees only their own projects (never another client's)
- Phase sign-off records digital signature with audit trail
- Client message appears in internal Communication Center

---

### Sprint 36 — Weeks 71–72

**Goal:** Client portal is complete: invoices, messaging, document signing, and notifications.

**Epic:** 12 (CRM)

**Key Deliverables:**
- Client invoice view and payment info
- Client notification flows
- Quote acceptance flow
- Epic 12 complete

**Stories:**
- Client invoice list: outstanding invoices, payment instructions
- Invoice PDF download in portal
- Quote accept/reject flow: client responds in portal → notification to sales team
- Client notification flows: all 9 client notification types
- Dynamic Island for clients: project progress, signature required
- Portal home widget: project progress card, unread messages, outstanding invoice
- CRM analytics: pipeline value, win rate, average deal size, conversion time
- Epic 12 regression test suite

**Acceptance Criteria:**
- Client receives invoice notification and can download PDF
- Quote acceptance triggers opportunity status change to "closed won"
- All 9 client notification types verified
- M7 Client Portal milestone items verified

---

*End of DEVELOPMENT_PLAN_PART2.md — Continues in DEVELOPMENT_PLAN_PART3.md*

*Part 3 covers: Sprints 37–65 (Phases 12–25) + Dependency Matrix + Definition of Done + Team Structure + Risk Register*
