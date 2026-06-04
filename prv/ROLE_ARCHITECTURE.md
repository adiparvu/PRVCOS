# PRV — Complete Role Architecture
## Enterprise Blueprint · Source of Truth · v1.0

---

## 1. ARCHITECTURE OVERVIEW

PRV operates on a **Role + Permission + Scope** model enforced at every layer.
Every screen, every data point, every action is filtered through this triple gate.
No role ever sees more than their scope allows. No action bypasses audit logging.

**20 Roles across 6 tracks** (updated v1.1 — Phase 0 Validation, Decision C1/Option C):
- Core (4): Group CEO · CEO · Co-CEO · System Administrator
- Attendance (6): Worker · Team Leader · OMS · Operations Manager · Department Head · HR/Payroll
- Projects (5): Project Worker · Project Team Leader · Project OMS · Project Operations Manager · Project Director
- Shop (3): Seller · Store Manager · Shop Director
- Analytics (3): App Support Specialist · Data Analyst · QA Tester
- External (2): Client Portal User · Supplier Portal User (limited-scope, no system role inheritance)

**UI Display Name Mapping (Phase 0 Decision C1 — Option C):**
| UI Display Name (UI_SITEMAP) | System Role | Type |
|-----------------------------|-------------|------|
| Sysadmin | System Administrator | Display alias |
| Platform Admin | System Administrator | Merged — same system role |
| Group CEO | Group CEO | Exact match |
| CEO | CEO | Exact match |
| Co-CEO | Co-CEO | Exact match |
| Regional Manager | Operations Manager | Display alias |
| Store Manager | Store Manager | Exact match |
| Shop Director | Shop Director | Exact match |
| Department Head | Department Head | New role (added C1) |
| HR Manager | HR/Payroll | Display alias |
| Finance Manager | Permission Group | Not a separate system role |
| Project Manager | Project Operations Manager | Display alias |
| Team Lead | Team Leader | Display alias |
| Field Supervisor | OMS | Display alias |
| Worker | Worker | Exact match |
| Cashier | Seller | Display alias (retail context) |
| Procurement Officer | Permission Group | Not a separate system role |
| Fleet Manager | Permission Group | Not a separate system role |
| Client Portal User | Client Portal User | External actor — limited scope |
| Supplier Portal User | Supplier Portal User | External actor — limited scope |

---

## 2. PERMISSION MODEL

```
ACTION = Role + Permission + Scope
```

Every permission check resolves three questions simultaneously:
1. **Who** — which role is requesting?
2. **What** — which permission is required?
3. **Where** — which scope applies?

Permission types: `none` · `read` · `write` · `manage` · `admin` · `full`

---

## 3. SCOPE SYSTEM

Scope is defined as a **9-level numeric hierarchy** (canonical, code-level identifiers) with human-readable aliases.

| Level | Code Constant | Display Name | Definition |
|-------|--------------|--------------|-----------|
| 1 | `SCOPE_RECORD` | Personal | Own data only — own shifts, tasks, records |
| 2 | `SCOPE_TEAM` | Team | Own team's data |
| 3 | `SCOPE_DEPARTMENT` | Department | All teams/records in assigned department |
| 4 | `SCOPE_STORE` | Assigned Stores | Only stores the user manages |
| 5 | `SCOPE_REGION` | Regional | All stores/teams in assigned region |
| 6 | `SCOPE_COMPANY` | Company | All data within one company entity |
| 7 | `SCOPE_GROUP` | Group | All companies in PRV Group (Group CEO) |
| 8 | `SCOPE_PLATFORM` | Platform | Platform-wide (System Administrator) |
| 9 | `SCOPE_GLOBAL` | Global | All data across all groups and companies |

> **Note:** "Multiple Teams" and "Assigned Projects" are not scope levels — they are scope **targets** (specific entity IDs within a scope level). A user at SCOPE_TEAM may be assigned to multiple teams; scope level stays 2.

---

## 4. SECURITY LEVELS

| Level | Name | Requirements | Audit |
|---|---|---|---|
| L1 | Public | None | None |
| L2 | Standard | Biometric or password | Actions logged |
| L3 | Elevated | Biometric + PIN for sensitive ops | All writes logged |
| L4 | Executive | Face ID + 2FA + session timeout | Every read + write |
| L5 | System | Hardware key + Face ID + isolated session | Full forensic trail |

---

## 5. PERMISSION INHERITANCE TREE

```
Group CEO
└── inherits: all CEO permissions (across all companies in group)

CEO
└── inherits: all executive permissions + Co-CEO

Co-CEO
└── inherits: Operations Manager + Project Director + Shop Director + HR/Payroll

Operations Manager
└── inherits: OMS/Area Supervisor

    OMS / Area Supervisor
    └── inherits: Team Leader

        Team Leader
        └── inherits: Worker

            Worker (base — Attendance track)

Project Director
└── inherits: Project Operations Manager

    Project Operations Manager
    └── inherits: Project OMS

        Project OMS
        └── inherits: Project Team Leader

            Project Team Leader
            └── inherits: Project Worker

                Project Worker (base — Projects track)

Shop Director
└── inherits: Store Manager

    Store Manager
    └── inherits: Seller

        Seller (base — Shop track)

Department Head — inherits: Team Leader (manages a department, not a full Operations Manager)
HR / Payroll — horizontal role, does not inherit Attendance track
System Administrator — isolated track, no business inheritance
App Support Specialist — read-only horizontal access
Data Analyst — analytics-only track
QA Tester — sandbox-only track
```

---

## 6. ROLE CATALOG

---

### ROLE: CEO

**1. Purpose**
Full executive visibility and control over all companies in the PRV Group.
The CEO's interface is the 60-second command center — everything critical visible without drilling.

**2. Responsibilities**
- Strategic oversight of all business units
- Final approval authority for high-value decisions
- Cross-company performance monitoring
- AI-assisted decision making
- Board-level reporting

**3. Navbar Structure**
```
⌂ Command  |  ◎ Companies  |  ✦ Intelligence  |  ⟁ Finance  |  ⊞ Operations
```
Floating glass tab bar · badge counts on all tabs · search always accessible via floating bar

**4. Dashboard Structure**
```
[ Dynamic Island — Live Revenue Ticker + Critical Alert Count ]
[ Floating Search Bar ]
─────────────────────────────
Section 1: Executive Pulse (KPI strip — 6 cards)
Section 2: AI Recommendations (glass card, expandable)
Section 3: Company Performance (horizontal scroll — one card per company)
Section 4: Active Incidents / Alerts (priority sorted)
Section 5: Workforce Status (live headcount, active shifts)
Section 6: Project Portfolio Health (RAG indicators)
Section 7: Finance Snapshot (Revenue · Profit · Cash Flow)
Section 8: Recent Audit Events (last 5 critical actions)
[ Floating Tab Bar ]
```

**5. KPI Widgets**
- Total Revenue Today (₺ formatted, vs target %)
- Total Profit MTD (₺, trend arrow)
- Active Projects (count, RAG health)
- Active Workforce (live headcount / total)
- Critical Alerts (count, red badge)
- AI Insights Available (count, expandable)

**6. Notifications**
- CRITICAL: Revenue drop >10% vs same period → immediate push
- CRITICAL: Security incident in any company → immediate push
- HIGH: Project milestone missed → push + inbox
- HIGH: Budget overrun detected → push + inbox
- MEDIUM: Weekly performance summary → inbox
- LOW: AI recommendation ready → inbox badge

**7. Dynamic Island Behavior**
- **Compact**: Live revenue ticker (₺ updating) + alert count badge
- **Expanded**: Revenue today · Profit MTD · Active Alerts · AI Insight count
- **Tap**: Opens Executive Command dashboard
- **Long press**: Quick Actions panel

**8. Live Activities**
- Lock screen: Revenue Live (₺ current · target · % complete)
- Secondary line: Active Projects count · Workforce online
- Alert indicator: Red dot if critical alerts present
- Updates every 60 seconds

**9. Quick Actions**
1. View All Companies
2. Open AI Recommendations
3. Approve Pending Requests
4. View Critical Alerts
5. Generate Executive Report
6. Contact Co-CEO

**10. Inbox Content**
- Escalations from all companies
- Approval requests above threshold
- AI-generated insights and anomaly reports
- Board reports
- Security alerts
- Contract signature requests
- Financial summaries

**11. Search Permissions**
- Search everything: companies, employees, projects, stores, products, documents, finance records, audit logs
- Scope: Global

**12. Module Access**
| Module | Access |
|---|---|
| Command Dashboard | Full |
| Companies | Full |
| Attendance | Full (read + approve) |
| Projects | Full |
| Shop | Full |
| Finance | Full |
| Analytics | Full |
| AI Platform | Full |
| Documents | Full |
| HR / People | Full |
| Procurement | Full |
| Suppliers | Full |
| Fleet | Full |
| Tools | Full |
| Knowledge Base | Full |
| Learning Center | Full |
| CRM | Full |
| Notifications | Full |
| Audit Logs | Full |
| System Settings | Read |

**13. Approval Rights**
- All financial transactions above any threshold
- Hiring decisions (all levels)
- Contract signatures (company-level)
- Budget approvals (all companies)
- Role assignments (all except System Admin)
- Project kick-off and closure
- Disciplinary actions (final escalation)

**14. Scope Restrictions**
- Scope: Global
- No restrictions across companies
- Cannot modify System Administrator accounts

**15. Escalation Rules**
- CEO is the final escalation point for all business decisions
- Security incidents escalate in parallel to System Administrator
- Financial fraud escalates to CEO + external audit trigger

**16. Analytics Access**
- All dashboards across all companies
- Executive Intelligence suite
- Predictive revenue models
- Workforce efficiency analytics
- Custom report builder (full)
- Export: PDF · Excel · API

**17. Document Access**
- View/Create/Sign/Archive: all document types
- Contracts · Invoices · Reports · HR records · Legal · Compliance
- Scope: Global

**18. AI Access Level**
- Full AI Platform access
- Executive AI Assistant (conversational)
- Predictive analytics and forecasting
- Anomaly detection alerts
- AI-generated reports
- AI recommendations feed

**19. Security Level**
- L4 — Executive
- Face ID required for login
- 2FA required for approvals above ₺10,000
- Session timeout: 30 minutes inactive
- Every action audited in real-time

**20. Inherited Permissions**
- Inherits all Co-CEO permissions
- Inherits all domain-head permissions (Operations Manager, Project Director, Shop Director, HR/Payroll)
- Plus: cross-company visibility and global approval authority

---

### ROLE: Co-CEO

**1. Purpose**
Executive co-leadership with CEO-level access within delegated domains.
Shares operational authority; defers to CEO on highest-tier strategic decisions.

**2. Responsibilities**
- Day-to-day operational oversight
- Company performance management
- Executive decision-making within delegated scope
- Cross-functional coordination
- Represents CEO when unavailable

