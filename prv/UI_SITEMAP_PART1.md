# PRV — UI Sitemap Part 1
**Version:** 1.0
**Status:** APPROVED ARCHITECTURE
**Date:** 2026-06-03
**Roles Covered:** Sysadmin · Platform Admin · Group CEO · CEO · Co-CEO

---

## Overview

This document defines the complete UI surface for the five highest-authority roles in PRV. Every screen, bottom sheet, Dynamic Island state, widget, and notification type is catalogued for each role.

**Navigation Law:** All navigation uses a floating Liquid Glass tab bar (5 tabs maximum). Navigation depth never exceeds 3 levels. Actions are delivered via Bottom Sheets, not new screens.

**Dashboard Law:** All dashboards follow the 8-Zone structure — Header / KPI / Primary / Secondary / Activity / AI / Quick Actions / Overflow.

---

## Role 01 — Sysadmin

**Scope Level:** 9 — Global (all companies, all groups, all data)
**Description:** Platform superadmin. Full unrestricted access to every company, every record, every system log. Operates under JIT 4-eyes break-glass protocol.

---

### 1. Navigation

| Tab | Icon | Name | Primary Content |
|-----|------|------|----------------|
| 1 | ⊞ | System | Platform health dashboard, server status, uptime metrics |
| 2 | 🏢 | Companies | All companies list, onboarding queue, company health scores |
| 3 | 🔐 | Security | Security events, active alerts, audit chain status, JIT sessions |
| 4 | 📋 | Audit | Global audit log stream, cross-company event timeline |
| 5 | ⚙️ | Platform | System configuration, feature flags, migration history, API status |

**Tab 1 — System:**
- Platform Overview (uptime, error rate, job queue health)
- Database Status (connection pool, partition status, replication lag)
- Background Jobs Monitor (Inngest queue, failed jobs, retry queue)
- Search Index Status (Typesense sync lag)
- Real-time Connections (Supabase Realtime active connections)

**Tab 2 — Companies:**
- All Companies List (search, filter by status, plan, creation date)
- Company Detail → Users, Modules, Usage, Billing, Config
- Onboarding Queue (new company setup checklist)
- Company Health Scores (computed: activity, data quality, error rate)
- Impersonation Center (JIT access, requires justification + second approval)

**Tab 3 — Security:**
- Security Event Feed (real-time, severity-colored)
- Active Threats (unresolved critical/high events)
- JIT Access Sessions (active sysadmin sessions with timers)
- Audit Chain Integrity Monitor (chain_verified = false alerts)
- Failed Login Heatmap (IP-based, time-based)
- Rate Limit Violations

**Tab 4 — Audit:**
- Global Audit Stream (all companies, all events)
- Filter by: company / actor / entity type / event category / date range
- Audit Chain Verification Tool
- Data Erasure Request Queue (GDPR)
- Export Audit Log (with justification required)

**Tab 5 — Platform:**
- System Configuration (key-value store editor)
- Feature Flags (global + per-company toggles)
- Migration History (applied/pending DB migrations)
- Webhook Delivery Health (cross-platform stats)
- API Key Registry (all companies)
- Notification Template Manager

---

### 2. Dashboard (System Tab)

**Header Zone:** PRV Platform · Sysadmin · Current UTC time · JIT session indicator (if active)

**KPI Zone:**
- Total Active Companies
- Total Active Users (last 30 days)
- Platform Uptime (99.xx%)
- Error Rate (last 1h)
- Background Job Success Rate
- Storage Used / Allocated

**Primary Zone:**
- Company Health Grid (all companies, traffic-light status)
- System Error Chart (last 24h, by error type)

**Secondary Zone:**
- Recent Security Events (last 10, with severity badges)
- Slow Query Log (last 5 queries > 500ms)

**Activity Zone:**
- Global Audit Event Stream (live, last 50)
- Active JIT Sessions

**AI Zone:**
- Anomaly Detection Feed (unusual access patterns, spike alerts)
- Platform Health Forecast

**Quick Actions Zone:**
- Emergency: Freeze Company
- Emergency: Revoke All Sessions (company-scoped)
- Emergency: Enable Maintenance Mode
- Create New Company
- Review Pending JIT Requests

**Overflow Zone:**
- Migration Scheduler
- Partition Maintenance Status

---

### 3. Screens

**System Tab:**
- System Overview (dashboard)
  - Database Detail
    - Table Size Report
    - Partition Status
    - Index Health
  - Job Queue Detail
    - Failed Jobs List → Job Detail → Retry / Cancel
    - Job Type Breakdown
  - Search Index Health
    - Per-collection sync status
    - Force Re-index Action

