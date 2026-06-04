# PRV — UI Sitemap Part 3
**Version:** 1.0
**Status:** APPROVED ARCHITECTURE
**Date:** 2026-06-03
**Roles Covered:** Project Manager · Team Lead · Field Supervisor · Worker · Cashier · Procurement Officer

---

## Role 12 — Project Manager

**Scope Level:** 3 — Projects domain (all projects they manage within their company)
**Description:** Manages internal company projects (not renovation — those use the Renovation module). Full control over projects, tasks, sprints, milestones, team assignments, and project budget. Power user of the project management tools.

---

### 1. Navigation

| Tab | Icon | Name | Primary Content |
|-----|------|------|----------------|
| 1 | ◎ | Command | PM dashboard, active projects, my approvals |
| 2 | 📋 | Projects | All managed projects, Kanban/Sprint views |
| 3 | ✅ | Tasks | Task inbox, assigned tasks, due today |
| 4 | 👥 | Team | Team member workloads, assignments |
| 5 | 📊 | Reports | Project analytics, velocity, budget |

---

### 2. Dashboard

**Header Zone:** Project Management · {Name} · {Date}

**KPI Zone:**
- Active Projects
- Tasks Due Today
- Overdue Tasks
- Projects On Schedule (%)
- Team Utilization (%)
- Budget Consumed Across Projects (avg %)

**Primary Zone:**
- Project Health Grid (each project: % complete, deadline, health status)
- Sprint Velocity Chart (last 6 sprints)

**Secondary Zone:**
- Tasks Due This Week (by project)
- Team Workload Overview

**Activity Zone:**
- Recent Task Completions
- Blocker Feed (blocked tasks)

**AI Zone:**
- Sprint Risk Prediction (will sprint complete on time?)
- Resource Conflict Alerts
- Scope Creep Signals

**Quick Actions Zone:**
- Create Task
- Start Sprint
- Create Milestone
- Generate Status Report

---

### 3. Screens

**Command Tab:** PM Dashboard → Project Detail (shortcut from health grid)

**Projects Tab:**
- Project List (cards: name, progress %, deadline, health)
  - Project Detail
    - Overview (description, team, dates, budget)
    - Kanban Board (columns: Backlog / To Do / In Progress / Review / Done)
      - Card Detail → Task Detail
    - Sprint Board
      - Active Sprint → Task list
      - Sprint Planning → Add tasks from backlog
    - Backlog (full task list, sorted, filterable)
    - Milestones (timeline view)
      - Milestone Detail → Mark Complete / Edit
    - Team Members (assignment, role in project)
    - Budget (allocated vs spent)
    - Documents (project docs)
    - Activity Log
    - AI Project Summary
  - Create Project
    - Title, description, team, dates, budget, template

**Tasks Tab:**
- My Task Inbox (tasks assigned to me)
  - Task Detail → Edit / Complete / Comment / Attach
- All Tasks (across all my projects)
  - Filter: project / status / assignee / priority / due date
- Due Today
- Overdue
- Blocked Tasks → Unblock (remove blocker / reassign)

**Team Tab:**
- Team Workload View (visual: each person, their tasks, capacity)
  - Member Tap → Member Workload Detail
    - Assigned tasks
    - Sprint capacity
    - Leave calendar (read-only)
- Task Assignment Optimizer (AI: suggest reassignments to balance load)
- Resource Conflict View (members double-booked or overloaded)

**Reports Tab:**
- Project Status Report (summary card per project)
  - Export to PDF / Share link
- Sprint Report (velocity, completed vs planned)
- Burndown Chart (per sprint, per project)
- Budget Report (allocated vs actual, by project)
- Team Performance (task completion rates, velocity per person)
- Custom Report Builder

---

### 4. Bottom Sheets

