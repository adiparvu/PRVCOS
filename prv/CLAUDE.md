@AGENTS.md

# PRV — Company Operating System
# Official Product Memory · Source of Truth

---

## MY ROLE IN THIS PROJECT

I am simultaneously:
- **Lead Software Architect** — system design, scalability, infrastructure decisions
- **Lead Product Designer** — every visual decision, design system ownership
- **Lead UX Architect** — information architecture, navigation, interaction design
- **Lead Security Architect** — Zero Trust, auth flows, audit systems, permissions
- **Lead Enterprise Systems Engineer** — integration, data modeling, platform evolution

My responsibility is to design, maintain and evolve the PRV ecosystem.
Every decision I make must reflect all five roles simultaneously.

---

## GOLDEN RULES (Non-Negotiable)

1. **Preview First** — Show previews (HTML/visual) before implementing any structure, colors, menus, or UI patterns. User must approve before any code is written.
2. **Liquid Glass Only** — Every component, surface, and interaction uses the Liquid Glass design language. No exceptions.
3. **Never Remove** — Never remove features, modules, roles, permissions, workflows, dashboards, notifications, Dynamic Island features, widgets, analytics, or AI systems without explicit approval.
4. **Never Simplify** — Never replace enterprise solutions with basic implementations.
5. **Always Enterprise-Grade** — When two paths exist: choose the more scalable, more secure, more maintainable one.

### When Unsure — Always Prefer:
- The more **scalable** solution
- The more **secure** solution
- The more **maintainable** solution
- The more **enterprise-grade** solution

### Final Rule
If there are two possible implementations:
1. Fast and simple
2. Scalable and enterprise-grade

**Always choose option 2.**

The goal is to build PRV for the next 10+ years.

---

## DESIGN REQUIREMENTS

The entire application must feel like a **first-party Apple product**.

Must follow:
- **Human Interface Guidelines** — spacing, typography, gestures, transitions
- **Liquid Glass design language** — all surfaces, all components
- **Native animations** — spring physics, no CSS linear animations
- **Native gestures** — swipe, long-press, pinch, drag
- **Dynamic Island** — role-specific live context, always active
- **Live Activities** — real-time data on lock screen and Dynamic Island
- **Widgets** — Home Screen, Lock Screen, In-App Dashboard
- **Haptics** — every action has appropriate haptic feedback
- **Face ID** — authentication, re-auth for sensitive operations
- **Accessibility** — WCAG 2.1 AA, VoiceOver, Dynamic Type, Reduced Motion

The experience must feel closer to **Apple** than to traditional ERP software.

---

## DESIGN SYSTEM

### Color Palette (Approved)
- **Background**: Pure Black `#000000`
- **Glass surfaces**: `rgba(255,255,255, 0.06–0.22)` with backdrop blur
- **Text hierarchy**: Opacity only — 95% / 65% / 35% / 15% white
- **Borders**: `rgba(255,255,255, 0.12)`
- **Top edge shine**: `rgba(255,255,255, 0.32)`
- **Accent**: White `#FFFFFF` — inverted for CTAs on dark
- **No color accents** — monochrome B&W throughout

### Liquid Glass Specification
- **Blur levels**: 16px / 32px / 48px / 64px (hierarchy)
- **Saturation**: 140% / 180% / 200% / 220%
- **Glass 1** (Cards, Panels): `rgba(255,255,255,0.06)` + `blur(32px)`
- **Glass 2** (Menus, Sheets): `rgba(255,255,255,0.10)` + `blur(48px)`
- **Glass 3** (Modals, Overlays): `rgba(255,255,255,0.16)` + `blur(64px)`
- **Top specular**: Always `inset 0 1px 0 rgba(255,255,255,0.25)` or gradient pseudo
- **Floating shadow**: `0 24px 64px rgba(0,0,0,0.7)` + `0 8px 24px rgba(0,0,0,0.4)`

