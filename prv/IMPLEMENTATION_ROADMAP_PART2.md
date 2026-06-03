# PRV IMPLEMENTATION ROADMAP — PART 2
# Phases 13–25 + Strategic Deliverables

**Document**: Implementation Roadmap Part 2 of 2
**Status**: Blueprint — Approved Architecture
**Continues from**: IMPLEMENTATION_ROADMAP_PART1.md (Phases 0–12)

---

## PART 2 OVERVIEW

This document covers:
- **Phases 13–25**: Remaining 13 modules + Launch Preparation
- **Team Structure**: Full org chart for 3-year build
- **Recommended Development Order**: Dependency-optimized sequence
- **Release Strategy**: Versioning, deployment, rollout
- **MVP Strategy**: Minimum Viable Product definition and timeline
- **Enterprise Strategy**: Multi-company scaling approach
- **10-Year Scalability Plan**: Architecture evolution
- **Risk Register**: Full risk matrix with mitigations
- **Milestones**: Checkpoints, gates, and go/no-go decisions

---

## PHASES 13–25

---

### PHASE 13: Communication Center
**Duration**: 5 weeks
**Cumulative Week**: ~100–105

#### Overview
Real-time enterprise communication layer — in-app messaging, channels, announcements, voice/video integration, integrated with all modules.

#### Deliverables

##### 13.1 — Direct Messaging
```
Features:
- 1:1 encrypted direct messages
- End-to-end encryption (E2E) for DMs
- Message status: sent / delivered / read (per recipient)
- Rich text: bold, italic, code, mentions (@user), links
- File attachments: images, documents, voice notes
- Message reactions (emoji)
- Reply threads (nested)
- Message search (full-text via Typesense)
- Message edit / delete (with audit trail)
- Message pinning
- Unread count badges
- Typing indicators (real-time via Supabase Realtime)
- Online / offline / away presence
- Message scheduling (send at specific time)
```

##### 13.2 — Channels & Groups
```
Features:
- Company-wide announcement channels (broadcast-only)
- Department channels (role-filtered visibility)
- Project channels (auto-created on project start)
- Store channels (auto-created per store)
- Custom channels (CEO / admins create)
- Channel roles: Owner / Admin / Member / Read-only
- Channel discovery (public channels searchable)
- Channel notifications: All / Mentions only / Muted
- Pinned messages per channel
- Channel member management
- Channel archive (no delete — compliance)
```

##### 13.3 — Announcements System
```
Features:
- Company-wide announcements (CEO / HR)
- Targeted announcements (by role / department / store)
- Announcement expiry dates
- Read receipts (% read tracking)
- Acknowledgment required (user must confirm read)
- Scheduled announcements
- Announcement history archive
- Push notification on new announcement
- Priority levels: Info / Important / Critical
```

##### 13.4 — Voice & Video (Integration Layer)
```
Strategy: Integration — not custom build
Providers: Daily.co or Livekit (self-hostable)

Features:
- Instant voice call (1:1 or group)
- Scheduled meetings (with calendar integration)
- Screen sharing
- Meeting recording (stored in Document Center)
- Meeting notes (AI-generated post-call summary)
- Call history
- Do Not Disturb mode
```

##### 13.5 — Communication + Module Integration
```
Auto-integrations:
- Project created → Project channel created automatically
- Task assigned → Notification + DM to assignee
- Invoice approved → Notification to Finance team
- Attendance anomaly → Alert to HR + TL
- Approval required → DM to approver
- AI insights → Posted to Intelligence channel
- Emergency alert → Broadcast to all active users
```

##### 13.6 — Communication Security
```
Security:
- Role-based channel visibility (scope enforcement)
- Company isolation (cannot message across companies)
- Message retention policies (configurable per company: 30d/90d/1yr/forever)
- DLP scanning on attachments
- Audit log: every message sent, edited, deleted
- GDPR: right to erasure respected with tombstoning
- Admin moderation: flag / remove / report messages
```

#### Dependencies
- Phase 2 (Auth — user sessions for presence)
- Phase 3 (Multi-Company — scope isolation)
- Phase 4 (Design System — glass components)
- Phase 14 (Notification Center — delivery routing)

---

### PHASE 14: Notification Center
**Duration**: 4 weeks
**Cumulative Week**: ~105–109

#### Overview
Universal notification bus — the delivery spine for all PRV events, routing to in-app, push, email, SMS.

#### Deliverables

##### 14.1 — Notification Engine Core
```typescript
// Notification event schema
interface NotificationEvent {
  id: string;
  type: NotificationType;
  category: NotificationCategory;
  priority: 'critical' | 'high' | 'normal' | 'low';
  source: {
    module: ModuleId;
    entityType: string;
    entityId: string;
    action: string;
  };
  recipients: {
    userId?: string;
    roleId?: string;
    companyId?: string;
    storeId?: string;
  }[];
  content: {
    title: string;
    body: string;
    data: Record<string, unknown>;
    deepLink?: string;
    imageUrl?: string;
  };
  delivery: {
    channels: DeliveryChannel[];
    scheduledAt?: Date;
    expiresAt?: Date;
  };
  groupKey?: string; // for notification grouping
  dedupeKey?: string; // for deduplication
  createdAt: Date;
}
```

##### 14.2 — Delivery Channels
```
Channels:
1. In-App (real-time via Supabase Realtime)
2. Push Notification (iOS APNs, Android FCM)
3. Email (Resend — transactional templates)
4. SMS (Twilio — critical alerts only)
5. Dynamic Island (iOS — live context)
6. Lock Screen Live Activity (iOS)
7. Slack integration (optional — enterprise)
8. Webhook (outbound — enterprise API consumers)
```

##### 14.3 — Notification Preferences
```
User-configurable per notification type:
- In-App: On/Off
- Push: On/Off
- Email: Immediate / Daily Digest / Off
- SMS: On/Off (critical only)
- Quiet Hours: From → To
- Do Not Disturb: Manual toggle
- Per-module override settings
- Per-company override settings
```

##### 14.4 — Notification Center UI
```
Features:
- Unified inbox: all notifications in one place
- Filter by: module / priority / date / read status
- Mark as read (individual / bulk / all)
- Mark as important
- Dismiss / archive
- Deep link: tap → navigate to source entity
- Grouping by: date / module / type
- Empty state design
- Real-time badge count updates
- Notification history (30/60/90 days configurable)
```

##### 14.5 — Notification Analytics
```
Tracking:
- Delivery rate per channel
- Open rate per notification type
- Time to read (median)
- Click-through rate (deep link)
- Opt-out rates by category
- Notification fatigue index (alert if user ignores >70%)
```

##### 14.6 — Notification Bus (Internal API)
```typescript
// Every module uses this interface to send notifications
interface NotificationBus {
  send(event: NotificationEvent): Promise<void>;
  sendBatch(events: NotificationEvent[]): Promise<void>;
  schedule(event: NotificationEvent, sendAt: Date): Promise<string>;
  cancel(notificationId: string): Promise<void>;
  getUserPreferences(userId: string): Promise<NotificationPreferences>;
}
```

#### Dependencies
- Phase 2 (Auth — user identity for delivery routing)
- Phase 3 (Multi-Company — scope)
- All modules (producer of notification events)

---

### PHASE 15: Analytics Platform
**Duration**: 7 weeks
**Cumulative Week**: ~109–116

#### Overview
Complete business intelligence layer — real-time KPIs, historical analysis, cross-module reporting, data warehouse, export infrastructure.

#### Deliverables

##### 15.1 — Analytics Data Pipeline
```
Architecture:
- Event stream: every user action emits an analytics event
- Inngest background processor: batch writes to analytics tables
- Materialized views: pre-aggregated KPIs refreshed every 5 minutes
- Historical snapshots: daily at 00:00 UTC (point-in-time data)
- Cross-company aggregation: CEO-level rolled-up metrics
- Data retention: hot (3 months PostgreSQL), warm (1 year), cold (archive S3)

Event schema:
{
  event_id: uuid,
  event_type: string, // 'project.created', 'invoice.paid', etc.
  actor_id: uuid,
  company_id: uuid,
  module: ModuleId,
  entity_type: string,
  entity_id: uuid,
  properties: jsonb,
  timestamp: timestamptz
}
```

