# PRV IMPLEMENTATION ROADMAP — PART 2
# Phases 13–25 + Strategic Deliverables

**Document**: Implementation Roadmap Part 2 of 2
**Status**: Blueprint — Approved Architecture
**Continues from**: IMPLEMENTATION_ROADMAP_PART1.md (Phases 0–12)

---

## PHASES 13–25

---

### PHASE 13: COMMUNICATION CENTER
**Duration**: 5 weeks
**Cumulative Week**: 80

### Goals
Build the real-time communication layer. Direct messages, channels, mentions, announcements, and voice notes — all scoped and role-aware.

### Deliverables

#### 13.1 — Direct Messages
```
Features:
  - 1:1 encrypted direct messages between company members
  - Message status: sent / delivered / read (per recipient)
  - Rich content: bold, italic, code, @mentions, hyperlinks
  - File attachments: images, documents (linked to Document Center)
  - Voice notes: record and send (mobile)
  - Message reactions (emoji shorthand)
  - Reply threads: nested replies without leaving the conversation
  - Full-text search: Typesense indexes all message content
  - Edit/delete with audit trail (deleted messages tombstoned, not removed)
  - Message pinning
  - Typing indicators (Supabase Realtime)
  - Online / away / offline presence indicators
  - Message scheduling (send at a specific future time)
  - Unread count badges

Security:
  - Company isolation: users can only DM within their company
  - Message content encrypted at rest (AES-256)
  - Audit log: every message sent, edited, deleted
```

#### 13.2 — Channels
```
Channel types:
  - Company-wide (broadcast — CEO and HR post only, all can read)
  - Department channels (auto-visibility by department assignment)
  - Project channels (auto-created when project is created)
  - Store channels (auto-created per store)
  - Custom channels (created by CEO / Admins)

Channel features:
  - Member roles: Owner / Admin / Member / Read-only
  - Channel discovery (public channels searchable within company)
  - Notification settings per channel: All Messages / Mentions only / Muted
  - Pinned messages per channel
  - Member management (add/remove)
  - Channel archive (no delete — compliance)
  - Message history: searchable
```

#### 13.3 — Mentions
```
@mention system:
  - @username: notifies specific user (inbox + push notification)
  - @team: notifies entire team
  - @here: notifies channel members who are currently online
  - @all: notifies all channel members (permission-restricted)

Mention behavior:
  - Mentioned text highlighted in message
  - Notification: in-app badge + push + inbox entry
  - Mention log: user can see all their mentions in one view
  - Role-based @all restriction (only CEO / TL level can use @all)
```

#### 13.4 — Announcements
```
Announcement system:
  - Company-wide announcements (CEO / HR Manager)
  - Targeted announcements (by role / department / store / team)
  - Announcement expiry dates (auto-archive)
  - Read receipts: % of recipients who have read
  - Acknowledgment required: user must tap "Acknowledge" to confirm
  - Scheduled announcements (draft → publish at specific time)
  - Priority levels: Info / Important / Critical
  - Push notification on Critical announcements (always on)
  - Historical archive: all past announcements
```

#### 13.5 — Voice Notes
```
Voice note features:
  - Record in-app (tap and hold to record)
  - Playback with waveform visualization
  - Speed controls: 0.75× / 1× / 1.5× / 2×
  - Auto-transcription (Phase 17 AI will add text transcription)
  - Send in DM or channel
  - Download / share
  - Storage: Supabase Storage, CDN delivery
  - Max duration: configurable (default 5 minutes)
```

#### 13.6 — Communication Rules
```
Company data isolation:
  - Users can only communicate within their company
  - Cross-company messaging: explicitly prohibited (even for CEO across companies)
  - Each company is a completely isolated communication space

Retention and compliance:
  - Message retention: configurable per company (30d / 90d / 1yr / forever)
  - GDPR: right to erasure implemented as message tombstoning
  - DLP: attachment scanning (file type restrictions)
  - Admin moderation: HR/Sysadmin can flag or remove messages
  - Export: company communication export for legal/compliance requests
```

### Phase 13 Exit Criteria
```
□ DM: send, receive, read receipt, edit, delete (with audit)
□ Channel: create, join, post, search
□ @mentions: notification delivered (in-app + push)
□ Announcements: send, read receipt tracking, acknowledgment
□ Voice notes: record on iOS device, playback with waveform
□ Company isolation: verified — user cannot see other company messages
□ Real-time: typing indicator, message appears without refresh
□ Search: find message by content within <100ms
```

---

### PHASE 14: NOTIFICATION CENTER
**Duration**: 4 weeks
**Cumulative Week**: 84

### Goals
Build the universal notification ecosystem — the delivery spine for all PRV events, routing to every channel with user-configurable preferences.

### Deliverables

#### 14.1 — Notification Engine (Core)
```
Event bus architecture:
  - Every module emits NotificationEvent to the central bus
  - Inngest processes all events asynchronously
  - Fan-out: event → determine recipients → determine channels → deliver

NotificationEvent schema:
  {
    id:         string,
    type:       string,         // 'task.assigned', 'invoice.overdue', etc.
    category:   string,         // 'operational', 'financial', 'alert', etc.
    priority:   'critical' | 'high' | 'normal' | 'low',
    source:     {
      module:     ModuleId,
      entityType: string,
      entityId:   string,
      action:     string
    },
    recipients: [
      { userId?: string; roleId?: string; companyId?: string; storeId?: string }
    ],
    content:    { title: string; body: string; deepLink?: string; imageUrl?: string },
    delivery:   { channels: DeliveryChannel[]; scheduledAt?: Date; expiresAt?: Date },
    groupKey?:  string,         // for notification grouping
    dedupeKey?: string,         // prevent duplicate delivery
    createdAt:  Date
  }
```

#### 14.2 — Delivery Channels
```
1. In-App (Supabase Realtime — instant)
   → Notification bell badge increments
   → Notification appears in Universal Inbox (Phase 5)

2. Push Notification
   → iOS: APNs (Apple Push Notification Service)
   → Android: FCM (Firebase Cloud Messaging)
   → Delivery: < 5 seconds

3. Email (Resend)
   → Transactional: immediate for critical
   → Digest: daily summary for normal/low priority
   → Template: PRV-branded, responsive HTML

4. SMS (critical alerts only)
   → Provider: Twilio
   → Used for: L3+ emergency alerts, account security events

5. Dynamic Island (iOS)
   → Live context update
   → Role-specific information (see Phase 4 spec)

6. Lock Screen Live Activity (iOS)
   → Real-time updates while phone locked
   → Active clock-in timer, project milestone countdown

7. Slack (enterprise integration — optional)
   → Webhook to configured Slack workspace

8. Webhook (enterprise API tier)
   → Outbound HTTP POST to customer-configured endpoint
```

#### 14.3 — Notification Preferences
```
User-configurable preferences (per notification type):
  - In-App:   On / Off
  - Push:     On / Off
  - Email:    Immediate / Daily Digest / Off
  - SMS:      On / Off (Critical alerts only)

Global controls:
  - Quiet Hours: From → To (no push during these hours)
  - Do Not Disturb: manual toggle (overrides all except Critical)
  - Per-module overrides: e.g., turn off all Project notifications

Company-level controls:
  - Admin can set defaults for new users
  - Admin can enforce minimum notification settings (e.g., Critical always on)

Delivery guarantees:
  - Critical priority: always delivered regardless of DND setting
  - Normal/Low: respects Quiet Hours and DND
  - Delivery retry: 3 attempts with exponential backoff
```

#### 14.4 — Digest System
```
Daily digest (for low/normal priority notifications):
  - Delivered at user-configured time (default: 09:00 local timezone)
  - Groups notifications by module
  - Summary: "3 tasks completed, 2 new comments, 1 leave approved"
  - Deep links to each notification item
  - Skip day: if no notifications, no email sent
  - Unsubscribe: per-category digest opt-out
```

#### 14.5 — Critical Alerts
```
Critical alert system:
  - Bypass all user preferences (except explicit account-level block)
  - Multi-channel: in-app + push + email + SMS simultaneously
  - Visual: persistent red banner in app (does not auto-dismiss)
  - Sound: distinct alert tone (iOS critical alert entitlement)
  - Requires acknowledgment: user must dismiss explicitly
  - Escalation: if not acknowledged in X minutes → escalate to supervisor

What triggers critical alerts:
  - Security: account lockout, suspicious login, breach detection
  - Financial: payment failure, cash below threshold, fraud flag
  - Safety: emergency incident, hazard report
  - Operations: system outage, critical project milestone missed
  - Command Center: L3+ emergency level activated
```

#### 14.6 — Escalation Rules
```
Escalation: if notification not actioned within SLA:
  SLA by priority:
    Critical:  No action in 15 min → escalate to next level
    High:      No action in 4h   → escalate to manager
    Normal:    No action in 24h  → send reminder
    Low:       No action in 72h  → archive silently

Escalation path:
  Employee → Team Leader → OMS → Ops Manager → CEO

Escalation log: every escalation event recorded in audit trail
```

### Phase 14 Exit Criteria
```
□ All 6 delivery channels working (in-app, push, email, SMS, Dynamic Island, Live Activity)
□ User preference center: save + apply preferences
□ Quiet Hours: push suppressed during configured hours
□ Critical alerts: bypass DND, delivered via all channels
□ Daily digest: groups + sends at configured time
□ Escalation: fires correctly after SLA expiry
□ Deduplication: same event not delivered twice
□ Role filtering: Worker only receives notifications for their scope
```

---

### PHASE 15: ANALYTICS PLATFORM
**Duration**: 7 weeks
**Cumulative Week**: 91

### Goals
Build the complete business intelligence layer — real-time KPIs, historical analysis, cross-module reporting, and forecasting. Analytics must be complete before the Command Center (Phase 16) and AI Platform (Phase 17) can be built on top.

### Deliverables

#### 15.1 — Analytics Data Pipeline
```
Architecture:
  - Every module action emits an analytics event (structured)
  - Inngest: batch processing, materialized view refresh, aggregations
  - Materialized views: pre-computed KPIs (refreshed every 5 minutes)
  - Daily snapshots: point-in-time data captured at 00:00 UTC
  - Cross-company aggregation: CEO-level rolled-up metrics
  - Data retention: 3 months hot (PostgreSQL), 1 year warm, archive S3

Analytics event schema:
  {
    event_id:    uuid,
    event_type:  string,     // 'project.created', 'invoice.paid', etc.
    actor_id:    uuid,
    company_id:  uuid,
    module:      ModuleId,
    entity_type: string,
    entity_id:   uuid,
    properties:  jsonb,
    timestamp:   timestamptz
  }

Partitioning:
  - analytics_events table partitioned by month
  - Old partitions archived to cold storage automatically
```

#### 15.2 — KPI Framework (6 Domains)
```
Domain 1 — Revenue
  Total Revenue (daily / weekly / monthly / YTD)
  Revenue by Company / Store / Product / Service
  Revenue Growth Rate (MoM, YoY)
  Average Order Value (AOV)
  Revenue per Employee

Domain 2 — Operations
  Active Projects (count + total portfolio value)
  Project Completion Rate
  On-Time Delivery Rate
  Task Completion Rate
  Average Project Duration

Domain 3 — Workforce
  Attendance Rate
  Absenteeism Rate (by department / role)
  Overtime Hours (total + per employee)
  Turnover Rate (annualized)
  Headcount Growth

Domain 4 — Financial
  Gross Profit / Net Profit
  Operating Expenses
  Cash Position (current)
  Burn Rate (monthly)
  Accounts Receivable Days (DSO)
  Accounts Payable Days (DPO)

Domain 5 — Customer (CRM)
  New Leads (weekly / monthly)
  Lead Conversion Rate
  Customer Lifetime Value (CLV)
  Pipeline Value (total + by stage)
  Win Rate

Domain 6 — Shop
  Units Sold
  Inventory Turnover Rate
  Stockout Rate
  Return Rate
  Average Basket Size
```

