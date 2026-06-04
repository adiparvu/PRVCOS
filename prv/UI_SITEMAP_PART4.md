# PRV — UI Sitemap Part 4
**Version:** 1.0
**Status:** APPROVED ARCHITECTURE
**Date:** 2026-06-03
**Roles Covered:** Fleet Manager · Client Portal · Supplier Portal
**Reference Sections:** Master Screen Index · Global Bottom Sheet Catalog · Dynamic Island Matrix · Notification Matrix · Widget Catalog · Deep Link Map

---

## Role 18 — Fleet Manager

**Scope Level:** 3 — Fleet domain, company-wide
**Description:** Manages all company vehicles and drivers. Tracks vehicle status, driver assignments, maintenance schedules, fuel costs, legal compliance (ITP, insurance, vignette), and GPS positions. Coordinates with project managers for site vehicle allocation.

---

### 1. Navigation

| Tab | Icon | Name | Primary Content |
|-----|------|------|----------------|
| 1 | ◎ | Command | Fleet dashboard, vehicle status grid |
| 2 | 🚗 | Vehicles | Vehicle registry, assignments, tracking |
| 3 | 👨‍✈️ | Drivers | Driver assignments, trip logs, fuel |
| 4 | 🔧 | Maintenance | Service schedule, history, compliance |
| 5 | 📊 | Reports | Fuel costs, utilization, compliance calendar |

---

### 2. Dashboard

**Header Zone:** Fleet Management · {Company} · {N} Vehicles · {Date}

**KPI Zone:**
- Vehicles Available
- Vehicles Assigned (to drivers / projects)
- Vehicles In Maintenance
- Compliance Issues (ITP / insurance / vignette expiring ≤ 30 days)
- Fleet Fuel Cost MTD
- Total KM Driven MTD

**Primary Zone:**
- Vehicle Status Grid (each vehicle: plate, driver, status, GPS location indicator)
- Compliance Calendar (next 30 days: expirations per vehicle)

**Secondary Zone:**
- Maintenance Due This Week
- Fuel Log (last 5 entries, any vehicle)

**Activity Zone:**
- Recent Vehicle Events (assigned / returned / fueled / serviced)
- Active Trips (in-progress)

**AI Zone:**
- Predictive Maintenance Alerts (based on mileage/date patterns)
- Fuel Efficiency Anomalies (vehicle consuming more than usual)
- Driver Behavior Signals

**Quick Actions Zone:**
- Assign Vehicle
- Log Fuel
- Schedule Maintenance
- Log Trip

---

### 3. Screens

**Command Tab:** Fleet Dashboard → Vehicle Status Detail

**Vehicles Tab:**
- Vehicle List (search by plate, model, status)
  - Vehicle Detail
    - Profile (plate, make/model, year, fuel type, VIN)
    - Current Status & Assignment
    - GPS Last Known Location
    - Assignment History
    - Trip History
    - Maintenance History
    - Fuel Log History
    - Legal Documents (insurance, ITP, registration, vignette)
      - Document Detail → View / Replace
    - Compliance Status (expiry dates, traffic-light)
    - Edit Vehicle Profile
  - Add Vehicle → Registration Form
  - Assign Vehicle
    - Vehicle selector
    - Driver or project assignment
    - Start odometer, expected return
- Vehicle Comparison (2 vehicles side-by-side: cost, utilization)

**Drivers Tab:**
- Driver List (employees with vehicle assignment access)
  - Driver Detail
    - Active assignment
    - Trip history (all trips driven)
    - Fuel logs (submitted by this driver)
    - Driving license details / expiry
  - Driver License Expiry Tracker
- Active Trips (in-progress today)
  - Trip Detail → Vehicle, driver, route summary, current odometer
- Trip History (all vehicles, all drivers)
  - Filter: vehicle / driver / purpose / date
  - Trip Detail
- Fuel Logs (all vehicles)
  - Fuel Log List → Detail
  - Log Fuel Entry

**Maintenance Tab:**
- Maintenance Schedule (calendar view: scheduled services per vehicle)
  - Service Detail → Mark Complete / Reschedule
- Create Maintenance Record
  - Vehicle, type, date, description, provider, cost
- Maintenance History (all vehicles)
- Service Reminders
  - Based on mileage triggers
  - Based on date triggers
- External Service Providers
  - Provider list → contact, history

**Reports Tab:**
- Fleet Utilization Report (km driven, % time assigned, per vehicle)
- Fuel Cost Report (by vehicle, by driver, by period)
- Maintenance Cost Report
- Compliance Expiry Report (what needs renewal, when)
- Driver Activity Report
- Trip Purpose Breakdown (project / client / procurement / personal)
- Custom Report Builder (fleet scope)
- Export Reports (PDF / CSV)

---

### 4. Bottom Sheets

| Bottom Sheet | Trigger | Content | Actions |
|-------------|---------|---------|---------|
| Assign Vehicle | Quick action / vehicle action | Vehicle selector, driver selector or project, start odometer, expected return | Assign |
| Return Vehicle | Assignment action | Vehicle, driver, end odometer, condition on return, notes | Record Return |
| Log Fuel | Quick action | Vehicle selector, date, odometer, liters, price/liter, total, fuel station, receipt upload | Save Log |
| Schedule Service | Maintenance action | Vehicle, service type, scheduled date, provider, notes | Schedule |
| Complete Service | Scheduled service tap | Completed date, odometer, description, parts replaced, cost, next service info | Mark Complete |
| Log Trip | Quick action | Vehicle, driver, purpose, start/end location, start odometer | Create Trip |
| Compliance Alert | Compliance widget | Vehicle, document type, expiry date, action required | Renew Now / Schedule Renewal |
| Add Vehicle | Vehicles tab | Registration form: plate, VIN, make, model, year, fuel type, purchase date/price | Save |
| Upload Legal Doc | Vehicle detail | Document type, issue date, expiry, file upload | Upload |
| AI Maintenance Alert | AI zone tap | Vehicle, signal type (mileage / date), recommendation | Schedule Service / Dismiss |

