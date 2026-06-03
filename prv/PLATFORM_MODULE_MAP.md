# PRV — Platform to Module Map
**Version:** 2.0 (Post Architecture Review)
**Status:** APPROVED — Reflects all 5 architectural decisions
**Date:** 2026-06-03

---

## Overview

PRV combines **18 user-facing platforms** implemented through **23 internal modules**, governed by a **4-tier scope architecture** (Record → Company → Group → Global).

This document is the single source of truth for the relationship between platforms (what users and clients see) and modules (what engineers build).

---

## Scope Architecture (9 Levels)

```
Level 9 — GLOBAL        Sysadmin only. All companies, all groups, all data.
Level 8 — PLATFORM      Platform administrators. Reserved for PRV operations.
Level 7 — GROUP         Group CEO. All companies within their ownership group.
Level 6 — COMPANY       CEO, Co-CEO. All data within one company.
Level 5 — REGION        Regional Manager. All stores in their region.
Level 4 — STORE         Store Manager. One store and its sub-entities.
Level 3 — DEPARTMENT    Department Head, HR Manager. Their department.
Level 2 — TEAM          Team Lead. Their team members and tasks.
Level 1 — RECORD        All users. Their own records only.
```

---

## Platform → Module Mapping

### External-Facing Platforms (Client / Public Accessible)

| # | Platform | Module(s) | Module # | Implementation Phase | Audience |
|---|----------|-----------|----------|---------------------|---------|
| 1 | Public Presentation Platform | Public Application | Module 01 | Phase 23 (Week 120) | Public + Clients |
| 2 | Renovation Services Platform | Renovation Services | Module 22 | Phase 7.5 (Week 46) | Clients + Internal |
| 7 | Shop Platform | Shop | Module 06 | Phase 9 (Week 56) | Public + Clients + Internal |
| 6 | CRM Platform | CRM + Client Portal | Module 07 | Phase 11 (Week 68) | Clients + Internal |

### Internal Platforms (Employee-Facing Only)

| # | Platform | Module(s) | Module # | Implementation Phase | Audience |
|---|----------|-----------|----------|---------------------|---------|
| 3 | Project Management Platform | Projects | Module 02 | Phase 6 (Week 30) | Internal |
| 5 | Attendance Management Platform | Attendance | Module 03 | Phase 7 (Week 38) | Internal |
| 4 | Workforce Management Platform | Workforce | Module 04 | Phase 7 (Week 38) | Internal |
| 8 | Finance Platform | Finance | Module 08 | Phase 12 (Week 74) | Internal |
| 9 | Analytics Platform | Analytics | Module 12 | Phase 15 (Week 96) | Internal |
| 10 | AI Platform | AI Center | Module 13 | Phase 17 (Week 104) | Internal |
| 11 | Document Management Platform | Document Center | Module 09 | Phase 12 (Week 74) | Internal |
| 12 | Notification Center | Notification Center | Module 11 | Phase 14 (Week 90) | Internal |
| 13 | Knowledge Base | Knowledge Base | Module 18 | Phase 19 (Week 110) | Internal |
| 14 | Learning Center | Learning Center | Module 19 | Phase 20 (Week 113) | Internal |
| 15 | Procurement Center | Procurement | Module 15 | Phase 21 (Week 116) | Internal |
| 16 | Supplier Management | Supplier Management | Module 23 | Phase 21.5 (Week 119) | Internal + Suppliers |
| 17 | Fleet Management | Fleet Management | Module 17 | Phase 22 (Week 122) | Internal |
| 18 | Tool Management | Tool Management | Module 16 | Phase 22 (Week 122) | Internal |

---

## Internal-Only Modules (No Corresponding Platform)

These modules are foundational infrastructure — they support all other modules but are not exposed as standalone user-facing platforms.

| Module # | Module Name | Role | Used By |
|----------|------------|------|---------|
| Module 05 | HR | Employee lifecycle, contracts, payroll, org chart | All people-related modules |
| Module 10 | Communication Center | Internal messaging, channels, threads | All modules with team collaboration |
| Module 14 | Approval Center | Shared approval engine UI, cross-module approval dashboard | All 23 modules (via shared Approval Engine library) |
| Module 20 | Safety Center | Safety incidents, inspections, compliance | Projects, Workforce, Renovation Services, Fleet |
| Module 21 | Command Center | Executive dashboards, Group CEO view, KPI cockpit | CEO, Co-CEO, Group CEO roles |

---

## Complete Module Registry (23 Modules)

| Module # | Name | Platform | Phase | Status |
|----------|------|---------|-------|--------|
| 01 | Public Application | Public Presentation | 23 | Specified |
| 02 | Projects | Project Management | 6 | Specified |
| 03 | Attendance | Attendance Management | 7 | Specified |
| 04 | Workforce | Workforce Management | 7 | Specified |
| 05 | HR | (Internal) | 8 | Specified |
| 06 | Shop | Shop Platform | 9 | Specified |
| 07 | CRM | CRM Platform | 11 | Specified |
| 08 | Finance | Finance Platform | 12 | Specified |
| 09 | Document Center | Document Management | 12 | Specified |
| 10 | Communication Center | (Internal) | 13 | Specified |
| 11 | Notification Center | Notification Center | 14 | Specified |
| 12 | Analytics | Analytics Platform | 15 | Specified |
| 13 | AI Center | AI Platform | 17 | Specified |
| 14 | Approval Center | (Internal — Shared Engine) | Phase 3 (engine) | Specified |
| 15 | Procurement | Procurement Center | 21 | Specified |
| 16 | Tool Management | Tool Management | 22 | Specified |
| 17 | Fleet Management | Fleet Management | 22 | Specified |
| 18 | Knowledge Base | Knowledge Base | 19 | Specified |
| 19 | Learning Center | Learning Center | 20 | Specified |
| 20 | Safety Center | (Internal) | 18 | Specified |
| 21 | Command Center | (Internal — Executive) | 16 | Specified |
| 22 | Renovation Services | Renovation Services | 7.5 | Specified (Part 5) |
| 23 | Supplier Management | Supplier Management | 21.5 | Specified (Part 5) |