#### 15.3 — Dashboards
```
Dashboard types:
  Pre-built: 12 role-specific dashboards (one per major role group)
  Custom: drag-and-drop widget builder

Pre-built dashboards:
  CEO Executive:       Revenue + Headcount + Projects + Cash + Alerts
  Finance Director:    P&L + Cash Flow + AR/AP + Budget vs. Actual
  HR Manager:          Attendance + Leave + Turnover + Compliance
  Project Director:    Portfolio health + Budget + Timeline + Resources
  Store Manager:       Sales + Inventory + Staff + Orders
  Shop Director:       Multi-store comparison + Inventory + Revenue
  Operations Manager:  Workforce + Attendance + Projects + Incidents
  Data Analyst:        Full analytics access, all modules, all KPIs

Custom dashboard:
  - Add any KPI widget from any module
  - Resize and reorder widgets
  - Save multiple dashboards per user
  - Share dashboard with team or role
  - Set default dashboard
```

#### 15.4 — Reports
```
Report builder:
  - Drag-and-drop interface
  - 15+ chart types:
    Line, Bar, Stacked Bar, Area, Pie, Donut, Scatter,
    Heatmap, Funnel, Gauge, Table, Pivot, Waterfall, Sankey, Treemap
  - Dimension picker: any entity attribute as X-axis
  - Metric picker: any KPI or calculated field as Y-axis
  - Date range: Today / 7d / 30d / Quarter / Year / Custom / Comparison
  - Comparison mode: this period vs. previous period
  - Filter builder: any dimension, any value
  - Calculated fields: formula editor (sum, avg, ratio, %)
  - Report templates: 50+ pre-built (one per use case per module)
  - Save / schedule / share reports
  - Export: PDF, Excel, CSV

Scheduled reports:
  - Set frequency: daily / weekly / monthly
  - Recipients: list of users
  - Delivery: email (Resend) with PDF attachment
```

#### 15.5 — Forecasting
```
Forecasting engine (rule-based at this phase — AI-enhanced in Phase 17):
  - Revenue forecast: weighted pipeline + historical seasonality
  - Expense forecast: budget + run rate projection
  - Cash flow forecast: 30 / 60 / 90 days
  - Inventory demand forecast: based on historical sales velocity
  - Headcount forecast: based on project pipeline + attrition rate
  - Confidence interval displayed on all forecasts
  - "What if" scenarios: adjust one variable, see projected impact
```

#### 15.6 — Business Intelligence (Cross-Module)
```
Cross-module BI views:
  - Project profitability: project revenue (Finance) vs. project costs (Projects)
  - Employee ROI: payroll cost (HR) vs. tasks completed + projects delivered
  - Marketing ROI: lead source cost vs. won deal value (CRM)
  - Inventory efficiency: procurement cost (Finance) vs. turnover (Shop)
  - Safety cost: incidents (Safety) vs. productivity impact (Attendance)

Executive Intelligence Board (CEO):
  - Company Health Score: composite index (0–100) across all 6 domains
  - Revenue Trend (live sparkline, last 30 days)
  - Anomaly Feed: unusual patterns (threshold-based at this phase, AI-powered in Phase 17)
  - Period Comparison: this week vs. last week, this month vs. last month
```

### Phase 15 Exit Criteria
```
□ Analytics pipeline: events from all built modules flowing and aggregating
□ KPIs: all 6 domains calculating correctly with test data
□ Pre-built dashboards: all 8 rendering with correct data
□ Report builder: create and export a custom report
□ Scheduled reports: email delivery working
□ Forecasting: 90-day cash flow forecast rendering
□ Cross-module BI: project profitability view accurate
□ Role filtering: all analytics respect company and role scope
□ Performance: KPI dashboard loads in <2 seconds
```

---

### PHASE 16: COMMAND CENTER
**Duration**: 4 weeks
**Cumulative Week**: 95

### Goals
Build the global operational command layer — unified real-time status across all companies, all modules, all critical systems. Built on top of Analytics (Phase 15). CEO and Sysadmin primary experience.

### Deliverables

#### 16.1 — Executive Cockpit
```
Primary view for CEO and Co-CEO:

Cockpit panels (real-time, always live):
  1. Company Health      — Health score per company (0–100) + trend
  2. Revenue Pulse       — Today's revenue vs. yesterday + weekly trend
  3. Operations Live     — Active projects, on-site workers, open tasks
  4. Financial Snapshot  — Cash position + overdue invoices + payables due
  5. Workforce Status    — Who is on-site right now, anomaly count
  6. Alert Triage        — All critical alerts requiring CEO attention (ranked)
  7. Approval Queue      — Pending approvals requiring CEO sign-off
  8. AI Briefing         — AI executive summary (Phase 17 connects this)

Design principle: CEO opens Command Center → knows everything in 60 seconds.
(CEO 60-Second Rule from PRODUCT_VISION.md — enforced here.)

Cockpit behavior:
  - All data is live (Supabase Realtime subscriptions)
  - Click any panel → drill down to source module
  - No data entry in Command Center (read + navigate only)
```

#### 16.2 — Company Health
```
Company Health Score (0–100):
  Composite index across 6 dimensions (equal weight):
    Revenue Health    — vs. target, vs. last period
    Operations Health — project on-time rate, task completion
    Workforce Health  — attendance rate, turnover
    Financial Health  — cash position, profit margin, DSO
    Customer Health   — NPS trend, churn, pipeline coverage
    Safety Health     — incident rate, compliance rate

Score color:
  90–100: Excellent
  70–89:  Good
  50–69:  Attention needed
  < 50:   Critical intervention required

Per-company breakdown:
  - Company A: 84/100 ↑ 3 pts
  - Company B: 71/100 → stable
  - Company C: 58/100 ↓ 6 pts (highlighted in amber)

Drill-down: click any dimension → opens relevant module analytics
```

#### 16.3 — Universal Dashboard
```
Command Center Universal Dashboard:
  - Aggregates all companies in one view (CEO)
  - Switches to single-company view (with company selector)
  - Module status tiles: every module's health indicator
  - Active alerts feed (live, real-time)
  - Recent activity stream: significant events across all modules
  - People on-site map: GPS check-in locations (if enabled)
  - Fleet positions: last known vehicle locations
  - Open approvals: queue sorted by age and priority
```

#### 16.4 — Alerts
```
Alert system:
  - Alert severity: L1 Info / L2 Warning / L3 Critical / L4 Emergency / L5 Crisis

  L1 Info:      Yellow notice. No action required immediately.
  L2 Warning:   Orange alert. Assigned to responsible person. Track to close.
  L3 Critical:  Red alert. Multi-channel notification. Escalation if not actioned.
  L4 Emergency: Full-screen banner. All active users see it. SMS to leadership.
  L5 Crisis:    All-hands broadcast. Board notification. PR response mode.

Alert sources:
  - System monitoring (error rate, database health, API latency)
  - Business rules (revenue drop, cash threshold, attendance cliff)
  - Safety incidents (from Phase 18)
  - Security events (from Phase 2)
  - AI anomaly detection (Phase 17)

Alert management:
  - Acknowledge (removes from queue — someone is handling it)
  - Assign (delegate to specific person)
  - Escalate (move to next level immediately)
  - Resolve (mark closed with resolution note)
  - Alert history: all past alerts with resolution notes
```

#### 16.5 — Insights
```
Command Center Insights panel:
  - Threshold-based insights at this phase (rule-based alerts)
  - Examples:
    "Project Alpha is 12% over budget — review recommended"
    "Attendance dropped 8% this week vs. last week — Store B"
    "Invoice #4421 is 15 days overdue — $12,400"
    "Inventory: Product X at 3% of reorder point — critical"
    "3 employee contracts expiring in 7 days"
  
  Phase 17 (AI Platform) will replace rule-based insights with
  Claude-powered analysis, root cause identification, and recommendations.

Automated triggers (rules engine):
  Revenue drop > 20% vs. yesterday             → L2 Warning
  Project deadline missed                       → L2 Warning
  Attendance < 70% of scheduled                → L2 Warning
  Cash position < configured threshold         → L3 Critical
  Open approval > 48 hours                     → L2 Warning (escalate)
  System error rate > 1%                       → L3 Critical (Sysadmin)
  Safety incident reported                     → L3 Critical
  Multiple login failures (Security Phase 2)   → L3 Critical
```

### Phase 16 Exit Criteria
```
□ Executive Cockpit: all 8 panels rendering with live data
□ CEO 60-Second Rule: CEO can understand company state in ≤60 seconds (user tested)
□ Company Health Score: calculating from all 6 dimensions
□ Alert system: L1–L5 levels, multi-channel delivery, escalation
□ Universal Dashboard: all companies visible to CEO
□ Drill-down: every panel links to source module correctly
□ Sysadmin: system health panel visible (no business data)
□ No data entry: Command Center is read-only
```

---

### PHASE 17: AI PLATFORM
**Duration**: 6 weeks
**Cumulative Week**: 101

### Goals
Build the full intelligence layer — AI assistant, AI search, AI insights, AI forecasts, AI recommendations, and AI reports. Built on top of Analytics (Phase 15) and Command Center (Phase 16).

### Deliverables

#### 17.1 — AI Assistant
```
Architecture:
  Model:      Anthropic Claude API
              claude-sonnet-4-6 (standard queries)
              claude-opus-4-8 (deep analysis, reports)
  SDK:        Vercel AI SDK (streaming responses)
  Context:    RAG (Retrieval Augmented Generation) over company data
              Typesense + pgvector for semantic search over PRV data
  Memory:     Per-user conversation history (Redis — last 50 turns)
  Tools:      Claude function calling to query and act on PRV data

Assistant capabilities:
  Answer:   "What was our revenue last month?"
  Analyze:  "Why did attendance drop this week in Store B?"
  Execute:  "Create a task for [user] — Review Q3 budget"
  Draft:    "Write a performance review for [employee]"
  Forecast: "What's our projected inventory shortfall next month?"
  Report:   "Generate an executive summary of this week's operations"

Access control:
  - AI only sees data the requesting user is authorized to see
  - Company isolation strictly enforced (AI cannot mix company data)
  - PII redacted before sending to Claude API
  - Cost tracking per company (usage dashboard)
```

#### 17.2 — AI Tools (Function Calling)
```typescript
// Claude function tool definitions — AI can call these on user behalf
const AI_TOOLS = {
  query_kpis:            { /* get current KPI values */ },
  query_projects:        { /* fetch project data and status */ },
  query_attendance:      { /* fetch attendance records */ },
  query_financials:      { /* fetch revenue, expenses, cash */ },
  query_inventory:       { /* fetch stock levels */ },
  query_employees:       { /* fetch workforce data */ },
  query_documents:       { /* search Document Center */ },
  get_pending_approvals: { /* list approval requests */ },
  create_task:           { /* create a task (with user confirmation) */ },
  create_notification:   { /* send notification to user/team */ },
  generate_report:       { /* trigger a pre-built report */ },
  search_knowledge_base: { /* search Knowledge Base articles */ },
};

// All write operations (create_task, create_notification) require
// user confirmation before execution (configurable — can auto-approve)
```

#### 17.3 — AI Search
```
Semantic search upgrade (enhances Phase 5 Universal Search):
  - Find by meaning, not just keywords
  - Example: "project that was delayed because of supplier" → finds Project A
  - Vector embeddings stored in pgvector (auto-generated on entity create/update)
  - Hybrid search: keyword (Typesense) + semantic (pgvector) combined
  - AI re-ranking: results re-ranked by AI relevance score
  - Natural language queries: "invoices from last month over $5000"
  - Role and company scope enforced on all semantic results
```