**3. Navbar Structure**
```
⌂ Command  |  ◎ Companies  |  ✦ Intelligence  |  ⟁ Finance  |  ⊞ Operations
```
Same as CEO; scope filter applied at data layer.

**4. Dashboard Structure**
```
[ Dynamic Island — Revenue + Alert count ]
[ Floating Search Bar ]
─────────────────────────────
Section 1: Executive Pulse (KPI strip)
Section 2: AI Recommendations
Section 3: Company Performance
Section 4: Pending Approvals (own queue)
Section 5: Workforce Status
Section 6: Project Portfolio
Section 7: Finance Snapshot
Section 8: Escalations from domain heads
[ Floating Tab Bar ]
```

**5. KPI Widgets**
- Total Revenue Today
- Active Projects
- Pending Approvals (own queue count)
- Workforce Online
- Alerts Count
- Budget Utilization %

**6. Notifications**
- CRITICAL: Same as CEO minus global security incidents
- HIGH: Escalations from domain heads
- MEDIUM: Performance summaries
- LOW: AI recommendations

**7. Dynamic Island Behavior**
- **Compact**: Revenue ticker + pending approvals count
- **Expanded**: Revenue · Projects · Approvals · Alerts
- **Tap**: Command dashboard

**8. Live Activities**
- Revenue live · Pending approvals count · Active projects

**9. Quick Actions**
1. View Pending Approvals
2. Open AI Insights
3. Company Performance Overview
4. Contact CEO
5. Generate Report
6. View Escalations

**10. Inbox Content**
- Escalations from all domain managers
- Approval requests within threshold
- AI insights
- Performance summaries
- HR escalations

**11. Search Permissions**
- Same as CEO; Scope: Global (with company boundary enforcement)

**12. Module Access**
| Module | Access |
|---|---|
| Command Dashboard | Full |
| Companies | Admin |
| Attendance | Admin |
| Projects | Admin |
| Shop | Admin |
| Finance | Admin (read full, approve up to threshold) |
| Analytics | Full |
| AI Platform | Full |
| Documents | Admin |
| HR / People | Admin |
| Procurement | Admin |
| Suppliers | Admin |
| Fleet | Admin |
| Tools | Admin |
| Audit Logs | Read |
| System Settings | None |

**13. Approval Rights**
- Financial transactions up to CEO-defined threshold
- Hiring (mid-level and below)
- Project approvals
- Contractor engagements

**14. Scope Restrictions**
- Global scope; respects company boundaries
- Cannot approve own expense claims (conflict of interest)

**15. Escalation Rules**
- Escalates to CEO for: decisions above financial threshold, legal matters, company-level restructuring

**16. Analytics Access**
- All dashboards
- Custom report builder
- Export: full

**17. Document Access**
- View/Create/Sign: all types except board-only documents
- Scope: Global

**18. AI Access Level**
- Full AI Assistant
- Predictive analytics
- Anomaly detection

**19. Security Level**
- L4 — Executive
- Face ID + 2FA for approvals

**20. Inherited Permissions**
- Inherits: Operations Manager · Project Director · Shop Director · HR/Payroll

---

### ROLE: System Administrator

**1. Purpose**
Technical stewardship of the PRV platform. Not a business role — a technical superuser responsible for platform integrity, user management, and system configuration.

**2. Responsibilities**
- User account management (create, suspend, delete)
- Role assignment and permission configuration
- System configuration and feature flags
- Audit log monitoring and forensic access
- Integration management (APIs, webhooks)
- Platform health monitoring
- Security incident response

**3. Navbar Structure**
```
⚙ System  |  👤 Users  |  🔐 Security  |  📋 Audit  |  🔗 Integrations
```
Technical-focused navigation. No business modules visible.

**4. Dashboard Structure**
```
[ Dynamic Island — System Health Indicator ]
[ Floating Search Bar — users / logs ]
─────────────────────────────
Section 1: System Health (uptime, API latency, error rate)
Section 2: Active Users (live session count)
Section 3: Security Events (last 24h)
Section 4: Pending User Actions (approvals, suspensions)
Section 5: Audit Log Stream (live)
Section 6: Integration Status
[ Floating Tab Bar ]
```

**5. KPI Widgets**
- System Uptime %
- Active Sessions (live)
- Security Events (24h)
- Failed Auth Attempts (24h)
- API Error Rate %
- Pending User Requests

**6. Notifications**
- CRITICAL: Security breach detected → immediate push + SMS
- CRITICAL: System downtime → immediate push
- HIGH: Failed auth spike → push
- HIGH: Unusual data export volume → push
- MEDIUM: New user requests → inbox
- LOW: Scheduled maintenance reminders

**7. Dynamic Island Behavior**
- **Compact**: System health indicator (green/amber/red dot) + active sessions
- **Expanded**: Uptime % · Error rate · Security events · Active sessions
- **Tap**: System dashboard

**8. Live Activities**
- System status (Operational / Degraded / Incident)
- Active sessions count
- Security event counter

**9. Quick Actions**
1. Suspend User Account
2. Force Logout All Sessions
3. View Live Audit Log
4. Create New User
5. Reset 2FA for User
6. Trigger System Health Check

**10. Inbox Content**
- Security alerts
- User creation requests
- Role change requests
- Integration failure reports
- Scheduled maintenance notifications

**11. Search Permissions**
- Search: users, roles, audit logs, sessions, system events
- Cannot search business data (finance, projects, shop)

**12. Module Access**
| Module | Access |
|---|---|
| System Settings | Full |
| User Management | Full |
| Role Management | Full |
| Audit Logs | Full |
| Security Center | Full |
| Integrations | Full |
| Command Dashboard | None |
| Finance | None |
| Projects | None |
| Shop | None |
| HR / People | Read (for user management only) |
| Analytics | None |
| AI Platform | None |
| Documents | None |

**13. Approval Rights**
- User account creation/suspension
- Role assignments (all except CEO/Co-CEO — requires CEO approval)
- Integration enablement

**14. Scope Restrictions**
- Global technical scope
- Cannot access business data (financial records, project content, HR records)
- Isolated from operational modules

**15. Escalation Rules**
- Security incidents → CEO + Co-CEO (parallel notification)
- Data breach → CEO + legal notification protocol

**16. Analytics Access**
- System analytics only (uptime, performance, usage)
- No business analytics

**17. Document Access**
- System configuration documents only
- No business documents

**18. AI Access Level**
- None (no AI business features)
- System-level anomaly detection tools only

**19. Security Level**
- L5 — System
- Hardware security key + Face ID required
- Every action produces forensic audit entry
- Session recorded

**20. Inherited Permissions**
- Inherits nothing from business roles
- Isolated permission track

---

### ROLE: Worker

**1. Purpose**
Base-level attendance and task execution. Individual contributor who clocks in/out, executes assigned tasks, and tracks personal performance.

**2. Responsibilities**
- Clock in / clock out
- Execute assigned tasks
- Report issues and incidents
- Track own attendance
- Complete assigned training

**3. Navbar Structure**
```
⌂ Today  |  ✓ Tasks  |  📅 Schedule  |  📬 Inbox  |  👤 Me
```

**4. Dashboard Structure**
```
[ Dynamic Island — Active Shift Timer ]
[ Floating Search Bar ]
─────────────────────────────
Section 1: Shift Status (clocked in/out, elapsed time)
Section 2: Today's Tasks (priority sorted)
Section 3: Team Today (who's in, who's out)
Section 4: Announcements
Section 5: My Stats (week view)
[ Floating Tab Bar ]
```

**5. KPI Widgets**
- Shift Duration Today (HH:MM active)
- Tasks Completed Today (X/Y)
- Attendance Streak (days)
- Weekly Hours Total

**6. Notifications**
- HIGH: Shift starting in 30 minutes
- HIGH: New task assigned
- MEDIUM: Schedule change
- MEDIUM: Team announcement
- LOW: Training reminder

**7. Dynamic Island Behavior**
- **Compact**: Active shift timer (HH:MM:SS) or "Not clocked in"
- **Expanded**: Shift time · Current task · Break status
- **Tap**: Clock in/out confirmation
- **Long press**: Quick Actions

**8. Live Activities**
- Shift timer (live HH:MM:SS)
- Current task name
- Break countdown if on break
- Next shift reminder (if not clocked in)

**9. Quick Actions**
1. Clock In
2. Clock Out
3. Start Break
4. End Break
5. Mark Task Complete
6. Report Issue

**10. Inbox Content**
- Task assignments
- Schedule notifications
- Team announcements
- Training assignments
- Payslip available notifications

**11. Search Permissions**
- Own tasks, own schedule, own attendance records, team directory (names only)

**12. Module Access**
| Module | Access |
|---|---|
| Attendance (own) | Full |
| Tasks (assigned) | Read + Update |
| Schedule (own) | Read |
| Team Directory | Read (names, contacts) |
| Inbox | Full |
| Knowledge Base | Read |
| Learning Center | Read (assigned) |
| Finance | None |
| Projects | None (unless assigned) |
| Analytics | None |
| HR Records | Own only (read) |

**13. Approval Rights**
- None

**14. Scope Restrictions**
- Personal scope only
- Cannot view other workers' detailed records

**15. Escalation Rules**
- Issues escalate to Team Leader automatically
- Emergency incidents escalate directly to OMS

**16. Analytics Access**
- Personal stats only (own attendance, task completion rate)

**17. Document Access**
- Own payslips, own contracts, assigned training materials

**18. AI Access Level**
- Basic: AI shift suggestions ("You have a gap on Thursday")
- Personal schedule assistant

**19. Security Level**
- L2 — Standard
- Biometric or PIN login

**20. Inherited Permissions**
- Base role — inherits nothing

---

### ROLE: Team Leader

**1. Purpose**
First-line management of a team. Coordinates task assignment, monitors team attendance, handles minor approvals, and escalates to OMS.

**2. Responsibilities**
- Monitor team clock-ins and attendance
- Assign and prioritize team tasks
- Approve minor leave requests
- Report team performance to OMS
- Handle first-level issue resolution

**3. Navbar Structure**
```
⌂ Command  |  👥 Team  |  ✓ Tasks  |  📅 Schedule  |  📬 Inbox
```

**4. Dashboard Structure**
```
[ Dynamic Island — Team Status (X/Y clocked in) ]
[ Floating Search Bar ]
─────────────────────────────
Section 1: Team Attendance Live (who's in, late, absent)
Section 2: Task Board (team view)
Section 3: Pending Approvals
Section 4: Team Performance (week)
Section 5: My Own Shift Status
Section 6: Announcements
[ Floating Tab Bar ]
```

**5. KPI Widgets**
- Team Attendance Rate (X/Y present)
- Tasks Completed Today (team total)
- Pending Approvals (count)
- Team Hours This Week

**6. Notifications**
- CRITICAL: Team member absent without notice
- HIGH: Task overdue
- HIGH: Pending leave approval
- MEDIUM: Performance anomaly
- LOW: Weekly report ready