**Companies Tab:**
- Company List
  - Company Detail
    - Company Overview
    - User Management → User Detail → Impersonate (JIT)
    - Module Configuration
    - Feature Flag Overrides
    - Usage Analytics
    - Billing & Plan
    - Audit Log (company-scoped)
    - Security Events (company-scoped)
    - Data Export (GDPR)
    - Danger Zone (suspend / delete)
  - Onboarding Wizard (new company setup)
  - Company Health Report

**Security Tab:**
- Security Event List
  - Event Detail → Resolve / Escalate / Add Note
- JIT Access Center
  - Pending Requests
  - Active Sessions (with countdown timer)
  - Session History
- Audit Chain Verifier
  - Run Verification (full or range)
  - Broken Chain Report
- Data Erasure Queue
  - Request Detail → Approve / Reject / Execute
  - Execution Report

**Audit Tab:**
- Global Audit Stream
  - Filter Panel
  - Event Detail
  - Actor Profile (all events by this user)
  - Entity History (all events on this record)
- Audit Export Request
  - Justification Form
  - Approval Status
  - Download (once approved)

**Platform Tab:**
- System Config Editor
  - Key-Value List → Edit Config Value
- Feature Flags
  - Global Flags List → Enable/Disable → Rollout %
  - Company Overrides
- Migration History
  - Migration List → Migration Detail
  - Pending Migrations
- API Health
  - Endpoint Latency Chart
  - Error Rate by Endpoint
- Notification Template Manager
  - Template List → Template Detail → Edit → Preview

---

### 4. Bottom Sheets

| Bottom Sheet | Trigger | Content | Actions |
|-------------|---------|---------|---------|
| JIT Access Request | Tap "Impersonate" on any user | Justification text field, duration selector (max 2h), required second approver | Submit Request / Cancel |
| JIT Access Approval | Notification or second approval request | Requester info, justification, target company/user, duration | Approve / Deny |
| Emergency Freeze | Quick Action tap | Company selector, reason, confirmation checkbox | Freeze / Cancel |
| Audit Chain Break | Integrity alert tap | Affected range, sequence numbers, diff display | Investigate / Acknowledge / Escalate |
| Company Suspend | Danger Zone tap | Warning summary, reason field, confirmation | Suspend (7-day warning) / Cancel |
| Feature Flag Edit | Flag list item tap | Toggle, rollout % slider, role filter, expiry date | Save / Cancel |
| Config Edit | Config key tap | Key (read-only), value editor, type selector | Save / Cancel |
| GDPR Erasure Execute | Request approve tap | Tables to process, estimated records, legal basis check | Execute Now / Schedule / Reject |
| Failed Job Retry | Job detail tap | Job type, error summary, attempt history | Retry / Cancel Job |
| Security Event Resolve | Event detail tap | Resolution notes field, severity confirmation | Mark Resolved / Escalate |

---

### 5. Dynamic Island

**Idle State:** PRV Sysadmin · Uptime 99.98%

**Active JIT Session:** 🔐 JIT Active · 01:23:45 remaining · {Company Name}

**Alert State:** 🚨 {N} Critical Alerts · Tap to review

**Expanded State (long press):**
- Active JIT session countdown
- Top 3 unresolved security events
- Failed job count
- Quick action: Extend JIT / End Session / Go to Security

---

### 6. Widgets

**Lock Screen Widget (small):**
- PRV Platform status (green dot = healthy / red = incident)
- Active company count
- Unresolved security event count

**Home Screen Widget (medium):**
- Platform health score
- Error rate (last 1h)
- Active JIT sessions
- Top unresolved security event
- Quick action: Open Security tab

**Dashboard Widgets (all available):**
- Company Health Grid
- Global Audit Stream
- Security Event Feed
- Platform Uptime Chart
- Background Job Health
- Storage Usage Gauge
- API Latency Heatmap
- Active User Count (platform-wide)
- Failed Job Rate Chart
- JIT Session Timeline

---

### 7. Notifications