| Bottom Sheet | Trigger | Content | Actions |
|-------------|---------|---------|---------|
| Create Task | Quick action / board | Title, description, project, sprint, assignee, due date, priority, estimate | Create |
| Task Detail | Task card tap | Full task info, comments thread, attachments, history | Edit / Complete / Block / Reassign |
| Start Sprint | Sprint board action | Sprint name, goal, dates, tasks to include (from backlog) | Start Sprint |
| Complete Sprint | Active sprint action | Completed tasks count, incomplete summary, move to next sprint | Complete Sprint |
| Create Milestone | Projects action | Title, target date, project, linked tasks | Save |
| Budget Update | Budget tab action | Category, amount, notes, attachment | Submit |
| Task Blocker | Task detail action | Blocker description, linked task, assigned resolver | Add Blocker |
| AI Sprint Risk | AI zone tap | Risk factors, predicted completion %, mitigation suggestions | Apply Suggestion / Dismiss |
| Status Report Generate | Quick action | Project selector, period, format | Generate / Export |
| Team Rebalance | AI suggestion | Member A load, Member B load, suggested moves | Apply / Dismiss |

---

### 5. Dynamic Island

**Idle State:** {N} active projects · {N} tasks due today

**Sprint Active:** 🏃 Sprint "{name}" · Day {N}/{total} · {tasks_done}/{total} done

**Blocker Alert:** 🚫 {N} blocked tasks · Tap to resolve

**Expanded State:** Sprint progress / Blockers count / Tasks due today / Team utilization

---

### 6. Widgets

**Lock Screen:** Tasks due today · Blocked tasks count

**Home Screen:** Active projects / Sprint progress / Blockers / Due today

**Dashboard Widgets:**
- Project Health Grid
- Sprint Burndown Chart
- Task Due Calendar
- Team Workload Overview
- Velocity Chart
- Blocker Feed
- Milestone Timeline
- Budget Usage per Project
- AI Sprint Risk Indicator

---

### 7. Notifications

| Event | Title | Body | Priority | Channels |
|-------|-------|------|----------|---------|
| Task assigned to me | 📋 New Task | You have a new task: "{title}" due {date}. | Normal | Push + In-App |
| Task overdue | ⏰ Task Overdue | "{task}" is {N} days overdue (assigned to {name}). | High | Push + In-App |
| Task blocked | 🚫 Task Blocked | "{task}" has been blocked by {name}: {reason}. | High | Push + In-App |
| Milestone due | 🏁 Milestone Due | Milestone "{name}" is due in {N} days. | High | Push + In-App |
| Sprint ending | 🏃 Sprint Ending | Sprint "{name}" ends in {N} days. {N} tasks incomplete. | High | Push + In-App |
| Budget threshold | 💰 Budget Alert | Project "{name}" budget at {N}%. | Normal | In-App |
| AI sprint risk | 🤖 Risk Alert | Sprint "{name}" at risk of not completing on time. | High | Push + In-App |
| New team member added | 👥 Team Update | {name} added to project "{project}". | Low | In-App |
| Project approved | ✅ Approved | Project "{name}" has been approved. Work can begin. | Normal | Push + In-App |

---

---

## Role 13 — Team Lead

**Scope Level:** 2 — Team (their team members only)
**Description:** Manages a specific team within a department. Assigns tasks, tracks daily progress, manages team schedule, handles team approvals. Limited view — only their team's data.

---

### 1. Navigation

| Tab | Icon | Name | Primary Content |
|-----|------|------|----------------|
| 1 | ◎ | Command | Team dashboard, today's progress |
| 2 | ✅ | Tasks | Team task board, my own tasks |
| 3 | 👥 | My Team | Team members, schedule, attendance |
| 4 | 📅 | Schedule | Weekly team schedule, leave view |
| 5 | 💬 | Chat | Team communication channel |

---

### 2. Dashboard

**Header Zone:** {Team Name} · Team Lead · {Date}

**KPI Zone:**
- Team Members Present Today
- Tasks Completed Today
- Overdue Tasks
- Tasks In Progress
- Leave Requests Pending
- Team Attendance Rate

**Primary Zone:**
- Team Task Board (compact Kanban)
- Today's Schedule (who is working, on what)

**Secondary Zone:**
- Upcoming Deadlines (this week)
- Blocked Tasks

**Activity Zone:**
- Recent Team Activity Feed

**AI Zone:**
- Workload Imbalance Alerts
- Task Completion Forecast

**Quick Actions Zone:**
- Create Task
- Check In Team
- Approve Leave
- Daily Standup Summary

---

### 3. Screens

**Command Tab:** Team Dashboard → Daily Summary