##### 15.2 — KPI Framework
```
KPI Categories (6 domains):

1. Revenue KPIs
   - Total Revenue (daily/weekly/monthly/YTD)
   - Revenue by Company / Store / Product / Service
   - Revenue Growth Rate (MoM, YoY)
   - Average Order Value
   - Revenue per Employee

2. Operations KPIs
   - Active Projects (count / value)
   - Project Completion Rate
   - On-Time Delivery Rate
   - Task Completion Rate
   - Backlog Size

3. Workforce KPIs
   - Attendance Rate
   - Absenteeism Rate
   - Overtime Hours
   - Turnover Rate
   - Productivity Index

4. Financial KPIs
   - Gross Profit / Net Profit
   - Operating Expenses
   - Cash Position
   - Burn Rate
   - Accounts Receivable Days

5. Customer KPIs (CRM)
   - New Leads (weekly/monthly)
   - Conversion Rate
   - Customer Lifetime Value
   - Net Promoter Score
   - Churn Rate

6. Shop KPIs
   - Units Sold
   - Inventory Turnover
   - Stockout Rate
   - Return Rate
   - Basket Size
```

##### 15.3 — Report Builder
```
Features:
- Drag-and-drop report designer
- 15+ chart types: Line, Bar, Stacked Bar, Area, Pie, Donut, Scatter, Heatmap, Funnel, Gauge, Table, Pivot, Waterfall, Sankey, Treemap
- Dimension picker: any entity attribute
- Metric picker: any KPI or calculated field
- Date range selector: custom, presets (Today/7d/30d/Quarter/Year/Custom)
- Comparison mode: Period over Period
- Filter builder: any dimension
- Calculated fields (formula editor)
- Report templates: 50+ pre-built
- Save / share / schedule reports
- Export: PDF, Excel, CSV
- Embed reports in dashboards
```

##### 15.4 — Executive Intelligence Board
```
CEO-Level View:
- Company Health Score (composite index: 0–100)
- Revenue Trend (live sparkline)
- Headcount vs. Revenue ratio
- Top 5 Projects by value / risk
- Top 5 Performing Stores
- Budget vs. Actual (all companies)
- AI Executive Briefing (daily AI summary of business state)
- Anomaly Feed (unusual patterns detected by AI)
- Comparative: This Week vs. Last Week / This Month vs. Last Month
```

##### 15.5 — Analytics per Module
```
Each module gets its own analytics section:
- Projects: Gantt completion rates, budget burn, milestone hit rates
- Attendance: Heatmaps by day/hour, anomaly detection
- HR: Org chart analytics, role distribution, tenure analysis
- Shop: Sales heatmap, inventory aging, supplier performance
- Finance: P&L trend, cashflow forecast, expense categories
- CRM: Pipeline waterfall, conversion funnel, lead source analysis
- Procurement: Supplier scorecards, cost trends, delivery performance
```

##### 15.6 — Data Export & API
```
Export options:
- Scheduled email reports (PDF / Excel)
- Webhook push (raw data to external BI tools like Tableau, Power BI)
- REST API for analytics data (enterprise tier)
- CSV bulk export (any date range)
- Google Sheets integration (live refresh)
```

#### Dependencies
- All prior phases (analytics aggregates all module data)
- Phase 4 (chart component library in design system)

---

### PHASE 16: AI Center
**Duration**: 6 weeks
**Cumulative Week**: ~116–122

#### Overview
Enterprise AI platform — AI assistants, intelligent automation, predictive analytics, NLP, document intelligence, all powered by Claude API.

#### Deliverables

##### 16.1 — AI Assistant Core
```
Architecture:
- Model: Anthropic Claude API (claude-sonnet-4-6 default, claude-opus-4-8 for deep analysis)
- Vercel AI SDK for streaming responses
- Context window management: RAG over company data (Typesense + pgvector)
- Tool use: Claude can call PRV functions (query data, create records, send notifications)
- Session memory: per-user conversation history (Redis)
- Company context injection: company-specific data, terminology, products

Assistant capabilities:
- Answer questions about the business ("What's our revenue this month?")
- Execute actions ("Create a task for [user] on [project]")
- Analyze data ("Why did attendance drop this week?")
- Generate documents ("Draft a performance review for [employee]")
- Forecast ("What's our projected inventory shortfall next month?")
```

##### 16.2 — AI Tools (Function Calling)
```typescript
// Claude has access to these PRV tools via function calling
const aiTools = {
  query_projects: { /* fetch project data */ },
  query_attendance: { /* fetch attendance records */ },
  query_financials: { /* fetch financial data */ },
  query_inventory: { /* fetch stock levels */ },
  create_task: { /* create a task */ },
  create_notification: { /* send a notification */ },
  generate_report: { /* trigger a report */ },
  get_employee_info: { /* fetch workforce data */ },
  get_kpi_snapshot: { /* get current KPIs */ },
  search_documents: { /* search document center */ },
  get_approvals_pending: { /* check approval queue */ },
  query_analytics: { /* run analytics query */ },
};
```

##### 16.3 — AI Automations
```
Pre-built AI automations:
1. Daily CEO Briefing — 07:00: AI generates executive summary
2. Anomaly Alerts — Real-time: AI detects and alerts on outliers
3. Smart Scheduling — AI suggests optimal meeting times
4. Project Risk Scoring — AI evaluates project health daily
5. Invoice Fraud Detection — AI flags suspicious invoices
6. Attendance Pattern Analysis — AI detects absenteeism trends
7. Inventory Demand Forecasting — AI predicts stock needs
8. Performance Insights — AI generates team performance summaries
9. Cash Flow Forecasting — AI predicts 90-day cashflow
10. Lead Scoring — AI scores CRM leads by conversion probability
```

##### 16.4 — Document Intelligence
```
AI document processing:
- OCR: extract text from scanned documents, invoices, receipts
- Classification: auto-tag documents by type
- Data extraction: pull key fields from invoices (amount, date, vendor)
- Contract analysis: identify key clauses, expiry dates, obligations
- Translation: multi-language document translation
- Summarization: long document → executive summary
- Comparison: diff two contract versions
```

##### 16.5 — AI per Module
```
Module-specific AI features:

Projects:
- Estimate complexity from description
- Suggest team composition
- Predict deadline risk
- Generate project brief

Attendance:
- Predict absenteeism
- Anomaly detection
- Shift optimization suggestions

HR:
- Resume screening (for hiring)
- Performance trend analysis
- Compensation benchmarking

Finance:
- P&L narrative generation
- Expense categorization (OCR + NLP)
- Tax preparation assistance

Shop:
- Product description generation
- Demand forecasting
- Price optimization suggestions

CRM:
- Lead enrichment (public data lookup)
- Follow-up drafting
- Deal health scoring
```

##### 16.6 — AI Governance
```
Controls:
- AI action log: every AI action is audited
- Human-in-the-loop: AI cannot execute write operations without user confirmation (configurable)
- Confidence threshold: actions below 85% confidence require user approval
- AI explanation: every AI recommendation includes reasoning
- Feedback loop: thumbs up/down on AI outputs (improves prompts)
- Company data isolation: AI cannot access cross-company data
- PII handling: automatic PII redaction before sending to Claude API
- Cost tracking: per-company AI usage and cost dashboard
```

#### Dependencies
- All modules (AI aggregates data from all)
- Phase 15 (Analytics — AI uses KPI data)
- Phase 12 (Document Center — AI processes documents)

---

### PHASE 17: Approval Center
**Duration**: 4 weeks
**Cumulative Week**: ~122–126

#### Overview
Universal approval workflow engine — every approval-required action in PRV routes through here.

#### Deliverables

##### 17.1 — Approval Engine
```typescript
// Universal approval schema
interface ApprovalRequest {
  id: string;
  type: ApprovalType; // 'expense', 'leave', 'purchase', 'contract', etc.
  requestedBy: string;
  companyId: string;
  entityType: string;
  entityId: string;
  amount?: number; // for financial approvals
  priority: 'urgent' | 'normal' | 'low';
  
  workflow: ApprovalWorkflow;
  // workflow defines: sequential or parallel, who approves each step
  
  currentStep: number;
  steps: ApprovalStep[];
  status: 'pending' | 'approved' | 'rejected' | 'cancelled' | 'expired';
  
  dueAt?: Date;
  escalationAt?: Date; // auto-escalate if no action
  
  history: ApprovalHistoryEntry[];
  comments: ApprovalComment[];
  attachments: string[];
  metadata: Record<string, unknown>;
}
```

