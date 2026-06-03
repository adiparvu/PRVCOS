# PRV MODULE ARCHITECTURE — PART 1
# Modules 1–5: Public Application · Projects · Attendance · Workforce · HR
# Pasul 9 — Enterprise Module Blueprint · Source of Truth

**Version**: 1.0
**Status**: Official Blueprint
**Part**: 1 of 4
**Modules**: 1–5
**Depends on**: CLAUDE.md, PRODUCT_VISION.md, ROLE_ARCHITECTURE.md, NAVIGATION_ARCHITECTURE.md, DASHBOARD_ARCHITECTURE.md, DATABASE_ARCHITECTURE.md, DESIGN_SYSTEM.md

---

## TABLE OF CONTENTS

- [Module 1: Public Application](#module-1-public-application)
- [Module 2: PRV Projects](#module-2-prv-projects)
- [Module 3: PRV Attendance](#module-3-prv-attendance)
- [Module 4: PRV Workforce](#module-4-prv-workforce)
- [Module 5: PRV HR](#module-5-prv-hr)

---

## MODULE 1: PUBLIC APPLICATION

### 1. Module Purpose

The Public Application is the external face of PRV to clients, prospects, and the general public. It serves simultaneously as a marketing platform, e-commerce storefront, service booking system, project showcase, and client self-service portal — all within a single role-aware, glass-native experience. It drives lead generation, online sales, brand credibility, and client retention without requiring any internal PRV access.

### 2. Users

| User Type | Description | Authentication |
|-----------|-------------|----------------|
| Anonymous Visitor | Public browsing: services, projects, shop | None |
| Registered Public User | Account holder: orders, wishlist, reviews | Email / Social OAuth |
| Authenticated Client | Existing PRV customer with active/past projects | Email + MFA |
| Internal Preview | CEO/Admin previewing public-facing content | Internal PRV role |

### 3. Permissions

| Permission | Anonymous | Registered | Client Portal | Internal Admin |
|------------|-----------|-----------|---------------|----------------|
| View Home / Services / Projects | ✅ | ✅ | ✅ | ✅ |
| Submit Quote Request | ✅ (with contact) | ✅ | ✅ | ✅ |
| Browse Shop catalog | ✅ | ✅ | ✅ | ✅ |
| Add to Cart / Checkout | ❌ | ✅ | ✅ | ✅ |
| Save to Favorites / Wishlist | ❌ | ✅ | ✅ | ✅ |
| Submit Review | ❌ | ✅ (post-purchase) | ✅ (post-project) | ❌ |
| View own Orders / Invoices | ❌ | ✅ | ✅ | ✅ |
| Access Client Portal | ❌ | ❌ | ✅ | ✅ |
| View project progress / photos | ❌ | ❌ | Own only | ✅ |
| Download contracts / documents | ❌ | ❌ | Own only | ✅ |
| Initiate return / refund | ❌ | ✅ | ✅ | ✅ |

### 4. Navigation Structure

**Level 1 — Tab Bar (5 tabs)**

| Tab | Icon | Content |
|-----|------|---------|
| Home | house | Company presentation, services, projects, reviews, contact |
| Shop | cart | Products, categories, promotions |
| Search | magnifier | Universal: products, services, projects |
| Favorites | heart | Saved products, services, projects |
| Account | person | Profile, orders, portal, settings |

**Level 2 — List / Grid per Tab**

- Home → Services List (horizontal scroll) / Featured Projects Grid / Reviews Carousel / Stats / Contact
- Shop → Category Grid → Product Grid (filterable: price, category, availability, rating)
- Search → Unified Results Grid (segmented: Products / Services / Projects) with filters
- Favorites → Tabbed: Saved Products / Saved Projects / Saved Services
- Account → Profile / Orders List / Invoices List / Quotes List / Client Portal (authenticated) / Settings

**Level 3 — Detail Screens**

- Service Detail: description, scope, photo gallery, process steps, pricing guide, featured projects, reviews, Quote CTA
- Project Detail: overview, full gallery, before/during/after, location map, reviews, related services
- Product Detail: photos (zoom), description, variants, pricing, stock status, add to cart/wishlist/compare, reviews, related products
- Order Detail: items, status timeline, tracking, invoice download, return initiation
- Client Portal Project Detail: phases overview, milestone tracker, approved photos, document downloads, payment status, progress timeline

**Bottom Sheets (no new screens for actions)**

| Sheet | Trigger | Steps |
|-------|---------|-------|
| Quote Request | "Get a Quote" CTA | Step 1: Service type → Step 2: Description + photos → Step 3: Contact info → Step 4: Preferred date → Submit |
| Add to Cart | Product "Add" tap | Variant selection → Quantity → Cart summary → Checkout CTA |
| Review Submission | Post-purchase/project prompt | Rating stars → Written review → Photo upload (optional) → Submit |
| Product Compare | Compare tap (up to 4) | Side-by-side attribute table |
| Before/After Viewer | Gallery tap | Full-screen interactive slider |
| Return Request | Order detail → Return | Reason selection → Item selection → Evidence photos → Submit |
| Contact | Contact section | Phone / Email / Map / Form |

### 5. Dashboard Structure

No traditional dashboard — the Home screen IS the discovery layer.

**Home Screen Sections (ordered)**

| Section | Purpose |
|---------|---------|
| Hero | Full-bleed visual, company tagline, primary CTAs (Get a Quote / View Projects) |
| Company Stats Strip | Projects completed, clients served, years active, team size (animated counters) |
| Services Horizontal Scroll | 8 service cards with icon, title, brief description |
| Featured Projects Grid | 3–6 showcase projects with category chips and gallery preview |
| Before/After Strip | Interactive sliders of 3 transformations |
| Reviews Carousel | Client testimonials with rating, name, project type |
| Contact + Quote CTA | Phone, email, map embed, quick quote form |

**Client Portal Dashboard (authenticated)**

- Active Projects Summary (count + health indicators)
- Next milestone for each active project
- Recent photos approved by PM
- Outstanding invoice total
- Recent documents added
- Quick contact button (PM direct)

**Internal Admin Preview Layer** (visible only to internal roles when previewing)

- Content freshness warnings (last updated dates)
- Draft / live toggle per section
- SEO status indicators

### 6. Workflows

**Quote Request Workflow**
1. User taps "Get a Quote" anywhere on home/services/project pages
2. Multi-step Quote Sheet opens: service type → description + photos → contact → preferred timing
3. On submit: Lead record auto-created in CRM module with source tag "Public App"
4. Auto-acknowledgement email sent to client (configurable template)
5. CRM team notified of new lead
6. AI estimates rough price range (visible to CRM, not client)
7. CRM assignee contacts client within SLA window (configurable, default 4h)

**Order Placement Workflow**
1. Client browses Shop → adds to cart → checkout
2. Address selection / entry → payment method
3. Order confirmation: order record created, invoice auto-generated (Finance module)
4. Fulfillment team notified (Shop module)
5. Order status progression: Pending → Processing → Packed → Shipped → Delivered
6. Each status change: push notification + email to client
7. On delivery: review request triggered after 48h delay

**Client Portal Onboarding Workflow**
1. Project Manager marks project as "client-visible"
2. Client receives invitation email with portal access credentials
3. Client accepts invitation → creates secure password → MFA setup
4. First login: brief onboarding tour (phase overview, document section, contact)
5. PM receives notification that client activated portal
6. Auto-notifications enabled for: new photos approved, milestones reached, new invoices

**Review Moderation Workflow**
1. Client submits review (triggered post-purchase or post-project)
2. Review enters moderation queue (visible only to moderator, not public)
3. Moderator (Store Manager / Ops Manager) reviews: approve / edit / reject
4. Approved → published to public page
5. If negative review (< 3 stars): Manager notified → can respond publicly
6. Rejected → client notified with reason

### 7. Approval Flows

| Request | Approver Chain | Notes |
|---------|---------------|-------|
| Review publication | Store Manager → (auto-approve if ≥4 stars) | Negative reviews require manual approval |
| Project photo (client-visible) | OPM → Project Director | Photos approved for internal first, then separately for client |
| Return / Refund | Customer Support → Store Manager → Finance | Finance approval if refund > threshold |
| Quote Request | Auto-assigned via CRM rules | No manual approval gate — assigned to CRM rep |
| Client Portal access | Project Manager activates | PM decision only |

### 8. Notifications

| Trigger | Recipients | Channel | Priority |
|---------|-----------|---------|----------|
| Quote Request submitted | CRM Team lead | Push + Email | High |
| Order placed | Client + Fulfillment team | Push + Email | High |
| Order shipped | Client | Push + Email | Medium |
| Order delivered | Client | Push | Medium |
| Order delivery failed | Client + Fulfillment | Push + Email | High |
| Invoice available (Client Portal) | Client | Push + Email | High |
| Project milestone reached (Portal) | Client | Push + Email | Medium |
| New photo in Client Portal | Client | Push | Low |
| Return request received | Store Manager | Push | High |
| Return approved / rejected | Client | Push + Email | Medium |
| Review published | Client (confirmation) | Push | Low |
| Review rejected | Client | Push | Low |

### 9. Analytics

| Metric | Description |
|--------|-------------|
| Quote Request Volume | Total per day/week/month, by service type, by source |
| Quote Conversion Rate | Quotes → Accepted quotes → Projects started |
| Shop GMV | Gross merchandise value per day/week/month |
| Shop Conversion Rate | Visitors → Add to cart → Purchase |
| Average Order Value | Per period, per category |
| Cart Abandonment Rate | Carts initiated vs completed |
| Top Products | By revenue, by units, by views |
| Service Page Views | Per service, bounce rate, time on page |
| Project Portfolio Views | Most viewed projects, favorites count |
| Review Volume & Score | Average rating per service / product |
| Review Sentiment | % positive / neutral / negative (AI-classified) |
| Client Portal Engagement | Logins/week, documents downloaded, photos viewed |
| Public Traffic | Sessions by platform (iOS / Android / Web), geographic distribution |
| Referral Sources | Direct / SEO / Social / Email |
| Return Rate | By product, by category |
| Client NPS | Post-project survey scores |

### 10. AI Features

| Feature | Description |
|---------|-------------|
| Smart Quote Estimation | Based on service type + description text, AI provides price range estimate surfaced to CRM assignee (not client) |
| Personalized Product Recommendations | Collaborative filtering + browsing history → shown in Shop and Product Detail |
| Review Sentiment Analysis | Auto-classifies reviews as positive/neutral/negative; flags reviews requiring management attention |
| NLP Search | Natural language processing for search queries across products, services, projects |
| Before/After Project Matching | When viewing a before/after, AI surfaces similar transformation projects |
| FAQ Chatbot | Conversational AI answers common queries (services, pricing ranges, booking, orders) |
| Conversion Optimization | AI identifies drop-off points in quote and checkout funnels → surfaces recommendations to marketing |

### 11. Integrations

| Module | Data Flow |
|--------|-----------|
| CRM | Quote requests → auto-created as Leads; Client portal users → linked to Customer record |
| Shop | Product catalog, inventory availability, orders, promotions sync |
| Finance | Invoice generation from orders; payment status sync; client invoice visibility |
| Projects | Approved projects → portfolio showcase; client portal project data |
| Document Center | Contracts, invoices, project documents → client portal downloads |
| Notification Center | All client-facing push, email, and in-app notifications |
| Analytics | Public traffic, conversion, review, and order data → Analytics hub |
| AI Center | Recommendations engine, chatbot, sentiment analysis, search intelligence |
| Communication Center | Support chat initiated from public app → routes to internal team |

### 12. Future Expansion

| Capability | Description |
|-----------|-------------|
| AR Product Preview | iOS ARKit — visualize products in client's space before purchase |
| Video Consultation Booking | Integrated scheduler for virtual site consultations |
| Loyalty Program | Points accumulation, tier rewards, referral bonuses |
| Service Subscription Packages | Monthly/annual maintenance contracts with recurring billing |
| Multi-Language Support | Full i18n — Romanian, English, German, French (minimum) |
| Multi-Company Public Pages | Separate branded URLs per company in PRV Group |
| PRV Marketplace | Third-party seller onboarding on Shop platform |
| Public API | Allow partner websites to embed PRV shop / quote widget |

---

## MODULE 2: PRV PROJECTS

### 1. Module Purpose

Complete end-to-end project lifecycle management for renovation and construction projects. From creation through phases, milestones, tasks, teams, budgets, materials, documents, and client delivery — all in one system with role-specific views ensuring every user sees exactly the depth they need. The Projects module is the operational core of PRV Renovations and PRV Projects companies.

### 2. Users

| Role | Access Scope | Key Actions |
|------|-------------|-------------|
| CEO | All companies — read | Revenue, health, risk overview |
| Co-CEO | All companies — read | Same as CEO |
| Project Director | All projects in their company | Create, configure, approve, close |
| OPM (Project Ops Manager) | Assigned projects | Execute, manage phases/tasks/resources |
| Project TL | Own team tasks | Task management, daily journal |
| Project Worker | Own assigned tasks | Mark complete, upload photos, log time |
| Ops Manager | All projects (cross-company view) | Strategic oversight |
| HR | Team assignments — read | Resource visibility |
| Finance | Budget and cost data | Cost tracking, invoicing triggers |
| Client (Portal) | Own project — read | Progress, photos, documents, invoices |

### 3. Permissions

| Permission | CEO | Director | OPM | TL | Worker | Finance | Client |
|-----------|-----|---------|-----|----|--------|---------|--------|
| Create Project | ✅ | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ |
| Edit Project Config | ✅ | ✅ | ✅ | ❌ | ❌ | ❌ | ❌ |
| Delete Project | ✅ | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ |
| View All Projects | All | Own co. | Assigned | Own team | Own | All | Own |
| Manage Phases | ✅ | ✅ | ✅ | ❌ | ❌ | ❌ | ❌ |
| Manage Milestones | ✅ | ✅ | ✅ | ❌ | ❌ | ❌ | ❌ |
| Create Tasks | ✅ | ✅ | ✅ | ✅ | ❌ | ❌ | ❌ |
| Complete / Verify Tasks | ✅ | ✅ | ✅ | ✅ | Own | ❌ | ❌ |
| View Budget | ✅ | ✅ | ✅ | ❌ | ❌ | ✅ | ❌ |
| Edit Budget | ✅ | ✅ | ❌ | ❌ | ❌ | ✅ | ❌ |
| Upload Photos | ✅ | ✅ | ✅ | ✅ | ✅ | ❌ | ❌ |
| Approve Photos (internal) | ✅ | ✅ | ✅ | ❌ | ❌ | ❌ | ❌ |
| Approve Photos (client-visible) | ✅ | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ |
| Manage Risks | ✅ | ✅ | ✅ | ❌ | ❌ | ❌ | ❌ |
| Create Change Orders | ✅ | ✅ | ✅ | ❌ | ❌ | ✅ | ❌ |
| Log Time | ✅ | ✅ | ✅ | ✅ | ✅ | ❌ | ❌ |
| Close Project | ✅ | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ |

### 4. Navigation Structure

**Level 1 — Projects Tab**

Business OS Operations section → Projects sub-tab

**Level 2 — Projects List**

- Grid or list view; chips: All / Active / At Risk / Delayed / Completed
- Sort by: Start date / Deadline / Health score / Budget variance
- Filters: Company / Phase / Team / Project type / Client

**Level 3 — Project Detail (tabbed horizontal scroll)**

| Tab | Content |
|-----|---------|
| Overview | Summary card, health score, progress %, team thumbnail, budget KPIs |
| Timeline | Gantt-style phase + milestone view (horizontal scroll, pinch-to-zoom) |
| Phases | Expandable phase cards; each phase shows tasks, status, % complete |
| Tasks | Master task list; filter by assignee / phase / status / priority |
| Team | Members, roles, allocation %, contact shortcuts |
| Materials | Material list, quantities, cost, supplier, delivery status, PO link |
| Budget | Planned vs actual cost breakdown; variance alerts |
| Photos | Gallery grid; tabs: All / Pending Approval / Approved / Client-Visible |
| Documents | Contracts, permits, specs, drawings; linked to Document Center |
| Journal | Daily site journal entries by OPM / TL, timestamped |
| Feed | Auto-generated activity stream (task completions, photos, status changes) |
| Risks | Risk register: description, likelihood, impact, mitigation, owner, status |
| Reports | Weekly / Monthly / Final reports; export PDF |
| Approvals | All pending approvals linked to this project |
| Analytics | Project-level KPI dashboard |

**Bottom Sheets**

| Sheet | Purpose |
|-------|---------|
| Add Task | Title, description, assignee, due date, priority, phase link |
| Log Work | Hours, description, date, task link |
| Upload Photo | Camera / gallery; description; approval toggle; phase tag |
| Add Risk | Description, likelihood (1-5), impact (1-5), mitigation steps, owner |
| Budget Update | Line item, amount, category, justification |
| Phase Status Change | New status, completion %, note; triggers approval if final |
| Change Order | Scope change description, cost impact, timeline impact; client signature required |
| Task Bulk Edit | Select multiple tasks → reassign / change status / move phase |

### 5. Dashboard Structure

**Project Director / OPM Dashboard**

| Widget | Data |
|--------|------|
| Projects Health Grid | All projects as cards with RAG (Red/Amber/Green) health indicator |
| Today's Milestones | Milestones due today / this week |
| Overdue Tasks | Count + list with severity (days overdue) |
| Budget Variance Summary | Total planned vs actual across all active projects |
| Team Allocation Map | Who is assigned where; availability gaps |
| Recent Activity Feed | Last 20 events across all projects |
| Upcoming Deadlines | Next 14 days calendar view |
| Risk Register Summary | Open risks by severity level |

**CEO / Executive Project Widget**

| Widget | Data |
|--------|------|
| Active Projects | Total count, by status |
| Projects At Risk | Count with revenue at risk |
| Completed MTD / YTD | With on-time delivery rate |
| Revenue in Pipeline | Sum of active project contract values |

**Worker / TL My Day**

| Widget | Data |
|--------|------|
| My Tasks Today | Prioritized task list |
| My Projects | Cards for active project assignments |
| My Hours This Week | Logged hours vs schedule |
| Upcoming Milestones | My team's next milestones |

### 6. Workflows

**Project Creation Workflow**
1. CEO or Director creates project: name, client, type (renovation / construction / fit-out), location, contract value, start / end dates
2. OPM assigned → builds phase structure (phases with names, dates, dependencies)
3. Director reviews and approves phase structure
4. Team assignments made (workers and TLs per phase)
5. Budget baseline established by Finance
6. Materials list created; purchase requests auto-raised for critical materials
7. Project kickoff notification sent to entire team + client portal activation

**Task Completion and Verification Workflow**
1. Worker marks task complete → adds completion note + optional photo
2. TL receives notification → inspects → marks verified or returns with comments
3. Verified task → phase progress auto-recalculated
4. If task was milestone-linked: milestone progress updates
5. If all tasks in phase complete: OPM notified → phase completion review
6. OPM approves phase → next phase unlocked; blocked tasks become available
7. If final phase: project closure workflow triggered

**Photo Upload and Approval Workflow**
1. Worker / TL uploads photo from site (camera or gallery)
2. AI auto-tags: phase, estimated date, location, content type (foundation / walls / electrical / finishing)
3. Photo enters internal approval queue
4. OPM reviews → approves (internal use) or rejects with note
5. Separately: Director toggles "client-visible" for approved photos
6. Client-visible photos appear in Client Portal
7. Portfolio-eligible photos: Director can flag for Public App showcase (with client consent)

**Budget Overrun Escalation Workflow**
1. Finance logs project expense (or purchase order received)
2. System calculates running variance vs baseline budget
3. Variance 5–10%: TL notified (informational)
4. Variance 10–20%: OPM notified; budget review flagged
5. Variance 20–30%: Director notified; formal budget review required
6. Variance >30%: CEO notified + Finance; Change Order must be created and approved
7. Change Order triggers client approval flow if scope or price changes

**Project Closure Workflow**
1. OPM marks all phases complete → closure request submitted
2. Director reviews: all tasks verified, documents complete, final photos uploaded
3. Finance confirms: all costs logged, final invoice generated
4. Client sign-off: final invoice sent to client, digital signature requested on completion certificate
5. Client signs → project status = Closed
6. Post-project review triggered: team performance, lessons learned
7. Project eligible for Public App portfolio (pending Director approval)

### 7. Approval Flows

| Request | Chain | Notes |
|---------|-------|-------|
| Phase structure | OPM → Director | Before project kickoff |
| Phase completion | OPM → Director | Required to unlock next phase |
| Budget increase (10–20%) | OPM → Director | Documented justification required |
| Budget increase (>20%) | OPM → Director → CEO | Change Order required |
| Change Order (client impact) | OPM → Director → CEO → Client | Client digital signature required |
| Photo: client-visible | OPM → Director | Separate from internal approval |
| Project closure | OPM → Director → Finance → Client | Client sign-off required |
| Risk escalation (Critical) | OPM → Director → CEO | Immediate notification |
| Subcontractor engagement | OPM → Director → Finance | Contract required |

### 8. Notifications

| Trigger | Recipients | Channel | Priority |
|---------|-----------|---------|----------|
| Task assigned | Assignee | Push | Medium |
| Task overdue (>24h) | Worker + TL | Push | High |
| Task overdue (>72h) | Worker + TL + OPM | Push + Email | Critical |
| Milestone reached | OPM + Director + Client (portal) | Push + Email | Medium |
| Phase completed | Full team + Director | Push | Medium |
| Budget variance >10% | OPM + Finance | Push | High |
| Budget variance >20% | OPM + Director + CEO + Finance | Push + Email | Critical |
| Risk flagged (High/Critical) | OPM + Director | Push + Email | High |
| Photo approved / rejected | Uploader | Push | Low |
| Photo made client-visible | Uploader + Client | Push | Low |
| Change Order created | Director + CEO + Client | Push + Email | High |
| Project delayed (schedule slip) | Director + CEO | Push + Email | High |
| Project closure request | Director + Finance | Push | High |
| Project closed | Full team + Client | Push + Email | Medium |

### 9. Analytics

| Metric | Description |
|--------|-------------|
| On-Time Delivery Rate | % projects completed on or before deadline |
| Budget Adherence Rate | % projects completed within ±5% of budget |
| Task Completion Rate | Tasks completed on time / total tasks, by project / team / worker |
| Phase Duration Variance | Planned vs actual duration per phase type |
| Team Productivity Index | Tasks verified per worker per week |
| Material Cost Variance | Planned vs actual material spend |
| Photo Documentation Rate | Photos per phase per project |
| Risk Occurrence Rate | Risks that materialized vs total logged |
| Change Order Frequency | Average change orders per project |
| Project Health Score | Composite (schedule + budget + risk + quality) per project |
| Revenue per Project | Contract value and invoiced amount |
| Profitability per Project | Revenue minus all direct costs |
| Client Satisfaction Score | Post-project survey NPS |
| Time-to-Kickoff | Project creation date → kickoff date |
| Closure Cycle Time | Final task completed → client sign-off |

### 10. AI Features

| Feature | Description |
|---------|-------------|
| Project Health Score | Real-time composite score using task velocity, budget trajectory, risk density, team availability |
| Delay Prediction Engine | Flags projects at risk of delay 14+ days in advance based on task completion trends |
| Budget Completion Forecast | ML model projecting final cost from current spend trajectory |
| Task Duration Estimation | Suggests duration estimates for new tasks based on historical similar tasks (same type, same team) |
| Risk Pattern Detection | Identifies combinations of signals (slow velocity + rising costs + team changes) that historically precede project failures |
| Resource Allocation Optimizer | Across concurrent projects, suggests optimal team distribution to balance workload and minimize risk |
| Daily Journal Auto-Generation | Summarizes previous day's activity (tasks, photos, time logs) into draft journal entry for OPM review |
| Natural Language Search | Search across all projects, tasks, documents, journals by intent ("show me delayed electrical tasks on active projects") |

### 11. Integrations

| Module | Integration Points |
|--------|--------------------|
| Attendance | Worker check-ins auto-linked to project site; site hours tracked per project |
| Workforce | Team member profiles, certifications, availability pulled from Workforce |
| Finance | Project budget baseline; expense logging; profitability calculation; invoice generation on project milestones |
| Procurement | Material purchase requests created from Materials tab; delivery status synced to project |
| CRM | Project linked to Client record; quote → project conversion tracked |
| Document Center | Contracts, permits, specs, change orders, completion certificates stored and versioned |
| Communication | Project channel auto-created on project kickoff; team can message in context |
| Notification Center | All project events trigger appropriate notifications |
| Analytics | Project KPIs fed into executive and operational dashboards |
| AI Center | Health scoring, delay prediction, resource optimization |
| Tool Management | Tool assignments per project and site; availability tracking |
| Fleet Management | Vehicle assignments per project for material delivery and team transport |
| Public App | Completed projects eligible for portfolio showcase |
| Safety Center | Site safety checklists linked to project phases; incidents filed against project |

### 12. Future Expansion

| Capability | Description |
|-----------|-------------|
| BIM Integration | Building Information Modeling file import; floor plan viewer in-app |
| AR Site Measurement | iOS ARKit — measure dimensions on site, auto-populate task specs |
| Drone Survey Integration | Import aerial site photos directly into project photo gallery |
| Subcontractor Portal | External-facing limited-scope access for subcontractors |
| Automated Client Digest | Weekly email digest auto-generated from project activity for client |
| IoT Site Monitoring | Smart sensors (temperature, humidity, power) feeding project dashboard |
| Predictive Procurement | AI orders materials automatically based on upcoming phase needs |
| Multi-Phase Dependency Graph | Complex phase dependency visualization with critical path analysis |

---

## MODULE 3: PRV ATTENDANCE

### 1. Module Purpose

Real-time workforce attendance management for all field workers, office staff, and mobile teams. Provides GPS + QR dual-verification check-in/out, shift and schedule management, leave and overtime administration, and full compliance reporting — with a zero-friction mobile-first interface designed for workers on active construction sites.

### 2. Users

| Role | Primary Use | Access Scope |
|------|-------------|-------------|
| Worker | Check in/out, view own schedule, request leave | Own records only |
| Team Leader | Monitor team attendance, approve leave | Own team |
| OMS | Assign schedules, manage shifts, approve overtime | Own region / site |
| Ops Manager | Full oversight, override capability, reporting | All sites |
| HR | Payroll-linked reporting, compliance | All employees |
| CEO / Co-CEO | Executive summary only | Company-wide aggregates |

### 3. Permissions

| Permission | Worker | TL | OMS | Ops Manager | HR | CEO |
|-----------|--------|----|----|-------------|-----|-----|
| Check In / Out | Own | Own | Own | Own | Own | N/A |
| View Own Schedule | ✅ | ✅ | ✅ | ✅ | ✅ | N/A |
| View Team Schedule | ❌ | ✅ | ✅ | ✅ | ✅ | Summary |
| Create / Edit Schedules | ❌ | ❌ | ✅ | ✅ | ❌ | ❌ |
| View Attendance Records | Own | Team | Region | All | All | Summary |
| Override Attendance Record | ❌ | ❌ | ✅ | ✅ | ✅ | ❌ |
| Approve Leave | ❌ | ✅ (≤3d) | ✅ | ✅ | ✅ | ❌ |
| Approve Overtime | ❌ | ❌ | ✅ | ✅ | ❌ | ❌ |
| Export Payroll Data | ❌ | ❌ | ❌ | ❌ | ✅ | ❌ |
| View Analytics | Own | Team | Region | All | All | Summary |
| Force Check-Out | ❌ | ❌ | ✅ | ✅ | ❌ | ❌ |

### 4. Navigation Structure

**Worker Level 1 — Attendance Tab**
Prominent single-button interface: large "Check In" / "Check Out" button, current status, today's schedule strip

**Worker Level 2**
- My Records: list of past check-ins with duration, project, GPS status
- Leave Requests: submitted requests with status timeline
- Overtime Requests: submitted requests
- My Schedule: weekly calendar view

**Worker Level 3**
- Record Detail: timestamp, GPS coordinates map, QR scan confirmation, project linked, hours, notes
- Leave Request Detail: type, dates, status, approver note

**Manager Level 1 — Attendance Tab**
- Live Team Grid: color-coded status (Present / Late / Absent / On Leave) per team member
- Quick stats strip: present count / absent / on leave / late

**Manager Level 2**
- Schedule View: weekly grid per team, drag-to-reassign shifts
- Pending Approvals: leave and overtime requests queue
- Attendance Reports: date-range selector, export
- Override Log: history of all manual overrides with audit trail

**Bottom Sheets**

| Sheet | Purpose |
|-------|---------|
| Check-In | GPS verification map → confirm site → project selection → check in |
| Check-Out | Summary of hours → optional note → confirm |
| GPS Override | Photo evidence + reason → flagged for supervisor review |
| Leave Request | Type selector → date range → reason → supporting document upload |
| Overtime Request | Date → hours → project → reason → submit |
| Schedule Edit | Worker, shift dates/times, site assignment |
| Attendance Override | Record selection → corrected time → reason → audit note |

### 5. Dashboard Structure

**Worker My Day Widget**

| Item | Data |
|------|------|
| Shift Status | Not Started / Checked In / Completed |
| Time Checked In | HH:MM duration |
| Hours This Week | Actual vs contracted |
| Leave Balance | Days remaining by type |
| Next Shift | Date + site |

**TL / OMS Dashboard**

| Widget | Data |
|--------|------|
| Present / Absent / Late / On Leave | Real-time counts for team |
| Attendance Heatmap | 7-day heat map by team member |
| Pending Approvals | Count with urgency |
| Overtime This Week | Hours and cost |
| Schedule Gaps | Unfilled shifts in next 7 days |
| Compliance Rate | % GPS-verified check-ins |

**HR / Ops Executive**

| Widget | Data |
|--------|------|
| Company Attendance Rate | % present vs scheduled, today and MTD |
| Total Hours Worked MTD | Actual vs budgeted |
| Overtime Cost MTD | Total and by department |
| Leave Liability | Total accrued leave days outstanding (monetary value) |

### 6. Workflows

**Standard Check-In Workflow**
1. Worker opens Attendance tab → taps "Check In"
2. System verifies GPS location against assigned site geofence (default: 100m radius)
3. If within geofence: check-in confirmed → timestamped, GPS recorded, device ID logged
4. If outside geofence: QR scan requested
5. If QR scan succeeds: check-in confirmed (GPS anomaly flagged for supervisor review)
6. If QR fails: photo evidence required + manual note → check-in saved with "manual review" flag
7. TL receives confirmation notification; OMS sees live status update

**Late Arrival Workflow**
1. Shift start time passes without check-in
2. T+15 min: Push notification to Worker ("You haven't checked in")
3. T+30 min: TL notified ("Worker [name] not yet checked in")
4. T+60 min: OMS notified + attendance record auto-created with "Absent – pending explanation"
5. Worker can still check in (logged as late with duration)
6. Worker submits late arrival reason (via Leave/Overtime sheet)
7. TL reviews and accepts / escalates

**Leave Request Workflow**
1. Worker submits leave request: type (annual / sick / personal / unpaid), dates, reason, document if medical
2. Immediate notification to TL
3. TL reviews: approve / reject with note (≤3 days: TL authority)
4. For >3 days or during critical project period: TL → OMS → Ops Manager chain
5. Approved → schedule gap auto-flagged to OMS for coverage planning
6. HR notified for payroll impact
7. Worker receives confirmed notification; leave reflected in schedule

**Attendance Override Workflow**
1. Worker or TL reports incorrect attendance record
2. OMS receives override request: reviews GPS data, QR log, photos
3. If legitimate error: OMS corrects record with timestamped audit note
4. Override saved as immutable record (original entry preserved, correction added)
5. If override materially affects payroll: HR notified for payroll run review
6. All overrides visible in Override Log (never deletable)

### 7. Approval Flows

| Request | Chain | SLA | Notes |
|---------|-------|-----|-------|
| Leave ≤ 3 days | Worker → TL | 24h | TL can approve independently |
| Leave 4–10 days | Worker → TL → OMS | 48h | Both must approve |
| Leave > 10 days | Worker → TL → OMS → Ops Manager | 72h | Ops Manager final approval |
| Leave during critical project period | Worker → TL → OMS → Ops Manager → Director | 48h | Project Director must not-oppose |
| Overtime request | Worker → OMS | 8h | Fast-tracked |
| Overtime > 10h/week | Worker → OMS → Ops Manager | 24h | Higher threshold requires Ops Manager |
| Attendance override | Worker/TL → OMS → (HR if payroll-impacting) | 48h | All overrides immutably logged |

### 8. Notifications

| Trigger | Recipients | Channel | Priority |
|---------|-----------|---------|----------|
| Check-In confirmed | Worker | Push | Low |
| Check-In: GPS anomaly flagged | Worker + TL | Push | Medium |
| No check-in T+30min | Worker + TL | Push | High |
| No check-in T+60min | TL + OMS | Push | Critical |
| Late check-in | Worker (confirmation) + TL | Push | Medium |
| Leave request submitted | TL | Push | Medium |
| Leave approved / rejected | Worker | Push | Medium |
| Overtime approved / rejected | Worker | Push | Medium |
| Shift assigned / changed | Worker | Push | Medium |
| Schedule gap detected | OMS | Push | High |
| Mass absence event (>20% team absent) | OMS + Ops Manager + CEO | Push + Email | Critical |
| Payroll data export ready | HR | Push | Low |

### 9. Analytics

| Metric | Description |
|--------|-------------|
| Overall Attendance Rate | Present / scheduled, by day / week / month |
| Punctuality Rate | % check-ins within 15min of shift start |
| Absence Rate | Total absent days / total scheduled days |
| Chronic Absenteeism | Employees absent >X days in rolling 90 days |
| Leave Utilization Rate | Leave taken vs entitlement, by type and employee |
| Overtime Rate | Overtime hours / regular hours, by team / period |
| Overtime Cost | Total monetary cost of overtime, by team / project |
| GPS Compliance Rate | % check-ins with valid GPS vs QR-only vs manual |
| Site Coverage Hours | Total hours on each project site |
| Schedule Adherence | Shifts completed as scheduled vs modified/cancelled |
| Team Availability Forecast | Next 14-day availability considering leaves and scheduled absences |
| Late Arrival Trend | Average lateness per employee; trending direction |
| Override Frequency | Overrides per period; outlier detection |
| Hours Distribution | By day of week, by project, by department |
| Leave Balance Liability | Monetary value of accrued leave outstanding |

### 10. AI Features

| Feature | Description |
|---------|-------------|
| Absence Prediction | ML model identifies employees likely to be absent based on historical patterns, fatigue signals, and seasonal trends — 7-day ahead prediction |
| Overtime Risk Alert | Flags teams trending toward weekly overtime cap (legal or company threshold) before it is breached |
| GPS Spoofing Detection | Identifies suspicious location patterns (e.g., impossible speeds between check-ins, VPN usage during GPS verification) |
| Schedule Optimization | Suggests optimal shift schedules based on project needs, worker availability, historical productivity patterns, and legal rest period compliance |
| Anomaly Detection | Flags unusual patterns: double check-ins, check-in far outside normal hours, systematic late arrivals at specific sites |
| Workforce Availability Forecast | Given project requirements for next 4 weeks, AI calculates available hours accounting for known leaves, historical absence rates, and overtime caps |
| AI Scheduling Assistant | Command Palette: "Schedule 6 workers for Project X next week" → AI generates draft schedule with conflict checks |

### 11. Integrations

| Module | Integration Points |
|--------|--------------------|
| Projects | Check-ins linked to project/site; hours on site tracked per project for cost calculation |
| Workforce | Employee profiles, teams, shift templates from Workforce |
| HR | Leave data → payroll adjustment; attendance → timesheet for payroll processing |
| Finance | Hours worked → labor cost per project; overtime costs tracked |
| Procurement | Worker presence on site linked to material delivery scheduling (deliveries when workers present) |
| Notification Center | All attendance events and alerts |
| Analytics | Attendance KPIs fed into operational and HR dashboards |
| AI Center | Absence prediction, schedule optimization, anomaly detection |
| Security | Device verification, GPS spoofing detection; check-in logs are immutable audit records |

### 12. Future Expansion

| Capability | Description |
|-----------|-------------|
| Facial Recognition Check-In | iOS + Android biometric — camera-based identity confirmation at check-in |
| NFC Tag Check-In | Tap-on-site NFC tag (eliminating need for GPS or QR) |
| Automated Payroll Trigger | Attendance data directly feeds payroll run without manual HR export |
| IoT Entry Tracking | Turnstile / access gate integration for automatic check-in logging |
| Cross-Company Attendance | Workers shared between PRV companies tracked correctly for cost allocation |
| Biometric Time Clock Integration | Office environments: fingerprint or palm scanner integration |
| Live Activity Integration | Dynamic Island shows current check-in duration and project in real time |
| Wearable Integration | Apple Watch / WearOS check-in and shift notifications |

---

## MODULE 4: PRV WORKFORCE

### 1. Module Purpose

The authoritative source of truth for all personnel data across the PRV Group. Manages employee profiles, team and department structures, organizational hierarchy, certifications, equipment/vehicle assignments, performance tracking, and achievements — serving as the foundation layer that all other modules reference when they need to know "who this person is, what they can do, and where they belong."

### 2. Users

| Role | Access Scope | Key Use |
|------|-------------|---------|
| CEO / Co-CEO | All companies — read-only | Headcount, org structure, key personnel |
| HR | Full read/write — all employees | Master people data management |
| Ops Manager | Own division — read/limited write | Team composition, certification tracking |
| TL | Own team — read | Team member visibility |
| Worker | Own profile — limited read/write | Personal info, certifications, achievements |
| Finance | Compensation structure — read | Payroll cost calculations |
| Data Analyst | Aggregate — read | Workforce analytics |

### 3. Permissions

| Permission | CEO | HR | Ops Manager | TL | Worker | Finance |
|-----------|-----|-----|-------------|-----|--------|---------|
| View All Employees | ✅ | ✅ | Own division | Own team | Own | ❌ |
| Create Employee Record | ❌ | ✅ | ❌ | ❌ | ❌ | ❌ |
| Edit Core Profile | ❌ | ✅ | Limited | ❌ | Contact only | ❌ |
| Edit Role / Department | ❌ | ✅ | ✅ | ❌ | ❌ | ❌ |
| Manage Teams | ❌ | ✅ | ✅ | ❌ | ❌ | ❌ |
| View Org Chart | ✅ | ✅ | ✅ | ✅ | ✅ | ❌ |
| View Certifications | ✅ | ✅ | Own div | Own team | Own | ❌ |
| Add / Verify Certification | ❌ | ✅ | ❌ | ❌ | ❌ | ❌ |
| Assign Equipment | ❌ | ❌ | ✅ | ✅ | ❌ | ❌ |
| Assign Vehicle | ❌ | ❌ | ✅ | ❌ | ❌ | ❌ |
| View Performance | Summary | ✅ | Own div | Own team | Own | ❌ |
| Edit Performance Records | ❌ | ✅ | Own div | Own team | ❌ | ❌ |
| View Compensation | ❌ | ✅ | Summary | ❌ | Own | ✅ |
| Terminate Employee | ❌ | Initiate | ❌ | ❌ | ❌ | ❌ |

### 4. Navigation Structure

**Level 1 — Workforce Tab (Business OS People section)**

**Level 2**

| Section | Content |
|---------|---------|
| Employees | Full list; search, filter by department / team / status / role / certification status |
| Teams | Grid of team cards; tap to expand members and stats |
| Org Chart | Interactive hierarchical tree; expandable by division / department / team |
| Certifications Hub | All certifications across workforce; filter by type / expiry window / status |
| Equipment Assignments | All tool/vehicle assignments; filter by status / assignee / type |
| Performance Hub | All performance reviews; cycles, scores, development plans |

**Level 3 — Employee Profile**

| Section | Content |
|---------|---------|
| Overview | Photo, name, role, department, team, status badge, contact shortcuts |
| Employment | Contract type, start date, seniority, reporting line, employment status |
| Certifications | List with expiry dates, renewal status, issuing body |
| Documents | Linked to Document Center (contract, ID, certificates) |
| Attendance | Summary widget (this month: present days, leave taken, overtime) |
| Project History | Active and past project assignments with contribution summary |
| Equipment | Currently assigned tools and vehicles |
| Performance | Review scores, trends, development plan summary |
| Training | Courses completed, in-progress, mandatory compliance status |
| Achievements | Badges, milestones, recognition records |
| Notes | HR-only secure notes (not visible to employee or managers) |

**Bottom Sheets**

| Sheet | Purpose |
|-------|---------|
| Add Employee | Name, role, department, team, start date, contract type |
| Edit Role / Department | New role, effective date, reason |
| Assign Certification | Type, issuer, issue date, expiry date, document upload |
| Add Achievement | Type, description, date, awarded by |
| Transfer Employee | Origin team/dept → destination; effective date; notification toggle |
| Equipment Assignment | Tool/vehicle selection → employee → start date → expected return |
| Add HR Note | Text, category (performance / behavior / commendation), visibility: HR-only |

### 5. Dashboard Structure

**HR Workforce Dashboard**

| Widget | Data |
|--------|------|
| Headcount Summary | Active / On Leave / On Probation / Terminated this month |
| Headcount by Department | Bar chart breakdown |
| Certifications Expiring | 30 / 60 / 90 day windows with employee names |
| New Hires MTD | Count with names and roles |
| Turnover Rate | MTD and YTD with trend arrow |
| Open Positions | From Recruitment module (HR integration) |
| Onboarding In Progress | Employees in onboarding checklist |

**Manager / TL Dashboard**

| Widget | Data |
|--------|------|
| My Team Members | Status strip (present / absent today) |
| Team Skills Map | Coverage grid for required skills vs available |
| Certifications Health | Team certification compliance % |
| Equipment Assigned | What tools/vehicles my team has |

**CEO Workforce Widget**

| Widget | Data |
|--------|------|
| Total Headcount | By company in PRV Group |
| Workforce Cost MTD | Total labor expense |
| Critical Cert Gaps | Count of safety-critical expired certifications |
| Turnover Alert | If turnover exceeds threshold |

### 6. Workflows

**New Employee Onboarding Workflow**
1. HR creates employee record with core data (name, role, department, team, contract type, start date)
2. System auto-generates login credentials → invitation email sent
3. Onboarding checklist auto-created based on role: required documents, certifications, equipment to receive, mandatory training
4. Manager and TL notified → workspace prepared, introductions scheduled
5. Learning Center: role-specific onboarding course auto-assigned
6. 30-day check-in reminder set for HR (review integration and progress)
7. 60-day: probation review reminder
8. 90-day: probation completion decision → contract confirmation or extension or termination

**Team Transfer Workflow**
1. HR (or Ops Manager) initiates transfer: employee, origin team, destination team, effective date, reason
2. Current TL notified → can flag concerns within 48h
3. Destination TL / Manager accepts the incoming team member
4. On effective date: team membership updated, org chart refreshed automatically
5. All linked data (attendance schedule, task assignments, project assignments) migrated or re-evaluated
6. Permissions auto-recalculated based on new team/role
7. Employee notified with clear summary of what changed

**Certification Expiry Workflow**
1. Daily system scan checks all certifications for approaching expiry
2. 90 days to expiry: employee receives push notification
3. 60 days: TL + HR notified; employee receives reminder
4. 30 days: Ops Manager notified; urgent renewal flag on employee profile
5. 7 days: Critical alert to CEO level if certification is safety-critical (first aid, electrical, heights)
6. Expired: employee profile flagged; system blocks assignment to tasks requiring that certification
7. Renewal uploaded by employee → HR verifies → status cleared

**Performance Review Cycle Workflow**
1. HR configures review cycle (quarterly / semi-annual / annual)
2. Review forms sent to manager and employee simultaneously
3. Manager completes: competency ratings, goal achievement, development notes
4. Employee completes: self-assessment, goal reflection, development goals
5. Both inputs visible to HR; calibration facilitated
6. Final scores saved; development plan generated (with AI suggestions)
7. Employee reviews and digitally signs
8. Scores feed into promotion / compensation review flags

### 7. Approval Flows

| Request | Chain | Notes |
|---------|-------|-------|
| New Employee | HR → Ops Manager → CEO (if above salary band) | Standard hiring |
| Senior Role Hire | HR → Ops Manager → CEO | Always requires CEO |
| Termination | HR → Ops Manager → CEO → Legal review | Legal required |
| Role Promotion | TL → Ops Manager → HR → CEO | Compensation change triggers CEO |
| Team Transfer | TL (source) → TL (destination) → HR | Both TLs must accept |
| Equipment Assignment (vehicle) | TL → OMS → Ops Manager | Vehicle = higher scrutiny |
| Certification Verification | HR only | No chain; HR is gatekeeper |

### 8. Notifications

| Trigger | Recipients | Channel | Priority |
|---------|-----------|---------|----------|
| New employee record created | Manager + TL + HR | Push | Medium |
| Onboarding item overdue | Employee + HR | Push | Medium |
| Certification expiring (90d) | Employee | Push | Low |
| Certification expiring (30d) | Employee + TL + HR | Push + Email | High |
| Certification expired | Employee + TL + HR + Ops Manager | Push + Email | Critical |
| Certification: safety-critical expired | Employee + TL + Ops Manager + CEO | Push + Email | Critical |
| Transfer confirmed | Employee + Both TLs | Push | Medium |
| Probation milestone | HR + Manager | Push + Email | Medium |
| Performance review due | Manager + Employee | Push + Email | Medium |
| Termination initiated | HR + CEO (cc) | Email | Critical |

### 9. Analytics

| Metric | Description |
|--------|-------------|
| Headcount Trend | Monthly headcount by department / company |
| Turnover Rate | Voluntary + involuntary, trailing 12 months |
| Average Tenure | By role, department, company |
| Certification Compliance Rate | % employees with all required certifications valid |
| Skills Coverage Map | Skills available vs skills required per department |
| Performance Score Distribution | Bell curve of performance ratings |
| Training Completion Rate | % employees with all mandatory training completed |
| Time-to-Full-Productivity | Days from hire to first project assignment |
| Equipment Assignment Rate | % workforce with assigned equipment |
| Team Stability Index | % of team unchanged for >6 months |
| Org Chart Depth | Average reporting levels |
| Headcount per Project | Workers per active project |
| Certification Renewal Lead Time | Days between expiry and renewal, by certificate type |
| Achievement Distribution | Recognition events per employee |
| Workforce Cost Per Department | Headcount × avg compensation by department |

### 10. AI Features

| Feature | Description |
|---------|-------------|
| Skill Gap Analysis | Compares current team skill inventory against upcoming project pipeline skill requirements; outputs gap list with urgency |
| Attrition Risk Prediction | Identifies employees showing early signals of potential departure (low engagement scores, training non-completion, below-average attendance, flat performance curve) |
| Optimal Team Composition | For a given project type and scope, recommends ideal team mix from available workforce |
| Org Chart Efficiency Analysis | Detects structural inefficiencies (too many direct reports, skip-level reporting, isolated departments) |
| Learning Path Recommendation | Based on role + current certifications + performance gap → suggests specific courses in Learning Center |
| Workforce Capacity Planning | Based on project pipeline volume over next 90 days, forecasts hiring needs by role |
| Succession Planning Assistant | For key roles, identifies top internal candidates based on performance, tenure, certifications, and career trajectory |

### 11. Integrations

| Module | Integration Points |
|--------|--------------------|
| HR | Contracts, payroll, leave data; HR is operational layer, Workforce is the record of truth |
| Attendance | Schedules, shifts, and check-in patterns read from Attendance |
| Projects | Team assignments by project; task ownership; site hours |
| Tool Management | Equipment assignments — tool catalog links to Workforce assignments |
| Fleet Management | Vehicle assignments — fleet module links to Workforce driver records |
| Learning Center | Training assignments, completion records, certifications earned |
| Document Center | Employee contracts, IDs, certifications stored and versioned |
| Finance | Headcount cost calculations; per-department labor spend |
| Notification Center | All workforce alerts and HR communications |
| Analytics | Workforce KPIs fed into HR and executive dashboards |
| AI Center | Attrition prediction, skill gap analysis, succession planning |
| Security | Role assignment → permission matrix update on any change |

### 12. Future Expansion

| Capability | Description |
|-----------|-------------|
| Employee Self-Service Portal | Full self-service for personal data updates, document uploads, certification submissions |
| Pulse Survey Tool | Anonymous bi-weekly team health checks with engagement score tracking |
| 360-Degree Peer Reviews | Peer feedback collection in addition to manager reviews |
| Career Pathing Engine | Defined promotion tracks with milestones and skill requirements |
| External Recruitment Integration | LinkedIn Recruiter, Indeed API — pull candidates directly into HR pipeline |
| Shared Employee Pool | Workers formally shared between PRV Group companies with split cost tracking |
| Biometric Profile | Facial scan enrollment for sites using recognition-based attendance |
| Equity / Options Tracking | For senior staff: vesting schedules, grants, option exercise tracking |

---

## MODULE 5: PRV HR

### 1. Module Purpose

Full HR operations layer covering the complete employment lifecycle from candidate recruitment through offboarding. Manages contracts, payroll processing, leave administration, compliance, performance review cycles, and disciplinary management — fully integrated with Workforce (people data) and Finance (payroll costs). If Workforce Module is the "who" (people directory), HR Module is the "how" (all HR processes and transactions).

### 2. Users

| Role | Primary Use | Access Scope |
|------|-------------|-------------|
| CEO | Final approval on sensitive HR matters | Summary + approval |
| HR | Primary operator of all HR functions | Full read/write |
| Ops Manager | Departmental approvals, performance input | Own department |
| TL | Leave approval, basic performance input | Own team |
| Worker | Personal records, requests, payslips | Own only |
| Finance | Payroll read, cost reports | Payroll + compensation |

### 3. Permissions

| Permission | CEO | HR | Ops Manager | TL | Worker | Finance |
|-----------|-----|-----|-------------|-----|--------|---------|
| View All Employee Records | Summary | ✅ | Own dept | Own team | Own | ❌ |
| Edit Employee Records | ❌ | ✅ | Limited | ❌ | Contact only | ❌ |
| Manage Contracts | Approve | ✅ | ❌ | ❌ | View own | Read |
| Configure Payroll | ❌ | ✅ | ❌ | ❌ | ❌ | ✅ |
| Run Payroll | ❌ | ✅ | ❌ | ❌ | ❌ | ✅ |
| View Payroll Data | Summary | ✅ | Own dept | ❌ | Own payslip | ✅ |
| Manage Leave Types | ❌ | ✅ | ❌ | ❌ | ❌ | ❌ |
| Approve Leave | ❌ | ✅ | ✅ | ✅ | ❌ | ❌ |
| Manage Recruitment | ❌ | ✅ | ✅ | ❌ | ❌ | ❌ |
| Conduct Performance Reviews | ❌ | ✅ | ✅ | ✅ | Self | ❌ |
| Manage Compliance | ❌ | ✅ | ❌ | ❌ | ❌ | ❌ |
| File Disciplinary Record | ❌ | ✅ | Initiate | ❌ | ❌ | ❌ |

### 4. Navigation Structure

**Level 1 — HR Tab (Business OS People section)**

**Level 2**

| Section | Content |
|---------|---------|
| Employee Records | Master list with HR-layer fields (contract status, leave balance, compliance status) |
| Contracts | All contracts: active / expiring / expired / draft |
| Payroll | Pay periods list; runs; payslips; payroll settings |
| Leave Management | Request queue; leave balance editor; leave calendar; leave type configuration |
| Recruitment | Open positions → candidate pipeline → offers |
| Performance | Review cycles; templates; scores; development plans |
| Training & Compliance | Mandatory training tracker; compliance certifications; deadlines |
| Disciplinary | Disciplinary records; warnings; PIPs (Performance Improvement Plans) |
| HR Analytics | HR-specific KPI dashboard |
| HR Reports | Standard (turnover, headcount, payroll summary) + custom report builder |

**Level 3 — Detail per HR entity**

- Employee HR Record Detail: contract status, leave balance breakdown, payroll history, performance history, compliance status, disciplinary history
- Contract Detail: parties, terms, salary, validity, version history, signature status
- Payslip Detail: period, base pay, overtime, deductions, net pay, tax breakdown
- Recruitment Position Detail: job spec, candidate list, stage tracking, offer status
- Review Cycle Detail: participants, scores, status (pending / complete), calibration flag

**Bottom Sheets**

| Sheet | Purpose |
|-------|---------|
| New Contract | Template selection → employee → terms → salary → send for signature |
| Payroll Run | Period selection → anomaly review → confirmation → distribute payslips |
| Leave Request Review | Approve with note / reject with reason |
| New Recruitment Position | Title, department, required skills, salary band, deadline |
| Candidate Stage Update | Move candidate: Screening → Interview → Assessment → Offer → Hired/Rejected |
| Performance Review | Competency matrix scoring → written comments → sign-off |
| Disciplinary Record | Type (verbal warning / written warning / PIP / termination) → description → evidence → sign-off |

### 5. Dashboard Structure

**HR Dashboard**

| Widget | Data |
|--------|------|
| Headcount Status | Active / On Leave / Terminated this month |
| Payroll Next Run | Date, estimated total, pending approvals count |
| Leave Calendar | Team leave visualization: next 30 days |
| Open Positions | Count with days-open and urgency |
| Candidates in Pipeline | Count by stage |
| Pending Approvals | Leaves, contracts, reviews awaiting HR action |
| Compliance Alerts | Expiring certifications / overdue mandatory training / missing documents |
| Upcoming Anniversaries | Employees with work anniversaries this week (engagement trigger) |
| Probation Reviews Due | Employees reaching 30 / 60 / 90 day milestones |

### 6. Workflows

**Payroll Processing Workflow**
1. Pay period end: attendance data locked for period (Attendance module)
2. HR opens payroll run: system auto-imports hours, overtime, approved leaves, approved deductions
3. AI anomaly scan: flags unusual entries (hours spike, missing records, unusual deduction)
4. HR reviews flagged items: corrects or confirms
5. Finance reviews total payroll cost against budget
6. CEO approves if total exceeds defined threshold
7. Payroll confirmed → payslips generated automatically (PDF + in-app)
8. Payslips distributed: push notification to each employee + available in Account
9. Finance posts payroll as expense batch in Finance module

**Recruitment Workflow**
1. Ops Manager raises staffing request: role, department, headcount, start date, salary band
2. HR creates position record with job description (AI-assisted draft)
3. Position published: internal announcement (Communication module) + external job boards
4. Candidates added manually or via intake form link
5. Pipeline progression: Applied → Screening → Interview 1 → Interview 2 → Assessment → Reference Check → Offer
6. At each stage: scheduler for next step, candidate notified
7. Offer approval: HR → Ops Manager → CEO (senior roles)
8. Candidate accepts → employee record auto-created → onboarding triggered (Workforce module)
9. Declined candidates: auto-rejection email with graceful messaging

**Contract Renewal Workflow**
1. System flags contracts with expiry within 90 days
2. HR notified → reviews: renewal terms, any role change, salary adjustment
3. Ops Manager approves revised terms
4. CEO approves if salary increase above threshold
5. Contract generated from master template with updated terms
6. Digital signature requested via Document Center integration
7. Employee signs → counter-signed by HR → contract stored in Document Center with new version
8. Workforce module updated with new contract end date and terms

**Performance Review Cycle Workflow**
1. HR configures review cycle: type (quarterly / semi-annual / annual), participants, template
2. System sends self-assessment form to employees
3. Managers receive evaluation form for each direct report
4. Both completed independently within defined window
5. HR reviews combined input; flags calibration needed (scores diverge significantly)
6. Calibration session: manager and HR align on final scores
7. Final scores saved; development plan generated with AI-suggested learning paths
8. Employee reviews plan + digitally acknowledges in-app
9. Scores available to Ops Manager for compensation and promotion decisions

**Disciplinary Procedure Workflow**
1. Manager initiates disciplinary report: incident, date, description, evidence
2. HR receives and reviews: determines appropriate response (verbal warning / written warning / PIP / termination)
3. Meeting scheduled: employee + manager + HR
4. Outcome recorded: warning letter or PIP created; employee signs acknowledgement
5. All documents stored in Document Center (Confidential level)
6. If PIP: 30/60/90 day check-in reminders set
7. If termination decision: CEO + Legal notified; offboarding checklist triggered
8. Offboarding: equipment return, system access revocation, final payroll settlement, reference documentation

### 7. Approval Flows

| Request | Chain | SLA | Notes |
|---------|-------|-----|-------|
| New hire (standard) | HR → Ops Manager | 48h | Within salary band |
| New hire (above band) | HR → Ops Manager → CEO | 72h | CEO must approve |
| Senior role hire | HR → Ops Manager → CEO | 5d | Always CEO |
| Termination | HR → Ops Manager → CEO → Legal | 5d | Legal review mandatory |
| Payroll run | HR → Finance → CEO | 24h | CEO if above threshold |
| Contract amendment | HR → Legal → CEO | 48h | Legal review always |
| Promotion | Manager → HR → CEO | 72h | Compensation change |
| Leave > 10 days | TL → Ops Manager → HR | 72h | 3-level chain |
| Disciplinary (written warning) | HR → Ops Manager | 48h | Both must sign |
| Disciplinary (termination) | HR → CEO → Legal | 24h | Expedited if urgent |

### 8. Notifications

| Trigger | Recipients | Channel | Priority |
|---------|-----------|---------|----------|
| Contract expiring (90d) | HR | Push | Low |
| Contract expiring (60d) | HR + Employee | Push + Email | Medium |
| Contract expiring (30d) | HR + Employee + Manager | Push + Email | High |
| Payroll run initiated | Finance + CEO | Push | High |
| Payroll approved | HR (confirmation) | Push | Low |
| Payslip available | Employee | Push | Medium |
| New candidate applied | HR | Push | Medium |
| Candidate stage changed | Candidate + HR | Email | Medium |
| Offer accepted | HR + Hiring Manager | Push | High |
| Offer rejected | HR + Hiring Manager | Push | Medium |
| Performance review due (7d) | Manager + Employee | Push + Email | Medium |
| Review overdue | HR + Manager | Push | High |
| Disciplinary record added | HR + Manager (cc) | Push (internal) | High |
| Compliance deadline approaching | HR | Push + Email | High |
| Probation milestone | HR + Manager | Push | Medium |

### 9. Analytics

| Metric | Description |
|--------|-------------|
| Payroll Cost Trend | Monthly total, by department, vs budget |
| Payroll Accuracy Rate | % payroll runs without post-run corrections |
| Time-to-Hire | Days from position opening to accepted offer, by role |
| Offer Acceptance Rate | Accepted offers / total offers made |
| Recruitment Pipeline Conversion | Stage-by-stage conversion rates |
| Turnover Rate | Voluntary / involuntary, by department, trailing 12 months |
| Turnover Cost | Average cost per departure (recruitment + productivity loss estimate) |
| Leave Utilization Rate | Leave taken vs entitlement, by type |
| Average Leave Balance | Outstanding leave days per employee |
| Performance Score Distribution | Rating distribution curve across company |
| Training Completion Rate | % employees completing all mandatory training |
| Compliance Score | % employees with all required documents and certifications valid |
| Headcount Plan vs Actual | Budget headcount vs current headcount by period |
| Cost-per-Hire | Total recruitment cost / hires made |
| Disciplinary Rate | Disciplinary actions per 100 employees per year |

### 10. AI Features

| Feature | Description |
|---------|-------------|
| Payroll Anomaly Detection | Before each payroll run: flags unusual hours, unexpected deductions, missing records, statistical outliers vs prior periods |
| Attrition Risk Prediction | 60-day advance prediction of likely leavers based on engagement signals, leave patterns, performance trends, and tenure risk curves |
| Candidate Ranking | NLP-based matching of candidate CV/profile against job requirements; ranks candidates in pipeline |
| Interview Question Generator | For each open position and interview stage, generates competency-based questions aligned to role requirements |
| Performance Pattern Analysis | Identifies high-performers and struggling employees before review cycles; alerts manager to early intervention needs |
| Compensation Benchmarking | Compares internal salary bands against market benchmarks (external data integration); flags out-of-band outliers |
| Development Plan Suggestions | Post-review: AI generates specific learning path recommendations from Learning Center catalog based on identified gaps |
| Compliance Gap Analysis | For each employee: lists all required documents / certifications / trainings that are missing or expiring; generates per-employee compliance score |

### 11. Integrations

| Module | Integration Points |
|--------|--------------------|
| Workforce | Employee profiles are the source of truth; HR operates on the process layer |
| Attendance | Attendance data feeds payroll (timesheets, overtime, leave taken confirmation) |
| Finance | Payroll expenses auto-posted; headcount cost by department; contract values |
| Document Center | Contracts, payslips, disciplinary records, offer letters stored with versioning and access control |
| Learning Center | Training requirements assigned from HR compliance list; completion status synced |
| Notification Center | All HR communications: payslips, leave responses, review reminders |
| Analytics | HR KPIs: turnover, payroll cost, recruitment funnel fed into dashboards |
| AI Center | Attrition prediction, payroll anomaly detection, candidate ranking |
| Communication | Recruitment communications, offer letters, announcement of new hires |
| Projects | HR provides availability data for project resource planning |
| Approval Center | Leave, payroll, contract, and disciplinary approvals routed through central approval hub |

### 12. Future Expansion

| Capability | Description |
|-----------|-------------|
| HRIS Integration | Bidirectional sync with SAP HCM, Workday, or BambooHR |
| Employee Engagement Platform | eNPS surveys, pulse checks, mood tracking with anonymity guarantees |
| Benefits Administration | Health insurance, pension, transport allowances enrollment and tracking |
| Automated Background Checks | Integration with background check APIs (employment verification, criminal record) |
| Equity / Options Management | Vesting schedules, grant tracking, exercise window notifications |
| Compensation Bands Engine | Role-based salary bands with market data integration and automatic alerts |
| HR Chatbot (Employee Self-Service) | AI-powered chat for common HR questions: leave balance, payslip, policy lookup |
| Multi-Jurisdiction Compliance | Support for employees across multiple countries with different labor law requirements |

---

*PRV Module Architecture Part 1 · Modules 1–5 · Pasul 9 · Source of Truth*
*Do not modify without approval from Lead Architect.*
*All decisions must align with CLAUDE.md, PRODUCT_VISION.md, and ROLE_ARCHITECTURE.md.*