#### 17.4 — AI Insights
```
Proactive insights (replaces rule-based insights from Phase 16):
  - AI continuously analyzes patterns across all module data
  - Generates natural language insights with explanations
  - Anomaly detection: "Attendance at Site B dropped 18% — unusual for Tuesday"
  - Root cause suggestions: "Pattern matches previous weeks when a Team Leader was absent"
  - Trend signals: "Revenue in Store A has declined 3 consecutive weeks"
  - Risk flags: "Project Delta burn rate suggests 40% chance of budget overrun"
  - Opportunity signals: "Product X demand up 35% — consider reorder"

Insight delivery:
  - Command Center insights panel (Phase 16)
  - CEO Daily Briefing (7:00 AM automated email + push)
  - Role-filtered insights (each role sees insights relevant to their scope)
  - Confidence score per insight (threshold: show to user if >70% confidence)
```

#### 17.5 — AI Forecasts
```
AI-enhanced forecasting (replaces rule-based forecasts from Phase 15):
  - Revenue forecast: Claude analyzes seasonal patterns + CRM pipeline + trends
  - Expense forecast: anomaly-adjusted projection with confidence bands
  - Cash flow forecast: 90-day AI-generated model
  - Inventory demand forecast: per-product, per-location, per-week
  - Headcount forecast: based on project pipeline expansion/contraction
  - Risk forecast: probability of project delay, budget overrun, stockout

Forecast features:
  - Confidence interval (50th / 75th / 90th percentile bands)
  - Scenario analysis: "What if revenue drops 15%?"
  - Forecast explanation: AI explains what drives the prediction
  - Accuracy tracking: compare forecast vs. actual (improves over time)
```

#### 17.6 — AI Recommendations
```
Personalized recommendations (role-based):
  CEO:             "Approve pending items to unblock 2 projects worth $180K"
  Project Manager: "Reassign Task X — current assignee is at 140% capacity"
  HR Manager:      "3 employees have high attrition risk based on engagement signals"
  Store Manager:   "Reorder Product A — 5 days of stock remaining at current pace"
  Finance:         "Invoice #3891 has been pending for 21 days — follow up"

Recommendation engine:
  - Daily recommendations per role (surfaced in Universal Inbox and Dashboard)
  - Priority-ranked (most impactful first)
  - One-click action from recommendation (e.g., "Approve" or "Assign")
  - Dismiss with feedback (thumbs down → improves future recommendations)
```

#### 17.7 — AI Reports
```
AI-generated reports:
  - Executive Weekly Briefing (every Monday 08:00): AI-written narrative summary
  - Monthly P&L Narrative: AI explains the numbers in plain language
  - Project Health Report: AI assessment of all active projects
  - HR Pulse Report: AI summary of workforce metrics and risks
  - Inventory Health Report: AI stockout risk analysis

Report generation:
  - Triggered: scheduled (cron) or on-demand ("Generate a report for me")
  - Format: AI text summary + charts from Analytics Platform
  - Delivery: in-app + email (Resend)
  - Storage: Document Center (auto-saved)
  - All reports include: data citations + AI confidence level
```

#### 17.8 — AI Governance
```
Controls:
  - AI action audit log: every AI query, every action taken, every tool call
  - Human-in-the-loop: write operations require explicit user confirmation
    (configurable: can be set to auto-approve for specific action types)
  - Confidence threshold: actions below 80% confidence require review
  - Explanation: every AI recommendation includes reasoning
  - Feedback loop: thumbs up/down on outputs → used to improve prompts
  - Company data isolation: strictly enforced — AI cannot access other company data
  - PII redaction: auto-strip PII before API calls
  - Cost tracking: per-company usage (tokens in/out) + cost dashboard
  - Data classification: documents labeled as AI-processable or AI-excluded
```

### Phase 17 Exit Criteria
```
□ AI Assistant: answers business questions with correct company-scoped data
□ AI Tools: all listed tools callable, write tools require confirmation
□ AI Search: semantic results more relevant than keyword-only
□ AI Insights: proactive insights appearing in Command Center
□ CEO Daily Briefing: automated, delivers at 07:00
□ AI Forecasts: 90-day cash flow forecast with confidence bands
□ AI Recommendations: role-specific, actionable, one-click execute
□ Governance: all AI actions audited; cross-company data verified impossible
□ Cost tracking: per-company AI usage dashboard showing token costs
```

---

### PHASE 18: SAFETY MODULE
**Duration**: 4 weeks
**Cumulative Week**: 105

### Goals
Build the workplace safety management system — incident reporting, safety checklists, compliance tracking, and safety analytics.

### Deliverables

#### 18.1 — Incidents
```
Incident types:
  Near Miss / Minor Injury / Major Injury / Dangerous Occurrence /
  Property Damage / Environmental Incident / Security Incident

Incident report schema:
  id, company_id, title, type, severity,
  date_occurred, time_occurred, location,
  reported_by_id, persons_involved (array),
  witness_names (array),
  description, immediate_actions_taken,
  root_cause_analysis (5 Whys structured form),
  contributing_factors (multi-select),
  corrective_actions (linked tasks in Projects module),
  evidence_attachments (Document Center links),
  status (Reported / Under Investigation / Closed),
  regulatory_reporting_required (boolean),
  insurance_notification_required (boolean),
  photos (Supabase Storage),
  investigated_by_id, closed_by_id,
  created_at, updated_at

Incident workflow:
  Report → Assign Investigator → Investigation → Root Cause → Corrective Actions → Close
```

#### 18.2 — Safety Checklists
```
Checklist builder:
  - Create custom checklists per: location / task type / work category
  - Item types: Yes/No / Pass/Fail / Numeric / Photo Evidence / Text
  - Required items (cannot skip)
  - Scoring: calculate compliance % from pass/fail items

Inspection execution (mobile-first):
  - Start inspection → work through checklist
  - Photo capture for each item (required for Fail items)
  - Sign off with digital signature
  - Submit → PDF report auto-generated
  - Failed items → auto-create corrective action tasks

Inspection scheduling:
  - Schedule recurring inspections (daily / weekly / monthly)
  - Assign inspector
  - Alert if inspection overdue
  - Inspection history per location
```

#### 18.3 — Compliance
```
Safety compliance tracking:
  - Mandatory training records (linked to Phase 20 Learning Center)
  - Certification tracking: safety cards, first aid, equipment licenses
  - Expiry alerts: 60 / 30 / 14 / 7 days
  - Permit-to-Work (PTW) system:
    Types: Hot Work / Confined Space / Working at Height / Electrical / Excavation
    Workflow: Request → Risk Assessment → Supervisor Approval → Safety Officer → Active → Close-out
  - Toolbox talk records (pre-shift safety briefings)
  - Safety notice board (company-scoped digital board)
  - Regulatory reporting log (RIDDOR, OSHA equivalent)
```

#### 18.4 — Safety Analytics
```
Safety metrics:
  - TRIR (Total Recordable Incident Rate)
  - LTIR (Lost Time Injury Rate)
  - Near Miss Frequency Rate
  - Incidents by location / type / department / period
  - Days Since Last Incident (per site — prominent display)
  - Open corrective actions (aging report)
  - Inspection compliance rate (% inspections completed on schedule)
  - PTW compliance rate
  - Safety training completion % (from Learning Center)

Safety dashboard (Ops Manager / Safety Officer / CEO):
  - Live: incidents in last 30 days
  - Trend: incident rate month-over-month
  - High-risk locations (by incident density)
  - Overdue corrective actions queue
  - AI Safety Insights (Phase 17): pattern detection, risk prediction
```

### Phase 18 Exit Criteria
```
□ Incident report: submit, investigate, close — full flow
□ Safety checklist: create custom, execute on mobile, generate PDF
□ PTW: full request → approval → active → close-out flow
□ Compliance: certification expiry alerts firing
□ Analytics: TRIR, LTIR calculating correctly
□ Role access: Worker can submit; Manager can investigate; CEO sees all
□ Photo evidence: captured on mobile, stored in Document Center
□ Corrective actions: linked to Projects module as tasks
```

---

### PHASE 19: KNOWLEDGE BASE
**Duration**: 4 weeks
**Cumulative Week**: 109

### Goals
Build the internal knowledge management system — policies, guides, procedures, and how-tos. Searchable. Role-aware. AI-enhanced.

### Deliverables

#### 19.1 — Policies
```
Company policies (formal documents):
  - HR Policies: leave, conduct, dress code, remote work, etc.
  - Safety Policies: emergency procedures, PPE requirements, etc.
  - Finance Policies: expense claims, procurement, approval thresholds
  - IT Policies: acceptable use, data handling, password policy
  - Compliance Policies: GDPR, anti-bribery, whistleblowing

Policy features:
  - Version control (every update creates new version)
  - Approval workflow before publishing
  - Mandatory read: employee must acknowledge reading
  - Read receipt tracking (% of required readers who acknowledged)
  - Policy expiry + review date
  - Author + last reviewed by
  - Download as PDF
  - Linked to Safety Module for safety policies
```

#### 19.2 — Guides
```
How-to guides and SOPs (Standard Operating Procedures):
  - Written in rich text editor (block-based, Notion-like)
  - Content blocks: text / heading / image / video / code / table / callout
  - Embedded images and videos (Supabase Storage)
  - Step-by-step format (numbered list with checkboxes)
  - Guide rating (1–5 stars) by readers
  - "Was this helpful?" feedback
  - Comments section (with threading)
  - Author attribution
  - Last updated indicator (flagged if >180 days without review)
```

#### 19.3 — Procedures
```
Operational procedures (structured format):
  - Purpose, Scope, Responsibilities, Steps, References
  - Linked to: Safety checklists, project templates, HR processes
  - Step-level media (photo, video for each step)
  - QR code for procedure (print and place at workstation)
  - Procedure completion tracking (who completed which procedure)
  - Required acknowledgment before first time performing task
```

#### 19.4 — Search
```
Knowledge Base search (Typesense + pgvector):
  - Full-text search across all articles, policies, guides, procedures
  - Role-filtered: user only sees content they have access to
  - Instant results (<50ms)
  - Search suggestions (autocomplete)
  - Highlighted matches in results
  - Search analytics: what are users searching for? (identify gaps)
  - Semantic search (Phase 17 AI enhances this)
```

#### 19.5 — AI Integration
```
AI-powered Knowledge Base features (Phase 17 provides the AI engine):
  - Ask AI: "What is the leave policy?" → AI searches KB and synthesizes answer
  - Article suggestions: AI recommends related articles after reading one
  - Gap detection: AI identifies frequent searches with no KB results
  - Auto-summarization: AI generates article summary (displayed at top)
  - Outdated content flags: AI detects content that contradicts recent policies
  - Translation: AI translates articles (for multi-language companies)
  - Quality review: AI suggests improvements to article clarity
```

### Phase 19 Exit Criteria
```
□ Policies: create, version, publish, mandatory read flow
□ Guides: rich text editor with all block types, publish
□ Procedures: structured format with step media
□ Search: results in <100ms, role-filtered
□ AI integration: "Ask AI" answers correctly from KB content
□ Role access: employee sees only relevant-to-role content
□ Audit: every article view logged
```

---

### PHASE 20: LEARNING CENTER
**Duration**: 5 weeks
**Cumulative Week**: 114

### Goals
Build the employee learning and development platform — courses, certifications, quizzes, and progress tracking.

### Deliverables