##### 17.2 — Approval Workflows (Pre-built)
```
Module              | Type                    | Approvers                     | SLA
--------------------|-------------------------|-------------------------------|------
Finance             | Expense Report          | Manager → Finance Director    | 48h
Finance             | Invoice Payment         | Finance Director → CEO (>5k)  | 24h
Finance             | Budget Request          | Director → CEO                | 72h
HR                  | Leave Request           | Team Leader → HR              | 24h
HR                  | Hire Request            | HR → Director → CEO           | 5d
HR                  | Termination             | HR → Director → CEO (Legal)   | 72h
Projects            | Project Start           | Project Director              | 48h
Projects            | Budget Increase         | Director → CEO                | 48h
Procurement         | Purchase Order          | Manager → Procurement Director| 24h
Procurement         | Supplier Contract       | Legal → Director → CEO        | 5d
Shop                | Discount >20%           | Store Manager                 | 4h
Shop                | Write-off               | Shop Director → Finance       | 24h
Documents           | Contract Sign           | Legal → CEO                   | 48h
Workforce           | Role Change             | HR → Director                 | 48h
```

##### 17.3 — Approval UI (Approver Experience)
```
Approval Center features:
- Unified queue: all pending approvals in one place
- Filter: by type / module / priority / due date
- Sort: newest / oldest / expiring soon
- Bulk approve (for low-risk batch approvals)
- One-tap approve / reject with comment
- Request more information (send back to requester)
- Delegate approval (if absent)
- Mobile-first: approve from notification tray
- Escalation view: overdue approvals highlighted
- My Delegations: see delegated approvals
- History: full approved/rejected log
```

##### 17.4 — Approval Requester Experience
```
Requester features:
- Submit approval request (inline from any module)
- Track status in real-time
- See who is on which step
- Add additional context / attachments post-submission
- Cancel if no longer needed
- Receive notification on each step change
- See estimated completion time
- Appeal rejected decisions (goes to higher approver)
```

##### 17.5 — Approval Analytics
```
Metrics:
- Average approval time by type
- Approval rate (approved vs. rejected %)
- SLA compliance rate
- Bottleneck analysis (which approver is slowest)
- Escalation rate
- Approval volume trend
- Cost of delayed approvals (for financial items)
```

#### Dependencies
- Phase 2 (Auth — approver identity)
- Phase 3 (Multi-Company — scope per company)
- Phase 14 (Notifications — approval request delivery)
- All modules that require approvals

---

### PHASE 18: Procurement Module
**Duration**: 6 weeks
**Cumulative Week**: ~126–132

#### Overview
End-to-end procurement lifecycle — purchase requests, purchase orders, supplier management, receiving, cost management.

#### Deliverables

##### 18.1 — Purchase Request → PO Lifecycle
```
Flow:
1. Purchase Request (any employee)
   - Item description, quantity, estimated cost, justification
   - Attachment: quote, spec sheet
   - Linked to: project / department / store
   
2. Approval Gate (Phase 17 Approval Center)
   - Routes by amount and company policy
   
3. Purchase Order Generation
   - Auto-drafted from approved request
   - Supplier selection (from supplier catalog)
   - PO number generation (sequential, company-specific)
   - Terms, delivery address, payment terms
   
4. Supplier Dispatch
   - Email PO to supplier (Resend)
   - Supplier confirmation tracking
   
5. Receiving
   - GRN (Goods Receipt Note) creation
   - Partial receipt handling
   - Quality check flag
   
6. Invoice Matching
   - 3-way match: PO ↔ GRN ↔ Invoice
   - Auto-match or manual reconciliation
   
7. Payment Approval → Finance
   - Routes to Finance module for payment
```

##### 18.2 — Supplier Catalog & Management
```
Supplier profile:
- Company details, tax ID, bank details
- Contact persons (multiple)
- Product/service categories supplied
- Payment terms, lead times, MOQ
- Contracts (linked to Document Center)
- Performance score (calculated from: on-time delivery, quality, pricing)
- Active / Inactive / Blacklisted status
- Notes, audit history

Supplier intelligence:
- Average delivery time
- Price trend history
- Quality rejection rate
- Preferred supplier auto-tag
- AI-generated supplier risk score
```

##### 18.3 — Procurement Analytics
```
Reports:
- Spend by supplier (monthly/quarterly/annual)
- Spend by category
- PO cycle time (request to receipt)
- Supplier performance scorecard
- Cost savings vs. budget
- Pending POs dashboard
- Overdue deliveries
- 3-way match discrepancy report
```

##### 18.4 — Procurement + Inventory Integration
```
When GRN created:
→ Auto-update inventory levels (Shop / Tool / Fleet modules)
→ Notify warehouse of incoming shipment
→ Auto-allocate to project if project-linked PO
```

#### Dependencies
- Phase 3 (Multi-Company — company-level procurement)
- Phase 9 (Shop — inventory updates)
- Phase 17 (Approvals — PO approval workflow)
- Phase 11 (Finance — invoice matching, payment)

---

### PHASE 19: Tool Management Module
**Duration**: 4 weeks
**Cumulative Week**: ~132–136

#### Overview
Enterprise asset registry for all company tools and equipment — checkout, maintenance, tracking, cost allocation.

#### Deliverables

##### 19.1 — Tool Registry
```
Tool record:
- Asset ID (barcode / QR code)
- Category: Power Tool / Hand Tool / Machinery / Equipment / Vehicle
- Make, Model, Serial Number, Purchase Date, Purchase Price
- Current Location (site / warehouse / vehicle)
- Current Custodian (employee assigned)
- Condition: Excellent / Good / Fair / Poor / Damaged / Retired
- Maintenance schedule
- Insurance record
- Warranty expiry
- Replacement value
- Linked project(s)
```

##### 19.2 — Checkout / Return System
```
Flow:
1. Employee requests tool (via app — barcode scan)
2. Approval if required (by value/type)
3. Tool checked out: custodian assigned, location updated
4. Usage logging (start/end time, project linked)
5. Return: condition check, photo evidence
6. Damage report if condition degraded (triggers approval/write-off)
7. Maintenance if needed before re-issue
```

##### 19.3 — Maintenance Scheduling
```
Features:
- Scheduled maintenance calendar (PM schedules)
- Maintenance request (employee reports issue)
- Service history log
- Cost tracking per tool
- Maintenance provider (internal / external)
- Out-of-service flag (prevents checkout)
- Next service due alert
- Calibration tracking (for measurement tools)
```

##### 19.4 — Tool Analytics
```
Reports:
- Tool utilization rate (% of time in use)
- Tools by location / project / employee
- Maintenance cost per tool
- Most-used tools (for procurement planning)
- Tools approaching end-of-life
- Cost allocation by project
- Lost / damaged tools report
```

#### Dependencies
- Phase 3 (Multi-Company scope)
- Phase 18 (Procurement — tool purchases)
- Phase 17 (Approvals — high-value checkouts)

---

### PHASE 20: Fleet Management Module
**Duration**: 5 weeks
**Cumulative Week**: ~136–141

#### Overview
Company vehicle fleet — tracking, maintenance, fuel, driver management, trip logging, cost allocation.

#### Deliverables

##### 20.1 — Vehicle Registry
```
Vehicle record:
- Vehicle ID, Make, Model, Year, License Plate, VIN
- Category: Car / Van / Truck / Machinery
- Company assigned
- Current driver (assigned)
- Current location (GPS last known)
- Fuel type, tank capacity
- Insurance expiry, Road tax expiry
- Service book
- Mileage current / at last service
- Documents: registration, insurance (linked to Document Center)
```

##### 20.2 — Trip Management
```
Trip record:
- Driver assigned
- Vehicle assigned
- Start / End: location, odometer, time
- Purpose (business / project / commute)
- Project linked (cost allocation)
- Fuel consumed (calculated or entered)
- Route map (GPS coordinates if available)
- Expenses on trip (tolls, parking, fuel receipts)
- Status: Planned / Active / Completed / Cancelled
```

##### 20.3 — Maintenance & Compliance
```
Features:
- Scheduled service calendar (by date or mileage)
- Service record log
- Compliance calendar: insurance renewal, road tax, MOT/ITP
- Reminder alerts: 30/14/7/1 day before expiry
- Out-of-service flag
- Repair request workflow
- Cost per vehicle report
```

##### 20.4 — Fuel Management
```
Features:
- Fuel log: date, litres, cost, mileage at fill
- Fuel card integration (manual or API)
- Fuel cost per km calculation
- Consumption anomaly detection (AI)
- Fuel budget vs. actual
```

##### 20.5 — Fleet Analytics
```
Reports:
- Fleet utilization rate
- Cost per vehicle (fuel + maintenance + depreciation)
- Top drivers (mileage, cost efficiency)
- Compliance status dashboard
- Trip log by driver / project / date
- CO2 emissions tracking
```

#### Dependencies
- Phase 3 (Multi-Company)
- Phase 18 (Procurement — vehicle purchases)
- Phase 11 (Finance — cost allocation)

