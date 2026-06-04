# PRV DASHBOARD ARCHITECTURE
# Pasul 6 — Complete Dashboard Blueprint · Source of Truth

**Version**: 1.0  
**Status**: Official Blueprint  
**Scope**: All 18 Roles · All 18 Platforms · All Dashboard Types  
**Depends on**: ROLE_ARCHITECTURE.md · SECURITY_ARCHITECTURE.md · NAVIGATION_ARCHITECTURE.md · CLAUDE.md

---

## TABLE OF CONTENTS

1. [Dashboard Philosophy & Principles](#1-dashboard-philosophy--principles)
2. [Dashboard Architecture — Universal Structure](#2-dashboard-architecture--universal-structure)
3. [Widget Architecture](#3-widget-architecture)
4. [My Day Architecture](#4-my-day-architecture)
5. [Command Center Architecture](#5-command-center-architecture)
6. [Executive Cockpit Architecture](#6-executive-cockpit-architecture)
7. [Company Health Architecture](#7-company-health-architecture)
8. [KPI Architecture](#8-kpi-architecture)
9. [AI Dashboard Architecture](#9-ai-dashboard-architecture)
10. [Dashboard Template Architecture](#10-dashboard-template-architecture)
11. [Dashboard Personalization Architecture](#11-dashboard-personalization-architecture)
12. [Role × Dashboard Matrix](#12-role--dashboard-matrix)
13. [Data Architecture](#13-data-architecture)
14. [Integration Requirements](#14-integration-requirements)

---

## 1. DASHBOARD PHILOSOPHY & PRINCIPLES

### 1.1 Core Principle — Information Gravity

> **Users must not search for information. Information must come to the user.**

The PRV Dashboard operates on Information Gravity — the principle that relevant data is pulled toward the user's context automatically. The system continuously evaluates:

- Who is the user (role + identity)?
- What scope do they own (company + region + store + site)?
- What time is it (shift, day, week, month)?
- What is outstanding (unresolved alerts, pending approvals, overdue tasks)?
- What has changed since last session (delta events)?
- What is the AI predicting (risk, opportunity, anomaly)?

Every dashboard surface refreshes in real time and pushes information proactively — it does not wait to be queried.

### 1.2 Five Questions Every Dashboard Answers

Every dashboard, for every role, must answer these five questions before any other information is displayed:

| # | Question | Source System |
|---|----------|---------------|
| 1 | What do I need to do today? | My Day Engine + Task Engine |
| 2 | What is blocked? | Delay Tracker + Alert Engine |
| 3 | What requires approval? | Approval Queue + Notification Center |
| 4 | What is urgent? | Priority Engine (P0/P1) |
| 5 | What KPIs matter to me? | Role KPI Matrix + Widget Engine |

### 1.3 Dashboard Taxonomy

PRV has four distinct dashboard types:

| Type | Description | Roles |
|------|-------------|-------|
| **Personal Dashboard** | Customizable, user-owned, role-seeded | All 18 roles |
| **Command Center** | Fixed structure, role-critical overview | CEO, COO, OMS, Shop Dir, HR, Finance, Analytics |
| **Executive Cockpit** | Consolidated company health, 60-second rule | CEO, Co-CEO, Project Director, Shop Director |
| **Operational Dashboard** | Real-time operational feeds, no customization | OMS, Team Leader, Store Manager, Cashier |

### 1.4 Dashboard Rendering Model

```
User Login →
  Identity Resolution (role + scope + company) →
  Dashboard Manifest Generated (server-computed) →
  Widget Eligibility List (permission-filtered) →
  Data Subscriptions Opened (WebSocket per widget) →
  Dashboard Rendered (zones filled in priority order) →
  Real-time Sync Active
```

Each zone renders independently — no zone blocks another. Critical zones (Zone 1, Zone 2) render first.

### 1.5 Information Priority Levels

All information entering the dashboard is classified before display:

| Level | Symbol | Color | Definition | SLA |
|-------|--------|-------|------------|-----|
| P0 | 🔴 | Critical Red | Immediate action required — business risk | Push within 5s |
| P1 | 🟠 | High Orange | Action required within the hour | Push within 30s |
| P2 | 🟡 | Medium Yellow | Action required today | Refresh every 5min |
| P3 | 🔵 | Low Blue | Informational, this week | Refresh every 15min |
| P4 | ⚪ | Neutral White | Background, historical | On demand |

---

## 2. DASHBOARD ARCHITECTURE — UNIVERSAL STRUCTURE

### 2.1 Zone System — 8 Zones

Every dashboard is structured in 8 canonical zones. Zones are always present; content varies by role.

```
┌─────────────────────────────────────────────────────────────┐
│  ZONE 1 — MY DAY              │  ZONE 2 — IMPORTANT NOW     │
│  Role-aware daily brief       │  Alerts · Blocks · Urgent   │
├──────────────────────────────────────────────────────────────┤
│  ZONE 3 — KPI WIDGETS                                        │
│  Role-specific metrics, live, drag-and-drop reorderable      │
├──────────────────────────────────────────────────────────────┤
│  ZONE 4 — RECENT ACTIVITY     │  ZONE 5 — QUICK ACTIONS     │
│  Filtered event stream        │  Role-aware FAB shortcuts    │
├──────────────────────────────────────────────────────────────┤
│  ZONE 6 — AI INSIGHTS         │  ZONE 7 — INBOX SUMMARY     │
│  Recommendations · Risks      │  Notifications · Approvals  │
├──────────────────────────────────────────────────────────────┤
│  ZONE 8 — CALENDAR SUMMARY                                   │
│  Today + Next 7 Days · Deadlines · Milestones                │
└─────────────────────────────────────────────────────────────┘
```

### 2.2 Zone Specifications

#### Zone 1 — My Day

**Purpose**: Role-aware daily context. The user opens PRV and immediately knows their day.

| Property | Value |
|----------|-------|
| Render Priority | 1 (first) |
| Refresh Rate | On login + 5-minute intervals |
| Data Source | My Day Engine (Section 4) |
| Personalization | Cannot be removed — only collapsed |
| Minimum Height | 2 widget rows |

**Sub-components**:
- Daily Brief Header (role-computed greeting + summary sentence)
- Primary Obligations (top 3 tasks/duties for the day)
- Status Indicator (attendance status, shift status, site status)
- Upcoming in Next 2 Hours (time-sensitive items)
- Completion Progress (% of today's obligations completed)

#### Zone 2 — Important Now

**Purpose**: Pushes all P0 and P1 items requiring immediate attention.

| Property | Value |
|----------|-------|
| Render Priority | 2 (second) |
| Refresh Rate | Real-time (WebSocket) |
| Data Source | Priority Engine + Alert Engine |
| Personalization | Cannot be removed or hidden |
| Visibility Rule | Hides only when zero items exist |

**Sub-components**:
- Critical Alert Feed (P0 items, auto-dismissed when resolved)
- Delay Tracker (projects/tasks past deadline)
- Missing Resource Warnings (materials, staff, equipment)
- Pending Approval Queue (items awaiting this user's decision)
- Risk Flags (AI-detected risks requiring human attention)

**Item Structure**:
```
[Priority Icon] [Title] [Description] [Source Module]
[Time Since Created] [Action Button] [Dismiss (P2+)]
```

**Behavior**:
- P0 items cannot be dismissed without resolution or explicit escalation
- P1 items auto-escalate to P0 after 1 hour without action
- Each item links to the source record via deep link
- Long-press on item opens Context Menu: View · Assign · Escalate · Comment · Snooze

#### Zone 3 — KPI Widgets

**Purpose**: Role-specific key metrics in real time.

| Property | Value |
|----------|-------|
| Render Priority | 3 |
| Refresh Rate | 30-second intervals (live) |
| Data Source | KPI Engine (Section 8) |
| Personalization | Draggable, resizable, hideable, reorderable |
| Layout | Horizontal scroll (mobile) · Grid (tablet/desktop) |

**Widget sizes**:
- Micro (1×1): Single metric + trend arrow
- Small (1×2): Metric + sparkline
- Medium (2×2): Metric + chart + breakdown
- Large (2×4): Full KPI card with history, comparisons, targets

**Default widget set per role**: Defined in Section 8 (KPI Architecture).

#### Zone 4 — Recent Activity

**Purpose**: Filtered event stream relevant to the user's scope.

| Property | Value |
|----------|-------|
| Render Priority | 4 |
| Refresh Rate | Real-time (WebSocket) |
| Data Source | Audit Log (permission-filtered) |
| Personalization | Filterable by category; can minimize |
| Scope Enforcement | Only events within user's permission scope |

**Event categories**:
- Project Events (task created, status changed, milestone reached)
- Approval Events (submitted, approved, rejected)
- Document Events (uploaded, signed, viewed, expired)
- Order Events (created, fulfilled, shipped, returned)
- Personnel Events (checked in, checked out, leave approved)
- Financial Events (invoice created, payment received, expense approved)

**Item Structure**:
```
[Actor Avatar] [Action Description]
[Module Tag] [Timestamp] [Peek Preview →]
```

**Filtering**:
- By module (Projects · Finance · Shop · HR · Documents)
- By actor (My Team · My Department · My Store)
- By time range (Today · This Week · This Month)
- Search within activity

#### Zone 5 — Quick Actions

**Purpose**: Role-aware primary actions accessible without navigation.

| Property | Value |
|----------|-------|
| Render Priority | 5 |
| Refresh Rate | Static (role manifest) |
| Data Source | Navigation Manifest (role-computed) |
| Personalization | Can reorder, hide individual actions |
| Layout | Horizontal pill row (mobile) · Grid (tablet/desktop) |

**Structure**: Each Quick Action is a Glass pill button:
- Icon (SF Symbol or custom)
- Label (1–2 words)
- Tap → opens Bottom Sheet (never navigates away from dashboard)
- Quick Actions are defined per role in Section 5 (Command Center Architecture)

#### Zone 6 — AI Insights

**Purpose**: Proactive AI-generated intelligence: recommendations, risks, forecasts.

| Property | Value |
|----------|-------|
| Render Priority | 6 |
| Refresh Rate | Every 15 minutes + event-triggered |
| Data Source | AI Platform (role-scoped) |
| Personalization | Can collapse; cannot remove |
| Interaction | Each insight is tappable → Detail Bottom Sheet |

**Content types**: Defined in Section 9 (AI Dashboard Architecture).

#### Zone 7 — Inbox Summary

**Purpose**: Preview of the Universal Inbox, inline approval capability.

| Property | Value |
|----------|-------|
| Render Priority | 7 |
| Refresh Rate | Real-time (WebSocket) |
| Data Source | Notification Center + Inbox |
| Personalization | Can hide individual notification categories |
| Interaction | Tap item → Inline approval or Inbox Bottom Sheet |

**Displayed categories**:
- Unread Notifications (count badge)
- Pending Approvals (actionable inline)
- Unread Messages (with sender preview)
- Assigned Tasks (not yet acknowledged)
- Document Signatures Required

**Inline approval**: Approve/Reject visible directly in Zone 7 without opening Inbox.

#### Zone 8 — Calendar Summary

**Purpose**: Time-anchored awareness: today + next 7 days.

| Property | Value |
|----------|-------|
| Render Priority | 8 |
| Refresh Rate | Every 5 minutes |
| Data Source | Calendar Platform + Project Platform |
| Personalization | Can collapse |
| Interaction | Tap event → Event Bottom Sheet |

**Displayed event types**:
- Meetings (internal, external, video)
- Project Deadlines
- Deliveries (materials, orders)
- Employee Leave (scope-filtered)
- Public Holidays
- Payroll Processing Dates
- Milestone Checkpoints

**View**: Horizontal date strip (today highlighted) + event list below. Scrollable.

---

### 2.3 Zone Visibility by Device

| Zone | iPhone | iPad | Web/macOS |
|------|--------|------|-----------|
| Zone 1 — My Day | Full width, top | Top-left panel | Left column, top |
| Zone 2 — Important Now | Full width, below Z1 | Top-right panel | Right column, top |
| Zone 3 — KPI Widgets | Horizontal scroll | Grid (2–4 col) | Grid (3–6 col) |
| Zone 4 — Recent Activity | Full width, scrollable | Bottom-left panel | Left column, lower |
| Zone 5 — Quick Actions | Pill row, pinned bottom | Sidebar bottom | Bottom of left col |
| Zone 6 — AI Insights | Collapsible section | Bottom-right panel | Right column, middle |
| Zone 7 — Inbox Summary | Collapsible section | Below Z6 | Right column, lower |
| Zone 8 — Calendar | Collapsible section | Full-width bottom | Bottom of right col |

### 2.4 Dashboard Header

Every dashboard has a floating glass header (not full-width, not solid) containing:

```
[Date + Time]   [User Avatar]   [Notification Bell]   [⌘K Command Palette]
[Role Badge]    [Company Selector (if multi-company)]  [Search]
```

**Behavior**:
- Scrolls away on scroll-down; re-appears on scroll-up (dynamic navigation)
- Notification bell shows live unread count
- Company Selector only visible to users with multi-company scope (CEO, Superadmin)
- Role Badge shows current role context; tap → Role Switcher (if user has multiple roles)

---

## 3. WIDGET ARCHITECTURE

### 3.1 Widget Definition

A Widget is an independent, self-contained data display unit that:
- Has a defined data contract (inputs, outputs, refresh policy)
- Renders within the dashboard grid independently
- Has its own WebSocket subscription (no shared data streams)
- Fails gracefully (skeleton loader → error state, no dashboard crash)
- Respects permission scope (never shows data outside user's authorization)

### 3.2 Widget Metadata Schema

Every widget carries this metadata:

```
Widget {
  id: UUID
  name: string
  category: WidgetCategory
  size_options: [WidgetSize]
  default_size: WidgetSize
  roles_eligible: [RoleID]
  permission_required: Permission[]
  scope_required: ScopeLevel
  data_source: DataSourceID
  refresh_interval: seconds
  supports_drill_down: boolean
  supports_comparison: boolean
  supports_export: boolean
  supports_alert: boolean
  is_pinnable: boolean
  is_hideable: boolean
  is_resizable: boolean
}
```

### 3.3 Widget Categories

#### PERSONAL
Widgets showing data about the logged-in user only.

| Widget | Description | Sizes | Roles |
|--------|-------------|-------|-------|
| My Schedule | Today's schedule from attendance system | S, M | All |
| My Tasks | Open tasks assigned to me | S, M, L | All |
| My Attendance | This week's check-in/out log | S, M | All except CEO |
| My Leave Balance | Remaining leave days by type | S | All except CEO |
| My Documents | Recent documents assigned to me | M | All |
| My Performance | Personal KPI progress vs target | M, L | All |
| My Expenses | Submitted expenses this month | S, M | All |

#### TEAM
Widgets showing data about the user's team or direct reports.

| Widget | Description | Sizes | Roles |
|--------|-------------|-------|-------|
| Team Attendance | Live team attendance status | M, L | TL, OMS, Operations Manager, HR |
| Team Productivity | Tasks completed vs planned | M, L | TL, OMS, Operations Manager |
| Team Capacity | Available hours vs assigned | M, L | TL, OMS, Operations Manager |
| Team Issues | Open issues reported by team | S, M | TL, OMS |
| Team Schedule | This week's team schedule | L | TL, OMS, HR |
| Team Leave | Who is on leave today | S, M | TL, OMS, HR |

#### PROJECT
Widgets showing data from the Project Management Platform.

| Widget | Description | Sizes | Roles |
|--------|-------------|-------|-------|
| Active Projects | Count + status distribution | S, M | Project roles, CEO, Operations |
| Project Progress | % completion by project | M, L | Project TL+, OMS, CEO |
| Project Delays | Overdue milestones count + list | M, L | Project OMS+, CEO |
| Resource Usage | Material + workforce utilization | M, L | Project OMS+, Operations |
| Milestone Feed | Upcoming + overdue milestones | M, L | All project roles |
| Budget vs Actuals | Project spend vs budget | M, L | Finance, Project Director, CEO |
| Site Status | Live site activity status | M | OMS, Operations Manager, CEO |

#### SHOP
Widgets from the Shop Platform.

| Widget | Description | Sizes | Roles |
|--------|-------------|-------|-------|
| Today's Orders | New orders count + value | S, M | Cashier, Store Manager, Shop Dir |
| Revenue Today | Today's sales total | S, M | Store Manager, Shop Dir, CEO |
| Active Transactions | Live transaction count | S | Cashier, Store Manager |
| Inventory Alerts | Low stock items | S, M | Store Manager, Shop Dir |
| Returns Today | Return count + value | S | Store Manager, Shop Dir |
| Conversion Rate | Sessions → purchases | M | Shop Dir, Analytics, CEO |
| Top Products | Best sellers today | M, L | Store Manager, Shop Dir, CEO |
| Customer Queue | Estimated queue length | S | Cashier, Store Manager |

#### FINANCE
Widgets from the Finance Platform.

| Widget | Description | Sizes | Roles |
|--------|-------------|-------|-------|
| Revenue | Period revenue vs target | S, M, L | Finance Manager, CEO, Co-CEO |
| Profit | Gross + net profit | M, L | Finance Manager, CEO |
| Cashflow | Inflows vs outflows | M, L | Finance Manager, CEO |
| Outstanding Invoices | Unpaid invoices count + value | M | Finance Manager, CEO |
| Expense Overview | Expenses by category | M, L | Finance Manager, CEO |
| Payroll Status | Processing status + upcoming | S, M | HR Manager, Finance Manager |
| Tax Obligations | Upcoming tax deadlines | S, M | Finance Manager, CEO |
| P&L Summary | Period profit & loss | L | CEO, Finance Manager |

#### ANALYTICS
Widgets from the Analytics Platform.

| Widget | Description | Sizes | Roles |
|--------|-------------|-------|-------|
| Company Health Score | Composite health index | S, M | CEO, Co-CEO, Analytics |
| Revenue Trend | 30-day trend line | M, L | CEO, Finance, Analytics |
| Workforce Utilization | Company-wide staff utilization | M | CEO, Operations, HR |
| NPS Score | Customer satisfaction | S, M | CEO, Shop Dir, Analytics |
| Forecast Accuracy | AI prediction vs actuals | M | Analytics, CEO |
| Platform Usage | Which modules are most used | M, L | Analytics, Superadmin |
| Anomaly Feed | Detected statistical anomalies | M | Analytics, CEO |

#### EXECUTIVE
Widgets exclusive to executive roles (CEO, Co-CEO, Project Director, Shop Director).

| Widget | Description | Sizes | Roles |
|--------|-------------|-------|-------|
| CEO Briefing | AI-generated daily executive summary | L | CEO, Co-CEO |
| Strategic Objectives | Progress on OKRs/strategic initiatives | L | CEO, Co-CEO |
| Risk Dashboard | Top 5 active risks with mitigation | M, L | CEO, Co-CEO, Project Dir |
| Competitor Intelligence | Market signals (if integrated) | M | CEO |
| Board Metrics | Metrics relevant for board reporting | L | CEO |
| Company Comparison | Side-by-side if multi-company | L | CEO, Superadmin |
| Growth Indicators | Leading indicators of growth | M, L | CEO, Analytics |

#### AI
Widgets from the AI Platform.

| Widget | Description | Sizes | Roles |
|--------|-------------|-------|-------|
| AI Recommendations | Top 3 actionable AI suggestions | M, L | All |
| Risk Forecast | Predicted risks next 7 days | M | OMS+, CEO, Finance |
| Anomaly Detector | Live anomaly feed | M | Analytics, CEO |
| Demand Forecast | Predicted demand for shop/materials | M, L | Shop Dir, Procurement, CEO |
| Workforce Forecast | Staffing need forecast | M | Operations, HR, CEO |
| Revenue Forecast | Projected revenue next 30/90 days | M, L | CEO, Finance, Analytics |
| AI Chat | Embedded AI assistant | L | All |

### 3.4 Widget Interaction Model

**Tap**: Opens drill-down Bottom Sheet (Detail view, filters, export)

**Long-Press**: Opens Context Menu:
- Pin Widget (moves to top of zone)
- Resize Widget (cycle through size options)
- Edit Widget (configure data parameters)
- Hide Widget (move to hidden library)
- Export Data (CSV/PDF of current widget data)
- Set Alert (configure threshold notifications)
- Add to Report (add widget snapshot to a report)

**Drag**: Reorder within zone (haptic feedback, snap-to-grid)

**Pull to Refresh**: Force refresh this widget's data

**Swipe Left** (mobile): Quick action — Pin / Hide / Alert

### 3.5 Widget States

| State | Display | Description |
|-------|---------|-------------|
| Loading | Skeleton shimmer | Initial load or refresh |
| Active | Live data | Normal operation |
| Stale | Data + warning icon | Data older than 2x refresh interval |
| Error | Error icon + retry | Data fetch failed |
| No Permission | Lock icon | User lost permission (session change) |
| No Data | Empty state illustration | Valid permission, zero records |
| Alert | Red border | Data crossed alert threshold |

### 3.6 Widget Permission Enforcement

Every widget render call goes through:
```
Widget.render() →
  permission_check(user.role, widget.permission_required) →
  scope_check(user.scope, widget.scope_required) →
  data_fetch(user.company_id, user.scope) →
  render(data)
```

No client-side permission bypass is possible — widget data is fetched server-side with the user's validated session token.

### 3.7 Widget Library

The Widget Library is accessible via:
- Dashboard Settings → Widget Library
- Long-press on empty zone area
- Command Palette: "Add widget"

The library shows:
- All widgets the user is eligible for (role + permission check)
- Currently visible widgets (marked with checkmark)
- Hidden widgets (can restore)
- Search within library
- Category filter

---

## 4. MY DAY ARCHITECTURE

### 4.1 My Day Engine

The My Day Engine is a server-side computation service that runs:
- On user login
- Every 5 minutes during active session
- On any event that changes the user's obligations (new task assigned, schedule change, site change)

**Engine inputs**:
- User identity + role + scope
- Current date/time + timezone
- Attendance system state (checked in / out)
- Task assignments (open, due today)
- Schedule from Workforce Management
- Site assignments from Project/Renovation platform
- Calendar events (meetings, deadlines)
- Approval queue (items awaiting this user)
- AI predictions for today

**Engine output**:
```
MyDayManifest {
  greeting: string                    // "Good morning, Ion. Here's your Tuesday."
  summary: string                     // "3 tasks, 1 site visit, 2 approvals awaiting"
  obligations: Obligation[]           // Ordered by priority + time
  status: AttendanceStatus            // CHECKED_IN | CHECKED_OUT | LATE | ABSENT
  upcoming_2h: Event[]               // Next 2 hours
  completion_rate: float             // % obligations completed today
  weather: WeatherContext            // If outdoor site work relevant
  shift: ShiftContext                // If shift worker
}
```

### 4.2 My Day — Role Specifications

#### WORKER (Renovation / Project)
```
My Day shows:
├── Shift Status (Checked In / Not Yet / Late)
├── Assigned Site Address (with map link)
├── Today's Tasks (assigned, with priority)
│   ├── [P0] Critical tasks (max 2, highlighted red)
│   ├── [P1] High priority tasks
│   └── [P2] Normal tasks
├── Team Members on Site (who else is there)
├── Materials Expected Today (if any)
├── Safety Briefing Flag (if required before start)
└── Completion Progress (X of Y tasks done)
```

#### TEAM LEADER
```
My Day shows:
├── Team Attendance Summary (X/Y checked in)
│   └── Who is absent / late (with contact shortcut)
├── Team Tasks Overview (total open vs completed today)
├── Active Issues (reported by team, unresolved)
├── Pending Approvals (leave requests, expense claims)
├── Site Status (sites where my team is working)
├── Upcoming Team Briefing (if scheduled)
└── Team Completion Rate (today %)
```

#### OMS (Operations Manager Site)
```
My Day shows:
├── All Sites Status (active/inactive/delayed)
│   └── Per site: team count, task progress, issues
├── Material Deliveries Today (confirmed + pending)
├── Team Attendance Across Sites (combined)
├── Outstanding Issues (site-wide, by priority)
├── Approvals Pending (material requests, timesheets)
├── Scheduled Inspections / Visits
├── Delays with Impact Assessment (AI-computed)
└── Resource Gaps (understaffed sites)
```

#### PROJECT TEAM LEADER
```
My Day shows:
├── Project Phase Status (current phase % complete)
├── Team Attendance on Project
├── Today's Milestones (due today)
├── Blockers (dependencies not met)
├── Material Readiness (ordered / delivered / missing)
├── Pending Approvals (team timesheets, change requests)
└── Upcoming Client Communication (if scheduled)
```

#### PROJECT OMS
```
My Day shows:
├── All Assigned Projects — Status Overview
├── Resource Allocation Today (teams, equipment)
├── Critical Path Items (delays with cascade impact)
├── Budget Burn Rate vs Plan
├── Pending Approvals (Purchase Orders, Change Orders)
├── Deliveries Today (from Procurement)
└── Risk Flags (AI-computed, today's risks)
```

#### PROJECT DIRECTOR
```
My Day shows:
├── Portfolio Overview (all projects: health, % complete)
├── Critical Alerts (delays risking delivery)
├── Client Meetings Today
├── Pending Director Approvals (high-value items)
├── Budget Summary (all projects combined)
├── Strategic Risk Flags
└── Executive Briefing (AI-generated, morning)
```

#### OPERATIONS MANAGER
```
My Day shows:
├── Regional Overview (all sites, all stores in region)
├── Workforce Status (total active / absent today)
├── KPI Summary (region: productivity, utilization)
├── Pending Approvals (high-priority escalations)
├── Ongoing Delays with ETA
├── Supply Chain Flags (material shortages)
└── Meeting Schedule
```

#### STORE MANAGER
```
My Day shows:
├── Store Opening Status (ready / issues)
├── Staff Attendance (who is in / missing)
├── Today's Sales Target vs Actual (live)
├── Inventory Alerts (low stock, out of stock)
├── Orders to Process (pending fulfillment)
├── Pending Approvals (returns, discounts, leave)
└── Scheduled Deliveries
```

#### CASHIER
```
My Day shows:
├── Shift Start (Check In prompt if not done)
├── My Register Status (open / closed)
├── Today's Transaction Count
├── Pending Returns to Process
├── Today's Promotions (active discounts)
└── Shift End Time
```

#### SHOP DIRECTOR
```
My Day shows:
├── All Stores Summary (revenue, staff, alerts)
├── Today's Sales vs Target (all stores combined)
├── Critical Stock Issues (chain-wide)
├── Pending Director Approvals
├── Supplier Deliveries Today
├── Market Intelligence (if integrated)
└── Executive Briefing (AI-generated)
```

#### PROCUREMENT MANAGER
```
My Day shows:
├── Purchase Orders Requiring Action
├── Supplier Deliveries Expected Today
├── Quotes Awaiting Response (deadlines)
├── Low Stock Alerts (cross-company)
├── Pending Approvals (PO approvals)
└── Budget Remaining (procurement budget)
```

#### HR MANAGER
```
My Day shows:
├── Workforce Attendance (company-wide %)
├── Leave Requests Pending Approval
├── New Hires Starting Today
├── Payroll Deadlines (upcoming)
├── Contract Expirations (next 30 days)
├── Compliance Tasks Due
└── Open Positions (recruiting pipeline)
```

#### FINANCE MANAGER
```
My Day shows:
├── Cashflow Status (today's position)
├── Invoices Due Today (payable + receivable)
├── Expense Reports Pending Approval
├── Payroll Processing Status
├── Tax Obligations Due
├── Budget Alerts (departments over budget)
└── Revenue vs Target (today)
```

#### ANALYST
```
My Day shows:
├── Reports Due Today (scheduled deliveries)
├── Data Anomalies Detected (auto-alerts)
├── Data Pipelines Status (healthy / failed)
├── Scheduled Report Runs
├── New Data Available (from connected sources)
└── Analysis Requests in Queue
```

#### CO-CEO
```
My Day shows:
├── Company Health Overview (both companies)
├── Executive Briefing (AI-generated, morning)
├── Critical Alerts (P0 across all platforms)
├── Board / Investor Meetings Today
├── Strategic Initiative Status
├── Pending Co-CEO Approvals
└── Key Decisions Required Today
```

#### CEO
```
My Day shows:
├── Executive Morning Briefing (AI-generated, 3-paragraph)
│   ├── Yesterday's Performance Summary
│   ├── Today's Priorities
│   └── Watch Items (risks, opportunities)
├── Critical Alerts (P0, any scope)
├── CEO Approval Queue
├── Strategic Objectives Progress
├── Key Meetings Today
├── Financial Pulse (Revenue + Cashflow snapshot)
└── Workforce Pulse (attendance + critical incidents)
```

#### SUPERADMIN
```
My Day shows:
├── System Health (all companies, all services)
├── Security Alerts (intrusion attempts, anomalies)
├── Platform Usage Metrics
├── Pending Platform-Level Approvals
├── New Company Onboarding Status
├── Infrastructure Alerts
└── Scheduled Maintenance Windows
```

### 4.3 My Day Computation Rules

**Task Priority Algorithm**:
```
Priority Score = (Base Priority × 10) + (Hours Until Due × -1) + (Escalation Level × 5)

If Hours Until Due < 0 (overdue): Score × 3 (critical multiplier)
If assigned by CEO or Project Director: Score × 2 (executive multiplier)
```

**Attendance Integration**:
- If worker not checked in by shift start + 15 min → Zone 2 alert to Team Leader
- If attendance system offline → My Day shows manual check-in option
- Check-in status visible across the reporting chain

**Weather Integration** (for outdoor site workers):
- If work site involves outdoor activity: show weather forecast for site location
- P1 alert if severe weather expected at site during shift

---

## 5. COMMAND CENTER ARCHITECTURE

### 5.1 Command Center Definition

A Command Center is a fixed-structure dashboard that gives role-specific leaders a comprehensive operational view. Unlike the Personal Dashboard, the Command Center:

- Cannot be rearranged (fixed zone layout)
- Shows aggregate data across the leader's full scope
- Is always live (WebSocket real-time)
- Is accessible from the ⌂ Command tab as a pinned view
- Cannot be removed or simplified

### 5.2 CEO Command Center

```
┌────────────────────────────────────────────────────────────────────┐
│  EXECUTIVE HEADER                                                   │
│  [Date/Time]  [Company Selector]  [Alerts: 3🔴 2🟠]  [AI Brief]   │
├────────────────────┬───────────────────────────────────────────────┤
│  FINANCIAL PULSE   │  OPERATIONAL PULSE                            │
│  Revenue: Live     │  Active Projects: N                           │
│  Profit: Live      │  Sites Active: N                              │
│  Cashflow: Live    │  Workforce Present: N%                        │
│  vs Target: Δ      │  Critical Delays: N                           │
├────────────────────┴───────────────────────────────────────────────┤
│  SHOP PERFORMANCE          │  STRATEGIC OBJECTIVES                 │
│  Orders Today: N           │  OKR 1: ████████░░ 80%               │
│  Revenue Today: $X         │  OKR 2: █████░░░░░ 50%               │
│  Conversion: X%            │  OKR 3: ██░░░░░░░░ 20%               │
│  Top Store: Name           │  [View All Objectives →]              │
├────────────────────────────┴───────────────────────────────────────┤
│  CRITICAL ALERTS (P0/P1, all scope)                                │
│  🔴 [Alert 1]  🔴 [Alert 2]  🟠 [Alert 3]  [View All →]          │
├────────────────────────────────────────────────────────────────────┤
│  WORKFORCE STATUS          │  RISK CENTER                          │
│  Total: N | Present: N%    │  Risk 1: [desc] [severity]           │
│  Absent: N | Late: N       │  Risk 2: [desc] [severity]           │
│  On Leave: N               │  Risk 3: [desc] [severity]           │
│  [View Team →]             │  AI Confidence: X%                   │
├────────────────────────────┴───────────────────────────────────────┤
│  AI EXECUTIVE INTELLIGENCE                                         │
│  [Recommendation 1]  [Risk Forecast]  [Revenue Projection]        │
│  [Strategic Insight]  [Anomaly Detected]  [Opportunity]           │
├────────────────────────────────────────────────────────────────────┤
│  FORECAST CENTER                                                   │
│  Revenue Forecast (30d/90d) · Project Completion Forecast         │
│  Workforce Demand Forecast · Cash Position Forecast               │
└────────────────────────────────────────────────────────────────────┘
```

**CEO Command Center Sections**:

| Section | Data Source | Refresh |
|---------|-------------|---------|
| Financial Pulse | Finance Platform | 30s |
| Operational Pulse | Project + Operations Platform | 30s |
| Shop Performance | Shop Platform | 30s |
| Strategic Objectives | Strategy Module | 5min |
| Critical Alerts | Alert Engine | Real-time |
| Workforce Status | HR + Attendance Platform | 1min |
| Risk Center | AI Platform | 15min |
| AI Intelligence | AI Platform | 15min |
| Forecast Center | AI Platform | 1hr |

**CEO Approval Authority from Command Center**:
- Approve/Reject any item directly from Command Center
- No navigation required — Bottom Sheet for approval
- Bulk approve (multi-select) for P1/P2 queued items

### 5.3 COO / Operations Command Center

```
Sections:
├── Project Portfolio Overview
│   └── All projects: name, phase, % complete, health, PM
├── Teams & Resources
│   └── All teams: headcount, utilization, overtime flags
├── Materials & Supply Chain
│   └── PO status, delivery ETA, shortage alerts
├── Delay Center
│   └── All delayed items: impact, root cause, mitigation
├── Operational KPIs
│   └── Site productivity, resource efficiency, cost per unit
├── Workforce Utilization Map
│   └── Visual: who is where, doing what, at what efficiency
└── Escalation Queue
    └── Items escalated from OMS level
```

### 5.4 OMS Command Center

```
Sections:
├── My Sites — Live Status
│   └── Per site: team present, tasks open, progress %, issues
├── Team Attendance
│   └── Who checked in, who is late, absent, on leave
├── Materials Dashboard
│   └── Expected today, received, missing, wastage
├── Task Management
│   └── Open tasks by priority, overdue, blocked
├── Issue Tracker
│   └── Open issues by priority, age, assigned
├── Productivity Meter
│   └── Hours worked vs planned, output rate
└── Approval Queue
    └── Timesheets, material requests, expense claims
```

### 5.5 Shop Command Center

```
Sections:
├── Sales Overview
│   └── Today's revenue, orders, AOV, vs target
├── Live Transactions
│   └── Real-time feed of transactions across stores
├── Inventory Status
│   └── Low stock, out of stock, overstock by category
├── Order Management
│   └── Pending, processing, shipped, returned counts
├── Supplier Dashboard
│   └── Active POs, delivery schedule, supplier performance
├── Returns & Disputes
│   └── Today's returns, reason codes, refund amounts
├── Store Comparison (Shop Director)
│   └── All stores: revenue, conversion, staff, issues
└── Customer Insights
    └── New vs returning, NPS, complaint feed
```

### 5.6 HR Command Center

```
Sections:
├── Workforce Overview
│   └── Total employees by role, company, status
├── Today's Attendance
│   └── Present, absent, late, on leave — live
├── Leave Management
│   └── Pending requests, approved, team calendar
├── Payroll Status
│   └── Current period: processed, pending, issues
├── Compliance Dashboard
│   └── Contract expirations, certification renewals, legal
├── Recruitment Pipeline
│   └── Open positions, applications, interviews scheduled
├── Document Expiration
│   └── ID docs, certifications expiring in 30/60/90 days
└── Incident Log
    └── HR incidents, disciplinary actions, escalations
```

### 5.7 Finance Command Center

```
Sections:
├── Financial Summary
│   └── Revenue, COGS, gross profit, net profit — live
├── Cashflow Position
│   └── Opening balance, inflows, outflows, closing projection
├── Accounts Receivable
│   └── Outstanding invoices by age bucket (30/60/90/90+)
├── Accounts Payable
│   └── Due today, due this week, overdue
├── Expense Management
│   └── By department, by category, vs budget
├── Payroll Overview
│   └── This month's payroll, next payroll date, status
├── Tax Obligations
│   └── Due dates, estimated amounts, filing status
└── Budget vs Actuals
    └── Department-level burn rate, variance alerts
```

### 5.8 Analytics Command Center

```
Sections:
├── Platform Health
│   └── Data pipeline status, last sync timestamps
├── KPI Dashboard Builder
│   └── All available KPIs with current values
├── Report Schedule
│   └── Scheduled reports: status, next run, recipients
├── Anomaly Center
│   └── Detected anomalies: severity, affected metric, action
├── Forecast Accuracy
│   └── AI predictions vs actuals for past 30 days
├── Usage Analytics
│   └── Which modules, which features, active users
├── Business Intelligence
│   └── Cross-platform trends, correlation analysis
└── Export Center
    └── Pending exports, generated reports, download queue
```

### 5.9 Procurement Command Center

```
Sections:
├── Purchase Orders
│   └── Draft, pending approval, approved, in transit, received
├── Supplier Performance
│   └── On-time delivery, quality score, response time
├── Delivery Schedule
│   └── Expected deliveries: today, this week
├── Inventory Levels
│   └── Critical items below reorder point
├── Budget Utilization
│   └── Procurement budget: used, remaining, committed
├── Pending Approvals
│   └── POs awaiting approval by level
└── Supplier Contracts
    └── Active contracts, expiration dates, renewal flags
```

### 5.10 Command Center Access Rules

| Command Center | Primary Role | Also Accessible To |
|---------------|-------------|-------------------|
| CEO Command Center | CEO | Co-CEO, Superadmin |
| Operations Command Center | Operations Manager | CEO, Co-CEO |
| OMS Command Center | OMS | Operations Manager, CEO |
| Shop Command Center | Shop Director | Store Manager (own store), CEO |
| HR Command Center | HR Manager | CEO, Operations Manager |
| Finance Command Center | Finance Manager | CEO, Co-CEO |
| Analytics Command Center | Analyst | CEO, Finance Manager |
| Procurement Command Center | Procurement Manager | Operations Manager, CEO |

Access to another role's Command Center requires explicit permission: `command_center.{role}.view`.

---

## 6. EXECUTIVE COCKPIT ARCHITECTURE

### 6.1 Definition

The Executive Cockpit is a dedicated, immersive experience for the top 4 executive roles:
- CEO
- Co-CEO
- Project Director
- Shop Director

**Design Principle**: A CEO opens PRV and within 60 seconds knows the complete health of the company. No drilling down, no navigating, no searching. Everything critical is visible in one view.

### 6.2 CEO 60-Second Rule — Implementation

The 60-second rule is enforced through the Cockpit Priority System:

```
Second 0–5:   Critical Alerts (P0) visible immediately
Second 5–15:  Financial Pulse loaded (Revenue, Profit, Cashflow)
Second 15–25: Operational Pulse loaded (Projects, Sites, Workforce)
Second 25–35: Shop Pulse loaded (Orders, Revenue, Stock)
Second 35–45: AI Briefing visible (risks, recommendations)
Second 45–60: Full Cockpit rendered (forecasts, trends, objectives)
```

Data for the cockpit is pre-computed server-side on a 5-minute cycle and cached. The display renders from cache instantly — no wait for live computation at open time.

### 6.3 CEO Executive Cockpit Structure

```
COCKPIT HEADER
───────────────
[PRV Logo]  [Tuesday, 3 June 2026 · 09:14]  [Alerts: 2🔴]  [Settings]
[AI Briefing: "Revenue up 12% week-over-week. 2 project delays..."]

COMPANY HEALTH ROW
──────────────────
[Financial 🟢 92%]  [Operational 🟡 74%]  [Workforce 🟢 88%]  
[Shop 🟢 95%]  [Project 🟠 68%]  [System 🟢 100%]

CRITICAL ALERTS
───────────────
🔴 Project Omega — 3-day delay — Materials not delivered — [Resolve]
🔴 Cash position below 30-day threshold — [View Finance]

FINANCIAL PULSE (Live, 30s refresh)
─────────────────────────────────
Revenue Today    Profit (MTD)    Cashflow         Shop Revenue
$142,840        $38,290          🟢 Positive      $28,150
▲ 12% vs yest  ▲ 8% vs plan    $180k available   ▲ 5% vs target

OPERATIONAL PULSE
─────────────────
Active Projects: 12      Sites Active: 8      Workforce: 89% present
Milestones Due Today: 3  Issues Open: 14      Delayed: 2 sites

SHOP PULSE
──────────
Orders Today: 284    Revenue: $28,150    Conversion: 3.2%
Low Stock Alerts: 3  Returns: 12         Top Store: [Name]

STRATEGIC INITIATIVES
─────────────────────
[Initiative 1: ████████░░ 78%]  [Initiative 2: █████░░░░░ 54%]
[Initiative 3: ███░░░░░░░ 32%]  [Add Initiative +]

WORKFORCE STATUS
────────────────
Total: 247    Present: 220 (89%)    On Leave: 12    Absent: 15
Overtime Flags: 4    New Hires Today: 1    Expiring Contracts: 2

AI INTELLIGENCE
───────────────
[🤖 Recommendation: Reallocate 3 workers from Site B to Site A]
[⚠️ Risk: Cash position may drop below limit in 18 days]
[📈 Opportunity: Shop traffic 40% higher than last Tuesday]
[🔮 Forecast: Q3 revenue on track to exceed target by 8%]

FORECASTS
─────────
Revenue (30d): $3.8M est  |  Revenue (90d): $11.2M est
Project Completion: 8/12 on schedule  |  Workforce needed +15 (Q3)
```

### 6.4 Project Director Cockpit

```
COCKPIT SECTIONS:
├── Portfolio Health (all projects: on track, delayed, at risk)
├── Critical Path Overview (items on critical path across all projects)
├── Resource Allocation (workforce + equipment utilization)
├── Budget Overview (all projects: budget, spent, remaining, forecast)
├── Client Status (projects with client meetings / deliverables due)
├── Risk Registry (top 5 risks across portfolio)
├── Milestone Calendar (next 30 days across all projects)
├── AI Portfolio Intelligence (predictions, optimizations)
└── Escalation Center (items requiring Director decision)
```

### 6.5 Shop Director Cockpit

```
COCKPIT SECTIONS:
├── Network Performance (all stores: revenue, conversion, traffic)
├── Daily Revenue Dashboard (live, all stores combined + per store)
├── Inventory Health (network-wide stock levels, alerts)
├── Order Pipeline (total orders in each status)
├── Supplier Status (active POs, deliveries, performance scores)
├── Staff Overview (all stores: headcount, attendance, issues)
├── Customer Intelligence (NPS, complaints, top customers)
├── AI Retail Intelligence (demand forecasts, pricing recommendations)
└── Store Comparison Matrix (performance league table)
```

### 6.6 Co-CEO Cockpit

Identical to CEO Cockpit but scoped to the Co-CEO's assigned companies. If the Co-CEO has cross-company scope, shows combined view with per-company breakdown available via toggle.

### 6.7 Cockpit Refresh Architecture

```
Cockpit Cache Layer:
  Background Job (every 5 min):
    - Compute all cockpit metrics for all executive users
    - Store in Redis with TTL = 6 minutes
    - Tag each metric with compute timestamp

  On Cockpit Open:
    - Serve from cache immediately (0ms render start)
    - Subscribe to real-time updates (WebSocket)
    - Real-time events update affected metrics only (delta)
    - Never recompute full cockpit on page load
```

---

## 7. COMPANY HEALTH ARCHITECTURE

### 7.1 Company Health Index

The Company Health Index (CHI) is a composite score (0–100) computed across 6 dimensions. Each dimension has its own score, and the CHI is a weighted average.

### 7.2 Health Dimensions

#### Financial Health (Weight: 30%)

| Metric | Weight | Healthy | Warning | Critical |
|--------|--------|---------|---------|----------|
| Revenue vs Target | 25% | >95% | 80–95% | <80% |
| Profit Margin | 25% | >15% | 8–15% | <8% |
| Cashflow Position | 25% | >60 days | 30–60 days | <30 days |
| Outstanding Receivables | 15% | <30 days avg | 30–60 days | >60 days |
| Budget Variance | 10% | <5% over | 5–15% over | >15% over |

**Score Formula**:
```
Financial Health = Σ (metric_score × metric_weight)
metric_score: 0-100 linear interpolation between warning/critical/healthy thresholds
```

#### Operational Health (Weight: 25%)

| Metric | Weight | Healthy | Warning | Critical |
|--------|--------|---------|---------|----------|
| Project On-Time Rate | 30% | >90% | 75–90% | <75% |
| Active Delays | 20% | 0 | 1–3 | >3 |
| Resource Utilization | 20% | 80–95% | 65–80% | <65% or >95% |
| Issue Resolution Time | 15% | <24h | 24–72h | >72h |
| Material Availability | 15% | >95% | 85–95% | <85% |

#### Workforce Health (Weight: 20%)

| Metric | Weight | Healthy | Warning | Critical |
|--------|--------|---------|---------|----------|
| Attendance Rate | 35% | >92% | 85–92% | <85% |
| Overtime Rate | 20% | <10% | 10–20% | >20% |
| Leave Balance Avg | 15% | >5 days | 2–5 days | <2 days |
| Contract Compliance | 20% | 100% | 95–100% | <95% |
| Training Completion | 10% | >95% | 80–95% | <80% |

#### Project Health (Weight: 10%)

| Metric | Weight | Healthy | Warning | Critical |
|--------|--------|---------|---------|----------|
| On-Time Delivery | 40% | >90% | 75–90% | <75% |
| Budget Adherence | 30% | <5% over | 5–15% over | >15% over |
| Quality Score | 20% | >90% | 75–90% | <75% |
| Client Satisfaction | 10% | >85% NPS | 70–85% | <70% |

#### Shop Health (Weight: 10%)

| Metric | Weight | Healthy | Warning | Critical |
|--------|--------|---------|---------|----------|
| Revenue vs Target | 35% | >95% | 80–95% | <80% |
| Stock Availability | 25% | >98% | 90–98% | <90% |
| Order Fulfillment | 25% | >97% | 90–97% | <90% |
| Return Rate | 15% | <3% | 3–8% | >8% |

#### System Health (Weight: 5%)

| Metric | Weight | Healthy | Warning | Critical |
|--------|--------|---------|---------|----------|
| Platform Uptime | 40% | >99.9% | 99–99.9% | <99% |
| Data Pipeline Status | 30% | All green | 1 degraded | 2+ degraded |
| Auth Success Rate | 20% | >99.5% | 98–99.5% | <98% |
| Security Score | 10% | No P0 issues | 1 P1 issue | Any P0 issue |

### 7.3 Health Status Thresholds

| Status | Score | Display |
|--------|-------|---------|
| 🟢 Healthy | 85–100 | Green badge |
| 🟡 Warning | 65–84 | Yellow badge + advisory |
| 🔴 Critical | 0–64 | Red badge + alert + required action |

### 7.4 Company Health Dashboard Panel

The Company Health panel appears in:
- CEO Executive Cockpit (full detail)
- Co-CEO Cockpit (full detail)
- Operations Manager Dashboard (operational dimensions only)
- Finance Manager Dashboard (financial dimension only)
- HR Manager Dashboard (workforce dimension only)
- Analytics Command Center (all dimensions, historical)

**Panel Components**:
```
Company Health Panel:
├── Overall CHI Score (large number, color-coded)
├── Trend Arrow (vs last week, last month)
├── Dimension Scores (6 cards, each showing sub-metrics)
├── Health History Graph (30-day trend)
├── Dimension Comparison (this month vs last month vs target)
├── AI Commentary (why the score changed)
├── Action Recommendations (what to fix to improve score)
└── Drill Down → Full Health Report (Bottom Sheet)
```

### 7.5 Health Computation Frequency

| Dimension | Computation | Cache TTL |
|-----------|-------------|-----------|
| Financial Health | Every 1 hour | 65 min |
| Operational Health | Every 15 min | 20 min |
| Workforce Health | Every 30 min | 35 min |
| Project Health | Every 30 min | 35 min |
| Shop Health | Every 5 min | 10 min |
| System Health | Every 1 min | 2 min |
| Overall CHI | After any dimension update | Invalidated on update |

---

## 8. KPI ARCHITECTURE

### 8.1 KPI Definition Standard

Every KPI in PRV follows this definition schema:

```
KPI {
  id: string                    // Unique identifier
  name: string                  // Display name
  description: string           // What it measures
  formula: string               // Calculation formula
  unit: KPIUnit                 // $, %, count, hours, ratio
  direction: 'higher_better' | 'lower_better' | 'range'
  target_type: 'absolute' | 'relative' | 'trend'
  refresh_rate: seconds
  roles_eligible: [RoleID]
  scope: ScopeLevel
  data_sources: [DataSourceID]
  alert_threshold: ThresholdConfig
  benchmark: BenchmarkConfig    // Industry + internal historical
  drilldown: DrilldownConfig    // What clicking the KPI shows
}
```

### 8.2 KPI Catalog by Role

#### WORKER KPIs

| KPI | Formula | Target | Refresh |
|-----|---------|--------|---------|
| Hours Worked Today | SUM(check_out - check_in, today) | Shift hours | 5min |
| Hours Worked This Week | SUM(hours_worked, current_week) | Contracted hours | Hourly |
| Tasks Completed Today | COUNT(tasks_completed, today, assigned_to=me) | Daily plan | 5min |
| Tasks Completion Rate | completed/assigned × 100 | >90% | 5min |
| Attendance Streak | Consecutive days on-time | — | Daily |
| Safety Incidents | COUNT(safety_incidents, me, rolling_90d) | 0 | Daily |

#### TEAM LEADER KPIs

| KPI | Formula | Target | Refresh |
|-----|---------|--------|---------|
| Team Attendance Rate | present/scheduled × 100 | >92% | 1min |
| Team Tasks Completed | SUM(tasks_completed, team, today) | Daily plan | 5min |
| Team Productivity Index | actual_output/planned_output × 100 | >85% | 15min |
| Average Task Completion Time | AVG(task_duration, team, this_week) | Baseline | Hourly |
| Issues Raised | COUNT(issues, team, today) | Trend | Hourly |
| Issues Resolved | COUNT(issues_resolved, team, today) | 100% of raised | Hourly |
| Overtime Hours | SUM(overtime_hours, team, this_week) | <10% of total | Daily |

#### OMS KPIs

| KPI | Formula | Target | Refresh |
|-----|---------|--------|---------|
| Site Productivity | actual_units/planned_units × 100 | >90% | 15min |
| Overall Site Utilization | (productive_hours/total_hours) × 100 | >80% | 15min |
| Material Delivery Rate | delivered_on_time/total_deliveries × 100 | >95% | Hourly |
| Issue Resolution SLA | resolved_in_SLA/total_issues × 100 | >90% | 30min |
| Workforce Utilization | occupied_workers/available_workers × 100 | 80–95% | 15min |
| Delay Rate | delayed_milestones/total_milestones × 100 | <10% | Hourly |
| Cost per Productive Hour | total_cost/productive_hours | Baseline | Daily |

#### OPERATIONS MANAGER KPIs

| KPI | Formula | Target | Refresh |
|-----|---------|--------|---------|
| Regional Productivity | SUM(site_productivity)/sites_count | >85% | 30min |
| Workforce Utilization | region_occupied/region_available × 100 | 80–90% | 30min |
| On-Time Project Rate | on_time_projects/active_projects × 100 | >90% | Hourly |
| Resource Allocation Efficiency | utilized_resources/allocated_resources × 100 | >88% | Hourly |
| Cross-Site Issue Rate | issues_per_100_workers, this_month | Trend | Daily |
| Supply Chain Health | on_time_deliveries/total × 100 | >92% | Hourly |

#### PROJECT DIRECTOR KPIs

| KPI | Formula | Target | Refresh |
|-----|---------|--------|---------|
| Portfolio On-Time Rate | on_schedule_projects/total × 100 | >88% | Hourly |
| Portfolio Budget Adherence | projects_within_budget/total × 100 | >90% | Daily |
| Client Satisfaction (NPS) | NET((promoters - detractors)/total × 100) | >70 | Weekly |
| Revenue from Projects | SUM(billed_amounts, this_month) | Budget | Daily |
| Margin per Project | (revenue - cost)/revenue × 100 | >25% | Daily |
| Critical Path Health | milestones_on_critical_path_on_time/total | >85% | Hourly |

#### STORE MANAGER KPIs

| KPI | Formula | Target | Refresh |
|-----|---------|--------|---------|
| Daily Revenue | SUM(transactions.amount, today, store=me) | Daily target | 1min |
| Revenue vs Target | daily_revenue/daily_target × 100 | >100% | 1min |
| Average Transaction Value | total_revenue/transaction_count | Baseline | 5min |
| Conversion Rate | transactions/foot_traffic × 100 | >3% | 5min |
| Stock Availability | available_SKUs/total_SKUs × 100 | >97% | 30min |
| Return Rate | returns/sales × 100 | <4% | Hourly |
| Staff Attendance | present/scheduled × 100 | >95% | 15min |

#### SHOP DIRECTOR KPIs

| KPI | Formula | Target | Refresh |
|-----|---------|--------|---------|
| Network Revenue | SUM(all_stores.revenue, today) | Network target | 1min |
| Revenue per Store | network_revenue/store_count | Baseline | 5min |
| Best Performing Store | MAX(stores.revenue_vs_target) | — | 5min |
| Network Conversion | SUM(conversions)/SUM(traffic) × 100 | >3% | 5min |
| Network Stock Health | AVG(stores.stock_availability) | >97% | 30min |
| Supplier On-Time | deliveries_on_time/total × 100 | >93% | Hourly |
| Revenue Growth MoM | (this_month - last_month)/last_month × 100 | >5% | Daily |

#### CASHIER KPIs

| KPI | Formula | Target | Refresh |
|-----|---------|--------|---------|
| Transactions Today | COUNT(transactions, today, cashier=me) | Shift plan | 5min |
| Revenue Today | SUM(transactions.amount, today, cashier=me) | Shift target | 5min |
| Average Handle Time | AVG(transaction_duration, today) | <90s | 30min |
| Items per Transaction | AVG(items_count, today) | Baseline | 30min |
| Returns Processed | COUNT(returns, today, cashier=me) | Trend | Hourly |

#### FINANCE MANAGER KPIs

| KPI | Formula | Target | Refresh |
|-----|---------|--------|---------|
| Revenue (MTD) | SUM(revenue, month_to_date) | Monthly target | 5min |
| Gross Profit Margin | (revenue - COGS)/revenue × 100 | >35% | Daily |
| Net Profit Margin | net_profit/revenue × 100 | >15% | Daily |
| Cash Position | current_cash_balance | >60-day runway | 1hr |
| AR Days Outstanding | AVG(invoice_age, outstanding) | <30 days | Hourly |
| AP Days Outstanding | AVG(payable_age, outstanding) | <45 days | Daily |
| Budget Variance | (actual - budget)/budget × 100 | <5% | Daily |
| Operating Expense Ratio | OPEX/revenue × 100 | <60% | Daily |

#### CEO KPIs

| KPI | Formula | Target | Refresh |
|-----|---------|--------|---------|
| Total Revenue (MTD) | SUM(all_revenue_sources, MTD) | Monthly target | 5min |
| Total Profit (MTD) | total_revenue - total_costs | Profit target | 5min |
| Cash Position | total_available_cash | >90-day runway | 1hr |
| Active Projects | COUNT(projects, status=active) | Plan | Hourly |
| Shop Revenue (Today) | SUM(shop_transactions, today) | Daily target | 1min |
| Workforce Present | present_employees/total × 100 | >90% | 15min |
| Company Health Index | Composite formula (Section 7) | >85 | 5min |
| Revenue YTD | SUM(revenue, year_to_date) | Annual target | Hourly |
| Profit YTD | SUM(profit, year_to_date) | Annual target | Hourly |
| Revenue Growth (MoM) | (this_month - last_month)/last_month × 100 | >5% | Daily |
| Customer Acquisition | COUNT(new_customers, this_month) | Monthly target | Daily |
| Employee NPS | Employee satisfaction score | >40 | Monthly |

### 8.3 KPI Alert Architecture

Each KPI can have threshold alerts:

```
KPIAlert {
  kpi_id: string
  threshold_type: 'below' | 'above' | 'change_rate'
  threshold_value: number
  severity: 'P0' | 'P1' | 'P2' | 'P3'
  notification_channels: ['push', 'inbox', 'email', 'dynamic_island']
  recipients: RoleID[]           // Who gets notified
  auto_escalate: boolean
  escalate_to: RoleID
  escalate_after: minutes
  message_template: string
}
```

**Default KPI Alerts** (pre-configured, can be adjusted but not removed by executives):

| KPI | Threshold | Severity | Notifies |
|-----|-----------|----------|---------|
| Revenue vs Target | <80% | P1 | CEO, Finance Manager |
| Cashflow | <30-day runway | P0 | CEO, Finance Manager |
| Attendance Rate | <80% | P1 | Operations Manager, HR |
| Active Project Delays | >3 | P1 | CEO, Project Director |
| Stock Availability | <90% | P1 | Shop Director, Store Manager |
| System Uptime | <99% | P0 | Superadmin, CEO |

### 8.4 KPI Comparison Framework

Every KPI supports four comparison axes:
1. **vs Target**: Actual vs pre-set goal (% achievement)
2. **vs Previous Period**: This month vs last month, this week vs last week
3. **vs Same Period Last Year**: YoY growth/decline
4. **vs Benchmark**: Industry average or best-in-class (where available)

### 8.5 KPI Drill-Down Architecture

Tapping any KPI opens a Detail Bottom Sheet:

```
KPI Detail Bottom Sheet:
├── KPI Name + Current Value (large)
├── Trend Line (last 30 days)
├── Target Line (overlaid on trend)
├── Period Selector (today / week / month / quarter / year)
├── Breakdown Table (by sub-dimension: store / team / project)
├── Contributing Factors (AI-computed)
├── Comparison Panel (vs last period, vs target, vs benchmark)
├── Alert Configuration
├── Add to Report
└── Export (CSV, PDF)
```

---

## 9. AI DASHBOARD ARCHITECTURE

### 9.1 AI Dashboard Principles

The AI layer of the dashboard is not a chatbot bolted on. It is a deeply integrated intelligence system that:
- Analyzes all data within the user's permission scope
- Generates proactive insights without being asked
- Surfaces risks before they become critical
- Makes specific, actionable recommendations (not generic advice)
- Learns from user actions (approval/rejection of recommendations)
- Improves forecast accuracy over time

### 9.2 AI Insight Types

#### RECOMMENDATION
**Trigger**: AI detects a suboptimal situation that has a clear improvement action.

```
Example:
"Site B is 23% underutilized while Site A is 12% over capacity.
Reallocating Team 3 (4 workers) to Site A would reduce delay risk by 67%.
→ [Reallocate Team 3] [See Impact] [Dismiss]"
```

Structure:
- Situation description (observed fact)
- Proposed action (specific, not vague)
- Expected outcome (quantified where possible)
- Confidence level (%)
- Actions: Act Now · Preview Impact · Dismiss · Learn More

#### RISK ALERT
**Trigger**: AI detects a pattern indicating an upcoming negative event.

```
Example:
"Cash position trend indicates possible shortfall in 18 days
based on current burn rate and pending payables.
Confidence: 82% | Impact: HIGH
→ [View Cashflow Forecast] [Alert Finance Manager] [Dismiss]"
```

Risk classification:
- Financial Risk
- Operational Risk
- Workforce Risk
- Compliance Risk
- Security Risk
- Supply Chain Risk

#### FORECAST
**Trigger**: Scheduled (daily/weekly/monthly) or on-demand.

```
Forecast types:
├── Revenue Forecast (30d / 90d / 12m)
├── Demand Forecast (shop products, materials)
├── Workforce Demand Forecast (staffing needs)
├── Project Completion Forecast (per project, portfolio)
├── Cash Position Forecast (30d runway projection)
└── Supply Forecast (procurement lead times + demand)
```

Forecast display:
- Line chart: actual + forecast + confidence interval band
- Summary: best case / base case / worst case
- Key assumptions listed
- Sensitivity analysis (what changes the forecast most)

#### ANOMALY DETECTION
**Trigger**: Statistical deviation >2σ from historical baseline.

```
Example:
"Transaction count at Store 3 dropped 41% vs same day last week.
This is unusual — typical variance is ±8%.
Possible causes: [Staff shortage] [System issue] [Market event]
→ [Investigate] [Check Store 3 Dashboard] [Dismiss]"
```

Monitored anomalies:
- Revenue anomalies (per store, per product, per period)
- Attendance anomalies (sudden drop in a team or site)
- Order anomalies (spike or drop in orders)
- Expense anomalies (unusual expense patterns)
- Productivity anomalies (sharp decline in team output)
- Security anomalies (unusual access patterns — fed from Security Architecture)

#### OPTIMIZATION SUGGESTION
**Trigger**: AI identifies an opportunity to improve efficiency, reduce cost, or increase revenue.

```
Example:
"Running payroll processing on Fridays causes 3-hour system slowdown.
Shifting to Wednesday 9 PM would reduce impact on peak usage hours.
Estimated improvement: 40% faster payroll processing.
→ [Adjust Schedule] [Preview] [Dismiss]"
```

#### EXECUTIVE BRIEFING (CEO/Co-CEO only)
**Trigger**: Generated every morning at 07:00 (user's timezone).

```
Executive Briefing Structure:
├── Yesterday's Performance (3 bullet points)
├── Today's Priorities (3 bullet points)
├── Watch Items (risks + opportunities, ranked)
├── Recommended First Actions (CEO's optimal first 30 minutes)
└── Market/External Context (if integrated with external data)
```

### 9.3 AI Insight Lifecycle

```
AI Insight Created →
  Priority Classified (P0–P3) →
  Role Eligibility Check →
  Scope Validation →
  Pushed to Dashboard (Zone 6) →
  User Sees Insight

User Action:
  [ACT NOW] → Opens relevant Bottom Sheet → Action taken → Insight resolved
  [DISMISS] → Insight hidden + feedback captured (was this useful?)
  [SNOOZE]  → Re-surfaces after N hours
  [WRONG]   → Negative feedback → AI model training signal

Insight Expiration:
  - P0 insights: never expire, must be resolved or escalated
  - P1 insights: expire after 24h if no action
  - P2 insights: expire after 7 days
  - P3 insights: expire after 30 days
```

### 9.4 AI Permission Scope

The AI engine respects the same Zero Trust model as all other systems:

```
AI Query Authorization:
├── User's role → determines which metrics AI can analyze
├── User's scope → limits which company/store/site data is analyzed
├── AI output → never reveals data beyond user's permission boundary
└── AI explanation → references only data sources user can access
```

AI cannot reveal information about:
- Other companies (unless user is CEO/Superadmin with multi-company scope)
- Employees outside user's team/region
- Financial data outside user's financial permission

### 9.5 AI Dashboard Widget — Embedded Chat

The AI Chat widget (Zone 6, optional) provides a conversational interface:

```
AI Chat Capabilities:
├── Answer questions about data within user's scope
│   "What was our best performing store last week?"
│   "How many projects are delayed?"
│   "What is our cash position?"
├── Generate on-demand reports
│   "Give me a summary of this month's performance"
│   "Compare Q1 vs Q2 revenue"
├── Execute approved actions via voice/text
│   "Approve the leave request from Ion"
│   "Create a task for Team Alpha to inspect Site B"
└── Explain AI insights
    "Why did you flag the cash position risk?"
```

AI Chat is:
- Always scoped to the user's permission boundary
- Every AI-initiated action logged in the Audit Trail
- Cannot perform irreversible actions without explicit confirmation
- Maintains conversation history within session

---

## 10. DASHBOARD TEMPLATE ARCHITECTURE

### 10.1 Template Hierarchy

Dashboard templates follow a 4-level hierarchy (lower level overrides higher):

```
Level 1: Global Template (Platform Default)
  └─ Level 2: Company Template (Company-specific default)
       └─ Level 3: Role Template (Role-specific default)
            └─ Level 4: Personal Template (User customization)
```

A user's effective dashboard is the result of layering:
`Global → Company → Role → Personal`

Where conflicts occur, lower-level (more specific) takes precedence.

### 10.2 Template Schema

```
DashboardTemplate {
  id: UUID
  name: string
  description: string
  level: 'global' | 'company' | 'role' | 'personal'
  created_by: UserID
  company_id: UUID | null          // null for global templates
  role_id: RoleID | null           // null for company/global templates
  is_default: boolean
  is_published: boolean
  created_at: timestamp
  updated_at: timestamp
  
  zones: ZoneTemplate[]
  widgets: WidgetTemplate[]
  personalization: PersonalizationConfig
}

ZoneTemplate {
  zone_id: ZoneID
  is_visible: boolean
  is_collapsed: boolean
  order: integer
}

WidgetTemplate {
  widget_id: WidgetID
  zone_id: ZoneID
  position: GridPosition
  size: WidgetSize
  config: WidgetConfig            // Widget-specific configuration
  is_pinned: boolean
}
```

### 10.3 Global Templates

Created and managed by Superadmin. Cannot be deleted.

**PRV Default Templates** (shipped with platform):
- `PRV_WORKER_DEFAULT` — Worker dashboard baseline
- `PRV_TEAM_LEADER_DEFAULT` — Team Leader dashboard baseline
- `PRV_OMS_DEFAULT` — OMS Command Center default
- `PRV_MANAGER_DEFAULT` — Operations Manager default
- `PRV_SHOP_DEFAULT` — Shop roles default
- `PRV_CEO_DEFAULT` — Executive Cockpit default
- `PRV_HR_DEFAULT` — HR Command Center default
- `PRV_FINANCE_DEFAULT` — Finance Command Center default
- `PRV_ANALYTICS_DEFAULT` — Analytics dashboard default

### 10.4 Company Templates

Created by CEO or Superadmin. Apply to all users in the company.

**Use cases**:
- Company branding in dashboard header
- Company-specific KPI targets embedded in widgets
- Company-specific quick actions (company's workflow shortcuts)
- Company-approved widget set (restrict widgets for compliance)

**Company Template Publisher** (CEO permission):
- CEO can publish a template to all company users
- CEO can create and share multiple templates by role
- CEO can lock specific zones (prevent user-level override)
- CEO can set templates as mandatory (users cannot deviate from zone layout)

**Company Template Versioning**:
- All template versions preserved
- Changes require explicit "Publish" action (draft mode by default)
- Users on previous version receive notification of new template
- Users can opt to keep old template for up to 30 days

### 10.5 Role Templates

Created by HR Manager or Operations Manager. Apply to users with a specific role.

**Role Template Management**:
- HR Manager can create/edit role templates for all roles they manage
- Role templates include role-appropriate default widget set
- Role templates auto-assign when a user is assigned a role
- Template can be updated when role evolves (without user action)

### 10.6 Personal Templates

Created by each user. Private by default, shareable.

**Personal Template Operations**:
- Save current dashboard state as named template
- Create multiple personal templates ("Monday Morning", "Monthly Review")
- Switch between templates via Dashboard Settings
- Share template with colleagues (send link, recipient can clone)
- Set a template as default (applies on login)

**Personal Template Limits**:
- Maximum 10 personal templates per user
- Template includes: widget arrangement, sizes, zone visibility, widget configs
- Does NOT include: data, filters, search queries (those are Saved Views)

### 10.7 Template Change Management

When a Company or Role template is updated:

```
Template Published →
  Users on that template notified (inbox notification) →
  Template applied on next login →
  "Template Updated" banner shown on first view →
  User can preview diff (old vs new layout) →
  User can accept immediately or defer up to 30 days →
  After 30 days: auto-applied regardless
```

If a Mandatory Template is published:
```
Users notified (cannot defer) →
Template applied within 24 hours →
Personal overrides for locked zones are reset
```

---

## 11. DASHBOARD PERSONALIZATION ARCHITECTURE

### 11.1 Personalization Scope

Users can personalize within the bounds allowed by their template level:

| Feature | Global Template | Company Template | Role Template | Personal |
|---------|----------------|-----------------|---------------|----------|
| Zone order | Defined | Can restrict | Can restrict | Can reorder |
| Zone visibility | All visible | Can hide zones | Can hide zones | Can hide/show |
| Widget add | Full catalog | Role-filtered | Role-filtered | Eligible only |
| Widget remove | Cannot | Can remove some | Can remove | Can remove |
| Widget resize | Cannot | Can allow | Can allow | Can resize |
| Widget reorder | Cannot | Can allow | Can allow | Can reorder |
| Quick Actions | Role default | Can customize | Can customize | Can reorder/hide |
| Dashboard header | Locked | Company logo | — | Avatar only |

### 11.2 Personalization Settings Panel

Accessible via: Dashboard Settings (gear icon) → Personalize

```
Personalization Panel (Bottom Sheet, Large):
├── Layout
│   ├── Template Selector (my templates + shared templates)
│   ├── Save Current as Template
│   └── Reset to Role Default
│
├── Zones
│   ├── [Zone 1] My Day — [Always Visible] [Cannot Remove]
│   ├── [Zone 2] Important Now — [Always Visible] [Cannot Remove]
│   ├── [Zone 3] KPIs — [Visible ✓] [Reorder ↑↓]
│   ├── [Zone 4] Activity — [Visible ✓] [Reorder ↑↓]
│   ├── [Zone 5] Quick Actions — [Visible ✓] [Reorder ↑↓]
│   ├── [Zone 6] AI Insights — [Visible ✓] [Reorder ↑↓]
│   ├── [Zone 7] Inbox — [Visible ✓] [Reorder ↑↓]
│   └── [Zone 8] Calendar — [Visible ✓] [Reorder ↑↓]
│
├── Widgets
│   ├── [Widget Library →] (opens widget selector)
│   ├── Currently Visible (list, drag to reorder)
│   └── Hidden Widgets (list, tap to restore)
│
├── Quick Actions
│   ├── Available Actions (role catalog)
│   ├── Visible Actions (reorderable, max 8 on mobile)
│   └── [Reset to Default]
│
├── Notifications
│   ├── Zone 2 Threshold (show P0+P1 / P0 only / all)
│   └── AI Insights Frequency (always / hourly / daily digest)
│
└── Data Preferences
    ├── Default Period (Today / This Week / This Month)
    ├── Currency Display (symbol / code)
    └── Number Format (1,000 / 1.000 / 1k)
```

### 11.3 Saved Views

A Saved View captures the current dashboard state including:
- Active filters applied to each zone
- Widget configuration (selected period, breakdown)
- Search queries (recent searches saved)
- Sort orders

**Saved View Types**:

| Type | Description | Example |
|------|-------------|---------|
| Dashboard View | Current zone + widget arrangement | "Monthly Review Mode" |
| Report Filter | Pre-set filter configuration | "Q1 Finance View" |
| Search Query | Saved search with filters | "Overdue Projects" |
| KPI Configuration | Specific KPI set + periods | "Executive Weekly" |

**Saved Views Management**:
- Save from any screen via ⭐ icon → "Save View"
- Accessible via: Sidebar → Saved Views · Command Palette → "Open Saved View"
- Maximum 50 saved views per user
- Views can be shared with team members
- Views can be promoted to Role Templates by managers

### 11.4 Favorites System

Users can pin any record type to their Favorites:

| Pinnable Item | Access | Visibility |
|--------------|--------|------------|
| Projects | Quick access from sidebar | Owner's scope only |
| Products | Quick access from Shop tab | Store's inventory |
| Reports | Quick access from Analytics | Permission-filtered |
| Documents | Quick access from Documents | Access rights apply |
| Customers | Quick access from CRM | CRM permission |
| Suppliers | Quick access from Procurement | Procurement permission |
| Dashboards | Quick access from ⌂ Command | Personal dashboards |
| Employees | Quick contact from People | Team scope |

**Favorites Panel**:
- Accessible from sidebar (star icon) + Command Palette
- Organized by category (auto-grouped)
- Most recently accessed at top
- Stale favorites auto-removed (record deleted or access revoked)
- Maximum 100 favorites total, 20 per category

### 11.5 Personalization Persistence

Dashboard personalization is stored server-side per user:

```
UserPreferences {
  user_id: UUID
  template_id: UUID
  zone_config: ZoneConfig[]
  widget_config: WidgetConfig[]
  quick_actions_order: ActionID[]
  saved_views: SavedView[]
  favorites: Favorite[]
  notification_preferences: NotificationPrefs
  data_preferences: DataPrefs
  updated_at: timestamp
  device_overrides: {
    mobile: PartialConfig
    tablet: PartialConfig
    desktop: PartialConfig
  }
}
```

**Device-Specific Overrides**: Users can have different layouts on iPhone vs iPad vs Web. The base template is shared; device overrides layer on top.

**Sync**: Preferences sync across devices in real-time via the user's session. Change on iPhone → visible on Web within 5 seconds.

---

## 12. ROLE × DASHBOARD MATRIX

### 12.1 Dashboard Type by Role

| Role | Personal Dashboard | Command Center | Executive Cockpit | Operational View |
|------|-------------------|----------------|-------------------|-----------------|
| Superadmin | ✓ | Platform Admin CC | — | System Health |
| CEO | ✓ | CEO Command Center | ✓ CEO Cockpit | — |
| Co-CEO | ✓ | Co-CEO Command Center | ✓ Co-CEO Cockpit | — |
| Operations Manager | ✓ | Operations CC | — | — |
| OMS | ✓ | OMS CC | — | ✓ Site Operations |
| Team Leader | ✓ | — | — | ✓ Team Operations |
| Worker | ✓ | — | — | ✓ My Day Only |
| Project Director | ✓ | Project Portfolio CC | ✓ Dir Cockpit | — |
| Project OMS | ✓ | — | — | ✓ Project Operations |
| Project Team Leader | ✓ | — | — | ✓ Project Team View |
| Project Worker | ✓ | — | — | ✓ My Day Only |
| Shop Director | ✓ | Shop CC | ✓ Shop Cockpit | — |
| Store Manager | ✓ | Store CC | — | ✓ Store Operations |
| Cashier | — | — | — | ✓ Register View |
| Procurement Manager | ✓ | Procurement CC | — | — |
| HR Manager | ✓ | HR CC | — | — |
| Finance Manager | ✓ | Finance CC | — | — |
| Analyst | ✓ | Analytics CC | — | — |

### 12.2 Zone Visibility by Role

| Zone | Worker | TL | OMS | Ops Mgr | CEO | Cashier |
|------|--------|----|-----|---------|-----|---------|
| Z1 My Day | ✓ Full | ✓ Full | ✓ Full | ✓ Full | ✓ Executive | ✓ Minimal |
| Z2 Important Now | ✓ Limited | ✓ Team scope | ✓ Site scope | ✓ Regional | ✓ All scope | ✓ Register |
| Z3 KPIs | ✓ 2 KPIs | ✓ 5 KPIs | ✓ 8 KPIs | ✓ 10 KPIs | ✓ All KPIs | ✓ 3 KPIs |
| Z4 Activity | ✓ My actions | ✓ Team | ✓ Site | ✓ Regional | ✓ All | ✓ Register |
| Z5 Quick Actions | ✓ 4 actions | ✓ 6 actions | ✓ 8 actions | ✓ 8 actions | ✓ 8 actions | ✓ 3 actions |
| Z6 AI Insights | ✓ Personal | ✓ Team AI | ✓ Site AI | ✓ Regional AI | ✓ Executive AI | — |
| Z7 Inbox | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ Limited |
| Z8 Calendar | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ Shift only |

### 12.3 Quick Actions by Role

| Role | Quick Action 1 | QA 2 | QA 3 | QA 4 | QA 5 | QA 6 |
|------|---------------|------|------|------|------|------|
| Worker | Check In/Out | Upload Photo | Report Issue | My Schedule | — | — |
| Team Leader | Team Attendance | Create Task | Approve Leave | Report Issue | Message Team | — |
| OMS | Create Issue | Request Materials | Daily Report | Team Overview | Site Status | Approve Timesheets |
| Ops Manager | Site Overview | Approval Queue | Resource Map | Reports | Escalate | — |
| Project Director | Portfolio View | Approve PO | Client Meeting | Strategic Plan | Risk Log | — |
| Store Manager | Open Register | Daily Report | Inventory Check | Staff Attendance | Approve Returns | Orders |
| Cashier | Open Register | Process Return | End of Day | — | — | — |
| Shop Director | Network Revenue | Inventory Alert | Supplier PO | Store Compare | Reports | — |
| HR Manager | Approve Leave | New Employee | Payroll Run | Document Expiry | Compliance | — |
| Finance Manager | Approve Invoice | Cashflow | Payroll Status | Budget Review | Tax Obligations | — |
| CEO | Executive Brief | Approval Queue | Company Health | Strategic Init | Add Company | — |

---

## 13. DATA ARCHITECTURE

### 13.1 Dashboard Data Pipeline

```
Source Systems → Data Lake → Dashboard Query Layer → Cache → Dashboard Client

Source Systems:
├── Project Management Platform
├── Workforce Management Platform
├── Attendance Platform
├── Shop Platform (POS)
├── Finance Platform
├── CRM Platform
├── HR Platform
├── Procurement Platform
├── Document Management
└── AI Platform

Data Lake:
├── Raw events (append-only, immutable)
├── Computed aggregates (pre-computed at multiple time granularities)
└── AI predictions (stored as time-series)

Dashboard Query Layer:
├── Permission-filtered queries (no raw SQL access, ORM-enforced scoping)
├── Company isolation enforced at query level
└── Scope injection (company_id, store_id, etc. auto-injected from session)

Cache Layer (Redis):
├── Per-role aggregates (TTL by metric type)
├── Per-user session cache (widget configs, preferences)
└── Real-time invalidation on source events

Dashboard Client:
├── Initial render from cache (instant)
├── WebSocket subscriptions for real-time updates
└── Optimistic updates for user actions
```

### 13.2 Real-Time Data Subscriptions

Each dashboard zone subscribes to specific data channels:

| Zone | WebSocket Channel | Update Trigger |
|------|------------------|----------------|
| Zone 1 My Day | `user.{id}.my_day` | Schedule change, task update, attendance event |
| Zone 2 Important Now | `user.{id}.alerts` | New P0/P1 alert, resolution |
| Zone 3 KPI | `kpi.{scope}` | KPI threshold crossed, refresh interval |
| Zone 4 Activity | `audit.{scope}` | New audit log entry (filtered) |
| Zone 5 Quick Actions | Static (role manifest) | On role change only |
| Zone 6 AI Insights | `ai.{user_id}` | New AI insight generated |
| Zone 7 Inbox | `inbox.{user_id}` | New notification, approval action |
| Zone 8 Calendar | `calendar.{user_id}` | Calendar event created/updated |

### 13.3 Offline Capability

When network is unavailable:
- Cached dashboard renders with last-known data
- Stale data indicators shown on all widgets
- My Day (Zone 1) continues to work (cached for 24h)
- Zone 2 alerts cached (may be stale — explicit warning shown)
- Actions queue locally → sync when reconnected
- Attendance check-in/out queued (critical — never lost)

### 13.4 Data Retention for Dashboard

| Data Type | Hot (Dashboard) | Warm (Archive) | Cold (Compliance) |
|-----------|----------------|----------------|-------------------|
| KPI snapshots | 90 days | 3 years | 7 years |
| Activity feed | 30 days | 1 year | 7 years |
| AI Insights | 30 days | 6 months | 2 years |
| Dashboard usage | 7 days | 90 days | 1 year |
| Widget configs | Active + history | Indefinite | — |

---

## 14. INTEGRATION REQUIREMENTS

Every dashboard component integrates with the following systems. This is not optional — each integration is mandatory.

### 14.1 Mandatory Integrations

| Integration | Dashboard Usage | Zero Trust Requirement |
|------------|----------------|----------------------|
| **Identity & Auth** | Session validation on every data request | ✓ Session token validated |
| **Role & Permission** | Widget eligibility, data scope | ✓ Permission check per widget |
| **Audit Log** | Every dashboard view, every action logged | ✓ Immutable |
| **Notification Center** | Zone 7, Zone 2 alerts | ✓ Scoped to user |
| **AI Platform** | Zone 6 insights, briefings, forecasts | ✓ Scoped output |
| **Attendance Platform** | Zone 1 My Day status, KPI widgets | ✓ Only own team |
| **Finance Platform** | Financial KPIs, CEO widgets | ✓ Finance permission |
| **Project Platform** | Project KPIs, My Day, Quick Actions | ✓ Project scope |
| **Shop Platform** | Shop KPIs, store widgets | ✓ Store scope |
| **HR Platform** | Workforce KPIs, My Day | ✓ HR permission |
| **Document Platform** | Zone 4 activity, Zone 7 signatures | ✓ Document access rights |
| **Procurement Platform** | Material KPIs, delivery widgets | ✓ Procurement permission |
| **Search Platform** | Widget search, filter search | ✓ Results scoped |
| **Calendar Platform** | Zone 8 calendar, My Day events | ✓ User's calendar scope |

### 14.2 Dashboard Security Requirements

Per SECURITY_ARCHITECTURE.md — every dashboard request goes through:

```
Request → JWT Validation → Role Check → Scope Injection → Data Fetch → Response
```

Additional dashboard-specific security:
- Widget data never cached in browser localStorage (memory only)
- Dashboard session terminated on role change
- Company switch requires re-authentication (re-validate token)
- Executive Cockpit requires session freshness < 30 minutes (re-auth if stale)
- Sensitive financial widgets require PIN re-entry after 60 min inactivity
- All dashboard views logged in audit trail (user, timestamp, scope, widgets visible)

### 14.3 Performance Requirements

| Metric | Target | Maximum |
|--------|--------|---------|
| Initial Dashboard Load (from cache) | < 500ms | 1500ms |
| Widget Data Load | < 800ms | 2000ms |
| Real-time Update Latency | < 200ms | 500ms |
| KPI Refresh (from pre-computed) | < 300ms | 1000ms |
| Dashboard Settings Save | < 200ms | 500ms |
| Template Apply | < 1000ms | 3000ms |
| Company Health Score Compute | < 5min | 10min |
| Executive Briefing Generate | < 30s | 120s |

### 14.4 Accessibility Requirements

- All widgets keyboard navigable (Tab order follows visual order)
- WCAG 2.1 AA contrast for all text (despite glass backgrounds)
- Screen reader labels for all KPI values and trend indicators
- High contrast mode available (increases glass opacity, removes blur)
- Large text mode available (scales typography, preserves layout)
- Motion reduced mode available (disables animations, preserves interactions)
- Voice navigation compatible (VoiceControl on iOS, Voice Access on Android)

---

## APPENDIX A — DASHBOARD ZONE QUICK REFERENCE

| Zone | Name | Required | Real-time | Personalizable |
|------|------|----------|-----------|----------------|
| Z1 | My Day | ✓ Always | 5min | Collapse only |
| Z2 | Important Now | ✓ Always | WebSocket | Cannot hide |
| Z3 | KPI Widgets | ✓ Always | 30s | Full (drag, resize) |
| Z4 | Recent Activity | ✓ Always | WebSocket | Filter + minimize |
| Z5 | Quick Actions | ✓ Always | Static | Reorder + hide |
| Z6 | AI Insights | ✓ Always | 15min | Collapse |
| Z7 | Inbox Summary | ✓ Always | WebSocket | Category hide |
| Z8 | Calendar | ✓ Always | 5min | Collapse |

---

## APPENDIX B — COMMAND CENTER QUICK REFERENCE

| Command Center | Primary Role | Sections | Real-time |
|---------------|-------------|----------|-----------|
| CEO | CEO, Co-CEO | 9 sections | ✓ All live |
| Operations | Operations Manager | 7 sections | ✓ All live |
| OMS | OMS | 7 sections | ✓ All live |
| Shop | Shop Director | 8 sections | ✓ All live |
| HR | HR Manager | 8 sections | 30min refresh |
| Finance | Finance Manager | 8 sections | 5min refresh |
| Analytics | Analyst | 8 sections | On demand |
| Procurement | Procurement Manager | 7 sections | Hourly refresh |

---

## APPENDIX C — COMPANY HEALTH SCORING

| Dimension | Weight | Healthy | Warning | Critical |
|-----------|--------|---------|---------|----------|
| Financial | 30% | 85–100 | 65–84 | 0–64 |
| Operational | 25% | 85–100 | 65–84 | 0–64 |
| Workforce | 20% | 85–100 | 65–84 | 0–64 |
| Project | 10% | 85–100 | 65–84 | 0–64 |
| Shop | 10% | 85–100 | 65–84 | 0–64 |
| System | 5% | 85–100 | 65–84 | 0–64 |

**Overall CHI** = Σ (dimension_score × dimension_weight)

🟢 Healthy: CHI ≥ 85 | 🟡 Warning: CHI 65–84 | 🔴 Critical: CHI < 65

---

## 15. ENTITY PREVIEW INTEGRATION IN DASHBOARDS

### 15.1 Principle

Every entity reference appearing in any dashboard — KPI card, widget, list row, activity feed item, analytics table — must be tappable via the Universal Entity Preview Engine (NAVIGATION_ARCHITECTURE §16). Dashboards never navigate directly to full entity screens on first tap.

```
Dashboard interaction flow:
  Tap entity reference → Quick Preview Sheet (Medium Bottom Sheet)
  → User reviews context, takes quick action, or taps "Open Full →"
  → Full entity screen opens (push navigation)

  Long press entity reference → Context Menu + Peek Preview
  → Role-filtered actions appear instantly
```

### 15.2 Dashboard Surfaces with Entity Preview

| Dashboard Surface | Entity Types Previewed |
|-------------------|------------------------|
| My Day — Today's Tasks | Employee (assignee), Project |
| Command Center — Staff Roster | Employee |
| Command Center — Project Pipeline | Project, Client |
| KPI Drill-down rows | Project, Employee, Store, Team |
| Activity Feed items | Employee, Project, Order, Document |
| Approval Queue items | Employee (requester), Document |
| Alert Panel items | Employee, Vehicle, Tool, Project |
| Analytics Tables | All 12 entity types |
| Widgets (entity-linked) | Employee, Project, Client, Product, Order |

### 15.3 Widget Preview Behavior

Widgets that reference a specific entity support preview on tap:

```
Home Screen Widget tap:
  → Opens PRV app
  → Immediately presents Quick Preview Sheet for the entity
  → Background: dashboard (no jarring full-screen entity page)

Dashboard Widget tap (in-app):
  → Quick Preview Sheet slides up in-app
  → No app switch, no navigation stack change
```

### 15.4 Person Entity Cards on Dashboards

Employees, Clients, and Suppliers displayed in dashboard lists/grids must render as Apple Contact-style cards:

```
Person card (dashboard list row):
  [Avatar 40pt] [Presence dot]
  Full Name (17pt, weight 600)
  Role / Company (15pt, white 65%)
  [Status pill] [Social icons: max 3]
  Tap → Quick Preview Sheet
  Long Press → Context Menu
```

Rules:
- Avatar always shown (fallback: initials in glass circle)
- Presence dot always visible for employees (§16.8)
- Social icons shown only if `social_profiles.view` permission held
- Card background: Glass 1

### 15.5 Presence System in Dashboards

The Staff Roster widget, HR Command Center, and People module dashboards must display live presence for all visible employees:

- Presence refreshes via Supabase Realtime (presence channel, company-scoped)
- Dashboard subscribes on mount, unsubscribes on unmount
- Presence dots update without re-rendering the full list
- Aggregate presence stats shown in HR Command Center header: "X available · Y in meeting · Z on site"

---

*PRV Dashboard Architecture · Pasul 6 · Source of Truth*  
*Do not modify without approval from Lead Architect.*  
*All 18 platforms · All 18 roles · Zero Trust · Liquid Glass*