#### 20.1 — Courses
```
Course structure:
  Course
  └── Module
      └── Lesson (one of: Video / Document / Quiz / Practical)

Lesson types:
  Video:     Stream from Supabase Storage CDN, with chapter markers
  Document:  PDF viewer or rich text content
  Quiz:      Multiple choice, True/False, Short Answer
  Practical: Checklist + photo evidence submission (manager reviews)

Course settings:
  - Required vs. Optional
  - Auto-assignment: auto-assign to all employees with specified role on join
  - Deadline: completion required by (date or X days after assignment)
  - Certificate on completion (yes/no)
  - Prerequisite courses (must complete X before Y)
  - Quiz passing score threshold (default 70%)
  - Retry limit (default 3 attempts)
  - Time estimate per course
  - Company-specific visibility

Course management:
  - Course builder (HR Manager / Learning Admin)
  - Draft / Review / Published / Archived status
  - Approval workflow before publishing
  - Clone course (from template)
  - SCORM 1.2 / 2004 import (for courses created in external tools)
```

#### 20.2 — Certifications
```
Certification program:
  - Certificate auto-generated on course completion (PDF)
  - Certificate: employee name, course name, completion date, company logo, unique ID
  - Stored in employee profile (Document Center)
  - Certificate registry: HR can see all certificates across company
  - Expiry: certification valid for X months (configurable per course)
  - Renewal: alert employee + HR when expiry approaching
  - Re-certification: assign same course again when certificate expires
  - Skills inventory: aggregate all certificates = employee skill profile
  - LinkedIn share: one-click generate LinkedIn share-ready certificate
```

#### 20.3 — Quizzes
```
Quiz engine:
  - Question types: Multiple Choice (single answer) / Multiple Select / True/False / Short Answer
  - Question pools: randomly select N from pool (prevents answer sharing)
  - Time limits: optional per quiz
  - Immediate feedback: show correct/incorrect after each question (configurable)
  - End-of-quiz review: see all questions with explanations
  - Pass/fail result with score
  - Retry: up to retry limit with new randomized questions
  - Quiz analytics: average score, most-missed questions, time taken

Short answer grading:
  Manual: submitted for instructor review
  AI-assisted (Phase 17): AI suggests pass/fail + reasoning for manager review
```

#### 20.4 — Progress Tracking
```
Individual progress:
  - % complete per course
  - % complete per learning path
  - Total learning hours (this month / all time)
  - Quiz scores (history per quiz attempt)
  - Certificates earned (with status: valid / expiring / expired)
  - Current streak (consecutive days with learning activity)

Learning paths:
  - Onboarding Path: auto-assigned to all new employees (role-based)
  - Role Paths: tailored curriculum per role
  - Compliance Path: mandatory legal + safety training
  - Development Path: optional career growth courses
  - Custom Paths: manager assigns bespoke curriculum

Manager / HR view:
  - Team completion dashboard (heatmap: employee × course)
  - Compliance completion rate (% of required training done)
  - Overdue learners list (alert queue)
  - Learning hours by department
  - Knowledge gap analysis (low scores in specific categories)

Company compliance dashboard (HR Manager):
  - Overall compliance rate
  - Per-department breakdown
  - Deadline countdown for expiring compliance courses
  - Export for regulatory audits (CSV / PDF)
```

### Phase 20 Exit Criteria
```
□ Course builder: create video + quiz + practical course
□ Learner: complete course, pass quiz, receive certificate PDF
□ Auto-assignment: new employee with role → courses auto-assigned
□ Progress tracking: individual + team dashboards
□ Compliance dashboard: HR sees company-wide training completion
□ Certificates: generated, stored in Document Center, expiry tracking
□ AI quiz assist: short answer AI grading suggestions (Phase 17 integration)
```

---

### PHASE 21: PROCUREMENT
**Duration**: 5 weeks
**Cumulative Week**: 119

### Goals
Build the end-to-end procurement platform — from purchase request to supplier payment, with approvals, order management, delivery tracking, and supplier analytics.

### Deliverables

#### 21.1 — Requests
```
Purchase Request (initiated by any employee):
  - What: item description, category, quantity, unit
  - Why: justification, project or department link
  - How much: estimated cost, currency
  - Attachments: quote from supplier, specification, photo
  - Urgency: standard / urgent / emergency
  - Linked to: project (cost allocation), store (inventory), department

Request submission rules:
  - Any employee can request
  - Routing determined by: amount + category + company policy
  - Small requests (<$500): auto-approved, routes to Procurement
  - Medium requests ($500–$5000): Manager approval required
  - Large requests (>$5000): Director + CEO approval required
  - Emergency requests: fast-track with retroactive approval
```

#### 21.2 — Approvals
```
Procurement approval routing (built on core approval system):

Approval matrix:
  Amount          | Approvers
  ----------------|---------------------------------------------
  < $500          | Auto-approved → Procurement Officer
  $500 – $2,000   | Line Manager
  $2,001 – $10,000| Department Head → Finance Director
  $10,001 – $50,000| Director → CEO
  > $50,000       | Director → CEO + Board notification

Approval SLAs:
  Standard: 48 hours at each approval step
  Urgent: 8 hours at each step
  Escalation: auto-escalate if SLA exceeded

Rejection: requester notified with reason, can revise and resubmit
Approval history: full log per request with timestamps and comments
```

#### 21.3 — Orders
```
Purchase Order (PO) lifecycle:
  Draft → Approved → Sent to Supplier → Acknowledged → 
  Partially Received → Fully Received → Matched → Closed

PO generation:
  - Auto-draft from approved purchase request
  - Supplier selection (from supplier catalog)
  - PO number: auto-generated (sequential, company-specific)
  - Line items from request + supplier pricing
  - Payment terms, delivery address, required by date
  - Terms and conditions (default company template)
  - PDF generation for dispatch

PO dispatch:
  - Email to supplier (Resend, branded)
  - Supplier acknowledgment tracking (manual or webhook)
```

#### 21.4 — Deliveries
```
Goods Receipt Note (GRN):
  - Created when goods arrive
  - Line-by-line: received quantity, condition, serial numbers
  - Partial receipt: mark what arrived, remainder stays on order
  - Quality check flag: reject items not meeting specification
  - Photo evidence: capture condition on receipt
  - Auto-update inventory: GRN → inventory levels updated (Shop module)
  - Auto-notify: warehouse team alerted on expected delivery day

3-Way Match:
  Purchase Order ↔ Goods Receipt Note ↔ Supplier Invoice
  - Auto-match: system checks quantities and prices match
  - Tolerance: configurable % variance (e.g., 2% price tolerance)
  - Match status: Matched / Partial Match / Discrepancy
  - Discrepancy → workflow: investigate + resolve before payment approved
  - Matched → payment route to Finance module for scheduling
```

#### 21.5 — Supplier Analytics
```
Supplier scorecard (per supplier):
  - On-time delivery rate (% of POs delivered by required date)
  - Order accuracy rate (% of POs received correctly without issues)
  - Quality rejection rate (% of received items rejected)
  - Average lead time (days from PO sent to goods received)
  - Price competitiveness (vs. market or other suppliers)
  - Total spend (monthly / quarterly / annual)

Procurement analytics:
  - Spend by supplier / category / department / project
  - PO cycle time (request submitted → goods received)
  - Savings vs. budget
  - Pending POs dashboard
  - Overdue deliveries list
  - Top 10 suppliers by spend
  - Preferred supplier recommendations (by score)
```

### Phase 21 Exit Criteria
```
□ Purchase Request: submit, approve, route to PO
□ PO: generate, send to supplier, track acknowledgment
□ GRN: receive goods, partial receipt, quality check
□ 3-way match: auto-match PO/GRN/Invoice, flag discrepancies
□ Inventory update: GRN auto-updates Shop module stock
□ Supplier scorecard: calculating from actual data
□ Analytics: spend by supplier and category
□ Approval matrix: correct routing by amount
```

---

### PHASE 22: TOOLS & FLEET
**Duration**: 6 weeks
**Cumulative Week**: 125

### Goals
Build the complete asset management system — tools, equipment, and vehicles. Checkout, maintenance, tracking, and cost allocation.

### Deliverables

#### 22.1 — Tools
```
Tool registry:
  id, company_id, asset_id, name, category,
  type (Power Tool / Hand Tool / Measuring / Machinery / Safety Equipment),
  make, model, serial_number, barcode, qr_code,
  purchase_date, purchase_price, replacement_value,
  current_location (site / warehouse / vehicle / unknown),
  current_custodian_id,
  condition (Excellent / Good / Fair / Poor / Damaged / Retired),
  insurance_record, warranty_expiry,
  next_maintenance_due, maintenance_interval,
  linked_project_ids,
  is_available, is_retired,
  created_at, updated_at

Checkout system:
  1. Employee scans tool barcode or QR code
  2. Request checkout (linked to project if applicable)
  3. Approval if tool value above threshold
  4. Checkout confirmed: custodian assigned, location updated
  5. Usage: start time logged
  6. Return: condition check (select from condition levels)
  7. Damage detected: flag → damage report → repair/write-off workflow
  8. Available: tool returned to pool

Tool lifecycle:
  Available → Checked Out → Under Maintenance → Out of Service → Retired
```

#### 22.2 — Equipment
```
Equipment category (larger assets, machinery):
  - Same schema as tools (different category values)
  - Certification requirements (for operators)
  - Operation log (who used, duration, work performed)
  - Calibration tracking (measuring instruments)
    → Calibration due alerts
    → Out-of-calibration: blocked from checkout
  - Load capacity and safety ratings
  - Inspection checklist before use (linked to Safety Phase 18)
```

#### 22.3 — Vehicles
```
Vehicle registry:
  id, company_id, registration_plate, make, model, year, vin,
  category (Car / Van / Truck / Machinery / Trailer),
  fuel_type, tank_capacity,
  assigned_driver_id,
  current_location (GPS last known, or manual),
  odometer_current,
  insurance_expires_at, road_tax_expires_at,
  next_service_due_date, next_service_due_km,
  condition, status (Available / In Use / Maintenance / Retired),
  documents (registration, insurance — Document Center links)

Trip management:
  - Trip record: driver, vehicle, start/end location, odometer start/end
  - Purpose: business / project / commute / delivery
  - Project link (for cost allocation)
  - Fuel consumed (calculated or manual entry)
  - Expenses on trip (tolls, parking, fuel — links to Finance)
  - Trip status: Planned / Active / Completed / Cancelled
  - GPS tracking: optional, GDPR-compliant (only during active trip)

Compliance calendar:
  - Insurance renewal reminders: 60 / 30 / 14 / 7 days
  - Road tax renewal reminders: 60 / 30 / 14 / 7 days
  - MOT/ITP reminders: 60 / 30 / 14 / 7 days
  - Out-of-compliance: vehicle flagged, checkout blocked
```

#### 22.4 — Maintenance
```
Maintenance management:
  - Scheduled maintenance: by date and/or mileage trigger
  - Maintenance record: date, type, work performed, cost, provider
  - Service history log per asset (complete history)
  - Out-of-service flag: prevents checkout during maintenance
  - Repair request: employee reports issue → assigned to maintenance team
  - Cost tracking per asset (maintenance investment)

Maintenance types:
  Preventive:  Scheduled routine (oil change, filter, inspection)
  Corrective:  Repair after fault detected
  Predictive:  AI-flagged based on usage pattern (Phase 17)
  Emergency:   Breakdown mid-use
```

#### 22.5 — Tracking
```
Asset location tracking:
  - Manual update: last known location (site / warehouse / vehicle)
  - GPS: vehicle GPS positions (last ping for fleet tracking)
  - QR scan at location: automatically updates asset location
  - Location history: last 10 locations per asset

Asset analytics:
  - Utilization rate: % of time asset is checked out (vs. available)
  - Cost per asset: purchase + maintenance + depreciation
  - Most-used tools (inform future procurement)
  - Tools approaching end of life (by age + maintenance cost trend)
  - Cost allocation by project (project cost includes tool usage)
  - Lost or damaged assets report
  - Fleet fuel consumption + cost per km per vehicle
  - Driver efficiency (fuel cost per km per driver)
  - Vehicle utilization rate
```

