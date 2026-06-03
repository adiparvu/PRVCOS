# PRV — Architecture Resolution Report · Part 1
**Based on:** ARCHITECTURE_REVIEW.md
**Coverage:** Conflicts + Gaps (Issues 1–16)
**Status:** PENDING APPROVAL — No implementation until approved
**Date:** 2026-06-03

---

## How to Read This Document

For every issue identified in the Executive Architecture Review, this report provides:

1. **Problem** — What exactly is wrong or missing
2. **Risk** — What happens if this is not resolved
3. **Recommended Solution** — The proposed resolution (documentation only, no code)
4. **Impact Analysis** across 5 dimensions:
   - Security
   - Scalability
   - UX
   - Data Architecture
   - Multi-Company Architecture

All resolutions are proposals. Nothing is implemented. No specification is modified. Approval is required before any resolution is applied.

---

## Part 1 Contents

- Section A: Conflicts (Issues 1–6)
- Section B: Gaps (Issues 7–16)

Part 2 covers: Scalability Risks, Security Risks, UX Issues, Database Issues, Role & Permission Issues (Issues 17–42).

---

# SECTION A — CONFLICTS

---

## Issue 1 — CONFLICT-01: Zero Trust Gate Count Inconsistency
**Severity:** CRITICAL
**Documents:** CLAUDE.md · SECURITY_ARCHITECTURE.md · ROLE_ARCHITECTURE.md

---

### Problem

Three foundational documents define the Zero Trust validation chain with three different gate counts:

| Document | Gates | Chain |
|----------|-------|-------|
| CLAUDE.md | 4 | Authentication → Authorization → Scope Validation → Audit Logging |
| SECURITY_ARCHITECTURE.md | 7 | Authentication → Role → Permission → Scope → Company → Execute → Audit |
| ROLE_ARCHITECTURE.md | 10 | Authentication → MFA → Role → Permission → Scope → Company → Rate Limit → DLP → Execute → Audit |

This is not a cosmetic inconsistency. These three documents define the same architectural primitive — the validation chain that every action in the system must pass through — and they fundamentally disagree on what that chain contains.

The 10-gate chain includes MFA, Rate Limiting, and DLP (Data Loss Prevention) gates that are entirely absent from the 4-gate version. A developer implementing auth middleware who reads only CLAUDE.md will build a system missing these gates. A developer who reads ROLE_ARCHITECTURE.md will build a system with all 10 gates. The resulting security posture depends entirely on which document was read first.

---

### Risk

**Direct Risk:** The implemented auth chain will reflect whichever document the Phase 2 developer references. Since CLAUDE.md is designated as the foundational document (read first), the 4-gate version is the most likely implementation outcome — which omits MFA enforcement, rate limiting, and DLP as systematic gates.

**Exploitation Scenario:** Without Rate Limiting as a gate, a credential-stuffing attack can attempt unlimited authentication attempts. Without DLP as a gate, a user could export sensitive documents through the API without triggering data loss prevention checks. Without MFA enforcement as a gate (separate from authentication), a compromised password alone may be sufficient to access L5 (CEO) data.

**Compliance Risk:** GDPR Article 32 requires "appropriate technical measures" for data security. An incomplete Zero Trust chain weakens the defensibility of that claim.

---

### Recommended Solution

**Establish one canonical gate specification.** The 10-gate chain from ROLE_ARCHITECTURE.md is the most complete and should be treated as the authoritative specification.

The three documents should present the same chain at different levels of detail:

- **CLAUDE.md** — Summary reference: *"Zero Trust 10-gate chain (see SECURITY_ARCHITECTURE.md for full specification)"*. List the 4 categories (Auth, AuthZ, Scope, Audit) as buckets, not as the complete gate list.

- **SECURITY_ARCHITECTURE.md** — Operational specification: The 7-gate chain is the runtime view (what middleware enforces per request). Gate 1 (Authentication) contains MFA. Gate 7 (Audit) contains DLP post-execution logging. This is valid — MFA and DLP are sub-steps of Auth and Audit respectively at runtime.

- **ROLE_ARCHITECTURE.md** — Enterprise specification: The 10-gate chain is the architectural view (every discrete checkpoint, including MFA and DLP as explicit gates for design purposes).

The resolution is a reconciliation note in each document confirming these are the same chain described at different granularities, with cross-references to the canonical specification in SECURITY_ARCHITECTURE.md.

---

### Impact Analysis

**Security:** Resolving this eliminates the highest-probability implementation error in the entire system. MFA, Rate Limiting, and DLP become mandatory gates, not optional considerations.

**Scalability:** Rate Limiting as an explicit gate means it must be implemented in Phase 2 (Auth & Security) rather than as a later addition. This is architecturally correct — retrofitting rate limiting is far more expensive than building it in.

**UX:** No direct UX impact. Indirect impact: users experience MFA gates at login and re-authentication for sensitive actions (already specified). Consistency in gate implementation means the UX of security checkpoints is predictable.

**Data Architecture:** The DLP gate requires querying document classification levels before allowing exports. This creates a dependency on document security metadata being populated before DLP can function — a sequencing constraint for Phase 12 (Document Center).

**Multi-Company Architecture:** The Company gate (Gate 5 in the 7-gate chain: "Company") is explicit in all versions. This gate verifies that the requesting user belongs to the company that owns the resource being accessed. This is the multi-tenancy enforcement gate — its presence across all three versions (even if numbered differently) confirms multi-company isolation is architecturally mandatory.

---

## Issue 2 — CONFLICT-02: CLAUDE.md Tech Stack Outdated
**Severity:** CRITICAL
**Documents:** CLAUDE.md (Tech Stack section) vs IMPLEMENTATION_ROADMAP_PART1.md

---

### Problem

CLAUDE.md — the foundational document that defines all non-negotiable rules and serves as the first reference for any developer — contains the following in its Tech Stack section:

```
State Management: TBD
Backend Framework: TBD
Auth: TBD
```

IMPLEMENTATION_ROADMAP_PART1.md (Pasul 10) defines the complete, confirmed technology stack:

```
Framework:         Next.js App Router + TypeScript
Styling:           Tailwind CSS + custom Liquid Glass utilities
State:             Zustand + TanStack Query
Backend:           Next.js API Routes + Drizzle ORM
Auth:              Supabase Auth (passkeys, MFA, OAuth)
Database:          PostgreSQL 16 (Supabase)
Storage:           Supabase Storage
Realtime:          Supabase Realtime
Background Jobs:   Inngest
Search:            Typesense
AI:                Anthropic Claude API + Vercel AI SDK
Email:             Resend
Cache:             Redis via Upstash
CDN/Edge:          Cloudflare
Monitoring:        Sentry + Axiom
Testing:           Vitest + Playwright
Monorepo:          pnpm + Turborepo + Changesets
```

CLAUDE.md and the Roadmap disagree on fundamental architectural choices that affect every line of code written.

---

### Risk

**Direct Risk:** Any developer who reads CLAUDE.md first — which is the designed entry point — will see TBD and either wait for clarification (blocking progress) or make an independent technology choice (creating fragmentation).

**Fragmentation Scenario:** Developer A reads the Roadmap and uses Supabase Auth. Developer B reads only CLAUDE.md, sees "Auth: TBD," and implements NextAuth.js. Two authentication systems now exist in the same codebase. This is not a hypothetical — it happens on every project where foundational documentation is stale.

**Onboarding Risk:** Every new team member who joins in Year 1 reads CLAUDE.md first. TBD fields signal that the architecture is not finalized, creating uncertainty and slowing onboarding.

---

### Recommended Solution

Update CLAUDE.md's Tech Stack section to reflect the confirmed stack from IMPLEMENTATION_ROADMAP_PART1.md. This is a documentation update, not an architectural change — the stack is already decided.

The updated section should:
1. List the confirmed stack for every category
2. Include a reference: *"Full rationale and versioning in IMPLEMENTATION_ROADMAP_PART1.md Phase 0."*
3. Remove all TBD entries

