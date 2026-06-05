# UX Enhancement Pack V1
## PRV Company Operating System — Architecture Document

**Status:** Architecture · Pre-Implementation  
**Scope:** Enhancement layer only — no modifications to existing auth, DB, or security architecture  
**Constraint:** All surfaces use Liquid Glass design language. No solid backgrounds. No color accents.

---

## Table of Contents

1. [Philosophy & Principles](#1-philosophy--principles)
2. [Design System Tokens](#2-design-system-tokens)
3. [Universal Preview Engine](#3-universal-preview-engine)
4. [Peek & Pop Interactions](#4-peek--pop-interactions)
5. [Apple Contacts Experience](#5-apple-contacts-experience)
6. [Digital Business Cards](#6-digital-business-cards)
7. [Enhanced Social Profiles](#7-enhanced-social-profiles)
8. [Enhanced Presence Experience](#8-enhanced-presence-experience)
9. [Navigation Integration](#9-navigation-integration)
10. [Dashboard Integration](#10-dashboard-integration)
11. [Shop Integration](#11-shop-integration)
12. [Role Integration](#12-role-integration)
13. [Inter-Feature Dependency Map](#13-inter-feature-dependency-map)

---

## 1. Philosophy & Principles

### Enhancement, Not Replacement

Every feature in this pack is an additive layer. Existing routes, schemas, and security gates remain untouched. This pack introduces:

- **New UI components** that read from existing data
- **New API routes** for data not yet served
- **New pages** within the existing authenticated shell
- **Gesture layers** on top of existing list and detail surfaces

### Apple-Native Mental Model

The six features form a unified system modelled on the iPhone's native Contacts, SharePlay, and Dynamic Island experiences:

```
Person Entity
  └── Presence ring (Enhanced Presence)
  └── Long press → Peek Preview (Peek & Pop)
        └── Preview Sheet (Universal Preview Engine)
              ├── Social links (Enhanced Social Profiles)
              ├── Status badge (Enhanced Presence)
              ├── Context Menu (role-filtered)
              └── Share → Digital Business Card
```

### Layer Hierarchy

```
┌─────────────────────────────────────────┐
│  Dynamic Island (Live Presence / Cards) │  ← Layer 4: Persistent ambient
├─────────────────────────────────────────┤
│  Context Menus + Quick Actions          │  ← Layer 3: Secondary actions
├─────────────────────────────────────────┤
│  Preview Sheets (Preview Engine)        │  ← Layer 2: Peek / Full preview
├─────────────────────────────────────────┤
│  List / Grid / Detail surfaces          │  ← Layer 1: Existing pages
└─────────────────────────────────────────┘
```

---

## 2. Design System Tokens

All new components use these tokens exclusively. No new colors introduced.

### Glass Levels

| Level | Usage | Background | Blur | Saturation |
|-------|-------|-----------|------|-----------|
| Glass-1 | Cards, list rows | `rgba(255,255,255,0.06)` | 32px | 140% |
| Glass-2 | Bottom sheets, panels | `rgba(255,255,255,0.10)` | 48px | 180% |
| Glass-3 | Modals, preview overlays | `rgba(255,255,255,0.16)` | 64px | 200% |
| Glass-4 | Peek scrim (behind peek card) | `rgba(0,0,0,0.60)` | 12px | 100% |

### Presence Color Tokens

Presence uses **shape + opacity** only — no color encoding.

| Status | Indicator | Opacity |
|--------|-----------|---------|
| online | Filled circle | 90% white |
| away | Half-filled circle | 50% white |
| busy | Filled circle + slash | 90% white |
| in_meeting | Circle + calendar glyph | 65% white |
| on_break | Circle + pause glyph | 50% white |
| do_not_disturb | Circle + minus glyph | 90% white |
| offline | Empty circle | 25% white |

### Corner Radius

| Context | Radius |
|---------|--------|
| Presence dot | 100% (pill) |
| Contact card | 24px |
| Business card | 20px |
| Preview sheet handle | 3px |
| Social link chip | 100px |
| QR code container | 16px |

### Motion

| Animation | Curve | Duration |
|-----------|-------|----------|
| Peek emerge | `cubic-bezier(0.34,1.56,0.64,1)` (spring) | 280ms |
| Sheet rise | `cubic-bezier(0.4,0,0.2,1)` | 320ms |
| Presence pulse | `cubic-bezier(0.4,0,0.2,1)` | 800ms loop |
| Card flip | `cubic-bezier(0.34,1.56,0.64,1)` | 400ms |
| Context menu emerge | `cubic-bezier(0.34,1.56,0.64,1)` | 200ms |

---

## 3. Universal Preview Engine

### Overview

The Preview Engine is the foundation of this entire pack. It provides a single, consistent system for rendering entity-aware preview sheets for any of 12 entity types. All other features (Peek & Pop, Contacts, Business Cards) are consumers of the Preview Engine.

### File Structure

```
packages/ui/src/preview-engine/
├── index.ts                      — public API
├── types.ts                      — EntityType, PreviewConfig, PreviewAction
├── registry.ts                   — EntityRegistry (maps type → config)
├── PreviewEngine.tsx             — orchestrator component
├── PreviewSheetRenderer.tsx      — Glass Bottom Sheet renderer
├── ContextMenuBuilder.tsx        — role-filtered menu builder
├── GestureCoordinator.tsx        — gesture → action router
├── renderers/
│   ├── PersonPreviewContent.tsx  — Employee, Client, Supplier
│   ├── ProjectPreviewContent.tsx — Project
│   ├── ProductPreviewContent.tsx — Product, Order
│   ├── FinancePreviewContent.tsx — Invoice, Expense
│   ├── DocumentPreviewContent.tsx
│   ├── AssetPreviewContent.tsx   — Vehicle, Tool
│   ├── TeamPreviewContent.tsx    — Team, Company
│   └── GenericPreviewContent.tsx — fallback
├── modules/
│   ├── SocialProfilesRenderer.tsx
│   ├── PresenceResolver.tsx
│   └── BusinessCardExporter.tsx
└── hooks/
    ├── usePreviewEngine.ts
    ├── useEntityData.ts
    └── usePresenceSubscription.ts
```

### Entity Type Registry

```typescript
type EntityType =
  | "employee"
  | "client"
  | "supplier"
  | "project"
  | "product"
  | "order"
  | "invoice"
  | "document"
  | "vehicle"
  | "tool"
  | "team"
  | "company"

interface PreviewConfig {
  entityType: EntityType
  // Required permission to view this entity's preview
  requiredPermission: string
  // Which renderer component to use
  renderer: "person" | "project" | "product" | "finance" | "document" | "asset" | "team" | "generic"
  // Which modules to activate in the preview sheet footer
  modules: Array<"presence" | "social" | "business_card" | "context_menu">
  // Primary action when preview is tapped (full navigation)
  primaryDestination: string // e.g. "/people/[id]"
  // Context menu actions, filtered by role at runtime
  contextActions: PreviewAction[]
}
```

### Preview Sheet Anatomy

Every preview sheet follows a fixed structure. Content within each zone varies by entity type and renderer.

```
┌─────────────────────────────────┐
│  ▬▬▬  (drag handle, 40×4px)     │  ← Drag handle zone
├─────────────────────────────────┤
│                                 │
│  [Avatar/Icon]  Name            │  ← Header zone
│                 Subtitle        │    Person: avatar + presence ring
│                 [Status badge]  │    Entity: icon + type label
│                                 │
├─────────────────────────────────┤
│                                 │
│  [Primary metadata row]         │  ← Content zone (renderer-specific)
│  [Secondary metadata row]       │    Rendered by EntityType renderer
│  [KPI chips / action chips]     │
│                                 │
├─────────────────────────────────┤
│                                 │
│  [Social links row]             │  ← Modules zone (conditional)
│  [Presence status row]          │    Only shown when modules active
│                                 │
├─────────────────────────────────┤
│  [Primary CTA]  [Secondary CTA] │  ← Footer zone
│  [Share]        [More ···]      │    Always present
└─────────────────────────────────┘
```

### Preview Sheet States

```
1. Peek    — 280px height, 85% opacity, behind context menu (long-press only)
2. Partial — 480px height, full opacity, drag handle exposed
3. Full    — 720px height (or 85% of screen), full entity detail
4. Dismissed — spring scale 0.95 → 0, fade out
```

### GestureCoordinator Routing Table

| Gesture | Target | Action |
|---------|--------|--------|
| Tap | Any list row | Navigate to full detail page |
| Long press (200ms) | Any list row | Open Peek Preview |
| Long press (200ms) | Peek card | Expand to Partial Sheet |
| Swipe up on sheet | Partial state | Expand to Full state |
| Swipe down on sheet | Full → Partial → Dismissed | Dismiss |
| Two-finger tap | Any entity | Peek Preview (alternate trigger) |
| Swipe left on row | List row | Quick Actions strip |
| Swipe right on row | List row | Primary action (role-dependent) |

### Context Menu Structure (Generic)

Context menus are built at runtime by `ContextMenuBuilder` which filters actions against the caller's permission set.

```
[Entity Name]          ← Section header (non-tappable)

▸ [Primary Action]     ← Most important action for this role
▸ [Secondary Action]
─────────────────────
▸ Copy [identifier]    ← Universal utilities
▸ Share…
▸ Open in New Tab
─────────────────────
▸ [Destructive]        ← Destructive group (red-tinted, bottom)
```

Entity-specific action matrices are defined in the full context menu spec (§16.10 of NAVIGATION_ARCHITECTURE.md).

### API Contracts

The Preview Engine fetches entity data from these endpoints. All are new routes to be created during implementation.

```
GET /api/preview/[entityType]/[id]
  → Returns: PreviewPayload (entity-type-specific shape)
  → Auth: standard withGates, requiredPermission from EntityRegistry
  → Cache: Redis, 30s TTL (entity data), 5s TTL (presence)
```

---

## 4. Peek & Pop Interactions

### Overview

Peek & Pop adds a pressable preview layer to every list row and card in the application. It is powered by the Preview Engine and does not require per-entity implementation — registering an entity in the EntityRegistry is sufficient.

### File Structure

```
packages/ui/src/peek-pop/
├── index.ts
├── PeekPopContainer.tsx      — wraps any child with Peek & Pop capability
├── PeekScrim.tsx             — blurred background scrim during peek
├── PeekCard.tsx              — the peeked card itself
└── hooks/
    └── usePeekGesture.ts     — manages long-press state machine
```

### Component API

```typescript
// Wrap any tappable element:
<PeekPopContainer
  entityType="employee"
  entityId={member.id}
  onPop={() => router.push(`/people/${member.id}`)}
>
  <MemberListRow member={member} />
</PeekPopContainer>
```

### Gesture State Machine

```
IDLE
  │  long-press start (200ms)
  ▼
PEEKING
  │  Scrim fades in (200ms, opacity 0→0.6, blur 0→12px)
  │  Preview card scales in (280ms spring, scale 0.88→1, opacity 0→1)
  │  Haptic: impact (medium)
  │
  ├─ release → DISMISSED (spring out, 180ms)
  ├─ press harder / swipe up → POPPED (full Preview Sheet opens)
  └─ wait 3s → auto-DISMISSED
```

### Peek Card Anatomy

```
┌──────────────────────────────┐  ← shadow: 0 32px 80px rgba(0,0,0,0.8)
│                              │     border: 1px rgba(255,255,255,0.14)
│  [Blurred entity context]    │     radius: 24px
│  [Avatar + Name + Status]    │     Glass-3 background
│  [Key metadata]              │
│                              │
│  ─────────────────────────── │
│  [Context Menu Actions]      │  ← 3–5 role-filtered quick actions
│                              │    tap action = dismiss peek + execute
└──────────────────────────────┘
```

### Peek Scrim

The scrim blurs only the background content — not the peeked card itself. This mirrors the iOS contextual menu behavior.

```
scrim background: rgba(0,0,0,0.5)
scrim backdrop-filter: blur(12px) saturate(100%)
scrim transition: opacity 200ms ease, backdrop-filter 200ms ease
```

### Integration Points

Peek & Pop is injected at the list/row level — not at the page level. Implementation adds `PeekPopContainer` wrapping to:

| Surface | Entities |
|---------|---------|
| People directory | employee, client, supplier |
| Project lists | project |
| Shop product grid | product |
| Order lists | order |
| Invoice tables | invoice |
| Document library | document |
| Fleet lists | vehicle, tool |
| Team directory | team |

---

## 5. Apple Contacts Experience

### Overview

The Apple Contacts Experience is a native-feeling member directory for internal employees, accessible from the **People tab** (◎). It provides alphabetical scroll, in-place presence indicators, peek-to-preview, and full contact detail sheets.

### File Structure

```
apps/web/src/app/(authenticated)/people/
├── page.tsx                    — directory root (alphabetical list)
├── [id]/
│   └── page.tsx                — full contact detail
└── components/
    ├── ContactsDirectory.tsx   — main directory list
    ├── AlphabetScrubber.tsx    — right-side A–Z fast scroll
    ├── ContactRow.tsx          — single row with presence ring
    ├── ContactDetailSheet.tsx  — full-detail bottom sheet
    ├── ContactHeader.tsx       — avatar, name, title, presence
    ├── ContactActions.tsx      — call, message, mail, Teams quick actions
    ├── ContactSocialLinks.tsx  — social links row (uses SocialProfilesRenderer)
    └── ContactBusinessCard.tsx — "Share Card" section
```

### Directory Architecture

```
ContactsDirectory
  ├── search input (floating glass pill)
  ├── filter chips (Department · Role · Status · Location)
  ├── AlphabetScrubber (right edge, A–Z)
  └── Sections (one per letter)
        └── ContactRow × N
              ├── PresenceRing (wraps avatar)
              ├── Name + Job Title
              ├── Department chip
              └── [PeekPopContainer]
```

### Contact Row Anatomy

```
┌─────────────────────────────────────────┐
│  [●]  ┌──────┐  Jane Smith              │  ← [●] = PresenceRing
│       │ img  │  Senior Designer         │       filled/half/empty
│       └──────┘  Design · Paris          │
└─────────────────────────────────────────┘
         8pt ring  32px avatar  14/12/11pt text
```

### Presence Ring Spec

```
PresenceRing wraps any avatar image.

Ring = 3px solid border on avatar's outer edge
       positioned: absolute, bottom-right corner

online           → white ring, full opacity, 8pt
away             → white ring, 40% opacity, 8pt
busy             → white ring, full opacity, 8pt + inner white slash overlay
in_meeting       → white ring, full opacity, 8pt + calendar glyph badge
on_break         → white ring, 40% opacity, 8pt
do_not_disturb   → white ring, full opacity, 8pt + minus glyph badge
offline          → ring absent (no indicator)
```

### Contact Detail Sheet States

The full contact detail is a Bottom Sheet (not a new page on mobile). On desktop it is a side panel.

**Partial state (480px):**
```
┌─────────────────────────────────┐
│  ▬▬▬                            │
│  [Avatar 64px]  Jane Smith      │
│  [●] Available  Senior Designer │
│  Design · Paris Office          │
│                                 │
│  ┌─────┐ ┌─────┐ ┌─────┐ ┌───┐ │  ← Quick action buttons
│  │ 📱 │ │ ✉️  │ │ 💬 │ │...│ │     Call · Mail · Message · More
│  └─────┘ └─────┘ └─────┘ └───┘ │
│                                 │
│  Contact Info                   │
│  +40 755 123 456                │
│  jane@prv.ro                    │
└─────────────────────────────────┘
```

**Full state (720px or 85% screen):**
```
(all of Partial +)
│                                 │
│  Social Profiles                │  ← Enhanced Social Profiles module
│  [LinkedIn] [GitHub] [Website]  │
│                                 │
│  About                          │
│  Bio text here…                 │
│                                 │
│  Skills                         │
│  [Figma] [React] [UX Research]  │
│                                 │
│  Presence Details               │  ← Enhanced Presence module
│  In meeting until 15:00         │
│                                 │
│  ─────────────────────────────  │
│  [Share Business Card]          │  ← Digital Business Card module
└─────────────────────────────────┘
```

### Navigation Flow

```
People Tab (◎)
  └── ContactsDirectory page
        ├── [tap row] → ContactDetailSheet (partial)
        │     ├── [swipe up] → ContactDetailSheet (full)
        │     └── [tap "Open Full Profile"] → /people/[id] page
        ├── [long press row] → Peek Preview (via PeekPopContainer)
        │     ├── [release] → dismiss
        │     └── [swipe up / tap "View"] → ContactDetailSheet
        └── [search] → filtered ContactsDirectory (same sheet)
```

### Alphabet Scrubber

Right-edge alphabet scrubber. Tap or drag to jump to section.

```
position: fixed, right: 8px, centered vertically
letters: 10pt, white/35 (inactive), white/80 (active/hovered)
section jump: animated scroll, haptic tick per letter
```

### Data Sources

| Data | Source | Endpoint |
|------|--------|----------|
| Member list | `company_memberships` JOIN `users` JOIN `user_profiles` | `GET /api/people` (new) |
| Presence status | `user_presence` via Supabase Realtime | `GET /api/presence` (existing) |
| Social profiles | `social_profiles` | `GET /api/people/[id]/social` (new) |
| Business card | `digital_business_cards` | `GET /api/people/[id]/card` (new) |

---

## 6. Digital Business Cards

### Overview

Digital Business Cards are shareable, optionally-public glass-rendered cards available for any person-type entity. They render inline inside Preview Sheets and have a dedicated public route for external sharing.

### File Structure

```
apps/web/src/app/
├── (authenticated)/people/[id]/card/
│   └── page.tsx                 — authenticated card editor / preview
└── card/[slug]/
    └── page.tsx                 — public card (unauthenticated, SEO)

packages/ui/src/business-card/
├── BusinessCard.tsx             — glass card component (front)
├── BusinessCardBack.tsx         — QR + vCard (back, flip animation)
├── BusinessCardEditor.tsx       — edit sheet (headline, links, visibility)
├── QRCodeRenderer.tsx           — generates QR from vCard 4.0 string
├── vCardBuilder.ts              — assembles vCard 4.0 string
├── ShareSheet.tsx               — share options sheet
└── hooks/
    └── useBusinessCard.ts       — fetches + caches card data
```

### Card Visual Anatomy

```
Front:
┌─────────────────────────────────────┐  ← radius: 20px
│  ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░  │     Glass-2 bg
│  ░  [PRV Logo]        [Avatar 48px] │     inset shine: top edge
│  ░                                  │     shadow: 0 24px 64px rgba(0,0,0,0.7)
│  ░  Jane Smith                      │     size: 343 × 200px (golden ratio)
│  ░  Senior Designer                 │
│  ░  PRV Design Studio               │
│  ░                                  │
│  ░  +40 755 123 456                 │
│  ░  jane@prv.ro                     │
│  ░  linkedin.com/in/janesmith       │
│  ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░  │
└─────────────────────────────────────┘

Back (flip on tap):
┌─────────────────────────────────────┐
│                                     │
│     ┌──────────────────────┐        │  ← QR code: 160×160px
│     │  [QR Code — vCard]   │        │     white fill, glass border
│     └──────────────────────┘        │
│                                     │
│     Scan to save contact            │  ← 13pt, white/50
│     prv.app/card/jane-smith-ab3x    │  ← 11pt, white/30
│                                     │
└─────────────────────────────────────┘
```

### vCard 4.0 Contents

```
BEGIN:VCARD
VERSION:4.0
FN:[fullName]
N:[lastName];[firstName];;;
TITLE:[jobTitle]
ORG:[companyName]
TEL;TYPE=CELL:[phone]
EMAIL:[email]
URL:[linkedInUrl or publicCardUrl]
PHOTO;MEDIATYPE=image/jpeg:[avatarUrl]
END:VCARD
```

### Share Options Sheet

Triggered by "Share Card" button in any Preview Sheet or Contact Detail footer.

```
┌──────────────────────────────────┐
│  Share Business Card             │
│                                  │
│  [Card preview thumbnail]        │
│                                  │
│  ┌────────┐  ┌────────┐          │
│  │ AirDrop│  │ Copy   │          │  ← row 1
│  │        │  │ Link   │          │
│  └────────┘  └────────┘          │
│  ┌────────┐  ┌────────┐          │
│  │ Save   │  │ Share  │          │  ← row 2
│  │ Image  │  │ Sheet  │          │
│  └────────┘  └────────┘          │
│                                  │
│  [Cancel]                        │
└──────────────────────────────────┘

Actions:
- AirDrop     → exports vCard file (native iOS share)
- Copy Link   → copies prv.app/card/[slug] to clipboard
- Save Image  → exports card as PNG (2x @344px width)
- Share Sheet → opens native iOS / Android / Web share
```

### Public Card Page

Route: `/card/[slug]`  
Auth: none required (public if `isPublic = true`)  
SEO: OpenGraph meta from card data

```
Public card layout:
- Black background (full bleed)
- BusinessCard component centered, glass rendering
- "Save to Contacts" button (downloads vCard)
- "Connect on LinkedIn" button (if LinkedIn in social_profiles)
- PRV logo + "Built with PRV" footer (small, white/20)
```

### Analytics Tracking

Each public card view increments `digitalBusinessCards.viewCount` via an edge function (no auth required, rate-limited by IP).

---

## 7. Enhanced Social Profiles

### Overview

Social Profiles surface the existing `social_profiles` DB data in a visually rich way inside Preview Sheets, Contact Details, and Business Cards. The enhancement adds an edit flow, GDPR consent modal, and a visibility control.

### File Structure

```
packages/ui/src/social-profiles/
├── SocialProfilesRenderer.tsx   — display-only (chips or icons)
├── SocialProfilesEditor.tsx     — edit sheet (add/remove/toggle visibility)
├── SocialConsentModal.tsx       — GDPR consent gate before making public
├── SocialPlatformIcon.tsx       — SF Symbol-style platform icons
└── hooks/
    └── useSocialProfiles.ts     — fetches, mutates, caches

apps/web/src/app/api/
├── people/[id]/social/
│   └── route.ts                 — GET (list), POST (upsert), DELETE (remove)
└── me/social/
    └── route.ts                 — self-edit shortcut (own profiles only)
```

### SocialProfilesRenderer Modes

```
Chip mode (full preview sheets):
  [LinkedIn ↗]  [GitHub ↗]  [Portfolio ↗]
  Each chip: Glass-1 bg, 100px radius, 12pt, icon + label
  Tap → opens URL in SafariViewController / new tab

Icon mode (compact, e.g. inside contact rows):
  [𝓛] [⌥] [◎]   ← SF Symbol-style icons, 20×20px, white/60
  Tap → opens URL

Count mode (list rows, space-constrained):
  "+3 profiles"  ← tapping opens SocialProfilesRenderer in full mode
```

### Social Profile Edit Sheet

Accessible from own profile only (permission: `social_profiles.edit_own`).

```
┌──────────────────────────────────┐
│  Social Profiles                 │
│  Manage your public links        │
│                                  │
│  LinkedIn                        │
│  linkedin.com/in/janesmith  [👁] │  ← visibility toggle
│                                  │
│  GitHub                          │
│  github.com/janesmith       [👁] │
│                                  │
│  + Add Platform                  │  ← opens platform picker sheet
│                                  │
│  ────────────────────────────── │
│  ⚠ Making profiles public        │
│    requires GDPR consent.        │  ← shown only when toggling public
│    [Review & Consent]            │
└──────────────────────────────────┘
```

### GDPR Consent Modal

Shown before any profile is made public (`isPublic = true`).

```
┌──────────────────────────────────┐
│  Data Visibility Consent         │
│                                  │
│  By making this profile public,  │
│  your [platform] URL will be     │
│  visible to other PRV members    │
│  and on your business card.      │
│                                  │
│  You can withdraw consent at     │
│  any time from your profile.     │
│                                  │
│  [Cancel]   [I Consent]          │
└──────────────────────────────────┘
```

Consent records are written to `social_profiles.consentGiven`, `consentAt` — no changes to existing schema.

---

## 8. Enhanced Presence Experience

### Overview

Enhanced Presence transforms the basic `user_presence` table into a rich, real-time ambient layer across all person-facing surfaces. Every avatar in the system gains a presence ring. Every Preview Sheet shows live status. The Dynamic Island surfaces active presence context.

### File Structure

```
packages/ui/src/presence/
├── PresenceRing.tsx              — avatar wrapper with status ring
├── PresenceStatusBadge.tsx       — text status badge ("In a meeting")
├── PresenceDot.tsx               — minimal dot indicator (8pt)
├── PresenceManualSheet.tsx       — "Set Status" bottom sheet
├── PresenceCompanyView.tsx       — company-wide online presence panel
└── hooks/
    ├── usePresence.ts            — subscribes to realtime presence channel
    ├── useMyPresence.ts          — manages own status
    └── useCompanyPresence.ts     — aggregated presence for company

apps/web/src/app/api/presence/
├── route.ts                      — GET/POST (existing, Sprint 8)
└── override/
    └── route.ts                  — POST (manual status override, new)
```

### Real-time Architecture

```
Presence data flow:
  1. Client POSTs heartbeat to /api/presence every 30s (background interval)
  2. Supabase Realtime subscription: channel "presence:{companyId}"
  3. On change: optimistic update in Zustand presence store
  4. PresenceRing components subscribe to store via usePresence(userId)
  5. presence-expire Inngest job sweeps stale records every 2min

Zustand store shape:
  presenceStore: Map<userId, PresenceRecord>
    PresenceRecord: { status, statusMessage, lastSeenAt, isManualOverride }
```

### PresenceRing States

```
Avatar with ring — all sizes (24px / 32px / 40px / 64px / 96px)

Ring thickness scales:
  24px avatar → 2px ring, 6pt dot
  32px avatar → 2px ring, 8pt dot
  40px avatar → 3px ring, 8pt dot
  64px avatar → 3px ring, 10pt dot
  96px avatar → 4px ring, 12pt dot

Ring uses background color inheritance (matches parent surface)
Dot uses white fill with opacity encoding per status table (§2)
```

### Presence Pulse Animation

Active `online` presence pulses subtly:

```
@keyframes presence-pulse {
  0%   { opacity: 0.9; transform: scale(1.0); }
  50%  { opacity: 0.6; transform: scale(1.15); }
  100% { opacity: 0.9; transform: scale(1.0); }
}
animation: presence-pulse 2.4s cubic-bezier(0.4,0,0.2,1) infinite
```

Only applied to `online` status. All other statuses are static.

### Manual Status Override Sheet

Accessible from own avatar tap anywhere in the app (permission: `presence.set_manual`).

```
┌──────────────────────────────────┐
│  Set Status                      │
│                                  │
│  ● Available                     │  ← tappable rows
│  ◑ Away                          │
│  ⊘ Busy                          │
│  ◷ In a Meeting                  │
│  ⏸ On Break                      │
│  ⊖ Do Not Disturb                │
│                                  │
│  Clear after:                    │
│  [30 min] [1 hour] [Today] [—]   │  ← duration chips
│                                  │
│  Custom message (optional)       │
│  [____________]                  │
│                                  │
│  [Cancel]   [Set Status]         │
└──────────────────────────────────┘
```

Duration options write to `userPresence.manualOverrideExpiresAt` and trigger the existing `presenceExpireFunction` Inngest job.

### Company Presence Panel

A collapsible panel in the Command dashboard showing team online status.

```
Online Now (7)
────────────────────────────────
[●] [●] [●] [●] [●] [●] [◑]    ← stacked avatars, overflow "+3"
                                   tapping opens ContactsDirectory
                                   filtered to online-only
```

### Dynamic Island Integration

When a watched person (e.g. a manager's direct reports) changes presence status, the Dynamic Island shows a brief alert.

```
Compact state:
  [Avatar 16px] ● Now available

Expanded state (long press DI):
  [Avatar 32px]  Jane Smith
  ● Just came online · Design
  [Message]  [View Profile]
```

Dynamic Island updates are triggered client-side via the Supabase Realtime presence channel — no new server infrastructure required.

---

## 9. Navigation Integration

### Current Navigation Structure

```
Business OS Navigation (5 tabs):
  ⌂ Command   — Dashboard · KPIs · AI · Inbox
  ⊞ Operations — Stores · Inventory · Tasks · Orders
  ◎ People    — HR · Schedule · Payroll · Org Chart
  ⟁ Finance   — Revenue · Expenses · Reports · Tax
  ✦ Intelligence — Analytics · AI · Reports · Forecast
```

### Integration Points by Tab

**⌂ Command Tab:**
- Company Presence Panel (collapsible card in dashboard)
- Quick jump to any person via preview sheet (from KPI card alert)
- Dynamic Island activity for watched entities

**◎ People Tab (primary integration point):**

```
People Tab root (new):
  ├── ContactsDirectory       ← Apple Contacts Experience (NEW)
  │     ├── search + filters
  │     ├── alphabetical list with presence rings
  │     └── peek-to-preview on all rows
  ├── Schedule (existing)
  ├── Payroll (existing)
  └── Org Chart (existing — gains presence rings on all nodes)
```

**⊞ Operations Tab:**
- Peek & Pop on all order and task rows (via PeekPopContainer)
- Product preview sheets (shop product entity type)
- Team member assignments gain presence rings

**✦ Intelligence Tab:**
- No new primary surfaces
- Preview Engine powers entity deep-links from analytics charts

### New Routes Added

```
/people                    — ContactsDirectory (Apple Contacts Experience)
/people/[id]               — Full contact detail page
/people/[id]/card          — Business card editor (authenticated)
/card/[slug]               — Public business card (unauthenticated)
```

### Deep-Link System

The Preview Engine introduces a universal deep-link format used across all surfaces:

```
prv://preview/[entityType]/[id]

Examples:
  prv://preview/employee/uuid-123
  prv://preview/project/uuid-456
  prv://preview/invoice/uuid-789
```

On web: these resolve to `/api/preview/[entityType]/[id]` which opens the Preview Sheet as an overlay. On mobile: native deep link triggers the PreviewEngine directly.

---

## 10. Dashboard Integration

### Command Center Additions

The dashboard page gains three new sections positioned between the KPI grid and Quick Actions.

```
Current layout:
  [Header]
  [KPI Grid 2×2]
  [Quick Actions 3×2]
  [Recent Activity]

New layout:
  [Header]
  [KPI Grid 2×2]
  ─────────────────────  (new additions below)
  [Online Now panel]          ← Presence
  [Pinned Contacts row]       ← Contacts Experience
  ─────────────────────
  [Quick Actions 3×2]
  [Recent Activity]
```

### Online Now Panel

```
┌─────────────────────────────────┐
│  Online Now  · 7 members        │  ← label + live count
│                                 │
│  [●][●][●][●][●][●] +3          │  ← stacked avatar row
│  Tap any to preview · See all → │
└─────────────────────────────────┘
```

Tapping any avatar opens the Person Preview Sheet (via Preview Engine).  
"See all →" navigates to `/people` filtered to `status: online`.

### Pinned Contacts Row

```
┌─────────────────────────────────┐
│  Quick Access                   │
│                                 │
│  [●]Jane  [◑]Mihai  [⊘]Alex     │  ← avatar + first name + status dot
│  Designer  Dev Lead  PM         │
│                                 │
│  + Pin someone                  │
└─────────────────────────────────┘
```

Pinned contacts are stored in `user_preferences` (key: `dashboard.pinned_contacts`, value: `string[]`). Max 6 contacts pinned. Drag to reorder.

### KPI Card Deep-Links

The four KPI cards gain tap targets that open entity lists via the Preview Engine:

| KPI Card | Tap action |
|----------|-----------|
| Revenue | Opens invoice list (Finance tab) |
| Active Projects | Opens project list filtered to `active` |
| Workforce | Opens ContactsDirectory |
| Alerts | Opens Notifications center |

---

## 11. Shop Integration

### Overview

The Shop tab surfaces two entity types via the Preview Engine: `product` and `order`. Peek & Pop is added to the product grid and order list.

### Product Grid Enhancement

```
Current: product card grid (no peek interaction)
Enhanced: PeekPopContainer wraps each product card

Peek card for product:
  [Product image, 80px]
  [Name + SKU]
  [Price]
  ─────────────────
  [Add to Cart]  [View Details]  [Share]
```

### Product Preview Sheet

```
Header:
  [Product image 64px]  Product Name
  SKU · Category

Content:
  Price: 499 RON
  Stock: 34 units
  Rating: ★★★★☆ (4.2)

Actions:
  [Add to Cart]  [Add to Wishlist]

Footer:
  [Share Product]
```

### Order Preview Sheet

Accessible from order list rows (peek or tap to preview before navigating to full order).

```
Header:
  [Order icon]  Order #PRV-2024-1234
  Placed 2 days ago · In Transit

Content:
  3 items · 1,299 RON
  Estimated delivery: tomorrow

Actions:
  [Track Order]  [View Invoice]

Footer:
  [Contact Support]
```

### Seller Context Menu

For users with `seller` role, product rows gain seller-specific context menu items:

```
Product context menu (seller view):
  View Product
  Edit Price
  Adjust Stock
  ─────────────
  View Sales Analytics
  ─────────────
  Archive Product (destructive)
```

---

## 12. Role Integration

### Universal Preview Engine — Access by Role

The EntityRegistry enforces `requiredPermission` for each entity type. Roles without the permission see the entity as a non-tappable row (no peek, no preview sheet).

| Entity Type | Minimum Permission | Roles with Access |
|-------------|-------------------|------------------|
| employee | `presence.view_team` | All authenticated roles |
| client | `crm.clients.view` | seller, store_manager, operations_manager+ |
| supplier | `procurement.suppliers.view` | operations_manager, department_head+ |
| project | `projects.view` | project_worker+ |
| product | `shop.products.view` | seller, cashier+ |
| order | `shop.orders.view` | seller, cashier+ |
| invoice | `finance.invoices.view` | hr_payroll, operations_manager+ |
| document | `documents.view` | All authenticated roles (own-scope) |
| vehicle | `fleet.view` | operations_manager, team_leader+ |
| tool | `tools.view` | team_leader+ |
| team | `workforce.view` | team_leader+ |
| company | `companies.view` | ceo, co_ceo, group_ceo |

### Contacts Directory — Role-Filtered Views

Different roles see different columns and actions in the ContactsDirectory.

| Role | Can See | Quick Actions |
|------|---------|--------------|
| worker, project_worker | Name, title, email | Message, Mail |
| team_leader | + department, skills | + Assign to task |
| store_manager | + hire date, schedule | + Edit schedule |
| operations_manager | + salary band (range) | + Performance review |
| hr_payroll | + all employment data | + Edit profile |
| ceo / group_ceo | All fields, all companies | All actions |

### Presence — Role Visibility

| Permission | Roles | Scope |
|-----------|-------|-------|
| `presence.view_team` | All roles | Own team's presence |
| `presence.view_company` | operations_manager, department_head+ | All company presence |
| `presence.set_manual` | All roles | Own status only |
| `presence.override_others` | hr_payroll, operations_manager, department_head | Department scope |

### Digital Business Cards — Role Visibility

| Permission | Roles | Notes |
|-----------|-------|-------|
| `business_card.view_own` | All roles | Always available |
| `business_card.view_others` | supervisor+ | View colleagues' cards |
| `business_card.share` | All roles | Own card only |
| `business_card.public_link` | operations_manager+ | Enable public slug |

Workers and project_workers can share their own business card but cannot make it public without management approval.

### Dynamic Island — Role-Specific Content

| Role | Dynamic Island Shows |
|------|---------------------|
| worker | Own presence status only |
| team_leader | Team presence alerts |
| store_manager | Store KPI alerts + team presence |
| operations_manager | Company-wide alerts |
| ceo / group_ceo | Cross-company critical alerts |

---

## 13. Inter-Feature Dependency Map

```
┌─────────────────────────────────────────────────────────┐
│                Universal Preview Engine                   │
│  (Foundation — all features depend on this)              │
│                                                          │
│  EntityRegistry · PreviewSheetRenderer · GestureCoord   │
└──────────┬──────────────┬────────────────┬──────────────┘
           │              │                │
    ┌──────▼──────┐ ┌─────▼──────┐ ┌──────▼──────┐
    │  Peek & Pop  │ │  Contacts  │ │  Biz Cards  │
    │              │ │ Experience │ │             │
    │  Uses:       │ │            │ │  Uses:      │
    │  - Preview   │ │  Uses:     │ │  - Preview  │
    │    Engine    │ │  - Preview │ │    Engine   │
    │  - Scrim     │ │    Engine  │ │  - Social   │
    │  - Gestures  │ │  - Peek &  │ │    Profiles │
    └──────────────┘ │    Pop     │ │  - QR/vCard │
                     │  - Presence│ └─────────────┘
                     │  - Social  │
                     │  - Biz Card│
                     └─────┬──────┘
                           │
              ┌────────────┴─────────────┐
              │                          │
    ┌─────────▼──────┐       ┌───────────▼──────┐
    │ Enhanced Social │       │ Enhanced Presence │
    │    Profiles     │       │    Experience     │
    │                 │       │                   │
    │  Standalone +   │       │  Standalone +     │
    │  used by:       │       │  used by:         │
    │  - Contacts Exp │       │  - Contacts Exp   │
    │  - Biz Cards    │       │  - Biz Cards      │
    │  - Preview Eng  │       │  - Preview Eng    │
    └─────────────────┘       │  - Dashboard      │
                              │  - Dynamic Island │
                              └───────────────────┘

Implementation order (respects dependencies):
  1. Universal Preview Engine    ← no dependencies
  2. Enhanced Presence           ← no dependencies
  3. Enhanced Social Profiles    ← no dependencies
  4. Peek & Pop                  ← depends on Preview Engine
  5. Digital Business Cards      ← depends on Preview Engine + Social + Presence
  6. Apple Contacts Experience   ← depends on all above
```

---

## Implementation Notes (for future sprints)

This document defines architecture only. During implementation:

1. **Do not** modify `packages/db/src/schema/*` — all required tables exist
2. **Do not** modify `packages/auth/src/permission-catalog.ts` — all permissions exist
3. **Do not** modify existing API routes — new routes are additive only
4. **Do not** modify the floating tab bar layout — new routes plug into existing tabs
5. The Presence API `POST /api/presence` (Sprint 8) already handles heartbeats — add only the `/api/presence/override` route
6. All `user_presence` schema columns needed by the Presence API (`platform`, `activeRoute`, `activeEntityType`, `activeEntityId`) must be added to the schema as part of the first implementation sprint before the Presence API goes live

---

*Document version: 1.0 · Created: 2026-06-05 · Status: Approved for implementation*
