# PRV — Complete Navigation Architecture
## Enterprise Navigation Blueprint · Source of Truth · v1.0

---

## NAVIGATION PHILOSOPHY

> "Users should never wonder: Where do I find this?"

Every navigation decision in PRV answers three questions simultaneously:
1. **Who** is navigating? (role-aware structure)
2. **What** are they trying to do? (contextual, task-oriented)
3. **Where** can they go? (scope-filtered, permission-gated)

**Non-negotiable constraints:**
- Maximum navigation depth: **3 levels**
- Level 1: Tab / Sidebar section
- Level 2: List / Grid screen
- Level 3: Detail view — all further actions via Bottom Sheet

**Preferred patterns (in order):**
1. Bottom Sheet — secondary workflows, details, actions
2. Context Menu — long-press secondary actions
3. Command Palette — global access to everything
4. Search Overlay — universal discovery
5. Peek Preview — preview without navigating
6. Expandable Card — inline reveal
7. Drawer / Panel — settings, filters, inspector

**Never:** deep menu trees, unnecessary full-screen navigations, modal stacks deeper than 2.

---

## 1. MOBILE NAVIGATION ARCHITECTURE (iPhone)

### 1.1 Public Application

**Navigation type:** Floating Glass Tab Bar (bottom)

```
Tab Order:
┌─────────────────────────────────────────────────┐
│  🏠 Home  │  🛒 Shop  │  🔍 Search  │  ❤️ Fav  │  👤 Account  │
└─────────────────────────────────────────────────┘
```

**Floating Tab Bar Spec:**
- Position: bottom, floating (16pt margin from safe area bottom)
- Shape: pill / rounded rectangle (radius 32pt)
- Material: Liquid Glass (blur 40pt, saturation 200%, rgba(0,0,0,0.78) dark / rgba(255,255,255,0.82) light)
- Top edge specular highlight: 1pt gradient line
- Shadow: 0 24px 64px rgba(0,0,0,0.5)
- Height: 64pt (content) + safe area
- Icon size: 24pt
- Label: 10pt, SF Pro Rounded, 600 weight
- Active indicator: pill background (glass tint, lighter)
- Badge: white circle with black count, top-right of icon

**Level 1 — Home:**
- Hero Section (company presentation, full bleed)
- Services Grid (glass cards, 2-column)
- Featured Projects (horizontal scroll, glass cards with image)
- Before / After gallery (swipe compare)
- Reviews (horizontal scroll)
- Statistics (glass number cards)
- Contact + Quote Request (glass form, bottom sheet on tap)

**Level 1 — Shop:**
- Search bar (floating, pill-shaped)
- Category filter (horizontal scroll pills)
- Product grid (2-column, glass cards with image)
- Level 2 → Product Detail (full screen)
  - Level 3 actions → Add to Cart (bottom sheet), Share, Wishlist (context menu)

**Level 1 — Search:**
- Full search overlay (immediate focus)
- Recent searches (glass list)
- Suggestions by category
- Results: Products / Services / Projects (tabbed glass segmented)

**Level 1 — Favorites:**
- Tabbed (Products / Projects / Services)
- Glass card grid

**Level 1 — Account:**
- Profile card (glass, hero)
- Orders, Invoices, Quotes (glass list items → Level 2 detail)
- Settings (glass list → Level 2)
- Client Portal entry (if client) → Level 2 (Projects, Contracts, Documents)

---

### 1.2 Business OS — Dynamic Navigation Per Role

**Navigation type:** Floating Glass Tab Bar (bottom) — role-aware tabs

All tabs share these constants:
- Floating tab bar spec: same as Public App
- Search always accessible via floating glass search bar (top, below Dynamic Island)
- Inbox accessible via tab badge or long-press tab
- Command Palette via ⌘K (external keyboard) or long-press search bar

---

#### CEO Tab Bar
```
⌂ Command  │  🏢 Companies  │  📊 Intelligence  │  💰 Finance  │  ⋯ More
```
- **Command**: Executive dashboard (KPIs, alerts, AI)
- **Companies**: Multi-company overview (PRV Group → each company card)
- **Intelligence**: Analytics + AI full suite
- **Finance**: Revenue, profit, reports
- **More (bottom sheet)**: Workforce · Projects · Shop · Procurement · Fleet · Tools · Settings · Security · Audit

**Level depth example:**
```
Companies (L1) → PRV Renovations (L2) → Store Performance (L3)
                                       → [Further actions via Bottom Sheet]
```

---

#### Co-CEO Tab Bar
```
⌂ Command  │  🏢 Companies  │  📊 Intelligence  │  💰 Finance  │  ⋯ More
```
Identical to CEO structure; data filtered by delegation scope.

---

#### System Administrator Tab Bar
```
⚙ System  │  👤 Users  │  🔐 Security  │  📋 Audit  │  🔗 Integrations
```
- **System**: Health, uptime, error rates, active sessions
- **Users**: User list, role assignments, account management
- **Security**: Security dashboard, alerts, device management
- **Audit**: Live audit log stream, search, export
- **Integrations**: API connections, webhook status, third-party services

---

#### Worker Tab Bar
```
⌂ Today  │  ✓ Tasks  │  📅 Schedule  │  📤 Upload  │  👤 Me
```
- **Today**: Shift status, current task, team at-a-glance
- **Tasks**: Task list (assigned, in-progress, done)
- **Schedule**: Personal calendar, shifts, leave
- **Upload**: Quick photo/document upload (camera instant access)
- **Me**: Profile, attendance history, payslips, settings

---

#### Team Leader Tab Bar
```
⌂ Dashboard  │  👥 Team  │  ✓ Tasks  │  📅 Schedule  │  📬 Inbox
```
- **Dashboard**: Team KPIs, attendance live, pending approvals
- **Team**: Team member list, live status, individual drill-down
- **Tasks**: Team task board (kanban glass view)
- **Schedule**: Team schedule, rota management
- **Inbox**: Approvals, escalations, announcements

---

#### OMS / Area Supervisor Tab Bar
```
⌂ Dashboard  │  📍 Sites  │  👥 Teams  │  📦 Materials  │  📊 KPI
```
- **Dashboard**: Area status, alerts, resource overview
- **Sites**: Active site list, map view (if applicable)
- **Teams**: All teams under area, live status
- **Materials**: Material requests, stock status, deliveries
- **KPI**: Area performance metrics, comparisons

---

#### Operations Manager Tab Bar
```
⌂ Command  │  ⊞ Operations  │  👥 People  │  💰 Finance  │  📊 Reports
```
- **Command**: Regional dashboard, alerts, AI recommendations
- **Operations**: All areas, resource allocation map
- **People**: Regional workforce, HR overview
- **Finance**: Regional budget, cost reports
- **Reports**: Regional analytics, custom report runner

---

#### HR / Payroll Tab Bar
```
⌂ Command  │  👥 People  │  💰 Payroll  │  📄 Documents  │  📬 Inbox
```
- **Command**: Payroll status, exceptions, onboarding pipeline
- **People**: Employee directory, profiles, contracts
- **Payroll**: Payroll runs, payslips, calculations
- **Documents**: Contracts, HR documents, templates
- **Inbox**: Leave requests, approvals, compliance alerts

---

#### Project Worker Tab Bar
```
⌂ Today  │  ✓ Tasks  │  📁 Project  │  💬 Chat  │  📤 Upload
```
- **Today**: Active task, deadlines, daily status
- **Tasks**: Assigned task list, priority view
- **Project**: Project overview, timeline, team
- **Chat**: Project chat, mentions
- **Upload**: Quick photo/progress upload

---

#### Project Team Leader Tab Bar
```
⌂ Dashboard  │  👥 Team  │  📁 Projects  │  ✓ Tasks  │  📬 Inbox
```
- **Dashboard**: Team progress, milestones, task completion
- **Team**: Team members, on-site status, task assignments
- **Projects**: Assigned project list, timeline
- **Tasks**: Team task board
- **Inbox**: Escalations, approvals, project updates

---

#### Project OMS Tab Bar
```
⌂ Command  │  📁 Projects  │  👥 Teams  │  📊 Reports  │  📬 Inbox
```
- **Command**: Multi-project health (RAG), resources, risks
- **Projects**: Project list with status indicators
- **Teams**: All teams across assigned projects
- **Reports**: Progress reports, risk register
- **Inbox**: Team Leader escalations, PM directives