**7. Dynamic Island Behavior**
- **Compact**: Team presence (e.g. "7/10 in") + approval badge
- **Expanded**: Present · Absent · Late · Pending approvals
- **Tap**: Team dashboard

**8. Live Activities**
- Team status: X present / Y total
- Pending approvals count
- Current task completion rate

**9. Quick Actions**
1. Mark Attendance (for team)
2. Assign Task
3. Approve Leave Request
4. View Team Schedule
5. Report to OMS
6. Send Team Announcement

**10. Inbox Content**
- Leave requests from team members
- Task completion reports
- Attendance alerts (late/absent)
- OMS announcements
- Escalations from workers

**11. Search Permissions**
- Own team members, team tasks, team schedule, team attendance records

**12. Module Access**
| Module | Access |
|---|---|
| Attendance (own team) | Full |
| Tasks (team) | Full |
| Schedule (team) | Read + Manage |
| Leave Requests (team) | Read + Approve |
| Team Directory | Read (full team) |
| Inbox | Full |
| Knowledge Base | Read |
| Learning Center | Read |
| Finance | None |
| Analytics | Team performance only |
| HR Records | Team members (limited) |

**13. Approval Rights**
- Leave requests (up to 2 days) for own team
- Overtime up to defined threshold
- Task deadline adjustments

**14. Scope Restrictions**
- Team scope only
- Cannot access other teams' data

**15. Escalation Rules**
- Absence without notice → OMS (immediate)
- Repeated performance issues → OMS
- Disciplinary matters → OMS + HR

**16. Analytics Access**
- Team attendance dashboard
- Team task completion report
- Personal performance view

**17. Document Access**
- Team schedules, team task sheets
- Own documents
- Cannot access individual HR records

**18. AI Access Level**
- AI scheduling suggestions for team
- Task prioritization assistant

**19. Security Level**
- L2 — Standard

**20. Inherited Permissions**
- Inherits all Worker permissions

---

### ROLE: OMS / Area Supervisor

**1. Purpose**
Operational oversight across multiple teams within an area. Bridges Team Leaders and Operations Manager. Owns area-level performance and resource allocation.

**2. Responsibilities**
- Supervise multiple Team Leaders
- Monitor area attendance and task completion
- Approve mid-level requests
- Allocate resources across teams
- Report area performance to Operations Manager

**3. Navbar Structure**
```
⌂ Command  |  👥 Area  |  ⊞ Operations  |  📊 Reports  |  📬 Inbox
```

**4. Dashboard Structure**
```
[ Dynamic Island — Area Status + Critical Alerts ]
[ Floating Search Bar ]
─────────────────────────────
Section 1: Area Attendance Overview (all teams)
Section 2: Critical Alerts
Section 3: Pending Approvals Queue
Section 4: Team Performance Comparison
Section 5: Resource Allocation
Section 6: Escalations from Team Leaders
[ Floating Tab Bar ]
```

**5. KPI Widgets**
- Area Attendance Rate (aggregate)
- Active Teams Count
- Pending Approvals
- Area Task Completion Rate %
- Overtime Hours This Week
- Incidents Reported

**6. Notifications**
- CRITICAL: Multiple absences in same area
- HIGH: Team Leader escalation
- HIGH: Approval requests
- MEDIUM: Performance anomalies
- LOW: Daily area summary

**7. Dynamic Island Behavior**
- **Compact**: Area status (X/Y teams at capacity) + alert count
- **Expanded**: Teams active · Attendance rate · Pending approvals · Alerts

**8. Live Activities**
- Area attendance % live
- Pending approvals count
- Active incidents

**9. Quick Actions**
1. View All Teams Status
2. Approve/Reject Queue
3. Reallocate Worker
4. Escalate to Operations Manager
5. Generate Area Report
6. Send Area Announcement

**10. Inbox Content**
- Escalations from Team Leaders
- Approval queues
- Performance alerts
- Operations Manager directives
- HR notifications for area

**11. Search Permissions**
- All workers and Team Leaders in assigned area
- Area tasks, schedules, attendance

**12. Module Access**
| Module | Access |
|---|---|
| Attendance (area) | Full |
| Tasks (area) | Full |
| Schedule (area) | Admin |
| Leave Requests (area) | Read + Approve |
| Team Directory (area) | Read |
| Analytics (area) | Read |
| HR Records (area) | Limited read |
| Finance | None |
| Projects | None |

**13. Approval Rights**
- Leave requests up to 5 days (area)
- Overtime approval (area)
- Resource reallocation within area
- Minor disciplinary actions

**14. Scope Restrictions**
- Multiple Teams scope (assigned area only)
- Cannot access other areas

**15. Escalation Rules**
- Attendance crisis → Operations Manager (immediate)
- Disciplinary escalation → HR + Operations Manager
- Safety incidents → Operations Manager + CEO alert

**16. Analytics Access**
- Area performance dashboard
- Team comparison report
- Attendance trends

**17. Document Access**
- Area operational documents
- Team schedules
- Incident reports

**18. AI Access Level**
- AI attendance forecasting
- Resource optimization suggestions

**19. Security Level**
- L3 — Elevated

**20. Inherited Permissions**
- Inherits all Team Leader + Worker permissions

---

### ROLE: Operations Manager

**1. Purpose**
Regional operational leadership. Owns performance across multiple areas, manages budget allocation, drives operational efficiency, and reports to Co-CEO.

**2. Responsibilities**
- Multi-area operational oversight
- Budget management
- Strategic resource allocation
- Operational policy enforcement
- Performance reporting to Co-CEO

**3. Navbar Structure**
```
⌂ Command  |  ⊞ Operations  |  👥 People  |  ⟁ Finance  |  📊 Intelligence
```

**4. Dashboard Structure**
```
[ Dynamic Island — Regional KPIs + Alerts ]
[ Floating Search Bar ]
─────────────────────────────
Section 1: Regional Performance (all areas)
Section 2: Budget Utilization
Section 3: Workforce Overview
Section 4: Critical Incidents
Section 5: Pending High-Level Approvals
Section 6: AI Recommendations
Section 7: Escalations from OMS
[ Floating Tab Bar ]
```

**5. KPI Widgets**
- Regional Attendance Rate
- Total Workforce Active (region)
- Budget Utilized %
- Incidents This Week
- Pending Approvals
- Area Performance Variance

**6. Notifications**
- CRITICAL: Attendance crisis in any area
- CRITICAL: Budget overrun
- HIGH: OMS escalation
- HIGH: Safety incident
- MEDIUM: Weekly summary
- LOW: AI recommendations

**7. Dynamic Island Behavior**
- **Compact**: Regional health indicator + critical count
- **Expanded**: Areas status · Budget · Attendance · Escalations

**8. Live Activities**
- Regional attendance live
- Budget utilization %
- Active incidents count

**9. Quick Actions**
1. View All Areas
2. Approve Escalated Requests
3. Reallocate Budget
4. Generate Regional Report
5. Escalate to Co-CEO
6. Deploy Resource

**10. Inbox Content**
- OMS escalations
- Budget alerts
- HR notifications
- Co-CEO directives
- Compliance reports

**11. Search Permissions**
- All workers, Team Leaders, OMS in region
- Regional schedules, tasks, budgets

**12. Module Access**
| Module | Access |
|---|---|
| Attendance (regional) | Full |
| Tasks (regional) | Full |
| Schedule (regional) | Admin |
| Finance (regional budget) | Read + Approve |
| HR (regional) | Read + Recommend |
| Analytics (regional) | Full |
| AI Platform | Read |
| Projects | None |
| Shop | None |

**13. Approval Rights**
- Leave requests (all types, regional)
- Overtime (regional)
- Budget reallocations (within ceiling)
- Disciplinary actions (formal)

**14. Scope Restrictions**
- Regional scope
- Cannot approve above budget ceiling without Co-CEO

**15. Escalation Rules**
- Crisis → Co-CEO (immediate)
- Budget ceiling breach → Co-CEO + Finance
- Safety crisis → CEO + emergency protocol

**16. Analytics Access**
- Regional performance suite
- Workforce efficiency dashboard
- Custom regional reports

**17. Document Access**
- Regional operational documents
- HR recommendations (not full records)
- Budget reports

**18. AI Access Level**
- AI forecasting (workforce demand)
- Budget optimization assistant
- Anomaly alerts

**19. Security Level**
- L3 — Elevated

**20. Inherited Permissions**
- Inherits all OMS + Team Leader + Worker permissions

---

### ROLE: HR / Payroll

**1. Purpose**
Horizontal role managing all human resources and payroll functions. Not in the attendance management hierarchy — operates across all tracks with HR-specific access.

**2. Responsibilities**
- Employee records management
- Payroll processing
- Contract management
- Leave and absence management
- Onboarding and offboarding
- Compliance monitoring

**3. Navbar Structure**
```
⌂ Command  |  👥 People  |  💰 Payroll  |  📄 Documents  |  📬 Inbox
```

**4. Dashboard Structure**
```
[ Dynamic Island — Payroll Status / Next Run ]
[ Floating Search Bar ]
─────────────────────────────
Section 1: Payroll Status (next run date, status)
Section 2: Attendance Exceptions (pending review)
Section 3: Leave Queue
Section 4: Onboarding Pipeline
Section 5: Contract Expirations (30-day alert)
Section 6: Compliance Flags
[ Floating Tab Bar ]
```

**5. KPI Widgets**
- Next Payroll Run (date + days remaining)
- Attendance Exceptions Pending
- Leave Requests Pending
- Contract Expirations (30 days)
- New Hires This Month
- Compliance Items Pending

**6. Notifications**
- CRITICAL: Payroll run failure
- HIGH: Attendance exception requires review
- HIGH: Contract expiring in 7 days
- MEDIUM: Leave request pending
- MEDIUM: Onboarding incomplete
- LOW: Payroll cycle reminder

**7. Dynamic Island Behavior**
- **Compact**: Payroll countdown + exception count
- **Expanded**: Next payroll · Exceptions · Leave queue · Contract alerts

**8. Live Activities**
- Payroll run status (when active)
- Exceptions pending count

**9. Quick Actions**
1. Process Payroll
2. Approve Leave Request
3. Create Employee Record
4. Review Attendance Exception
5. Generate Payslip
6. Flag Compliance Issue

**10. Inbox Content**
- Leave requests (all staff)
- Attendance exceptions
- Onboarding tasks
- Contract renewal alerts
- Compliance notifications

**11. Search Permissions**
- All employees across assigned company
- Attendance records, contracts, payroll data

**12. Module Access**
| Module | Access |
|---|---|
| HR / People | Full |
| Payroll | Full |
| Attendance (read, all) | Full read |
| Contracts | Full |
| Documents (HR) | Full |
| Leave Management | Full |
| Onboarding | Full |
| Finance (payroll only) | Write (payroll) |
| Analytics (HR) | Full |
| Projects | None |
| Shop | None |