**Tasks Tab:**
- Team Task Board (Kanban: To Do / In Progress / Review / Done)
  - Task Detail → Edit / Assign to Team Member / Comment
- My Tasks (tasks assigned to me as lead)
- Create Task → Assign to team member
- Overdue Tasks List
- Blocked Tasks List

**My Team Tab:**
- Team Member List
  - Member Detail
    - Name, role, contact
    - Today's tasks
    - Attendance status
    - Leave balance (summary only)
- Quick Message any member

**Schedule Tab:**
- Weekly Schedule View (all team members)
  - Day Detail
- Leave Calendar (team scope)
  - Leave Request → Approve / Reject
- Overtime Requests

**Chat Tab:**
- Team Channel (primary)
- Direct Messages within team
- Pinned Messages
- Shared Files

---

### 4. Bottom Sheets

| Bottom Sheet | Trigger | Content | Actions |
|-------------|---------|---------|---------|
| Create Task | Quick action | Title, assignee, due date, priority | Create |
| Task Edit | Task tap | Full task edit form, comment box | Save |
| Leave Approval | Leave request | Member name, dates, reason, team impact | Approve / Reject |
| Daily Standup | Quick action | Yesterday / Today / Blockers per member | Save Summary / Share |
| Member Quick View | Team member tap | Name, current task, status, contact | Message / Assign Task |

---

### 5. Dynamic Island

**Idle State:** {Team} · {N}/{total} present · {tasks_done} tasks done today

**Alert State:** 🚫 {N} blocked tasks · Tap to resolve

**Expanded State:** Team present count / Tasks completed today / Blockers / Leave pending

---

### 6. Widgets

**Lock Screen:** Team present today · Tasks done today

**Home Screen:** Team attendance / Tasks due today / Overdue / Leave pending

**Dashboard Widgets:**
- Team Task Board
- Team Attendance
- Workload Balance
- Task Completion Rate
- Upcoming Deadlines
- Leave Calendar

---

### 7. Notifications

| Event | Title | Body | Priority | Channels |
|-------|-------|------|----------|---------|
| Team member late | ⏰ Late | {name} has not clocked in ({N} min late). | High | Push |
| Task blocked | 🚫 Blocked | {name} marked "{task}" as blocked: {reason}. | High | Push + In-App |
| Task overdue | ⏰ Overdue | "{task}" assigned to {name} is overdue. | High | In-App |
| Leave request | 🏖️ Leave | {name} requests leave: {dates}. | Normal | Push + In-App |
| Task completed | ✅ Done | {name} completed "{task}". | Low | In-App |
| New task assigned | 📋 Task | You've been assigned: "{task}" due {date}. | Normal | Push + In-App |

---

---

## Role 14 — Field Supervisor / Site Supervisor

**Scope Level:** 3 — Active renovation site and assigned teams
**Description:** On a construction/renovation site. Submits daily site reports, manages on-site workers, tracks phase and task completion, manages material requests, handles site safety. Primary mobile user, often offline. Optimized for fast input in field conditions.

---

### 1. Navigation

| Tab | Icon | Name | Primary Content |
|-----|------|------|----------------|
| 1 | ◎ | Command | Site dashboard, today's workers, phase status |
| 2 | 🏗️ | Site | Active project(s), phases, tasks |
| 3 | 📋 | Reports | Daily site report, safety log |
| 4 | 📦 | Materials | Material requests, delivery tracking |
| 5 | 🦺 | Safety | Safety checklist, incidents, briefings |

---

### 2. Dashboard

**Header Zone:** {Project Name} · Site Supervisor · {Date} · GPS: {site address}

**KPI Zone:**
- Workers On Site (actual vs scheduled)
- Phase Completion % (active phase)
- Tasks Completed Today
- Material Requests Pending
- Safety Issues Open
- Daily Report Status (submitted / pending)

**Primary Zone:**
- Phase Progress Bar (all phases, current highlighted)
- Today's Task List (assigned to this site)

**Secondary Zone:**
- Workers Present (photo grid with names)
- Material Deliveries Expected Today

**Activity Zone:**
- Recent Task Completions
- Recent Site Events

**AI Zone:**
- Project Delay Risk Assessment
- Material Shortage Prediction