| Event | Title | Body | Priority | Channels |
|-------|-------|------|----------|---------|
| Audit chain integrity broken | 🔴 Audit Chain Break | Chain broken at sequence #{N} in {company}. Investigate immediately. | Critical | Push + Email + SMS |
| JIT access request submitted | 🔐 JIT Request | {requester} requests impersonation of {user} at {company}. | Critical | Push + In-App |
| Security event: brute force | 🚨 Brute Force Detected | {N} failed logins from {IP} targeting {company}. | Critical | Push + SMS |
| Company suspension triggered | ⚠️ Company Suspended | {company} has been suspended by {actor}. | High | Push + Email |
| Background job failure spike | ⚙️ Job Failures | {N} jobs failed in the last hour (rate: {%}). | High | Push + In-App |
| New company onboarded | ✅ New Company | {company} has completed onboarding. | Normal | In-App + Email |
| Data erasure request pending | 📋 GDPR Request | Erasure request for {user} at {company} awaits approval. | High | Push + Email |
| Database replica lag | 🗄️ Replica Lag | Read replica is {N}s behind primary. | High | Push + In-App |
| Migration applied | 🔄 Migration Applied | {migration_name} applied successfully in {duration}ms. | Low | In-App |
| Storage threshold exceeded | 💾 Storage Alert | {company} has exceeded {N}% storage quota. | Normal | In-App + Email |

---

---

## Role 02 — Platform Admin

**Scope Level:** 8 — Platform (PRV operations team, no company business data)
**Description:** Internal PRV operations staff. Manages company onboarding, billing, support, and platform configuration. Cannot read business data within companies.

---

### 1. Navigation

| Tab | Icon | Name | Primary Content |
|-----|------|------|----------------|
| 1 | ⊞ | Dashboard | Operations overview, onboarding queue, support tickets |
| 2 | 🏢 | Companies | Company list, plan management, configuration |
| 3 | 🎫 | Support | Support ticket queue, help requests |
| 4 | 💰 | Billing | Subscription plans, invoices, payment status |
| 5 | ⚙️ | Settings | Notification templates, feature flags, API docs |

**Tab 1 — Dashboard:** Ops KPIs, onboarding funnel, recent activity
**Tab 2 — Companies:** All companies (name, plan, status, created date, health score)
**Tab 3 — Support:** Ticket queue (open/in-progress/resolved), SLA tracking
**Tab 4 — Billing:** Monthly recurring revenue, overdue accounts, plan upgrades
**Tab 5 — Settings:** Global feature flags, notification template management, API versioning

---

### 2. Dashboard

**Header Zone:** PRV Operations · Platform Admin · Today's date

**KPI Zone:**
- Total Companies (active / trial / suspended)
- Monthly Recurring Revenue (aggregate)
- Onboarding Pipeline (companies in setup)
- Open Support Tickets
- SLA Breach Risk (tickets approaching deadline)
- Platform Health Score (from Sysadmin feed)

**Primary Zone:**
- Onboarding Funnel (step 1 → step N, with counts at each stage)
- Company Growth Chart (monthly, last 12 months)

**Secondary Zone:**
- Overdue Accounts (payment outstanding)
- Trial Expirations (next 30 days)

**Activity Zone:**
- Recent Onboarding Activity
- Support Ticket Updates

**AI Zone:**
- Churn Risk Signals (low-activity companies)
- Expansion Opportunity Signals (near plan limits)

**Quick Actions Zone:**
- Create New Company
- Send Platform Announcement
- Upgrade Company Plan
- Review Support Queue

---

### 3. Screens

**Dashboard Tab:** Operations Overview
- Onboarding Funnel Detail
- Company Growth Report

**Companies Tab:**
- Company List
  - Company Detail
    - General Info (name, plan, contacts)
    - Module Enablement (which modules are on)
    - Usage Summary (users, storage, API calls — no business data)
    - Billing History
    - Support History
    - Feature Flag Overrides
    - Send Announcement (company-scoped)
  - Create Company → Onboarding Wizard
    - Step 1: Company Details
    - Step 2: Admin User Setup
    - Step 3: Module Selection
    - Step 4: Billing Plan
    - Step 5: Confirmation & Launch

**Support Tab:**
- Ticket Queue
  - Ticket Detail → Reply → Close → Escalate to Sysadmin
- SLA Dashboard
- Knowledge Base (internal ops KB)

**Billing Tab:**
- Revenue Overview
  - MRR Chart
  - Per-company Revenue
- Overdue Accounts → Send Reminder / Suspend Warning
- Plan Management
  - Plan List → Edit Plan → Pricing / Limits
- Invoice List → Invoice Detail → Download

**Settings Tab:**
- Notification Templates (all company-facing system notifications)
- Feature Flag Manager (global flags, no company-specific)
- API Changelog Manager
- Platform Announcement Composer

---

### 4. Bottom Sheets