---

### PHASE 21: Knowledge Base
**Duration**: 4 weeks
**Cumulative Week**: ~141–145

#### Overview
Company knowledge repository — SOPs, guides, policies, FAQs, wikis — searchable, role-aware, AI-enhanced.

#### Deliverables

##### 21.1 — Knowledge Architecture
```
Structure:
Knowledge Base
└── Company (scoped per company)
    └── Category (HR / Operations / Finance / Technical / Safety / etc.)
        └── Section
            └── Article

Article features:
- Rich text editor (Tiptap — block-based)
- Version history (every edit saved)
- Author + reviewer tracking
- Status: Draft / Review / Published / Archived
- Role-based visibility (who can see this article)
- Linked articles (internal links)
- Embedded media (images, videos, files)
- AI summary (auto-generated)
- Read confirmation required (optional)
- View count, helpfulness rating
- Comment section
- Print / Export to PDF
```

##### 21.2 — Knowledge Search
```
Search integration with Typesense:
- Full-text search across all articles
- Role-filtered results (user sees only articles they can access)
- Search by: title, content, category, tags, author
- Highlighted search results
- AI semantic search (find by meaning, not just keywords)
- "Did you mean?" suggestions
- Search analytics (what are users searching for?)
```

##### 21.3 — Knowledge + AI Integration
```
AI features:
- Ask AI: user asks a question → AI searches KB and synthesizes answer
- Article suggestions: AI suggests related articles
- Gap detection: AI identifies questions asked but not answered in KB
- Auto-summarization: AI generates summary for each article
- Translation: AI translates articles to other languages
- Quality check: AI flags outdated content for review
```

##### 21.4 — Knowledge Governance
```
Processes:
- Review cycle: articles flagged for review after X days (configurable)
- Approval workflow for publishing (optional)
- Audit log: all edits, publishes, access
- Owner assignment per article
- Expiry dates (auto-archive old articles)
- Mandatory read tracking (compliance)
```

#### Dependencies
- Phase 4 (Design System — rich text editor styling)
- Phase 16 (AI Center — semantic search, AI answers)
- Phase 12 (Document Center — article attachments)

---

### PHASE 22: Learning Center
**Duration**: 5 weeks
**Cumulative Week**: ~145–150

#### Overview
Employee learning and development platform — courses, certifications, compliance training, skill tracking.

#### Deliverables

##### 22.1 — Course Builder
```
Course structure:
Course
└── Module
    └── Lesson (video / document / quiz / practical)

Lesson types:
- Video (embedded, streamed from Supabase Storage)
- Document (PDF / slides view)
- Rich text (article format)
- Quiz (multiple choice, true/false, short answer)
- Practical (checklist + photo evidence submission)
- Scorm 1.2/2004 (import from external authoring tools)

Course settings:
- Required vs. Optional
- Role-based assignment (auto-assign to new employees by role)
- Deadline (completion required by date)
- Certificate on completion
- Prerequisite courses
- Passing score threshold
- Retry limit on quizzes
- Time estimate
- Company-specific visibility
```

##### 22.2 — Learning Paths
```
Learning paths:
- Onboarding Path: auto-assigned to new employees
- Role-based paths: specific curriculum per role
- Compliance path: mandatory legal/safety training
- Custom paths: managers assign custom curriculum

Progress tracking:
- % complete per course
- % complete per learning path
- Time spent learning
- Quiz scores
- Certificates earned
```

##### 22.3 — Compliance Training
```
Features:
- Mandatory compliance courses (Safety, GDPR, Code of Conduct)
- Deadline enforcement with escalation
- Certificate expiry tracking (re-certification)
- Compliance dashboard for HR (% complete across company)
- Overdue learners alert (auto-notification)
- Audit report for compliance audits
```

##### 22.4 — Certificates & Badges
```
Features:
- Auto-generate PDF certificate on course completion
- Digital badge system
- Certificate stored in employee profile (Document Center)
- Shared certificate (LinkedIn share option)
- Certificate expiry and renewal workflow
- Skills inventory: aggregate certificates = skill profile per employee
```

##### 22.5 — Learning Analytics
```
Reports:
- Completion rates (by course / department / role)
- Average time to complete
- Quiz pass/fail rates
- Most popular courses
- Knowledge gaps (low scores in quiz categories)
- Learning hours per employee (monthly)
- ROI tracking (training cost vs. performance improvement)
```

#### Dependencies
- Phase 8 (HR — employee profiles for assignment)
- Phase 12 (Document Center — certificate storage)
- Phase 17 (Approvals — course publication approval)

---

### PHASE 23: Safety Center
**Duration**: 4 weeks
**Cumulative Week**: ~150–154

#### Overview
Workplace safety management — incident reporting, risk assessments, safety inspections, permit-to-work, compliance tracking.

#### Deliverables

##### 23.1 — Incident Reporting
```
Incident types:
- Near miss
- Minor injury
- Major injury (medical treatment required)
- Dangerous occurrence
- Property damage
- Environmental incident

Incident record:
- Date, time, location
- Persons involved (employees, visitors, contractors)
- Witness names
- Description of what happened
- Immediate actions taken
- Root cause (5 Whys analysis)
- Contributing factors
- Corrective actions required
- Photos / evidence attachments
- Status: Reported / Under Investigation / Closed
- Regulatory reporting required (flag)
- Insurance notification required (flag)
```

##### 23.2 — Risk Assessment
```
Risk register:
- Hazard identification
- Risk scoring: Likelihood (1–5) × Severity (1–5) = Risk Score
- Risk category: Physical / Chemical / Biological / Ergonomic / Psychosocial
- Control measures (hierarchy of controls)
- Residual risk after controls
- Review date
- Responsible person
- Status: Active / Reviewed / Closed

Location-based risk assessments:
- Per site / per workplace / per task type
```

##### 23.3 — Safety Inspections
```
Inspection features:
- Scheduled inspection calendar
- Checklist builder (customizable per inspection type)
- Mobile inspection: photo evidence per item
- Pass / Fail / Action Required per item
- Auto-create corrective actions from failed items
- Inspection report PDF (auto-generated)
- Inspector signature capture
- Inspection history per location
```

##### 23.4 — Permit to Work
```
PTW types:
- Hot Work (welding, grinding, cutting)
- Confined Space Entry
- Working at Height
- Electrical Isolation
- Excavation

PTW workflow:
1. Request
2. Risk Assessment attached
3. Supervisor approval
4. Safety officer countersign
5. Active (permit displayed on site)
6. Suspension (if conditions change)
7. Close-out (work completed, area cleared)
```

##### 23.5 — Safety Analytics
```
Reports:
- TRIR (Total Recordable Incident Rate)
- LTIR (Lost Time Injury Rate)
- Near miss frequency rate
- Incidents by location / type / department
- Days Since Last Incident (per site)
- Open corrective actions (aging report)
- Inspection compliance rate
- Safety training completion (linked to Learning Center)
```

#### Dependencies
- Phase 8 (HR — employee records)
- Phase 22 (Learning Center — safety training)
- Phase 17 (Approvals — PTW approval)
- Phase 12 (Document Center — evidence storage)

---

### PHASE 24: Command Center
**Duration**: 4 weeks
**Cumulative Week**: ~154–158

#### Overview
Global operational command — unified real-time status across all companies, all modules, all critical systems. CEO and Sysadmin primary interface.

#### Deliverables

##### 24.1 — Command Center Architecture
```
Access:
- CEO: full visibility all companies
- Co-CEO: assigned companies
- Sysadmin: system health + all companies
- Shop Director: shop operations
- Project Director: project operations

Principle:
- Read-only aggregate view (no data entry in Command Center)
- All data sourced from individual modules in real-time
- Drill-down: click any metric → navigate to source module
- Alert-driven: surfaced issues, not full data exploration
```

##### 24.2 — Global Status Board
```
Panels:
1. Company Health (per company: revenue, headcount, active projects, alerts)
2. Operations Live (active projects, on-site workers, open tasks)
3. Financial Pulse (daily revenue, cash position, overdue invoices)
4. Workforce Status (who is on-site right now, attendance anomalies)
5. Alert Triage (all critical alerts requiring action: ranked by severity)
6. AI Briefing (AI-generated executive summary refreshed hourly)
7. System Health (Supabase, APIs, background jobs — Sysadmin only)
8. Approval Queue (pending approvals requiring CEO action)
```