---

## Group CEO Architecture Layer

The Group CEO role operates above the Company scope level, across all companies within an ownership group.

```
PRV Group Architecture:

GROUP LEVEL (Group CEO scope)
  └── Company A (CEO A)
        └── Departments, Stores, Teams, Workers
  └── Company B (CEO B)
        └── Departments, Stores, Teams, Workers
  └── Company C (CEO C)
        └── Departments, Stores, Teams, Workers

GROUP CEO sees:
  - Consolidated revenue across all companies
  - Cross-company workforce summary
  - Group-level AI insights
  - Inter-company messaging
  - Group Command Center (consolidated KPI cards per company)

COMPANY CEO sees:
  - Their company only (SCOPE_COMPANY)
  - Cannot see other companies in the group
  - Cannot see group-level aggregations
```

### Group CEO vs Company CEO

| Feature | Company CEO | Group CEO |
|---------|------------|----------|
| Scope Level | 6 (COMPANY) | 7 (GROUP) |
| Revenue View | Own company | All companies in group |
| Workforce | Own company | All companies in group |
| Command Center | Company cockpit | Group cockpit + per-company drill-down |
| Messaging | Within company | Cross-company within group |
| AI Insights | Company-level | Group-level + per-company |
| Approvals | Company chain | Group-level final authority |
| Data Access | company_id = own | All company_ids in group_memberships |

---

## Approval Engine Architecture

The Approval Engine is a shared library built in Phase 3 (Multi-Company Core). It is NOT a standalone backend service — it is a library imported by all 23 modules.

```
Approval Engine Library
  ├── createApprovalChain(template, context)
  ├── submitForApproval(entity, chain_id, approvers)
  ├── processApproval(instance_id, action, comment)
  ├── delegateApproval(instance_id, delegate_id, until)
  ├── escalateApproval(instance_id, reason)
  └── getApprovalStatus(instance_id)

Used by:
  Module 02 (Projects) — project approval gates
  Module 06 (Shop) — discount approval, refund approval
  Module 07 (CRM) — quote approval
  Module 08 (Finance) — payment approval, budget approval
  Module 09 (Documents) — document sign-off
  Module 15 (Procurement) — PO approval
  Module 22 (Renovation) — phase sign-off, client approval
  Module 23 (Suppliers) — supplier onboarding approval
  ... all 23 modules
```

Module 14 (Approval Center) is the UI that visualizes the shared engine — a unified inbox of all pending approvals across all modules.

---

## Module Numbering Convention

Module numbers reflect **user-facing priority** (the order in which an external user encounters each system), NOT implementation order. Implementation order is defined in IMPLEMENTATION_ROADMAP_PART1.md and IMPLEMENTATION_ROADMAP_PART2.md.

- Module 01 (Public App) is what external users see first — but built last (Phase 23)
- Module 22 (Renovation Services) is the primary revenue platform — built early (Phase 7.5)
- Module 23 (Supplier Management) is a supporting platform — built late (Phase 21.5)

---

## Cross-Reference Index

| Blueprint Document | Covers |
|-------------------|--------|
| CLAUDE.md | Foundation rules, design system, architecture principles |
| PRODUCT_VISION.md | 18 platforms, company structure, CEO 60-second rule |
| ROLE_ARCHITECTURE.md | 19 roles (+ Group CEO = 20 total), 9 scope levels, permissions |
| SECURITY_ARCHITECTURE.md | 10-gate Zero Trust chain, audit, GDPR, encryption |
| NAVIGATION_ARCHITECTURE.md | All 20 role nav patterns, iPad, Desktop, Command Palette |
| DASHBOARD_ARCHITECTURE.md | 8-zone structure, 50+ widgets, Group CEO dashboard |
| DATABASE_ARCHITECTURE.md | Foundation entities (151 tables, Parts 1-2) |
| DATABASE_ARCHITECTURE_PART2.md | Extended entities |
| DATABASE_ARCHITECTURE_PART3.md | AI, Webhook, Audit Log, Approval, Group tables |
| DESIGN_SYSTEM.md | Liquid Glass 4 Laws, typography, motion, haptics |
| MODULE_ARCHITECTURE_PART1.md | Modules 01-05 |
| MODULE_ARCHITECTURE_PART2.md | Modules 06-10 |
| MODULE_ARCHITECTURE_PART3.md | Modules 11-16 |
| MODULE_ARCHITECTURE_PART4.md | Modules 17-21 |
| MODULE_ARCHITECTURE_PART5.md | Modules 22-23 (Renovation Services + Supplier Management) |
| MODULE_ARCHITECTURE_SUPPLEMENT.md | Scope + Documents + Automations for all modules |
| IMPLEMENTATION_ROADMAP_PART1.md | Phases 0-12 |
| IMPLEMENTATION_ROADMAP_PART2.md | Phases 13-25 + Strategic Deliverables |
| PLATFORM_MODULE_MAP.md | This document |
| ARCHITECTURE_REVIEW.md | Executive review, 37 issues |
| ARCHITECTURE_RESOLUTION_PART1.md | Resolutions 1-16 |
| ARCHITECTURE_RESOLUTION_PART2.md | Resolutions 17-42 |