| Bottom Sheet | Trigger | Content | Actions |
|-------------|---------|---------|---------|
| Company Onboarding Start | "Create Company" tap | Company name, legal name, primary admin email, plan selection | Begin Onboarding |
| Plan Upgrade | Company billing tap | Current plan, upgrade options, pricing delta, effective date | Upgrade / Schedule |
| Payment Suspension Warning | Overdue account tap | Outstanding amount, days overdue, contact info | Send Warning / Suspend / Mark Paid |
| Support Ticket Reply | Ticket detail tap | Reply composer, canned responses, internal note toggle | Send Reply / Close Ticket |
| Send Announcement | Quick action | Scope selector (all / company), title, body, priority | Send / Preview / Schedule |
| Feature Flag Toggle | Flag list item tap | Flag name, current state, rollout %, expiry | Toggle / Save |
| Escalate to Sysadmin | Ticket escalate button | Reason selector, notes | Escalate |
| Onboarding Unstick | Stalled company tap | Step stuck on, manual override options | Override Step / Contact Admin |

---

### 5. Dynamic Island

**Idle State:** PRV Ops · {N} open tickets

**Alert State:** 🎫 {N} SLA breaches · Tap to review

**Expanded State:** Top open ticket / Onboarding queue count / Overdue accounts

---

### 6. Widgets

**Lock Screen:** Open support tickets count · SLA at-risk count

**Home Screen:** Onboarding pipeline / MRR / Open tickets / Top at-risk company

**Dashboard Widgets:**
- Onboarding Funnel
- MRR Chart
- Support Queue Summary
- SLA Performance
- Company Growth Chart
- Trial Expiry Calendar
- Churn Risk Signals

---

### 7. Notifications

| Event | Title | Body | Priority | Channels |
|-------|-------|------|----------|---------|
| New company signed up | 🏢 New Signup | {company} has signed up for a {plan} trial. | Normal | Push + In-App |
| Onboarding stalled | ⏸ Onboarding Stuck | {company} has been on Step {N} for {X} days. | High | Push + In-App |
| Support ticket opened | 🎫 New Ticket | {company} opened ticket: "{subject}" | Normal | Push + In-App |
| SLA breach imminent | ⏰ SLA Warning | Ticket #{N} will breach SLA in {X} hours. | High | Push + SMS |
| Payment overdue | 💳 Payment Overdue | {company} invoice is {N} days overdue ({amount}). | High | Push + Email |
| Trial expiring | ⏳ Trial Expiring | {company}'s trial expires in {N} days. | Normal | In-App + Email |
| Company suspended | ⛔ Suspended | {company} has been suspended. | High | Push + In-App |
| Platform health degraded | ⚠️ Health Alert | Platform health score dropped to {N}%. | Critical | Push + SMS |

---

---

## Role 03 — Group CEO

**Scope Level:** 7 — Group (all companies within their ownership group)
**Description:** Executive owner of a company group. Sees consolidated metrics across all companies they own. Cannot see other groups. Final approval authority across all group companies.

---

### 1. Navigation

| Tab | Icon | Name | Primary Content |
|-----|------|------|----------------|
| 1 | ◎ | Command | Group-level dashboard, consolidated KPIs |
| 2 | 🏢 | Group | All companies in group, per-company drill-down |
| 3 | 📊 | Intelligence | Group analytics, comparative reports, forecasts |
| 4 | ✅ | Approvals | Cross-company approval inbox |
| 5 | 💬 | Messages | Cross-company messaging |

**Tab 1 — Command:** Group KPI cockpit, consolidated revenue, AI insights
**Tab 2 — Group:** Company list → each company's CEO-level dashboard (read + approve)
**Tab 3 — Intelligence:** Group P&L, headcount chart, cross-company comparisons, AI forecasts
**Tab 4 — Approvals:** All pending approvals across all companies (escalated to group level)
**Tab 5 — Messages:** Cross-company communication channels, direct messages with all company CEOs

---

### 2. Dashboard

**Header Zone:** {Group Name} · Group CEO · Consolidated View · Date

**KPI Zone (Group-Consolidated):**
- Total Group Revenue (current month vs prior month)
- Total Group Revenue YTD
- Active Renovation Projects (across all companies)
- Total Workforce (across all companies)
- Group Net Profit Margin
- Critical Alerts (across all companies)

**Primary Zone:**
- Revenue by Company (horizontal bar chart, current month)
- Group Revenue Trend (12-month line chart, stacked by company)