**13. Approval Rights**
- Leave requests (all types, all staff)
- Contract extensions
- Payroll approval (before processing)

**14. Scope Restrictions**
- Company scope (assigned company)
- Cannot access business financials beyond payroll

**15. Escalation Rules**
- Payroll discrepancy → Finance + Operations Manager
- Disciplinary → Operations Manager + Co-CEO
- Legal compliance issue → CEO + legal

**16. Analytics Access**
- HR analytics suite
- Payroll reports
- Attendance analytics
- Headcount trends

**17. Document Access**
- All HR documents
- Contracts, payslips, onboarding docs
- Performance reviews (read)

**18. AI Access Level**
- AI contract expiration forecasting
- Payroll anomaly detection
- Attendance pattern analysis

**19. Security Level**
- L3 — Elevated (payroll data is sensitive)

**20. Inherited Permissions**
- Horizontal role — no attendance hierarchy inheritance
- HR-specific permissions granted independently

---

### ROLE: Project Worker

**1. Purpose**
Execute tasks within assigned projects. Temporary access automatically granted on project assignment, revoked on removal.

**2. Responsibilities**
- Complete assigned project tasks
- Upload progress photos
- Log daily work progress
- Communicate in project chat
- Report issues or blockers

**3. Navbar Structure**
```
⌂ Today  |  ✓ Tasks  |  📁 Projects  |  💬 Chat  |  👤 Me
```

**4. Dashboard Structure**
```
[ Dynamic Island — Active Task Timer ]
[ Floating Search Bar ]
─────────────────────────────
Section 1: My Tasks (current project)
Section 2: Project Timeline (my milestones)
Section 3: Project Chat (recent)
Section 4: My Photo Uploads
Section 5: Daily Progress Log
[ Floating Tab Bar ]
```

**5. KPI Widgets**
- Tasks Completed This Week
- Photos Uploaded
- Project Progress % (own tasks)
- Hours Logged Today

**6. Notifications**
- HIGH: New task assigned
- HIGH: Task deadline approaching
- MEDIUM: Project update from Team Leader
- MEDIUM: Chat mention
- LOW: Milestone reached

**7. Dynamic Island Behavior**
- **Compact**: Active task name (truncated) + task timer
- **Expanded**: Task · Deadline · Project name · Progress %
- **Tap**: Active task detail

**8. Live Activities**
- Task timer (live)
- Project name
- Task deadline countdown

**9. Quick Actions**
1. Log Progress
2. Upload Photo
3. Mark Task Complete
4. Report Blocker
5. Open Project Chat
6. Request Extension

**10. Inbox Content**
- Task assignments
- Project updates
- Team Leader messages
- Project announcements

**11. Search Permissions**
- Assigned projects only
- Own tasks, project documents, project chat history

**12. Module Access**
| Module | Access |
|---|---|
| Assigned Projects | Read + Update |
| Project Tasks (own) | Full |
| Project Documents | Read |
| Project Photos | Read + Upload |
| Project Chat | Full (project scope) |
| Progress Tracking | Write |
| Attendance (own) | Full |
| Finance | None |
| HR | None |
| Analytics | None |

**13. Approval Rights**
- None

**14. Scope Restrictions**
- Assigned Projects only (auto-granted/revoked)
- Cannot view other projects

**15. Escalation Rules**
- Blockers → Project Team Leader (immediate)
- Safety issues → Project OMS

**16. Analytics Access**
- Own task completion rate
- Own hours logged

**17. Document Access**
- Project documents (read)
- Own task sheets

**18. AI Access Level**
- Task scheduling assistant (basic)

**19. Security Level**
- L2 — Standard

**20. Inherited Permissions**
- Base role — inherits nothing by default
- Temporary project permissions layered on top

---

### ROLE: Project Team Leader

**1. Purpose**
Leads a team within one or more projects. Manages task assignment, monitors team progress, and reports to Project OMS.

**2. Responsibilities**
- Task assignment and prioritization
- Team progress monitoring
- Photo review and approval
- First-level issue resolution
- Daily progress reporting

**3. Navbar Structure**
```
⌂ Command  |  👥 Team  |  📁 Projects  |  💬 Chat  |  📬 Inbox
```

**4. Dashboard Structure**
```
[ Dynamic Island — Team Task Progress ]
[ Floating Search Bar ]
─────────────────────────────
Section 1: Team Task Board (kanban view)
Section 2: Team Attendance on Site
Section 3: Pending Photo Reviews
Section 4: Project Timeline (team milestones)
Section 5: Pending Approvals
[ Floating Tab Bar ]
```

**5. KPI Widgets**
- Team Tasks Completed Today
- Team Members On-Site
- Photos Pending Review
- Milestones On Track %

**6. Notifications**
- HIGH: Task overdue (team)
- HIGH: Worker blocked
- HIGH: Photo review required
- MEDIUM: Milestone approaching
- LOW: Daily team summary

**7. Dynamic Island Behavior**
- **Compact**: Team progress X/Y tasks + member count
- **Expanded**: Tasks · Members on-site · Pending reviews · Milestone

**8. Live Activities**
- Team task completion progress bar
- Members on-site count

**9. Quick Actions**
1. Assign Task
2. Review Photos
3. Mark Milestone
4. Report to OMS
5. Send Team Update
6. View Timeline

**10. Inbox Content**
- Worker blockers
- Task completion notifications
- OMS directives
- Project updates

**11. Search Permissions**
- Team members within assigned projects
- Team tasks, team photos, project documents

**12. Module Access**
| Module | Access |
|---|---|
| Assigned Projects | Full (team scope) |
| Project Tasks (team) | Full |
| Project Documents | Read + Upload |
| Project Photos | Full |
| Project Chat | Full |
| Progress Tracking | Full (team) |
| Approvals (team) | Approve |
| Finance | None |

**13. Approval Rights**
- Photo submissions (team)
- Task completion sign-offs
- Minor deadline adjustments

**14. Scope Restrictions**
- Assigned projects + own team only

**15. Escalation Rules**
- Major blockers → Project OMS
- Safety → Project OMS (immediate)

**16. Analytics Access**
- Team progress reports
- Team attendance on-site

**17. Document Access**
- Project documents (read + upload)
- Team task sheets

**18. AI Access Level**
- AI task scheduling for team
- Blocker pattern detection

**19. Security Level**
- L2 — Standard

**20. Inherited Permissions**
- Inherits all Project Worker permissions

---

### ROLE: Project OMS

**1. Purpose**
Multi-team oversight within a project or across multiple projects in an area. Manages resources, resolves cross-team conflicts, reports to Project Operations Manager.

**2. Responsibilities**
- Multi-team coordination
- Resource reallocation across teams
- Risk identification and flagging
- Client update preparation
- Site-level decision making

**3. Navbar Structure**
```
⌂ Command  |  📁 Projects  |  👥 Teams  |  📊 Reports  |  📬 Inbox
```

**4. Dashboard Structure**
```
[ Dynamic Island — Multi-project Health ]
[ Floating Search Bar ]
─────────────────────────────
Section 1: Active Projects Status (RAG)
Section 2: Resource Allocation Map
Section 3: Risk Flags
Section 4: Team Leader Escalations
Section 5: Timeline Variance
[ Floating Tab Bar ]
```

**5. KPI Widgets**
- Projects On Track (count)
- Projects At Risk (count)
- Resources Deployed / Total
- Milestones This Week
- Open Risk Flags
- Pending Approvals

**6. Notifications**
- CRITICAL: Project at risk (timeline or budget)
- HIGH: Team Leader escalation
- HIGH: Resource conflict
- MEDIUM: Daily progress summary
- LOW: Upcoming milestone

**7. Dynamic Island Behavior**
- **Compact**: Projects RAG summary (🟢X 🟡Y 🔴Z)
- **Expanded**: Projects status · Resources · Risks · Approvals

**8. Live Activities**
- Project health summary
- Open risks count

**9. Quick Actions**
1. Reallocate Resource
2. Flag Risk
3. Approve Milestone
4. Generate Progress Report
5. Escalate to PM
6. Schedule Site Visit

**10. Inbox Content**
- Team Leader escalations
- Resource conflict alerts
- Project Operations Manager directives
- Risk notifications

**11. Search Permissions**
- All teams and workers across assigned projects
- Project documents, photos, timelines

**12. Module Access**
| Module | Access |
|---|---|
| Assigned Projects (multi) | Full |
| All Project Teams | Full |
| Project Documents | Full |
| Project Photos | Full |
| Budget (project level) | Read |
| Risk Management | Full |
| Analytics (project) | Full |
| HR | None |

**13. Approval Rights**
- Milestone approvals
- Resource reallocation
- Risk escalations

**14. Scope Restrictions**
- Assigned projects (multi) scope

**15. Escalation Rules**
- Budget breach → Project Operations Manager
- Major risk → Project Operations Manager + CEO alert

**16. Analytics Access**
- Multi-project dashboard
- Resource utilization
- Timeline variance reports

**17. Document Access**
- All project documents
- Risk registers
- Progress reports

**18. AI Access Level**
- AI risk prediction
- Resource optimization suggestions

**19. Security Level**
- L3 — Elevated

**20. Inherited Permissions**
- Inherits all Project Team Leader + Project Worker permissions

---

### ROLE: Project Operations Manager

**1. Purpose**
Portfolio-level project management. Owns budget, client relationships, delivery timelines, and strategic decisions across all assigned projects.

**2. Responsibilities**
- Portfolio oversight
- Client communication
- Budget management
- Milestone approvals
- Strategic project decisions

**3. Navbar Structure**
```
⌂ Command  |  📁 Portfolio  |  👥 People  |  ⟁ Finance  |  📊 Intelligence
```

**4. Dashboard Structure**
```
[ Dynamic Island — Portfolio Health + Budget ]
[ Floating Search Bar ]
─────────────────────────────
Section 1: Portfolio Overview (all projects RAG)
Section 2: Budget Status (all projects)
Section 3: Client Actions Required
Section 4: Milestone Calendar (next 30 days)
Section 5: AI Project Insights
Section 6: OMS Escalations
[ Floating Tab Bar ]
```

**5. KPI Widgets**
- Projects Delivered On Time %
- Total Portfolio Budget Utilized %
- Open Client Actions
- Milestones Due This Week
- Risk Items Open
- Projects Behind Schedule

**6. Notifications**
- CRITICAL: Budget overrun
- CRITICAL: Project delivery failure risk
- HIGH: Client action required
- HIGH: OMS escalation
- MEDIUM: Milestone reached
- LOW: Weekly portfolio summary

**7. Dynamic Island Behavior**
- **Compact**: Portfolio health + budget % bar
- **Expanded**: Projects status · Budget · Client actions · Milestones

**8. Live Activities**
- Portfolio delivery % on track
- Budget utilization live

**9. Quick Actions**
1. Approve Milestone
2. Client Update Send
3. Budget Reallocation
4. Escalate to Director
5. Generate Portfolio Report
6. View Risk Register