---

### 5. Dynamic Island

**Idle State:** Fleet · {N} available · {N} assigned · {N} compliance issues

**Active Trip:** 🚗 {plate} · {driver} · Active Trip · {km} km

**Compliance Alert:** ⚠️ {vehicle} {doc_type} expires in {N} days

**Expanded State:** Available vehicles / Active trips / Compliance issues / Maintenance due

---

### 6. Widgets

**Lock Screen:** Vehicles available · Compliance issues count

**Home Screen:** Fleet status (available/assigned/maintenance) / Active trips / Compliance alerts

**Dashboard Widgets:**
- Vehicle Status Grid
- Compliance Calendar
- Fuel Cost Chart
- Utilization Rate per Vehicle
- Maintenance Due List
- Active Trips Map (if GPS integrated)
- AI Maintenance Predictions
- Driver Activity Summary

---

### 7. Notifications

| Event | Title | Body | Priority | Channels |
|-------|-------|------|----------|---------|
| Compliance document expiring | ⚠️ Expiry Warning | {vehicle} {doc_type} expires in {N} days. | High | Push + Email |
| Compliance document expired | 🚨 Expired | {vehicle} {doc_type} has expired. Vehicle grounded. | Critical | Push + SMS + Email |
| Maintenance due | 🔧 Service Due | {vehicle} is due for service (Km: {odometer} / Date: {date}). | High | Push + In-App |
| Vehicle assigned | 🚗 Assigned | {vehicle} assigned to {driver} for {purpose}. | Low | In-App |
| Vehicle returned | ✅ Returned | {vehicle} returned by {driver}. Odometer: {km}. | Low | In-App |
| Fuel anomaly | ⚠️ Fuel Alert | {vehicle} fuel consumption {N}% above average this month. | Normal | In-App |
| Trip not closed | ⏰ Open Trip | Trip for {vehicle} by {driver} has been open {N} hours. | High | Push |
| Driver license expiring | 🪪 License Expiry | {driver}'s driving license expires in {N} days. | High | In-App + Email |

---

---

## Role 19 — Client Portal User

**Scope Level:** External (authenticated client — renovation client or B2B customer)
**Description:** An authenticated renovation client or B2B customer. Views their renovation project progress, site photos, phase sign-offs, documents, invoices, and communicates with their assigned team. Read-heavy experience designed for trust and transparency.

---

### 1. Navigation

| Tab | Icon | Name | Primary Content |
|-----|------|------|----------------|
| 1 | 🏠 | Home | Welcome, active projects, recent updates |
| 2 | 🏗️ | My Projects | All projects (renovation + orders) |
| 3 | 📁 | Documents | Contracts, estimates, invoices, photos |
| 4 | 💰 | Invoices | My invoices, payment status |
| 5 | 💬 | Messages | Communication with team |

---

### 2. Dashboard

**Header Zone:** Welcome, {Client Name} · {Date}

**KPI Zone (client-visible):**
- Active Projects Count
- Next Milestone (upcoming phase or event)
- Outstanding Invoice Amount
- Unread Messages
- Documents Pending Signature

**Primary Zone:**
- Active Project Progress Cards (one per project, phase timeline)
- Latest Site Photos (thumbnail grid from daily reports)

**Secondary Zone:**
- Recent Documents
- Upcoming Payments

**Activity Zone:**
- Project Activity Feed (public events: phase started, milestone, photos added)
- Team Updates

**Quick Actions Zone:**
- View Active Project
- View & Sign Documents
- Pay Invoice
- Message Team

---

### 3. Screens

**Home Tab:** Client Welcome Dashboard