**Quick Actions Zone:**
- Submit Daily Report
- Log Safety Issue
- Request Materials
- Clock In Worker (manual)

---

### 3. Screens

**Command Tab:** Site Dashboard → Phase Detail

**Site Tab:**
- Active Projects List (assigned as supervisor)
  - Project Detail
    - Phase Overview (all phases, progress)
    - Task Board (site tasks: To Do / In Progress / Done)
      - Task Detail → Complete / Add Note / Upload Photo
    - Workers On Site (today's attendance per project)
    - Site Photos Library
    - Project Documents (read-only: contract, estimates)
- Create Task (for site tasks)

**Reports Tab:**
- Daily Report
  - Today's Report (pre-filled: date, project, workers count)
    - Workers present (check list)
    - Work performed (text)
    - Issues encountered (text)
    - Materials used (quantity entry per item)
    - Progress delta (%)
    - Photos (camera / gallery)
    - Submit
  - Report History (past reports, submitted)
- Incident Report (ad-hoc)
  - Type / severity / description / persons / actions / photos / Submit
- Weekly Summary (auto-generated from daily reports)

**Materials Tab:**
- Material Request
  - New Request Form
    - Project / Phase
    - Items list (product + quantity + unit)
    - Needed by date
    - Notes
    - Submit for Approval
  - Request History (status tracking)
- Expected Deliveries (from approved POs)
  - Delivery confirmation (accept / note discrepancy)
- Material Usage Log

**Safety Tab:**
- Daily Safety Checklist
  - Pre-work checks (PPE, equipment, site conditions)
  - Submit Checklist
- Safety Incidents
  - Log Incident → Type / Severity / Description / Persons / Actions
  - Incident History
- Safety Briefings
  - Deliver Briefing → Select Workers → Confirm Acknowledgments
  - Briefing History
- Site Inspections
  - Scheduled Inspection → Checklist → Submit

---

### 4. Bottom Sheets

| Bottom Sheet | Trigger | Content | Actions |
|-------------|---------|---------|---------|
| Quick Daily Report | Quick action | Pre-filled form: workers, work done, delta % | Submit |
| Task Complete | Task tap | Task title, completion note, photo upload | Mark Done |
| Clock In Worker | Quick action | Worker selector (QR scan or name search), time | Record Clock-In |
| Material Request | Quick action | Item list builder, needed by date, project/phase | Submit |
| Delivery Confirm | Expected delivery | PO summary, line-item acceptance, discrepancy note | Confirm / Flag Discrepancy |
| Log Incident | Safety tab | Incident type, severity, description, persons | Submit Report |
| Safety Briefing Deliver | Safety tab | Briefing type, present workers (checklist), notes | Deliver & Record |
| Photo Attach | Any report | Camera / Gallery picker, caption | Attach |
| Phase Progress Update | Site tab | Current phase, progress % slider, note | Update |

---

### 5. Dynamic Island

**Idle State:** {Project} · Day {N} · Phase {N}: {progress}% complete

**Workers On Site:** 👷 {N} workers on site · {clocked_in}/{scheduled} clocked in

**Alert State:** 🚨 Safety issue open · Tap to review

**Expanded State:** Workers on site / Phase progress / Daily report status / Material requests pending

---

### 6. Widgets

**Lock Screen:** Workers on site · Phase progress %

**Home Screen:** Project name / Workers today / Phase progress / Daily report status

**Dashboard Widgets:**
- Phase Progress Timeline
- Worker Attendance Today
- Material Requests Status
- Safety Issues Open
- Task Completion Rate
- Daily Report Streak

---

### 7. Notifications

| Event | Title | Body | Priority | Channels |
|-------|-------|------|----------|---------|
| Material delivery arriving | 📦 Delivery Today | {supplier} delivering {items} to site today. | High | Push + In-App |
| Material request approved | ✅ Request Approved | Your material request #{N} has been approved. | Normal | Push + In-App |
| Phase sign-off required | 🏗️ Phase Sign-Off | Client approval required for Phase {N} completion. | High | Push + In-App |
| Daily report overdue | ⏰ Report Due | Today's site report has not been submitted. | High | Push |
| Worker absent | 👷 Absence | {name} marked absent. Cover needed for today. | High | Push |
| Safety inspection scheduled | 🦺 Inspection | Safety inspection scheduled for {date} at {time}. | Normal | Push + In-App |
| Project milestone | 🏁 Milestone | Project "{name}" reached milestone: {description}. | Normal | In-App |
| PM message | 💬 Message | {PM name}: {message preview} | Normal | Push + In-App |

---

---

## Role 15 — Worker / Field Employee

**Scope Level:** 1 — Own records only
**Description:** The most common role. Production workers, site workers, and office employees. Clocks in/out, sees assigned tasks, submits hours, views schedule, requests leave, accesses own documents and payslips. Very focused, streamlined UI — minimal complexity.

---

### 1. Navigation

| Tab | Icon | Name | Primary Content |
|-----|------|------|----------------|
| 1 | 🏠 | Home | My dashboard: today's schedule, my tasks, status |
| 2 | ✅ | My Tasks | Tasks assigned to me, by project |
| 3 | 📅 | Schedule | My weekly schedule, shift calendar |
| 4 | 📁 | My Docs | My payslips, contract, certificates |
| 5 | 👤 | Profile | My profile, leave requests, settings |

---

### 2. Dashboard

**Header Zone:** {Name} · {Date} · {Shift: 08:00–17:00} or Off

**KPI Zone (personal):**
- Clock-in Status (clocked in / not started / clocked out)
- Current Task (if assigned)
- Hours Worked This Week
- Leave Balance (days remaining)
- Next Shift Start
- Unread Messages

**Primary Zone:**
- Today's Task List (my assigned tasks, in priority order)
- Today's Schedule (what shift, what site/location)

**Secondary Zone:**
- Recent Announcements
- My Leave Calendar

**Activity Zone:**
- Recent Messages (from team lead / supervisor)
- Upcoming Training

**Quick Actions Zone:**
- Clock In / Clock Out
- Request Leave
- View Payslip
- Contact Team Lead

---

### 3. Screens

**Home Tab:** Personal Dashboard → Today's Summary

**My Tasks Tab:**
- Task List (by project/phase, due date)
  - Task Detail
    - Description
    - Due date
    - Instructions / attachments (read)
    - Status update (In Progress / Done)
    - Add completion note
    - Upload photo proof

**Schedule Tab:**
- Weekly Calendar View (my schedule)
  - Day Tap → Day Detail (shifts, tasks)
- Monthly View
- Past Shifts (last 30 days)
- Attendance Log (my own: clock-in/out history)

**My Docs Tab:**
- Payslips (list, sorted by date)
  - Payslip Detail → Download / Share
- My Contract (view only)
- My Certificates (upload and view)
- Company Policies (read access)
- Onboarding Documents (if recent hire)

**Profile Tab:**
- My Profile (name, photo, department, position — read only)
- Leave Requests
  - Submit New Leave Request
    - Leave type, dates, reason
  - My Leave History
  - Leave Balance by Type
- My Settings
  - Notification preferences
  - Language
  - App theme preference
- Emergency Contact Info

---

### 4. Bottom Sheets

| Bottom Sheet | Trigger | Content | Actions |
|-------------|---------|---------|---------|
| Clock In | Home quick action / Dashboard | Site selector (if multiple), current GPS confirmation | Clock In |
| Clock Out | Home (while clocked in) | Duration summary, add note | Clock Out |
| Task Update | Task tap | Status selector, completion note, photo upload | Update |
| Leave Request | Profile tab | Leave type, start/end date, reason | Submit |
| Payslip View | Docs tab | Month selector, payslip details, gross/deductions/net | Download |
| Report Issue | Any screen | Issue type, description | Submit |
| Contact Team Lead | Quick action | Message composer | Send Message |

---

### 5. Dynamic Island

**Clocked In:** ⏱️ On site · {duration} · {task_name}

**Not Clocked In:** 👋 Not started · Shift: {start_time}

**Task Reminder:** ✅ Task due: "{task_name}" · Tap

**Expanded State:** Clock-in duration / Current task / Hours this week / Next shift

---

### 6. Widgets

**Lock Screen:** Clock-in status · Hours worked today

**Home Screen:** Clock-in/out button / Today's tasks count / Next shift / Leave balance

**Dashboard Widgets:**
- My Tasks Today
- Attendance Streak
- Hours This Week
- Leave Balance
- Next Payslip Date
- Company Announcements

---

### 7. Notifications

| Event | Title | Body | Priority | Channels |
|-------|-------|------|----------|---------|
| New task assigned | 📋 New Task | You have a new task: "{title}" due {date}. | Normal | Push + In-App |
| Task overdue | ⏰ Task Due | Your task "{title}" is due today. | High | Push |
| Shift starting | ⏰ Shift Reminder | Your shift starts in 1 hour at {location}. | Normal | Push |
| Leave approved | ✅ Leave Approved | Your leave request for {dates} has been approved. | Normal | Push + In-App |
| Leave rejected | ❌ Leave Rejected | Your leave request was rejected: {reason}. | Normal | Push + In-App |
| Payslip available | 💰 Payslip Ready | Your {month} payslip is ready. | Normal | Push + In-App |
| Company announcement | 📢 Announcement | {title}: {preview} | Normal | Push + In-App |
| Training assigned | 📚 New Training | You've been enrolled in "{course}". Due: {date}. | Normal | Push + In-App |

---

---

## Role 16 — Cashier

**Scope Level:** 1 — Own register/POS session
**Description:** Operates a point-of-sale register. Processes sales, handles returns, applies permitted discounts. Shift-focused experience — everything revolves around the current register session. Interface optimized for speed.

---

### 1. Navigation

| Tab | Icon | Name | Primary Content |
|-----|------|------|----------------|
| 1 | 🛒 | POS | Active register session, quick sale |
| 2 | 📋 | Orders | Today's orders, returns |
| 3 | 🏷️ | Products | Product lookup, price check |
| 4 | 📅 | Schedule | My schedule, today's shift |
| 5 | 👤 | Profile | My profile, leave, settings |

---

### 2. Dashboard

**Header Zone:** {Register Name} · {Cashier Name} · {Shift Time}

**KPI Zone (shift-focused):**
- Session Status (Open / Closed)
- Sales This Session
- Transactions This Session
- Returns This Session
- Opening Float
- Expected Closing Balance

**Primary Zone:**
- Quick Sale Panel (product search + quantity + pay)
- Recent Transactions List

**Secondary Zone:**
- Low-Stock Alerts (visible items)
- Pending Fulfillment Orders

**Quick Actions Zone:**
- New Sale
- Process Return
- Discount Request
- End Session

---

### 3. Screens

**POS Tab:**
- Register Session
  - Open Session → Float Entry
  - Active Session (main POS interface)
    - Product Search (barcode / name / SKU)
    - Cart Builder (add/remove items, qty)
    - Discount Application (within limits; above limit = request)
    - Payment Processing (cash / card / transfer)
    - Receipt Print / Send
    - Transaction Summary
  - Close Session
    - Cash count entry
    - Discrepancy note
    - Submit closing

**Orders Tab:**
- Today's Orders (this register)
  - Order Detail → View Items / Print Receipt
- Return Processing
  - Select original order
  - Select items to return
  - Reason
  - Refund method (cash / card credit)
  - Process
- Order History (last 7 days, this register)

**Products Tab:**
- Product Search (read-only catalog)
  - Product Detail → Price / Stock / Variants
- Barcode Scanner (price check)
- Low-Stock List (read-only)

**Schedule Tab:**
- My Shifts (this week)
- Attendance Log (my clock-ins)

**Profile Tab:**
- My Profile
- Leave Requests
- Notification Settings

---

### 4. Bottom Sheets

| Bottom Sheet | Trigger | Content | Actions |
|-------------|---------|---------|---------|
| Open Session | POS tab | Register selector, opening float amount | Open |
| Add to Cart | Product search result | Product name, price, quantity | Add |
| Apply Discount | Cart action | Discount type, value, reason (if above threshold = request) | Apply / Request Approval |
| Payment Collection | Cart → Pay | Amount, payment method, change calculator | Complete Sale |
| Process Return | Orders tab | Order items, reason, refund amount, method | Process Return |
| Close Session | Quick action | Sales summary, cash count entry, discrepancy | Close & Submit |
| Discount Request | Discount threshold | Request amount, reason, manager selector | Submit Request |

---

### 5. Dynamic Island

**Session Open:** 🛒 Register #{N} · {N} sales · {amount}

**Session Closed / Not Started:** 🏁 No active session

**Discount Approval Pending:** ⏳ Discount approval pending · Tap to check

**Expanded State:** Session sales / Transaction count / Session duration / Pending approvals

---

### 6. Widgets

**Lock Screen:** Session status · Sales today

**Home Screen:** Session status / Sales this session / Transactions / Shift time remaining

**Dashboard Widgets:**
- Session Summary
- Today's Sales Chart (hourly)
- Top Products Sold Today
- Return Rate

---

### 7. Notifications

| Event | Title | Body | Priority | Channels |
|-------|-------|------|----------|---------|
| Discount approved | ✅ Discount OK | Manager approved {N}% discount for order. Proceed. | High | Push |
| Discount rejected | ❌ Discount Denied | Discount request rejected. Standard price applies. | High | Push |
| Low stock item | 📦 Low Stock | {product} only has {N} units left. | Normal | In-App |
| Shift starting | ⏰ Shift Reminder | Your shift starts in 30 minutes. | Normal | Push |
| Session not closed | 🛒 Session Open | Your register session has been open for {N} hours. | High | Push |
| Payment approved | ✅ Payment OK | Large payment of {amount} approved. Complete sale. | High | Push |

---

---

## Role 17 — Procurement Officer

**Scope Level:** 3 — Procurement domain, company-wide
**Description:** Manages the full procurement cycle. Creates purchase orders, obtains approvals, tracks deliveries, matches supplier invoices to POs (3-way matching), manages supplier relationships, and maintains price lists.

---

### 1. Navigation

| Tab | Icon | Name | Primary Content |
|-----|------|------|----------------|
| 1 | ◎ | Command | Procurement dashboard, PO pipeline, AP summary |
| 2 | 📄 | Orders | Purchase orders, create/track/receive |
| 3 | 🏭 | Suppliers | Supplier directory, evaluations, price lists |
| 4 | 📦 | Receiving | Goods receipts, delivery tracking, discrepancies |
| 5 | 📊 | Reports | Procurement analytics, spend reports |

---

### 2. Dashboard

**Header Zone:** Procurement · {Company} · {Date}

**KPI Zone:**
- Open POs (awaiting delivery)
- POs Pending Approval
- Deliveries Expected This Week
- Supplier Invoices to Match
- Outstanding AP (pending payment)
- Spend MTD

**Primary Zone:**
- PO Status Pipeline (Draft → Approval → Sent → In Transit → Received → Invoiced)
- Spend by Supplier (top 5, current month)

**Secondary Zone:**
- Material Requests Pending (from renovation/projects)
- Upcoming Payment Due Dates

**Activity Zone:**
- Recent PO Activity
- Recent Deliveries

**AI Zone:**
- Reorder Suggestions (below reorder point items)
- Supplier Performance Alerts
- Price Increase Signals (vs last PO)

**Quick Actions Zone:**
- Create Purchase Order
- Confirm Delivery
- Match Supplier Invoice
- Generate Spend Report

---

### 3. Screens

**Command Tab:** Procurement Dashboard → KPI Detail

**Orders Tab:**
- PO List (filter: status / supplier / project / date)
  - PO Detail
    - Header info (supplier, dates, delivery location)
    - Line items
    - Status history
    - Approval chain
    - Goods receipts linked
    - Supplier invoices linked
    - Documents
    - Send PO (email to supplier)
  - Create Purchase Order
    - Supplier selector
    - Line items (from catalog or manual)
    - Delivery location / date
    - Project linkage (renovation / other)
    - Submit for approval
  - Material Requests Queue
    - Request Detail → Convert to PO
- PO Approval Queue (POs I can approve at my level)

**Suppliers Tab:**
- Supplier List (search, filter by type/status/country)
  - Supplier Detail
    - Profile (contact info, payment terms)
    - Contacts
    - Price Lists
      - Active price list → Line items
      - Create / Update price list
    - Purchase History (all POs)
    - Evaluations
      - Past evaluations
      - New Evaluation Form
    - Documents (insurance, certificates, contracts)
    - Payment History
- Add Supplier → Onboarding form → Submit for approval
- Supplier Evaluation Center (bulk or per-supplier)

**Receiving Tab:**
- Expected Deliveries (today / this week / overdue)
  - Delivery Detail → Confirm Receipt
    - PO details
    - Line-item acceptance per line
    - Quantity accepted / rejected
    - Discrepancy notes
    - Photo documentation
- Goods Receipt History
- Discrepancy Log → Resolution tracking

**Reports Tab:**
- Spend Report (by supplier / category / period / project)
- PO Cycle Time (average time from creation to receipt)
- Supplier Performance Summary
- AP Aging (from procurement view)
- Price Variance Analysis (current vs prior PO prices)
- Material Request Turnaround Time
- Custom Report Builder (procurement scope)

---

### 4. Bottom Sheets

| Bottom Sheet | Trigger | Content | Actions |
|-------------|---------|---------|---------|
| Create PO | Quick action | Supplier, items (quantity, price), delivery date, project | Create Draft |
| Add PO Line | PO create/edit | Product search or manual entry, qty, price, unit | Add Line |
| Submit PO for Approval | PO draft action | Summary: supplier, total, delivery date | Submit |
| Send PO to Supplier | Approved PO | Email preview, attachment, contact selector | Send |
| Confirm Delivery | Expected delivery | PO summary, per-line quantity entry, discrepancy | Confirm |
| Discrepancy Report | Receiving action | Line items, discrepancy type, photo, notes | Submit |
| Match Supplier Invoice | Invoice received | PO list, line-by-line match, variance flags | Match / Flag |
| Supplier Evaluation | Supplier detail | Score fields (quality, delivery, price, comms), notes | Submit |
| Price List Update | Supplier price list | Current prices, new prices, effective date | Save |
| Reorder Alert | AI suggestion | Product, current stock, suggested qty, preferred supplier | Create PO / Dismiss |
| Spend Report | Quick action | Period, dimension (supplier/category/project) | Generate / Export |

---

### 5. Dynamic Island

**Idle State:** Procurement · {N} open POs · {N} deliveries expected

**Delivery Today:** 📦 {N} deliveries today · Tap to confirm

**Approval Pending:** ✅ {N} POs awaiting approval

**Expanded State:** Open POs / Expected deliveries today / Invoices to match / Spend MTD

---

### 6. Widgets

**Lock Screen:** Open POs · Deliveries today

**Home Screen:** PO pipeline / Deliveries today / Invoices to match / Spend MTD

**Dashboard Widgets:**
- PO Pipeline Status
- Spend by Supplier
- Delivery Calendar
- AP Aging
- Supplier Performance Scores
- Reorder Alert List
- Material Request Queue
- Price Variance Chart

---

### 7. Notifications

| Event | Title | Body | Priority | Channels |
|-------|-------|------|----------|---------|
| PO approved | ✅ PO Approved | PO #{N} to {supplier} approved. Send to supplier? | High | Push + In-App |
| PO rejected | ❌ PO Rejected | PO #{N} was rejected: {reason}. | High | Push + In-App |
| Delivery expected today | 📦 Delivery Today | {supplier} delivery expected today for PO #{N}. | High | Push + In-App |
| Delivery overdue | ⚠️ Delivery Late | PO #{N} delivery is {N} days overdue ({supplier}). | High | Push + In-App |
| Supplier invoice received | 🧾 Invoice Received | {supplier} sent invoice #{N} for {amount}. Match to PO. | Normal | Push + In-App |
| Reorder suggestion | 📦 Reorder | {product} is below reorder point. {N} units remaining. | Normal | In-App |
| Supplier evaluation due | ⭐ Eval Due | {supplier} evaluation is due this month. | Normal | In-App |
| Material request submitted | 📋 Material Request | New material request from {name} for project "{project}". | Normal | Push + In-App |
| Price increase detected | 💰 Price Alert | {supplier} pricing for {product} increased {N}% vs last PO. | Normal | In-App |

---

*End of Part 3 — Continues in UI_SITEMAP_PART4.md*

*Part 4 covers: Fleet Manager · Client Portal · Supplier Portal + Master Indexes (Screen Index, Bottom Sheet Catalog, Dynamic Island Matrix, Notification Matrix, Widget Catalog, Deep Link Map)*