No architectural decisions are changed. Only the documentation is synchronized.

---

### Impact Analysis

**Security:** Auth being listed as TBD is a specific risk — the auth system is defined in detail in SECURITY_ARCHITECTURE.md using Supabase Auth. Confirming Supabase Auth in CLAUDE.md means all security specifications are anchored to one platform. Passkey, MFA, and biometric requirements are all Supabase Auth features — confirming the platform makes these requirements implementable rather than aspirational.

**Scalability:** Confirming the monorepo stack (pnpm + Turborepo + Changesets) in CLAUDE.md means all packages follow the established structure from day one. Turborepo build caching is only effective when the team understands it is the standard — documentation clarity drives adoption.

**UX:** No direct UX impact. Indirect: a confirmed frontend stack (Next.js + Tailwind) means the Design System (Pasul 8) can begin generating precise implementation code against a known framework rather than generic specifications.

**Data Architecture:** Confirming Drizzle ORM anchors all 151 database entities to a specific ORM. Schema migrations, type safety, and query patterns are all Drizzle-specific. Having this confirmed in CLAUDE.md means database work begins with a known tool, not a pending choice.

**Multi-Company Architecture:** Confirming Supabase with PostgreSQL 16 anchors RLS (Row-Level Security) as the multi-tenancy enforcement mechanism. RLS is PostgreSQL-native — this choice is load-bearing for the entire multi-company architecture. Having it confirmed in CLAUDE.md makes multi-tenancy a first-class constraint rather than an implementation detail.

---

## Issue 3 — CONFLICT-03: 18 Platforms vs 21 Modules — No Mapping
**Severity:** HIGH
**Documents:** PRODUCT_VISION.md vs MODULE_ARCHITECTURE_PART1–4.md

---

### Problem

PRODUCT_VISION.md defines PRV as a system of **18 platforms**. MODULE_ARCHITECTURE_PART1–4.md defines **21 modules**. No document explains the relationship between these two numbering systems.

**Platforms in PRODUCT_VISION.md (18):**
Public Presentation, Renovation Services, Project Management, Workforce Management, Attendance Management, CRM, Shop, Finance, Analytics, AI, Document Management, Notification Center, Knowledge Base, Learning Center, Procurement Center, Supplier Management, Fleet Management, Tool Management

**Modules in MODULE_ARCHITECTURE (21):**
Public App, Projects, Attendance, Workforce, HR, Shop, CRM, Finance, Document Center, Communication, Notification Center, Analytics, AI Center, Approval Center, Procurement, Tool Management, Fleet Management, Knowledge Base, Learning Center, Safety Center, Command Center