**10. Inbox Content**
- OMS escalations
- Client messages
- Budget alerts
- Project Director directives
- Compliance items

**11. Search Permissions**
- All projects, teams, workers, budgets in portfolio
- Client records related to projects

**12. Module Access**
| Module | Access |
|---|---|
| All Assigned Projects | Full |
| Portfolio Dashboard | Full |
| Finance (project budgets) | Full |
| CRM (client projects) | Read + Update |
| Documents | Full |
| Analytics (portfolio) | Full |
| AI Platform | Read |
| HR | Read (project team) |
| Shop | None |

**13. Approval Rights**
- Budget changes (within ceiling)
- Milestone sign-offs
- Contract amendments (project scope)

**14. Scope Restrictions**
- Assigned projects portfolio
- Company scope for budget

**15. Escalation Rules**
- Budget ceiling breach → Project Director
- Client dispute → Project Director + CEO

**16. Analytics Access**
- Portfolio analytics
- Budget reports
- Client satisfaction metrics

**17. Document Access**
- All project documents
- Client contracts (read)
- Budget reports

**18. AI Access Level**
- AI delivery forecasting
- Budget risk alerts
- Client sentiment analysis

**19. Security Level**
- L3 — Elevated

**20. Inherited Permissions**
- Inherits all Project OMS + Project Team Leader + Project Worker

---

### ROLE: Project Director

**1. Purpose**
Strategic leadership of all projects across the company. Represents project delivery at executive level. Partners with Co-CEO on project strategy.

**2. Responsibilities**
- Company-wide project portfolio strategy
- Client relationship ownership (strategic)
- Revenue from projects oversight
- Resource strategy
- Delivery excellence standards

**3. Navbar Structure**
```
⌂ Command  |  📁 Portfolio  |  ⟁ Finance  |  ◎ People  |  ✦ Intelligence
```

**4. Dashboard Structure**
```
[ Dynamic Island — Company Portfolio Health ]
[ Floating Search Bar ]
─────────────────────────────
Section 1: Company Portfolio (all projects)
Section 2: Revenue from Projects
Section 3: Strategic Risks
Section 4: Client Portfolio
Section 5: AI Strategic Insights
Section 6: Escalations from PMs
[ Floating Tab Bar ]
```

**5. KPI Widgets**
- Total Project Revenue (company)
- Portfolio On-Time Delivery %
- Strategic Risks Open
- Client NPS Score
- Projects Won This Quarter
- Backlog Value

**6. Notifications**
- CRITICAL: Major project failure
- CRITICAL: Key client at risk
- HIGH: PM escalation
- HIGH: Revenue target miss forecast
- MEDIUM: Weekly portfolio review

**7. Dynamic Island Behavior**
- **Compact**: Revenue from projects (live) + risk count
- **Expanded**: Revenue · On-time % · Strategic risks · Client alerts

**8. Live Activities**
- Company project revenue live
- Portfolio health indicator

**9. Quick Actions**
1. View Full Portfolio
2. Client Strategy Meeting
3. Approve Major Decision
4. AI Portfolio Analysis
5. Escalate to Co-CEO
6. Generate Board Report

**10. Inbox Content**
- PM escalations
- Client strategic communications
- Co-CEO directives
- Market intelligence

**11. Search Permissions**
- All projects, clients, teams, budgets company-wide

**12. Module Access**
| Module | Access |
|---|---|
| All Projects (company) | Full |
| Finance (project revenue) | Full |
| CRM (all clients) | Full |
| Analytics | Full |
| AI Platform | Full |
| Documents | Full |
| HR (project teams) | Read |
| Shop | None |
| System | None |

**13. Approval Rights**
- New project kick-off
- Project closure
- Strategic contract decisions
- Budget above PM ceiling

**14. Scope Restrictions**
- Company scope (own company in PRV Group)

**15. Escalation Rules**
- Critical project failure → Co-CEO + CEO
- Major client loss risk → Co-CEO

**16. Analytics Access**
- Full portfolio analytics
- Revenue analytics
- Client analytics

**17. Document Access**
- All project documents
- Strategic contracts
- Client agreements

**18. AI Access Level**
- Full AI for portfolio strategy
- Client risk prediction
- Revenue forecasting

**19. Security Level**
- L4 — Executive

**20. Inherited Permissions**
- Inherits all Project Operations Manager + OMS + Team Leader + Worker permissions

---

### ROLE: Seller

**1. Purpose**
Operate point-of-sale, serve customers, process transactions, manage own register and assigned area.

**2. Responsibilities**
- Process sales transactions
- Customer service
- Product lookups
- Handle returns (within limits)
- Daily register open/close

**3. Navbar Structure**
```
⌂ Today  |  🛒 POS  |  📦 Products  |  📬 Inbox  |  👤 Me
```

**4. Dashboard Structure**
```
[ Dynamic Island — Active Transaction / Register Status ]
[ Floating Search Bar ]
─────────────────────────────
Section 1: Register Status (open/closed, float)
Section 2: Today's Sales (own register)
Section 3: Recent Transactions
Section 4: Product Search (quick)
Section 5: Tasks for Today
[ Floating Tab Bar ]
```

**5. KPI Widgets**
- Sales Today (₺, own register)
- Transactions Count
- Average Transaction Value
- Return Count Today

**6. Notifications**
- HIGH: Register discrepancy alert
- HIGH: Low stock on product they're selling
- MEDIUM: New product announcement
- MEDIUM: Shift end reminder
- LOW: Store announcement

**7. Dynamic Island Behavior**
- **Compact**: Active transaction amount or "Register Open"
- **Expanded**: Transaction value · Customer queue · Register float · Daily sales
- **Tap**: POS quick access

**8. Live Activities**
- Active transaction details (amount, items)
- Daily sales target progress bar
- Register status

**9. Quick Actions**
1. Open Register
2. Process Sale
3. Void Transaction
4. Initiate Return
5. Product Lookup
6. Close Register

**10. Inbox Content**
- Manager announcements
- Product updates
- Schedule changes
- Policy updates

**11. Search Permissions**
- Products (own store inventory)
- Customer records (basic lookup for loyalty/orders)

**12. Module Access**
| Module | Access |
|---|---|
| POS | Full (own register) |
| Products | Read |
| Inventory (own store) | Read |
| Customer Lookup | Read (basic) |
| Own Sales Data | Read |
| Returns | Write (within limit) |
| Finance | None |
| Analytics | None |
| HR | None |

**13. Approval Rights**
- Returns up to defined threshold (auto)
- Discounts up to defined % (auto)

**14. Scope Restrictions**
- Own register + assigned store floor

**15. Escalation Rules**
- Return above threshold → Store Manager
- Dispute → Store Manager
- System issue → App Support

**16. Analytics Access**
- Own sales data only

**17. Document Access**
- Product catalogues, own payslip, store policies

**18. AI Access Level**
- AI product recommendation (at POS)
- Basic upsell suggestions

**19. Security Level**
- L2 — Standard

**20. Inherited Permissions**
- Base role — inherits nothing

---

### ROLE: Store Manager

**1. Purpose**
Full ownership of a single store. Manages staff, inventory, performance, and customer experience. Reports to Shop Director.

**2. Responsibilities**
- Store performance ownership
- Staff scheduling and management
- Inventory oversight
- Customer escalations
- Daily store reporting

**3. Navbar Structure**
```
⌂ Command  |  🏪 Store  |  👥 Staff  |  📦 Inventory  |  📊 Reports
```

**4. Dashboard Structure**
```
[ Dynamic Island — Store Revenue vs Target ]
[ Floating Search Bar ]
─────────────────────────────
Section 1: Store KPI Strip
Section 2: Staff Status (who's in, on register)
Section 3: Inventory Alerts (low stock, critical)
Section 4: Today's Transactions Feed
Section 5: Pending Approvals
Section 6: Customer Feedback
[ Floating Tab Bar ]
```

**5. KPI Widgets**
- Store Revenue Today (vs target)
- Transaction Count
- Staff Active (count)
- Low Stock Items Count
- Returns Today
- Customer Rating (live)

**6. Notifications**
- CRITICAL: Register discrepancy
- CRITICAL: Critical stock-out
- HIGH: Staff absent unannounced
- HIGH: Customer complaint escalated
- MEDIUM: Daily target reached / missed
- LOW: Inventory reorder suggestion

**7. Dynamic Island Behavior**
- **Compact**: Revenue ₺ (vs target %) + staff count
- **Expanded**: Revenue · Transactions · Staff · Stock alerts

**8. Live Activities**
- Store revenue live vs target
- Staff online count
- Open issues count

**9. Quick Actions**
1. View All Registers
2. Approve Return
3. Order Stock
4. Schedule Staff
5. Generate Daily Report
6. Contact Shop Director

**10. Inbox Content**
- Seller escalations
- Stock alerts
- Shop Director directives
- Customer feedback
- HR notifications (own staff)

**11. Search Permissions**
- Own store: staff, products, transactions, inventory, customers

**12. Module Access**
| Module | Access |
|---|---|
| POS (all registers, own store) | Full |
| Inventory (own store) | Full |
| Staff (own store) | Full |
| Schedule (own store) | Full |
| Finance (store P&L) | Read |
| Returns | Full |
| Customer Records | Read |
| Analytics (store) | Full |
| Procurement (store) | Write (within budget) |
| HR (own staff) | Limited |

**13. Approval Rights**
- Returns (all amounts)
- Discounts above threshold
- Staff overtime
- Stock orders (within budget)
- Seller schedule changes

**14. Scope Restrictions**
- Assigned store only

**15. Escalation Rules**
- Budget breach → Shop Director
- HR issues (serious) → HR + Shop Director
- System outage → App Support + Shop Director

**16. Analytics Access**
- Full store analytics
- Staff performance
- Inventory turnover
- Customer metrics

**17. Document Access**
- Store operational documents
- Staff records (own store)
- Inventory reports

**18. AI Access Level**
- AI inventory forecasting
- Staff scheduling optimization
- Sales trend predictions

**19. Security Level**
- L3 — Elevated

**20. Inherited Permissions**
- Inherits all Seller permissions

---

### ROLE: Shop Director

**1. Purpose**
Strategic oversight of all stores in the shop network. Owns retail performance, multi-store operations, and commercial strategy.

**2. Responsibilities**
- Multi-store performance ownership
- Commercial strategy
- Procurement and supplier management
- Staff leadership (Store Managers)
- Retail analytics and expansion planning

**3. Navbar Structure**
```
⌂ Command  |  🏪 Stores  |  ⟁ Finance  |  📦 Procurement  |  ✦ Intelligence
```

**4. Dashboard Structure**
```
[ Dynamic Island — Network Revenue Live ]
[ Floating Search Bar ]
─────────────────────────────
Section 1: Network Performance (all stores)
Section 2: Revenue vs Target (all stores)
Section 3: Critical Stock Alerts (network)
Section 4: Top Performing Stores
Section 5: Bottom Performing Stores
Section 6: AI Retail Insights
Section 7: Procurement Queue
[ Floating Tab Bar ]
```