### Corner Radius System
- `4px` micro / `8px` small / `12px` medium / `16px` standard
- `20px` cards / `24px` panels / `32px` sheets & modals / `44px` phone frame / `100px` pill

### Floating Elements (Required)
- Floating Tab Bar (glass, rounded, above content, bottom)
- Floating Search Bar (glass, pill-shaped, top)
- Floating Action Button (glass, circle)
- Floating Status components
- All navigation bars float — never solid/full-width

### Mandatory Glass Components
- Glass Bottom Sheets (primary workflow entry)
- Glass Context Menus (long-press / right-click)
- Glass Toast Notifications (system feedback, emerge from bottom)
- Glass Search Overlay (blur background, dynamic)
- Glass Command Palette (⌘K global shortcut)
- Glass Quick Preview Sheets (peek without navigating)
- Expandable Glass Cards
- Glass Modals (confirmations, critical actions)
- Glass Quick Actions Panels

### Motion System
- Spring animations: `cubic-bezier(0.34, 1.56, 0.64, 1)` (bounce)
- Smooth: `cubic-bezier(0.4, 0, 0.2, 1)` (standard)
- Overlays emerge: scale + blur + opacity (never instant appear)
- Sheets rise: translateY + opacity
- Never abrupt appearance or disappearance

---

## ARCHITECTURE REQUIREMENTS

**PRV is a Business Operating System.**

Not:
- a website
- a CRM
- a shop
- a project manager

But a **complete operating system for companies.**

Every feature must integrate with:
- Roles & Permissions
- Scope (company / store / region / team)
- Notifications
- Analytics
- AI
- Search
- Inbox
- Audit Logs
- Security

---

## PRODUCT VISION

### What PRV Is
**PRV is a Company Operating System** — not a website, CRM, shop, or project manager.

PRV combines 18 integrated platforms into a single ecosystem:
1. Public Presentation Platform
2. Renovation Services Platform
3. Project Management Platform
4. Workforce Management Platform
5. Attendance Management Platform
6. CRM Platform
7. Shop Platform
8. Finance Platform
9. Analytics Platform
10. AI Platform
11. Document Management Platform
12. Notification Center
13. Knowledge Base
14. Learning Center
15. Procurement Center
16. Supplier Management
17. Fleet Management
18. Tool Management

### Core Philosophy
- **Apple First** — feels like a first-party Apple product
- **Liquid Glass Everywhere** — no surface escapes the design language
- **Role-Based Experience** — every role sees a different application
- **Mobile First** — designed for iPhone, optimized for all platforms
- **Enterprise Grade** — scales to 100+ companies, 1,000+ stores, 10,000+ employees, millions of records

### Platform Support
- iPhone (premium experience)
- iPad
- Android
- Web
- macOS

---

## COMPANY STRUCTURE

```
PRV Group
  └── PRV Renovations
  └── PRV Projects
  └── PRV Shop
  └── Future Companies (pluggable)
```

- CEO sees all companies
- Permissions respect company boundaries strictly
- Multi-store: Multiple Stores, Warehouses, Regions
- Store Managers see assigned stores only
- Shop Directors see all stores

---

## ROLE SYSTEM (Zero Trust)

Every action validated through:
1. Authentication (Face ID / biometric / token)
2. Authorization (role check)
3. Scope Validation (which company/store/resource)
4. Audit Logging (immutable record)

### Role Hierarchy
- Superadmin (Global · all companies)
- Company Owner (own company)
- Regional Manager (N stores in region)
- Store Manager (1 store)
- Cashier (own register)
- Custom Role (configurable, granular per module)

---

## NAVIGATION ARCHITECTURE

### Maximum Depth: 3 levels
`Tab → List/Grid → Detail` — actions via Bottom Sheet, not new screens

### Navigation Patterns (Ordered by preference)
1. Bottom Sheets (secondary workflows)
2. Context Menus (secondary actions)
3. Command Palette (global access, ⌘K)
4. Search Overlay (universal search)
5. Peek Preview (no navigation)
6. Overlays / Drawers (settings, filters)

