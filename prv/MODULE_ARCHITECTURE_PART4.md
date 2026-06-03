# PRV MODULE ARCHITECTURE — PART 4
# Modules 17–21: Fleet · Knowledge Base · Learning Center · Safety Center · Command Center
# + Cross-Module Integration Rules
# Pasul 9 — Enterprise Module Blueprint · Source of Truth

**Version**: 1.0
**Status**: Official Blueprint
**Part**: 4 of 4
**Modules**: 17–21 + Cross-Module Rules
**Depends on**: CLAUDE.md, PRODUCT_VISION.md, ROLE_ARCHITECTURE.md, NAVIGATION_ARCHITECTURE.md, DASHBOARD_ARCHITECTURE.md, DATABASE_ARCHITECTURE.md, DESIGN_SYSTEM.md

---

## TABLE OF CONTENTS

- [Module 17: PRV Fleet Management](#module-17-prv-fleet-management)
- [Module 18: PRV Knowledge Base](#module-18-prv-knowledge-base)
- [Module 19: PRV Learning Center](#module-19-prv-learning-center)
- [Module 20: PRV Safety Center](#module-20-prv-safety-center)
- [Module 21: PRV Command Center](#module-21-prv-command-center)
- [Cross-Module Integration Rules](#cross-module-integration-rules)
- [Module Dependency Map](#module-dependency-map)
- [Complete Module Status Table](#complete-module-status-table)

---

## MODULE 17: PRV FLEET MANAGEMENT

### 1. Module Purpose

Complete lifecycle management for all company vehicles — from acquisition through assignment, fuel tracking, insurance, maintenance scheduling, GPS monitoring, and disposal. Ensures vehicles are correctly assigned to workers and projects, maintained on legal and mechanical schedule, and that all costs are properly tracked and attributed. Integrates with project operations for logistics planning and with finance for total fleet cost management.

### 2. Users

| Role | Access Scope | Key Actions |
|------|-------------|-------------|
| Worker / Driver | Own assigned vehicle | View assignment, log fuel, report issues |
| TL | Team vehicles | Assign vehicles, view status |
| OPM | Project vehicles | Assign for project logistics |
| Ops Manager | All fleet | Full management, analytics |
| Finance | All fleet | Cost tracking, insurance, depreciation |
| Procurement | All | Vehicle purchase requests |

### 3. Permissions

| Permission | Worker | TL | OPM | Ops Manager | Finance | Procurement |
|-----------|--------|----|----|-------------|---------|-------------|
| View Own Assignment | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| View All Vehicles | ❌ | Team | Project | All | All | All |
| Assign Vehicle | ❌ | ✅ | ✅ | ✅ | ❌ | ❌ |
| Log Fuel | ✅ | ✅ | ✅ | ✅ | ❌ | ❌ |
| Report Incident / Damage | ✅ | ✅ | ✅ | ✅ | ❌ | ❌ |
| Schedule Maintenance | ❌ | ❌ | ❌ | ✅ | ❌ | ❌ |
| Add New Vehicle | ❌ | ❌ | ❌ | ✅ | ❌ | ✅ |
| Retire Vehicle | ❌ | ❌ | ❌ | ✅ | ✅ | ❌ |
| View Analytics | ❌ | Team | Project | All | All | All |
| View GPS Live | ❌ | Team | Project | All | ❌ | ❌ |

### 4. Navigation Structure

**Level 1 — Fleet Tab (Business OS Operations section)**

**Level 2**

| Section | Content |
|---------|---------|
| Dashboard | Fleet status overview, live map |
| Vehicles | Full fleet catalog with status: Available / Assigned / Maintenance / Retired |
| Assignments | Current assignments: vehicle → driver → project → dates |
| Fuel Log | Fuel entries by vehicle, cost per km, monthly fuel cost |
| Maintenance | Service schedule: upcoming, overdue, history |
| Insurance | Policy details, renewal dates, incident history |
| Incidents | Damage reports, accidents, insurance claims |
| GPS Live | Real-time vehicle location map (active assignments) |
| Analytics | Fleet cost, utilization, performance analytics |

**Level 3 — Vehicle Detail**

- Make, model, year, plate number, VIN, photos
- Current assignment status and driver
- Assignment history
- Fuel log: all entries, average consumption (L/100km)
- Maintenance history: all services, costs, next service due
- Insurance: policy number, insurer, validity, coverage
- Incident history: all reported events
- Total cost of ownership: fuel + maintenance + insurance + depreciation

**Bottom Sheets**

| Sheet | Purpose |
|-------|---------|
| Assign Vehicle | Vehicle → driver → project → start date → expected return |
| Return Vehicle | Odometer reading → condition check → notes |
| Log Fuel | Vehicle → liters → amount → station → odometer |
| Report Incident | Type (accident / damage / theft) → description → photos → police report |
| Schedule Service | Vehicle → service type → date → vendor |
| Log Service | Service done → parts → cost → next service |

### 5. Dashboard Structure

**Ops Manager Fleet Dashboard**

| Widget | Data |
|--------|------|
| Fleet Availability | Count: Available / Assigned / In Maintenance |
| Live Map | Real-time location of all assigned vehicles |
| Insurance Expiring (30d) | Vehicles with expiring insurance |
| Maintenance Due | Vehicles due for service this week |
| Overdue Returns | Vehicles not returned by scheduled date |
| Monthly Fuel Cost | Total spend by vehicle |

**CEO Fleet Widget**

| Widget | Data |
|--------|------|
| Total Fleet Size | Count by category |
| Fleet Cost MTD | Total fuel + maintenance + insurance |
| Vehicle Utilization Rate | % of fleet in active use |
| Incidents This Month | Count and type |

### 6. Workflows

**Vehicle Assignment Workflow**
1. OPM / TL identifies transport need for project/task
2. Opens Fleet → Vehicles → filters available vehicles of required type
3. Assignment Sheet: driver → project → start date → expected return → purpose
4. Confirms driver has valid license (checked against Workforce certifications)
5. Assignment confirmed; driver notified
6. GPS tracking activates for assignment period
7. On return: driver scans QR or opens return sheet → odometer reading → condition → confirmed

**Maintenance Workflow**
1. System monitors: last service date + odometer since service vs service interval
2. When interval approaching: Ops Manager notified
3. Service scheduled: vehicle blocked from assignment during window
4. Service completed: tech logs work, parts, cost, odometer
5. Next service interval resets
6. Total maintenance cost updated in vehicle TCO record

**Incident Reporting Workflow**
1. Driver reports incident: type, description, photos, other parties (if accident)
2. Ops Manager notified immediately
3. Vehicle status = "Incident — Under Review"
4. Insurance notified if applicable
5. Damage assessment: repair cost estimate obtained
6. Repair authorized (Approval Center) → vehicle in maintenance
7. If total loss: vehicle retired; replacement procurement triggered
8. Incident recorded permanently on vehicle file and driver history

### 7. Approval Flows

| Request | Chain | Notes |
|---------|-------|-------|
| Vehicle purchase | Ops Manager → Finance → CEO | New vehicle acquisition |
| Major repair (above threshold) | Ops Manager → Finance | Cost authorization |
| Insurance claim filing | Ops Manager → Finance → CEO | Above claim threshold |
| Vehicle retirement / disposal | Ops Manager → Finance | Asset disposal |
| Personal use authorization | Ops Manager → CEO | Company vehicle for personal use |

### 8. Notifications

| Trigger | Recipients | Channel | Priority |
|---------|-----------|---------|----------|
| Vehicle assigned | Driver | Push | Low |
| Vehicle return due (today) | Driver + TL | Push | Medium |
| Vehicle overdue return | TL + OPM + Ops Manager | Push | High |
| Maintenance due this week | Ops Manager | Push | Medium |
| Maintenance overdue | Ops Manager + TL | Push | High |
| Insurance expiring (30d) | Ops Manager + Finance | Push + Email | High |
| Incident reported | Ops Manager + Finance | Push + Email | Critical |
| GPS: vehicle left geofence outside hours | Ops Manager | Push | High |
| Fuel log: anomalous consumption | Ops Manager | Push | Medium |

### 9. Analytics

| Metric | Description |
|--------|-------------|
| Fleet Utilization Rate | % of fleet-days in active use |
| Average Fuel Consumption | L/100km per vehicle and fleet average |
| Fuel Cost per Vehicle | Monthly and YTD |
| Total Fleet TCO | Full cost per vehicle: fuel + maintenance + insurance + depreciation |
| Maintenance Compliance Rate | % of services done on schedule |
| Incident Rate | Events per 1,000 km |
| Vehicle Downtime | Days unavailable (maintenance + incidents) |
| Cost per km | Total cost / km driven per vehicle |
| Odometer Distribution | Km traveled per vehicle, identifying high-use units |
| Insurance Cost per Vehicle | Annual insurance premium vs fleet value |
| Driver Performance | Per-driver: incidents, fuel efficiency, adherence to schedules |
| Vehicle Age Distribution | Fleet age analysis for replacement planning |

### 10. AI Features

| Feature | Description |
|---------|-------------|
| Predictive Maintenance | Based on mileage, age, usage patterns, and service history: predicts optimal next service date |
| Fuel Anomaly Detection | Flags vehicles with abnormal fuel consumption (possible fuel card misuse or mechanical issue) |
| Route Optimization | For project logistics: suggests optimal routes between sites to minimize km and fuel |
| Fleet Demand Forecasting | Based on project pipeline: forecasts vehicle needs by type over next 90 days |
| Driver Behavior Scoring | Aggregates fuel efficiency and incident data into driver performance score |
| Replacement Recommendation | Identifies vehicles approaching optimal replacement point (before repair costs exceed replacement value) |

### 11. Integrations

| Module | Integration Points |
|--------|--------------------|
| Projects | Vehicle assignments per project site; transport logistics |
| Workforce | Driver license validation; assignment history in driver profile |
| Procurement | Purchase requests for new vehicles or major parts |
| Finance | Fleet costs (fuel, maintenance, insurance) as company expenses; depreciation |
| Tool Management | Fleet vehicles used for tool transportation between sites |
| Attendance | Driver check-in at site linked to vehicle assignment |
| Document Center | Insurance documents, registration, service records stored |
| Analytics | Fleet KPIs in operational dashboards |
| Notification Center | All fleet alerts |
| AI Center | Predictive maintenance, fuel anomaly, route optimization |

### 12. Future Expansion

| Capability | Description |
|-----------|-------------|
| OBD-II Integration | Real-time vehicle diagnostics via onboard diagnostics port |
| EV Fleet Support | EV-specific tracking: charge level, charging sessions, range planning |
| Fuel Card Integration | Direct fuel card data import for automatic fuel log |
| Carbon Footprint Tracking | CO2 emissions calculation per vehicle and project |
| Driver Mobile App | Dedicated driver interface for check-in, fuel logging, incident reporting |
| Telematics Platform | Advanced GPS with speed monitoring, harsh braking, idling detection |
| Lease vs Own Calculator | TCO comparison tool for lease vs purchase decisions |
| Multi-Company Fleet Sharing | Formal vehicle sharing between PRV Group companies |

---

## MODULE 18: PRV KNOWLEDGE BASE

### 1. Module Purpose

The institutional memory of PRV — a structured, searchable, AI-enhanced internal wiki covering all company knowledge: policies, procedures, process guides, technical specifications, SOPs, FAQs, how-to guides, and training reference documents. Ensures that knowledge is never trapped in individual heads or email threads, and that every employee can find authoritative answers instantly. Content is role-filtered, versioned, and kept current through a structured review and contribution workflow.

### 2. Users

| Role | Access Scope | Key Actions |
|------|-------------|-------------|
| All Roles | Read content within their visibility tier | Search, read, save, rate |
| TL / Manager | Department content | Contribute, suggest updates |
| Director / Senior Manager | Division content | Create, edit, approve |
| HR | HR content | Maintain policies and procedures |
| Sysadmin | All content | Full management |

### 3. Permissions

| Permission | Worker | TL | Manager | Director | HR | Sysadmin |
|-----------|--------|----|---------|---------|----|---------|
| Read public content | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| Read department content | ❌ | ✅ | ✅ | ✅ | ✅ | ✅ |
| Read restricted content | ❌ | ❌ | Own dept | ✅ | HR | ✅ |
| Suggest edits / comments | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| Create draft articles | ❌ | ✅ | ✅ | ✅ | ✅ | ✅ |
| Publish articles | ❌ | ❌ | ✅ (own dept) | ✅ | ✅ | ✅ |
| Approve / reject contributions | ❌ | ❌ | ✅ | ✅ | ✅ | ✅ |
| Archive / delete content | ❌ | ❌ | ❌ | ❌ | ❌ | ✅ |
| Manage categories | ❌ | ❌ | ❌ | ❌ | ❌ | ✅ |

### 4. Navigation Structure

**Level 1 — Knowledge Base Tab (Business OS)**

**Level 2**

| Section | Content |
|---------|---------|
| Home | Featured articles, recent updates, personalized recommendations |
| Search | AI-powered full-text and semantic search |
| Browse by Category | Hierarchical category tree |
| Browse by Department | Department-filtered articles |
| My Saved | Articles I bookmarked |
| Recent | Recently viewed articles |
| Contribute | My draft articles; pending review articles |

**Level 3 — Article View**

- Article title, category, author, last updated date
- Versioned content (read-only; see version history)
- Table of contents (for long articles)
- Related articles sidebar
- Comments / feedback (role-filtered)
- Was this helpful? Rating
- Suggest edit button (creates draft for review)
- Share button (internal link)
- AI Summary (one-paragraph AI-generated summary at top)

**Category Hierarchy**

```
Company (Level 0)
  ├── Policies & Procedures
  │     ├── HR Policies
  │     ├── Safety Policies
  │     ├── IT / Security Policies
  │     └── Financial Policies
  ├── Operations
  │     ├── Project Processes
  │     ├── Attendance & Scheduling
  │     └── Site Operations
  ├── Shop & Retail
  ├── Technical Guides
  └── Department-Specific
        ├── Finance
        ├── HR
        ├── Projects
        └── Shop
```

**Bottom Sheets**

| Sheet | Purpose |
|-------|---------|
| Submit Suggestion | Article → suggestion text → submit for review |
| Save Article | Add to My Saved → optional tag |
| Share Article | Copy link / share to channel |
| Rate Article | 1–5 stars + optional comment |
| Contribute New Article | Title → category → content editor → submit for review |

### 5. Dashboard Structure

**Knowledge Base Home**

| Widget | Data |
|--------|------|
| Recommended Articles | AI-personalized for my role and recent activity |
| Recently Updated | Last 5 articles updated in my categories |
| Most Viewed This Week | Trending articles |
| Pending My Review | Articles awaiting my approval (for authorized roles) |
| Unanswered Questions | Questions from colleagues with no accepted answer |

### 6. Workflows

**Article Creation and Publishing Workflow**
1. Contributor (TL / Manager / HR) creates new article: title, category, content
2. Rich text editor: headings, tables, images, code blocks, embedded videos
3. Draft saved; contributor can preview
4. Contributor submits for review: selects reviewer (category owner)
5. Reviewer receives notification → reviews content for accuracy, completeness, format
6. Approved → published with author, date, version 1.0
7. All employees in the article's visibility tier notified of new content (if flagged as "important update")

**Content Review and Update Workflow**
1. Each article has configured review interval (e.g., policies: every 6 months; guides: annual)
2. System flags articles past review date
3. Category owner (HR / Director / Sysadmin) notified
4. Review: content still accurate? → approve no change, or update
5. If update: new version created, previous version archived
6. Stakeholders notified of material changes

**Knowledge Gap Identification Workflow**
1. Search queries with no useful results are logged
2. AI identifies patterns: frequently searched terms with no matching articles
3. Weekly gap report generated for Sysadmin / HR
4. Gaps assigned to subject matter experts for article creation
5. Articles created fill gaps → search results improve

### 7. Approval Flows

| Request | Chain | Notes |
|---------|-------|-------|
| New article (department) | Contributor → Dept Manager | Content accuracy review |
| New policy article | HR → Legal → CEO | Policies require senior sign-off |
| Article deletion | Category owner → Sysadmin | Preserve if referenced externally |
| Access tier change (restrict further) | Sysadmin | Content restriction |

### 8. Notifications

| Trigger | Recipients | Channel | Priority |
|---------|-----------|---------|----------|
| Article submitted for review | Reviewer | Push | Medium |
| Article published | Dept team (for important updates) | Push | Low |
| Article review due | Category owner | Push | Medium |
| Major policy update | All affected roles | Push + Email | High |
| Article rated poorly | Author + Manager | Push | Low |

### 9. Analytics

| Metric | Description |
|--------|-------------|
| Article Views | Total per article, per category, per period |
| Search Success Rate | % of searches that lead to article view |
| Search Failure Rate | % of searches with no results or zero click-through |
| Average Helpfulness Rating | Per article and per category |
| Content Coverage Score | Articles per department vs target |
| Stale Content Rate | % of articles past review date |
| Contribution Rate | Active contributors / total eligible |
| Article Gap Coverage | % of identified gaps filled |
| Time-to-Find | Estimated average time to locate needed information |
| Most Saved Articles | Frequently bookmarked content |

### 10. AI Features

| Feature | Description |
|---------|-------------|
| Semantic Search | Understands intent beyond keywords: "how do I approve a leave" finds the correct article even if exact words differ |
| AI Article Summary | Auto-generates 1-paragraph summary of any article for quick scanning |
| Content Recommendations | Personalized to user's role, current tasks, and browsing history |
| Gap Detection | Identifies search terms with no satisfactory results → triggers content creation suggestions |
| Duplicate Detection | Flags when new article being submitted has significant overlap with existing content |
| Content Freshness Scoring | AI assesses whether article content appears outdated based on PRV context signals |
| Auto-Tagging | Suggests tags and categories for new articles based on content analysis |
| Q&A Layer | Users can ask natural language questions; AI provides answers sourced from Knowledge Base |

### 11. Integrations

| Module | Integration Points |
|--------|--------------------|
| Learning Center | Knowledge Base articles can be embedded in courses; linked as reference material |
| Onboarding (HR) | Onboarding checklist links to specific Knowledge Base articles |
| Projects | Project-type-specific SOPs linked from Projects module |
| Safety Center | Safety policies and procedures referenced in safety checklists |
| Communication | Articles can be shared in channels; discussions can link to articles |
| Notification Center | Content update notifications |
| Analytics | Knowledge Base usage metrics |
| AI Center | Semantic search, Q&A, content recommendations |
| Document Center | Long-form policy documents stored in Document Center; Knowledge Base provides the searchable interface |

### 12. Future Expansion

| Capability | Description |
|-----------|-------------|
| Video Knowledge Base | In-app video articles with transcription and chapter navigation |
| Expert Directory | Find the right colleague by skill or knowledge domain |
| Q&A Community | Structured questions and answers with voting and accepted answers |
| AI Article Generator | First-draft article generation from structured inputs or interview |
| External Knowledge Integration | Import and curate content from industry standards and regulations |
| Multi-Language Knowledge Base | Automatic translation for multi-national teams |
| Knowledge Graph | Visualize relationships between articles, concepts, and people |
| Client-Facing Knowledge Base | Public FAQ and help center powered by the same platform |

---

## MODULE 19: PRV LEARNING CENTER

### 1. Module Purpose

Internal learning management system (LMS) for PRV employees. Manages course creation, assignment, delivery, assessments, certification tracking, and compliance training. Ensures all employees complete required safety and regulatory training, and provides an optional learning path for skill development and career growth. All certifications earned through the Learning Center are automatically reflected in the Workforce module.

### 2. Users

| Role | Access Scope | Key Actions |
|------|-------------|-------------|
| Worker | Assigned courses | Complete courses, take quizzes, earn certificates |
| TL | Own team + own courses | Monitor team progress, complete own |
| Manager / HR | All assigned courses | Assign courses, monitor compliance |
| Director / CEO | Summary view | Compliance rate, training coverage |
| Sysadmin | All | Create courses, configure compliance rules |

### 3. Permissions

| Permission | Worker | TL | Manager | HR | Director | Sysadmin |
|-----------|--------|----|---------|----|---------|---------|
| Take assigned courses | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| Browse course catalog | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| Self-enroll (optional courses) | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| View own progress | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| View team progress | ❌ | ✅ | ✅ | ✅ | ✅ | ✅ |
| Assign courses to others | ❌ | ❌ | ✅ | ✅ | ✅ | ✅ |
| Create / edit courses | ❌ | ❌ | ❌ | ❌ | ❌ | ✅ |
| Issue certifications | ❌ | ❌ | ❌ | ✅ | ❌ | ✅ |
| Configure compliance rules | ❌ | ❌ | ❌ | ✅ | ❌ | ✅ |
| View company-wide analytics | ❌ | ❌ | Dept | ✅ | ✅ | ✅ |

### 4. Navigation Structure

**Level 1 — Learning Center Tab (Business OS)**

**Level 2**

| Section | Content |
|---------|---------|
| My Learning | Assigned courses, in-progress, completed |
| Catalog | All available courses by category |
| My Certificates | Earned certifications with download |
| Team Progress | (TL+) Team compliance and progress overview |
| Compliance | Mandatory training status and deadlines |
| Analytics | Learning KPIs (Manager+ only) |

**Level 3 — Course Detail**

- Course name, description, category, duration, difficulty
- Module list (chapters/lessons)
- Progress indicator
- Quiz status
- Certificate eligibility
- Prerequisites
- Reviews / ratings from previous learners

**Course Player**

- Video player (portrait and landscape)
- Rich text lessons with images
- Interactive quizzes inline
- Progress auto-saved
- Bookmarks
- Note-taking within course
- Offline mode (download for offline completion)

**Bottom Sheets**

| Sheet | Purpose |
|-------|---------|
| Enroll in Course | Confirm enrollment → start immediately or schedule |
| Assign Course to Team | Course → team / individual → deadline |
| Quiz Result | Score, pass/fail, retry option, correct answers review |
| Certificate View | Digital certificate with QR verification code |

### 5. Dashboard Structure

**Worker Learning Dashboard**

| Widget | Data |
|--------|------|
| In-Progress Courses | Current courses with % complete |
| Mandatory Training Due | Compliance training with deadline |
| My Certificates | Recently earned |
| Recommended Next | AI-suggested next course |

**HR / Manager Learning Dashboard**

| Widget | Data |
|--------|------|
| Team Compliance Rate | % team with all mandatory training complete |
| Overdue Training | Employees past deadline |
| Certificates Earned MTD | Team achievements |
| Course Completion Trend | 12-week chart |

### 6. Workflows

**Compliance Training Assignment Workflow**
1. HR configures mandatory training rules: role → required course → deadline → recurrence
2. New employee onboarded → system auto-assigns mandatory courses based on role
3. Employee receives notification: "You have [X] required trainings. Complete by [date]"
4. Employee completes course → quiz → passes
5. Completion logged; certificate issued if applicable
6. Workforce module updated: certification status = current
7. HR compliance report reflects completion

**Course Completion and Certification Workflow**
1. Employee completes all modules in course
2. Final quiz presented: must score above pass threshold (configurable per course)
3. If passed: certificate generated with employee name, course name, date, PRV logo, unique ID + QR
4. Certificate downloadable as PDF and stored in Document Center
5. Workforce module updated with certification entry + expiry date if applicable
6. TL and HR notified of completion

**Overdue Training Escalation Workflow**
1. Training deadline approaches: T–7 days notification to employee
2. T–3 days: TL notified
3. T–0 (deadline day): employee marked non-compliant
4. T+1: TL + HR notified; employee cannot be assigned to tasks requiring that certification
5. T+7: Ops Manager notified; formal compliance flag on employee record
6. T+14: CEO and HR escalation; disciplinary procedure may be initiated

### 7. Approval Flows

| Request | Chain | Notes |
|---------|-------|-------|
| New course creation | Sysadmin → HR (for compliance courses) | Content review |
| Mandatory training rule addition | HR → CEO | Compliance change |
| Certification equivalency claim | HR | External cert accepted in lieu of internal course |
| Training waiver (temporary) | HR → CEO | Emergency waiver only |

### 8. Notifications

| Trigger | Recipients | Channel | Priority |
|---------|-----------|---------|----------|
| New course assigned | Employee | Push + Email | Medium |
| Mandatory training due (7d) | Employee | Push | Medium |
| Mandatory training due (3d) | Employee + TL | Push | High |
| Training overdue | Employee + TL + HR | Push + Email | Critical |
| Course completed | Employee (confirmation) | Push | Low |
| Certificate issued | Employee | Push | Low |
| Team compliance alert | Manager | Push | High |
| Quiz failed (retry needed) | Employee | Push | Medium |

### 9. Analytics

| Metric | Description |
|--------|-------------|
| Compliance Rate | % employees with all mandatory training current |
| Course Completion Rate | % of enrolled employees who complete each course |
| Average Time-to-Complete | Per course |
| Pass Rate | % of quiz attempts passing on first try |
| Retry Rate | Average attempts before passing |
| Training Hours per Employee | Total learning hours per employee per month |
| Course Ratings | Average rating per course from learner feedback |
| Certificate Distribution | Certifications earned per course / per period |
| Overdue Training Volume | Count by team / department |
| Self-Enrollment Rate | % of completions from voluntary self-enrollment |
| Learning Velocity | Lessons completed per day per active learner |
| Certification Expiry Trend | Certifications expiring in next 30/60/90 days |

### 10. AI Features

| Feature | Description |
|---------|-------------|
| Personalized Learning Path | Based on role, current certifications, performance gaps, and career goals: recommends next courses |
| Adaptive Quiz Engine | Adjusts question difficulty based on previous answers; surfaces weak areas for additional practice |
| Content Recommendation | Suggests relevant courses based on current project type and team needs |
| Learning Gap Analysis | Per team: identifies skill gaps vs project requirements; recommends targeted training |
| Engagement Prediction | Flags employees at risk of not completing assigned training before deadline |
| Auto-Caption Generation | For video courses: automatic subtitles for accessibility |
| Course Effectiveness Analysis | Correlates training completion with performance improvements post-training |
| AI Course Creator Assistant | Helps content creators structure new courses from raw material |

### 11. Integrations

| Module | Integration Points |
|--------|--------------------|
| Workforce | Completed certifications auto-updated in employee profile |
| HR | Compliance training rules; onboarding triggers automatic assignments; performance gap → training recommendation |
| Knowledge Base | Courses can reference and embed Knowledge Base articles |
| Document Center | Certificates stored; course materials linked |
| Notification Center | All training alerts |
| Analytics | Learning KPIs in HR dashboards |
| AI Center | Learning path personalization, engagement prediction |
| Safety Center | Safety certifications required for site work |

### 12. Future Expansion

| Capability | Description |
|-----------|-------------|
| External Course Integration | Import courses from LinkedIn Learning, Udemy for Business, industry bodies |
| Live Virtual Classes | In-app video conferencing for instructor-led training |
| Gamification | Leaderboards, badges, learning streaks, team challenges |
| VR Safety Training | Virtual reality safety scenario training (iOS Vision Pro / Android XR) |
| Microlearning | 2–5 minute daily learning bursts; habit-forming learning |
| Multi-Language Courses | Courses delivered in employee's preferred language |
| External Certification Sync | Import and validate external certification records |
| Client Training Portal | Customized training for clients on PRV products/services |

---

## MODULE 20: PRV SAFETY CENTER

### 1. Module Purpose

Workplace safety management for all PRV sites, projects, and facilities. Manages incident and accident reporting, near-miss documentation, safety checklists, safety compliance tracking, risk assessments, and safety analytics. Ensures regulatory compliance, protects employees, and reduces workplace injury rates. Every safety-critical event is logged, escalated appropriately, and investigated to closure.

### 2. Users

| Role | Access Scope | Key Actions |
|------|-------------|-------------|
| Worker | Own incidents / own site | Report incidents, complete checklists |
| TL | Own team + own site | Review incidents, conduct checklists, brief team |
| OPM | Own project | Site safety management |
| Ops Manager | All sites | Oversight, investigation, compliance |
| HR | All employees | Injury records, compliance reporting |
| CEO | All companies | Safety KPIs, critical incident escalation |

### 3. Permissions

| Permission | Worker | TL | OPM | Ops Manager | HR | CEO |
|-----------|--------|----|----|-------------|-----|-----|
| Report Incident | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| View Own Incident | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| View Team Incidents | ❌ | ✅ | ✅ | ✅ | ✅ | ✅ |
| View All Incidents | ❌ | ❌ | ✅ | ✅ | ✅ | ✅ |
| Conduct Safety Checklist | ✅ | ✅ | ✅ | ✅ | ❌ | ❌ |
| Manage Checklist Templates | ❌ | ❌ | ✅ | ✅ | ❌ | ❌ |
| Investigate Incident | ❌ | ❌ | ✅ | ✅ | ✅ | ❌ |
| Close Incident | ❌ | ❌ | ✅ | ✅ | ✅ | ❌ |
| View Safety Analytics | ❌ | Team | Project | All | All | All |
| Manage Safety Documents | ❌ | ❌ | ✅ | ✅ | ❌ | ❌ |
| Configure Safety Rules | ❌ | ❌ | ❌ | ✅ | ❌ | ❌ |

### 4. Navigation Structure

**Level 1 — Safety Center Tab (Business OS)**

**Level 2**

| Section | Content |
|---------|---------|
| Dashboard | Safety KPIs, active incidents, compliance status |
| Incidents | All incident/accident/near-miss reports |
| Checklists | Safety checklist templates and completed checks |
| Risk Register | Identified risks with mitigation status |
| Safety Documents | Safety policies, MSDS sheets, method statements |
| Training Compliance | Safety training status per employee |
| Analytics | Safety performance metrics |

**Level 3 — Incident Detail**

- Type: Incident / Accident / Near Miss / Property Damage
- Date, time, location (project/site)
- Persons involved
- Description of event
- Injuries: type, severity, treatment received
- Photos / evidence
- Witnesses
- Immediate actions taken
- Investigation status: Open / Under Investigation / Closed
- Root cause (post-investigation)
- Corrective actions with owners and deadlines
- Regulatory notification status (if required)

**Bottom Sheets**

| Sheet | Purpose |
|-------|---------|
| Report Incident | Type → date/time → location → description → persons → photos → submit |
| Conduct Checklist | Template → site → go through items → photo evidence → sign-off |
| Log Corrective Action | Incident → action → owner → deadline |
| Add Risk | Description → likelihood → impact → mitigation → owner |
| Safety Brief Log | Date → team → topics covered → attendees signatures |

### 5. Dashboard Structure

**Safety Dashboard**

| Widget | Data |
|--------|------|
| Days Since Last Incident | Running counter per site and company |
| Open Incidents | Count by severity |
| Checklists Due Today | Outstanding safety checks |
| Training Compliance | % of workers with current safety certifications |
| Top Risk Items | Highest-rated open risks |
| Corrective Actions Overdue | Unresolved corrective actions past deadline |

**CEO Safety Widget**

| Widget | Data |
|--------|------|
| LTIFR | Lost Time Injury Frequency Rate |
| Incidents MTD | Count by severity |
| Open Critical Incidents | Requiring CEO attention |
| Safety Score | Company-wide composite safety score |

### 6. Workflows

**Incident Reporting Workflow**
1. Worker / TL identifies incident, accident, or near-miss
2. Immediately opens Safety Center → Report Incident (mobile-first, designed for on-site use)
3. Type selection → step-by-step guided form: location, description, persons, injuries, photos
4. Submitted → Ops Manager and HR notified immediately
5. If injury involved: severity assessment → Minor (TL handles) / Serious (Ops Manager + HR) / Critical (CEO + authorities)
6. Investigation opened: assigned investigator, deadline, team
7. Investigation complete: root cause, contributing factors, corrective actions
8. Corrective actions assigned to owners with deadlines
9. All corrective actions completed → incident closed
10. Regulatory reporting: if required (serious injury, fatality), regulatory notification tracked

**Site Safety Checklist Workflow**
1. TL / OPM conducts daily or task-specific safety checklist
2. Opens checklist template (configured per project type / task type)
3. Works through items: compliant / non-compliant / N/A + photo evidence per item
4. Non-compliant item: tagged as issue; must describe and photograph
5. Checklist submitted and signed off
6. Issues from checklist → auto-created Risk items for follow-up
7. Checklist history preserved per site per date

**Near-Miss Investigation Workflow**
1. Near-miss reported (event that could have caused injury but didn't)
2. TL acknowledges within 1 hour
3. Brief investigation: what happened, why, what could have happened
4. Corrective action assigned to prevent recurrence
5. Near-miss logged in statistics (near-miss rate is a leading indicator)
6. Brief communicated to team at next safety briefing

### 7. Approval Flows

| Request | Chain | Notes |
|---------|-------|-------|
| Incident Close | OPM → Ops Manager | All corrective actions must be complete |
| Regulatory Notification | Ops Manager → CEO → Legal | Before filing with authority |
| Safety Policy Change | Ops Manager → CEO | Policy affects all workers |
| Return-to-Work Authorization | HR → Ops Manager + Medical | Post-injury return |
| High-Risk Work Permit | TL → OPM → Ops Manager | Hot work, confined spaces, working at heights |

### 8. Notifications

| Trigger | Recipients | Channel | Priority |
|---------|-----------|---------|----------|
| Incident reported (any) | TL + OPM + Ops Manager | Push | High |
| Accident (injury) | Ops Manager + HR + CEO | Push + Email | Critical |
| Critical incident (serious injury) | CEO + HR + Legal | Push + Email + SMS | Critical |
| Checklist non-compliance | TL + OPM | Push | High |
| Corrective action overdue | Action owner + Ops Manager | Push | High |
| Safety training overdue | Employee + HR | Push | High |
| Days since incident milestone | Safety team + CEO | Push | Low |

### 9. Analytics

| Metric | Description |
|--------|-------------|
| LTIFR | Lost Time Injury Frequency Rate (LTIs per million hours worked) |
| TRIR | Total Recordable Incident Rate |
| Near-Miss Rate | Near-misses per 1,000 working days (leading indicator) |
| Incident Severity Distribution | % minor / moderate / serious / critical |
| Days Since Last Incident | Per site and company |
| Checklist Completion Rate | % of required checklists completed on schedule |
| Non-Compliance Rate | % of checklist items marked non-compliant |
| Corrective Action Completion Rate | % completed by deadline |
| Safety Training Coverage | % workforce with all safety certifications current |
| Most Dangerous Sites | Sites with highest incident rates |
| Incident Cause Distribution | Most common root causes |
| Cost of Incidents | Medical, downtime, replacement, insurance impact |

### 10. AI Features

| Feature | Description |
|---------|-------------|
| Incident Pattern Recognition | Identifies recurring incident types, locations, times, or team patterns before they become trends |
| Risk Recurrence Prediction | Based on site conditions, project type, and historical incidents: flags elevated risk windows |
| Checklist Optimization | Analyzes non-compliance patterns to suggest checklist improvements |
| Near-Miss Correlation | Correlates near-misses with subsequent incident rates to validate leading indicator value |
| Safety Briefing Generator | Auto-generates this week's safety briefing topics based on recent incidents and upcoming work type |
| Anomaly Detection | Flags unusual reporting patterns (sudden spike or drop in incident reporting — both can indicate problems) |

### 11. Integrations

| Module | Integration Points |
|--------|--------------------|
| Projects | Safety checklists linked to project phases; incidents linked to project record |
| Attendance | Worker presence on site at time of incident |
| Workforce | Worker certification checks before high-risk task assignment |
| HR | Injury records in employee HR file; return-to-work process |
| Learning Center | Safety training completion requirements |
| Document Center | Safety policies, method statements, investigation reports |
| Notification Center | All safety alerts (highest priority) |
| Analytics | Safety KPIs in executive and operational dashboards |
| AI Center | Pattern recognition, risk prediction |
| Procurement | PPE procurement requests triggered by safety checklist gaps |

### 12. Future Expansion

| Capability | Description |
|-----------|-------------|
| IoT Safety Monitoring | Wearable gas detectors, temperature sensors feeding live safety data |
| Photo AI Analysis | Automatic detection of safety violations in uploaded site photos |
| Regulatory Database | Built-in regulatory compliance checker per jurisdiction |
| Emergency Response Protocol | In-app emergency response playbook with GPS-triggered notifications |
| Contractor Safety Portal | External contractors can submit their own safety records |
| Safety Culture Score | Employee-reported safety culture survey with trend tracking |
| Permit-to-Work System | Digital permit system for high-risk work authorization |
| Incident Cost Calculator | Automatic direct + indirect cost estimation for incidents |

---

## MODULE 21: PRV COMMAND CENTER

### 1. Module Purpose

The central control room of PRV — the first screen every user opens and the last screen they leave. The Command Center is the unified hub that aggregates the most critical information from all 18 platforms into a single, role-adaptive interface. For a Worker: it shows today's tasks and schedule. For a CEO: it shows the entire company's health in under 60 seconds. It houses the Universal Inbox, Universal Search, Command Palette, Calendar, Critical Alerts, and AI Insights — the connective tissue that makes PRV feel like one system, not 21 separate modules.

### 2. Users

Every role uses the Command Center as their primary home screen. The experience adapts completely to the user's role and scope.

| Role | Command Center Experience |
|------|--------------------------|
| CEO / Co-CEO | Executive Cockpit: Company Health Index, Revenue, Projects, Workforce, AI Insights, Critical Alerts |
| Finance | Finance Command: Revenue, Cashflow, Overdue Invoices, Budget Status, Payroll |
| Ops Manager | Operations Command: Active Projects, Team Status, Site Coverage, Procurement, Fleet |
| Project Director / OPM | Project Command: My Projects, Today's Tasks, Milestones, Budget Alerts |
| HR | People Command: Headcount, Leave Calendar, Payroll, Compliance, Open Positions |
| Store Manager | Shop Command: Today's Sales, Inventory Alerts, Staff On Shift, Active Promotions |
| TL / Worker | My Day: Today's Tasks, Schedule, Check-In Status, Team Updates |

### 3. Permissions

Command Center respects all underlying module permissions. Users see aggregated data only from modules and scopes they have access to. No additional permission layer — the aggregation layer inherits from each source module.

### 4. Navigation Structure

**Level 1 — Command Center (Tab 1, default landing screen)**

**Level 2 — Command Center Sections**

| Section | Content |
|---------|---------|
| My Day / Executive Cockpit | Role-adaptive primary dashboard |
| Universal Inbox | All messages, notifications, approvals, mentions in one feed |
| Calendar | Cross-module calendar: projects, shifts, meetings, deadlines |
| Critical Alerts | High-priority items requiring immediate action |
| AI Insights | Proactive AI recommendations and risk detections |
| Favorites | Pinned shortcuts to frequently accessed records |
| Universal Search | Search across all modules simultaneously |
| Company Health | CEO: Company Health Index full view |
| Forecasts | CEO / Finance: forward-looking business metrics |

**Level 3 — Detail**

Every item in Command Center is tappable and navigates to the source record in its module (always via Bottom Sheet first for quick review, then optionally deep-navigate).

**Command Palette (⌘K — globally accessible from any screen)**

Keyboard shortcut on desktop/iPad, floating button on iPhone.

Actions available:
- Search (universal, NLP-powered)
- Navigate ("Go to Finance", "Open Project X")
- Create ("New Task", "New Invoice", "Submit Leave Request")
- Approve ("Approve pending leaves", "View approval queue")
- AI Query ("What is our revenue this month?")
- Recent items (jump to last 5 opened records)

**Bottom Sheets from Command Center**

| Sheet | Purpose |
|-------|---------|
| Inbox Item Detail | Message / notification / approval full view + action buttons |
| Alert Detail | Critical alert context + recommended actions |
| AI Insight Detail | Full context, supporting data, recommended action |
| Calendar Event Detail | Event details + linked records + RSVP |
| Quick Create | Type → fills appropriate creation sheet for module |

### 5. Dashboard Structure

**My Day (Worker / TL)**

| Widget | Data |
|--------|------|
| Check-In Status | Current status + Check In/Out button |
| Today's Tasks | Prioritized list from Projects module |
| Today's Schedule | Shift, site, meetings |
| Team Members Present | Quick view of who is on site |
| Unread Inbox | Count + preview |
| Recent Activity | Project and team feed |
| AI Tip | One daily tip or reminder relevant to role |

**Executive Cockpit (CEO — 60-Second Rule)**

| Widget | Data | Source Module |
|--------|------|--------------|
| Revenue Today / MTD / YTD | Triple KPI card | Finance |
| Gross Profit % | Current vs prior period | Finance |
| Active Projects | Count: On Track / At Risk / Delayed | Projects |
| Workforce Status | Present / Absent / On Leave today | Attendance |
| Inventory Risk | Out-of-stock items count | Shop |
| Critical Alerts | P0 issues requiring CEO attention | All modules |
| AI Recommendations | Top 3 actionable insights | AI Center |
| Company Health Index | Composite score 0–100 | Analytics |
| Cashflow Forecast | 30-day projection | Finance |

All 9 data points visible without scrolling. Every point tappable for drill-down.

**Finance Command (Finance role)**

| Widget | Data |
|--------|------|
| Revenue MTD | vs budget |
| Outstanding Receivables | Aging buckets |
| Cashflow Position | Current + 30d forecast |
| Next Payroll | Date + estimated total |
| Budget Variance | Company overview |
| Overdue Invoices | List |

**Operations Command (Ops Manager)**

| Widget | Data |
|--------|------|
| Active Projects | Health grid |
| Team Attendance | Present / absent today |
| Site Coverage | Workers per active site |
| Procurement Alerts | Deliveries due, PO approvals |
| Fleet Status | Vehicles assigned / available |
| Pending Approvals | My approval queue |

### 6. Workflows

**Universal Inbox Processing Workflow**
1. All events across PRV (messages, approvals, alerts, @mentions, task assignments, notifications) flow into Universal Inbox
2. Inbox items grouped by: Needs Action / Informational / Done
3. "Needs Action" items surfaced first (approvals, task assignments, urgent alerts)
4. One-tap actions inline: Approve / Reply / Mark Done / Navigate to Source
5. Inbox maintains state: items processed stay in history; unread count updates in real-time
6. Weekly digest: summary of all inbox activity for review

**CEO 60-Second Check Workflow**
1. CEO opens PRV (Face ID authentication)
2. Command Center loads from server-side pre-computed cache (< 1 second)
3. Executive Cockpit visible immediately: all 9 KPI widgets populated
4. CEO scans: green indicators = healthy, amber = attention needed, red = action required
5. Any red indicator: Critical Alerts section expanded
6. CEO taps critical alert → AI Insight Detail with recommended action
7. CEO takes action inline (approve, call, message) or delegates (one-tap delegate to named colleague)
8. Total time: under 60 seconds for full situational awareness

**Calendar Cross-Module Aggregation Workflow**
1. Calendar in Command Center aggregates from all modules:
   - Project milestones and deadlines (Projects)
   - Shift schedules (Attendance)
   - Leave periods (HR)
   - Meetings scheduled (CRM / Communication)
   - Procurement deliveries expected (Procurement)
   - Vehicle returns expected (Fleet)
   - Safety checklist due dates (Safety)
2. Single calendar view shows everything relevant to the user's role and scope
3. Conflicts visible: e.g., meeting scheduled during confirmed leave
4. Tapping any calendar item opens bottom sheet with full context from source module

### 7. Approval Flows

Command Center surfaces approval requests from Approval Center. It does not own approval logic.

The Command Center "Needs Action" inbox section is the primary UI for processing approvals without navigating to individual modules.

### 8. Notifications

Command Center is the primary notification surface — it aggregates from Notification Center. Critical Alerts in Command Center bypass DND settings.

| Trigger | Behavior in Command Center |
|---------|--------------------------|
| Critical Alert (any module) | Red badge on Critical Alerts section; persistent until acknowledged |
| New Inbox item | Badge count incremented |
| New AI Insight (high priority) | AI Insights section highlighted |
| Company Health Index drop | CEO: CHI card color changes with animated indicator |
| Urgent message | Inbox item marked with priority indicator |

### 9. Analytics

| Metric | Description |
|--------|-------------|
| Command Center Engagement | Average session starts per day per user |
| Inbox Zero Rate | % of users clearing inbox daily |
| Critical Alert Response Time | Time from alert to CEO acknowledgment |
| AI Insight Action Rate | % of surfaced insights acted upon |
| Calendar Utilization | % of users actively using cross-module calendar |
| Command Palette Usage | Queries per day; top search terms |
| Dashboard Widget Engagement | Most interacted widgets per role |
| Average Time-to-Decision | CEO: time from opening PRV to taking first action |
| Approval Processing Speed | Time from inbox notification to approval decision |

### 10. AI Features

| Feature | Description |
|---------|-------------|
| Daily Briefing | Role-specific AI-generated morning briefing: yesterday's summary, today's priorities, risks |
| Predictive Inbox Prioritization | Learns from user behavior to surface most time-sensitive inbox items first |
| Smart Calendar Alerts | Detects calendar conflicts and overcommitments before they occur |
| Company Health Narrative | Plain-language explanation of CHI score movements: "Health dropped 3 points because X and Y" |
| Action Recommendation Engine | For each critical alert: specific recommended action with one-tap execution |
| Cross-Module Correlation Insights | "Projects slipping budget are also the ones with low attendance compliance" — connections humans miss |
| Executive Summary Generator | On demand: "Summarize this week" → full narrative with key events, decisions, and metrics |
| Goal Progress Tracking | CEO-set goals tracked across modules; AI reports progress toward each goal weekly |

### 11. Integrations

Command Center integrates with every module as an aggregator and action surface. It does not own data — it surfaces it from source modules.

| Module | What Command Center Shows |
|--------|--------------------------|
| Projects | Active project health, today's milestones, overdue tasks |
| Finance | Revenue, cashflow, overdue invoices, budget alerts |
| Attendance | Workforce status, check-ins, leave today |
| HR | Payroll status, compliance alerts, headcount |
| Shop | Sales, inventory alerts, store performance |
| CRM | Pipeline, follow-ups due, lead alerts |
| Procurement | Deliveries, PO approvals, supplier alerts |
| Safety | Active incidents, checklist compliance |
| Notification Center | All notifications aggregated into Inbox |
| AI Center | All AI insights and recommendations |
| Approval Center | All pending approvals in "Needs Action" section |
| Communication | All messages and @mentions in Inbox |

### 12. Future Expansion

| Capability | Description |
|-----------|-------------|
| Voice-Activated Command Center | "Hey PRV, what's my revenue today?" via iOS Siri integration |
| Home Screen Widget Pack | iOS/Android widgets showing Command Center KPIs on home screen |
| Apple Watch Face | CEO health metrics on Apple Watch glanceable face |
| Shared Executive Dashboard | CEO can share a read-only executive view with board members |
| Custom Command Center Layouts | Users can rearrange and resize widgets to their preference |
| Goal Management | CEO can set company goals; Command Center tracks and surfaces progress |
| External Data Integration | Show market data, news, competitor signals in CEO cockpit |
| Multi-Company Command View | CEO sees all PRV Group companies in single Command Center |

---

## CROSS-MODULE INTEGRATION RULES

These rules apply universally to all 21 modules. Every module must comply without exception.

### 1. Data Flow Map

**Principle**: Data flows in one direction per domain. No circular dependencies. No module duplicates another's data — it references it.

| Data Domain | Authoritative Source | Consumers |
|-------------|---------------------|-----------|
| People / HR | Workforce + HR | All modules (via reference) |
| Financial | Finance | Projects, Shop, HR, CRM, Analytics |
| Inventory | Shop | Procurement, Analytics, Public App |
| Project Status | Projects | CRM, Finance, Analytics, AI, Public App |
| Attendance / Hours | Attendance | HR, Finance, Projects, Analytics |
| Documents | Document Center | All modules (via link, never copy) |
| Notifications | Notification Center | All modules (send-only, receive-only) |
| Analytics Data | Analytics | Command Center, AI Center, Reports |
| AI Signals | AI Center | All modules (consume insights) |
| Approvals | Approval Center | All modules (route-only) |

### 2. Notification Bus

Every module generates notification events. No module delivers notifications directly.

**Required notification event schema** (all modules must follow):

```
Event:
  module: [module identifier]
  event_type: [string]
  priority: CRITICAL | HIGH | MEDIUM | LOW | INFO
  recipients: [list of user IDs with role/scope filter]
  title: [max 80 chars]
  body: [max 200 chars]
  action_buttons: [list of labeled actions with target URLs]
  source_record: [module + record_id for deep-link navigation]
  metadata: [key-value pairs for filtering/deduplication]
  timestamp: [ISO8601]
  company_id: [multi-tenancy scope]
```

Notification Center applies: deduplication, DND rules, preference filtering, escalation rules before delivery.

### 3. Permission Inheritance

Every resource access check follows the 4-gate chain:

```
Request → Authentication → Role Check → Scope Validation → Company Isolation → Execute → Audit
```

No module bypasses any gate. Rules:
- **Authentication**: Every API call carries a signed token; no anonymous access to internal modules
- **Role Check**: Every action verified against the permission catalog for the role
- **Scope Validation**: Data access filtered to company_id / store_id / team_id / region_id as applicable
- **Company Isolation**: Row-Level Security enforced at database level; application layer is a second check only

### 4. Audit Log Standards

Every module must emit audit events for all state-changing operations.

**Required audit event fields**:

| Field | Required | Description |
|-------|----------|-------------|
| event_id | ✅ | UUID, unique per event |
| timestamp | ✅ | ISO8601 with milliseconds |
| actor_user_id | ✅ | Who performed the action |
| actor_role | ✅ | Role at time of action |
| action | ✅ | CREATE / READ_SENSITIVE / UPDATE / DELETE / APPROVE / REJECT / EXPORT |
| resource_type | ✅ | Which entity type |
| resource_id | ✅ | Which specific record |
| company_id | ✅ | Which company |
| old_value | ✅ (updates) | Serialized previous state |
| new_value | ✅ (updates) | Serialized new state |
| ip_address | ✅ | Client IP |
| device_id | ✅ | Device fingerprint |
| session_id | ✅ | Session identifier |
| chain_hash | ✅ | SHA-256 of previous event + this event (immutability chain) |

Audit logs are: append-only, never deletable, SHA-256 chained, replicated to separate storage.

### 5. Search Index Standards

Every module must contribute searchable content to the Universal Search index.

**Required index schema per record**:

| Field | Required | Description |
|-------|----------|-------------|
| record_id | ✅ | Unique record identifier |
| module | ✅ | Source module |
| record_type | ✅ | Entity type within module |
| title | ✅ | Primary search text (name, title, number) |
| body | Optional | Secondary text content |
| tags | Optional | Categorical tags |
| company_id | ✅ | For scope filtering |
| role_visibility | ✅ | Which roles can see this result |
| created_at | ✅ | For recency sorting |
| updated_at | ✅ | For freshness |
| deep_link | ✅ | In-app URL to navigate to record |

Search results are always filtered by: authenticated user's company + role + scope before display.

### 6. Analytics Data Contract

Every module must expose metrics to the Analytics hub.

**Required analytics events**:

| Event Type | Required | Description |
|-----------|----------|-------------|
| Entity created | ✅ | Whenever a new record is created |
| Entity updated (key fields) | ✅ | State changes that affect KPIs |
| Entity deleted / archived | ✅ | Lifecycle end |
| Action performed | ✅ | User actions (approve, complete, submit) |
| Status transition | ✅ | Status field changes |

**Metric metadata**:
- company_id: always
- user_id: always
- role: always
- timestamp: always
- dimensions: module-specific context (project_id, store_id, department_id)

Analytics module polls via event stream (real-time) or batch (nightly for heavy aggregations).

### 7. AI Data Contract

Every module must provide structured data to the AI Center for model training and inference.

**What modules provide**:

| Module | AI Data Provided |
|--------|----------------|
| Projects | Task completion rates, budget trajectories, phase durations, team assignments |
| Finance | Revenue time series, expense categorized data, invoice payment patterns |
| HR | Tenure, performance scores, absence patterns, training completion |
| Shop | Sales time series per SKU, return rates, promotion impact |
| CRM | Lead engagement scores, quote acceptance data, communication frequency |
| Attendance | Check-in patterns, leave frequencies, overtime trends |

**AI Model Access Rules**:
- AI models have read-only access to company_id-scoped data only
- AI outputs (scores, predictions) stored with explainability metadata
- No cross-company AI model contamination (models trained per company, not across companies without consent)
- All AI predictions include confidence score and data timestamp

### 8. Document Standards

Every module that creates or references documents must follow these standards:

**Documents are owned by Document Center**. Modules create/reference documents; they do not store binary files.

| Rule | Description |
|------|-------------|
| No module stores binary files directly | All PDFs, images, files stored in Document Center |
| Reference by document_id | Modules store document_id references, not file copies |
| Metadata required | Every document must have: category, security_level, linked_record, created_by, company_id |
| Version history | Every update creates new version; previous preserved |
| Access logging | Every view/download logged in Document Center audit trail |
| Retention policy | Every document category has mandatory retention policy assigned |

### 9. Approval Bus

Every approval request must route through the Approval Center.

**Required approval request schema**:

```
Request:
  request_id: UUID
  module: [source module]
  request_type: [e.g., LEAVE_APPROVAL, EXPENSE_APPROVAL]
  requester_user_id: UUID
  company_id: UUID
  subject: [max 120 chars]
  details: [structured JSON of request data]
  documents: [list of document_ids]
  approval_template_id: [configured chain]
  urgency: STANDARD | URGENT | EMERGENCY
  created_at: ISO8601
  due_by: ISO8601 (SLA deadline)
  deep_link: [in-app URL to source record]
```

Approval Center manages routing, escalation, delegation, and SLA enforcement. Source modules receive webhook callbacks on decision.

### 10. Command Center Integration

Every module must expose a Command Center data contract — a defined set of KPIs and alerts surfaced to the user's role-adaptive dashboard.

**Required module contributions to Command Center**:

| Contribution Type | Description |
|-----------------|-------------|
| Primary KPI | 1–3 most important metrics per module, per role |
| Alert Conditions | Conditions that generate Critical Alerts in Command Center |
| Today's Items | Items requiring today's attention (tasks due, meetings, deadlines) |
| Trend Indicator | Direction arrow for primary KPI vs prior period |
| Quick Action | 1–2 most common actions accessible directly from Command Center |

All Command Center data is pre-computed server-side on a refresh cycle and cached. Command Center never makes synchronous calls to modules at render time.

---

## MODULE DEPENDENCY MAP

```
Command Center ← ALL MODULES
Notification Center ← ALL MODULES (event source)
Analytics ← ALL MODULES (data source)
AI Center ← ALL MODULES (data source)
Approval Center ← Attendance, HR, Finance, Projects, Procurement, Shop, CRM, Documents, Fleet, Tool
Document Center ← ALL MODULES (document storage)
Universal Search ← ALL MODULES (index contribution)

Module-to-Module Dependencies:
  HR ← Workforce (people data)
  HR ← Attendance (timesheets → payroll)
  HR ← Finance (payroll expenses)
  HR ← Learning Center (training compliance)
  Projects ← Workforce (team members)
  Projects ← Attendance (site hours)
  Projects ← Finance (budgets, costs)
  Projects ← Procurement (materials)
  Projects ← Safety (site safety)
  Projects ← CRM (client link)
  Shop ← Procurement (stock replenishment)
  Shop ← Finance (revenue accounting)
  CRM ← Public App (quote requests → leads)
  CRM ← Finance (invoice, payment status)
  CRM ← Projects (project status → customer portal)
  Fleet ← Workforce (driver certifications)
  Fleet ← Projects (vehicle assignments)
  Tool ← Workforce (tool assignments)
  Tool ← Projects (tool assignments per site)
  Safety ← Learning (safety certification)
  Safety ← Projects (site incidents)
  Knowledge Base ← Learning (course reference material)
  Knowledge Base ← Safety (safety policies)
  Public App ← Shop (product catalog)
  Public App ← Projects (portfolio showcase)
  Public App ← CRM (quote → lead)
```

---

## COMPLETE MODULE STATUS TABLE

| # | Module | Status | Primary Users | Key Workflows | Integrations |
|---|--------|--------|--------------|---------------|-------------|
| 1 | Public Application | Blueprint Complete | Public Users, Clients | Quote Request, Order, Client Portal | CRM, Shop, Finance, Projects, Docs |
| 2 | PRV Projects | Blueprint Complete | Director, OPM, TL, Worker | Project Lifecycle, Task Completion, Photo Approval | Finance, Attendance, HR, Procurement, CRM, Docs |
| 3 | PRV Attendance | Blueprint Complete | Worker, TL, OMS, Ops Manager, HR | Check-In, Leave Request, Override | Projects, HR, Finance, Workforce |
| 4 | PRV Workforce | Blueprint Complete | CEO, HR, Ops Manager, TL | Onboarding, Transfer, Certification Expiry | HR, Attendance, Projects, Tools, Fleet, Learning |
| 5 | PRV HR | Blueprint Complete | HR, Manager, CEO, Finance | Payroll, Recruitment, Performance Review, Contract | Workforce, Attendance, Finance, Documents, Learning |
| 6 | PRV Shop | Blueprint Complete | Shop Director, Store Manager, Seller | POS Sale, Stock Reorder, Return Processing | Finance, Procurement, CRM, Public App, Analytics |
| 7 | PRV CRM | Blueprint Complete | CEO, Ops Manager, Director | Lead Conversion, Quote Negotiation, Customer 360 | Public App, Projects, Finance, Documents, AI |
| 8 | PRV Finance | Blueprint Complete | Finance, CEO, Ops Manager | Invoice Lifecycle, Expense Approval, Payroll | Projects, Shop, HR, Procurement, CRM, Documents |
| 9 | PRV Document Center | Blueprint Complete | All Roles | Contract Signature, Version Control, Retention | All Modules (storage layer) |
| 10 | PRV Communication Center | Blueprint Complete | All Roles | Project Channel, Announcement, Message | Notification, Inbox, Projects, AI |
| 11 | PRV Notification Center | Blueprint Complete | All Roles (infrastructure) | Delivery, Escalation, Digest | All Modules (notification bus) |
| 12 | PRV Analytics | Blueprint Complete | CEO, Finance, Managers, Data Analyst | Custom Reports, KPI Monitoring, Forecasts | All Modules (data consumers) |
| 13 | PRV AI Center | Blueprint Complete | All Roles | Executive Briefing, Risk Detection, Automation | All Modules (intelligence layer) |
| 14 | PRV Approval Center | Blueprint Complete | All Roles (approvers) | Multi-Level Approval, Delegation, SLA | All Modules (approval bus) |
| 15 | PRV Procurement | Blueprint Complete | Procurement, OPM, Finance | Purchase Request → PO → Delivery | Projects, Shop, Finance, Fleet, Documents |
| 16 | PRV Tool Management | Blueprint Complete | Worker, TL, OPM, Ops Manager | Assignment, Maintenance, Damage Report | Projects, Workforce, Finance, Procurement |
| 17 | PRV Fleet Management | Blueprint Complete | Driver, TL, OPM, Ops Manager | Vehicle Assignment, Maintenance, Incident | Projects, Workforce, Finance, Procurement |
| 18 | PRV Knowledge Base | Blueprint Complete | All Roles | Article Creation, Content Review, AI Search | Learning, Safety, Documents, AI |
| 19 | PRV Learning Center | Blueprint Complete | All Roles | Course Completion, Compliance Training, Certification | Workforce, HR, Safety, Knowledge Base |
| 20 | PRV Safety Center | Blueprint Complete | Worker, TL, OPM, Ops Manager, HR | Incident Report, Safety Checklist, Investigation | Projects, HR, Learning, Documents, Analytics |
| 21 | PRV Command Center | Blueprint Complete | All Roles (primary home) | CEO 60-Second Check, Inbox Processing, Calendar | ALL MODULES (aggregation layer) |

---

## SUMMARY STATISTICS

| Dimension | Count |
|-----------|-------|
| Total Modules | 21 |
| Cross-Cutting Infrastructure Modules | 5 (Notification, Analytics, AI, Approval, Documents) |
| Operational Modules | 12 (Projects, Attendance, Workforce, HR, Shop, CRM, Finance, Procurement, Tool, Fleet, Safety, Learning) |
| Interface Modules | 2 (Public App, Knowledge Base) |
| Command Layer | 1 (Command Center) |
| Total Approval Flow Types | 87+ |
| Total Notification Trigger Types | 120+ |
| Total Analytics Metrics Defined | 200+ |
| Total AI Features | 65+ |
| Total Workflows Documented | 85+ |
| Roles Served | 19 |
| Company Scope Support | Multi-company (PRV Group) |
| Platform Support | iPhone · iPad · Android · Web · macOS |

---

*PRV Module Architecture Part 4 · Modules 17–21 + Cross-Module Integration Rules · Pasul 9 · Source of Truth*
*Do not modify without approval from Lead Architect.*
*All decisions must align with CLAUDE.md, PRODUCT_VISION.md, ROLE_ARCHITECTURE.md, and all preceding blueprints.*