**5. KPI Widgets**
- Network Revenue Today
- Target Achievement % (network)
- Stores At Risk Count
- Stock-Out Count (network)
- Customer Rating (network avg)
- Active Staff (network)

**6. Notifications**
- CRITICAL: Store-wide system failure
- CRITICAL: Network revenue miss forecast
- HIGH: Store Manager escalation
- HIGH: Critical supplier issue
- MEDIUM: Daily network summary
- LOW: AI retail recommendation

**7. Dynamic Island Behavior**
- **Compact**: Network revenue ₺ + store health (🟢X 🔴Y)
- **Expanded**: Revenue · Target % · Store alerts · Stock critical

**8. Live Activities**
- Network revenue live
- Store health status summary
- Active staff count

**9. Quick Actions**
1. View All Stores
2. Network Stock Alert
3. Approve Procurement
4. Generate Network Report
5. Escalate to Co-CEO
6. AI Retail Analysis

**10. Inbox Content**
- Store Manager escalations
- Supplier alerts
- Co-CEO directives
- Customer escalations (network)
- Compliance items

**11. Search Permissions**
- All stores, products, staff, transactions, customers, suppliers

**12. Module Access**
| Module | Access |
|---|---|
| All Stores | Full |
| Inventory (network) | Full |
| Procurement | Full |
| Supplier Management | Full |
| Finance (retail) | Full |
| Analytics | Full |
| AI Platform | Full |
| CRM (retail clients) | Read |
| HR (retail staff) | Read + Recommend |
| System | None |

**13. Approval Rights**
- Major procurement decisions
- New store opening budget
- Network-wide discount campaigns
- Store Manager hiring recommendations

**14. Scope Restrictions**
- Company scope (retail division)

**15. Escalation Rules**
- Network crisis → Co-CEO (immediate)
- Supplier failure → Procurement + Co-CEO

**16. Analytics Access**
- Full retail analytics suite
- Network performance
- Supplier analytics
- Customer analytics

**17. Document Access**
- All retail documents
- Supplier contracts
- Store operational documents

**18. AI Access Level**
- Full retail AI
- Demand forecasting
- Supplier risk prediction
- Customer behavior analysis

**19. Security Level**
- L4 — Executive

**20. Inherited Permissions**
- Inherits all Store Manager + Seller permissions

---

### ROLE: App Support Specialist

**1. Purpose**
Technical support for PRV users. Investigates bugs, responds to support tickets, escalates to development. Read-only access to business data for investigation.

**2. Responsibilities**
- Respond to user support tickets
- Bug investigation and reproduction
- User account assistance (limited)
- Document known issues
- Escalate to development team

**3. Navbar Structure**
```
🎫 Tickets  |  🔍 Investigate  |  📋 Known Issues  |  👤 Users  |  📬 Inbox
```

**4. Dashboard Structure**
```
[ Dynamic Island — Open Tickets Count ]
[ Floating Search Bar ]
─────────────────────────────
Section 1: Open Tickets (priority sorted)
Section 2: My Active Tickets
Section 3: Critical Issues
Section 4: Known Issues Board
Section 5: Escalations Pending
[ Floating Tab Bar ]
```

**5. KPI Widgets**
- Open Tickets
- My Active Tickets
- Average Resolution Time
- Critical Issues Open
- Escalations Pending

**6. Notifications**
- CRITICAL: P0 bug reported by multiple users
- HIGH: Ticket unresolved > SLA
- MEDIUM: New ticket assigned
- LOW: Ticket resolved confirmation

**7. Dynamic Island Behavior**
- **Compact**: Open tickets count + critical badge
- **Expanded**: Open tickets · My tickets · SLA breaches · Critical

**8. Live Activities**
- Active ticket being worked
- SLA countdown for high-priority ticket

**9. Quick Actions**
1. Create Ticket
2. Escalate to Dev
3. Mark Resolved
4. Assign to Self
5. Add Known Issue
6. Contact User

**10. Inbox Content**
- New ticket assignments
- User replies
- Escalation responses
- System alerts

**11. Search Permissions**
- Users (basic info for support)
- Audit logs (read, support scope)
- Business data: Read-only, anonymized where possible

**12. Module Access**
| Module | Access |
|---|---|
| Support Tickets | Full |
| Known Issues | Full |
| Audit Logs | Read (limited) |
| User Accounts | Read (basic) |
| All business modules | Read-only (investigation) |
| Finance | None |
| Payroll | None |
| System Settings | None |

**13. Approval Rights**
- None

**14. Scope Restrictions**
- Global read (for investigation)
- Cannot modify any business data

**15. Escalation Rules**
- P0 bug → Development + System Admin (immediate)
- Data issue → System Admin

**16. Analytics Access**
- Support metrics only (tickets, resolution times)

**17. Document Access**
- Known issue documentation
- Support playbooks

**18. AI Access Level**
- AI ticket classification and routing
- Similar issue suggestions

**19. Security Level**
- L2 — Standard (read-only mitigates risk)

**20. Inherited Permissions**
- Inherits nothing — isolated support track

---

### ROLE: Data Analyst

**1. Purpose**
Dedicated analytics and reporting role. Transforms raw business data into insights. Builds custom reports and dashboards for leadership.

**2. Responsibilities**
- Build and maintain dashboards
- Generate custom reports on request
- Data quality monitoring
- Export data for executive consumption
- Anomaly investigation (data-driven)

**3. Navbar Structure**
```
📊 Analytics  |  📈 Reports  |  🔍 Explore  |  📤 Exports  |  📬 Inbox
```

**4. Dashboard Structure**
```
[ Dynamic Island — Active Report Jobs ]
[ Floating Search Bar ]
─────────────────────────────
Section 1: My Active Reports
Section 2: Scheduled Reports (next run)
Section 3: Data Quality Alerts
Section 4: Export Queue
Section 5: Requests from Leadership
[ Floating Tab Bar ]
```

**5. KPI Widgets**
- Reports Generated This Week
- Data Quality Score %
- Export Requests Pending
- Anomalies Detected
- Active Dashboards

**6. Notifications**
- HIGH: Data quality issue detected
- HIGH: Report request from executive
- MEDIUM: Scheduled report ready
- LOW: Data pipeline status

**7. Dynamic Island Behavior**
- **Compact**: Active report job indicator
- **Expanded**: Reports running · Data quality · Pending requests

**8. Live Activities**
- Active report job progress %
- Data pipeline status

**9. Quick Actions**
1. Run Report
2. Export Dataset
3. Build Dashboard
4. Flag Data Issue
5. Schedule Report
6. Send to Executive

**10. Inbox Content**
- Report requests
- Data quality alerts
- Executive feedback on reports
- Pipeline notifications

**11. Search Permissions**
- All business data (read-only, analytics scope)
- Cannot access individual sensitive records (payroll, HR personal data)

**12. Module Access**
| Module | Access |
|---|---|
| Analytics Platform | Full |
| All modules (read) | Read (aggregate) |
| Report Builder | Full |
| Export Engine | Full |
| Finance data | Read (aggregate, no personal) |
| HR data | Read (aggregate only) |
| System Settings | None |
| Payroll (individual) | None |

**13. Approval Rights**
- Own report publishing
- Data export (standard datasets)

**14. Scope Restrictions**
- Assigned company analytics scope
- No individual sensitive records

**15. Escalation Rules**
- Data quality crisis → System Admin + Operations Manager

**16. Analytics Access**
- Full analytics platform
- All business domains (read/aggregate)
- Custom dashboard builder

**17. Document Access**
- Reports, dashboards, data dictionaries

**18. AI Access Level**
- Full AI analytics features
- Predictive model access
- Anomaly detection tools

**19. Security Level**
- L3 — Elevated (data access is sensitive)

**20. Inherited Permissions**
- Isolated analytics track — no business role inheritance

---

### ROLE: QA Tester

**1. Purpose**
Quality assurance for the PRV platform. Tests features, validates releases, reports bugs, and ensures release readiness.

**2. Responsibilities**
- Test new features before release
- Regression testing
- Bug reporting and tracking
- Test case documentation
- Release sign-off participation

**3. Navbar Structure**
```
🧪 Testing  |  🐛 Bugs  |  📋 Test Cases  |  📊 Coverage  |  📬 Inbox
```

**4. Dashboard Structure**
```
[ Dynamic Island — Active Test Session ]
[ Floating Search Bar ]
─────────────────────────────
Section 1: Active Test Runs
Section 2: Open Bugs (by severity)
Section 3: Test Coverage %
Section 4: Release Checklist
Section 5: Pending Sign-offs
[ Floating Tab Bar ]
```

**5. KPI Widgets**
- Test Cases Run Today
- Bugs Open (by P0/P1/P2)
- Test Coverage %
- Release Readiness %
- Blocking Issues Count

**6. Notifications**
- CRITICAL: P0 bug found in release candidate
- HIGH: Test case failed
- MEDIUM: New build available to test
- LOW: Test run complete

**7. Dynamic Island Behavior**
- **Compact**: Test session active indicator + bug count
- **Expanded**: Active test · Coverage % · Open bugs · Release status

**8. Live Activities**
- Active test run progress
- Current bug count

**9. Quick Actions**
1. Start Test Session
2. Report Bug
3. Mark Test Pass
4. Mark Test Fail
5. Escalate P0
6. Generate Test Report

**10. Inbox Content**
- New build notifications
- Bug assignment updates
- Dev responses to bugs
- Release calendar

**11. Search Permissions**
- Sandbox/test environment data only
- Bug database full access
- Cannot access production business data

**12. Module Access**
| Module | Access |
|---|---|
| Test Environment (all modules) | Full (sandbox) |
| Bug Tracker | Full |
| Test Case Management | Full |
| Production data | None |
| Finance (production) | None |
| HR (production) | None |
| System Settings | None |

**13. Approval Rights**
- Test case sign-off (own)
- Bug severity classification

**14. Scope Restrictions**
- Sandbox/test environment only
- Zero access to production data

**15. Escalation Rules**
- P0 in production → System Admin + App Support (immediate)
- Release blocker → Project Director + System Admin

**16. Analytics Access**
- Test metrics only
- Bug trends, coverage reports

**17. Document Access**
- Test plans, test cases, bug reports
- Release notes

**18. AI Access Level**
- AI test case generation assistant
- Bug pattern detection

**19. Security Level**
- L2 — Standard (sandbox environment)

**20. Inherited Permissions**
- Isolated QA track — no business role inheritance

---

## 7. GLOBAL ACCESS MATRIX