---

#### Project Operations Manager Tab Bar
```
⌂ Command  │  📁 Portfolio  │  👥 People  │  💰 Finance  │  📊 Intelligence
```
- **Command**: Portfolio health, budget, client actions
- **Portfolio**: All assigned projects with RAG
- **People**: Project teams, resource allocation
- **Finance**: Project budgets, cost tracking
- **Intelligence**: Portfolio analytics, AI insights

---

#### Project Director Tab Bar
```
⌂ Command  │  📁 Portfolio  │  💰 Finance  │  👥 People  │  ✦ Intelligence
```
- **Command**: Company portfolio, revenue, strategic risks
- **Portfolio**: Full company project list
- **Finance**: Project revenue, profitability
- **People**: Department resource view
- **Intelligence**: AI strategy, forecasting

---

#### Seller Tab Bar
```
⌂ Today  │  🛒 POS  │  📦 Products  │  📬 Inbox  │  👤 Me
```
- **Today**: Register status, today's sales, tasks
- **POS**: Point of sale (register, transactions)
- **Products**: Product lookup, stock info
- **Inbox**: Manager announcements, policy updates
- **Me**: Profile, own sales data, payslip

---

#### Store Manager Tab Bar
```
⌂ Command  │  🏪 Store  │  👥 Staff  │  📦 Inventory  │  📊 Reports
```
- **Command**: Store KPI dashboard, alerts, staff status
- **Store**: Register overview, transaction stream, store settings
- **Staff**: Staff list, schedules, approvals
- **Inventory**: Stock levels, low stock alerts, orders
- **Reports**: Store analytics, daily/weekly reports

---

#### Shop Director Tab Bar
```
⌂ Command  │  🏪 Stores  │  💰 Finance  │  📦 Procurement  │  ✦ Intelligence
```
- **Command**: Network KPIs, store health matrix, alerts
- **Stores**: All stores list, per-store drill-down
- **Finance**: Network P&L, budget, targets
- **Procurement**: Supplier orders, stock management
- **Intelligence**: Retail analytics, AI forecasting

---

#### App Support Specialist Tab Bar
```
🎫 Tickets  │  🔍 Investigate  │  📋 Issues  │  👤 Users  │  📬 Inbox
```

---

#### Data Analyst Tab Bar
```
📊 Analytics  │  📈 Reports  │  🔍 Explore  │  📤 Exports  │  📬 Inbox
```

---

#### QA Tester Tab Bar
```
🧪 Testing  │  🐛 Bugs  │  📋 Cases  │  📊 Coverage  │  📬 Inbox
```

---

### 1.3 "More" Tab — Overflow Navigation

When a role has more than 5 primary destinations, the 5th tab becomes **"More"**.
Tapping "More" opens a **Large Bottom Sheet** containing:
- Grid of glass icon+label cards for secondary modules
- Recently visited sections (glass list at top)
- Pinned favorites (user-configurable)

This keeps the primary tab bar clean while maintaining full access.

---

### 1.4 iPhone Navigation Gestures

| Gesture | Action |
|---|---|
| Swipe right from left edge | Back (Level 3 → 2 → 1) |
| Long press tab bar item | Quick Actions panel (bottom sheet) |
| Long press any card/list item | Context Menu |
| Swipe down on any sheet | Dismiss sheet |
| Pull down on scroll view top | Refresh |
| Long press search bar | Command Palette |
| Two-finger tap | Peek Preview |
| Swipe left on list item | Quick action reveal (delete, archive) |

---

## 2. TABLET NAVIGATION ARCHITECTURE (iPad)

### 2.1 Layout Model

iPad uses a **Sidebar + Content + Inspector** three-panel layout.

```
┌──────────────┬───────────────────────────────────┬────────────────┐
│              │                                   │                │
│   Sidebar    │         Content Area              │   Inspector    │
│  (280pt)     │         (fluid)                   │   (320pt)      │
│              │                                   │   (optional,   │
│              │                                   │   slide-in)    │
└──────────────┴───────────────────────────────────┴────────────────┘
```

**Sidebar** (always visible on 12.9", collapsible on 11"):
- PRV logo + company name (top)
- Role badge + user avatar
- Primary navigation sections (same destinations as iPhone tabs)
- Universal Search (glass input field)
- Inbox + Calendar quick-access icons
- Settings + Security (bottom)

**Content Area:**
- Primary list / grid (Level 2)
- OR split: list on left (30%) + detail on right (70%)

**Inspector Panel** (slide-in from right, glass):
- Triggered by: tapping a list item without navigating, info button, long-press
- Shows: contextual detail, quick actions
- Closes: swipe right, tap outside, X button

### 2.2 iPad Sidebar Structure (CEO Example)

```
PRV Group
👤 John Smith · CEO

[🔍 Search]

▼ COMMAND
  ⌂ Executive Dashboard
  🤖 AI Recommendations
  🔔 Alerts

▼ COMPANIES
  PRV Renovations
  PRV Projects
  PRV Shop
  + Add Company

▼ INTELLIGENCE
  Analytics
  Reports
  Forecasting

▼ FINANCE
  Revenue
  Expenses
  Profit

▼ OPERATIONS
  Workforce
  Projects
  Shop

▼ SYSTEM
  Audit Logs
  Security
  Settings

[📬 Inbox 3]    [📅 Calendar]
```

### 2.3 iPad Multi-Column Navigation

For list → detail flows, iPad uses split view:

```
Level 1 (Sidebar) → Level 2 (Left panel, 35%) → Level 3 (Right panel, 65%)
```

Example:
```
Sidebar: Operations
Left: Store list (Magazin Central ● / Magazin Nord ●)
Right: Magazin Central detail (KPIs, staff, inventory)
Actions → Inspector panel (glass) or Bottom Sheet
```

### 2.4 iPad Keyboard Shortcuts

| Shortcut | Action |
|---|---|
| ⌘K | Command Palette |
| ⌘F | Search |
| ⌘1–5 | Navigate to sidebar section 1-5 |
| ⌘N | New (context-aware) |
| ⌘E | Edit current item |
| ⌘⇧A | Approve pending |
| Esc | Close sheet / go back |
| ⌘, | Settings |

### 2.5 iPad Bottom Sheet Behavior

Same system as iPhone but:
- Max width: 640pt (centered, with dimmed glass sides)
- Small sheet: 30% of screen
- Medium sheet: 50% of screen
- Large sheet: 80% of screen (never full — sidebars remain visible)

---

## 3. DESKTOP NAVIGATION ARCHITECTURE (Web + macOS)

### 3.1 Web Application Layout

```
┌──────────────────────────────────────────────────────────────┐
│  Top Bar: Logo · Role · Company · Search · Inbox · User      │
├────────────┬─────────────────────────────────┬───────────────┤
│            │                                 │               │
│  Sidebar   │       Main Content              │   Inspector   │
│  (240px)   │       (fluid)                   │   (340px)     │
│            │                                 │   (optional)  │
│            │                                 │               │
└────────────┴─────────────────────────────────┴───────────────┘
```

**Top Bar (glass, sticky):**
- Left: PRV logo + company selector (dropdown glass)
- Center: Global search (glass pill input, expands on focus)
- Right: Command Palette button (⌘K) · Notifications · Calendar · User menu

**Sidebar (glass, 240px, collapsible to 64px icon-only):**
- Navigation sections with icons + labels
- Collapse toggle
- Keyboard shortcut hints visible on hover
- Active state: glass tint + left border indicator

**Main Content:**
- Breadcrumbs (sticky, glass strip below top bar)
- Content area: fluid, scrollable
- Responsive grid (1-2-3 columns based on viewport)

**Inspector Panel (glass, 340px, slide from right):**
- Triggered by item selection in list/grid
- No full page transition required for detail view
- Shows: detail summary, quick actions, related items
- Persistent until dismissed

### 3.2 Web Sidebar Structure Per Role

**Worker (Web — rare use case, simplified):**
```
⌂ Today
✓ Tasks
📅 Schedule
📤 Upload
👤 My Profile
```

**Store Manager (Web):**
```
▼ STORE
  ⌂ Dashboard
  🛒 Registers
  📦 Inventory
  📊 Reports

▼ STAFF
  👥 All Staff
  📅 Schedules
  ✓ Approvals

▼ CUSTOMER
  CRM Lookup
  Feedback

[Settings]
```