**Discrepancies:**
- Renovation Services (Platform #2) → No corresponding module
- Supplier Management (Platform #16) → No corresponding module
- HR (Module 5) → No corresponding platform
- Communication (Module 10) → No corresponding platform
- Approval Center (Module 14) → No corresponding platform
- Safety Center (Module 20) → No corresponding platform
- Command Center (Module 21) → No corresponding platform

A new team member reading both documents will be unable to understand which modules implement which platforms.

---

### Risk

**Planning Risk:** Roadmap planning (Phases 6–25) assigns phases to modules. When communicating with external stakeholders (investors, enterprise clients), platforms are the vocabulary. Without a mapping, platform delivery status cannot be communicated from the implementation roadmap.

**Discovery Risk:** Renovation Services (the core revenue product) has no corresponding module. This creates a situation where the primary revenue platform has no implementation blueprint — the most significant gap in the entire architecture.

**Scope Risk:** Supplier Management (Platform #16) has no module. If a phase is planned for Procurement (which covers purchase orders), Supplier Management features may be inadvertently excluded from scope.

---

### Recommended Solution

Create a **Platform-to-Module Mapping document** (`PLATFORM_MODULE_MAP.md`) that explicitly resolves the relationship.

**Proposed mapping logic:**

| Platform | Implements As | Notes |
|----------|--------------|-------|
| Public Presentation | Module 1: Public App | External-facing |
| Renovation Services | Module 22: Renovation Services | **MISSING — must be created** |
| Project Management | Module 2: Projects | Internal |
| Workforce Management | Module 4: Workforce | Internal |
| Attendance Management | Module 3: Attendance | Internal |
| CRM | Module 7: CRM | Internal + external (Client Portal) |
| Shop | Module 6: Shop | Internal + external |
| Finance | Module 8: Finance | Internal |
| Analytics | Module 12: Analytics | Internal |
| AI | Module 13: AI Center | Internal (cross-module) |
| Document Management | Module 9: Document Center | Internal |
| Notification Center | Module 11: Notification Center | Internal (cross-module) |
| Knowledge Base | Module 18: Knowledge Base | Internal |
| Learning Center | Module 19: Learning Center | Internal |
| Procurement Center | Module 15: Procurement | Internal |
| Supplier Management | Subset of Module 15: Procurement | Or new Module 22 |
| Fleet Management | Module 17: Fleet Management | Internal |
| Tool Management | Module 16: Tool Management | Internal |

**Internal-only modules (no platform equivalent):**
- Module 5: HR — Infrastructure, not a platform
- Module 10: Communication — Infrastructure, not a platform
- Module 14: Approval Center — Cross-cutting concern, not a platform
- Module 20: Safety Center — Compliance module, not a platform
- Module 21: Command Center — Executive overlay, not a platform

---

### Impact Analysis

**Security:** No direct security impact. Indirect: knowing which modules are internal-only vs external-facing clarifies the attack surface. External-facing modules (Public App, Shop, CRM Client Portal) require additional security hardening not needed for internal modules.

**Scalability:** External-facing modules require different scaling strategies — CDN, rate limiting, DDoS protection, public API caching. Internal modules scale with employee count. The mapping clarifies which modules need which scaling approach.

**UX:** The mapping clarifies that internal modules follow the Business OS navigation pattern (floating tab bar, Liquid Glass, role-specific) while external platforms follow the Public App pattern (consumer-facing, public-accessible). These are two distinct UX paradigms. Without the mapping, this distinction is ambiguous.

**Data Architecture:** External-facing modules need different RLS policies — unauthenticated read access for some tables (public product catalog, public portfolio), authenticated access for others (client orders, project updates). The mapping drives which tables need public vs private RLS policies.

**Multi-Company Architecture:** External platforms expose the company brand to the public — Renovation Services, Public App, Shop. Each company in the PRV multi-tenant system has its own public-facing presence. The mapping must document which data is company-specific (each company has their own portfolio) vs shared infrastructure (the platform itself).

---

## Issue 4 — CONFLICT-04: Approval Center Module 14 — No Implementation Phase
**Severity:** MEDIUM
**Documents:** MODULE_ARCHITECTURE_PART3.md (Module 14) vs IMPLEMENTATION_ROADMAP_PART2.md

---

### Problem

MODULE_ARCHITECTURE_PART3.md defines Module 14: Approval Center as a fully-specified standalone module with:
- Multi-level approval chains (sequential and parallel)
- SLA enforcement with automatic escalation
- Delegation rules when approvers are absent
- Approval templates per workflow type
- Cross-module approval routing (a Finance approval can require a CEO who is accessed from the Projects context)

IMPLEMENTATION_ROADMAP_PART2.md contains no dedicated Approval Center phase. The roadmap note states: "approvals built into each module."

The problem is the logical consequence of this strategy: if approvals are built into each module independently, there is no central approval engine. This means:
- Module 2 (Projects) builds its own approval logic
- Module 6 (Shop) builds its own approval logic
- Module 8 (Finance) builds its own approval logic
- ...repeated 21 times across 21 modules

The Approval Center module specifies cross-module approval chains (one approval that spans Projects + Finance + HR). This is architecturally impossible if each module owns its own approval logic with no shared engine.

---

### Risk

**Consistency Risk:** 21 independently implemented approval systems will behave differently. Escalation timing, delegation behavior, SLA enforcement, notification format — all will diverge. The enterprise promise of a unified operating system is undermined.

**Cross-Module Risk:** A capital expenditure approval that requires sign-off from the Project Director, Finance Director, and CEO cannot be implemented if Projects, Finance, and the Command Center each own their own siloed approval logic. The approval spans modules but no module owns the cross-module coordination.

**Technical Debt Risk:** Retrofitting a shared Approval Engine after 21 modules have built their own is a full platform migration. This is the most expensive technical debt category — not a simple refactor.

---

### Recommended Solution

**Option A (Recommended):** Build a shared Approval Engine as a library in Phase 3 (Multi-Company Core, Weeks 10–14). Every module imports and uses this library. No module implements its own approval logic. The Approval Center module (Module 14) becomes the UI surface that visualizes approvals from the shared engine — not a separate backend system.

**Option B:** Add a dedicated Approval Engine phase (Phase 3.5) between Phase 3 and Phase 6. Duration: 2–3 weeks. Build the engine once, then all subsequent modules use it.

The resolution requires a decision on which option to adopt, then a single sentence added to IMPLEMENTATION_ROADMAP_PART1.md documenting the shared engine strategy.

---

### Impact Analysis

**Security:** A shared Approval Engine means approval audit logs are centralized. Every approval action — who approved, who rejected, at what time, from which IP — is logged in one place. With 21 separate systems, approval audit logs are scattered across 21 module tables with no unified view.

**Scalability:** A shared engine means approval logic is optimized once. A separate-per-module approach means 21 implementations with potentially 21 different performance characteristics. The shared engine can be cached, indexed, and optimized centrally.

**UX:** Module 14's UI specification (the Approval Center dashboard showing all pending approvals across all modules) is only possible if there is a shared data model. With 21 separate systems, building this unified view requires 21 separate queries with 21 different schemas — not feasible as specified.

**Data Architecture:** A shared Approval Engine means one `approval_chains` table, one `approval_instances` table, one `approval_actions` table. These are already absent from the database schema — they must be added to DATABASE_ARCHITECTURE_PART3.md regardless of which option is chosen.

**Multi-Company Architecture:** Each company has its own approval chain configurations. A shared engine with company_id isolation handles this naturally via RLS. With 21 separate systems, cross-company isolation must be implemented 21 times — 21 opportunities for a data leak.

---

## Issue 5 — CONFLICT-05: Public App — Module 1 but Phase 23
**Severity:** MEDIUM
**Documents:** MODULE_ARCHITECTURE_PART1.md vs IMPLEMENTATION_ROADMAP_PART2.md

---

### Problem

The Public Application is designated as **Module 1** in MODULE_ARCHITECTURE_PART1.md. In enterprise software conventions, Module 1 signals primary importance or first implementation priority.

The Public Application is placed in **Phase 23** (Week 120–127) in IMPLEMENTATION_ROADMAP_PART2.md — the second-to-last major feature phase, appearing after the AI Platform, Safety Module, Knowledge Base, Learning Center, Procurement, and Tools & Fleet.

The Public App is referenced by earlier modules:
- CRM (Phase 11) references the Client Portal embedded in the Public App
- Finance (Phase 12) references invoice delivery through the Public App
- Shop (Phase 9) references product catalog published to the Public App

These cross-references are documented in MODULE_ARCHITECTURE but cannot be tested end-to-end until Phase 23 — over 2 years into development.

---

### Risk

**Testing Risk:** When building CRM in Phase 11, developers cannot test the full flow "CRM creates a project update → client receives update in their Public App portal" because the Public App does not exist yet. Integration testing is deferred for 50+ weeks.

**Signaling Risk:** New team members reading MODULE_ARCHITECTURE first will assume Public App is the first priority. Reading the Roadmap reveals it's the second-to-last. This contradiction creates planning uncertainty.

**Client Demo Risk:** The most visible, client-facing part of the system (the Public App) is not demonstrable until Week 120. For the first 2+ years, only internal tooling is available to show enterprise prospects.

---

### Recommended Solution

**This ordering is architecturally correct** and should not change. The Public App depends on all backend modules being operational (portfolio images from Projects, products from Shop, reviews from CRM, invoices from Finance). Building it last avoids building a frontend against APIs that don't exist yet.

The resolution is documentation clarification, not a reordering:

1. In MODULE_ARCHITECTURE_PART1.md, add a note: *"Module 1 indicates user-facing priority (the first thing an external user sees), not implementation order. See IMPLEMENTATION_ROADMAP_PART2.md Phase 23 for implementation rationale."*

2. In IMPLEMENTATION_ROADMAP_PART2.md Phase 23, add a note: *"Phase 23 is correct. The Public App is built last because it aggregates data from all backend modules. A Public App shell (static pages, contact form, basic portfolio) may be deployed as an early marketing site in Phase 0 if needed — but the full Client Portal requires all backend modules."*

3. Consider a **Phase 0.5 Marketing Shell**: A static Next.js site with the company's branding, services overview, and contact form that can be launched in Week 1 and evolved into the full Public App in Phase 23. This gives a client-facing presence immediately without compromising the implementation order.

---

### Impact Analysis

**Security:** The Client Portal (authenticated client access within the Public App) must inherit the full Zero Trust chain. Building the Public App after the auth system is mature (Phase 2) and the role system is complete (Phase 3) means the Client Portal is built on a solid security foundation rather than being retrofitted.

**Scalability:** The Public App is the highest-traffic surface — public users, search engine crawlers, potential viral traffic. Building it in Phase 23 means performance optimization (CDN, caching, ISR) can be specified based on observed patterns from the business OS, not guesses from Week 1.

**UX:** The Public App has a fundamentally different UX paradigm (consumer-facing, publicly accessible, no login required for most content) than the Business OS (role-based, authenticated, enterprise). Building it last means these two UX paradigms are kept clean and separate throughout development rather than being mixed early.

**Data Architecture:** The Public App reads from tables owned by other modules (products, projects, reviews). These tables are built in Phases 6–22. The Public App's database interaction is read-only aggregation — the schema is fully available by Phase 23.

**Multi-Company Architecture:** Each company in the PRV system has its own Public App presence (their own domain, their own portfolio, their own shop). This multi-tenancy extends to the public-facing layer. Building this in Phase 23 means the multi-company architecture is fully established before the complex public-layer tenancy is added.

---

## Issue 6 — CONFLICT-06: Document Center Folder Depth vs 3-Level Nav Rule
**Severity:** MEDIUM
**Documents:** MODULE_ARCHITECTURE_PART2.md vs CLAUDE.md + NAVIGATION_ARCHITECTURE.md

---

### Problem

CLAUDE.md and NAVIGATION_ARCHITECTURE.md both state unambiguously: **"Navigation maximum 3 levels."**

MODULE_ARCHITECTURE_PART2.md (Document Center, Module 9) describes a folder hierarchy:

```
Company Level
  └── Department
        └── Project
              └── Document Type
                    └── Document Version
```

This is 5 levels deep. If implemented as standard application navigation (each level pushes a new screen), it violates the 3-level rule by 2 levels. A user navigating to a specific document version would traverse:

```
Tab (Level 1) → Company (Level 2) → Department (Level 3) → Project (Level 4) → Document Type (Level 5) → Document Version (Level 6)
```

This is 6 levels of navigation — double the maximum.

---

### Risk

**UX Risk:** If implemented naively as drill-down navigation, users are trapped in deeply nested screens with no clear path back. On mobile, the back button cascade from Level 6 to Level 1 is 5 taps — the antithesis of the Apple-first UX principle.

**Implementation Risk:** Without explicit specification, different developers will solve this differently. Some will implement breadcrumb navigation, some will implement a file browser, some will implement a hierarchical sidebar — creating an inconsistent Document Center experience.

**Design System Risk:** The 3-level rule is a NON-NEGOTIABLE rule in CLAUDE.md. Any violation — even an unintentional one — sets a precedent that the rule is flexible. Other modules may follow.

---

### Recommended Solution

**The Document Center uses a File Browser pattern, not Navigation pattern.**

The architectural resolution:

1. **Navigation levels (counted toward the 3-level rule):** Tab → Document Center → [Folder Browser]
   - Level 1: Tab bar (Document Center tab)
   - Level 2: Document Center home (recents, favorites, company folders)
   - Level 3: Folder Browser (a single screen that displays the current folder contents and allows traversal)

2. **Folder traversal within Level 3:** Tapping a folder within the Folder Browser updates the content of the same screen (same level). The breadcrumb trail at the top of the Folder Browser shows the current path (Company / Department / Project / Document Type) but does not represent navigation levels — it represents content location within a single screen.

3. **Analogy:** This is identical to how the iOS Files app works. Opening the Files app (Level 1), seeing your iCloud Drive (Level 2), and browsing folders within it (Level 3 — one screen that updates as you navigate folders) never violates a 3-level rule because folder browsing is content navigation, not application navigation.

4. **Add to NAVIGATION_ARCHITECTURE.md:** A "File Browser Exception" section clarifying that modules with file-system-like content (Document Center, Knowledge Base) use the Folder Browser pattern where folder traversal is content state change within Level 3, not additional navigation levels.

---

### Impact Analysis

**Security:** The file browser pattern must enforce permissions at the folder level. If a user does not have access to a Department folder, that folder must not appear in the browser — not appear grayed out, not appear with a lock icon. Absent folders prevent targeted attacks (a user cannot know what they don't have access to). This is a stronger security posture than showing locked folders.

**Scalability:** A folder that contains 10,000 documents must use virtual scrolling (load on demand). The file browser pattern naturally supports this — it loads one folder's contents at a time. A deeply nested navigation tree would try to render all levels simultaneously, which is not scalable.

**UX:** The file browser pattern is familiar to all users (iOS Files, Finder, Google Drive, Dropbox). Users do not need to learn a new navigation paradigm. The breadcrumb at the top of the browser provides spatial awareness. Quick-access recents and favorites prevent the need to traverse deep hierarchies for frequently used documents.

**Data Architecture:** The file browser pattern requires a `parent_id` self-referential foreign key on the folders table (already a common pattern for hierarchical data). Querying "all direct children of folder X" is a single indexed query. This is far more efficient than loading a full nested tree.

**Multi-Company Architecture:** Each company's folder hierarchy is isolated by company_id via RLS. The top level of the file browser always shows the user's company's root folders. Cross-company document access (for Sysadmin or CEO with multi-company scope) shows a company selector before the folder browser — one additional interaction, not an additional navigation level.

---

# SECTION B — GAPS

---

## Issue 7 — GAP-01: AI Module Database Entities Missing
**Severity:** CRITICAL
**Missing From:** DATABASE_ARCHITECTURE.md + DATABASE_ARCHITECTURE_PART2.md
**Required By:** MODULE_ARCHITECTURE_PART3.md (Module 13: AI Center), ROLE_ARCHITECTURE.md

---

### Problem

The AI Center (Module 13) is a fully-specified module with:
- AI Assistant (conversational interface per role)
- AI Agents (autonomous task execution)
- AI Recommendations (proactive insights surfaced in dashboards)
- AI Reports (generated reports)
- AI Workflows (multi-step automated processes)

None of these features have a persistence layer. The database architecture covers 151 entities across 17 module categories. Zero entities cover AI.

**Missing tables (minimum viable for AI Center):**

| Table | Purpose |
|-------|---------|
| `ai_conversations` | Per-user conversation sessions with AI |
| `ai_messages` | Individual messages within conversations |
| `ai_recommendations` | Generated recommendations stored for display and audit |
| `ai_recommendation_actions` | User responses to recommendations (accepted/dismissed/snoozed) |
| `ai_agents` | Configured AI agent definitions per company |
| `ai_agent_executions` | Log of every agent invocation |
| `ai_agent_steps` | Individual steps within a multi-step agent execution |
| `ai_logs` | Raw API call log (prompt hash, model, tokens, latency, cost) |
| `ai_tool_calls` | Individual tool invocations within agent sessions |
| `ai_cost_allocations` | Per-company, per-role, per-period AI cost tracking |

---

### Risk

**Functional Risk:** The AI Center cannot be implemented without a schema. Conversations are not persisted (users lose their history on every session). Recommendations are ephemeral (no persistence means no "you dismissed this 3 days ago" memory). Agent executions leave no trace.

**Compliance Risk:** GDPR requires that AI systems processing personal data maintain records of processing activities (Article 30). An AI system with no logs is non-compliant by default.

**Cost Risk:** Without `ai_cost_allocations`, there is no mechanism to track how much AI is costing per company, per role, or per period. At enterprise scale (50 companies, 100 AI users each), untracked AI costs can reach $50,000+/month with no visibility.

**Audit Risk:** SECURITY_ARCHITECTURE.md requires that every action is audited. AI agent actions (read this document, summarize this project, send this notification) are actions. Without `ai_agent_steps` and `ai_tool_calls`, these actions are unaudited — a Zero Trust violation.

---

### Recommended Solution

Create `DATABASE_ARCHITECTURE_PART3.md` with a dedicated AI Entities section covering all 10 tables above. Each table must include:
- All column definitions with types, nullability, and defaults
- Primary key and foreign key relationships
- RLS policy requirements
- Index specifications for common query patterns
- Retention policy (how long AI logs are kept — balancing storage cost vs audit requirements)

The AI schema must also include `company_id` on every table for multi-tenant isolation.

---

### Impact Analysis

**Security:** `ai_logs` enables forensic investigation of AI behavior. If an AI agent takes an unexpected action, the log provides a complete trace: what prompt was sent, what tools were called, what data was accessed. Without this, security incidents involving AI are uninvestigable.

**Scalability:** `ai_logs` will be the highest-write-volume table in the system at enterprise scale. Every AI interaction generates multiple log entries. This table must be partitioned by created_at (time-based partitioning) and archived aggressively. Without this specification, unpartitioned AI logs will degrade database performance within months of launch.

**UX:** `ai_recommendations` persistence enables the "you have 3 pending AI recommendations" badge in the Dashboard. `ai_conversations` persistence enables "continue where you left off" in the AI Assistant. These are core UX features of Module 13 that are impossible without the schema.

**Data Architecture:** The AI schema must define the relationship between AI entities and core business entities. When an AI agent accesses a project to generate a summary, the `ai_agent_steps` entry must reference the project_id. This creates cross-schema dependencies that must be explicit to avoid orphaned references.

**Multi-Company Architecture:** `ai_cost_allocations` by company enables per-company AI billing. In a multi-tenant SaaS model, this is the mechanism for charging enterprise clients for their AI usage. Without it, PRV absorbs all AI costs regardless of which company drove them — unsustainable at scale.

---

## Issue 8 — GAP-02: Webhook / API / Integration Entities Missing
**Severity:** CRITICAL
**Missing From:** DATABASE_ARCHITECTURE.md + DATABASE_ARCHITECTURE_PART2.md
**Required By:** Phase 3 (Multi-Company Core), enterprise integration requirements

---

### Problem

PRV is specified as an enterprise operating system that will integrate with external tools (accounting software, HR platforms, customer systems). Enterprise clients require:
- The ability to receive real-time data from PRV via webhooks
- The ability to query PRV data via API
- The ability to connect third-party services (QuickBooks, Slack, etc.)

None of these integration capabilities have a persistence layer. There are no tables for:
- API tokens (what keys exist? what scopes do they have? which company issued them?)
- Webhook endpoints (where should PRV send events?)
- Webhook delivery logs (was the event received? did the destination respond?)
- Integration configurations (what third-party services are connected?)

Without these tables, PRV is a closed system — it cannot receive data from or send data to external tools.

---

### Risk

**Integration Risk:** Enterprise clients will not adopt a system they cannot integrate with. Their existing tools (accounting, payroll, HR, ERP) must exchange data with PRV. Without an API and webhook system, PRV is an island.

**Security Risk:** API tokens with no persistence cannot be revoked. If an API key is compromised, there is no mechanism to invalidate it — it works until manually rotated. Without `api_token_usage`, there is no rate limiting per token (enabling abuse).

**Operational Risk:** Without webhook delivery logs, there is no visibility into whether integrations are functioning. If a webhook fails repeatedly, the company loses data without knowing it.

**Compliance Risk:** API access to company data must be audited. Without `api_token_usage`, there is no record of what data was accessed via API and when.

---

### Recommended Solution

Add an Integration & API section to `DATABASE_ARCHITECTURE_PART3.md` covering:

| Table | Purpose |
|-------|---------|
| `api_tokens` | Issued API tokens per company with scopes, expiry, and status |
| `api_token_usage` | Per-request API log (token_id, endpoint, method, status_code, latency, timestamp) |
| `webhook_endpoints` | Registered outbound webhook URLs per company with event subscriptions |
| `webhook_events` | Queued outbound event payloads before delivery |
| `webhook_deliveries` | Delivery attempt log (endpoint_id, event_id, attempt_number, status_code, response_body, latency) |
| `integration_configs` | Third-party integration settings per company (encrypted credentials, sync configuration) |
| `integration_sync_logs` | Sync history (integration_id, direction, records_synced, errors, duration) |

---

### Impact Analysis

**Security:** `api_tokens` with explicit scope columns means API access is least-privilege by design. A token scoped to `projects.read` cannot access finance data even if the issuing user has finance access. `api_token_usage` provides the audit trail for all API-based data access — essential for detecting unauthorized access or abuse.

**Scalability:** `api_token_usage` will be a high-volume append-only table. It must be partitioned by created_at and aged aggressively (90-day retention for usage logs, permanent for security incidents). Webhook delivery logs have similar volume characteristics for high-event companies.

**UX:** The API and Webhook management UI (likely within the Command Center or Settings module) requires these tables to display: active API tokens, usage graphs, webhook endpoint status, recent delivery failures. Without the schema, this management UI cannot be built.

**Data Architecture:** Integration configurations storing third-party credentials must use encrypted columns (AES-256-GCM at the application layer, in addition to database encryption). This is a schema-level requirement that must be specified — not left to implementation.

**Multi-Company Architecture:** Every integration table must carry `company_id`. Company A's Slack integration must not be visible or accessible by Company B. This is standard multi-tenancy but must be explicitly confirmed for integration tables, which are often an afterthought in multi-tenant systems.

---

## Issue 9 — GAP-03: Audit Log Table Schema Not Defined
**Severity:** CRITICAL
**Missing From:** DATABASE_ARCHITECTURE.md + DATABASE_ARCHITECTURE_PART2.md
**Required By:** SECURITY_ARCHITECTURE.md (SHA-256 chained audit), ROLE_ARCHITECTURE.md (retention by level)

---

### Problem

SECURITY_ARCHITECTURE.md specifies a SHA-256 chained, immutable, append-only audit log system as a core security requirement. ROLE_ARCHITECTURE.md specifies retention policies by role level (L2=90 days, L3=1 year, L4=7 years, L5=permanent).

Despite being referenced throughout all security specifications, the `audit_logs` table has never been defined in DATABASE_ARCHITECTURE.md or DATABASE_ARCHITECTURE_PART2.md. There is no schema — no columns, no types, no indexes, no RLS policies.

This is the most critical database gap. Every action in the system is supposed to generate an audit log entry. The table that stores these entries does not exist in the blueprint.

---

### Risk

**Security Risk:** An audit log system without a defined schema will be implemented inconsistently — different developers will add different columns, use different types, and apply different indexing. The resulting logs will be impossible to query uniformly for security investigations.

**Compliance Risk:** The SHA-256 chain that makes logs tamper-evident requires the `previous_hash` column. Without a schema, this column may not be implemented, breaking the chain integrity entirely. A broken chain cannot be used as legal evidence in security investigations.

**GDPR Risk:** GDPR anonymization of audit logs requires explicit columns for `gdpr_status`, `anonymized_at`, and a policy for which fields are anonymized vs retained. Without a schema, GDPR processing of audit logs is not specifiable.

**Retention Risk:** Without a `retention_level` column, automated retention enforcement (delete L2 logs after 90 days) cannot target individual records based on the acting user's role level. All logs would be treated with the same retention policy, either under-retaining high-level logs or over-retaining low-level ones.

---

### Recommended Solution

Add a complete `audit_logs` table definition to `DATABASE_ARCHITECTURE_PART3.md` with all columns required by the security specification:

- `id`, `company_id`, `actor_id`, `actor_role`, `actor_scope_level`
- `action_type` (enum: CREATE, READ, UPDATE, DELETE, EXPORT, LOGIN, LOGOUT, PERMISSION_CHANGE, SECURITY_EVENT)
- `resource_type`, `resource_id`
- `resource_snapshot_before`, `resource_snapshot_after` (JSONB, encrypted for sensitive resources)
- `ip_address`, `user_agent`, `session_id`, `request_id`
- `geo_location`, `device_fingerprint`
- `chain_hash` (SHA-256 of this entry + previous_hash), `previous_hash`
- `retention_level` (L2/L3/L4/L5 — determines retention period)
- `gdpr_status` (enum: ACTIVE, ANONYMIZED, PURGED)
- `anonymized_at`, `anonymized_fields` (JSONB — list of fields that were anonymized)
- `created_at` (immutable — no `updated_at` on audit logs, ever)

Add index specifications: `(company_id, created_at)`, `(actor_id, created_at)`, `(resource_type, resource_id, created_at)`, `(action_type, created_at)`.

---

### Impact Analysis

**Security:** The SHA-256 chain with `previous_hash` creates a tamper-evident log. Any modification to a historical entry invalidates all subsequent chain hashes — detectable by automated monitoring. This is the technical basis for the audit system's legal defensibility.

**Scalability:** Audit logs will be the highest-volume table after AI logs. Every read, write, login, and permission check generates an entry. At 1,000 employees × 100 actions/day = 100,000 entries/day × 365 days = 36.5 million entries/year. Time-based partitioning (by month) is mandatory. Retention-based pruning (automated deletion of L2 entries after 90 days) is mandatory.

**UX:** The Security Dashboard (specified in SECURITY_ARCHITECTURE.md) displays audit log queries: "who accessed what, when." The `action_type` enum drives filtering. The `actor_role` column drives the "filter by role" feature. Without the schema, the Security Dashboard cannot be implemented as specified.

**Data Architecture:** The `resource_snapshot_before` and `resource_snapshot_after` columns enable point-in-time reconstruction of any record's state — a powerful forensic capability. These JSONB columns must be selective (not every read action needs a snapshot — only write actions) to avoid storage explosion.

**Multi-Company Architecture:** `company_id` on audit_logs combined with RLS means each company can only see their own audit logs. The Sysadmin can query across companies. This directly implements the zero-trust cross-company boundary at the audit layer.

---

## Issue 10 — GAP-04: Supplier Management Module Missing
**Severity:** HIGH
**Missing From:** MODULE_ARCHITECTURE_PART1–4.md + IMPLEMENTATION_ROADMAP

---

### Problem

PRODUCT_VISION.md lists Supplier Management as Platform #16 — one of the 18 core platforms of PRV. Despite this explicit designation, Supplier Management has no corresponding module in MODULE_ARCHITECTURE and no implementation phase in the roadmap.

Procurement (Module 15) covers:
- Purchase orders and approval
- Vendor catalog
- Budget management
- Procurement analytics

Supplier Management is a distinct domain covering:
- Supplier qualification and onboarding (vetting new suppliers)
- Supplier performance scoring (quality, delivery, pricing)
- Supplier certification tracking (ISO, safety certifications with expiry dates)
- Supplier contract lifecycle management
- Supplier-facing portal (suppliers view their own POs, submit invoices)
- Supplier communication and dispute resolution

These are functionally separate from Procurement's purchase-order focus.

---

### Risk

**Scope Risk:** Without a module definition, Supplier Management features will be added ad-hoc to the Procurement module during implementation, creating a bloated Procurement module that serves two distinct purposes.

**Enterprise Risk:** For a renovation/construction company, supplier management is a core operational concern. Tracking which suppliers are certified, which have active contracts, and which are underperforming is as important as issuing purchase orders.

**Implementation Risk:** Phase 21 (Procurement) will be implemented without knowing the Supplier Management scope. Features may be built into Procurement that belong in Supplier Management, or vice versa.

---

### Recommended Solution

**Option A:** Define Supplier Management as a sub-module within Module 15 (Procurement). Procurement becomes Procurement & Supplier Management with two distinct sections: Procurement (purchase orders, budgets) and Suppliers (qualification, performance, portal).

**Option B:** Define Supplier Management as a standalone Module 22. This creates the most architectural clarity but adds a 23rd module to the system.

**Option C:** Explicitly define what Supplier Management features are in scope for PRV and which are deferred. If PRV serves primarily renovation companies, a lightweight supplier tracking feature within Procurement may be sufficient.

Regardless of option chosen, the resolution requires specifying the scope of Supplier Management in a PRV document before Phase 21 begins.

---

### Impact Analysis

**Security:** A Supplier Portal (suppliers accessing their own data) introduces a new class of external user — not employees, not clients, but third-party vendors. This requires a new authentication pathway (supplier accounts) and new RLS policies (suppliers see only their own POs, invoices, and performance data). This is a significant security surface expansion that must be specified.

**Scalability:** Supplier performance scoring (quality scores, delivery scores, pricing scores) requires regular computation over historical PO and delivery data. At scale (500 suppliers × 5 years of history), this is a non-trivial analytics workload that must be designed for batch processing, not real-time calculation.

**UX:** The Supplier Portal is a consumer-facing product used by external parties on their own devices, potentially on mobile. It follows different UX principles than the internal Business OS (simpler, onboarding-focused, no role-based navigation complexity).

**Data Architecture:** Supplier Management requires a `suppliers` table (distinct from `vendors` in Procurement, or merged with explicit scope), `supplier_certifications`, `supplier_performance_scores`, `supplier_contracts`, and `supplier_portal_accounts`. None of these exist in the current schema.

**Multi-Company Architecture:** Each company in the PRV system has their own supplier relationships. Company A's supplier list is completely isolated from Company B's. A supplier can be registered with multiple companies independently (they appear as separate supplier records in each company's database).

---

## Issue 11 — GAP-05: Renovation Services Module Missing
**Severity:** HIGH
**Missing From:** MODULE_ARCHITECTURE_PART1–4.md
**Required By:** PRODUCT_VISION.md (Platform #2 — primary revenue platform)

---

### Problem

PRODUCT_VISION.md identifies Renovation Services as Platform #2 — the primary revenue-generating platform for PRV. The company's core business is renovation. The entire platform exists to serve renovation companies.

Despite being the most important business domain, Renovation Services has **no corresponding module** in the entire MODULE_ARCHITECTURE. No module covers:

- Service catalog (by service type: interior, bathroom, kitchen, flooring, painting, electrical, plumbing, commercial)
- Project estimation and quoting (scope, materials, labor)
- Site visit scheduling and tracking
- Material specification per project type
- Subcontractor management
- Client sign-off workflows (client approves each phase)
- Before/after photo documentation
- Renovation progress tracking (distinct from general project management)
- Warranty management (post-completion)
- Complaint and rework management

These are not covered by Module 2 (Projects), which handles general project management. Renovation projects have a specific lifecycle, specific document types (building permits, site inspection reports, client approval forms), and specific stakeholders (clients, subcontractors, suppliers, inspectors) that general project management does not address.

---

### Risk

**Existential Risk:** The primary revenue product of the company that PRV is designed for has no architectural specification. If implementation begins without this module, developers will improvise the most important feature using general-purpose project management patterns — resulting in a system that doesn't actually serve renovation work well.

**Product-Market Fit Risk:** PRV's differentiation in the market is serving renovation companies better than generic ERPs. Without a Renovation Services module with renovation-specific workflows, PRV is a generic project management system — indistinguishable from competitors.

---

### Recommended Solution

Create `MODULE_ARCHITECTURE_PART5.md` defining:
- **Module 22: Renovation Services** — All 13 required sections (Purpose, Users, Permissions, Scope, Navigation, Dashboard Integration, Notifications, Analytics, AI Integration, Documents, Workflows, Automations, Approvals)

Additionally, add a Phase for Renovation Services in the Implementation Roadmap (between Phase 7 — Projects, and Phase 8 — HR) since it is the primary product.

**Priority:** This is the highest-impact gap in the entire architecture. It should be the first new blueprint document created.

---

### Impact Analysis

**Security:** Renovation projects involve sensitive client information (home addresses, building access), financial information (project costs, payment schedules), and contractual information. The Renovation Services module requires explicit permission specifications for which roles can see client addresses, which can see contract values, and which can access the building during site visits.

**Scalability:** Photo documentation (before/after photos per room, per phase) is the highest-volume storage use case in the system. A single renovation project may generate 500+ photos. At 100 active projects, 50,000+ photos. Storage architecture (compression, CDN, tiered storage) must be specified for this module specifically.

**UX:** Renovation Services requires the most custom UX in the system — a phase-based project view (Demolition → Rough-in → Finishing → Punch List → Handover), a photo gallery with room-by-room organization, a mobile-first site visit flow (workers are on-site with phones, not desktops). This UX is not adequately served by the general project management navigation.

**Data Architecture:** Renovation Services requires domain-specific tables: `renovation_projects` (extending `projects`), `renovation_phases`, `renovation_phase_inspections`, `renovation_materials_used`, `renovation_subcontractors`, `renovation_client_approvals`, `renovation_photos`, `renovation_warranties`. These do not exist in the current 151-entity schema.

**Multi-Company Architecture:** For PRV serving multiple renovation companies, each company has its own service catalog (Company A offers commercial spaces, Company B does not). The service catalog must be configurable per company, not a global list.

---

## Issue 12 — GAP-06: Cross-Company Communication Unspecified
**Severity:** MEDIUM
**Missing From:** MODULE_ARCHITECTURE_PART2.md (Communication Center), PRODUCT_VISION.md

---

### Problem

PRODUCT_VISION.md defines a multi-company ownership structure where one CEO may own and manage multiple companies within PRV. However, no specification covers communication or data sharing between these companies.

**Unresolved scenarios:**
- A CEO who owns Company A and Company B wants to message the Director of Company B from their Company A context — where does this conversation live?
- A CEO wants to see consolidated revenue across all their companies in one dashboard — which company context owns this view?
- A worker is employed by both Company A and Company B (shared resource) — which company's absence affects which company's workforce report?
- Company A wants to subcontract a project to Company B (inter-company project transfer) — how is this modeled?
- A CEO wants to view a combined P&L across all companies — which module owns this?

---

### Risk

**Operational Risk:** Without cross-company communication specification, CEOs managing multiple companies must log out of one and log into another to communicate — destroying the unified OS experience.

**Data Risk:** Consolidated reporting (total group revenue, total group workforce) requires querying across company boundaries. Without specification, this is either not implemented (unacceptable for a CEO managing a group of companies) or implemented as an unaudited bypass of company isolation (a security risk).

---

### Recommended Solution

Add a **Multi-Company Group Architecture** section to MODULE_ARCHITECTURE_PART4.md (Command Center) or create a dedicated addendum. This section should specify:

1. **Group CEO Role:** A new scope level above Company that represents "owner of a group of companies." This is distinct from the current CEO role (which is company-scoped).

2. **Group Dashboard:** A Command Center view aggregating KPIs across all owned companies. Each company is a card, not a drill-down.

3. **Cross-Company Messaging:** Messages between CEOs of different companies within the same ownership group are stored in a `group_conversations` table with group_id isolation.

4. **Shared Resources:** A worker employed by multiple companies has multiple `company_memberships` records. Their attendance and workforce record is per-company.

5. **Inter-Company Projects:** A project transferred from Company A to Company B creates a `project_transfer` record and duplicates the project under Company B, with an audit trail linking to the original.

---

### Impact Analysis

**Security:** Cross-company access requires a new authorization context. The current Zero Trust chain (Gate 5: Company) validates that a user belongs to the company owning the resource. Cross-company access must pass an additional gate: Group Ownership Validation — confirming the actor owns both companies. Without this gate, cross-company queries are a data boundary violation.

**Scalability:** Group-level dashboards aggregate data across multiple companies in real-time. At 10 companies × large datasets, these aggregations are expensive. Pre-computed snapshots (nightly aggregation into `group_kpi_snapshots`) are required rather than real-time queries.

**UX:** The Group CEO experience must not feel like switching between separate apps. A company switcher (similar to Slack's workspace switcher) at the top of the interface allows context switching without full logout/login. The selected company drives all content below the switcher.

**Data Architecture:** Requires new tables: `company_groups`, `group_memberships` (which companies belong to which group), `group_kpi_snapshots`, `group_conversations`. All existing per-company tables remain unchanged — the group layer is an aggregation layer above company-level data.

**Multi-Company Architecture:** This resolution is the multi-company architecture. The current specification covers company isolation (horizontal tenancy). This adds group-level consolidation (vertical tenancy) — the ability to look up and across company boundaries, not just within them. These two dimensions together create the complete multi-company model.

---

## Issue 13 — GAP-07: AI Permission Enforcement at Data Layer Unspecified
**Severity:** CRITICAL
**Missing From:** All documents
**Required By:** ROLE_ARCHITECTURE.md (AI Access Framework), MODULE_ARCHITECTURE_PART3.md

---

### Problem

ROLE_ARCHITECTURE.md defines an AI Access Framework specifying which roles can use which AI features. However, no document specifies how AI tool calls are permission-checked at the data layer.

**The architectural gap:**

The AI Agent makes tool calls to access business data. For example:
- `get_project_list(company_id)` — retrieves all projects
- `get_financial_summary(company_id, period)` — retrieves P&L data
- `get_employee_records(company_id)` — retrieves HR data

When a Worker (lowest permission level) asks the AI "What is our company profit this month?", the AI agent calls `get_financial_summary`. No specification defines whether:

1. The tool call is rejected because the Worker lacks `finance.analytics.view` permission
2. The tool call succeeds and returns financial data to the Worker via the AI (bypassing role-based access)
3. The tool call returns partial data (filtered to what the Worker can see — but Workers see no finance data at all)

**This is the most dangerous architectural gap in the entire system.** A Worker with AI access could bypass every role-based access control by asking the AI natural-language questions about data they cannot directly access.

---

### Risk

**Security Risk:** Role-based access controls are rendered ineffective if the AI layer does not enforce them. An attacker (or malicious insider) with Worker access and AI access can query any data in the system by asking the AI in natural language.

**Compliance Risk:** GDPR and employee data protection laws require that personal data (salary, performance reviews, disciplinary records) is accessible only to authorized roles. If AI bypasses these controls, every HR record is exposed to any employee with AI access.

**Trust Risk:** If a Worker discovers they can see CEO-level data through the AI, the entire permission system loses credibility. The perception of security is as important as actual security.

---

### Recommended Solution

Define an **AI Tool Permission Manifest** in MODULE_ARCHITECTURE_PART3.md (AI Center). Every AI tool function must declare:

```
tool: get_financial_summary
minimum_role: [Finance Manager, CFO, CEO, Co-CEO, Sysadmin]
minimum_scope: COMPANY
requires_permissions: [finance.analytics.view]
data_sensitivity: HIGH
allows_export: false
```

**Enforcement architecture:**

1. Before any AI tool is executed, the AI runtime checks the requesting user's role and permissions against the tool's manifest.
2. If the user lacks the required permissions, the tool is not called. The AI responds with: "I don't have access to that information for your account."
3. If the user has partial access (e.g., can see some departments but not others), the tool is called with scope restrictions passed as parameters.
4. All AI tool calls (attempted + executed) are logged in `ai_tool_calls` with the user's permission state at call time.

**Prompt injection protection:**
Add to MODULE_ARCHITECTURE_PART3.md: AI input from user-generated content (document contents, task descriptions, customer notes) is passed to the AI as data, not as instructions. The system prompt explicitly defines the AI's tool capabilities and cannot be overridden by content in the data payload.

---

### Impact Analysis

**Security:** This is the resolution that closes the highest-severity security gap in the architecture. With a Tool Permission Manifest, the AI layer enforces the same Zero Trust chain as direct API access. No data is accessible through the AI that is not accessible directly — the AI becomes a natural-language interface to the permission system, not a bypass of it.

**Scalability:** Permission checks against the Tool Manifest are in-memory lookups (the manifest is a static configuration). They add negligible latency to AI tool calls. Logging tool calls to `ai_tool_calls` adds one database write per tool invocation — acceptable overhead for the security guarantee it provides.

**UX:** The UX implication is that the AI must gracefully handle permission denials. "I can't access that data for your account" is more informative than a generic error. The AI can also proactively tell users what data it CAN access for them — reducing frustration when a Worker discovers limitations.

**Data Architecture:** The Tool Permission Manifest is a configuration file, not a database table. It is code-adjacent to the AI tool definitions. However, `ai_tool_calls` (the execution log) IS a database table and must be added to DATABASE_ARCHITECTURE_PART3.md.

**Multi-Company Architecture:** Tool calls must include `company_id` as a mandatory parameter. The AI cannot query "all projects across all companies" for a company-scoped user. The company boundary must be enforced at the tool layer, not trusted to the AI to respect.

---

## Issue 14 — GAP-08: Offline Mode Specification Missing
**Severity:** MEDIUM
**Missing From:** All documents
**Required By:** PRODUCT_VISION.md (field workers, construction sites)

---

### Problem

PRODUCT_VISION.md describes PRV's users as including field workers on construction sites. Construction sites frequently have poor or no internet connectivity. If PRV requires a constant internet connection for all functionality, the following critical operations fail at the location where they are most needed:

- **Attendance check-in** — Workers arriving at a construction site cannot clock in if there is no signal
- **Task status updates** — Workers cannot mark tasks complete without connectivity
- **Photo uploads** — Site documentation cannot be captured without connectivity
- **Safety incident reporting** — Cannot report a safety incident if there is no signal
- **Material tracking** — Cannot log material usage without connectivity

No specification currently covers what happens when connectivity is lost.

---

### Risk

**Adoption Risk:** If field workers cannot use the app on-site, they will not use it at all. Attendance will revert to paper sign-in. Tasks will be updated when back in the office. The real-time visibility promise of PRV collapses for the most important use case.

**Data Risk:** If offline actions are queued locally and synced on reconnection, conflict scenarios must be handled. Two workers updating the same task offline will create a conflict. No conflict resolution strategy is specified.

---

### Recommended Solution

Add an **Offline Architecture** section to IMPLEMENTATION_ROADMAP_PART1.md (Phase 1 or as a cross-cutting concern) specifying:

**1. Offline-capable modules (minimum viable):**
- Attendance (check-in/out — local queue, sync on reconnect)
- Tasks (status updates — local optimistic update, sync on reconnect)
- Safety Incidents (report submission — local queue, sync on reconnect, high priority)
- Photo capture (stored locally, uploaded on reconnect)

**2. Offline storage:** IndexedDB (via Dexie.js or similar) for queued mutations. Service Worker for caching API responses.

**3. Sync protocol:** On reconnect, process the queue in chronological order. Display a sync status indicator while processing.

**4. Conflict resolution rules:**
- Attendance check-ins: server timestamp wins (prevents time manipulation)
- Task status: last-write-wins (most recent update takes precedence)
- Safety incidents: all submissions accepted (never reject a safety report)
- Photos: all uploads accepted (no conflict possible — each photo is unique)

**5. Offline indicator:** A persistent, visible indicator in the UI when the app is offline. Users must always know they are in offline mode.

---

### Impact Analysis

**Security:** Offline data stored locally (IndexedDB) must be encrypted. If a worker's phone is lost or stolen while containing offline-queued data, that data must not be readable without authentication. The encryption key must be derived from the user's session, not stored in plaintext.

**Scalability:** Offline sync creates burst write patterns — all offline-queued writes arrive simultaneously when a worker enters connectivity range. At 50 workers leaving a site simultaneously, this is a burst of 50+ attendance records arriving at once. The backend must handle these bursts without queuing failures.

**UX:** The offline experience must be clearly communicated. Users must see: "You are offline. Your actions will sync when you reconnect." Actions that cannot be completed offline (viewing financial reports, accessing documents not cached) must show a clear "Requires Connection" message rather than a confusing error.

**Data Architecture:** Offline-queued mutations must be stored in a device-local format that mirrors the server schema. When syncing, the local record is upserted to the server. This requires that all synced entities have a `client_generated_id` (UUID generated on device before server confirms) so locally-created records can be reconciled with server-assigned IDs.

**Multi-Company Architecture:** A worker who is a member of multiple companies must have their offline queue partitioned by company. Reconnecting to Company A's network should not sync Company B's offline queue. The offline storage must be keyed by `(company_id, user_id)`.

---

## Issue 15 — GAP-09: Notification Delivery Failure Handling
**Severity:** LOW
**Missing From:** MODULE_ARCHITECTURE_PART3.md (Module 11: Notification Center)
**Required By:** All modules relying on notification delivery SLAs

---

### Problem

The Notification Center (Module 11) is specified with notification types, priorities, and delivery channels (push, in-app, email, SMS). No specification covers what happens when delivery fails:

- Push notification rejected (expired device token)
- Email bounced (invalid address)
- SMS undeliverable (invalid number)
- User device offline at time of delivery

For critical notifications (project deadline warning, safety incident alert, approval required), delivery failure is a significant operational risk.

---

### Risk

**Operational Risk:** A manager who should have received a safety incident alert doesn't receive it because their push token expired. No fallback channel is attempted. The alert is silently lost.

**Compliance Risk:** For regulatory notifications (GDPR data breach notifications, safety incident escalations), delivery failure must be logged and retried. Silent failures may constitute non-compliance.

---

### Recommended Solution

Add a **Notification Delivery Reliability** section to MODULE_ARCHITECTURE_PART3.md specifying:

1. **Retry policy:** Failed deliveries retry with exponential backoff (2s, 4s, 8s, 16s). Maximum 5 attempts.
2. **Channel fallback:** If push fails, fall back to in-app. If in-app is unread for X hours (based on notification priority), fall back to email. Critical notifications always attempt all channels.
3. **Dead letter queue:** Notifications that fail all retries on all channels are moved to a dead-letter queue. The notification sender is alerted to the delivery failure.
4. **Token maintenance:** Expired push tokens are automatically removed when a delivery attempt fails with token-expired status. The device's new token (from next app open) replaces the old one.
5. **Delivery confirmation:** In-app notifications mark as "delivered" when the client confirms receipt. Email delivery is tracked via open pixel or delivery receipt. Push delivery is tracked via platform delivery confirmation.

---

### Impact Analysis

**Security:** Delivery failure logs (`notification_deliveries` table) are audit evidence that a notification was sent. In a legal dispute about whether a user was notified of a policy change or a safety incident, the delivery log is the evidence. This table must be added to DATABASE_ARCHITECTURE_PART3.md.

**Scalability:** The retry system must use a background job queue (Inngest). Failed notifications should not block the main notification dispatch pipeline. At scale (1,000 notifications/minute), even a 1% failure rate means 10 retries/minute — a manageable background load if queued properly.

**UX:** Users should see an in-app notification count that updates when push fails (the in-app fallback ensures the user sees the notification when they next open the app). The notification inbox becomes the reliable fallback — it should always be current.

**Data Architecture:** Requires `notification_deliveries` table: `(notification_id, channel, attempt_number, status, delivered_at, error_code, error_message)`.

**Multi-Company Architecture:** Delivery failures are per-company data. A company's notification failure rate is a system health metric visible in that company's Command Center. Cross-company delivery statistics are visible only to Sysadmin.

---

## Issue 16 — GAP-10: Data Migration Strategy Missing
**Severity:** MEDIUM
**Missing From:** IMPLEMENTATION_ROADMAP_PART1–2.md
**Required By:** Enterprise onboarding

---

### Problem

IMPLEMENTATION_ROADMAP_PART2.md Phase 25 (Launch Preparation) does not include a data migration strategy. Enterprise clients adopting PRV will have existing data in:

- Excel/CSV files (employee lists, project histories, inventory)
- Accounting software (QuickBooks, Xero, Sage)
- HR systems (BambooHR, Workday, custom HR)
- Project management tools (Jira, Asana, Monday.com)
- CRM systems (Salesforce, HubSpot)

No enterprise client will adopt a new operating system and manually re-enter years of historical data. Without migration tooling, the target market for PRV is limited to new companies with no existing data — a tiny fraction of the enterprise market.

---

### Risk

**Market Risk:** The primary enterprise target (established renovation companies with 50–500 employees) all have existing data. Without migration tooling, the sales cycle includes "you'll need to re-enter all your historical data manually" — which is a deal-breaker for most enterprises.

**Onboarding Risk:** Even if a client agrees to migrate manually, the data entry burden at launch is so high that adoption fails. A company with 200 employees and 5 years of project history faces weeks of manual data entry.

---

### Recommended Solution

Add a **Data Migration & Onboarding** section to IMPLEMENTATION_ROADMAP_PART2.md (Phase 25 or as Strategic Deliverable I) specifying:

1. **Migration toolkit:** A set of importers for common formats:
   - CSV/Excel import for: employees, projects, clients, products, inventory
   - API-based import connectors for: QuickBooks (finance), BambooHR (HR), Jira (projects)
   - Manual data templates (downloadable Excel templates with the exact columns PRV expects)

2. **Migration validation:** Before import, the system validates data quality: required fields present, email formats valid, duplicate detection, referential integrity checks. Migration errors are displayed in a report before commitment.

3. **Migration audit:** All imported records are tagged with `imported_at`, `import_source`, and `import_batch_id`. Imported data is distinguishable from native data for support and debugging.

4. **Historical data:** Financial history, project history, and HR history can be imported as read-only historical records without full workflow execution (an import of a closed project does not trigger all project creation workflows).

5. **Onboarding wizard:** A guided setup wizard for new companies covering: company profile, first admin user, department structure, initial employee import, and system configuration.

---

### Impact Analysis

**Security:** Migration of financial and HR data requires that the migration process itself is authenticated, authorized, and audited. Only Sysadmin or Company Admin can initiate a migration. Each migration is a bulk-import audit event. Sensitive fields (salary data, personal data) imported via CSV must be encrypted in transit and validated for GDPR compliance at import time (consent verification for storing personal data).

**Scalability:** Large migrations (10,000 employees, 50,000 historical project records) must run as background jobs (Inngest), not synchronous web requests. A migration of this size runs for minutes or hours. The UI shows migration progress, not a loading spinner.

**UX:** The onboarding wizard is the first experience a new company administrator has with PRV. It must be exceptional — clear, guided, progress-tracked, and forgiving. An 80% completion rate for initial setup is a reasonable target; below 60% indicates the wizard is too complex.

**Data Architecture:** Migration requires temporary staging tables where data is held for validation before being promoted to production tables. A `migration_batches` table tracks each migration job, its status, record counts, and error logs.

**Multi-Company Architecture:** Each company's migration is isolated. A failed migration for Company A does not affect Company B. The Sysadmin can monitor all active migrations across companies from the Sysadmin dashboard.

---

*End of Part 1 — Continues in ARCHITECTURE_RESOLUTION_PART2.md*

*Part 2 covers: Scalability Risks (17–22), Security Risks (23–28), UX Issues (29–34), Database Issues (35–39), Role & Permission Issues (40–42), and Final Resolution Summary.*