| Module | CEO | Co-CEO | Sys Admin | Worker | TL | OMS | Ops Mgr | HR | Proj Worker | Proj TL | Proj OMS | Proj OPM | Proj Dir | Seller | Store Mgr | Shop Dir | App Sup | Analyst | QA |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| Dashboard | Full | Full | System | Personal | Team | Area | Regional | HR | Project | Team | Multi-proj | Portfolio | Company | Register | Store | Network | Tickets | Analytics | Test |
| Attendance | Full | Admin | None | Own | Team | Area | Regional | Full-read | Own | Own | Own | Own | Own | Own | Store | Network | Read | Aggregate | None |
| Projects | Full | Admin | None | None | None | None | None | None | Assigned | Assigned | Assigned | All-assigned | Company | None | None | None | Read | Aggregate | Sandbox |
| Shop / POS | Full | Admin | None | None | None | None | None | None | None | None | None | None | None | Own-register | Full-store | All-stores | Read | Aggregate | Sandbox |
| Finance | Full | Admin | None | None | None | None | Regional | Payroll | None | None | None | Proj-budget | Proj-revenue | None | Store P&L | Retail | None | Aggregate | None |
| HR / People | Full | Admin | User mgmt | Own | Team | Area | Regional | Full | Own | Own | Own | Proj-team | Proj-team | Own | Store-staff | Network-read | Basic | Aggregate | None |
| Analytics | Full | Full | System | Personal | Team | Area | Regional | HR | Personal | Team | Multi-proj | Portfolio | Company | Own | Store | Network | Tickets | Full | Test metrics |
| AI Platform | Full | Full | None | Basic | Scheduling | Forecasting | Forecasting | Payroll AI | Basic | Scheduling | Risk | Delivery | Strategy | Recommend | Inventory | Retail | Routing | Full | Generation |
| Documents | Full | Admin | System | Own | Team | Area | Regional | HR | Project | Project | Project | Portfolio | Company | Policies | Store | Network | Read | Reports | Test docs |
| Audit Logs | Full | Read | Full | None | None | None | None | None | None | None | None | None | None | None | None | None | Limited | None | None |
| System Settings | Read | None | Full | None | None | None | None | None | None | None | None | None | None | None | None | None | None | None | None |
| CRM | Full | Admin | None | None | None | None | None | None | None | None | None | Client-read | Full | None | Customer lookup | Customer | None | Aggregate | None |
| Procurement | Full | Admin | None | None | None | None | None | None | None | None | None | None | None | None | Store-budget | Full | None | Aggregate | None |
| Suppliers | Full | Admin | None | None | None | None | None | None | None | None | None | None | None | None | None | Full | None | None | None |
| Fleet | Full | Admin | None | None | None | None | None | None | None | None | None | None | None | None | None | None | None | Aggregate | None |
| Tools | Full | Admin | None | None | None | None | None | None | None | None | None | None | None | None | None | None | None | Aggregate | None |
| Knowledge Base | Full | Full | None | Read | Read | Read | Read | Read | Read | Read | Read | Read | Read | Read | Read | Read | Read | Read | Read |
| Learning | Full | Full | None | Assigned | Assigned | Assigned | Full | Full | Assigned | Assigned | Assigned | Assigned | Assigned | Assigned | Assign | Full | Assigned | Read | Assigned |
| Notifications | Full | Full | System | Own | Team | Area | Regional | HR | Project | Team | Multi | Portfolio | Company | Own | Store | Network | Tickets | Own | Own |

---

## 8. GLOBAL APPROVAL MATRIX

| Approval Type | CEO | Co-CEO | Ops Mgr | OMS | TL | HR | Proj Dir | Proj OPM | Proj OMS | Proj TL | Shop Dir | Store Mgr | Seller |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| Leave < 2 days | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | — | — | — | — | — | — | — |
| Leave 2-5 days | ✓ | ✓ | ✓ | ✓ | — | ✓ | — | — | — | — | — | — | — |
| Leave > 5 days | ✓ | ✓ | ✓ | — | — | ✓ | — | — | — | — | — | — | — |
| Overtime (team) | ✓ | ✓ | ✓ | ✓ | ✓ | — | — | — | — | — | — | ✓ | — |
| Payroll run | ✓ | ✓ | — | — | — | ✓ | — | — | — | — | — | — | — |
| Hire (staff) | ✓ | ✓ | Recommend | — | — | ✓ | Recommend | — | — | — | Recommend | — | — |
| Budget realloc | ✓ | ✓ | Regional | — | — | — | ✓ | Within ceiling | — | — | ✓ | Store budget | — |
| Procurement | ✓ | ✓ | — | — | — | — | — | — | — | — | ✓ | Store limit | — |
| Project milestone | ✓ | ✓ | — | — | — | — | ✓ | ✓ | ✓ | ✓ | — | — | — |
| Contract sign | ✓ | ✓ | — | — | — | — | ✓ | Read only | — | — | — | — | — |
| Return (shop) | ✓ | ✓ | — | — | — | — | — | — | — | — | ✓ | ✓ | Within limit |
| Discount > threshold | ✓ | ✓ | — | — | — | — | — | — | — | — | ✓ | ✓ | — |
| Disciplinary (formal) | ✓ | ✓ | ✓ | Recommend | — | ✓ | — | — | — | — | — | — | — |
| System changes | ✓ | — | — | — | — | — | — | — | — | — | — | — | — |
| Role assignment | ✓ | — | — | — | — | — | — | — | — | — | — | — | — |

---

## 9. DYNAMIC ISLAND ARCHITECTURE

### States
- **Compact Left**: Primary metric (e.g. revenue, timer, count)
- **Compact Right**: Secondary indicator (e.g. alert badge, status dot)
- **Expanded**: Full context with 3-4 data points
- **Tap action**: Opens most relevant screen
- **Long-press**: Glass Quick Actions panel

### Role Dynamic Island Map

| Role | Compact Left | Compact Right | Expanded Content | Tap → |
|---|---|---|---|---|
| CEO | Live Revenue ₺ | Alert count 🔴 | Revenue · Profit · Projects · Alerts | Executive Dashboard |
| Co-CEO | Live Revenue ₺ | Approvals pending | Revenue · Projects · Approvals · Alerts | Command Dashboard |
| System Admin | Health indicator 🟢/🔴 | Active sessions | Uptime · Errors · Sessions · Security | System Dashboard |
| Worker | Shift timer HH:MM | Break status | Shift time · Task · Break · Next event | Today screen |
| Team Leader | X/Y team present | Approvals 🔴 | Present · Absent · Tasks · Approvals | Team Dashboard |
| OMS | Area status | Risk count | Teams active · Attendance · Risks · Approvals | Area Dashboard |
| Operations Mgr | Regional health | Escalations | Areas · Budget · Workforce · Alerts | Regional Dashboard |
| HR / Payroll | Payroll countdown | Exceptions 🟡 | Payroll date · Exceptions · Leave · Contracts | HR Dashboard |
| Project Worker | Task timer | Deadline | Task · Deadline · Project · Progress | Active Task |
| Project TL | X/Y tasks done | Members on-site | Tasks · Members · Photos · Milestone | Team Project View |
| Project OMS | Projects RAG | Risk flags | 🟢X 🟡Y 🔴Z · Resources · Risks | Portfolio View |
| Project OPM | Budget % used | Client actions | Budget · Milestones · Clients · Risks | Portfolio Dashboard |
| Project Director | Project revenue | Strategic risks | Revenue · On-time % · Clients · Risks | Company Portfolio |
| Seller | Active transaction ₺ | Queue length | Transaction · Items · Daily sales · Float | POS |
| Store Manager | Store revenue ₺ | Staff active | Revenue · Target % · Staff · Stock alerts | Store Dashboard |
| Shop Director | Network revenue ₺ | Store health 🟢/🔴 | Revenue · Target % · Stores · Stock critical | Network Dashboard |
| App Support | Open tickets | Critical P0 🔴 | Tickets · Mine · SLA breaches · Critical | Ticket Queue |
| Data Analyst | Active report job | Queue count | Reports running · Data quality · Pending | Analytics Dashboard |
| QA Tester | Test session | Bug count P0 | Tests run · Coverage % · Bugs · Release % | Test Dashboard |

---

## 10. LIVE ACTIVITIES ARCHITECTURE

Live Activities appear on the Lock Screen and in the Dynamic Island during active sessions.

| Role | Primary Line | Secondary Line | Progress | Update Interval |
|---|---|---|---|---|
| CEO | Revenue ₺ today | Profit MTD + alerts | Revenue vs monthly target | 60s |
| Co-CEO | Revenue ₺ + approvals | Projects health | Revenue vs target | 60s |
| System Admin | System: OPERATIONAL / INCIDENT | Active sessions | Uptime % bar | 30s |
| Worker | Shift: HH:MM:SS | Current task name | Shift progress (of scheduled hours) | Live (1s) |
| Team Leader | X/Y present | Approval count | Team attendance % | 30s |
| OMS | Area: X teams active | Risks open | Area capacity % | 60s |
| Operations Mgr | Regional: X% capacity | Budget utilized % | Budget bar | 60s |
| HR / Payroll | Next payroll: X days | Exceptions pending | Payroll prep progress | 60s |
| Project Worker | Task: [name] | Deadline: X days | Task completion % | Live (on update) |
| Project TL | Tasks X/Y done | X members on-site | Team progress bar | 30s |
| Project OMS | 🟢X 🟡Y 🔴Z projects | Resources: X/Y | Portfolio health | 60s |
| Project OPM | Budget: X% used | Milestones: X due | Budget utilization bar | 60s |
| Project Director | Revenue from projects ₺ | On-time: X% | Portfolio delivery | 60s |
| Seller | Transaction: ₺[amount] | Daily: ₺X of ₺Y target | Daily sales progress bar | Live (per txn) |
| Store Manager | Store: ₺X of ₺Y target | Staff: X active | Daily revenue progress | 60s |
| Shop Director | Network: ₺X | X stores on target | Network revenue bar | 60s |
| App Support | X tickets open | X SLA at risk | SLA compliance % | 5m |
| Data Analyst | Report: [name] running | ETA: Xm | Job progress % | 30s |
| QA Tester | Test session active | X/Y cases run | Coverage progress bar | Live (per case) |

---

## 11. NOTIFICATION PRIORITY ARCHITECTURE

### Priority Levels
- **P0 — CRITICAL**: Immediate push + sound + Dynamic Island expansion + Live Activity update. Never batched.
- **P1 — HIGH**: Push notification + badge update. Delivered immediately.
- **P2 — MEDIUM**: Push notification (standard). Can be batched during quiet hours.
- **P3 — LOW**: Inbox badge only. No push. Visible on next open.

### Notification Matrix by Role