**CEO (Web):**
```
▼ COMMAND
  ⌂ Executive Dashboard
  🤖 AI Center
  🔔 Critical Alerts

▼ COMPANIES
  PRV Renovations
  PRV Projects
  PRV Shop
  [+ New Company]

▼ INTELLIGENCE
  Analytics
  Reports
  Forecasting
  Custom Builder

▼ FINANCE
  Revenue Dashboard
  Expenses
  Profit & Loss
  Budgets
  Invoices

▼ WORKFORCE
  All Employees
  Attendance
  Payroll
  HR Reports

▼ OPERATIONS
  Projects Portfolio
  Stores Network
  Procurement
  Suppliers
  Fleet
  Tools

▼ SYSTEM
  Security
  Audit Logs
  Integrations
  Settings
```

### 3.3 Breadcrumb System (Web + iPad + macOS)

Breadcrumbs appear as a sticky glass strip below the top bar.

**Format:**
```
PRV Group  /  PRV Renovations  /  Projects  /  Project #125  /  Documents
```

**Rules:**
- Maximum 5 segments shown; middle segments collapse to "..." on narrow viewports
- Each segment is clickable — navigates directly (no back-button dependency)
- Last segment is not a link (current location)
- Animates smoothly when path changes

**Breadcrumb style:**
- Separator: thin slash `/` at 30% opacity
- Font: 12px, SF Pro, 500 weight
- Container: glass strip, 36px height, sticky below top bar
- Active segment: full opacity, 600 weight

### 3.4 macOS Application Layout

```
┌──────────────────────────────────────────────────────────────┐
│  macOS Menu Bar (native)                                     │
├────────────┬─────────────────────────────────┬───────────────┤
│            │  Toolbar (glass, macOS-style)   │               │
│  Sidebar   ├─────────────────────────────────┤   Inspector   │
│  (native   │                                 │   Panel       │
│  macOS)    │       Content                   │   (native     │
│  220px     │                                 │   macOS)      │
│            │                                 │               │
└────────────┴─────────────────────────────────┴───────────────┘
```

- Sidebar: native macOS sidebar (NSOutlineView behavior)
- Toolbar: native macOS toolbar with glass material
- Inspector: trailing column (slide-in, glass)
- Multi-window: full support (⌘N new window, separate context)
- Menu bar integration: File, Edit, View, Navigate, Help menus with role-aware items

---

## 4. DYNAMIC NAVIGATION ARCHITECTURE

### 4.1 Navigation Generation Rules

Navigation is computed at session start from:
```
user.role + user.permissions + user.scope + user.company
```

Result: a navigation manifest object served per session. The client renders tabs/sidebar from this manifest — never hardcoded.

```json
{
  "platform": "ios",
  "role": "store_manager",
  "tabs": [
    { "id": "command", "label": "Command", "icon": "house.fill", "badge": 0 },
    { "id": "store", "label": "Store", "icon": "storefront.fill", "badge": 2 },
    { "id": "staff", "label": "Staff", "icon": "person.2.fill", "badge": 0 },
    { "id": "inventory", "label": "Inventory", "icon": "shippingbox.fill", "badge": 5 },
    { "id": "reports", "label": "Reports", "icon": "chart.bar.fill", "badge": 0 }
  ],
  "search_scope": ["store_products", "store_staff", "store_transactions"],
  "quick_action": { "type": "create_task", "label": "New Task" },
  "fab_visible": true
}
```

### 4.2 Navigation State Persistence

- Last visited tab: persisted across sessions
- Sidebar expansion state (iPad/Web): persisted per device
- Inspector open/closed: persisted per session
- Breadcrumb history: maintained in-session

### 4.3 Navigation Transition Animation

**Tab switch:**
- Cross-fade with scale (0.98 → 1.0) + opacity (0 → 1)
- Duration: 220ms
- Easing: cubic-bezier(0.4, 0, 0.2, 1)

**Push navigation (L2 → L3):**
- Slide from right (iOS default)
- Blurs behind sheet
- Duration: 350ms spring

**Bottom Sheet open:**
- Rise from below + scale (0.95 → 1.0) + fade
- Duration: 400ms spring (0.34, 1.36, 0.64, 1)

**Modal open:**
- Scale up from center (0.94 → 1.0) + fade
- Background dims (glass blur overlay)

**Sheet dismiss:**
- Reverse of open, shorter (300ms)

---

## 5. SEARCH ARCHITECTURE

### 5.1 Universal Search Specification

Search is available on every screen via the floating glass search bar.
It searches across all resources the user has permission to access.

**Search Bar spec:**
- Position: top, floating, 8pt below status bar / Dynamic Island area
- Shape: pill (radius: 100pt)
- Width: full width minus 32pt margins
- Material: Liquid Glass
- Height: 44pt
- Leading icon: magnifying glass (14pt, 35% opacity)
- Placeholder: "Search PRV..." (role-context aware)
- Microphone icon trailing: voice search
- On tap: expands to Search Overlay

### 5.2 Search Overlay

Triggered by tapping the search bar.

**Overlay behavior:**
- Background: existing content blurs (blur 20pt + darken 30%)
- Search field expands to full width + becomes first responder
- Keyboard appears with spring animation
- Cancel button slides in from right

**Search Overlay Sections:**

```
[Search input field active] [Cancel]
──────────────────────────────────────
Recent Searches
  • Maria Lungu          (employee)
  • Magazin Central      (store)
  • Project #125         (project)

Suggested
  • This week's invoices
  • Active projects

──────────────────────────────────────
[Results appear here as user types]
```

**Results structure (as user types):**
```
[Results — 24 found for "mag"]

STORES (3)
  🏪 Magazin Central     ●Online    →
  🏪 Magazin Nord        ●Partial   →
  🏪 Magazin Vest        ●Closed    →

EMPLOYEES (8)
  👤 Magdalena Iordan     Casieră   →
  👤 Marius Pop           Manager   →

PROJECTS (6)
  📁 Magasin Refurb Q2              →
  ...

DOCUMENTS (7)
  📄 Contract Magazine 2026        →
  ...
```

**Search rules:**
- Results begin after 1 character
- Debounce: 150ms
- Max results per category: 5 (expandable via "See all X")
- Results filtered by: role permissions + scope
- No result ever appears that the user cannot access
- Results ranked by: recency + role relevance

### 5.3 Search Scope Per Role

| Role | Can Search |
|---|---|
| Worker | Own tasks, own schedule, team directory (names) |
| Team Leader | Team members, team tasks, team schedule |
| OMS | Area teams, area tasks, area sites, materials |
| Operations Manager | Regional: all of above + budgets |
| HR / Payroll | All employees, contracts, payroll records |
| Project Worker | Assigned project: tasks, documents, team, chat |
| Project Director | All projects company-wide: teams, budgets, clients |
| Seller | Products (own store), own transaction history |
| Store Manager | Own store: products, staff, transactions, customers |
| Shop Director | Network: all stores, products, staff, suppliers |
| CEO | Global: everything (filtered by permission, not scope) |
| System Admin | Users, roles, audit logs, sessions (not business data) |
| Data Analyst | All business data (read/aggregate, no personal) |

### 5.4 Voice Search

Available on mobile. Triggered by microphone icon.
Converts speech to search query.
Same permission model as text search.

---

## 6. COMMAND PALETTE ARCHITECTURE

### 6.1 Overview

The Command Palette is PRV's **Spotlight-equivalent** — a glass overlay that provides instant access to any feature, screen, record, or action from anywhere in the app.

**Inspired by:** Apple Spotlight · Linear · Raycast · Notion

**Trigger:**
- Mobile: long-press search bar → Command Palette (glass sheet, full-width)
- Web/macOS: ⌘K
- iPad: ⌘K (external keyboard) or long-press search bar

### 6.2 Command Palette Spec

**Appearance:**
- Position: top-center (Web/macOS: centered at 20% from top)
- Width: 640px max (Web) / full-width minus 32pt (Mobile)
- Material: Liquid Glass (heavy — blur 64pt, saturation 220%, dark tint)
- Border: 1pt, rgba(255,255,255,0.14)
- Shadow: 0 40px 100px rgba(0,0,0,0.9)
- Top edge specular: full-width gradient
- Animation in: scale (0.96→1) + translateY (-8px→0) + blur (4px→0) — spring
- Animation out: reverse, 250ms