##### 24.3 — Emergency Protocols
```
Emergency modes:
L1 - Info: yellow banner, non-urgent
L2 - Warning: orange alert, assigned to team
L3 - Critical: red alert, multiple notifications, escalation
L4 - Emergency: full lockdown mode available
L5 - Crisis: all-hands alert, PR mode, board notification

Emergency broadcast:
- Push notification to all active users (role-filtered)
- In-app banner on all screens
- SMS to senior leadership
- Auto-create emergency incident in Safety Center
```

##### 24.4 — Live Activity Map
```
Geospatial features:
- Workers currently on site (GPS check-in based)
- Active project sites on map
- Fleet vehicle positions (last known GPS)
- Store locations + live status
- Incident pins (open incidents on map)

Note: GPS tracking only during active check-in, GDPR compliant
```

##### 24.5 — Command Center Automation
```
Auto-triggers:
- Revenue drops >20% vs. yesterday → Alert
- Project deadline missed → Alert → escalation
- Attendance below 70% → Alert
- Cash position below threshold → Alert
- Open approval >48h → Escalation
- System error rate >1% → Alert to Sysadmin
- AI detects anomaly → Alert with AI explanation
```

#### Dependencies
- All modules (Command Center aggregates all)
- Phase 15 (Analytics — KPI data source)
- Phase 16 (AI — executive briefings)
- Phase 14 (Notifications — alert delivery)

---

### PHASE 25: Launch Preparation
**Duration**: 8 weeks
**Cumulative Week**: ~158–166 (≈ 3.2 years from Phase 0)

#### Overview
Production readiness — full QA, performance testing, security audit, data migration, soft launch, full launch.

#### Deliverables

##### 25.1 — Quality Assurance Sprint
```
QA scope:
- Unit tests: ≥80% coverage (Vitest)
- Integration tests: all API routes and database operations
- E2E tests: all 19 role user journeys (Playwright)
- Visual regression: screenshot diffs for all 50+ pages (Playwright)
- Accessibility audit: WCAG 2.1 AA compliance (axe-core)
- Performance audit: Core Web Vitals (LCP <2.5s, CLS <0.1, INP <200ms)
- Mobile performance: 60fps scrolling, <3s TTI on 4G
- Cross-browser: Safari, Chrome, Firefox, Edge (latest 2 versions)
- Cross-device: iPhone 12+, iPad, Android (Samsung/Pixel), Desktop
```

##### 25.2 — Security Audit
```
Security review:
- Full penetration test (external firm — 2 weeks)
- OWASP Top 10 verification
- Authentication bypass testing
- Privilege escalation testing
- SQL injection audit (Drizzle ORM — parameterized by default)
- XSS audit
- CSRF protection verification
- Rate limiting verification
- RLS policy audit (every table)
- Data leakage audit (cross-company)
- API security audit (auth on every route)
- Dependency vulnerability scan (npm audit)
- Secret scanning (GitHub Actions)
- Fix all critical and high findings before launch
```

##### 25.3 — Performance Optimization
```
Optimization tasks:
- Database query analysis (pg_stat_statements)
- Index review and missing index creation
- N+1 query elimination
- Redis caching for hot data (session, KPIs, navigation)
- Image optimization (next/image, WebP/AVIF)
- Code splitting audit (bundle analyzer)
- Edge caching strategy (Cloudflare)
- Supabase connection pooling (PgBouncer)
- Background job optimization (Inngest queue sizing)
- Typesense index optimization
```

##### 25.4 — Data Migration
```
Migration strategy:
- Data schema finalization (all migrations run, no pending)
- Seed data: demo company with full realistic dataset
- Migration scripts for any existing company data
- Rollback procedures documented
- Data validation scripts (integrity checks post-migration)
- Backup verification (restore test)
```

##### 25.5 — Soft Launch (Beta)
```
Beta program:
- Week 1: Internal team (5–10 users)
- Week 2: Select beta companies (2–3 companies, 50 users)
- Feedback collection: in-app feedback widget
- Issue tracker: Sentry + GitHub Issues
- Weekly beta review meetings
- Critical bug SLA: fix within 24 hours
- Minor bug SLA: fix within 1 week
- Beta: no SLA guarantees on data, backup frequency 6h
```

##### 25.6 — Full Launch
```
Launch checklist:
□ All critical and high security findings resolved
□ E2E tests passing: 100%
□ Unit test coverage: ≥80%
□ Core Web Vitals: all Green
□ Uptime monitoring: Cloudflare Health Checks active
□ Error monitoring: Sentry configured, alerts set
□ Log monitoring: Axiom dashboards configured
□ Backup: automated daily backups with weekly restore test
□ On-call rotation: defined (who responds to P0 incidents)
□ Runbook: incident response documented
□ Status page: public status page configured
□ SLA: committed uptime 99.9% (≈8.7 hours downtime/year)
□ Legal: Terms of Service, Privacy Policy, DPA published
□ GDPR: DPA signed with Supabase, Anthropic, Resend, Cloudflare
□ Support: help desk configured (Intercom or Linear)
```

---

## STRATEGIC DELIVERABLES

---

## A. TEAM STRUCTURE

### Year 1 Core Team (Phases 0–7, Weeks 0–42)

```
Technical Leadership
├── Lead Architect / Tech Lead (1) — system architecture, code review, tech decisions
└── Product Lead (1) — product decisions, user research, prioritization

Engineering (6 engineers)
├── Backend Engineer × 2 — API, database, background jobs, auth
├── Frontend Engineer × 2 — Next.js, design system, component library
├── Mobile Engineer × 1 — React Native (iOS + Android)
└── DevOps / Platform Engineer × 1 — CI/CD, Vercel, Supabase, monitoring

Design
└── UI/UX Designer × 1 — Liquid Glass design system, all screens

QA
└── QA Engineer × 1 — test automation, manual testing

Total Year 1: 11 people
```

### Year 2 Growth Team (Phases 8–18, Weeks 43–132)

```
Engineering additions:
├── Backend Engineer × 2 (total: 4 BE)
├── Frontend Engineer × 1 (total: 3 FE)
├── Mobile Engineer × 1 (total: 2 Mobile)
└── AI/ML Engineer × 1 — Claude integration, AI automation, RAG

Design
└── UI/UX Designer × 1 (total: 2 designers)

QA
└── QA Engineer × 1 (total: 2 QA)

Data
└── Data Engineer × 1 — analytics pipeline, data warehouse

Total Year 2 additions: 7 people
Year 2 total team: 18 people
```

### Year 3 Scale Team (Phases 19–25, Weeks 133–166)

```
Engineering additions:
├── Backend Engineer × 1 (total: 5 BE)
├── Security Engineer × 1 — dedicated security, pen testing, compliance
└── Platform Engineer × 1 (total: 2 DevOps)

Design
└── Motion Designer × 1 — animations, microinteractions

QA
└── Performance Engineer × 1 — load testing, optimization

Customer Success
├── Solutions Architect × 1 — enterprise onboarding
└── Technical Support × 1 — tier 2 support

Total Year 3 additions: 6 people
Year 3 total team: 24 people
```

### Team Principles
```
1. Every engineer owns their module end-to-end (BE + FE + tests)
2. Code review: minimum 1 reviewer, 2 for critical paths (auth, finance, security)
3. On-call rotation: 2 engineers, weekly rotation, P0 response <15 minutes
4. Documentation: every API endpoint documented in code
5. No single point of failure: knowledge sharing, pair programming on critical modules
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
                    │           └── Phase 6 (Projects)
                    │           └── Phase 7 (Attendance)
                    │                 └── [MVP CHECKPOINT - Week 42]
                    │           └── Phase 8 (HR)
                    │           └── Phase 9 (Shop)
                    │           └── Phase 10 (CRM)
                    │           └── Phase 11 (Finance)
                    │           └── Phase 12 (Documents)
                    └── Phase 13 (Communication) — after Phase 5
                    └── Phase 14 (Notifications) — after Phase 2
                          └── Phase 15 (Analytics) — after Phase 6–12
                          └── Phase 16 (AI Center) — after Phase 15
                          └── Phase 17 (Approvals) — after Phase 14
                                └── Phase 18 (Procurement) — after Phase 17
                                └── Phase 19 (Tool Mgmt) — after Phase 18
                                └── Phase 20 (Fleet Mgmt) — after Phase 18
                    └── Phase 21 (Knowledge Base) — after Phase 12
                    └── Phase 22 (Learning Center) — after Phase 21
                    └── Phase 23 (Safety Center) — after Phase 22
                    └── Phase 24 (Command Center) — after Phase 15, 16
                    └── Phase 25 (Launch Prep) — after ALL
```