### Phase 22 Exit Criteria
```
□ Tool registry: CRUD, barcode/QR generation
□ Tool checkout: scan, request, approve, return flow
□ Damage report: flagged on return, workflow created
□ Vehicle registry: CRUD with compliance dates
□ Trip management: start, end, expense logging
□ Compliance alerts: firing 60/30/14/7 days before expiry
□ Maintenance: schedule, record, out-of-service block
□ Utilization analytics: tool and vehicle utilization rates
□ Cost allocation: tool/vehicle costs linked to projects
```

---

### PHASE 23: PUBLIC APP
**Duration**: 8 weeks
**Cumulative Week**: 133

### Goals
Build the public-facing experience — the customer's window into PRV. Home, Shop, Search, Favorites, Account, and Client Portal.

### Deliverables

#### 23.1 — Home
```
Public home screen sections:
  Hero Section:
    - Company presentation video or image
    - Tagline and value proposition
    - Primary CTA: "Get a Quote" / "Browse Shop" / "View Projects"

  Services:
    - Interior Renovations
    - Bathrooms, Kitchens, Flooring
    - Painting, Electrical, Plumbing
    - Commercial Spaces
    - Each service: photo, description, starting from price, CTA

  Featured Projects:
    - Before/after gallery (linked to Projects module photos)
    - Filter by service type
    - Each project: photos, description, duration, location (city only)

  Reviews & Testimonials:
    - Customer reviews from CRM + Shop module
    - Star rating aggregate
    - Video testimonials

  Statistics:
    - Projects completed, years of experience, clients served
    - Animated counters (number up on scroll into view)

  Contact:
    - Contact form → creates lead in CRM module
    - Phone, email, address
    - Map embed
    - Business hours
```

#### 23.2 — Shop
```
Public-facing shop (customer experience):
  - Product catalog (from Shop module Phase 9)
  - Categories (hierarchical navigation)
  - Product detail: images, description, price, variants, stock indicator
  - Product reviews (from Phase 9 review system)
  - Related products
  - Price calculator (for configurable products)

Cart and checkout:
  - Add to cart (persistent across sessions)
  - Cart quantity management
  - Discount code / coupon (from Promotions engine)
  - Checkout: address, payment method
  - Order confirmation: email + in-app
  - Order tracking: customer can see order status
  - Guest checkout + registered account checkout

Payment:
  - Stripe integration (card payments)
  - Bank transfer option
  - Instalment payment option (configurable)

Note: Payment processing is a separate integration sprint within this phase.
```

#### 23.3 — Search
```
Public search experience:
  - Search products (from Shop catalog)
  - Search services
  - Search completed projects (public portfolio)
  - Search by location (projects near me)
  - Filter by: category / price range / rating / availability
  - Instant results (Typesense)
  - Search suggestions and autocomplete
  - Recent searches (per browser session)
  - No results: suggest alternatives + "Contact us" CTA
```

#### 23.4 — Favorites
```
Public favorites (wishlist):
  - Add any product to favorites (without account — stored in browser)
  - Account required: sync favorites across devices
  - Favorites list: manage, remove, add to cart
  - Share favorites list (link)
  - Price drop alerts (if favorited product goes on sale)
  - Stock alert (if favorited product back in stock)
```

#### 23.5 — Account
```
Customer account (public-facing user):
  - Registration: email + password or OAuth (Google / Apple)
  - Profile: name, address book, communication preferences
  - Order history: all past orders with status + tracking
  - Favorites: wishlist management
  - Reviews: manage submitted reviews
  - Notifications: email preferences
  - Address book: multiple delivery addresses
  - Payment methods: saved cards (Stripe vault)
  - Delete account (GDPR right to erasure)
```

#### 23.6 — Client Portal
```
Client Portal (for customers with active projects):
  - Login: same account as Public App (or invite link from PRV)
  - Access granted by Project Manager in PRV system

Client Portal sections:
  My Projects:
    - Active projects with live status
    - Progress: % complete, current phase, next milestone
    - Schedule: projected completion date

  Quotes:
    - All quotes sent by PRV
    - View full quote + line items
    - Accept or reject quote (updates CRM and triggers project start)
    - Request changes (comment on quote)

  Contracts:
    - View and digitally sign contracts
    - Signed contracts stored (Document Center)

  Documents:
    - Client-accessible documents (invoices, reports, certificates)
    - Upload requested documents

  Photos:
    - Project photo albums (shared by Project Manager)
    - Before/after galleries
    - Download full resolution

  Invoices:
    - All invoices for their projects
    - Pay online (Stripe) from invoice view
    - Invoice history + payment receipts

  Progress Updates:
    - Timeline of project milestones
    - Comments from Project Manager
    - Client can ask questions (message thread)
```

### Phase 23 Exit Criteria
```
□ Home: all sections rendering, CTA → creates lead in CRM
□ Shop: product catalog, cart, checkout, order confirmation
□ Payment: Stripe integration tested with real transaction
□ Search: instant results from product catalog
□ Favorites: persist for guest and logged-in users
□ Account: registration, login, order history
□ Client Portal: client sees their project, photos, invoices
□ Quote acceptance: updates CRM record in PRV system
□ Invoice payment: Stripe payment → Finance module updated
□ Mobile: full experience on iPhone (375px+)
□ Performance: Core Web Vitals all Green (LCP <2.5s, CLS <0.1)
```

---

### PHASE 24: POLISH & OPTIMIZATION
**Duration**: 6 weeks
**Cumulative Week**: 139

### Goals
Refinement. Make PRV feel like a first-party Apple product. Optimize performance, accessibility, motion, haptics, and UX across all 25 modules.

### Deliverables

#### 24.1 — Performance
```
Performance targets:
  API:          P50 <200ms, P95 <500ms, P99 <1s
  Web:          LCP <2.5s, CLS <0.1, INP <200ms
  Mobile:       60fps scrolling, <3s TTI on 4G
  Search:       P95 <100ms (Typesense)
  AI:           First token <1s (streaming), full response <15s

Performance work:
  - Database: pg_stat_statements query analysis, missing index identification
  - N+1 query elimination (systematic audit of all list views)
  - Redis caching: hot data (session, KPIs, navigation manifests)
  - Next.js: bundle analyzer → remove unused code, code splitting
  - Images: next/image audit, WebP/AVIF format enforcement
  - Supabase: connection pooling settings tuned (PgBouncer)
  - Inngest: queue sizes and concurrency reviewed per job type
  - Typesense: index configuration reviewed for search speed
  - Cloudflare: cache rules reviewed, edge cache maximized
```

#### 24.2 — Accessibility
```
WCAG 2.1 AA compliance (all screens):
  - Colour contrast: all text meets 4.5:1 (normal), 3:1 (large) ratio
  - Focus management: visible focus rings on all interactive elements
  - Keyboard navigation: every action achievable with keyboard only
  - Screen reader: all interactive elements have aria-labels
  - VoiceOver: all iOS screens navigable with VoiceOver
  - TalkBack: all Android screens navigable with TalkBack
  - Dynamic Type: all text scales with system font size setting
  - Reduced Motion: all animations respect prefers-reduced-motion
  - Touch targets: minimum 44×44pt on all tappable elements
  - Error messages: programmatically associated with form fields

Tools:
  - axe-core: automated scan on every screen
  - Lighthouse: accessibility score ≥90 on all pages
  - Manual: VoiceOver walk-through of 5 critical user journeys
```

#### 24.3 — Motion
```
Motion refinement:
  - Audit: every transition, animation, and micro-interaction
  - Ensure spring curves applied consistently (not linear anywhere)
  - Shared element transitions: navigation between list → detail
  - Swipe gestures: confirm physics feel natural (velocity-matched)
  - Pull-to-refresh: satisfying spring animation
  - Skeleton loading: smooth pulse, not harsh blink
  - Toast notifications: glass emergence from bottom (translateY + blur)
  - Page transitions: consistent across all module navigations
  - List inserts / removals: animated (not abrupt)
  - Input focus: soft spring scale animation on focus
```

#### 24.4 — Haptics
```
Haptic audit:
  - Every button: confirm Light Impact on tap
  - Destructive actions: confirm Heavy Impact on confirm
  - Success states: confirm Success haptic plays
  - Error states: confirm Error haptic plays
  - Sheet snap positions: confirm Rigid haptic
  - Long-press: confirm Soft haptic on initiation
  - Pull-to-refresh trigger: confirm Rigid haptic
  - Tab switch: confirm Light Impact

Testing:
  - Walk through every screen on physical iPhone
  - Verify no taps produce no haptic feedback (zero silent taps)
  - Verify no haptic spam (max 1 haptic per 100ms)
```

#### 24.5 — UX Improvements
```
UX audit and fixes:
  - Empty states: every list view has a beautiful, actionable empty state
  - Error states: every network error has a clear, retry-able state
  - Loading states: skeleton loaders consistent across all modules
  - Offline states: clear offline indicator + graceful degradation
  - Confirmation dialogs: consistent pattern (Glass Modal + Heavy haptic)
  - Destructive confirmation: always requires explicit typed phrase or second tap
  - Form validation: inline, immediate, clear error messages
  - Onboarding: guided tooltips for first-time users on key workflows
  - Deep links: all entities deep-linkable (from notifications, emails, search)
  - Share sheets: all shareable entities have iOS/Android share sheet integration
  
Specific UX issues to resolve:
  - Navigation: verify no screen violates 3-level max rule
  - CEO 60-Second Rule: final user test — CEO confirms <60 seconds
  - Liquid Glass: ensure no surface is flat/solid (every surface is glass)
  - Floating elements: every navigation element floats (none full-width solid)
  - Context menus: available on every entity via long-press
```

### Phase 24 Exit Criteria
```
□ API: P95 <500ms across all endpoints
□ Core Web Vitals: all Green (LCP, CLS, INP)
□ Mobile: 60fps confirmed on iPhone 12 (profiled with Xcode Instruments)
□ Accessibility: WCAG 2.1 AA on all screens
□ Haptics: walk-through confirms all 9 patterns working correctly
□ Motion: zero linear animations, all springs working
□ Empty states: every list has a designed empty state
□ CEO 60-Second Rule: user test passed with real CEO user
□ All UI is glass: no solid card backgrounds anywhere
□ Navigation: max 3 levels confirmed on all 19 role navigations
```

---

### PHASE 25: LAUNCH PREPARATION
**Duration**: 6 weeks
**Cumulative Week**: 145

### Goals
Production readiness — security audit, QA review, performance review, App Store submission, and go-live.

### Deliverables

#### 25.1 — Security Review
```
External penetration test (2 weeks, specialized security firm):
  Scope:
    - OWASP Top 10 (web + API)
    - Authentication bypass attempts
    - Privilege escalation (role boundary testing)
    - SQL injection (all parameterized via Drizzle ORM, verify)
    - XSS (all user input rendered)
    - CSRF (all state-changing API calls)
    - RLS policy audit (cross-company data leakage)
    - Session fixation and hijacking
    - Rate limiting verification
    - API key exposure (env scan)
    - Dependency vulnerabilities (npm audit)
    - Secret scanning (GitHub Actions)

Fix SLA:
  Critical findings: fix within 24 hours, re-test before launch
  High findings:     fix within 72 hours, re-test before launch
  Medium findings:   fix within 1 week
  Low findings:      document, fix in next sprint post-launch

Internal compliance checklist:
  □ All API routes: authentication required (no unauthenticated endpoints)
  □ All data queries: company_id scoped
  □ All RLS policies: verified by automated test matrix
  □ All audit logs: capturing required events
  □ GDPR: right to erasure, data export, DPA signed with vendors
  □ DPA signed: Supabase, Anthropic, Resend, Cloudflare, Sentry
```