**Structure:**
```
┌─────────────────────────────────────────────────────┐  ← specular highlight
│  ⌘  [Search or type a command...]            [ESC]  │
├─────────────────────────────────────────────────────┤
│  RECENT                                             │
│  → ⌂ Executive Dashboard                           │
│  → 📁 Project #125 — Documents                     │
│                                                     │
│  NAVIGATE                                           │
│  → ⊞ Operations                                    │
│  → 💰 Finance                                      │
│                                                     │
│  QUICK CREATE                                       │
│  → + New Task                                       │
│  → + New Project                                    │
│  → + New Employee                                   │
│                                                     │
│  [As user types — results appear here]              │
└─────────────────────────────────────────────────────┘
  ↑↓ navigate  ↵ open  ⌘↵ open in new tab  ESC close
```

### 6.3 Command Types

| Category | Examples |
|---|---|
| Navigate | "Go to Finance" · "Open Projects" · "Open Settings" |
| Search | "Find Maria Lungu" · "Search invoices" |
| Create | "New task" · "New employee" · "New project" |
| Actions | "Approve pending" · "Export report" · "Run payroll" |
| System | "Change company" · "View audit log" · "Lock screen" |
| AI | "Ask AI: revenue forecast" · "AI: optimize schedule" |

### 6.4 Command Palette Permission Filtering

Every command is filtered against current role + scope:
- "New Company" command: only visible to CEO
- "Run Payroll" command: only visible to HR/Payroll
- "View Audit Log" command: only visible to CEO, Co-CEO, System Admin
- Navigation commands only show accessible destinations

### 6.5 AI in Command Palette

Users can type natural language queries:
```
"Show me this week's revenue vs last week"
"How many employees are on shift right now?"
"Which project is most at risk?"
"Create a task for tomorrow's site visit"
```

AI responds inline (glass expandable result) or navigates to relevant screen.

---

## 7. UNIVERSAL INBOX ARCHITECTURE

### 7.1 Overview

The Universal Inbox aggregates all communications, notifications, approvals, mentions, and tasks requiring attention into a single glass panel.

**Access:** one tap — inbox icon in top bar / tab bar, or swipe gesture.

### 7.2 Inbox Categories

```
ALL  │  APPROVALS  │  MENTIONS  │  TASKS  │  SYSTEM
```

**All:** chronological stream, all types
**Approvals:** pending approval items only (sorted by urgency)
**Mentions:** @mentions in comments, chat, tasks
**Tasks:** task assignments and updates
**System:** platform notifications, security alerts

### 7.3 Inbox Item Structure

```
┌──────────────────────────────────────────────────────┐
│  [Avatar / Icon]  Title text                3m ago   │
│                   Subtitle / description             │
│                   [Action button]  [Secondary]       │
└──────────────────────────────────────────────────────┘
```

**Swipe actions on inbox items:**
- Swipe left: Archive
- Swipe right: Mark Done / Approve (if approval item)
- Long press: Context menu (Reply, Forward, Snooze, Delete)

### 7.4 Inbox as Bottom Sheet

On iPhone: Inbox opens as a Large Bottom Sheet from any screen.
On iPad/Web: Inbox opens as an Inspector Panel from the right.

**Inbox Bottom Sheet spec:**
- Height: Large (90% of screen)
- Has sticky segmented control at top (ALL / APPROVALS / MENTIONS / TASKS / SYSTEM)
- Items are glass list rows
- Empty state: glass card with appropriate message

### 7.5 Inline Approvals

Approval items in inbox have inline approve/reject without navigating away:
```
[📋 Leave Request]  Maria Lungu · 3 days annual leave
                    Apr 14–16, 2026 · 3 business days
                    [✓ Approve]  [✕ Reject]  [Details →]
```

Approve action: confirmation bottom sheet (small) → approved → item dismissed with spring animation.

---

## 8. BOTTOM SHEET ARCHITECTURE

### 8.1 Overview

Bottom Sheets are the primary interaction layer in PRV.
They replace: separate screens, modal overlays, dialogs, drawer panels.

**Core principle:** Keep users in context. Never navigate when a sheet suffices.

### 8.2 Bottom Sheet Sizes

| Size | Height | Use Cases |
|---|---|---|
| **Micro** | 200pt (+ safe area) | Confirmations, single action, status |
| **Small** | ~30% of screen | Quick actions panel, simple filters, toast-like confirmation |
| **Medium** | ~60% of screen | Forms, details, settings panels, approval workflows |
| **Large** | ~90% of screen | Full content, inbox, complex workflows, galleries |
| **Full** | 100% (with handle) | Full-screen sheet (alternative to push navigation) |

### 8.3 Bottom Sheet Visual Spec

**Container:**
- Shape: rounded top corners only (radius 32pt top, 0pt bottom)
- Material: Liquid Glass (dark: rgba(12,12,18,0.97) · light: rgba(248,248,252,0.97))
- Blur: 64pt saturate(220%)
- Top edge specular: gradient line (rgba(255,255,255,0.30))
- Shadow above: 0 -8px 40px rgba(0,0,0,0.4) (dark only)

**Grabber handle:**
- Width: 36pt
- Height: 4pt
- Radius: 2pt
- Color: rgba(255,255,255,0.22)
- Centered, 12pt from top of sheet
- Visible on all sheets except Micro

**Fixed header (Medium and larger):**
- Contains: title (17pt, 700 weight) + close button (X glass pill)
- Separator: 1pt rgba(255,255,255,0.08) below header

**Content area:**
- Scrollable (standard momentum scrolling)
- Insets: 24pt horizontal, 16pt vertical
- Safe area respected at bottom

**Footer actions (optional):**
- Glass separator above
- 1–2 glass buttons (primary + secondary)
- Padding: 16pt horizontal, 12pt vertical + safe area

### 8.4 Bottom Sheet Interactions

| Interaction | Action |
|---|---|
| Swipe down (any velocity) | Dismiss |
| Swipe down fast (flick) | Dismiss with spring |
| Swipe down slow (drag) | Follow finger, spring back if released above threshold |
| Drag past Large → Full | Expand to full |
| Tap outside sheet (scrim) | Dismiss |
| Background dim | rgba(0,0,0,0.4) blur(8pt) — taps dismiss |

### 8.5 Bottom Sheet Animation

**Open:**
```
from: translateY(100%) opacity(0)
to:   translateY(0) opacity(1)
easing: cubic-bezier(0.34, 1.36, 0.64, 1) — spring with slight overshoot
duration: 400ms
```

**Dismiss:**
```
from: translateY(0) opacity(1)
to:   translateY(100%) opacity(0)
easing: cubic-bezier(0.4, 0, 0.2, 1)
duration: 300ms
```

**Size change (Medium → Large):**
```
height animated with spring
content cross-fades
duration: 350ms spring
```

### 8.6 Bottom Sheet Types

**Type 1: Quick Actions Panel**
- Size: Small
- Content: 3–6 glass action buttons in a grid or list
- No input fields
- Example: long-press on project card

**Type 2: Detail Preview Sheet**
- Size: Medium or Large
- Content: item detail (read-focused), with action buttons in footer
- Example: tap on employee in team list

**Type 3: Form Sheet**
- Size: Medium or Large
- Content: form fields (glass inputs)
- Footer: Save / Cancel buttons
- Example: create new task

**Type 4: Approval Sheet**
- Size: Small or Medium
- Content: approval item summary, context, approve/reject buttons
- Example: inline approval from inbox

**Type 5: Filter Sheet**
- Size: Small or Medium
- Content: filter options (glass toggles, radio groups, date pickers)
- Footer: Apply / Reset
- Example: filter employee list

**Type 6: Confirmation Sheet**
- Size: Micro
- Content: "Are you sure?" message + Confirm / Cancel
- Example: delete, archive, critical actions

**Type 7: Settings Sheet**
- Size: Large
- Content: glass settings list (cells with toggles, chevrons)
- Example: notification preferences

**Type 8: Gallery Sheet**
- Size: Full
- Content: photo gallery, full-screen images with navigation
- Example: project photos

---

## 9. CONTEXT MENU ARCHITECTURE

### 9.1 Overview