### Parallelization Strategy
```
Weeks 1–26 (Phases 0–5): Sequential — Foundation must complete before modules

Weeks 27–80 (Phases 6–12): Parallel opportunity
  - Two teams running simultaneously:
    Team A: Projects → HR → Finance
    Team B: Attendance → Shop → CRM → Documents

Weeks 81–132 (Phases 13–18): Parallel opportunity
  - Team A: Communication + Notifications + Analytics
  - Team B: AI Center + Approvals + Procurement

Weeks 133–158 (Phases 19–24): Parallel opportunity
  - Team A: Tool + Fleet + Knowledge Base
  - Team B: Learning + Safety + Command Center

Weeks 159–166 (Phase 25): All hands → Launch Preparation
```

### Recommended Sprint Cadence
```
Sprint length: 2 weeks
Sprint planning: Monday, Sprint 1 Week 1
Sprint review + retrospective: Friday, Sprint 2 Week 2
Daily standup: 09:30, 15 minutes, async (Slack thread) + live if needed
Demo: End of each Phase — demo to stakeholders

Definition of Done:
□ Code reviewed and merged
□ Unit tests written and passing
□ E2E tests for happy path
□ Accessibility check passed
□ Performance check (no regressions)
□ Documentation updated
□ Product Lead sign-off
```

---

## C. RELEASE STRATEGY

### Version Schema
```
Format: MAJOR.MINOR.PATCH (Semantic Versioning)

MAJOR: Breaking changes, significant architecture changes
MINOR: New features, new modules, new roles
PATCH: Bug fixes, performance improvements, security patches

Example progression:
0.1.0 — Phase 1 complete (Foundation)
0.2.0 — Phase 2 complete (Auth)
0.3.0 — Phase 3 complete (Multi-Company)
0.4.0 — Phase 4–5 complete (Design System + Navigation)
0.5.0 — Phase 6 complete (Projects)
0.6.0 — Phase 7 complete (Attendance)
1.0.0 — MVP Release (Post Phase 7)
1.1.0 — Phase 8 (HR)
1.2.0 — Phase 9 (Shop)
...
2.0.0 — Full Platform Release (Post Phase 25)
```

### Deployment Strategy
```
Branches:
- main: production (tagged releases)
- staging: staging environment (auto-deploy from PRs merged)
- feature/*: development branches

Deployment pipeline:
1. Developer opens PR from feature/* → staging
2. CI runs: lint, type-check, unit tests, E2E tests
3. PR reviewed (1–2 reviewers)
4. Merge to staging → auto-deploy to staging environment
5. QA verification on staging
6. Product Lead sign-off
7. Release tag created on main
8. Auto-deploy to production via Vercel
9. Smoke tests run post-deploy
10. Monitoring for 2h post-deploy (error rate, latency)

Rollback procedure:
- Vercel instant rollback to previous deployment (<1 minute)
- Database migrations: always forward-only (no destructive rollbacks)
- Feature flags: disable broken features without rollback
```

### Feature Flags
```
Implementation: Unkey or custom flag table in Postgres

Flag types:
- Company flag: enable feature for specific company
- Role flag: enable feature for specific roles
- Gradual rollout: enable for % of users
- Kill switch: disable feature instantly

Use cases:
- Beta features (company-level)
- New module rollout (gradual)
- Emergency disable (kill switch)
- A/B testing

Flag naming: snake_case, e.g.:
- feature_ai_assistant_v2
- module_fleet_management
- rollout_new_dashboard_ui
```

### Hotfix Process
```
P0 (System down / Data loss / Security breach):
- On-call engineer → immediate response
- Fix on hotfix/* branch
- 1 reviewer minimum
- Deploy to production: 1–2 hours max
- Post-mortem within 24 hours

P1 (Major feature broken, workaround exists):
- Fix within 4 hours
- Normal PR process but expedited

P2 (Minor bug, no workaround):
- Fix in next sprint

SLA summary:
- P0: 1–2h fix
- P1: 4h fix
- P2: next sprint
```

---

## D. MVP STRATEGY

### MVP Definition
```
MVP = Minimum Viable Product for PRV's PRIMARY use case:
→ A company can manage its Projects, Attendance, and Workforce in PRV
→ CEO can see real-time business overview
→ Employees can clock in/out, view tasks, receive notifications

MVP is complete after Phase 7 (≈ Week 42)
```

### MVP Scope (What's Included)
```
✓ Phase 0: Architecture Validation
✓ Phase 1: Foundation (monorepo, CI/CD, environments)
✓ Phase 2: Auth & Security (email/password, Face ID, MFA, sessions, RLS)
✓ Phase 3: Multi-Company Core (company hierarchy, 19 roles, scope system)
✓ Phase 4: Design System (full Liquid Glass component library)
✓ Phase 5: Navigation System (floating tabs, search, command palette)
✓ Phase 6: Projects Module (full project lifecycle)
✓ Phase 7: Attendance & Workforce (clock-in/out, scheduling, workforce mgmt)

Bonus (high value, feasible in MVP):
✓ Phase 14 partial: Push notifications (in parallel with Phase 4)
✓ Phase 5 partial: Universal Inbox (basic version)
```

### MVP NOT Included (Post-MVP)
```
✗ Shop Module (Phase 9)
✗ Finance Module (Phase 11)
✗ CRM Module (Phase 10)
✗ AI Center (Phase 16)
✗ Analytics Platform (Phase 15) — basic KPI dashboard included, full BI post-MVP
✗ Communication Center (Phase 13)
✗ All secondary modules (Phases 18–24)
```

### MVP Success Metrics
```
Technical:
- Uptime: ≥99.5% (4.3 hours downtime/month max)
- P95 API response time: <500ms
- Core Web Vitals: all Green
- Zero critical security vulnerabilities

Product:
- 3 companies using PRV (paying or pilot)
- 50+ active users
- NPS (Net Promoter Score) ≥ 30
- Daily Active Users / Monthly Active Users ≥ 40%
- Churn: <5% monthly (companies)

Feature Adoption:
- Projects module: 80% of eligible users active
- Attendance module: 90% clock-in via app (vs. paper/Excel)
- CEO 60-Second Rule: CEO reports finding what they need within 60s
```

### MVP Launch Criteria (Go / No-Go Gate)
```
GO requires ALL of the following:
□ All Phase 0–7 features complete
□ E2E test coverage: ≥70%
□ Zero P0 / P1 open bugs
□ Security review complete (at least internal)
□ Performance: Core Web Vitals all Green
□ Accessibility: WCAG 2.1 AA
□ CEO 60-Second Rule validated with real user test
□ Backup and recovery tested
□ On-call process in place
□ User documentation for all 19 roles (at least getting-started guide)
```

### Post-MVP Roadmap (Version 1.x)
```
v1.1.0 — HR Module (Phase 8) — Week 48
v1.2.0 — Shop Module (Phase 9) — Week 57
v1.3.0 — CRM Module (Phase 10) — Week 63
v1.4.0 — Finance Module (Phase 11) — Week 70
v1.5.0 — Document Center (Phase 12) — Week 75
v1.6.0 — Communication Center (Phase 13) — Week 80
v1.7.0 — Notification Center (Phase 14) — Week 84
v1.8.0 — Analytics Platform (Phase 15) — Week 91
v1.9.0 — AI Center (Phase 16) — Week 97
v2.0.0 — Full Platform — Week 166
```

---

## E. ENTERPRISE STRATEGY

### Multi-Tenancy Architecture
```
Tier 1: Company isolation (standard)
- Row-Level Security (RLS) on all tables
- company_id on every record
- API-level company_id injection from JWT
- No cross-company queries without explicit CEO/Sysadmin permission

Tier 2: Company groups (enterprise)
- Multiple companies under one group
- Cross-company analytics (CEO-level)
- Shared supplier catalog
- Shared workforce pool (cross-company assignments)

Tier 3: White label (partner)
- Custom domain per company
- Custom branding (logo, company name)
- Custom email sending domain
- Dedicated Supabase project (optional — for highest isolation)
```

### Enterprise Pricing Tiers
```
Tier             | Users    | Storage | AI    | Support | Price
-----------------|----------|---------|-------|---------|--------
Starter          | ≤25      | 10GB    | Basic | Email   | TBD
Professional     | ≤100     | 100GB   | Full  | Priority| TBD
Enterprise       | Unlimited| 1TB+    | Full  | SLA     | Custom
White Label      | Unlimited| Custom  | Full  | Dedicated| Custom

Notes:
- Pricing to be finalized with business team
- AI usage billed separately (usage-based, Claude API cost pass-through + margin)
- Storage: Supabase Storage (S3-compatible)
```