**Secondary Zone:**
- Workforce Summary by Company (headcount table with status breakdown)
- Project Pipeline by Company (active / at-risk / completed)

**Activity Zone:**
- Cross-company Approval Queue (top 5 pending)
- Group-level Alert Feed

**AI Zone:**
- Group AI Insights (anomalies, underperformance signals, consolidation opportunities)
- Forecast: Group Revenue next quarter
- Best-performing company of the week

**Quick Actions Zone:**
- Open Approval Inbox
- View Group P&L
- Message Company CEOs
- Create Group Announcement

---

### 3. Screens

**Command Tab:**
- Group Dashboard (main)
  - Group KPI Detail → Drill-down by company

**Group Tab:**
- Company List (all companies in group)
  - Company Summary Card → Company Detail (CEO-level view)
    - Company Dashboard
    - Company Revenue
    - Company Workforce
    - Company Active Projects
    - Company Alerts
    - Company Analytics
    - Company Approvals (escalated to group)
  - Comparative Report (side-by-side company metrics)

**Intelligence Tab:**
- Group P&L Statement
  - Month / Quarter / Year selector
  - Per-company breakdown
  - Export to PDF / CSV
- Headcount Analytics
  - Total workforce trend
  - Per-company breakdown
  - Department distribution (aggregate)
- Project Pipeline Report
  - All renovation projects across all companies
  - Value at risk chart
- Custom Report Builder
  - Metric selector (group-level)
  - Dimension selector (by company, by period)
  - Output: chart / table / export

**Approvals Tab:**
- Approval Inbox
  - Filter: company / module / priority
  - Approval Detail
    - Context summary
    - Approval chain visualization
    - Comment field
  - Bulk Approve / Bulk Reject
- Approval History (completed)
- Delegated Approvals (temporary delegation to company CEO)

**Messages Tab:**
- Cross-company Channels List
  - Channel → Message Thread
- Direct Messages with Company CEOs
- Group Announcements (sent / received)
- Message Search

---

### 4. Bottom Sheets

| Bottom Sheet | Trigger | Content | Actions |
|-------------|---------|---------|---------|
| Company Deep Dive | Company card tap | Revenue, headcount, projects, alerts summary | Open Full Company View / Message CEO |
| Approval Action | Approval inbox item | Full context, approval chain, comment | Approve / Reject / Delegate / Request Info |
| Delegate Approval | Approval action sheet | Delegate selector (company CEOs), duration, scope | Delegate |
| Group Announcement Compose | Quick action | Title, body, target companies (checkboxes), priority | Send / Schedule |
| Group P&L Drill-Down | Revenue KPI tap | Month selector, per-company breakdown, YoY comparison | Export / Close |
| AI Insight Detail | AI zone card tap | Full insight text, supporting data, recommended action | Act on Insight / Dismiss / Share |
| Cross-company Comparison | Intelligence tab | Metric selector, time range, company selector | Compare / Export |
| Direct Message to CEO | Company card action | Message composer, company CEO name | Send |

---

### 5. Dynamic Island

**Idle State:** {Group Name} · {N} Companies · Revenue: {MTD}

**Alert State:** 🚨 {N} Critical Alerts across group · Tap to review

**Approval Pending:** ✅ {N} pending approvals · Tap to review

**Expanded State:**
- Total group revenue (MTD) vs target
- Top performing company today
- Pending approval count with oldest item age
- Critical alert count
- Quick: Open Approvals / Open Alerts

---

### 6. Widgets

**Lock Screen:** Group Revenue MTD · Alert count

**Home Screen:**
- Group Revenue MTD vs target
- Company performance traffic lights
- Pending approval count
- Top AI insight of the day

**Dashboard Widgets:**
- Group Revenue by Company (bar chart)
- Group Revenue Trend (line)
- Headcount by Company
- Project Pipeline Value
- Approval Inbox Count
- Group Net Profit
- AI Insight Feed
- Cross-company Alert Summary

---

### 7. Notifications

| Event | Title | Body | Priority | Channels |
|-------|-------|------|----------|---------|
| Approval escalated to group | ✅ Approval Required | {company}: {entity} requires your approval. | High | Push + In-App |
| Company revenue drop > 20% | 📉 Revenue Alert | {company} revenue dropped {N}% vs last month. | Critical | Push + SMS |
| Critical project at risk | 🚨 Project at Risk | {company}: Project "{name}" is critically delayed. | High | Push + In-App |
| New group AI insight | 🤖 AI Insight | New group insight: {title} | Normal | In-App |
| CEO message received | 💬 Message | {CEO name} at {company}: {preview} | Normal | Push + In-App |
| Group revenue milestone | 🎯 Milestone | Group revenue reached {amount} this month. | Normal | In-App |
| Company critical alert | 🚨 Company Alert | {company}: {alert description} | Critical | Push + SMS |
| Payroll approval needed | 💰 Payroll | {company} payroll run requires group sign-off. | High | Push + Email |