Context Menus appear on long-press (mobile) or right-click (web/macOS).
They are always glass, always role-aware, and always relevant to the pressed item.

### 9.2 Context Menu Spec

**Container:**
- Shape: rounded rectangle (radius 24pt)
- Material: Liquid Glass (heavy blur, 60pt, saturation 220%)
- Border: 1pt rgba(255,255,255,0.14)
- Shadow: 0 20px 60px rgba(0,0,0,0.8)
- Min width: 220pt
- Max width: 280pt
- Top edge specular: gradient line

**Items:**
- Height: 44pt per item
- Padding: 12pt horizontal
- Icon: 20pt, leading
- Label: 15pt, 400 weight
- Shortcut (web): trailing, 11pt, muted
- Destructive items: muted color (not red — B&W palette)
- Separator: 1pt rgba(255,255,255,0.06)

**Animation:**
- Appear: scale (0.92→1) + translateY (6px→0) + blur (3px→0)
- Spring: cubic-bezier(0.34, 1.56, 0.64, 1)
- Duration: 280ms

### 9.3 Context Menus Per Item Type

**Project Card:**
```
Open
Edit
Duplicate
Share Link
Export Report
──────────────
Archive
```

**Employee Item:**
```
View Profile
Send Message
Assign Task
View Schedule
──────────────
Edit Details
Export Record
──────────────
Suspend Account  (manager+ only)
```

**Store Item:**
```
View Dashboard
Edit Details
View Staff
View Inventory
Generate Report
──────────────
Set Alert
──────────────
Archive Store
```

**Product Item:**
```
Edit Product
Update Stock
Duplicate
──────────────
View History
Export Data
──────────────
Delete
```

**Document:**
```
Open
Download
Share (expiring link)
Preview
──────────────
Move to Vault  (if applicable)
──────────────
Archive
Delete
```

**Transaction:**
```
View Details
Print Receipt
Process Refund  (manager+ only)
──────────────
Export
```

### 9.4 Context Menu Permission Filtering

Every context menu item evaluates the user's role + permissions.
Unavailable items are hidden — not grayed out.
Destructive items appear below a separator, never at top.

---

## 10. FLOATING ACTION BUTTON (FAB) ARCHITECTURE

### 10.1 Overview

The FAB is the primary **creation entry point** on mobile.
It floats above the tab bar, role-aware, context-aware.

### 10.2 FAB Spec

- Position: right side, above tab bar (16pt gap)
- Size: 52pt diameter
- Shape: circle
- Material: Liquid Glass (slightly heavier than cards)
- Icon: 22pt, SF Symbols, white
- Shadow: 0 8px 24px rgba(0,0,0,0.5)
- Spring animation on tap: scale 0.92 → 1.08 → 1.0

### 10.3 FAB Action Per Role

| Role | FAB Action | Icon |
|---|---|---|
| Worker | Upload Photo | camera |
| Team Leader | Create Task | plus.circle |
| OMS | Create Issue / Report | exclamationmark.circle |
| Operations Manager | New Announcement | megaphone |
| HR / Payroll | New Employee | person.badge.plus |
| Project Worker | Log Progress | pencil.circle |
| Project Team Leader | Create Task | plus.circle |
| Project OMS | Flag Risk | flag |
| Project Operations Manager | New Milestone | flag.checkered |
| Project Director | New Project | folder.badge.plus |
| Seller | New Transaction | cart.badge.plus |
| Store Manager | New Announcement | megaphone |
| Shop Director | New Promotion | tag |
| CEO | New Company / Quick Create | plus |
| Co-CEO | Quick Create | plus |
| System Admin | New User | person.badge.plus |
| Data Analyst | New Report | chart.bar.doc.horizontal |
| QA Tester | Report Bug | ant |
| App Support | New Ticket | ticket |

### 10.4 FAB Long-Press (Expanded)

Long-pressing the FAB expands it into a **Quick Create bottom sheet** (Small size):
- 3–5 creation options relevant to current context
- Glass icon+label list
- Closes with spring animation

---

## 11. WIDGET ARCHITECTURE

### 11.1 Home Screen Widgets (iOS/Android)

PRV provides widgets in three standard sizes. All widgets are role-aware — content generated from user's active role and scope.

**Small Widget (2×2):**
- Single metric display
- Role-specific primary KPI
- Last updated timestamp (small)
- PRV logo (bottom-right, small)
- Material: glass-inspired (OS widget limitations apply)

Examples per role:
| Role | Small Widget Content |
|---|---|
| Worker | Shift status + elapsed time |
| Team Leader | Team attendance (X/Y) |
| OMS | Area capacity % |
| Seller | Register sales today (₺) |
| Store Manager | Store revenue vs target |
| CEO | Total revenue today (₺) |

**Medium Widget (2×4):**
- Primary metric (large number)
- Secondary metric + trend
- Mini sparkline or status indicators
- 3–4 row list of recent items

Examples per role:
| Role | Medium Widget Content |
|---|---|
| Worker | Shift timer + 2 upcoming tasks |
| Team Leader | Attendance + top 3 pending tasks |
| Store Manager | Revenue ₺ + Target % + Staff count + Stock alerts |
| CEO | Revenue ₺ + Profit MTD + Active projects + Alert count |

**Large Widget (4×4):**
- Dashboard summary (primary KPIs grid)
- Recent activity list (5 items)
- Action shortcut strip (3 quick actions)

### 11.2 Lock Screen Widgets (iOS 16+)

**Circular (2×2):**
- Single number or status
- Examples: Shift timer, Team count, Revenue ₺ abbreviated

**Rectangular (2×5):**
- Label + value + secondary
- Examples: "Store Revenue · ₺94,200 · ↑14% vs yesterday"

**Inline (single line):**
- Single metric above clock
- Example: "PRV · 7/10 team · 3 tasks"

### 11.3 Dashboard Widgets (In-App)

Dashboard widgets are glass cards within the app dashboard, configurable per role.

**Widget types:**
- KPI Number Card (single metric, trend)
- Sparkline Card (metric + mini chart)
- Status List Card (3–5 items with indicators)
- Calendar Card (upcoming events, mini)
- Alert Card (critical items, red accent)
- AI Insight Card (AI recommendation, expandable)
- Map Card (store locations / project sites)
- Progress Card (milestone / target bar)

**Widget configurability:**
- L4 roles (CEO, Co-CEO, Directors): full widget customization
- L3 roles (Managers): can reorder, cannot add/remove
- L2 roles (Workers, Sellers): fixed widget set

---

## 12. DYNAMIC ISLAND ARCHITECTURE

### 12.1 Overview

The Dynamic Island is PRV's **always-visible live context indicator** on iPhone 14 Pro and later.

### 12.2 Dynamic Island States

| State | Trigger | Size |
|---|---|---|
| Compact | App in foreground | Small pill (left + right split) |
| Minimal | App in background | Very small dot |
| Expanded | Tap compact state | Larger pill, shows more data |
| Live Activity | Ongoing process | Lock screen + island integration |

### 12.3 Dynamic Island Content Per Role

*(Cross-referenced from ROLE_ARCHITECTURE.md — full spec)*

**Compact Left | Compact Right | Expanded | Tap Action:**

| Role | Left | Right | Expanded | Tap |
|---|---|---|---|---|
| CEO | Revenue ₺ (live) | Alert count 🔴 | Revenue · Profit · Projects · Alerts | Command Dashboard |
| Co-CEO | Revenue ₺ | Approval count | Revenue · Approvals · Companies · Alerts | Command Dashboard |
| System Admin | Health 🟢/🟡/🔴 | Sessions count | Uptime · Errors · Sessions · Events | System Dashboard |
| Worker | Shift HH:MM:SS | Break indicator | Shift elapsed · Task · Break · Shift end | Today screen |
| Team Leader | X/Y present | Approvals 🔴 | Present · Absent · Tasks due · Approvals | Team Dashboard |
| OMS | Areas: X active | Risk count | Teams · Sites · Materials · Risks | Area Dashboard |
| Ops Manager | Regional % | Escalations | Areas · Budget · Workforce · Alerts | Regional Command |
| HR/Payroll | Payroll: X days | Exceptions | Payroll date · Exceptions · Leave Q | HR Dashboard |
| Project Worker | Task (truncated) | Deadline | Task · Project · Deadline · Progress | Active Task |
| Project TL | X/Y tasks | On-site count | Tasks · Members · Photos pending | Team Project |
| Project OMS | 🟢X 🟡Y 🔴Z | Risk flags | Projects RAG · Resources · Risks | Portfolio |
| Project OPM | Budget X% | Client actions | Budget · Milestones · Clients | Portfolio |
| Project Dir | Proj revenue ₺ | Strategic risks | Revenue · On-time · Clients | Company Portfolio |
| Seller | Txn ₺ / Idle | Queue: X | Transaction · Items · Daily sales | POS |
| Store Manager | Revenue ₺ | Staff: X/Y | Revenue · Target · Staff · Alerts | Store Dashboard |
| Shop Director | Network ₺ | 🟢X 🔴Y | Network rev · Target · Stores | Network Command |
| App Support | Tickets: X | P0 count 🔴 | Open · Mine · SLA breach · Critical | Ticket Queue |
| Data Analyst | Job: running | Queue: X | Active jobs · Quality · Pending | Analytics |
| QA Tester | Session active | Bugs: X | Tests run · Coverage · Bugs P0 | Test Dashboard |