#### 25.2 — QA Review
```
Test coverage targets:
  Unit tests (Vitest):    ≥80% coverage across all packages
  Integration tests:      all API routes and DB operations
  E2E tests (Playwright): all 19 role critical user journeys

Critical E2E journeys (all must pass with zero failures):
  □ CEO: login → view dashboard → company health → drill-down
  □ Worker: login → clock in → view tasks → complete task → clock out
  □ Team Leader: view team attendance → approve leave request
  □ HR Manager: create contract → assign to employee → employee signs
  □ Store Manager: view inventory → create purchase request → track order
  □ Project Manager: create project → assign tasks → track budget
  □ Finance Director: view P&L → approve invoice → record payment
  □ Shop Director: multi-store dashboard → inventory across stores
  □ CEO: approve procurement request → send PO to supplier

Visual regression:
  - Playwright screenshots on all 50+ pages
  - Diff comparison against golden screenshots
  - Review any diff > 0.1% before launch

Cross-browser testing:
  Safari 17+, Chrome 120+, Firefox 120+, Edge 120+

Cross-device:
  iPhone 12, iPhone 15 Pro, iPad Air, Samsung Galaxy S23,
  Google Pixel 8, 1080p desktop, 1440p desktop, 4K
```

#### 25.3 — Performance Review
```
Final performance validation:
  □ All API endpoints: P95 <500ms (measured in staging under load)
  □ Core Web Vitals: all Green in Chrome PageSpeed
  □ Mobile Lighthouse: Performance ≥90, Accessibility ≥90, Best Practices ≥90
  □ 60fps: confirmed on iPhone 12, Samsung Galaxy S23
  □ Load test: simulate 1,000 concurrent users in staging
    (No error rate increase, P99 <2s under load)
  □ Database: no queries exceeding 100ms on staging (pg_stat_statements)
  □ Search: P95 <100ms at 10,000 concurrent queries

Load test tools: k6 or Artillery
Load test scenarios:
  - Login surge: 500 users login simultaneously
  - Dashboard load: 200 CEOs loading dashboards simultaneously
  - Clock-in peak: 300 workers clock in within 5 minutes (shift start)
  - Search burst: 100 simultaneous search queries
```

#### 25.4 — App Store Review
```
iOS App Store submission:
  □ App icon: all required sizes (1024×1024 + all device sizes)
  □ Screenshots: all required sizes for iPhone 6.5" and iPad
  □ App description: written, localized for target markets
  □ Privacy policy URL: live
  □ Privacy labels: accurate (data types, purposes, linked to account)
  □ Sign in with Apple: implemented (required if any OAuth login exists)
  □ No private API usage (App Store rejection prevention)
  □ Human Interface Guidelines compliance audit
  □ Minimum iOS version: iOS 16.0 (covers iPhone 12 and newer)
  □ TestFlight beta: distribute to 25+ external testers for 2 weeks before submission

Android Google Play submission:
  □ APK/AAB built and signed
  □ Store listing: description, screenshots, feature graphic
  □ Content rating: questionnaire completed
  □ Privacy policy URL: live
  □ Target API level: 34 (Android 14)
  □ Internal testing track → Alpha → Beta → Production
```

#### 25.5 — Documentation
```
User documentation (written before launch):
  For each of 19 roles:
  - Getting Started guide (role-specific — "Day 1 as a Worker" etc.)
  - Feature guide for their primary module
  - FAQ (10 most common questions per role)

Technical documentation:
  - API documentation (all public API endpoints)
  - Integration guide (for enterprise customers building on PRV API)
  - Architecture overview (high level — for enterprise sales)
  - Security whitepaper (for enterprise procurement evaluation)
  - Data processing addendum template

Operational documentation (internal):
  - Runbook: incident response procedures
  - On-call guide: escalation tree, contact list, response SLAs
  - Deployment procedure (step-by-step production deployment)
  - Database backup and restore procedure
  - Disaster recovery plan
```

### Launch Checklist (Go / No-Go)
```
All of the following must be confirmed before production launch:

Security:
□ External pen test complete — all Critical + High findings resolved
□ All API routes: authenticated
□ All RLS policies: verified by automated test matrix
□ GDPR compliance: right to erasure, data export working
□ DPA signed with all sub-processors

Quality:
□ Unit test coverage: ≥80%
□ E2E tests: all 19 critical journeys passing with 0 failures
□ Visual regression: no unintended UI changes
□ Zero P0 or P1 open bugs
□ Cross-browser: tested on 4 browsers
□ Cross-device: tested on 5 devices

Performance:
□ Core Web Vitals: all Green in production
□ API P95: <500ms
□ Load test: 1,000 concurrent users — no degradation
□ Mobile: 60fps on iPhone 12

Operations:
□ Monitoring: Sentry configured, alert thresholds set
□ Logging: Axiom dashboards configured
□ Uptime monitoring: Cloudflare Health Checks active
□ On-call: rotation defined, runbook distributed
□ Backup: automated daily, weekly restore test passed
□ Rollback: Vercel rollback tested successfully

Business:
□ App Store: iOS and Android apps approved and available
□ Legal: Terms of Service published
□ Legal: Privacy Policy published
□ Legal: DPA template available for enterprise customers
□ Support: help desk configured
□ Onboarding: getting-started guides for all 19 roles published
□ Status page: public status page live

Committed SLA (post-launch):
□ Uptime: 99.9% (≤8.7 hours downtime/year)
□ P0 response: <15 minutes
□ P1 response: <1 hour
```

---

## STRATEGIC DELIVERABLES

---

## A. TEAM STRUCTURE

### Year 1 Core Team (Phases 0–7, Weeks 0–42)

```
Leadership (2):
  Lead Architect / Tech Lead    (1) — architecture, code review, tech decisions
  Product Lead                  (1) — product strategy, user research, prioritization

Engineering (6):
  Backend Engineer              (2) — APIs, database, background jobs, auth
  Frontend Engineer             (2) — Next.js, design system, component library
  Mobile Engineer               (1) — React Native (iOS + Android)
  DevOps / Platform Engineer    (1) — CI/CD, Vercel, Supabase, monitoring

Design (1):
  UI/UX Designer                (1) — Liquid Glass design system, all screens

QA (1):
  QA Engineer                   (1) — test automation, Playwright, manual testing

Total Year 1: 10 people
```

### Year 2 Growth Team (Phases 8–17, Weeks 43–101)

```
Additions:
  Backend Engineer              +2  (total 4 BE)
  Frontend Engineer             +1  (total 3 FE)
  Mobile Engineer               +1  (total 2 Mobile)
  AI/ML Engineer                +1  (Claude integration, AI automation, RAG)
  UI/UX Designer                +1  (total 2 designers)
  QA Engineer                   +1  (total 2 QA)
  Data Engineer                 +1  (analytics pipeline, data warehouse)

Total Year 2 additions: 7 people
Year 2 total: 17 people
```

### Year 3 Scale Team (Phases 18–25, Weeks 102–145)

```
Additions:
  Backend Engineer              +1  (total 5 BE)
  Security Engineer             +1  (dedicated — pen test, compliance, SSDLC)
  Platform / DevOps             +1  (total 2 platform)
  Motion Designer               +1  (animations, microinteractions — Phase 24)
  Performance Engineer          +1  (Phase 24 optimization, load testing)
  Solutions Architect           +1  (enterprise onboarding, integration)
  Technical Support             +1  (tier 2 customer support)

Total Year 3 additions: 7 people
Year 3 total: 24 people
```

### Team Principles
```
1. End-to-end ownership: each engineer owns their module (BE + FE + tests)
2. Code review: minimum 1 reviewer; 2 for security-critical paths
3. On-call: 2 engineers weekly rotation, P0 response <15 minutes
4. Knowledge sharing: pair programming on critical modules, weekly tech talks
5. No single points of failure: bus factor ≥ 2 for every critical system
```

---

## B. RECOMMENDED DEVELOPMENT ORDER

### Phase Dependency Graph
```
Phase 0 (Architecture Validation)
  └── Phase 1 (Foundation)
        └── Phase 2 (Auth & Security)
              └── Phase 3 (Multi-Company Core)
                    ├── Phase 4 (Design System)
                    │     └── Phase 5 (Navigation)
                    │           ├── Phase 6 (Projects)
                    │           └── Phase 7 (Attendance)
                    │                 └── [MVP — Week 42]
                    │           ├── Phase 8 (HR)
                    │           ├── Phase 9 (Shop)
                    │           ├── Phase 10 (CRM)
                    │           ├── Phase 11 (Finance)
                    │           └── Phase 12 (Document Center)
                    └── Phase 13 (Communication)    — after Phase 5
                    └── Phase 14 (Notifications)    — after Phase 2
                          └── Phase 15 (Analytics) — after Phases 6–12
                                └── Phase 16 (Command Center) — after Phase 15
                                      └── Phase 17 (AI Platform) — after Phase 16
                    └── Phase 18 (Safety)           — after Phase 7
                    └── Phase 19 (Knowledge Base)   — after Phase 12
                    └── Phase 20 (Learning Center)  — after Phase 19
                    └── Phase 21 (Procurement)      — after Phase 9 + 11
                    └── Phase 22 (Tools & Fleet)    — after Phase 21
                    └── Phase 23 (Public App)       — after Phase 9 + 10 + 11
                    └── Phase 24 (Polish)           — after ALL
                    └── Phase 25 (Launch Prep)      — after Phase 24
```

### Parallelization Windows
```
Weeks 1–26 (Phases 0–5): Sequential — foundation must complete before modules

Weeks 27–75 (Phases 6–12): 2 teams in parallel
  Team A: Projects (6) → HR (8) → Finance (11)
  Team B: Attendance (7) → Shop (9) → CRM (10) → Documents (12)

Weeks 76–101 (Phases 13–17): 2 teams in parallel
  Team A: Communication (13) + Notifications (14) → Analytics (15)
  Team B: Safety (18) + Knowledge Base (19) (independent, no dependency)
  Then: Command Center (16) → AI Platform (17)

Weeks 102–133 (Phases 18–23): Multiple parallel streams
  Stream A: Learning Center (20) → after Knowledge Base (19)
  Stream B: Procurement (21) → Tools & Fleet (22)
  Stream C: Public App (23) — independent after Phase 9+10+11

Weeks 134–145 (Phases 24–25): All hands
  All teams: Polish & Optimization (24) → Launch Preparation (25)
```

### Sprint Cadence
```
Sprint length: 2 weeks
Sprint planning: Monday Week 1
Sprint review + retrospective: Friday Week 2
Daily standup: 09:30 async (Slack thread) + sync 2×/week if needed
Phase demo: end of each phase (stakeholder demo)

Definition of Done:
□ Code reviewed and merged to main
□ Unit tests written and passing
□ E2E test for happy path
□ Accessibility: component passes axe-core
□ Performance: no regression (Lighthouse CI check)
□ Documentation: JSDoc on public functions + API routes
□ Product Lead sign-off
```

---

## C. RELEASE STRATEGY

