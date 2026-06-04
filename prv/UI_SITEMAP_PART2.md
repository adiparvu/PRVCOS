# PRV — UI Sitemap Part 2
**Version:** 1.0
**Status:** APPROVED ARCHITECTURE
**Date:** 2026-06-03
**Roles Covered:** Regional Manager · Store Manager · Shop Director · Department Head · HR Manager · Finance Manager

---

## Role 06 — Regional Manager

**Scope Level:** 5 — Region (all stores assigned to their region)
**Description:** Manages a geographic region of stores. Focused on regional revenue, store performance comparisons, cross-store staffing, and regional inventory levels.

---

### 1. Navigation

| Tab | Icon | Name | Primary Content |
|-----|------|------|----------------|
| 1 | ◎ | Command | Regional dashboard, store performance tiles |
| 2 | 🏪 | Stores | All stores in region, store-by-store drill-down |
| 3 | 👥 | People | Regional headcount, attendance, transfers |
| 4 | 📊 | Reports | Regional analytics, comparisons, exports |
| 5 | ✅ | Approvals | Approval inbox scoped to region |

**Tab 1 — Command:** Regional KPI cockpit with store performance tiles
**Tab 2 — Stores:** Store list → each store's manager-level data; cross-store inventory
**Tab 3 — People:** Headcount per store, leave calendar, transfer requests, attendance rates
**Tab 4 — Reports:** Revenue by store, staff performance, inventory levels, period comparisons
**Tab 5 — Approvals:** Leave requests, expense claims, overtime requests from regional staff

---

### 2. Dashboard

**Header Zone:** {Region Name} · Regional Manager · {N} Stores · {Date}

**KPI Zone:**
- Regional Revenue MTD (vs prior month)
- Regional Revenue YTD
- Best Performing Store (by revenue)
- Worst Performing Store (alert if below target)
- Regional Headcount
- Regional Attendance Rate (today)

**Primary Zone:**
- Store Performance Grid (each store: revenue, attendance, open alerts — traffic light)
- Regional Revenue Trend (last 12 months, stacked bar by store)

**Secondary Zone:**
- Leave Requests Pending
- Transfer Requests Pending

**Activity Zone:**
- Store Activity Feed (last events from all stores)

**AI Zone:**
- Underperformance Signals by Store
- Staffing Risk Alerts (under/overstaffed stores)

**Quick Actions Zone:**
- Approve Pending Leave
- View Store Rankings
- Initiate Staff Transfer
- Generate Regional Report

---

### 3. Screens

**Command Tab:** Regional Dashboard → KPI Drill-Down (by store, by period)