### 12.4 Dynamic Island Tap Interaction

- **Single tap compact**: Expand Dynamic Island
- **Tap expanded**: Open app at relevant screen
- **Long press expanded**: Glass Quick Actions mini-panel emerges from island

### 12.5 Dynamic Island Activity Rules

- PRV shows 1 Live Activity at a time
- If multiple active (e.g. shift timer + active transaction): priority order applies (transaction > shift)
- User can configure priority in notification settings

---

## 13. LIVE ACTIVITIES ARCHITECTURE

### 13.1 Overview

Live Activities provide persistent, real-time information on the Lock Screen and in the Dynamic Island without opening the app.

### 13.2 Live Activity Templates

PRV defines these Live Activity types:

**Type 1: Attendance Session**
- Trigger: Worker clocks in
- Lock screen: Shift timer (HH:MM:SS) · Current task · Shift end time
- Island compact: Timer · Task indicator
- Island expanded: Timer · Task · Break status · Shift progress bar
- Ends: on clock-out

**Type 2: Active Transaction (POS)**
- Trigger: Transaction started at register
- Lock screen: Amount · Items count · Customer number
- Island compact: ₺ Amount
- Island expanded: Amount · Items · Payment method pending
- Ends: on transaction complete / void

**Type 3: Project Milestone**
- Trigger: Milestone deadline within 24 hours
- Lock screen: Milestone name · Deadline countdown · Project
- Island compact: Countdown
- Island expanded: Milestone · Project · % complete · Owner
- Ends: on milestone marked complete / deadline passed

**Type 4: Approval Pending**
- Trigger: High-priority approval waiting for user
- Lock screen: Approval type · From · Since
- Island compact: Approval badge
- Island expanded: Type · Requester · Action buttons (Approve/Reject)
- Ends: on approval actioned

**Type 5: Payroll Processing**
- Trigger: Payroll run in progress
- Lock screen: Payroll run status · Progress % · ETA
- Island compact: Progress bar
- Island expanded: Run name · Progress · Employees processing · ETA
- Ends: on payroll run complete / error

**Type 6: Delivery / Order in Transit**
- Trigger: Order dispatched
- Lock screen: Order # · Status · ETA
- Island compact: Status dot
- Island expanded: Order · Items · Driver · ETA map
- Ends: on delivery confirmed

### 13.3 Live Activity Expiry

- All Live Activities expire after 8 hours if not ended by trigger
- Expired activities show "Ended" state for 30 seconds then dismiss
- Maximum 2 Live Activities simultaneously per app

---

## 14. UNIVERSAL CALENDAR ARCHITECTURE

### 14.1 Overview

A unified calendar view accessible from any screen. Filtered by role + scope.

**Access:** Calendar icon in top bar / tab item / inbox shortcut.

### 14.2 Calendar Event Types

| Type | Visibility By Role |
|---|---|
| Shifts / Work Schedule | Own shifts (all) · Team shifts (TL+) · Regional (OMS+) |
| Project Milestones | Assigned project members + PMs |
| Leave (team) | Team Leader+ for own team |
| Leave (company) | HR/Payroll for company |
| Order Deliveries | Store Manager+ |
| Payment Deadlines | Finance roles |
| Approval Deadlines | Relevant approval holders |
| Meetings | Role-based meeting invites |
| Task Deadlines | Assigned task owners |

### 14.3 Calendar Views

- **Day view:** Hourly slots, glass event blocks
- **Week view:** 7-column grid, glass blocks
- **Month view:** Calendar grid, event dots
- **Agenda view:** Scrollable chronological list (preferred for mobile)

### 14.4 Calendar Event Actions

Tapping an event → Quick Preview Bottom Sheet:
- Event title, type, time
- Related item (project, employee, order)
- Quick action buttons (Join meeting, Approve, View project)

---

## 15. PEEK PREVIEW ARCHITECTURE

### 15.1 Overview

Peek Preview allows users to see a full-detail preview of an item without navigating away from the current screen. All peek functionality is now powered by the Universal Entity Preview Engine (§16).

**Trigger:** long-press (mobile) or hover + ⌥ (web/macOS)

### 15.2 Peek Preview Spec

- Appears behind the Context Menu on long-press (85% scale, Glass 3)
- Content rendered by Universal Entity Preview Engine (§16.4–16.5)
- Navigation: items inside peek are not navigable (read-only preview)
- "Open Full Profile" footer CTA navigates to full entity screen

### 15.3 Peek Preview Content Per Item Type

**Employee peek:**
```
[Avatar] Name · Role · Department
Status: Online / On shift / Off
Attendance streak: X days
Today's tasks: X/Y complete
[Message]  [View Full Profile]
```

**Project peek:**
```
[Icon] Project #125 — Name
Status: 🟢 On Track  Budget: 78% used
Team: X members  Milestone: Due Apr 18
Progress: ███████░░░ 72%
[View Project]
```

**Store peek:**
```
[Icon] Magazin Central
Status: ●Online  Staff: 7/10
Revenue today: ₺94,200 (Target: ₺90,000 ✓)
Alerts: ⚠ 2 low stock items
[View Store]
```

---

## 16. UNIVERSAL ENTITY PREVIEW ENGINE

### 16.1 Overview

The Universal Entity Preview Engine is a single, reusable preview system shared across all PRV entities. Every future module automatically inherits preview capabilities with zero additional implementation. There is exactly one preview implementation in the entire PRV ecosystem.

**Principle:** Tap → Preview Sheet. Navigate → Full Screen. No exceptions.

### 16.2 Supported Entities

| Entity | Preview Trigger | Full Screen Route |
|--------|----------------|-------------------|
| Employee | Tap avatar / row | `/people/employees/:id` |
| Client | Tap name / row | `/crm/clients/:id` |
| Supplier | Tap name / row | `/procurement/suppliers/:id` |
| Project | Tap card | `/projects/:id` |
| Product | Tap card / row | `/shop/products/:id` |
| Order | Tap row | `/shop/orders/:id` |
| Invoice | Tap row | `/finance/invoices/:id` |
| Document | Tap row | `/documents/:id` |
| Vehicle | Tap card / row | `/fleet/vehicles/:id` |
| Tool | Tap card / row | `/tools/:id` |
| Team | Tap chip / card | `/people/teams/:id` |
| Company | Tap card | `/companies/:id` |

### 16.3 Interaction Model — Four Gestures

Every entity responds to the same four gestures uniformly:

```
TAP
  → Opens Quick Preview Sheet (Medium Bottom Sheet)
  → Content: summary card + key metrics + top actions
  → Does NOT navigate away from current screen

LONG PRESS (Haptic Touch)
  → Opens Context Menu (glass, role-filtered)
  → Simultaneously shows Peek Preview behind menu
  → Dismiss menu → Peek Preview fades out

DOUBLE TAP
  → Toggle Favorite / Pin for entity
  → Haptic: selection feedback
  → Shows micro toast: "Added to Favorites" / "Removed"

SWIPE LEFT (list rows only)
  → Reveals Quick Action strip (1–3 destructive/secondary actions)
  → Red-zone swipe → confirm destructive action
```

### 16.4 Quick Preview Sheet Spec

Presented as a Medium Bottom Sheet (60% height, expandable to Large).