### Version Schema
```
Semantic Versioning: MAJOR.MINOR.PATCH

MAJOR: breaking changes, significant architectural shifts
MINOR: new features, new modules, new roles
PATCH: bug fixes, performance improvements, security patches

Release progression:
  0.1.0 — Phase 1 (Foundation) complete
  0.2.0 — Phase 2 (Auth) complete
  0.3.0 — Phase 3 (Multi-Company) complete
  0.4.0 — Phase 4–5 (Design + Navigation) complete
  0.5.0 — Phase 6 (Projects) complete
  0.6.0 — Phase 7 (Attendance) complete
  1.0.0 — MVP release (Phase 7 complete + launch criteria met)
  1.1.0 — Phase 8 (HR)
  1.2.0 — Phase 9 (Shop)
  1.3.0 — Phase 10 (CRM)
  1.4.0 — Phase 11 (Finance)
  1.5.0 — Phase 12 (Documents)
  1.6.0 — Phase 13–14 (Communication + Notifications)
  1.7.0 — Phase 15 (Analytics)
  1.8.0 — Phase 16 (Command Center)
  1.9.0 — Phase 17 (AI Platform)
  1.10.0 — Phases 18–22 (Operations modules)
  2.0.0 — Full platform (Phase 25 complete)
```

### Deployment Pipeline
```
Developer → feature/* branch → PR → CI →
merge to main → auto-deploy staging →
QA sign-off → Vercel release → production

Steps in detail:
  1. Developer opens PR from feature/* to main
  2. CI: type-check + lint + unit tests + build + E2E smoke
  3. PR review: 1 reviewer minimum (2 for auth/finance/security)
  4. Merge → auto-deploy to staging (Vercel)
  5. QA verification on staging (manual + automated)
  6. Product Lead sign-off
  7. Changesets creates version tag
  8. Auto-deploy to production
  9. Post-deploy smoke tests (Playwright — 5 critical paths)
  10. 2-hour monitoring window (error rate, P95 latency alerts)

Rollback:
  Vercel instant rollback: <1 minute
  Database: forward-only migrations (no rollback scripts)
  Features: kill-switch via feature flags
```

### Feature Flags
```
Implementation: flag table in PostgreSQL (simple, no third-party)

Flag types:
  company:   enable feature for specific company only
  role:      enable feature for specific roles
  gradual:   enable for % of users (0–100%)
  killswitch: disable feature globally instantly

Flag examples:
  feature_ai_assistant          (Phase 17 — graduated rollout)
  feature_fleet_management      (Phase 22 — company-by-company)
  feature_public_shop           (Phase 23 — enable per company)
  emergency_ai_disable          (killswitch — if AI issues arise)
```

### Hotfix Process
```
P0 (System down / data loss / security breach):
  - On-call engineer: immediate response (<15 minutes)
  - Fix on hotfix/* branch
  - 1 reviewer minimum (expedited)
  - Deploy to production: target 1–2 hours from detection
  - Post-mortem: within 24 hours

P1 (Major feature broken, workaround exists):
  - Fix within 4 hours
  - Normal PR process, expedited review

P2 (Minor bug, low impact):
  - Fix in current sprint

SLA:
  P0: 15min response, 1–2h resolution
  P1: 1h response, 4h resolution
  P2: next sprint
```

---

## D. MVP STRATEGY

### MVP Definition
```
MVP = Minimum Viable Product that proves PRV's core value:
  A company can fully manage its Projects, Attendance, and Workforce in PRV.
  The CEO sees the business state in real-time.
  Employees clock in/out, see tasks, and receive notifications.

MVP = Phases 0–7 complete (Week 42, ~10 months)
```

### MVP Scope
```
INCLUDED in MVP:
  ✓ Phase 0: Architecture Validation
  ✓ Phase 1: Foundation (monorepo, CI/CD, environments)
  ✓ Phase 2: Auth & Security (Face ID, MFA, sessions, RLS, audit logs)
  ✓ Phase 3: Multi-Company Core (19 roles, 8-level scope)
  ✓ Phase 4: Design System (Liquid Glass, all 50+ components)
  ✓ Phase 5: Navigation System (floating tabs, search, command palette, inbox)
  ✓ Phase 6: Projects Module (full project + task + budget + analytics)
  ✓ Phase 7: Attendance & Workforce (clock-in, shifts, leave, org chart)
  ✓ Phase 14 partial: Push notifications (critical path — started in Phase 4)

NOT IN MVP (Post-MVP releases):
  ✗ HR Module (Phase 8)
  ✗ Shop Module (Phase 9)
  ✗ CRM Module (Phase 10)
  ✗ Finance Module (Phase 11) — basic budget tracking in Phase 6
  ✗ Document Center (Phase 12) — basic file upload in Projects
  ✗ Communication Center (Phase 13)
  ✗ Analytics Platform (Phase 15) — dashboard KPIs included, not full BI
  ✗ Command Center (Phase 16)
  ✗ AI Platform (Phase 17)
  ✗ All Phases 18–25
```

### MVP Success Metrics
```
Technical:
  - Uptime ≥99.5% (4.3h downtime/month max)
  - API P95 <500ms
  - Core Web Vitals: all Green
  - Zero open P0/P1 security vulnerabilities

Product:
  - 3 pilot companies using PRV actively
  - 50+ daily active users
  - NPS ≥ 30
  - DAU/MAU ≥ 40%
  - Monthly company churn < 5%

Feature adoption:
  - 80% of eligible users: active in Projects module
  - 90% of workers: clocking in via app (not paper/Excel)
  - CEO confirms: 60-Second Rule achieved in user test
```

### MVP Go / No-Go Gate
```
All required before v1.0.0 launch:
□ All Phase 0–7 deliverables complete
□ E2E test coverage ≥70% of critical paths
□ Zero P0/P1 bugs
□ Security review complete (internal + partial external)
□ Core Web Vitals: all Green
□ WCAG 2.1 AA: all MVP screens
□ CEO 60-Second Rule: validated in live user test
□ Backup + restore: tested and verified
□ On-call process: in place with runbook
□ Getting-started documentation: all 19 roles covered
□ App Store: iOS app submitted and approved
□ Terms of Service + Privacy Policy: published
```

---

## E. ENTERPRISE STRATEGY

### Multi-Tenancy Architecture
```
Standard (Tier 1):
  - Row-Level Security on all tables
  - company_id on every record
  - company_id injected from JWT on every server request
  - No cross-company queries without CEO/Sysadmin explicit grant

Group (Tier 2 — Enterprise):
  - Multiple companies under one PRV Group
  - Cross-company analytics (CEO level)
  - Shared supplier catalog
  - Shared employee pool (cross-company assignments)
  - Consolidated financial reporting

White Label (Tier 3 — Partner):
  - Custom domain per company
  - Custom branding (logo, colors, company name)
  - Custom email sending domain
  - Dedicated Supabase project (optional — for highest isolation)
  - Custom app icon and App Store listing
```

### Pricing Tiers
```
Tier         | Users    | Storage | AI     | Support   | Notes
-------------|----------|---------|--------|-----------|-------------------
Starter      | ≤25      | 10GB    | Basic  | Email     | MVP pilot pricing
Professional | ≤100     | 100GB   | Full   | Priority  | Core offering
Enterprise   | Unlimited| 1TB+    | Full   | SLA + CSM | Custom contract
White Label  | Unlimited| Custom  | Full   | Dedicated | Partner agreement

Notes:
  - AI usage: billed on consumption (token pass-through + margin)
  - Storage: Supabase Storage (scales transparently)
  - Final pricing set by business team
```

### Onboarding Architecture
```
Automated company setup (on CEO registration):
  1. Company record created
  2. 19 default roles provisioned with standard permissions
  3. Default settings applied (timezone, currency, locale)
  4. CEO user created and linked to company
  5. Guided setup wizard (6 steps, skip-able):
     Step 1: Company profile (name, logo, timezone, currency)
     Step 2: Invite first team members (email invites sent)
     Step 3: Assign roles to team members
     Step 4: Create first project or store
     Step 5: Connect calendar / email
     Step 6: Download mobile app (QR code)
  6. 30-day health check: automated email review
  7. 60-day CSM touchpoint (Enterprise tier)
```

### Compliance Roadmap
```
At MVP launch:
  - GDPR compliant (data residency, DPA, right to erasure, data export)
  - Privacy Policy and DPA template for customers

Year 2:
  - ISO 27001 gap assessment
  - SOC 2 Type I audit initiated

Year 3:
  - SOC 2 Type II certification
  - ISO 27001 certification
  - Data residency options: EU + US regions

Not in initial scope:
  - HIPAA (healthcare — not PRV's primary market)
```

---

## F. 10-YEAR SCALABILITY PLAN

### Scale Targets
```
Year 1:  3–10 companies,     25–500 users
Year 2:  10–50 companies,   500–2,000 users
Year 3:  50–200 companies, 2,000–10,000 users
Year 5:  200–1,000 companies, 10,000–100,000 users
Year 10: 1,000+ companies, 100,000+ users
```

### Architecture Evolution by Year

```
Year 1 (MVP):
  - Single Next.js app (App Router)
  - Single Supabase project (PostgreSQL)
  - Single Redis instance (Upstash)
  - All jobs on Inngest
  - Single Typesense cluster
  - Vercel serverless (auto-scaling compute)
  
Year 2 (Product-Market Fit):
  - Read replica for analytics (separate Supabase project or replica)
  - Table partitioning: analytics_events and audit_logs by month
  - Redis caching for hot data (session, KPIs, navigation manifests)
  - Typesense: multi-node for high availability
  - CDN: Cloudflare caching expanded (API responses)

Year 3 (Scale):
  - analytics tables migrated to TimescaleDB or ClickHouse
    (better suited for time-series aggregations at scale)
  - Connection pooling: PgBouncer tuning for 10,000+ connections
  - Inngest: queue sizing reviewed, concurrency scaled
  - API gateway layer: rate limiting, routing, analytics

Year 4–5 (Enterprise):
  - Dedicated Supabase projects for major enterprise customers
  - Horizontal sharding strategy by company_id range
    (company_id 1–10,000 → Shard A, 10,001–20,000 → Shard B)
  - Multi-region deployment (EU + US + APAC options)
  - CQRS: Command/Query Responsibility Segregation
    (write path and read path separated)
  - Event sourcing: immutable event log for audit compliance

Year 6–10 (Platform):
  - Microservices extraction: AI, Notifications, Search → independent services
  - Event-driven architecture (Redpanda/Kafka for high-volume event streaming)
  - Data lake (S3 + Apache Iceberg for analytics at scale)
  - Custom ML model fine-tuning (company-specific AI models)
  - Platform API: third parties can build on PRV
  - App marketplace: third-party extensions

Invariant (never changes):
  company_id on every record.
  This is the sharding key, the isolation key, the audit key.
  It is never removed or renamed.
```

### Database Scaling Path
```
Stage 1 — 0–10,000 users:
  Single Supabase project
  Vertical scale (Supabase Pro → Business plan)
  Built-in PgBouncer (connection pooling)

Stage 2 — 10,000–50,000 users:
  + Read replica for analytics queries
  + Table partitioning (time-series tables by month)
  + Archiving: data older than 2 years → cold storage (S3)

Stage 3 — 50,000–200,000 users:
  + Separate analytics database (ClickHouse for OLAP)
  + Horizontal sharding by company_id range (managed by application layer)
  + pgvector: dedicated replica for AI embedding queries

Stage 4 — 200,000+ users:
  + Dedicated database clusters per major enterprise
  + Global distribution: EU, US, APAC data residency
  + Event sourcing: immutable event stream (Redpanda)
  + Data lake: historical analytics (S3 + Iceberg + Trino)
```

### Cost at Scale (Infrastructure Estimates)
```
1,000 users:    ~$400/month infrastructure
5,000 users:    ~$1,200/month
10,000 users:   ~$2,500/month
50,000 users:   ~$8,000/month
100,000 users:  ~$18,000/month

Note: AI usage is variable (billed per token to end customer)
Note: Estimates based on Supabase + Vercel + Upstash + Inngest pricing (2024)
```