### Onboarding Architecture
```
New company setup: automated
1. Company registration (CEO creates account)
2. Auto-provisioning:
   - company record created
   - default roles created (19 roles, standard permissions)
   - default settings applied
   - seed data: demo project, demo employee (optional)
3. Guided setup wizard (6 steps):
   Step 1: Company profile (name, logo, timezone, currency)
   Step 2: First team members (invite by email)
   Step 3: Assign roles (auto-suggested by invitation)
   Step 4: First project or first store setup
   Step 5: Integrate calendar / email
   Step 6: Download mobile app
4. 30-day check-in: automated health check email
5. 60-day review: assigned CSM (Customer Success Manager)
```

### Enterprise Compliance
```
Standards supported:
- GDPR (EU data protection)
- ISO 27001 (information security management) — roadmap
- SOC 2 Type II — roadmap Year 3
- HIPAA — not in scope initially

Compliance features:
- Data Processing Agreement (DPA) — per customer
- Data residency: EU region option (Supabase EU)
- Right to erasure: implemented in all modules
- Data portability: full export in JSON/CSV
- Audit logs: 7-year retention
- Penetration test reports: provided annually
```

### Enterprise Scalability
```
Database scaling path:
Phase 1 (MVP): Single Supabase project — handles ~10,000 users
Phase 2 (Growth): Read replicas for analytics queries
Phase 3 (Scale): Horizontal sharding by company_id for 100k+ users
Phase 4 (Enterprise): Dedicated Supabase project per large enterprise

Compute scaling:
- Vercel: auto-scales serverless (no capacity planning)
- Supabase: upgrade plan as user count grows
- Redis (Upstash): auto-scales, per-request billing
- Inngest: auto-scales event processing

Storage scaling:
- Supabase Storage (S3-compatible): unlimited scale
- CDN: Cloudflare handles edge caching

Cost at scale (estimates):
Users: 10,000 — estimated infra cost: ~$2,000/month
Users: 50,000 — estimated infra cost: ~$7,000/month
Users: 100,000 — estimated infra cost: ~$15,000/month
```

---

## F. 10-YEAR SCALABILITY PLAN

### Year 1 (MVP → v1.0): Foundation
```
Goal: Prove the product works
Scale: 3–10 companies, 25–200 users each

Architecture:
- Monolithic Next.js app (App Router)
- Single PostgreSQL (Supabase)
- Single Redis instance
- All background jobs on Inngest
- Single Typesense cluster

Focus:
- Core modules (Projects, Attendance, Shop, Finance)
- Mobile apps (iOS + Android)
- 99.5% uptime
- NPS > 30
```

### Year 2: Product-Market Fit
```
Goal: Find repeatable growth
Scale: 10–50 companies, 500–2,000 total users

Architecture changes:
- Read replicas (analytics queries separated from OLTP)
- CDN caching for static assets and API responses
- Improved caching strategy (Redis for hot data)
- Mobile apps mature (offline mode, background sync)

Focus:
- All 21 modules shipped
- AI features mature
- Analytics platform complete
- Enterprise tier launched
- SOC 2 audit started
```

### Year 3: Scale
```
Goal: Rapid growth
Scale: 50–200 companies, 2,000–10,000 users

Architecture changes:
- API gateway layer (rate limiting, routing)
- Background job workers scaled horizontally
- Dedicated analytics database (TimescaleDB or ClickHouse)
- Search cluster scaled (multi-node Typesense)
- Global CDN for media assets

Focus:
- SOC 2 Type II certification
- White label product
- API for third-party integrations
- Partner ecosystem
```

### Year 4–5: Enterprise Dominance
```
Goal: Enterprise market penetration
Scale: 200–1,000 companies, 10,000–100,000 users

Architecture changes:
- Microservices extraction for high-traffic modules (AI, Notifications)
- Event sourcing for audit and compliance
- Multi-region deployment (EU + US + APAC)
- Dedicated database clusters for enterprise customers
- GraphQL API layer (for flexibility)

Focus:
- Dedicated enterprise CSM team
- Custom integration marketplace
- Advanced AI features (custom model fine-tuning)
- Industry-specific versions (Construction, Retail, Healthcare)
```

### Year 6–10: Platform
```
Goal: Become the dominant Company OS
Scale: 1,000+ companies, 100,000+ users

Architecture changes:
- Full microservices architecture
- Event-driven architecture (Kafka/Redpanda)
- Data lake (Iceberg on S3)
- ML pipeline for custom predictive models
- Edge computing for real-time features
- Blockchain for audit trail immutability (optional)

Focus:
- Platform API (build on top of PRV)
- App marketplace (third-party extensions)
- AI personalization (company-specific model tuning)
- International expansion
- IPO readiness (financial controls, compliance)
```

### Technology Evolution Path
```
Current Stack → Evolution

Next.js → Next.js (stays current, major version upgrades)
PostgreSQL → PostgreSQL + ClickHouse (analytics)
Drizzle ORM → Drizzle (stays)
Supabase → Supabase + dedicated DB for enterprise
Redis → Redis Cluster
Inngest → Inngest + Kafka (Year 4+)
Typesense → Typesense Cluster
Anthropic → Anthropic + custom fine-tuned models
Vercel → Vercel + edge functions
Cloudflare → Cloudflare Enterprise
```

### Database Scaling Strategy
```
Stage 1 (Year 1): 
- Single Supabase project
- Vertical scaling (Pro → Business plan)
- Connection pooling (PgBouncer, built into Supabase)

Stage 2 (Year 2–3):
- Read replica for analytics
- Partitioning: time-series tables (audit logs, events, analytics)
  → partition by month
- Archiving: data older than 2 years → cold storage

Stage 3 (Year 3–4):
- Horizontal sharding by company_id
- Companies 1–1000 → Shard A
- Companies 1001–2000 → Shard B
- etc.

Stage 4 (Year 5+):
- Dedicated database per major enterprise customer
- CQRS: Command/Query Responsibility Segregation
- Event sourcing for immutable audit trail

Invariant: company_id is always present on every record.
This is the sharding key and will never change.
```

---

## G. RISK REGISTER

### Risk Matrix
```
Probability: 1 (Rare) → 5 (Certain)
Impact: 1 (Negligible) → 5 (Critical)
Risk Score = Probability × Impact
```

### Technical Risks

| # | Risk | P | I | Score | Mitigation |
|---|------|---|---|-------|------------|
| T1 | Scope creep expands timeline beyond plan | 4 | 3 | 12 | Strict phase gates; no phase starts before previous 100% complete |
| T2 | PostgreSQL RLS performance at scale | 3 | 4 | 12 | Benchmark at 1M rows; index strategy; test at 10x expected load |
| T3 | Supabase vendor lock-in | 2 | 4 | 8 | Abstraction layer (repository pattern); standard PostgreSQL; export scripts |
| T4 | Anthropic API rate limits / cost spike | 3 | 3 | 9 | Rate limiting per company; cost budgets; fallback to simpler responses |
| T5 | Real-time performance (Supabase Realtime) | 3 | 3 | 9 | Load test 10,000 concurrent connections; Cloudflare WebSocket fallback |
| T6 | Mobile app store rejection | 2 | 4 | 8 | Follow HIG strictly; privacy labels correct; no prohibited APIs |
| T7 | Database migration failure in production | 2 | 5 | 10 | All migrations tested on staging clone; rollback scripts; maintenance window |
| T8 | Search performance degradation (Typesense) | 2 | 3 | 6 | Benchmark at 10M documents; index optimization; caching |
| T9 | Background job failures (Inngest) | 2 | 3 | 6 | Dead letter queue; retry logic; alerting on failure rate |
| T10 | Third-party API outage (Resend, Upstash) | 3 | 2 | 6 | Fallback providers; graceful degradation; SLA monitoring |

### Product Risks

| # | Risk | P | I | Score | Mitigation |
|---|------|---|---|------------|---|
| P1 | Product complexity overwhelming users | 3 | 4 | 12 | Progressive disclosure; role-based views; onboarding wizard; UX testing |
| P2 | Mobile performance not meeting expectations | 3 | 4 | 12 | Performance budgets; weekly Lighthouse CI; 60fps requirement enforced |
| P3 | Feature adoption slower than expected | 3 | 3 | 9 | In-app tutorials; feature flags for gradual rollout; user feedback loops |
| P4 | Navigation complexity (21 modules) | 3 | 3 | 9 | Navigation architecture validated in blueprints; max 3 levels enforced |
| P5 | Role permission conflicts in complex scenarios | 2 | 4 | 8 | Full permission matrix in ROLE_ARCHITECTURE.md; comprehensive tests |
| P6 | Offline mode edge cases (mobile) | 3 | 3 | 9 | Define offline scope clearly; conflict resolution strategy; sync queue |