```
┌──────────────────────────────────────┐
│  ▬▬▬  (grabber)                      │
│                                      │
│  [ENTITY HEADER]                     │
│  Avatar/Thumbnail · Name · Badge     │
│  Subtitle line · Status pill         │
│                                      │
│  ┌──────────────────────────────┐    │
│  │  KEY METRICS (3–4 chips)     │    │
│  └──────────────────────────────┘    │
│                                      │
│  [SECTION: Primary Info]             │
│  Role-appropriate fields             │
│                                      │
│  [SECTION: Quick Stats]              │
│  Glass stat cards (2-column)         │
│                                      │
│  [ACTION STRIP]                      │
│  Pill buttons — max 4 actions        │
│                                      │
│  [Open Full Profile →]               │
│                                      │
└──────────────────────────────────────┘
```

**Visual spec:**
- Material: Glass 3 (rgba(255,255,255,0.16) + blur 64pt)
- Top specular: rgba(255,255,255,0.30) gradient line
- Corner radius: 32pt top
- Header avatar: 56pt circle, glass border
- Status pill: Glass badge, white text, B&W
- Action buttons: Glass pill, 36pt height, white 95% label
- Footer "Open Full Profile": Glass 1 row, arrow.up.right SF Symbol

### 16.5 Entity-Specific Preview Content

**Employee Preview Sheet:**
```
Header:    [Avatar 56pt] · Full Name · Role Badge
Subtitle:  Department · Team
Status:    Presence indicator (see §16.8)
Fields:    Phone · Email · Employee ID
Metrics:   Attendance streak · Active projects · Open tasks · Shift status
Social:    LinkedIn / WhatsApp / Email icons (see §16.6)
Actions:   [Call] [Message] [Email] [View Projects]
Footer:    [Open Full Profile →]
```

**Client Preview Sheet:**
```
Header:    [Avatar 56pt] · Full Name · Client Badge
Subtitle:  Company (if B2B) · Account Manager
Status:    Account status pill
Fields:    Phone · Email · City
Metrics:   Active projects · Total contract value · Open invoices · Last contact
Social:    LinkedIn / Website / WhatsApp icons
Actions:   [Call] [Email] [Message] [Open Invoices]
Footer:    [Open Full Profile →]
```

**Supplier Preview Sheet:**
```
Header:    [Logo 56pt] · Company Name · Supplier Badge
Subtitle:  Contact Person · Category
Status:    Active/Inactive/Review pill
Fields:    Phone · Email · CUI
Metrics:   Open orders · Delivery rating · Products count · Last delivery
Social:    LinkedIn / Website icons
Actions:   [Call] [Email] [Orders] [Deliveries]
Footer:    [Open Full Profile →]
```

**Project Preview Sheet:**
```
Header:    [Image/Icon 56pt] · Project Name · Status Badge
Subtitle:  Client · Project Director
Status:    On Track / At Risk / Delayed pill
Fields:    Start date · Deadline · Budget used %
Metrics:   Progress % · Team size · Open tasks · Days remaining
Actions:   [Photos] [Documents] [Tasks] [Team]
Footer:    [Open Full Project →]
```

**Product Preview Sheet:**
```
Header:    [Image 56pt] · Product Name · SKU Badge
Subtitle:  Category · Supplier
Status:    In Stock / Low Stock / Out of Stock
Fields:    Price · Cost · Margin
Metrics:   Stock qty · Monthly sales · Reserved qty · Reorder point
Actions:   [Add to Order] [View Inventory] [Analytics]
Footer:    [Open Product →]
```

**Order Preview Sheet:**
```
Header:    [Icon 56pt] · Order #XXXX · Status Badge
Subtitle:  Customer · Sales person
Status:    Pending / Confirmed / Shipped / Delivered
Fields:    Order date · Delivery date · Total
Metrics:   Items count · Payment status · Delivery ETA
Actions:   [Invoice] [View Delivery] [Contact Customer]
Footer:    [Open Order →]
```

**Invoice Preview Sheet:**
```
Header:    [Icon 56pt] · Invoice #XXXX · Status Badge
Subtitle:  Client · Due date
Status:    Draft / Sent / Paid / Overdue
Fields:    Issue date · Due date · Total · VAT
Metrics:   Days until due / overdue · Payment history · Series
Actions:   [Send] [Download PDF] [Mark Paid]
Footer:    [Open Invoice →]
```

**Document Preview Sheet:**
```
Header:    [File icon 56pt] · Document Name · Type Badge
Subtitle:  Owner · Project association
Status:    Draft / Review / Approved / Signed
Fields:    Version · Last modified · File size
Metrics:   Collaborators · Comments count · Signature status
Actions:   [Open] [Share] [Download]
Footer:    [Open Full Document →]
```

**Vehicle Preview Sheet:**
```
Header:    [Photo 56pt] · Make + Model · Plate Badge
Subtitle:  Driver · Fleet category
Status:    Available / In Use / Maintenance / Inactive
Fields:    Year · Fuel · Mileage
Metrics:   Next service km · Insurance expiry · Active assignments
Actions:   [Assign] [View Log] [Maintenance]
Footer:    [Open Vehicle →]
```

**Tool Preview Sheet:**
```
Header:    [Photo 56pt] · Tool Name · Category Badge
Subtitle:  Location · Assigned to
Status:    Available / In Use / Maintenance
Fields:    Serial · Purchase date · Condition
Metrics:   Current assignment · Next calibration · Usage hours
Actions:   [Check Out] [Report Issue] [View History]
Footer:    [Open Tool →]
```

**Team Preview Sheet:**
```
Header:    [Icon 56pt] · Team Name · Department Badge
Subtitle:  Team Leader · Department
Status:    Active / Inactive
Fields:    Member count · Location / Store
Metrics:   Active projects · Avg attendance · Open tasks · Team score
Actions:   [View Members] [View Schedule] [Message Team]
Footer:    [Open Team →]
```

**Company Preview Sheet:**
```
Header:    [Logo 56pt] · Company Name · Plan Badge
Subtitle:  CEO name · Sector
Status:    Active / Onboarding / Suspended
Fields:    CUI · Address · Founded
Metrics:   Employees · Stores · Active projects · Monthly revenue
Actions:   [View Dashboard] [View Staff] [Generate Report]
Footer:    [Open Company →]
```

### 16.6 Social Profiles Integration

Social profile links are optional, permission-controlled, and GDPR-compliant.

**Supported networks:**
| Icon | Network | Opens | Required Permission |
|------|---------|-------|-------------------|
| linkedin.svg (SF style) | LinkedIn | Native app / browser | `social_profiles.view` |
| facebook.svg (SF style) | Facebook | Native app / browser | `social_profiles.view` |
| instagram.svg (SF style) | Instagram | Native app / browser | `social_profiles.view` |
| x.svg (SF style) | X (Twitter) | Native app / browser | `social_profiles.view` |
| tiktok.svg (SF style) | TikTok | Native app / browser | `social_profiles.view` |
| globe (SF Symbol) | Website | In-app browser | `social_profiles.view` |
| phone.fill (SF Symbol) | WhatsApp Business | WhatsApp deep link | `social_profiles.view` |

**Display rules:**
- Show only configured networks (empty slots never shown)
- Max 5 icons in preview — overflow via "+N more" tap
- Icons: 28pt, SF Symbol style monochrome, white 65%
- Tap opens directly without confirmation dialog
- Edit requires: `social_profiles.edit` permission

**GDPR rules:**
- Social links stored with explicit consent flag per field
- Visibility governed by role permission `social_profiles.view`
- Export/Download of social data requires `data_export.gdpr` permission
- Employee-owned fields (LinkedIn, personal Instagram) are self-managed
- Company-owned fields (WhatsApp Business, Website) managed by managers

### 16.7 Peek Preview (Long Press Layer)

Replaces the legacy §15.3 Peek content. All peeked entities now use the Quick Preview Sheet content, rendered at 85% scale behind the context menu.

```
Long Press gesture sequence:
  1. Haptic: heavy impact (0ms)
  2. Peek preview fades in (200ms, scale 0.92→1, blur 40px→0)
  3. Context menu appears above (280ms spring)
  4. User selects action → action fires, both dismiss
  5. User taps outside → both dismiss (spring-out)
  6. User taps "Open" in context menu → full navigation
```