---

## G. RISK REGISTER

### Technical Risks

| # | Risk | Probability | Impact | Score | Mitigation |
|---|------|-------------|--------|-------|------------|
| T1 | Scope creep expands timeline past plan | 4 | 3 | 12 | Strict phase gates; no phase starts before previous 100% complete |
| T2 | RLS performance at scale (100k+ rows) | 3 | 4 | 12 | Benchmark at 1M rows; index all RLS conditions; test at 10× expected load |
| T3 | Supabase vendor lock-in risk | 2 | 4 | 8 | Repository pattern; standard PostgreSQL; migration scripts exist |
| T4 | Anthropic API cost spike at scale | 3 | 3 | 9 | Per-company rate limits; cost budgets; configurable AI features per tier |
| T5 | Supabase Realtime under heavy load | 3 | 3 | 9 | Load test 10,000 concurrent connections; graceful WebSocket fallback |
| T6 | Mobile App Store rejection | 2 | 4 | 8 | Follow HIG strictly; correct privacy labels; no prohibited APIs |
| T7 | Production DB migration failure | 2 | 5 | 10 | Test on staging clone; maintenance window; rollback scripts; backup first |
| T8 | Third-party outage (Resend, Upstash, Inngest) | 3 | 2 | 6 | Graceful degradation; retry logic; fallback behavior defined |
| T9 | Background job queue saturation | 2 | 3 | 6 | Dead-letter queue; retry logic; queue depth monitoring + alerts |
| T10 | Search performance degradation at scale | 2 | 3 | 6 | Benchmark at 10M documents; Typesense tuning; caching layer |

### Product Risks

| # | Risk | Probability | Impact | Score | Mitigation |
|---|------|-------------|--------|-------|------------|
| P1 | Product complexity overwhelming users | 3 | 4 | 12 | Progressive disclosure; role-specific views; onboarding wizard; UX testing |
| P2 | Mobile performance below expectation | 3 | 4 | 12 | Performance budgets enforced; weekly Lighthouse CI; Phase 24 dedicated polish |
| P3 | Feature adoption slower than expected | 3 | 3 | 9 | In-app tutorials; feature flags for gradual rollout; user feedback loops |
| P4 | Navigation complexity (21 modules) | 3 | 3 | 9 | Architecture validated in blueprints; max 3 levels enforced; user testing |
| P5 | Role permission edge cases | 2 | 4 | 8 | Full matrix in ROLE_ARCHITECTURE.md; automated test matrix for all 19 roles |
| P6 | CEO 60-Second Rule not achievable | 2 | 4 | 8 | Validate at Phase 6 + Phase 16; iterate if not met; architecture built for it |

### Security Risks

| # | Risk | Probability | Impact | Score | Mitigation |
|---|------|-------------|--------|-------|------------|
| S1 | Cross-company data breach | 2 | 5 | 10 | RLS on all tables; external pen test; automated test matrix; Zero Trust |
| S2 | Privilege escalation attack | 2 | 5 | 10 | 7-gate auth chain; role validation on every route; tests for all 19 roles |
| S3 | JWT token theft / session hijacking | 2 | 4 | 8 | Short-lived JWTs (15m); refresh token rotation; device binding |
| S4 | Supply chain attack (npm dependency) | 3 | 4 | 12 | Dependabot; npm audit in CI; lockfile committed; unvetted deps policy |
| S5 | AI prompt injection | 3 | 3 | 9 | Input sanitization; system prompt hardening; output validation |
| S6 | Audit log tampering | 1 | 5 | 5 | Append-only (trigger blocks UPDATE/DELETE); SHA-256 chaining; Sysadmin only |
| S7 | DDoS attack | 2 | 4 | 8 | Cloudflare DDoS protection; rate limiting on all endpoints; auto-scaling |

### Business Risks

| # | Risk | Probability | Impact | Score | Mitigation |
|---|------|-------------|--------|-------|------------|
| B1 | Key team members leaving | 3 | 3 | 9 | Documentation standards; knowledge sharing; bus factor ≥2; competitive comp |
| B2 | Budget overrun | 3 | 3 | 9 | Monthly budget reviews; phase-gated spending; vendor cost alerts |
| B3 | Competitor releases similar product | 2 | 3 | 6 | PRV's depth of integration is hard to replicate; focus on execution speed |
| B4 | Vendor pricing changes | 2 | 3 | 6 | Abstraction layers; evaluate alternatives annually; multi-year contracts |
| B5 | Regulatory change (GDPR, AI regulation) | 2 | 4 | 8 | Regular compliance review; legal counsel; architecture designed for compliance |
| B6 | Enterprise customer churn | 2 | 4 | 8 | Strong onboarding; CSM program; quarterly business reviews |

### Risk Response
```
Score ≥ 10 (Critical): Active mitigation plan, monthly review meeting
Score 7–9 (High):      Mitigation plan written, quarterly review
Score 4–6 (Medium):    Monitor, ad hoc review if situation changes
Score 1–3 (Low):       Accept, document, no active mitigation

Risk owners:
  Technical risks:  Tech Lead
  Product risks:    Product Lead
  Security risks:   Security Engineer (Year 3) / Tech Lead (Years 1–2)
  Business risks:   CEO / Co-CEO
```

---

## H. MILESTONES

### Master Milestone Table

| ID | Phase | Week | Milestone | Success Criteria |
|----|-------|------|-----------|-----------------|
| M0 | 0 | 2 | Architecture validated | All 9 docs reviewed; 0 unresolved gaps; 8 tech decisions confirmed |
| M1 | 1 | 5 | Foundation live | Monorepo builds; CI green; 4 environments accessible |
| M2 | 2 | 10 | Auth complete | All auth methods E2E passing; RLS test matrix passing; audit logs verified |
| M3 | 3 | 15 | Multi-Company core | 19 roles enforced; scope validated; 3 test companies isolated |
| M4 | 4 | 22 | Design System | 50+ components in Storybook; glass rendering; motion; haptics on device |
| M5 | 5 | 26 | Navigation live | All 19 role navs; search <100ms; command palette working |
| M6 | 6 | 35 | Projects complete | Full project lifecycle; budget tracking; Gantt; analytics |
| **MVP** | **7** | **42** | **v1.0 Launch** | **Attendance + Workforce + Projects + all MVP launch criteria** |
| M7 | 8 | 48 | HR complete | Contracts, payroll, reviews, compliance |
| M8 | 9 | 57 | Shop complete | POS + inventory + orders + promotions |
| M9 | 10 | 63 | CRM complete | Lead pipeline + quotes + customer profiles |
| M10 | 11 | 70 | Finance complete | Revenue + expenses + cash flow + budgets |
| M11 | 12 | 75 | Documents complete | Vault + versions + signatures + retention |
| M12 | 13 | 80 | Communication live | DMs + channels + announcements + voice notes |
| M13 | 14 | 84 | Notifications live | All 6 channels + preferences + escalation |
| M14 | 15 | 91 | Analytics live | All 6 KPI domains + dashboards + reports + forecasting |
| M15 | 16 | 95 | Command Center live | Executive Cockpit + CEO 60s rule + L1–L5 alerts |
| M16 | 17 | 101 | AI Platform live | AI assistant + insights + forecasts + reports |
| M17 | 18 | 105 | Safety live | Incidents + checklists + compliance + PTW |
| M18 | 19 | 109 | Knowledge Base live | Policies + guides + AI-powered search |
| M19 | 20 | 114 | Learning Center live | Courses + certificates + compliance tracking |
| M20 | 21 | 119 | Procurement live | PO lifecycle + 3-way match + supplier scorecard |
| M21 | 22 | 125 | Tools & Fleet live | Asset registry + checkout + maintenance + fleet |
| M22 | 23 | 133 | Public App live | Home + Shop + Client Portal + online payments |
| M23 | 24 | 139 | Polish complete | Core Web Vitals Green; haptics; motion; accessibility AA |
| **LAUNCH** | **25** | **145** | **v2.0 Full Launch** | **All 21 modules; pen test clear; launch checklist 100%** |

### Go / No-Go Gates

```
Gate 1 — Week 5 (Foundation):
  □ CI pipeline: zero failures
  □ Environments: all 4 accessible
  □ Zero code committed with security issue
  → NO-GO: CI broken, any environment inaccessible

Gate 2 — Week 10 (Auth):
  □ RLS test matrix: zero failures
  □ All auth methods: E2E passing
  □ Security review: passed
  → NO-GO: any RLS bypass possible; any auth bypass found

Gate 3 — Week 22 (Design System):
  □ All 50+ components in Storybook
  □ Glass rendering: verified on physical iPhone
  □ Motion: all 5 spring curves working
  □ Accessibility: all components pass axe-core
  → NO-GO: glass design not meeting spec; accessibility failures

Gate 4 — Week 42 (MVP v1.0):
  → See MVP Go/No-Go Gate (Section D)

Gate 5 — Week 101 (AI Platform):
  □ Cross-company AI data isolation: verified (automated test)
  □ PII redaction: working before Claude API calls
  □ AI cost controls: per-company budget limits enforced
  □ AI audit log: every AI call captured
  → NO-GO: AI can access cross-company data; no cost controls

Gate 6 — Week 145 (Full Launch v2.0):
  → See Phase 25 Launch Checklist
  → All 100% checkboxes must be ticked
```

### Quarterly Reviews
```
Every 13 weeks — stakeholder review:

Q1  (Week 13): Auth + security foundations solid?
Q2  (Week 26): Design system + navigation complete? Quality bar met?
Q3  (Week 39): MVP on track? Launch scope confirmed?
Q4  (Week 52): Post-MVP modules progressing? Any scope changes?
Q5  (Week 65): Business modules (Shop, Finance, CRM) complete?
Q6  (Week 78): Platform modules (Docs, Communication, Notifications)?
Q7  (Week 91): Analytics complete? Ready for Command Center + AI?
Q8  (Week 104): Command Center + AI Platform delivered?
Q9  (Week 117): Operations modules (Safety, Knowledge, Learning)?
Q10 (Week 130): Procurement + Tools & Fleet complete?
Q11 (Week 143): Public App complete? Polish done? Launch prep?
Q12 (Week 145): Launch! v2.0 go-live confirmed.
```

---

## PART 2 SUMMARY

| Deliverable | Content |
|-------------|---------|
| Phases 13–25 | Communication, Notifications, Analytics, Command Center, AI Platform, Safety, Knowledge Base, Learning Center, Procurement, Tools & Fleet, Public App, Polish, Launch Prep |
| Team Structure | Year 1: 10 people → Year 3: 24 people |
| Development Order | Phase dependency graph + 4 parallelization windows |
| Release Strategy | Semver 0.1.0→2.0.0 + deployment pipeline + feature flags + hotfix SLA |
| MVP Strategy | Phases 0–7 (Week 42) — Projects + Attendance + Workforce |
| Enterprise Strategy | 3-tier multi-tenancy + onboarding automation + compliance roadmap |
| 10-Year Plan | Year 1 monolith → Year 10 microservices + data lake + platform + marketplace |
| Risk Register | 23 risks (Technical, Product, Security, Business) with mitigations |
| Milestones | 24 milestones + 6 go/no-go gates + 12 quarterly reviews |

**Total: 26 Phases (0–25) × 145 Weeks ≈ 2.8 Years**
**MVP Available: Week 42 (~10 months)**
**Full Platform v2.0: Week 145 (~33 months)**

---

*PRV Implementation Roadmap — Part 2 of 2*
*Source of Truth: All PRV Blueprint Documents*
*Next step after all blueprints approved: Begin Phase 0 — Architecture Validation*