**Stores Tab:**
- Store List (cards with revenue, headcount, alert count)
  - Store Detail
    - Store Overview (daily revenue, staff present, inventory alerts)
    - Store Staff (list → basic profile)
    - Store Attendance (today's schedule vs actual)
    - Store Inventory (stock levels, low-stock alerts)
    - Store Reports (daily/weekly/monthly)
    - Store Alerts

**People Tab:**
- Regional Headcount Overview
- Leave Calendar (region-wide)
  - Leave Request List → Approve / Reject
- Transfer Requests
  - Request Detail → Approve / Assign to Store
- Attendance Report (by store, by period)
- Staff Performance Summary

**Reports Tab:**
- Revenue Report (by store, by period)
- Attendance Report
- Inventory Report
- Staff Turnover Report
- Custom Report Builder (regional scope)
- Report Export (PDF / CSV)

**Approvals Tab:**
- Pending Approvals
  - Leave requests
  - Overtime requests
  - Expense claims
  - Transfer requests
- Approval History

---

### 4. Bottom Sheets

| Bottom Sheet | Trigger | Content | Actions |
|-------------|---------|---------|---------|
| Store Quick View | Store tile tap | Revenue today, staff present, open alerts, top issue | Open Store / Message Manager |
| Leave Approval | Leave request tap | Employee name, dates, reason, cover arrangement | Approve / Reject / Request Cover |
| Transfer Approval | Transfer request | Employee, from store, to store, date, reason | Approve / Redirect / Reject |
| Regional Report | Report quick action | Period selector, store selector, metric selector | Generate / Schedule |
| Store Alert Detail | Alert feed item | Store, alert type, severity, recommendation | Acknowledge / Escalate to CEO |
| AI Insight Expand | AI zone tap | Full insight, affected store(s), recommendation | Act / Dismiss / Forward to Manager |

---

### 5. Dynamic Island

**Idle State:** {Region} · {N} stores · Revenue MTD: {amount}

**Alert State:** ⚠️ {N} store alerts · Tap to review

**Approval Pending:** ✅ {N} pending approvals

**Expanded State:** Revenue vs target / Best store / Alert count / Approvals count

---

### 6. Widgets

**Lock Screen:** Regional revenue MTD · Store alert count

**Home Screen:** Revenue MTD / Store performance grid (mini) / Pending approvals

**Dashboard Widgets:**
- Store Performance Grid
- Regional Revenue Trend
- Attendance Rate by Store
- Leave Calendar
- Transfer Pipeline
- AI Performance Signals
- Regional Headcount Chart

---

### 7. Notifications

| Event | Title | Body | Priority | Channels |
|-------|-------|------|----------|---------|
| Store revenue drop | 📉 Revenue Drop | {store} revenue is {N}% below target today. | High | Push + In-App |
| Store attendance critical | 🚨 Staff Shortage | {store} has only {N}% staff present. | High | Push + SMS |
| Leave request submitted | 🏖️ Leave Request | {name} at {store} requests leave: {dates}. | Normal | In-App |
| Transfer request | 🔄 Transfer Request | {name} transfer request from {store A} to {store B}. | Normal | Push + In-App |
| Inventory alert (region) | 📦 Stock Alert | {product} at {store} below reorder point. | Normal | In-App |
| Regional target achieved | 🎯 Region Target | {region} hit monthly revenue target! | Normal | In-App |
| Store critical event | 🚨 Store Alert | Critical event at {store}: {description} | Critical | Push + SMS |

---

---

## Role 07 — Store Manager

**Scope Level:** 4 — Store (one store and all its sub-entities)
**Description:** Manages a single store. Primary mobile user — needs fast task completion. Responsible for daily operations: sales, staff, schedule, inventory, cash register, and customer orders.

---

### 1. Navigation

| Tab | Icon | Name | Primary Content |
|-----|------|------|----------------|
| 1 | ◎ | Command | Store dashboard, today's KPIs |
| 2 | 🛒 | Shop | Today's orders, POS sessions, pending fulfillment |
| 3 | 👥 | Team | Staff schedule, attendance, leave requests |
| 4 | 📦 | Inventory | Stock levels, receiving, low-stock alerts |
| 5 | ✅ | Approvals | Staff requests, discount approvals |

---

### 2. Dashboard

**Header Zone:** {Store Name} · Store Manager · {Date} · Open/Closed indicator

**KPI Zone:**
- Revenue Today (vs target)
- Revenue MTD
- Transactions Today
- Staff Present / Total Scheduled
- Low-Stock Items Count
- Cash Register Status (open sessions)

**Primary Zone:**
- Sales Chart (today by hour)
- Top Selling Products Today

**Secondary Zone:**
- Staff Schedule (today's timeline)
- Pending Fulfillment Orders

**Activity Zone:**
- Recent Transactions Feed
- Recent Staff Events (clock-ins, issues)

**AI Zone:**
- Reorder Suggestions
- Staffing Recommendations for Tomorrow

**Quick Actions Zone:**
- Open Register / Close Register
- Add Inventory Received
- Approve Leave Request
- Process Return

---

### 3. Screens

**Command Tab:** Store Dashboard → Hourly Revenue Detail → Comparison to last week

**Shop Tab:**
- Today's Orders (list)
  - Order Detail → Fulfill / Issue Invoice / Refund
- POS Sessions
  - Active Sessions → Session Detail → Close Session
- Order History (search, filter)
- Returns & Refunds List → Process Return

**Team Tab:**
- Today's Schedule (visual timeline)
  - Schedule Edit → Add Shift / Move Shift
- Attendance Log (today)
  - Clock-in/out manual override
- Staff List
  - Staff Profile → Attendance History / Leave Requests
- Leave Requests
  - Request Detail → Approve / Reject
- Overtime Requests
- Staff Performance (attendance rate, task completion)

**Inventory Tab:**
- Stock Overview (all products, current levels)
  - Product Inventory Detail → Adjustment / Stock Count
- Low-Stock List (below reorder point)
- Receive Goods → Record Delivery
- Stock Count → Count Entry → Submit
- Inventory Movement History

**Approvals Tab:**
- Leave Requests
- Overtime Requests
- Discount Approvals (over threshold)
- Expense Claims

---

### 4. Bottom Sheets

| Bottom Sheet | Trigger | Content | Actions |
|-------------|---------|---------|---------|
| Open Register | Quick action | Register selector, opening float entry | Open Session |
| Close Register | Register action | Sales summary, cash count, discrepancy field | Close Session |
| Receive Goods | Inventory action | Supplier, PO reference, line-item entry | Confirm Receipt |
| Approve Leave | Leave tap | Employee, dates, reason, coverage status | Approve / Reject |
| Process Return | Shop action | Order selector, reason, refund amount | Process |
| Stock Adjustment | Inventory item tap | Current count, new count, reason | Submit Adjustment |
| Shift Assignment | Schedule cell tap | Employee selector, time picker | Assign |
| Order Fulfill | Order tap | Line items checklist, delivery method | Mark Fulfilled |
| Discount Override | Discount alert | Original price, discount %, reason field | Approve / Reject |

---

### 5. Dynamic Island

**Idle State:** {Store} · Revenue today: {amount}

**Open Register Active:** 🛒 Register Open · {N} transactions · {amount}

**Alert State:** ⚠️ {N} alerts (stock / staff)

**Expanded State:** Revenue today vs target / Staff present / Low-stock count / Active registers

---

### 6. Widgets

**Lock Screen:** Revenue today · Open alerts

**Home Screen:** Revenue today vs target / Staff present count / Low-stock items / Register status

**Dashboard Widgets:**
- Hourly Revenue Chart
- Staff Schedule Today
- Top Products Today
- Low-Stock List
- POS Sessions Summary
- Leave Calendar (store)
- Inventory Movement Feed

---

### 7. Notifications

| Event | Title | Body | Priority | Channels |
|-------|-------|------|----------|---------|
| Staff member late | ⏰ Late Arrival | {name} has not clocked in (shift started {N} min ago). | High | Push + In-App |
| Stock below reorder | 📦 Low Stock | {product} has {N} units left (reorder point: {reorder}). | Normal | Push + In-App |
| Large transaction | 💳 Large Sale | Order #{N} placed for {amount} — above threshold. | Normal | In-App |
| Register not closed | 🛒 Register Alert | Register #{N} has been open for {N} hours. | High | Push |
| Discount approval needed | 💰 Discount Needed | {cashier} requested {N}% discount on order #{N}. | Normal | Push + In-App |
| Leave request | 🏖️ Leave Request | {name} requests leave: {dates}. | Normal | In-App |
| Daily sales summary | 📊 Daily Summary | Revenue: {amount} ({vs_target}) · Transactions: {N} | Low | In-App |
| POS session error | ⚠️ POS Error | Register #{N} encountered an error: {message}. | High | Push |

---

---

## Role 08 — Shop Director

**Scope Level:** 4+ — All stores, shop-focused (company-wide shop operations)
**Description:** Company-wide head of retail/shop operations. Manages product catalog, pricing, all store performance, stock levels across all locations, discount policies, and shop analytics.

---

### 1. Navigation

| Tab | Icon | Name | Primary Content |
|-----|------|------|----------------|
| 1 | ◎ | Command | Shop-wide dashboard, revenue by store |
| 2 | 🛍️ | Products | Product catalog, pricing, categories |
| 3 | 🛒 | Orders | All orders, fulfillment pipeline |
| 4 | 📦 | Inventory | Multi-location stock, transfers, purchasing |
| 5 | 📊 | Analytics | Shop analytics, product performance, trends |

---

### 2. Dashboard

**Header Zone:** Shop Operations · Shop Director · {N} stores · {Date}

**KPI Zone:**
- Total Shop Revenue MTD (all stores)
- Revenue vs Target (%)
- Total Transactions MTD
- Average Order Value
- Stock-Out Incidents MTD
- Return Rate (%)

**Primary Zone:**
- Revenue by Store (bar chart)
- Top 10 Products by Revenue

**Secondary Zone:**
- Fulfillment Pipeline (pending / in-progress / shipped)
- Discount Usage Summary

**Activity Zone:**
- Recent Large Orders
- Product Price Changes

**AI Zone:**
- Demand Forecast by Product
- Pricing Optimization Suggestions
- Inventory Reorder Alerts (cross-company)

**Quick Actions Zone:**
- Update Product Price
- Create Discount Code
- Transfer Stock Between Stores
- Generate Sales Report

---

### 3. Screens

**Command Tab:** Shop Dashboard → Revenue Detail (by store, by period)

**Products Tab:**
- Product List (search, filter by category, status)
  - Product Detail
    - General Info
    - Variants Management
    - Pricing (base price, tier pricing)
    - Inventory Summary (by location)
    - Sales History
    - Images
  - Create Product → New Product Form
  - Category Management
    - Category Tree → Add / Edit / Archive
  - Discount Codes
    - Code List → Create / Edit / Deactivate
    - Discount Approval Queue (high-value discounts)

**Orders Tab:**
- All Orders (search, filter by store, status, date)
  - Order Detail → Edit / Fulfill / Invoice / Refund
- Fulfillment Pipeline (Kanban: Pending → Processing → Shipped → Delivered)
- Returns Queue → Return Detail → Process
- Order Analytics

**Inventory Tab:**
- Multi-Location Stock Overview
  - Product → Stock by Location
  - Location → All Products at Location
- Stock Transfer
  - Transfer Request → From / To / Product / Qty
  - Transfer History
- Purchase Requests (to procurement)
- Inventory Count (scheduled or ad-hoc)
- Low-Stock Alerts (all stores)
- Inventory Movement History (all locations)

**Analytics Tab:**
- Revenue Analytics (by store, product, category, period)
- Product Performance (best/worst sellers, margin)
- Customer Purchase Patterns
- Discount Impact Analysis
- Inventory Turnover
- Returns Analysis
- Custom Report Builder (shop scope)

---

### 4. Bottom Sheets

| Bottom Sheet | Trigger | Content | Actions |
|-------------|---------|---------|---------|
| Price Update | Product detail action | Product name, current price, new price, effective date, apply to variants | Save |
| Discount Code Create | Quick action | Code string, type, value, conditions, expiry | Create |
| Stock Transfer | Inventory action | From location, to location, product, quantity, reason | Submit |
| Order Status Update | Order tap | Current status, new status selector, note | Update |
| Process Return | Return tap | Reason, amount, restock Y/N, credit/refund | Process |
| Bulk Price Update | Products list action | Category selector, % change, product list, preview | Apply |
| AI Pricing Suggestion | AI zone tap | Product, current price, suggested price, demand data | Accept / Dismiss |
| Sales Report | Quick action | Period, store, category selectors | Generate / Export |

---

### 5. Dynamic Island

**Idle State:** Shop · Revenue MTD: {amount} · {N} stores

**Alert State:** ⚠️ {N} stock-out alerts · Tap to review

**Expanded State:** Revenue vs target / Top seller today / Stock-out count / Fulfillment pending

---

### 6. Widgets

**Lock Screen:** Shop Revenue MTD · Stock alerts

**Home Screen:** Revenue MTD / Top product today / Fulfillment pipeline / Stock alerts

**Dashboard Widgets:**
- Revenue by Store
- Product Performance Chart
- Inventory Health
- Fulfillment Pipeline
- Top 10 Products
- Discount Usage
- Return Rate Trend
- AI Demand Forecast

---

### 7. Notifications

| Event | Title | Body | Priority | Channels |
|-------|-------|------|----------|---------|
| Stock-out occurred | 🚨 Stock Out | {product} is out of stock at {location}. | High | Push + In-App |
| Large discount used | 💰 High Discount | {N}% discount used on order #{N} at {store}. | Normal | In-App |
| High-value order placed | 💳 Large Order | Order #{N} for {amount} placed at {store}. | Normal | In-App |
| Product review needed | ⭐ Review | {product} received {N} negative reviews this week. | Normal | In-App |
| Revenue milestone | 🎯 Milestone | Shop revenue reached {amount} this month. | Normal | In-App |
| Discount code created | 🏷️ New Code | {code} created by {name} — {N}% off, expires {date}. | Low | In-App |
| Daily shop summary | 📊 Summary | Revenue: {amount} · Orders: {N} · Returns: {N} | Low | In-App |
| Transfer completed | 📦 Transfer Done | {N} units of {product} transferred to {store}. | Low | In-App |

---

---

## Role 09 — Department Head

**Scope Level:** 3 — Department (their specific department only)
**Description:** Manages their department's team, budget, projects, and tasks. Typical departments: Renovations, Technical, Sales, Administration, Design.

---

### 1. Navigation

| Tab | Icon | Name | Primary Content |
|-----|------|------|----------------|
| 1 | ◎ | Command | Department dashboard, team status |
| 2 | 📋 | Projects | Department projects, tasks, progress |
| 3 | 👥 | Team | Team members, schedule, attendance |
| 4 | 💰 | Budget | Department budget vs actual |
| 5 | 📁 | Documents | Department documents, reports |

---

### 2. Dashboard

**Header Zone:** {Department Name} · Department Head · {Date}

**KPI Zone:**
- Team Members Present Today
- Department Budget Used (%)
- Active Projects Count
- Tasks Due This Week
- Overdue Tasks Count
- Open Approval Requests

**Primary Zone:**
- Task Board Summary (To Do / In Progress / Done)
- Department Budget Chart (by category)

**Secondary Zone:**
- Team Attendance Overview
- Project Progress Summary

**Activity Zone:**
- Recent Task Updates
- Recent Team Activity

**AI Zone:**
- Workload Balance Recommendations
- Deadline Risk Signals

**Quick Actions Zone:**
- Create Task
- Approve Leave Request
- Review Budget
- Create Project

---

### 3. Screens

**Command Tab:** Department Dashboard → KPI Detail

**Projects Tab:**
- Project List (department projects)
  - Project Detail
    - Overview
    - Tasks (Kanban / List view)
    - Team Assignment
    - Budget
    - Documents
  - Create Project
- Task Board (all tasks across all projects)
  - Task Detail → Edit / Assign / Comment
- Sprint Board (if using sprint methodology)

**Team Tab:**
- Team List
  - Member Profile (basic — not salary details)
    - Assigned Tasks
    - Attendance Summary
    - Leave History
- Schedule (weekly view)
  - Schedule Edit
- Leave Requests → Approve / Reject
- Attendance Log
- Overtime Requests

**Budget Tab:**
- Budget Overview (total allocated vs spent)
  - By Category breakdown
  - Monthly chart
- Expense Claims (department)
  - Claim Detail → Approve / Reject
- Budget Request (request additional budget)
  - Request Form → Submit to Finance

**Documents Tab:**
- Department Folder Structure
  - Document List → Document Detail → View / Download
- Upload Document
- Shared Documents (from CEO/HR)
- Document Templates

---

### 4. Bottom Sheets

| Bottom Sheet | Trigger | Content | Actions |
|-------------|---------|---------|---------|
| Create Task | Quick action | Title, description, assignee, due date, priority, project | Create |
| Task Detail | Task card tap | Full details, assignee, status, comments | Edit / Complete / Reassign |
| Leave Approval | Leave request | Employee name, dates, reason, coverage check | Approve / Reject |
| Budget Request | Budget action | Amount, justification, category, urgency | Submit to Finance |
| Project Create | Quick action | Title, type, description, team members, budget | Create |
| AI Workload | AI zone tap | Team workload map, bottlenecks, recommendations | Apply Suggestion / Dismiss |
| Document Upload | Documents tab | File picker, folder selector, description | Upload |

---

### 5. Dynamic Island

**Idle State:** {Department} · {N} active tasks

**Deadline Alert:** ⚠️ {N} tasks due today

**Expanded State:** Tasks due today / Team present / Budget used / Approvals pending

---

### 6. Widgets

**Lock Screen:** Tasks due today · Team present

**Home Screen:** Active tasks / Team attendance / Budget used% / Due this week

**Dashboard Widgets:**
- Task Board Summary
- Team Attendance
- Budget Gauge
- Project Progress
- Workload Balance
- Upcoming Deadlines Calendar
- AI Recommendations

---

### 7. Notifications

| Event | Title | Body | Priority | Channels |
|-------|-------|------|----------|---------|
| Task overdue | ⏰ Task Overdue | "{task}" assigned to {name} is {N} days overdue. | High | Push + In-App |
| Leave request | 🏖️ Leave Request | {name} requests leave: {dates}. | Normal | In-App |
| Budget threshold | 💰 Budget Alert | {department} has used {N}% of budget. | High | Push + In-App |
| Project milestone | 🏁 Milestone | Project "{name}" reached milestone: {description}. | Normal | In-App |
| New task assigned | 📋 Task Assigned | You have a new task: "{title}" due {date}. | Normal | Push + In-App |
| Expense claim | 🧾 Expense Claim | {name} submitted an expense claim for {amount}. | Normal | In-App |
| AI recommendation | 🤖 Workload Alert | {name} is overloaded. Consider rebalancing tasks. | Normal | In-App |

---

---

## Role 10 — HR Manager

**Scope Level:** 3 — HR domain, company-wide people data
**Description:** Manages the full employee lifecycle: hiring, onboarding, contracts, attendance, payroll coordination, performance reviews, and organizational structure. Sees all people data but not financial P&L.

---

### 1. Navigation

| Tab | Icon | Name | Primary Content |
|-----|------|------|----------------|
| 1 | ◎ | Command | HR dashboard, headcount, attendance overview |
| 2 | 👥 | People | All employees, org chart, positions |
| 3 | 📅 | Attendance | Company-wide attendance, leave, schedules |
| 4 | 💰 | Payroll | Payroll runs, payslips, salary management |
| 5 | 📁 | Documents | HR documents, contracts, policies |

---

### 2. Dashboard

**Header Zone:** HR Management · {Company} · {Date}

**KPI Zone:**
- Total Employees (active)
- New Hires This Month
- Departures This Month
- Company Attendance Rate (today)
- Pending Leave Requests
- Contracts Expiring (next 30 days)
- Payroll Run Status

**Primary Zone:**
- Headcount by Department (bar chart)
- Monthly Headcount Trend (new hires vs departures)

**Secondary Zone:**
- Leave Calendar (company-wide, today's absences)
- Upcoming Contract Expirations

**Activity Zone:**
- Recent HR Events (onboarding, offboarding, contract changes)
- Pending Approval Queue

**AI Zone:**
- Turnover Risk Signals (employees showing disengagement patterns)
- Hiring Demand Predictions
- Attendance Anomaly Alerts

**Quick Actions Zone:**
- Add New Employee
- Start Payroll Run
- Approve Leave Batch
- Generate HR Report

---

### 3. Screens

**Command Tab:** HR Dashboard → Metric Detail

**People Tab:**
- Employee List (all employees, search/filter)
  - Employee Detail
    - Personal Information
    - Contract Details (view / create new / terminate)
    - Position & Department
    - Attendance Summary
    - Leave History
    - Payroll History (amounts, not visible to managers outside HR)
    - Performance Reviews
    - Onboarding Checklist
    - Offboarding Checklist
    - Documents (contracts, ID, certificates)
    - Notes (HR only)
- Create Employee → Onboarding Wizard
  - Personal details
  - Position assignment
  - Contract creation
  - Account creation (user account)
  - Documents upload
  - Onboarding task assignment
- Org Chart (visual, editable)
  - Position Detail → Edit / Move / Terminate
- Position Management
  - Position List → Create / Edit
  - Open Positions (vacant)
- Departments Overview → Edit Structure

**Attendance Tab:**
- Company-Wide Attendance (today)
  - Department filter
  - Employee drill-down → Attendance Detail
- Leave Management
  - All Leave Requests → Approve / Reject (can approve all)
  - Leave Balances by Employee
  - Leave Calendar (monthly view, all employees)
  - Leave Type Management (create / edit leave types)
- Schedule Management
  - Company-wide schedule view
  - Bulk Schedule Assignment
  - Schedule Templates
- Overtime Management
  - Overtime Request List → Approve
  - Overtime Report

**Payroll Tab:**
- Payroll Runs
  - Run List (history, status)
  - Create Payroll Run
    - Period selection
    - Employee inclusion
    - Payslip preview
    - Deductions & additions
    - Submit for approval
  - Run Detail → Payslips List → Individual Payslip
- Salary Management
  - Employee Salary List
  - Salary Review → Propose Change → Submit for Approval
- Payroll Reports
  - Summary by period
  - Cost by department
  - Export for accounting

**Documents Tab:**
- HR Document Folders
  - Policies
  - Contracts (all employees)
  - Certificates & Licenses
  - Performance Reviews
- Contract Templates (create / edit)
- Policy Management (publish / version)
- Document Expiry Tracker (licenses, certifications)

---

### 4. Bottom Sheets

| Bottom Sheet | Trigger | Content | Actions |
|-------------|---------|---------|---------|
| New Employee | Quick action | Personal info, position, department, start date, contract type | Begin Onboarding |
| Contract Creation | Employee detail action | Contract type, start/end date, salary, probation period | Create |
| Leave Approval | Leave request | Employee, dates, type, remaining balance, team coverage | Approve / Reject / Request Change |
| Payroll Run Start | Quick action | Period selector, employee scope, include/exclude selector | Start Run |
| Payslip Preview | Payroll run action | Employee name, gross, deductions, net, breakdown | Approve / Edit |
| Salary Change | Salary management | Employee, current salary, new salary, effective date, reason | Submit for CEO Approval |
| Offboarding Start | Employee action | Last day, reason (resigned / terminated / retired), checklist | Begin Offboarding |
| Performance Review | Employee detail | Review period, criteria list, rating scale, comments | Save Draft / Submit |
| Bulk Leave Approve | Leave list action | Selected requests (checkboxes), batch approve preview | Approve Selected |
| HR Report | Quick action | Report type, period, department scope | Generate / Export |
| Position Edit | Org chart tap | Title, department, level, salary band, reporting to | Save |

---

### 5. Dynamic Island

**Idle State:** HR · {N} employees · {attendance_rate}% present

**Payroll Alert:** 💰 Payroll run in progress · {N}% complete

**Contract Expiry:** ⚠️ {N} contracts expiring soon · Tap to review

**Expanded State:** Headcount / Attendance rate / Pending leave / Payroll status

---

### 6. Widgets

**Lock Screen:** Attendance rate today · Pending leave requests

**Home Screen:** Headcount / New hires this month / Attendance today / Pending leave count

**Dashboard Widgets:**
- Headcount by Department
- Monthly Hire/Departure Chart
- Attendance Rate Trend
- Leave Calendar (company)
- Contract Expiry Timeline
- Payroll Status
- Turnover Rate Chart
- Onboarding Pipeline
- Performance Review Due

---

### 7. Notifications

| Event | Title | Body | Priority | Channels |
|-------|-------|------|----------|---------|
| Contract expiring | ⚠️ Contract Expiry | {name}'s contract expires in {N} days. | High | Push + Email |
| New hire onboarding | 👋 New Employee | {name} starts on {date}. Onboarding checklist pending. | Normal | In-App |
| Leave request submitted | 🏖️ Leave Request | {name} ({department}) requests leave: {dates}. | Normal | In-App |
| Payroll run approval | 💰 Payroll Ready | {month} payroll ({amount}) is ready for CEO approval. | High | Push + In-App |
| Attendance anomaly | ⚠️ Attendance Alert | {department} attendance below {N}% today. | High | Push + In-App |
| Employee resignation | 📤 Resignation | {name} has submitted their resignation. Last day: {date}. | High | Push + Email |
| AI turnover signal | 🤖 HR Insight | {N} employees show early disengagement signals. | Normal | In-App |
| Certificate expiry | 📋 Cert Expiry | {name}'s {certification} expires in {N} days. | High | In-App + Email |
| Performance review due | ⭐ Review Due | {N} performance reviews are due by {date}. | Normal | In-App |

---

---

## Role 11 — Finance Manager

**Scope Level:** 3 — Finance domain, company-wide financial data
**Description:** Manages invoicing, payments, expense approvals, budget tracking, P&L reporting, and financial compliance. Sees all financial data but not HR sensitive personal data.

---

### 1. Navigation

| Tab | Icon | Name | Primary Content |
|-----|------|------|----------------|
| 1 | ◎ | Command | Finance dashboard, AR/AP, cash position |
| 2 | 🧾 | Invoices | Outgoing invoices, e-Factura, drafts |
| 3 | 💳 | Payments | Incoming payments, AP, supplier invoices |
| 4 | 📊 | Budgets | Budget vs actual, expense approvals |
| 5 | 📋 | Reports | P&L, cash flow, tax, export |

---

### 2. Dashboard

**Header Zone:** Finance · {Company} · {Date}

**KPI Zone:**
- Revenue MTD
- Expenses MTD
- Net Profit MTD
- Cash Position (approximation)
- Outstanding AR (total + overdue)
- Outstanding AP (total + due this week)
- VAT Period Status

**Primary Zone:**
- Revenue vs Expense Chart (last 12 months)
- AR Aging Buckets (0-30 / 31-60 / 61-90 / 90+ days)

**Secondary Zone:**
- Invoices Due This Week (to collect)
- Supplier Payments Due This Week (to pay)

**Activity Zone:**
- Recent Transactions (invoices issued, payments received)
- Recent Approvals (expense claims)

**AI Zone:**
- Cash Flow Forecast (30 / 60 / 90 days)
- Late Payment Risk Signals
- Budget Overrun Predictions

**Quick Actions Zone:**
- Create Invoice
- Record Payment
- Approve Expense Claims
- Generate P&L Report

---

### 3. Screens

**Command Tab:** Finance Dashboard → KPI Drill-Down

**Invoices Tab:**
- Invoice List (filter by status, client, date, amount)
  - Invoice Detail
    - Line items
    - Payment history
    - e-Factura status
    - Client contact
    - Documents
    - Send / Resend
    - Mark Paid
    - Create Credit Note
  - Create Invoice
    - Client selector
    - Line item entry
    - Tax calculation
    - Preview PDF
    - Submit for Approval (if required)
    - Send to Client
  - Invoice Templates
  - e-Factura Dashboard (ANAF integration status)
    - Submitted invoices
    - ANAF response status
    - Rejected invoices → resubmit

**Payments Tab:**
- Incoming Payments List
  - Payment Detail → View Allocations
  - Record Payment → Client / Amount / Method / Reference
  - Payment Allocation → Assign to Invoice(s)
- Supplier Invoices (AP)
  - Supplier Invoice List → Detail → Match to PO → Approve → Schedule Payment
  - AP Aging Report
  - Payment Schedule Calendar
- Expense Claims
  - Pending Claims → Detail → Approve / Reject
  - Expense Report by Period

**Budgets Tab:**
- Budget List (all active budgets)
  - Budget Detail
    - Allocated vs spent vs committed
    - By category breakdown
    - Monthly chart
    - Edit Budget (if draft/active)
  - Create Budget → Period / Department / Amount / Categories
  - Budget Approval Queue
    - Budget requests from departments
    - Approve / Reject / Modify
- Cost Center Report
  - Revenue and costs by cost center

**Reports Tab:**
- P&L Statement
  - Period selector (month / quarter / year)
  - Revenue breakdown
  - Expense breakdown
  - Net profit
  - Year-over-year comparison
  - Export to PDF / Excel
- Cash Flow Report
  - Inflows vs outflows
  - 90-day forecast
- Tax Report
  - VAT periods
  - VAT summary by period
  - Export for tax accountant
- Custom Report Builder
  - Metric, dimension, period, chart
  - Save / Schedule / Export
- Aged AR Report
- Aged AP Report

---

### 4. Bottom Sheets

| Bottom Sheet | Trigger | Content | Actions |
|-------------|---------|---------|---------|
| Create Invoice | Quick action | Client, items, tax, payment terms | Create Draft / Save & Send |
| Record Payment | Quick action | Client, amount, method, reference, date | Record / Allocate to Invoice |
| Invoice Send | Invoice detail action | Client email preview, attachment, send note | Send / Schedule |
| Expense Approval | Expense claim tap | Employee, items, total, receipts | Approve / Reject / Partial Approve |
| Budget Approve | Budget queue tap | Department, amount, justification, current spend | Approve / Reject / Reduce Amount |
| Allocate Payment | Payment detail | Invoice list, allocated amounts, unallocated balance | Save Allocation |
| Generate P&L | Quick action | Period selector, comparison period | Generate / Export |
| AI Cash Flow | AI zone tap | 90-day forecast, assumptions, risk factors | View Detail / Export |
| Credit Note | Invoice action | Original invoice, reason, amount, lines | Create Credit Note |
| e-Factura Resubmit | ANAF error tap | Error reason, corrected data preview | Resubmit |
| Payment Schedule | AP action | Supplier, due invoices, proposed payment dates | Confirm Schedule |

---

### 5. Dynamic Island

**Idle State:** Finance · AR: {amount} · AP: {amount}

**Overdue Alert:** ⚠️ {N} overdue invoices · {amount} at risk

**Expense Queue:** ✅ {N} expense claims pending · Tap to review

**Expanded State:** AR total / AP due this week / Cash position / Pending approvals

---

### 6. Widgets

**Lock Screen:** Outstanding AR · AP due this week

**Home Screen:** Revenue MTD / AR Overdue / AP Due This Week / Cash Position

**Dashboard Widgets:**
- AR Aging Buckets
- Revenue vs Expense Chart
- Cash Flow Forecast
- Invoice Status Pipeline
- AP Payment Calendar
- Budget vs Actual
- Expense Claims Queue
- VAT Period Status
- AI Late Payment Signals
- P&L Summary Card

---

### 7. Notifications

| Event | Title | Body | Priority | Channels |
|-------|-------|------|----------|---------|
| Invoice payment received | 💳 Payment Received | {client} paid {amount} on invoice #{N}. | Normal | Push + In-App |
| Invoice overdue | ⚠️ Invoice Overdue | Invoice #{N} ({client}) is {N} days overdue ({amount}). | High | Push + Email |
| Expense claim submitted | 🧾 Expense Claim | {name} submitted claim for {amount}. | Normal | In-App |
| Budget overrun | 📊 Budget Alert | {department} exceeded budget by {amount} ({N}%). | High | Push + In-App |
| AP payment due | 💸 Payment Due | {supplier} invoice of {amount} is due in {N} days. | High | Push + In-App |
| e-Factura rejected | 📋 ANAF Error | Invoice #{N} was rejected by ANAF: {reason}. | Critical | Push + Email |
| Cash flow risk | 🤖 Cash Alert | Projected cash deficit of {amount} in {N} days. | High | Push + In-App |
| Large payment received | 💰 Large Payment | {client} paid {amount}. Cash position updated. | Normal | In-App |
| Payroll cost spike | 💰 Payroll Cost | Payroll cost increased {N}% vs last period. | Normal | In-App |
| Monthly close reminder | 📅 Month Close | {month} financial close due in {N} days. | Normal | In-App |

---

*End of Part 2 — Continues in UI_SITEMAP_PART3.md*

*Part 3 covers: Project Manager · Team Lead · Field Supervisor · Worker · Cashier · Procurement Officer*