### Public App Navigation (5 tabs)
- 🏠 Home
- 🛒 Shop
- 🔍 Search
- ❤️ Favorites
- 👤 Account

### Business OS Navigation (5 tabs)
- ⌂ Command (Dashboard · KPIs · AI · Inbox)
- ⊞ Operations (Stores · Inventory · Tasks · Orders)
- ◎ People (HR · Schedule · Payroll · Org Chart)
- ⟁ Finance (Revenue · Expenses · Reports · Tax)
- ✦ Intelligence (Analytics · AI · Reports · Forecast)

---

## PUBLIC APPLICATION

### Home Screen
- Hero Section
- Company Presentation
- Services (Interior Renovations, Bathrooms, Kitchens, Flooring, Painting, Electrical, Plumbing, Commercial Spaces)
- Featured Projects
- Before / After gallery
- Reviews
- Statistics
- Contact
- Quote Request

### Shop
- Products, Categories, Search
- Wishlist, Reviews, Comparisons, Orders

### Client Portal (authenticated clients)
- Projects, Quotes, Contracts
- Documents, Photos, Invoices, Progress Updates

---

## CEO 60-SECOND RULE

Within 60 seconds of opening PRV, a CEO must know:
- Revenue
- Profit
- Active Projects
- Workforce Status
- Inventory Risks
- Critical Alerts
- AI Recommendations

Without opening another application.

---

## SECURITY REQUIREMENTS

**Zero Trust Architecture** — no action is trusted by default.

Every action validated through:
1. **Authentication** — Face ID / biometric / MFA / token
2. **Authorization** — role check against permission catalog
3. **Scope Validation** — which company / store / resource
4. **Audit Logging** — immutable record of every action

```
Request → Auth → Identity → Permission → Scope → Execute → Audit Log
```

- **Security is mandatory. Convenience is secondary.**
- Every read/write/delete: logged
- Audit logs: immutable, append-only, SHA-256 chained
- No action bypasses the 4-gate validation chain

---

## SCALABILITY REQUIREMENTS

Architecture must support **without redesigning the platform**:
- 100+ companies
- 1,000+ stores
- 10,000+ employees
- Millions of records
- Millions of notifications
- Millions of audit events

---

## UX REQUIREMENTS

Users should **never** wonder: *"Where do I find this?"*

Information must be:
- **Contextual** — relevant to the user's current role and task
- **Discoverable** — surfaced proactively, not hidden in menus
- **Role-aware** — each role sees only what is relevant

Maximum navigation depth: **3 levels**
`Tab → List/Grid → Detail` — actions via Bottom Sheet, not new screens

Prefer (in order):
1. Bottom Sheets
2. Context Menus
3. Command Palette (⌘K)
4. Search Overlay
5. Peek Preview

Avoid unnecessary screens.

---

## INTEGRATION REQUIREMENTS

Every feature must integrate with:
- Roles & Permissions
- Scope (company/store/region)
- Notifications
- Analytics
- AI
- Search
- Inbox
- Audit Logs
- Security

---

## DEVELOPMENT PROCESS

1. User describes feature/screen
2. Claude shows HTML preview (design, colors, layout, components)
3. User approves preview
4. Claude implements
5. No implementation without preview approval

### Tech Stack (Active)
- Framework: Next.js (App Router, TypeScript)
- Styling: Tailwind CSS + custom Liquid Glass utilities
- State: TBD
- Backend: TBD
- Auth: TBD

---

## WHAT NEVER HAPPENS
- No solid card backgrounds (always glass)
- No full-width navigation bars (always floating)
- No color accents (B&W only)
- No heavy shadows or thick borders
- No abrupt animations
- No deep navigation (max 3 levels)
- No simplification of architecture
- No removal of features without explicit approval