| Trigger | CEO | Co-CEO | Ops Mgr | OMS | TL | Worker | HR | Store Mgr | Shop Dir | Proj Dir |
|---|---|---|---|---|---|---|---|---|---|---|
| Revenue drop >10% | P0 | P0 | P1 | — | — | — | — | P1 (store) | P0 | — |
| Security incident | P0 | P0 | — | — | — | — | — | — | — | — |
| System downtime | P1 | P1 | P1 | P2 | — | P2 | — | P2 | P1 | P1 |
| Staff absent no notice | P2 | — | P1 | P1 | P0 | — | P1 | P1 (store) | P2 | — |
| Project at risk | P1 | P1 | — | — | — | — | — | — | — | P0 |
| Budget overrun | P0 | P0 | P1 | — | — | — | — | P1 (store) | P1 | P1 |
| Payroll run ready | P1 | P2 | — | — | — | P3 | P0 | — | — | — |
| Task assigned | — | — | — | — | P2 | P1 | — | — | — | — |
| Stock-out critical | P2 | P2 | — | — | — | — | — | P0 | P0 | — |
| Customer complaint | P2 | P2 | — | — | — | — | — | P1 | P2 | — |
| AI recommendation | P3 | P3 | P3 | — | — | — | P3 | P3 | P3 | P3 |
| Contract expiring 7d | P1 | P2 | — | — | — | — | P1 | — | — | P1 |
| Milestone reached | P3 | P3 | — | — | — | — | — | — | — | P1 |

---

## 12. TEMPORARY PROJECT ACCESS PROTOCOL

### Grant Trigger
Event: `user.assigned_to_project(user_id, project_id)`

Permissions automatically added:
```
project.read(project_id)
project.tasks.read_write(project_id, user_id)
project.documents.read(project_id)
project.chat.full(project_id)
project.photos.read_upload(project_id)
project.progress.write(project_id, user_id)
```

Access visible in navbar under "Projects" tab (appears only when assigned).
Dynamic Island reflects active project task if Worker or Project roles.

### Revoke Trigger
Event: `user.removed_from_project(user_id, project_id)`

All above permissions immediately revoked.
Active sessions invalidated for project scope within 60 seconds.
Audit log entry created: `ACCESS_REVOKED · user_id · project_id · timestamp`

### Rules
- Access is project-scoped, not company-scoped
- Cannot carry project data outside project scope
- Multiple project assignments stack independently
- Revoke from one project does not affect other assigned projects

---

## 13. AI ACCESS FRAMEWORK

| AI Feature | CEO | Co-CEO | Ops Mgr | OMS | TL | Worker | HR | Proj Dir | Proj OPM | Store Mgr | Shop Dir | Analyst |
|---|---|---|---|---|---|---|---|---|---|---|---|---|
| Executive AI Assistant | ✓ | ✓ | — | — | — | — | — | ✓ | — | — | ✓ | — |
| Predictive Revenue | ✓ | ✓ | — | — | — | — | — | ✓ | — | — | ✓ | ✓ |
| Workforce Forecasting | ✓ | ✓ | ✓ | ✓ | — | — | ✓ | — | — | ✓ | ✓ | ✓ |
| Task Scheduling Assist | — | — | — | — | ✓ | ✓ | — | — | — | — | — | — |
| Anomaly Detection | ✓ | ✓ | ✓ | — | — | — | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ |
| Inventory Forecasting | ✓ | ✓ | — | — | — | — | — | — | — | ✓ | ✓ | ✓ |
| Risk Prediction | ✓ | ✓ | ✓ | — | — | — | — | ✓ | ✓ | — | — | ✓ |
| Contract AI | ✓ | ✓ | — | — | — | — | ✓ | ✓ | — | — | — | — |
| Customer Insights | ✓ | ✓ | — | — | — | — | — | — | — | — | ✓ | ✓ |
| Report Generation | ✓ | ✓ | ✓ | — | — | — | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ |
| Upsell Recommendations | — | — | — | — | — | — | — | — | — | ✓ | ✓ | — |
| Personal Schedule AI | — | — | — | — | ✓ | ✓ | — | — | — | — | — | — |

---

## 14. AUDIT & SECURITY ARCHITECTURE

### Audit Log Entry Structure
Every action produces:
```
{
  timestamp: ISO8601,
  user_id: UUID,
  role: RoleEnum,
  action: ActionEnum,         // READ | WRITE | DELETE | APPROVE | LOGIN | LOGOUT
  resource_type: string,
  resource_id: UUID,
  scope: ScopeEnum,
  company_id: UUID,
  ip_address: string,
  device_fingerprint: string,
  result: SUCCESS | DENIED | ERROR,
  metadata: {}
}
```

### Audit Retention
- L2 roles: 90 days
- L3 roles: 1 year
- L4 roles: 7 years (legal compliance)
- L5 (System Admin): Permanent, isolated storage

### Zero Trust Validation Chain
```
1. Request received
2. Token validation (expired? tampered?)
3. Identity resolution (who is this user?)
4. Role verification (what is their current role?)
5. Permission check (does role have this permission?)
6. Scope validation (does this resource fall within their scope?)
7. Rate limiting (abuse prevention)
8. Execute action
9. Audit log write (non-blocking, guaranteed delivery)
10. Response
```

Any step failure → immediate rejection + audit entry with DENIED status.

### Session Security
| Level | Session Timeout | Re-auth for Sensitive | Max Sessions |
|---|---|---|---|
| L2 | 8 hours | No | 3 |
| L3 | 4 hours | PIN required | 2 |
| L4 | 30 minutes | Face ID required | 1 |
| L5 | 15 minutes | Hardware key required | 1 |

---

## 15. SOCIAL PROFILES PERMISSION ARCHITECTURE

### 15.1 Social Profile Permissions

Social profile data is treated as personal data under GDPR. Access is layered: visibility, editing, and export are separate permission nodes.

| Permission | Description |
|-----------|-------------|
| `social_profiles.view` | View social links on any person entity the role can already read |
| `social_profiles.edit_own` | Employee edits their own social links (LinkedIn, personal IG, X) |
| `social_profiles.edit_others` | Manager edits company-owned links (WhatsApp Business, Website) |
| `social_profiles.delete_own` | Employee removes their own social links |
| `social_profiles.delete_others` | Manager removes social links from managed entities |
| `data_export.gdpr` | Export profile data including social links (GDPR request handler) |

### 15.2 Social Profile Visibility Matrix

| Viewing Role | Own Profile | Same-Company Employee | Client | Supplier |
|---|---|---|---|---|
| Worker | ✓ Full | ✓ view only | ✗ Hidden | ✗ Hidden |
| Team Leader | ✓ Full | ✓ view (team scope) | ✗ Hidden | ✗ Hidden |
| OMS | ✓ Full | ✓ view (dept scope) | ✗ Hidden | ✗ Hidden |
| Operations Manager | ✓ Full | ✓ view (company) | ✓ view | ✓ view |
| HR/Payroll | ✓ Full | ✓ view + edit_others | ✓ view | ✗ Hidden |
| CEO | ✓ Full | ✓ Full | ✓ Full | ✓ Full |
| Project Director | ✓ Full | ✓ view (project scope) | ✓ view | ✓ view |
| Store Manager | ✓ Full | ✓ view (store scope) | ✓ view | ✗ Hidden |
| Shop Director | ✓ Full | ✓ view (all stores) | ✓ view | ✓ view |
| Seller | ✓ Full | ✓ view (store scope) | ✗ Hidden | ✗ Hidden |

**Rules:**
- No role can see social profiles without `social_profiles.view` AND read access to the entity
- Personal social links (LinkedIn, X, Instagram) are employee-owned: only `social_profiles.edit_own` allows changes
- Company-owned links (WhatsApp Business, Website) require `social_profiles.edit_others`
- GDPR consent flag governs whether a link is displayed; icon is hidden if consent is false/missing

### 15.3 GDPR Consent Model for Social Profiles

```
SocialProfileField {
  network:      "linkedin" | "facebook" | "instagram" | "x" | "tiktok" | "website" | "whatsapp_business"
  url:          string
  ownerType:    "employee_personal" | "company_managed"
  consentGiven: boolean        — employee explicitly opted in
  consentDate:  timestamp
  addedBy:      userId
  addedAt:      timestamp
  visibleTo:    scope level    — defaults to SCOPE_COMPANY
}
```

- Fields with `consentGiven: false` are stored but never rendered in UI
- Employee can withdraw consent at any time (sets `consentGiven: false`)
- Withdrawal does not delete the data — data is retained per GDPR retention policy, just hidden
- Data export via GDPR request includes all social profile fields regardless of consent state

---

## 16. PRESENCE SYSTEM PERMISSION ARCHITECTURE

### 16.1 Presence Visibility Rules

| Permission | Description |
|-----------|-------------|
| `presence.view_team` | View presence of team members |
| `presence.view_company` | View presence of all company employees |
| `presence.view_own` | Employee sees their own presence (always granted) |
| `presence.set_manual` | Employee manually overrides their presence status |
| `presence.override_others` | Manager sets presence for subordinates (e.g. on-site check-in) |

### 16.2 Presence Visibility by Role

| Role | Visibility Scope |
|------|-----------------|
| Worker | Own + same-team members |
| Team Leader | Own team |
| OMS | Own department |
| Operations Manager | All company employees |
| HR/Payroll | All company employees |
| CEO | All company employees |
| Project Director | Project team members |
| Store Manager | Store staff |
| Shop Director | All store staff |
| Seller | Own store colleagues |

### 16.3 Presence Data Rules

- Presence is derived automatically from: active session, attendance check-in, calendar block
- Employee can override via manual status (e.g. set "Busy" when working without a meeting block)
- Manual override expires: after current calendar block ends, or after 4 hours (whichever first)
- Presence is NOT stored in audit log (ephemeral data, real-time channel only)
- Offline status set automatically after 5 minutes of no active session heartbeat

---

## 17. DIGITAL BUSINESS CARD PERMISSION ARCHITECTURE

| Permission | Description |
|-----------|-------------|
| `business_card.view_own` | View and share own digital business card |
| `business_card.view_others` | View other employees' digital business cards |
| `business_card.share` | Share card via Share Sheet / AirDrop / Link |
| `business_card.public_link` | Generate public /card/:userId URL |
| `business_card.manage` | Admin manages card templates and company branding |

### 17.1 Eligible Roles for Digital Business Cards

Business cards are available for all employees by default. Content adapts to role:

| Role Tier | Card Content |
|-----------|-------------|
| Executive (CEO, Co-CEO, Directors) | Name · Title · Direct line · Email · LinkedIn · Company · QR |
| Manager (Ops Manager, HR, Store Manager) | Name · Title · Dept · Email · Phone · LinkedIn · QR |
| Specialist (Data Analyst, App Support) | Name · Title · Email · LinkedIn · QR |
| Frontline (Worker, Seller, Team Leader) | Name · Title · Company email · QR (no personal social by default) |

### 17.2 Public Card Link Rules

- `/card/:userId` URL is generated only if `business_card.public_link` permission held
- URL valid for 30 days (renewable)
- URL renders a public-facing page with only consent-given fields
- Accessing `/card/:userId` does NOT require PRV login
- Link can be revoked instantly by employee or manager

---

*End of PRV Complete Role Architecture v1.0*
*This document is the authoritative source of truth for all role-related implementation decisions.*
*No role, permission, or scope may be implemented differently without updating this document first.*