---

---

## Role 04 — CEO / Company Owner

**Scope Level:** 6 — Company (all data within their company)
**Description:** Company chief executive. Full access to all company data. Primary user of the 60-second rule dashboard. Final approval authority within their company.

---

### 1. Navigation

| Tab | Icon | Name | Primary Content |
|-----|------|------|----------------|
| 1 | ◎ | Command | CEO dashboard, company KPIs, AI cockpit |
| 2 | ⊞ | Operations | Projects, renovation pipeline, orders, tasks |
| 3 | 👥 | People | Workforce, attendance, payroll, org chart |
| 4 | ₪ | Finance | Revenue, invoices, payments, budgets |
| 5 | ✦ | Intelligence | Analytics, reports, AI, forecasts |

**Tab 1 — Command:** The 60-second rule hub. All critical metrics in one view.
**Tab 2 — Operations:** All active projects and renovation projects, orders pipeline, task board.
**Tab 3 — People:** Full HR view — org chart, active employees, leave calendar, payroll runs.
**Tab 4 — Finance:** P&L overview, AR/AP, all invoices, payments, budgets.
**Tab 5 — Intelligence:** Advanced analytics, custom reports, AI insights, forecasts.

---

### 2. Dashboard (The 60-Second Rule Dashboard)

**Header Zone:** {Company Name} · CEO · {Today's date} · Last sync: {time}

**KPI Zone (must be visible within 60 seconds):**
- Revenue MTD (vs target, vs prior month)
- Revenue YTD
- Active Renovation Projects (count + value at risk)
- Workforce On Site (today)
- Cash Position (bank balance approximation)
- Outstanding AR (total + overdue)
- Critical Alerts (count, red badge)

**Primary Zone:**
- Revenue Trend Chart (last 12 months, line)
- Project Pipeline (Kanban-style: Inquiry → Estimation → Contracted → In Progress → Completed)

**Secondary Zone:**
- Top 5 Active Renovation Projects (with % completion and deadline)
- Approval Inbox (pending: count + oldest)

**Activity Zone:**
- Recent Transactions (last 5 invoices issued / payments received)
- Recent HR Events (new hires, departures, leave)
- AI Alert Feed

**AI Zone:**
- AI Insight of the Day (top recommendation)
- Revenue Forecast (next 30 days)
- Risk Signals (overdue projects, at-risk staff, budget overruns)

**Quick Actions Zone:**
- New Renovation Project
- Approve Pending Items
- View P&L
- Send Team Announcement
- Generate AI Report

---

### 3. Screens

**Command Tab:**
- CEO Dashboard (main)
  - KPI Detail Drill-Down → Monthly / Quarterly / Yearly
  - Approval Center
    - Approval List (all pending)
    - Approval Detail → Approve / Reject / Delegate / Comment
  - Alert Center
    - Alert List → Alert Detail → Resolve / Acknowledge

**Operations Tab:**
- Renovation Projects List
  - Project Detail
    - Overview (status, value, timeline)
    - Phases (progress per phase)
    - Team (PM, supervisor, workers)
    - Site Reports (recent)
    - Documents (contracts, estimates)
    - Financials (estimated vs actual)
    - Approval History
    - AI Project Summary
  - Create New Project → Assignment to PM
- Project Management (internal projects)
  - Project List → Project Detail
- Orders Pipeline
  - Order List → Order Detail
  - Revenue by Order Type

**People Tab:**
- Org Chart (visual hierarchy)
- Employee List
  - Employee Detail
    - Profile
    - Contract
    - Attendance Summary
    - Payroll History
    - Performance Reviews
    - Leave History
- Payroll Runs
  - Run List → Run Detail → Approve
- Leave Calendar (company-wide)
- Workforce Analytics
  - Headcount by Department
  - Attendance Rate
  - Turnover Rate

**Finance Tab:**
- P&L Statement
  - Month / Quarter / Year
  - Revenue by stream
  - Expense breakdown
- Accounts Receivable
  - Outstanding Invoices List
  - Aged AR Report
  - Overdue Collections
- Accounts Payable
  - Supplier Invoices Pending
  - Payment Schedule
- Budget Overview
  - Budget vs Actual by Department
- Cash Flow
  - 30 / 60 / 90-day forecast
- Tax Dashboard
  - VAT periods
  - e-Factura status

**Intelligence Tab:**
- Company Analytics Hub
  - Revenue Analytics
  - Workforce Analytics
  - Project Analytics
  - Shop Analytics
  - Customer Analytics
- Custom Report Builder
  - Metric / Dimension / Period / Chart type
  - Save / Schedule / Export
- AI Insights Library
  - All generated insights
  - Filter by module / severity
  - Trend analysis
- Forecasting
  - Revenue Forecast
  - Project Value Forecast
  - Workforce Forecast

---

### 4. Bottom Sheets

| Bottom Sheet | Trigger | Content | Actions |
|-------------|---------|---------|---------|
| Quick Approve | Approval badge tap | Entity summary, chain status, comment field | Approve / Reject / View Full |
| Project Status Overview | Project card tap | % complete, timeline, team, last site report | Open Project / Mark Milestone |
| Revenue Drill-Down | Revenue KPI tap | By source: renovation / shop / services; vs target | Expand / Export |
| New Project Kickoff | Quick action | Title, client, type, PM assignment, rough value | Create / Assign |
| Employee Quick View | Org chart node tap | Name, role, department, contact, leave status | Message / View Full Profile |
| Payroll Approval | Payroll zone tap | Run summary, total amount, employee count | Approve Run / Review Detail |
| AI Insight Expand | AI zone tap | Full insight, supporting data, confidence, source | Accept Recommendation / Dismiss / Share |
| Alert Detail | Alert feed tap | Alert type, severity, description, affected entity | Resolve / Assign to Manager / Escalate |
| P&L Quick View | Finance tab shortcut | Revenue / Expenses / Net for current month | Full P&L / Export |
| Delegate Approval | Approval action | Delegate selector (managers), scope, duration | Delegate |
| Send Announcement | Quick action | All-company or department selector, message | Send / Schedule |

---

### 5. Dynamic Island

**Idle State:** {Company} · Revenue MTD: {amount}

**Active Approval:** ✅ {N} approvals waiting · Oldest: {X}h ago

**Critical Alert:** 🚨 Critical: {alert_title} · Tap to act

**Active Project Milestone:** 🏗️ "{Project}" · Phase {N} due today

**Expanded State (long press):**
- Revenue MTD vs target (progress bar)
- Active renovation projects count
- Critical alerts (count + first title)
- Pending approvals count
- Quick: Open Approvals / Open Alerts / P&L

---

### 6. Widgets

**Lock Screen:** Revenue MTD · Pending approvals count

**Home Screen:**
- Revenue MTD vs target
- Active projects count
- Workforce on site today
- Top AI insight
- Pending approval count

**Dashboard Widgets (all available):**
- Revenue KPI Card
- Revenue Trend Chart
- Project Pipeline Kanban
- AR Aging Chart
- Headcount Summary
- Approval Inbox
- AI Insight Feed
- Cash Position
- Payroll Calendar
- Alert Summary
- Budget vs Actual
- Leave Calendar Overview
- Top Clients by Revenue
- Outstanding Invoices
- Project Completion Rate
- Renovation Pipeline Value

---

### 7. Notifications

| Event | Title | Body | Priority | Channels |
|-------|-------|------|----------|---------|
| Approval request submitted | ✅ Approval Needed | {entity} submitted by {name} requires your approval. | High | Push + In-App |
| Invoice paid | 💳 Payment Received | {client} paid {amount} on invoice #{number}. | Normal | Push + In-App |
| Project milestone reached | 🏗️ Milestone Complete | "{project}" completed Phase {N}. | Normal | In-App |
| Project critically delayed | 🚨 Project at Risk | "{project}" is {N} days overdue. Immediate action needed. | Critical | Push + SMS |
| Payroll run ready | 💰 Payroll Ready | {month} payroll run is ready for approval. Total: {amount} | High | Push + Email |
| Revenue target reached | 🎯 Target Hit | Monthly revenue target reached: {amount}. | Normal | In-App |
| Employee contract expiring | ⚠️ Contract Expiry | {name}'s contract expires in {N} days. | High | Push + In-App |
| Budget overrun | 📊 Budget Alert | {department} budget exceeded by {N}%. | High | Push + In-App |
| New client inquiry | 📥 New Inquiry | New renovation inquiry from {client_name}. | Normal | Push + In-App |
| Critical security event | 🔐 Security Alert | Unusual access detected at {time}. | Critical | Push + SMS |
| Daily summary | 📋 Daily Summary | Revenue: {amount} · Projects: {N} active · Alerts: {N} | Low | In-App |
| AR overdue threshold | ⚠️ Overdue AR | {N} invoices totaling {amount} are overdue 30+ days. | High | Push + Email |

---

---

## Role 05 — Co-CEO

**Scope Level:** 6 — Company (configured module restrictions apply)
**Description:** Company co-executive with same scope level as CEO but with explicit module-level access restrictions configured per company. Typically handles a defined subset of company operations.

---

### 1. Navigation

*The Co-CEO's tab bar is identical to the CEO's by default but configured per company. The most common configuration restricts Finance visibility and limits People to attendance only (HR sensitive data excluded). Navigation labels may be relabelled per company configuration.*

| Tab | Icon | Name | Primary Content |
|-----|------|------|----------------|
| 1 | ◎ | Command | Operations-focused dashboard (finance KPIs hidden if restricted) |
| 2 | ⊞ | Operations | Same as CEO — renovation, projects, orders |
| 3 | 👥 | People | Workforce, attendance, schedule (payroll hidden if restricted) |
| 4 | ₪ | Finance | Visible only if company configuration grants Finance access |
| 5 | ✦ | Intelligence | Analytics scoped to permitted modules only |

**Configuration-Driven Differences from CEO:**
- Finance tab may be hidden or read-only
- Payroll detail may be restricted (sees totals, not individual salaries)
- Sensitive HR fields (salary, performance ratings) may be hidden
- Approval authority may be limited to specific modules
- Certain quick actions may be absent

---

### 2. Dashboard

**Header Zone:** {Company Name} · Co-CEO · {Date} · Scope: Configured

**KPI Zone (configuration-dependent):**
- Revenue MTD (shown if Finance access granted)
- Active Renovation Projects ✓
- Workforce On Site Today ✓
- Outstanding AR (shown if Finance access granted)
- Critical Alerts ✓
- Project At-Risk Count ✓

**Primary Zone:**
- Project Pipeline (same as CEO)
- Operations Activity Feed

**Secondary Zone:**
- Team Attendance Overview
- Active Project Status Cards

**Activity Zone:**
- Recent project events
- Team schedule for today

**AI Zone:**
- Operations AI Insights (restricted to permitted modules)
- Project risk signals

**Quick Actions Zone:**
- New Project
- Review Approvals
- Team Schedule
- Message Team

---

### 3. Screens

*All screens from CEO Role 04 are available except those explicitly restricted by company configuration.*

**Restricted by default (unless explicitly granted):**
- Payroll Run Detail (individual salary breakdown)
- HR sensitive fields (salary bands, disciplinary records)
- Finance > P&L Statement (full)
- Finance > Cash Position
- Intelligence > Financial Forecasting

**Always Available:**
- All Operations screens
- People screens (attendance, schedule, org chart, basic profiles)
- Analytics scoped to projects and renovation

---

### 4. Bottom Sheets

*Identical to CEO with the following exceptions:*

- Payroll Approval bottom sheet: hidden or shows totals-only version
- P&L Quick View: hidden if Finance restricted
- Budget Approve: may be read-only

---

### 5. Dynamic Island

**Idle State:** {Company} · Co-CEO · {N} active projects

**Alert State:** 🚨 {N} Critical Alerts · Tap to review

**Approval Pending:** ✅ {N} Approvals Waiting

**Expanded State:** Active project count / Alert count / Pending approvals / Quick: Go to Operations

---

### 6. Widgets

*Identical to CEO minus any Finance-restricted widget types.*

**Always Available:**
- Project Pipeline Widget
- Workforce Summary Widget
- Approval Inbox Widget
- AI Insight Feed Widget (ops-scoped)

**Configuration-Dependent:**
- Revenue KPI Card
- AR Aging Chart
- Budget vs Actual

---

### 7. Notifications

*Identical to CEO notification types except:*

| Restricted Notifications (if Finance access denied) |
|-----------------------------------------------------|
| Invoice paid (not received) |
| Payroll run ready (not sent) |
| AR overdue threshold (not sent) |
| Budget overrun (not sent) |

*All Operations, Projects, Renovation, People, and Security notifications are identical to CEO.*

---

*End of Part 1 — Continues in UI_SITEMAP_PART2.md*

*Part 2 covers: Regional Manager · Store Manager · Shop Director · Department Head · HR Manager · Finance Manager*