### 16.8 Presence System

Applies to: Employee, Client (online portal), and any person-type entity.

| Status | Indicator | Color Token | Description |
|--------|-----------|-------------|-------------|
| Available | ● Filled circle | white 95% | Online, ready to respond |
| Busy | ◐ Half-fill | white 65% | Active but occupied |
| In Meeting | 📅 Calendar mini | white 65% | Calendar block active |
| On Site | 📍 Location mini | white 65% | Checked in on-site |
| Offline | ○ Empty circle | white 25% | No active session |

**Display positions:**
- Preview Sheet header: 10pt indicator dot on avatar, bottom-right
- List row: 8pt dot trailing the name
- Contact Card: status label below name

**Data source:**
- Derived from: last seen timestamp + active attendance record + calendar sync
- Refresh: real-time via Supabase Realtime subscription (presence channel per company)
- Privacy: `presence.view` permission required; employees can set manual override

### 16.9 Digital Business Cards

Available for: Employee, Manager, Executive entities.

**Card content:**
```
┌──────────────────────────────────────┐
│  [Company Logo]          [QR Code]   │
│                                      │
│  [Avatar 64pt]                       │
│  Full Name                           │
│  Job Title · Department              │
│                                      │
│  📱  +40 xxx xxx xxx                 │
│  ✉   email@company.com               │
│  🌐  website.com                     │
│                                      │
│  [LinkedIn] [X] [Instagram]          │
│                                      │
│  [Share]  [Save to Contacts]         │
└──────────────────────────────────────┘
```

**QR Code contents:** vCard 4.0 format, includes name, title, phone, email, company, LinkedIn URL.

**Sharing:**
- Share Sheet (iOS native) — exports as PNG + vCard
- Copy Link — generates a `/card/:userId` public URL (optional, role-gated)
- AirDrop — vCard direct
- NFC tap — if device supports (future)

**Access:** Triggered from preview sheet footer "Share Card" action or from full profile page.

### 16.10 Context Menu — Full Entity Matrix

Replaces and extends §9.3. All entity context menus follow this pattern:

```
[Primary action]        ← Open / View
[Secondary action]      ← Edit / Assign / Message
[Tertiary action]       ← Share / Export
──────────────────
[Destructive group]     ← Archive / Delete (hidden if no permission)
```

**Employee:**
```
person.fill       View Profile
message           Send Message
checkmark.circle  Assign Task
calendar          View Schedule
square.and.pencil Edit Details
square.and.arrow.up  Export Record
──────────────────
exclamationmark.triangle  Suspend Account  (manager+)
```

**Client:**
```
person.fill       View Profile
phone             Call
envelope          Send Email
message           Send Message
doc.text          Open Invoices
folder            Open Projects
──────────────────
archivebox        Archive
```

**Supplier:**
```
building.2        View Profile
phone             Call
envelope          Send Email
shippingbox       View Orders
truck             View Deliveries
star              Supplier Rating
──────────────────
archivebox        Archive
```

**Project:**
```
folder            Open Project
pencil            Edit
photo             Photos
doc.text          Documents
checkmark.circle  Tasks
person.2          Team
square.and.arrow.up  Share Link
──────────────────
archivebox        Archive
```

**Product:**
```
cube.box          Open Product
pencil            Edit
cart              Add to Order
chart.bar         Analytics
arrow.2.circlepath  Update Stock
──────────────────
trash             Delete
```

**Order:**
```
doc.text          Open Order
receipt           Invoice
truck             Delivery Status
person            Customer
square.and.arrow.up  Export
──────────────────
archivebox        Archive
```

**Invoice:**
```
doc.text          Open Invoice
arrow.down.doc    Download PDF
square.and.arrow.up  Send to Client
checkmark.circle  Mark as Paid
clock             Payment Reminder
──────────────────
archivebox        Archive
```

**Document:**
```
doc.text          Open
arrow.down.doc    Download
square.and.arrow.up  Share (expiring link)
folder            Move to Project
lock.doc          Move to Vault
──────────────────
archivebox        Archive
trash             Delete
```

**Vehicle:**
```
car               Open Vehicle
person            Assign Driver
wrench            Log Maintenance
chart.bar         View Log
calendar          Schedule Service
──────────────────
archivebox        Decommission
```

**Tool:**
```
hammer            Open Tool
person            Check Out
wrench            Log Issue
calendar          Schedule Calibration
chart.bar         View History
──────────────────
archivebox        Decommission
```

**Team:**
```
person.2          View Team
message           Message Team
calendar          View Schedule
chart.bar         Team Analytics
person.badge.plus  Add Member
──────────────────
archivebox        Archive
```

**Company:**
```
building.2        Open Company
chart.bar         View Dashboard
person.2          View Staff
doc.text          Generate Report
gear              Settings
──────────────────
exclamationmark.triangle  Suspend  (platform admin only)
```

### 16.11 Preview Engine — Reusability Rules

The Preview Engine is implemented as a single shared system. No entity implements its own preview logic.

```
PreviewEngine
  ├── EntityRegistry         — maps entity type → content config
  ├── PreviewSheetRenderer   — renders content config as Glass Sheet
  ├── ContextMenuBuilder     — builds role-filtered menu from entity type
  ├── GestureCoordinator     — routes Tap / Long Press / Double Tap / Swipe
  ├── SocialProfilesRenderer — renders social icons for any entity
  ├── PresenceResolver       — resolves presence status for person entities
  └── BusinessCardExporter   — generates vCard + QR for person entities

Adding a new entity:
  1. Register entity type in EntityRegistry
  2. Define content config (header, metrics, actions, social flag)
  3. All 4 gestures, all social icons, presence, and business cards
     are automatically inherited.
  No additional preview code required.
```

---

## NAVIGATION ARCHITECTURE SUMMARY

```
PRV NAVIGATION SYSTEM
│
├── iPhone
│     ├── Floating Glass Tab Bar (role-aware, 5 tabs + More overflow)
│     ├── Floating Glass Search Bar (universal, permission-filtered)
│     ├── Dynamic Island (role-specific live context)
│     ├── Live Activities (6 activity types)
│     ├── Global Bottom Sheet System (Micro/Small/Medium/Large/Full)
│     ├── Context Menus (long-press, role-filtered)
│     ├── Floating Action Button (role-aware creation)
│     ├── Search Overlay (blur background, instant results)
│     ├── Command Palette (long-press search, role-filtered commands)
│     ├── Universal Inbox (Bottom Sheet, 5 categories)
│     ├── Universal Calendar (Bottom Sheet, permission-filtered)
│     ├── Peek Preview (Bottom Sheet, no navigation)
│     └── Home Screen Widgets + Lock Screen Widgets
│
├── iPad
│     ├── Sidebar + Content + Inspector (3-panel layout)
│     ├── Collapsible sidebar (280pt ↔ 64pt icon-only)
│     ├── Split View for list+detail (no push navigation needed)
│     ├── Inspector Panel (glass, slide-in from right)
│     ├── Breadcrumbs (sticky glass strip)
│     ├── Command Palette (⌘K)
│     ├── Keyboard shortcuts
│     └── Bottom Sheets (max 640pt centered)
│
├── Web
│     ├── Glass Top Bar (search · notifications · user)
│     ├── Collapsible Sidebar (240px ↔ 64px)
│     ├── Inspector Panel (340px, slide-in)
│     ├── Breadcrumbs (sticky)
│     ├── Command Palette (⌘K)
│     └── Right-click Context Menus
│
└── macOS
      ├── Native Sidebar (NSOutlineView behavior)
      ├── Native Toolbar (glass material)
      ├── Inspector Panel (trailing column)
      ├── Multi-window support
      ├── Command Palette (⌘K)
      ├── Full keyboard navigation
      └── macOS Menu Bar integration

UNIVERSAL SYSTEMS (all platforms):
  Search · Command Palette · Inbox · Calendar ·
  Bottom Sheets · Context Menus · Peek Preview ·
  Expandable Cards · Widgets · Dynamic Island (iOS) ·
  Universal Entity Preview Engine · Social Profiles ·
  Presence System · Digital Business Cards
```

---

*End of PRV Navigation Architecture v1.0*
*This document governs all navigation decisions in the PRV ecosystem.*
*No navigation pattern may deviate from max 3-level depth or bypass Bottom Sheet first.*