**My Projects Tab:**
- Project List (all client's projects)
  - Project Detail
    - Project Overview (timeline, current phase, % complete)
    - Phase Timeline (visual: phases with dates and status)
    - Current Phase Detail
      - Work description
      - Tasks completed (visible summary, not internal detail)
      - Photos from site reports (approved for client viewing)
    - Site Photos Gallery (all client-approved photos)
    - Team (project manager, supervisor — name & contact)
    - Estimate → Contract → Invoice (document chain)
    - Client Approval Center
      - Phase sign-off requests
      - Sign-off form with comment
      - Signature (digital)
  - Order History (shop orders if B2B)
    - Order Detail → Status / Tracking / Invoice

**Documents Tab:**
- Document List (documents marked client_visible = true)
  - Contracts (view / sign)
  - Estimates (view / accept / reject)
  - Invoices (view / download)
  - Site Photos (by project)
  - Progress Reports (approved for client)
- Document Viewer (full-screen)
- Digital Signature Flow
  - Review document
  - Draw or type signature
  - Confirm identity (email OTP)
  - Submit signed document

**Invoices Tab:**
- Invoice List (all invoices for this client)
  - Invoice Detail
    - Line items
    - Payment status
    - Payment instructions / bank details
    - Download PDF
  - Payment History
  - Outstanding Balance Summary

**Messages Tab:**
- Conversation with Project Manager
- Conversation with Team (if multiple projects)
- Message History (searchable)
- File Attachments (send/receive photos, docs)

---

### 4. Bottom Sheets

| Bottom Sheet | Trigger | Content | Actions |
|-------------|---------|---------|---------|
| Phase Sign-Off | Project detail | Phase summary, work completed, photos, signature area | Sign & Approve / Request Changes |
| Estimate Accept | Documents tab | Estimate summary, total, validity | Accept / Reject / Request Revision |
| Invoice Download | Invoice detail | PDF preview | Download / Share |
| Send Message | Messages tab | Composer, file attachment option | Send |
| Photo Expand | Gallery tap | Full-screen photo, date, caption | Download / Share |
| Payment Instructions | Invoice action | Bank details, reference number | Copy Details |
| Quote Request | Home quick action | Project description, contact preference | Submit Request |

---

### 5. Dynamic Island

**Idle State:** My Project · Phase {N} · {progress}%

**Signature Required:** ✍️ Signature required · Tap to sign

**New Message:** 💬 Message from {team_member} · Tap to read

**Expanded State:** Project progress / Pending signature / Unread messages / Next milestone

---

### 6. Widgets

**Lock Screen:** Project progress % · Pending signature indicator

**Home Screen:** Active project progress / Upcoming milestone / Unread messages / Outstanding invoice

**Dashboard Widgets:**
- Project Progress Timeline
- Site Photos Feed
- Document Inbox
- Invoice Status
- Messages Feed
- Milestone Calendar

---

### 7. Notifications

| Event | Title | Body | Priority | Channels |
|-------|-------|------|----------|---------|
| Phase completed | 🏗️ Phase Done | Phase {N} of your project is complete. Your approval needed. | High | Push + Email |
| New photos added | 📸 New Photos | {N} new site photos added to your project. | Normal | Push + In-App |
| Document to sign | ✍️ Signature Required | "{document_name}" is ready for your signature. | High | Push + Email |
| Invoice issued | 🧾 New Invoice | Invoice #{N} for {amount} has been issued. | High | Push + Email |
| Invoice overdue | ⚠️ Payment Overdue | Invoice #{N} for {amount} is {N} days overdue. | High | Push + Email + SMS |
| Team message | 💬 Message | {team_member}: {preview} | Normal | Push + In-App |
| Milestone reached | 🏁 Milestone | Your project reached: {milestone_name}. | Normal | Push + In-App |
| Project completed | ✅ Project Done | Your renovation project is complete! | Normal | Push + Email |
| Estimate ready | 📋 Estimate Ready | Your estimate #{N} for {amount} is ready to review. | High | Push + Email |

---

---

## Role 20 — Supplier Portal User

**Scope Level:** External (authenticated supplier/vendor with portal access)
**Description:** A vendor or supplier with access to the PRV supplier portal. Views their purchase orders from PRV, confirms orders, uploads delivery documents and invoices, checks payment status, and updates their product pricing and contacts.

---

### 1. Navigation

| Tab | Icon | Name | Primary Content |
|-----|------|------|----------------|
| 1 | 🏠 | Home | Welcome, active orders, payment status |
| 2 | 📄 | Orders | Purchase orders from PRV |
| 3 | 🧾 | Invoices | My submitted invoices, payment status |
| 4 | 🏷️ | My Catalog | My products, pricing submitted to PRV |
| 5 | 👤 | Profile | My company info, contacts, documents |

---

### 2. Dashboard

**Header Zone:** Welcome, {Supplier Name} · {Date}

**KPI Zone (supplier-visible):**
- Open Orders (POs awaiting action)
- Orders To Acknowledge
- Invoices Submitted (pending payment)
- Outstanding Payment Amount
- Next Payment Expected

**Primary Zone:**
- Order Status Pipeline (Received → Acknowledged → In Production → Shipped → Delivered)
- Recent Payment History

**Secondary Zone:**
- Pending Invoice Submissions (orders delivered, invoice not yet submitted)
- Document Expiry Alerts (their own compliance docs)

**Activity Zone:**
- Recent Order Activity Feed

**Quick Actions Zone:**
- Acknowledge Order
- Submit Invoice
- Update Pricing
- Upload Document

---

### 3. Screens

**Home Tab:** Supplier Dashboard

**Orders Tab:**
- Order List (all POs from PRV, sorted by date)
  - Order Detail
    - PO number, issue date, delivery date requested
    - Line items (product, quantity, price)
    - Delivery address
    - Payment terms
    - Status
    - Timeline (history of status changes)
    - Actions: Acknowledge / Update Status / Download PDF
  - Order Acknowledgment
    - Confirm can deliver all items
    - Confirm or propose new delivery date
    - Notes
  - Order Status Update
    - In Production / Dispatched / Delayed
    - Add tracking reference
  - Download PO (PDF)

**Invoices Tab:**
- Invoice List (all submitted invoices)
  - Invoice Detail
    - PO reference
    - Invoice number and date
    - Amount
    - PRV matching status (pending match / matched / approved)
    - Payment status (pending / scheduled / paid)
    - Payment date (when paid)
  - Submit Invoice
    - Linked PO selector
    - Invoice number, date, amount
    - Upload invoice PDF
    - Submit

**My Catalog Tab:**
- My Products (submitted to PRV)
  - Product Detail → Current price, unit, lead time
  - Update Price List
    - Line-by-line price entry
    - Effective date
    - Submit for PRV approval
- My Price Lists (history)

**Profile Tab:**
- My Company Information
  - Legal name, tax ID, registration
  - Payment details (bank account for payments)
  - Primary contact info
- My Team (portal users from my company)
  - Invite / Remove portal users
- Documents
  - Insurance certificate (upload / view / expiry)
  - Quality certificates
  - Compliance documents
- Password / Security Settings

---

### 4. Bottom Sheets

| Bottom Sheet | Trigger | Content | Actions |
|-------------|---------|---------|---------|
| Acknowledge Order | Order tap | PO summary, delivery date confirmation or new date proposal | Acknowledge |
| Status Update | Order action | Status selector (In Production / Dispatched / Delayed), tracking reference, notes | Update |
| Submit Invoice | Invoices tab | PO selector, invoice number, date, amount, PDF upload | Submit |
| Update Price | Catalog action | Product list, new prices, unit, lead time, effective date | Submit for Review |
| Upload Document | Profile tab | Document type, expiry date, file upload | Upload |
| Payment Enquiry | Invoice detail | Invoice number, PRV reference, query message | Send Query |

---

### 5. Dynamic Island

**Idle State:** {Supplier Name} · {N} active orders

**Order Received:** 📄 New PO received · PO #{N} · Tap to acknowledge

**Payment Alert:** 💳 Payment of {amount} received from PRV

**Expanded State:** Open orders / Invoices pending / Next payment

---

### 6. Widgets

**Lock Screen:** Open orders · Payment expected

**Home Screen:** Open orders / Orders to acknowledge / Invoices pending payment / Next payment date

**Dashboard Widgets:**
- Order Pipeline
- Payment History
- Invoice Status
- Document Expiry Tracker
- My Catalog Summary

---

### 7. Notifications

| Event | Title | Body | Priority | Channels |
|-------|-------|------|----------|---------|
| New purchase order | 📄 New Order | PRV sent purchase order #{N} for {amount}. Please acknowledge. | High | Push + Email |
| Invoice matched | ✅ Invoice Matched | Invoice #{N} matched to PO #{N}. Under review. | Normal | Push + In-App |
| Payment issued | 💳 Payment Sent | PRV issued payment of {amount} for invoice #{N}. | High | Push + Email |
| Document expiry | ⚠️ Doc Expiry | Your {document_type} expires in {N} days. Please renew. | High | Push + Email |
| Price list approved | ✅ Prices Approved | Your price list effective {date} has been approved. | Normal | In-App + Email |
| Price list rejected | ❌ Prices Rejected | Your price list was not approved: {reason}. | Normal | In-App + Email |
| PO cancellation | ⚠️ Order Cancelled | PO #{N} has been cancelled. Reason: {reason}. | High | Push + Email |
| Evaluation submitted | ⭐ Evaluation | PRV has submitted a performance evaluation for {period}. | Normal | In-App |

---

---

## Master Screen Index

All unique screens across PRV, deduplicated, grouped by module. Format: Screen → Description → Accessible By.

### Module: Foundation / Auth
| Screen | Description | Accessible By |
|--------|-------------|--------------|
| Login | Email/password + MFA | All roles |
| MFA Verification | TOTP / SMS / Email OTP | All roles |
| Password Reset | Email-based reset flow | All roles |
| Session Expired | Re-authentication prompt | All roles |
| Face ID Setup | Biometric enrollment | All roles (mobile) |
| Account Locked | Too many failed attempts | All roles |
| Onboarding Welcome | First-login guided setup | All roles (new users) |

### Module: Dashboard / Command
| Screen | Description | Accessible By |
|--------|-------------|--------------|
| CEO Dashboard | 60-second rule command center | CEO, Co-CEO |
| Group Dashboard | Consolidated group view | Group CEO |
| Platform Dashboard | System health and ops | Sysadmin, Platform Admin |
| Regional Dashboard | Region store grid | Regional Manager |
| Store Dashboard | Single store KPIs | Store Manager |
| Shop Dashboard | All-store shop ops | Shop Director |
| Department Dashboard | Team and project focus | Department Head |
| HR Dashboard | People and attendance | HR Manager |
| Finance Dashboard | AR/AP and P&L | Finance Manager |
| PM Dashboard | Projects and sprint | Project Manager |
| Team Lead Dashboard | Team focus | Team Lead |
| Site Dashboard | Renovation site focus | Field Supervisor |
| Worker Home | Personal tasks and schedule | Worker |
| Cashier POS Dashboard | Register focus | Cashier |
| Procurement Dashboard | PO pipeline | Procurement Officer |
| Fleet Dashboard | Vehicle status grid | Fleet Manager |
| Client Home | Project progress | Client Portal |
| Supplier Home | Order pipeline | Supplier Portal |

### Module: Projects (Module 02)
| Screen | Description | Accessible By |
|--------|-------------|--------------|
| Project List | All accessible projects | CEO, Co-CEO, Dept Head, PM, Team Lead |
| Project Detail | Full project view | PM + assigned team |
| Kanban Board | Visual task board | PM, Team Lead, Workers (own tasks) |
| Sprint Board | Active sprint view | PM, Team Lead |
| Sprint Planning | Backlog → sprint | PM |
| Backlog | Full task queue | PM, Team Lead |
| Task Detail | Full task record | PM, Team Lead, Workers |
| Milestone List | Project milestones | PM, CEO |
| Milestone Detail | Single milestone | PM |
| Project Budget | Allocated vs spent | PM, Finance Manager, CEO |
| Team Member List | Project participants | PM, Dept Head |
| Project Activity | Audit of project events | PM, CEO |

### Module: Attendance (Module 03)
| Screen | Description | Accessible By |
|--------|-------------|--------------|
| Clock In/Out | Personal attendance | All non-external roles |
| My Attendance | Own history | All non-external |
| Leave Request | Submit leave | All employees |
| Leave History | Own leave records | All employees |
| Leave Balance | Remaining entitlement | All employees |
| Team Attendance | Team overview (today) | Team Lead, Dept Head, Store Manager |
| Company Attendance | All staff attendance | HR Manager, CEO |
| Leave Calendar | Company-wide view | HR Manager, CEO, Managers |
| Schedule View | My weekly schedule | All employees |
| Schedule Management | Edit/create schedules | HR Manager, Store Manager, Dept Head |
| Overtime Request | Request extra hours | All employees |
| Attendance Report | Export/analytics | HR Manager, Regional Manager, CEO |

### Module: Renovation Services (Module 22)
| Screen | Description | Accessible By |
|--------|-------------|--------------|
| Renovation Project List | All renovation projects | CEO, Co-CEO, PM (if assigned), Site Supervisor |
| Project Detail | Full renovation view | CEO, assigned team |
| Phase Overview | All phases, timeline | Supervisor, PM, CEO |
| Site Task Board | On-site task management | Site Supervisor |
| Daily Site Report | Submit daily report | Site Supervisor |
| Site Report History | Past reports | Supervisor, PM, CEO |
| Site Photos | Photo gallery | Supervisor, PM, CEO, Client (approved) |
| Estimate Detail | Quote to client | CEO, Finance Manager, PM |
| Contract Detail | Signed contract | CEO, Finance Manager |
| Material Request | Request materials | Site Supervisor |
| Material Request History | All requests | Supervisor, PM, Procurement |
| Phase Sign-Off | Client approval workflow | Supervisor, CEO, Client |
| Client Approval Center | Client-facing approvals | Client Portal |

### Module: Shop (Module 06)
| Screen | Description | Accessible By |
|--------|-------------|--------------|
| POS Interface | Active register | Cashier |
| Order List | All orders | Shop Director, Store Manager, Cashier (own session) |
| Order Detail | Full order view | Shop Director, Store Manager, Cashier |
| Product List | Catalog | Shop Director, Store Manager, Cashier (read) |
| Product Detail | Full product info | Shop Director, Store Manager |
| Product Create/Edit | Manage catalog | Shop Director |
| Variant Management | Product variants | Shop Director |
| Inventory Overview | Stock levels | Shop Director, Store Manager, Procurement |
| Inventory Detail | Per-product stock | Shop Director, Store Manager |
| Stock Adjustment | Manual correction | Store Manager |
| Stock Transfer | Between locations | Shop Director, Store Manager |
| Goods Receipt | Receive delivery | Store Manager, Procurement |
| Discount Code List | Promotional codes | Shop Director |
| Discount Code Create | New promo | Shop Director |

### Module: CRM (Module 07)
| Screen | Description | Accessible By |
|--------|-------------|--------------|
| Client List | All clients | CEO, Co-CEO, Finance Manager, PM |
| Client Detail | Full client view | CEO, Finance, PM |
| Contact List | Client contacts | CEO, Finance |
| Opportunity Pipeline | Sales funnel | CEO, Co-CEO |
| Opportunity Detail | Single opportunity | CEO, Co-CEO |
| Quote List | All quotes | CEO, Finance Manager |
| Quote Detail | Full quote | CEO, Finance |
| Interaction Log | Call/email history | CEO, PM |

### Module: Finance (Module 08)
| Screen | Description | Accessible By |
|--------|-------------|--------------|
| Invoice List | All outgoing invoices | CEO, Finance Manager |
| Invoice Detail | Full invoice | CEO, Finance Manager |
| Invoice Create | New invoice | Finance Manager |
| P&L Statement | Profit & loss | CEO, Finance Manager |
| AR Overview | Accounts receivable | CEO, Finance Manager |
| AP Overview | Accounts payable | Finance Manager, Procurement |
| Payment List | All received payments | Finance Manager, CEO |
| Payment Record | New payment entry | Finance Manager |
| Expense Claim List | All expense claims | Finance Manager |
| Expense Claim Detail | Full claim + approval | Finance Manager, CEO |
| Budget Overview | All active budgets | Finance Manager, CEO, Dept Head (own) |
| Budget Detail | Full budget | Finance Manager, CEO |
| Cash Flow Report | 90-day forecast | CEO, Finance Manager |
| Tax Dashboard | VAT and e-Factura | Finance Manager, CEO |

### Module: Documents (Module 09)
| Screen | Description | Accessible By |
|--------|-------------|--------------|
| Document Folders | Folder tree | All (per visibility) |
| Document List | Documents in folder | All (per visibility) |
| Document Detail | View / download | Per document visibility |
| Document Upload | New document | All employees |
| Document Versions | Version history | Managers, CEO |
| Document Share | Share link management | Managers |
| Document Access Log | Audit trail | CEO, Sysadmin |

### Module: Communication (Module 10)
| Screen | Description | Accessible By |
|--------|-------------|--------------|
| Channel List | All joined channels | All employees |
| Channel Detail | Message thread | Channel members |
| Direct Messages | 1:1 messages | All employees |
| Search Messages | Full-text search | All employees |
| Channel Create | New channel | Managers + |

### Module: Notifications (Module 11)
| Screen | Description | Accessible By |
|--------|-------------|--------------|
| Notification Inbox | All my notifications | All roles |
| Notification Detail | Full notification view | All roles |
| Notification Preferences | Channel settings | All roles |
| Notification Archive | Past notifications | All roles |

### Module: Analytics (Module 12)
| Screen | Description | Accessible By |
|--------|-------------|--------------|
| Analytics Hub | All analytics entry | CEO, Finance, HR, Shop Director |
| Revenue Analytics | Revenue charts | CEO, Finance Manager |
| Workforce Analytics | People metrics | CEO, HR Manager |
| Project Analytics | Project KPIs | CEO, PM, Dept Head |
| Shop Analytics | Retail metrics | CEO, Shop Director, Store Manager |
| Custom Report Builder | Build reports | Managers + |
| Report History | Past generated reports | Report creator |
| Saved Reports | Reusable report configs | Managers + |

### Module: AI Platform (Module 13)
| Screen | Description | Accessible By |
|--------|-------------|--------------|
| AI Assistant | Chat interface | All employees (scoped by role) |
| Conversation History | Past AI chats | Own conversations |
| AI Insights Library | All generated insights | CEO, Managers |
| Report Builder (AI) | AI-generated reports | CEO, Managers |
| AI Usage Dashboard | Token/cost tracking | CEO, Sysadmin |

### Module: Approvals (Module 14)
| Screen | Description | Accessible By |
|--------|-------------|--------------|
| Approval Inbox | My pending approvals | All with approval authority |
| Approval Detail | Full context + action | Approvers |
| Approval History | Past decisions | All users |
| Delegation Settings | Delegate while away | Managers + |

### Module: Procurement (Module 15)
| Screen | Description | Accessible By |
|--------|-------------|--------------|
| PO List | All purchase orders | Procurement Officer, Finance, CEO |
| PO Detail | Full PO | Procurement Officer, Finance |
| PO Create | New purchase order | Procurement Officer |
| Supplier Invoice List | Incoming invoices | Procurement, Finance |
| Goods Receipt List | Delivery records | Procurement, Store Manager |
| Goods Receipt Detail | Confirm delivery | Procurement |

### Module: Tools (Module 16)
| Screen | Description | Accessible By |
|--------|-------------|--------------|
| Tool List | Asset registry | All (scope-limited) |
| Tool Detail | Full tool record | Asset managers, CEO |
| Tool Assignment | Assign to user/project | Managers |
| Tool Maintenance | Service history | Managers |

### Module: Fleet (Module 17)
| Screen | Description | Accessible By |
|--------|-------------|--------------|
| Vehicle List | All vehicles | Fleet Manager, CEO |
| Vehicle Detail | Full vehicle record | Fleet Manager |
| Trip List | All trips | Fleet Manager |
| Trip Detail | Individual trip | Fleet Manager, Driver (own) |
| Fuel Log | All fuel records | Fleet Manager |
| Maintenance Schedule | Service calendar | Fleet Manager |

### Module: Supplier Management (Module 23)
| Screen | Description | Accessible By |
|--------|-------------|--------------|
| Supplier List | All suppliers | Procurement, CEO |
| Supplier Detail | Full vendor record | Procurement |
| Supplier Evaluation | Performance scoring | Procurement |
| Price List | Agreed pricing | Procurement |
| Supplier Portal | External portal | Supplier Portal User |

---

## Global Bottom Sheet Catalog

All distinct bottom sheets in PRV, grouped by trigger context.

### Authentication Context
| Bottom Sheet | Trigger | Available To |
|-------------|---------|-------------|
| MFA Code Entry | Login | All roles |
| Re-authentication | Sensitive action gate | All roles |
| Face ID Confirm | Security-gated action | All (mobile) |
| Session Timeout Warning | Inactivity (5 min warning) | All roles |

### Approval Context
| Bottom Sheet | Trigger | Available To |
|-------------|---------|-------------|
| Quick Approve | Approval badge | All with approval authority |
| Approve with Comment | Approval detail | All with approval authority |
| Reject with Reason | Approval detail | All with approval authority |
| Delegate Approval | Approval detail | Managers + |
| Request More Info | Approval detail | Managers + |
| Bulk Approve | Approval list | Managers + |

### Projects Context
| Bottom Sheet | Trigger | Available To |
|-------------|---------|-------------|
| Create Task | Board / Quick action | PM, Team Lead, Dept Head |
| Task Detail | Task card | Assigned user, PM, Team Lead |
| Move Task | Task context menu | PM, Team Lead |
| Add Blocker | Task detail | All assigned |
| Start Sprint | Sprint board | PM |
| Complete Sprint | Active sprint | PM |
| Create Milestone | Project action | PM |

### Attendance Context
| Bottom Sheet | Trigger | Available To |
|-------------|---------|-------------|
| Clock In | Home / Quick action | All employees |
| Clock Out | Home (while clocked in) | All employees |
| Leave Request | Profile / Quick action | All employees |
| Leave Approval | Leave request notification | Team Lead, HR, Managers |
| Overtime Request | Schedule | All employees |

### Finance Context
| Bottom Sheet | Trigger | Available To |
|-------------|---------|-------------|
| Create Invoice | Finance quick action | Finance Manager |
| Invoice Send | Invoice detail | Finance Manager |
| Record Payment | Finance quick action | Finance Manager |
| Allocate Payment | Payment detail | Finance Manager |
| Expense Approval | Expense notification | Finance Manager, CEO |
| Budget Approve | Budget queue | Finance Manager, CEO |
| Credit Note | Invoice action | Finance Manager |
| e-Factura Resubmit | ANAF error | Finance Manager |

### Renovation Context
| Bottom Sheet | Trigger | Available To |
|-------------|---------|-------------|
| Quick Daily Report | Site supervisor | Site Supervisor |
| Task Complete | Site task | Site Supervisor |
| Phase Progress Update | Site tab | Site Supervisor |
| Material Request | Site quick action | Site Supervisor |
| Delivery Confirm | Expected delivery | Site Supervisor, Procurement |
| Phase Sign-Off | Phase complete | Site Supervisor, CEO, Client |
| Log Safety Incident | Safety tab | Site Supervisor |
| Safety Briefing Deliver | Safety tab | Site Supervisor |

### Shop Context
| Bottom Sheet | Trigger | Available To |
|-------------|---------|-------------|
| Add to Cart | Product result | Cashier |
| Apply Discount | Cart | Cashier, Store Manager |
| Payment Collection | Cart checkout | Cashier |
| Process Return | Orders | Cashier, Store Manager |
| Open Session | POS | Cashier |
| Close Session | POS | Cashier |
| Stock Adjustment | Inventory | Store Manager |
| Receive Goods | Inventory | Store Manager, Procurement |
| Price Update | Product | Shop Director |
| Bulk Price Update | Product list | Shop Director |
| Discount Code Create | Shop Director | Shop Director |

### System / Security Context
| Bottom Sheet | Trigger | Available To |
|-------------|---------|-------------|
| JIT Access Request | Sysadmin — impersonate | Sysadmin |
| JIT Access Approval | Notification | Sysadmin (second approver) |
| Emergency Company Freeze | Security | Sysadmin |
| Security Event Resolve | Event detail | Sysadmin |
| Feature Flag Toggle | Platform settings | Sysadmin, Platform Admin |
| GDPR Erasure Approve | Erasure queue | Sysadmin |

---

## Dynamic Island State Matrix

All 20 roles × 4 Dynamic Island states.

| Role | Idle State | Active Work State | Alert State | Expanded State |
|------|-----------|-------------------|-------------|----------------|
| Sysadmin | Platform status · Uptime | JIT session · Countdown | N Critical events | Session timer / alerts / failed jobs |
| Platform Admin | Ops · N open tickets | Onboarding in progress | SLA breach imminent | Ticket queue / MRR / onboarding |
| Group CEO | Group · Revenue MTD | N approvals waiting | Critical at company | Revenue / approvals / alerts per company |
| CEO | Company · Revenue MTD | N approvals waiting | Critical alert | Revenue / projects / approvals / alerts |
| Co-CEO | Company · Active projects | N approvals waiting | Critical alert | Projects / approvals / team / alerts |
| Regional Manager | Region · N stores | Approval review | Store revenue drop | Revenue / store health / approvals |
| Store Manager | Store · Revenue today | Register open · N sales | Staff shortage | Revenue / staff / register / stock |
| Shop Director | Shop · Revenue MTD | N orders pending | Stock-out alert | Revenue / fulfillment / stock alerts |
| Dept Head | Dept · N tasks today | Sprint day N/total | N overdue tasks | Tasks due / team present / budget |
| HR Manager | HR · Attendance % | Payroll run progress | Contract expiry alert | Headcount / leave pending / payroll |
| Finance Manager | Finance · AR outstanding | Invoice sent to client | Invoice overdue alert | AR / AP due / cash position |
| Project Manager | N projects · Tasks due | Sprint: day N · done | Blocker detected | Sprint progress / blockers / due today |
| Team Lead | Team: N present | N tasks in progress | Blocked task | Present / tasks done / blockers |
| Field Supervisor | Project · Phase N: N% | Workers on site: N | Safety issue open | Workers / phase % / report status |
| Worker | Shift: start-end | Clocked in · N hours | Task due today | Clock duration / current task / hours |
| Cashier | No session / Session open | Register #N · N sales | Discount approval pending | Sales / transactions / session time |
| Procurement Officer | N open POs · N deliveries | Delivery in progress | PO overdue | Open POs / deliveries today / invoices |
| Fleet Manager | N available · N compliance | Active trip: vehicle | Compliance expired | Available / active trips / compliance |
| Client Portal | My project · N% complete | Signature required | Invoice overdue | Project progress / signature / messages |
| Supplier Portal | N open orders | Order acknowledged | Document expiring | Open orders / invoices / payment |

---

## Notification Delivery Matrix

Cross-reference of key notification types × roles × delivery channels.

**Channel Key:** P = Push · I = In-App · E = Email · S = SMS

| Notification Type | CEO | Group CEO | Regional Mgr | Store Mgr | HR Mgr | Finance Mgr | PM | Supervisor | Worker | Cashier | Procurement |
|------------------|-----|-----------|-------------|-----------|--------|-------------|----|-----------|----|---------|-------------|
| Approval required | P+I | P+I | P+I | P+I | P+I | P+I | P+I | – | – | – | P+I |
| Task assigned | I | – | – | – | – | – | P+I | P+I | P | – | – |
| Task overdue | P+I | – | – | – | – | – | P+I | I | P | – | – |
| Invoice paid | P+I | – | – | – | – | P+I | – | – | – | – | – |
| Invoice overdue | P+S | – | – | – | – | P+E | – | – | – | – | – |
| Contract expiring | P+I | – | – | – | P+E | – | – | – | – | – | – |
| Payroll ready | P+E | – | – | – | P+I | P+I | – | – | P+I | – | – |
| Leave request | I | – | I | I | I | – | – | – | – | – | – |
| Leave approved | – | – | – | – | – | – | – | – | P+I | P+I | P+I |
| Safety incident | P+S | P+S | P | – | – | – | P | P | P | – | – |
| Security event | P+S | – | – | – | – | – | – | – | – | – | – |
| Daily summary | I | I | I | I | I | I | I | I | I | I | I |
| Company announcement | P+I | P+I | P+I | P+I | P+I | P+I | P+I | P+I | P+I | P+I | P+I |
| PO approved | – | – | – | – | – | P+I | – | – | – | – | P+I |
| Delivery today | – | – | – | I | – | – | – | P+I | – | – | P+I |
| Stock-out | I | – | I | P+I | – | – | – | P | – | I | I |
| New hire onboarding | I | – | – | – | I | – | – | – | – | – | – |
| Budget overrun | P+I | – | – | – | – | P+I | I | – | – | – | – |
| Vehicle compliance | – | – | – | – | – | – | – | – | – | – | – |
| Payslip available | – | – | – | – | – | – | – | – | P+I | P+I | P+I |

---

## Widget Catalog

All widgets available across the platform, grouped by category.

### KPI Widgets
| Widget | Data Shown | Available Roles |
|--------|-----------|----------------|
| Revenue MTD Card | Monthly revenue vs target | CEO, Co-CEO, Finance Manager, Group CEO |
| Group Revenue Card | Consolidated group revenue | Group CEO |
| Net Profit Card | Monthly net profit | CEO, Finance Manager |
| Cash Position Card | Current cash balance | CEO, Finance Manager |
| AR Outstanding Card | Total + overdue AR | CEO, Finance Manager |
| AP Due Card | Total + this-week AP | Finance Manager |
| Payroll Cost Card | Last run total | HR Manager, CEO, Finance Manager |

### Operations Widgets
| Widget | Data Shown | Available Roles |
|--------|-----------|----------------|
| Project Health Grid | All projects, traffic-light | CEO, PM, Dept Head |
| Sprint Burndown Chart | Sprint completion vs ideal | PM, Team Lead |
| Renovation Pipeline | Inquiry → Completed funnel | CEO, PM |
| Task Board Summary | To Do / In Progress / Done | PM, Team Lead, Dept Head |
| Order Fulfillment Pipeline | Shop order stages | Shop Director, Store Manager |
| PO Status Pipeline | Procurement stages | Procurement Officer |
| Fleet Status Grid | Vehicles by status | Fleet Manager |
| Maintenance Due List | Upcoming services | Fleet Manager |

### People Widgets
| Widget | Data Shown | Available Roles |
|--------|-----------|----------------|
| Attendance Rate | Company/dept/team % | HR Manager, Dept Head, Team Lead |
| Headcount by Department | Bar chart | CEO, HR Manager |
| Leave Calendar | Monthly absence view | HR Manager, Dept Head, CEO |
| Hire/Departure Chart | Monthly trend | HR Manager, CEO |
| Team Workload | Member capacity map | PM, Team Lead |
| Contract Expiry Timeline | Upcoming renewals | HR Manager |
| Onboarding Pipeline | New starters status | HR Manager |

### Finance Widgets
| Widget | Data Shown | Available Roles |
|--------|-----------|----------------|
| Revenue Trend Chart | 12-month line | CEO, Finance Manager |
| AR Aging Buckets | 0-30/31-60/61-90/90+ | CEO, Finance Manager |
| Revenue vs Expense | Monthly bar/line | CEO, Finance Manager |
| Budget Gauge | Dept budget used % | Dept Head, Finance Manager, CEO |
| Budget vs Actual | Multi-dept comparison | Finance Manager, CEO |
| VAT Period Status | Current period status | Finance Manager |
| Cash Flow Forecast | 30/60/90-day projection | CEO, Finance Manager |

### AI Widgets
| Widget | Data Shown | Available Roles |
|--------|-----------|----------------|
| AI Insight Feed | Latest AI-generated insights | CEO, Group CEO, Managers |
| AI Revenue Forecast | Next 30-day prediction | CEO, Finance Manager |
| Anomaly Alert Feed | Unusual pattern alerts | CEO, Sysadmin |
| Sprint Risk Indicator | Current sprint risk % | PM |
| Turnover Risk Signals | Employee disengagement | HR Manager, CEO |
| Demand Forecast | Product demand prediction | Shop Director |
| Predictive Maintenance | Vehicle service prediction | Fleet Manager |

### Personal Widgets (Worker / Cashier)
| Widget | Data Shown | Available Roles |
|--------|-----------|----------------|
| My Tasks Today | Personal task list | Worker |
| Hours This Week | Clock-in total | Worker |
| Leave Balance | Remaining days | Worker, Cashier |
| Attendance Streak | Consecutive on-time days | Worker |
| Session Summary | POS session stats | Cashier |
| Today's Sales Chart | Hourly revenue (session) | Cashier, Store Manager |

---

## Deep Link Route Map

All deeplink routes used in notifications and Dynamic Island actions.

| Route Pattern | Destination Screen | Available To |
|--------------|-------------------|-------------|
| `/dashboard` | Role-appropriate dashboard | All roles |
| `/approvals` | Approval Inbox | All with approval authority |
| `/approvals/:id` | Specific approval detail | Approval authority |
| `/projects/:id` | Project detail | PM, CEO, Dept Head |
| `/projects/:id/tasks/:taskId` | Specific task | PM, Team Lead, Worker |
| `/renovation/:id` | Renovation project detail | CEO, PM, Supervisor |
| `/renovation/:id/phases/:phaseId` | Phase detail | CEO, PM, Supervisor |
| `/site-reports/new` | New daily site report | Site Supervisor |
| `/invoices/:id` | Invoice detail | Finance Manager, CEO, Client |
| `/invoices/create` | New invoice | Finance Manager |
| `/payments/new` | Record payment | Finance Manager |
| `/attendance/clock-in` | Clock-in screen | All employees |
| `/attendance/leave/new` | New leave request | All employees |
| `/leave-requests/:id` | Leave request detail | HR, Managers |
| `/payslip/:id` | Payslip view | Own employee |
| `/payroll-run/:id` | Payroll run detail | HR Manager, CEO |
| `/shop/orders/:id` | Order detail | Shop Director, Store Manager, Cashier |
| `/pos` | POS interface | Cashier |
| `/purchase-orders/:id` | PO detail | Procurement Officer, Finance |
| `/purchase-orders/create` | New PO | Procurement Officer |
| `/deliveries/:id` | Goods receipt | Procurement, Store Manager |
| `/suppliers/:id` | Supplier detail | Procurement Officer |
| `/vehicles/:id` | Vehicle detail | Fleet Manager |
| `/vehicles/:id/maintenance` | Maintenance for vehicle | Fleet Manager |
| `/employees/:id` | Employee profile | HR Manager, Managers |
| `/employees/new` | New employee | HR Manager |
| `/contracts/:id` | Contract detail | HR Manager, Finance Manager, CEO |
| `/documents/:id` | Document viewer | Per document visibility |
| `/security/events/:id` | Security event detail | Sysadmin |
| `/security/jit` | JIT access center | Sysadmin |
| `/analytics` | Analytics hub | CEO, Managers |
| `/ai/conversation/:id` | AI conversation | Own conversation |
| `/ai/insights` | AI insights library | CEO, Managers |
| `/notifications` | Notification inbox | All roles |
| `/notifications/:id` | Specific notification | Own notification |
| `/client-portal/projects/:id` | Client project detail | Client Portal User |
| `/client-portal/invoices/:id` | Client invoice | Client Portal User |
| `/client-portal/documents/:id/sign` | Document signature | Client Portal User |
| `/supplier-portal/orders/:id` | Supplier PO detail | Supplier Portal User |
| `/supplier-portal/invoices/new` | Submit invoice | Supplier Portal User |
| `/safety/incidents/:id` | Safety incident | Site Supervisor, CEO |
| `/safety/incidents/new` | New incident report | Site Supervisor |
| `/learning/courses/:id` | Course detail | All employees |
| `/learning/enrollments/:id` | My enrollment | All employees |
| `/knowledge-base/articles/:id` | KB article | All employees |
| `/command-center` | Executive command | CEO, Group CEO |
| `/companies/:id` | Company detail | Sysadmin, Platform Admin, Group CEO |

---

*End of UI_SITEMAP_PART4.md — Complete UI Sitemap (All 20 Roles)*

*Parts 1–4 together define the complete screen inventory, navigation patterns, widget catalog, notification matrix, and deeplink system for all 20 PRV roles.*