### Security Risks

| # | Risk | P | I | Score | Mitigation |
|---|------|---|---|-------|------------|
| S1 | Data breach (unauthorized company access) | 2 | 5 | 10 | RLS on all tables; penetration testing; Zero Trust enforcement |
| S2 | Privilege escalation attack | 2 | 5 | 10 | 7-gate auth chain; role validation on every API route; automated tests |
| S3 | JWT token theft / session hijacking | 2 | 4 | 8 | Short-lived JWTs (1h); refresh token rotation; device binding |
| S4 | Supply chain attack (npm dependency) | 3 | 4 | 12 | Dependabot; npm audit in CI; locked lockfile; no unvetted dependencies |
| S5 | AI prompt injection attack | 3 | 3 | 9 | Input sanitization; system prompt hardening; output validation |
| S6 | Audit log tampering | 1 | 5 | 5 | Append-only audit table; SHA-256 chaining; Sysadmin only access |
| S7 | DDoS attack | 2 | 4 | 8 | Cloudflare DDoS protection; rate limiting; auto-scaling |

### Business Risks

| # | Risk | P | I | Score | Mitigation |
|---|------|---|---|-------|------------|
| B1 | Team member departures | 3 | 3 | 9 | Documentation standards; knowledge sharing; competitive compensation |
| B2 | Budget overrun | 3 | 3 | 9 | Monthly budget reviews; phase-gated spending; vendor cost alerts |
| B3 | Competitor releases similar product | 2 | 3 | 6 | PRV's strength = depth of integration; not easily replicated |
| B4 | Key vendor pricing changes (Supabase, Vercel) | 2 | 3 | 6 | Abstraction layer; evaluate alternatives annually |
| B5 | Regulatory change (GDPR, AI regulation) | 2 | 4 | 8 | Regular compliance review; legal counsel on retainer |
| B6 | Enterprise customer churn | 2 | 4 | 8 | Strong onboarding; CSM program; quarterly business reviews |

### Risk Response Plan
```
Critical risks (Score ≥ 10): Active mitigation plan, monthly review
High risks (Score 7–9): Mitigation plan, quarterly review
Medium risks (Score 4–6): Monitor, ad hoc review
Low risks (Score 1–3): Accept, document

Risk owner: Tech Lead is responsible for all technical risks
Product risks: Product Lead
Security risks: Security Lead (or outsourced security firm)
Business risks: CEO / Co-CEO
```

---

## H. MILESTONES & CHECKPOINTS

### Master Milestone Table

| Milestone | Phase | Week | Deliverable | Success Criteria |
|-----------|-------|------|-------------|-----------------|
| M0 | Phase 0 | 2 | Architecture validated | All 8 tech decisions confirmed; risk analysis approved |
| M1 | Phase 1 | 5 | Foundation complete | Monorepo running; CI/CD green; all environments live |
| M2 | Phase 2 | 10 | Auth complete | Login flow E2E passing; MFA working; Face ID on device |
| M3 | Phase 3 | 15 | Multi-Company core | 19 roles enforced; RLS tested; 3 demo companies |
| M4 | Phase 4 | 22 | Design System | Storybook live; all 50+ components; Liquid Glass passing |
| M5 | Phase 5 | 26 | Navigation | All 19 role navs working; Search live; Command Palette |
| M6 | Phase 6 | 35 | Projects Module | Full project lifecycle working; CEO KPI dashboard live |
| **MVP** | **Phase 7** | **42** | **MVP Release v1.0** | **Projects + Attendance + Workforce operational** |
| M7 | Phase 8 | 48 | HR Module | Leave, payroll, org chart working |
| M8 | Phase 9 | 57 | Shop Module | POS + inventory + orders working |
| M9 | Phase 10 | 63 | CRM Module | Lead pipeline working; client portal accessible |
| M10 | Phase 11 | 70 | Finance Module | Invoices + P&L + cash flow live |
| M11 | Phase 12 | 75 | Document Center | Document vault + contract templates live |
| M12 | Phase 13 | 80 | Communication | DMs + channels + announcements live |
| M13 | Phase 14 | 84 | Notifications | All channels live; preference center working |
| M14 | Phase 15 | 91 | Analytics | Full BI platform; 50+ pre-built reports |
| M15 | Phase 16 | 97 | AI Center | AI assistant answering business questions |
| M16 | Phase 17 | 101 | Approval Center | All approval workflows automated |
| M17 | Phase 18 | 107 | Procurement | Full PO lifecycle; 3-way match |
| M18 | Phase 19 | 111 | Tool Management | Asset registry; checkout system live |
| M19 | Phase 20 | 116 | Fleet Management | Vehicle registry; trip logging live |
| M20 | Phase 21 | 120 | Knowledge Base | Company wikis searchable by AI |
| M21 | Phase 22 | 125 | Learning Center | Courses; certifications; compliance training |
| M22 | Phase 23 | 129 | Safety Center | Incident reporting; PTW; risk register |
| M23 | Phase 24 | 133 | Command Center | CEO global status board live |
| **LAUNCH** | **Phase 25** | **166** | **Full Platform v2.0** | **All 21 modules; security audit; launch criteria met** |

### Go / No-Go Gates
```
Gate 1 — Week 5 (Post Foundation):
□ CI/CD pipeline green
□ All environments accessible
□ Team onboarded to monorepo
→ NO-GO if: CI broken, environments not provisioned

Gate 2 — Week 10 (Post Auth):
□ Auth E2E tests passing
□ RLS verified for all test scenarios
□ Security review of auth system passed
→ NO-GO if: any auth bypass found; MFA not working

Gate 3 — Week 22 (Post Design System):
□ Storybook deployed
□ All glass components rendering correctly
□ Motion system implemented
□ Accessibility audit passed
→ NO-GO if: glass design not meeting spec; a11y failures

Gate 4 — Week 42 (MVP):
→ See MVP Launch Criteria (Section D)
→ This is the most critical gate

Gate 5 — Week 97 (AI Center):
□ Claude API integrated with PRV data
□ AI cannot access cross-company data (verified)
□ PII redaction working
□ AI cost controls in place
→ NO-GO if: security of AI data access not verified

Gate 6 — Week 166 (Full Launch):
→ See Phase 25.6 Launch Checklist
→ All items must be checked
```

### Quarterly Reviews
```
Every 13 weeks, full project review:
Q1 (Week 13): Architecture foundations solid?
Q2 (Week 26): Design system and navigation complete?
Q3 (Week 39): MVP on track?
Q4 (Week 52): Post-MVP modules progressing?
Q5 (Week 65): Business modules (Shop, Finance, CRM) complete?
Q6 (Week 78): Platform modules (Docs, Communication, Notifications)?
Q7 (Week 91): Intelligence layer (Analytics, AI)?
Q8 (Week 104): Workflow automation complete?
Q9 (Week 117): Secondary modules (Tool, Fleet)?
Q10 (Week 130): Knowledge, Learning, Safety?
Q11 (Week 143): Command Center + pre-launch?
Q12 (Week 156): Launch preparation?
```

---

## PART 2 SUMMARY

| Section | Content |
|---------|---------|
| Phases 13–25 | Communication, Notifications, Analytics, AI Center, Approvals, Procurement, Tool Mgmt, Fleet Mgmt, Knowledge Base, Learning Center, Safety Center, Command Center, Launch Prep |
| Team Structure | Year 1: 11 people → Year 3: 24 people |
| Development Order | Dependency graph + parallelization strategy |
| Release Strategy | Semantic versioning + deployment pipeline + feature flags + hotfix SLA |
| MVP Strategy | MVP = Phase 0–7 (Week 42); success metrics; go/no-go criteria |
| Enterprise Strategy | Multi-tenancy, pricing tiers, onboarding architecture, compliance |
| 10-Year Plan | Year 1 monolith → Year 10 platform (microservices + data lake + marketplace) |
| Risk Register | 23 risks across Technical, Product, Security, Business domains |
| Milestones | 24 milestones + 6 go/no-go gates + 12 quarterly reviews |

**Total Roadmap: 25 Phases × 166 Weeks ≈ 3.2 Years**
**MVP Available: Week 42 (~10 months from Phase 0 start)**
**Full Platform: v2.0 at Week 166 (~38 months)**

---

*PRV Implementation Roadmap — Part 2 of 2*
*Continues from IMPLEMENTATION_ROADMAP_PART1.md*
*Next: Begin Phase 0 — Architecture Validation*
