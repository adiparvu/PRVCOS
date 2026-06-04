# PRV LIQUID GLASS DESIGN SYSTEM
# Pasul 8 — Complete Design Blueprint · Source of Truth

**Version**: 1.0  
**Status**: Official Blueprint — Mandatory  
**Scope**: All platforms · All components · All roles  
**Depends on**: CLAUDE.md · PRODUCT_VISION.md · NAVIGATION_ARCHITECTURE.md

---

## DESIGN MANDATE

This design system is **mandatory** across the entire PRV ecosystem.

No component, screen, overlay, animation, or interaction exists outside this system.  
Every surface is glass. Every element floats. Every motion is physical.

> PRV must feel like a first-party Apple product — not a business tool.

---

## TABLE OF CONTENTS

1. [Liquid Glass Design System](#1-liquid-glass-design-system)
2. [Material System](#2-material-system)
3. [Typography System](#3-typography-system)
4. [Motion System](#4-motion-system)
5. [Navigation Design System](#5-navigation-design-system)
6. [Component Design System](#6-component-design-system)
7. [Dynamic Island Design System](#7-dynamic-island-design-system)
8. [Widget Design System](#8-widget-design-system)
9. [Haptic System](#9-haptic-system)
10. [Apple Experience Blueprint](#10-apple-experience-blueprint)

---

## 1. LIQUID GLASS DESIGN SYSTEM

### 1.1 Core Principles

**Translucency** — Every surface lets the background show through. Nothing is opaque unless it must be.

**Blur** — Content behind glass is blurred — never pixelated, never sharp. The blur intensity indicates elevation.

**Depth** — Elements at different elevations have different blur levels, opacity, and shadow values. The user perceives a physical stack of layers.

**Reflections** — The top edge of every glass element catches a specular highlight — simulating real glass catching light.

**Edge Highlights** — Subtle borders define glass edges, never thick lines.

### 1.2 Glass Philosophy

Glass surfaces are **not** frosted static backgrounds.  
Glass surfaces are **living materials** that:
- React to the content beneath them
- Adapt to Dark and Light Mode
- Respond to user interaction (pressed states)
- Breathe with subtle saturation

### 1.3 The Four Glass Laws

| Law | Rule |
|-----|------|
| **No Solid Cards** | Cards are never opaque solid colors. Always glass. |
| **No Full-Width Navigation** | Navigation never spans full width. Always floating. |
| **No Hard Edges** | Borders are always subtle `rgba(255,255,255,0.12)` — never `1px solid #ccc`. |
| **No Abrupt Motion** | Nothing appears or disappears instantly. Always animated. |

### 1.4 Dark Mode — Primary Mode

PRV's primary mode is **Dark Mode** — black background with white glass.

```
Background:          #000000 (pure black)
Glass Layer 1:       rgba(255, 255, 255, 0.06)
Glass Layer 2:       rgba(255, 255, 255, 0.10)
Glass Layer 3:       rgba(255, 255, 255, 0.16)
Glass Layer 4:       rgba(255, 255, 255, 0.22)
Border:              rgba(255, 255, 255, 0.12)
Top Specular:        rgba(255, 255, 255, 0.32)
Text Primary:        rgba(255, 255, 255, 0.95)
Text Secondary:      rgba(255, 255, 255, 0.65)
Text Tertiary:       rgba(255, 255, 255, 0.35)
Text Disabled:       rgba(255, 255, 255, 0.15)
```

### 1.5 Light Mode — Secondary Mode

Light Mode uses a near-white background with dark-tinted glass.

```
Background:          #F2F2F7 (iOS system grouped background)
Glass Layer 1:       rgba(255, 255, 255, 0.72)
Glass Layer 2:       rgba(255, 255, 255, 0.80)
Glass Layer 3:       rgba(255, 255, 255, 0.88)
Glass Layer 4:       rgba(255, 255, 255, 0.95)
Border:              rgba(0, 0, 0, 0.08)
Top Specular:        rgba(255, 255, 255, 0.90)
Text Primary:        rgba(0, 0, 0, 0.90)
Text Secondary:      rgba(0, 0, 0, 0.60)
Text Tertiary:       rgba(0, 0, 0, 0.35)
Text Disabled:       rgba(0, 0, 0, 0.20)
```

### 1.6 Appearance & Personalization System

PRV supports three **theme** modes and three **glass style** variants, selectable per user and synced across all devices.

#### Theme Modes

| Mode | Behavior |
|------|----------|
| **Dark** | Primary — pure black `#000000` background, white glass (default) |
| **Light** | Secondary — `#F2F2F7` background, frosted white glass |
| **System** | Follows OS `prefers-color-scheme` — Dark or Light automatically |

**Applied via:** `data-theme="dark|light|system"` attribute on `<html>`.

#### Light Mode Canonical Values (Section 1.5 source of truth)

```
Background:     #F2F2F7
Glass 1:        rgba(255, 255, 255, 0.72)
Glass 2:        rgba(255, 255, 255, 0.80)
Glass 3:        rgba(255, 255, 255, 0.88)
Glass 4:        rgba(255, 255, 255, 0.95)
Border:         rgba(0, 0, 0, 0.08)
Specular:       rgba(255, 255, 255, 0.90)
Text Primary:   rgba(0, 0, 0, 0.90)
Text Secondary: rgba(0, 0, 0, 0.60)
Text Tertiary:  rgba(0, 0, 0, 0.35)
Text Disabled:  rgba(0, 0, 0, 0.20)
Shadow:         0 24px 64px rgba(0,0,0,0.10), 0 8px 24px rgba(0,0,0,0.06)
```

#### Glass Style Variants

Three style variants modulate the visual weight of glass surfaces:

| Variant | Description | Opacity modifier | Best for |
|---------|-------------|-----------------|----------|
| **Translucid** | Maximum transparency — backgrounds show through fully | Levels multiplied by 0.60 | Media, photography, content-light screens |
| **Tinted** | Chromatic warm glass — a subtle grey-blue wash unifies surfaces | Adds `rgba(100,105,130,0.12)` layer | Dashboards, information-dense panels |
| **Adaptive** *(default)* | Context-aware — standard opacity by default; auto-increases to next glass level on data-heavy screens (tables, analytics, financial data) | Standard on content screens; +1 level on data screens | Universal — the recommended default |

**Applied via:** `data-glass="translucid|tinted|adaptive"` attribute on `<html>`.

**Adaptive detection:** A screen is considered "data-heavy" when it renders a `data-density="high"` wrapper — used automatically by data tables, analytics views, and financial reports.

#### Persistence & Sync

- Stored in `user_preferences` table (one row per user, `UNIQUE(user_id)`)
- Loaded on session start — injected into SSR layout to prevent flash-of-wrong-theme
- Cached in `localStorage` for instant client-side restore
- Synced to DB asynchronously on change via `PATCH /api/preferences`
- Applies to: Web, macOS, Dynamic Island tint, Widget backgrounds, Live Activity chrome

---

### 1.7 Monochrome Rule

PRV uses **zero color accents**. The palette is monochrome B&W.

| Allowed | Not Allowed |
|---------|------------|
| White glass surfaces | Blue buttons |
| Black backgrounds | Green success banners |
| White inverted buttons (CTAs) | Red/Orange/Yellow status pills |
| Opacity-based hierarchy | Any brand color on surfaces |

**Status indicators use symbols + opacity, not color:**
- 🔴 Critical → white at 95% with ● glyph
- 🟠 High → white at 75% with △ glyph  
- 🟡 Medium → white at 55% with ○ glyph
- 🔵 Low → white at 35% with · glyph

*(On screen: all rendered as white with varying opacity and different symbols)*

---

## 2. MATERIAL SYSTEM

### 2.1 Glass Material Hierarchy

Four glass materials define the visual elevation stack:

| Material | Usage | Background | Blur | Saturation |
|----------|-------|-----------|------|-----------|
| **Glass 1** | Cards, List items, Panels | `rgba(255,255,255,0.06)` | `blur(32px)` | 140% |
| **Glass 2** | Menus, Sheets, Drawers | `rgba(255,255,255,0.10)` | `blur(48px)` | 180% |
| **Glass 3** | Modals, Overlays, Alerts | `rgba(255,255,255,0.16)` | `blur(64px)` | 200% |
| **Glass 4** | Command Palette, Critical | `rgba(255,255,255,0.22)` | `blur(80px)` | 220% |

**Hierarchy Rule**: Higher elevation = more blur + more opacity + more saturation.  
Never invert this hierarchy.

### 2.2 Specular System

Every glass surface has a **top specular highlight** — simulating light hitting the top edge of glass.

```
Top Specular (standard):
  inset 0 1px 0 rgba(255, 255, 255, 0.25)

Top Specular (strong — for elevated modals):
  inset 0 1px 0 rgba(255, 255, 255, 0.40)

Top Specular (subtle — for list items):
  inset 0 1px 0 rgba(255, 255, 255, 0.12)
```

Alternative implementation via `::before` pseudo-element with a gradient:
```
Linear gradient:
  top: rgba(255,255,255,0.28) → transparent (8px height)
  Applied as a glass sheen overlay
```

### 2.3 Shadow System

Shadows define distance from the background — the larger the shadow, the higher the float.

| Elevation | Shadow | Usage |
|-----------|--------|-------|
| **E0** — Resting | none | Inline cards, list items |
| **E1** — Raised | `0 4px 16px rgba(0,0,0,0.3)` | Floating pills, chips |
| **E2** — Floating | `0 8px 24px rgba(0,0,0,0.4)` + `0 2px 8px rgba(0,0,0,0.2)` | Tab bar, FAB |
| **E3** — Sheets | `0 16px 48px rgba(0,0,0,0.5)` + `0 4px 16px rgba(0,0,0,0.3)` | Bottom sheets |
| **E4** — Modals | `0 24px 64px rgba(0,0,0,0.7)` + `0 8px 24px rgba(0,0,0,0.4)` | Modals, Command Palette |

### 2.4 Border System

Borders are never decorative. They define glass edges.

| Border Type | Value | Usage |
|------------|-------|-------|
| **Standard** | `1px solid rgba(255,255,255,0.12)` | All glass surfaces |
| **Strong** | `1px solid rgba(255,255,255,0.20)` | Modals, command palette |
| **Subtle** | `1px solid rgba(255,255,255,0.06)` | List separators |
| **Focus** | `2px solid rgba(255,255,255,0.60)` | Active input fields |
| **None** | — | Inline elements without edge definition |

### 2.5 Corner Radius System

Corner radius is consistent and hierarchical. Larger surfaces = larger radius.

| Name | Value | Usage |
|------|-------|-------|
| **Micro** | `4px` | Tags, badges, status dots |
| **Small** | `8px` | Compact buttons, chips |
| **Medium** | `12px` | Standard buttons, input fields |
| **Standard** | `16px` | List items, small cards |
| **Card** | `20px` | Dashboard cards, widget cards |
| **Panel** | `24px` | Side panels, drawers |
| **Sheet** | `32px` | Bottom sheets, modals |
| **Phone Frame** | `44px` | Device mockups |
| **Pill** | `100px` | Tab bar, search bar, FAB |

**Rule**: Never mix radius values arbitrarily. Always choose from this scale.

### 2.6 Spacing System

8-point grid. All spacing values are multiples of 4.

| Token | Value | Usage |
|-------|-------|-------|
| `space-1` | `4px` | Micro gaps, icon padding |
| `space-2` | `8px` | Compact internal spacing |
| `space-3` | `12px` | Standard internal spacing |
| `space-4` | `16px` | Section internal padding |
| `space-5` | `20px` | Standard component gap |
| `space-6` | `24px` | Section gap |
| `space-8` | `32px` | Large section gap |
| `space-10` | `40px` | Content block gap |
| `space-12` | `48px` | Screen section gap |
| `space-16` | `64px` | Major section gap |

**Safe Area Insets**: Always respect iOS safe areas.  
Bottom insets: `34px` (iPhone with Home Indicator) + additional component padding.

### 2.7 Elevation Stack — Full System

```
Layer 0: Background (#000000)
  ↑
Layer 1: Content surfaces (Glass 1 — cards, list items)
  ↑
Layer 2: Floating navigation (Glass 2 — tab bar, header)
  ↑
Layer 3: Sheets and drawers (Glass 2/3 — bottom sheets, side panels)
  ↑
Layer 4: Modals and overlays (Glass 3 — confirmations, previews)
  ↑
Layer 5: Command palette / critical alerts (Glass 4 — highest elevation)
```

**Scrim Layer**: When Layer 3+ appears, a scrim `rgba(0,0,0,0.5)` covers Layer 0–2 behind it, but the glass of the sheet itself remains translucent.

---

## 3. TYPOGRAPHY SYSTEM

### 3.1 Type Scale — iOS / macOS (SF Pro)

| Style | Font | Weight | Size | Line Height | Usage |
|-------|------|--------|------|-------------|-------|
| **Large Title** | SF Pro Display | Bold (700) | 34pt | 41pt | Screen hero titles |
| **Title 1** | SF Pro Display | Bold (700) | 28pt | 34pt | Section titles |
| **Title 2** | SF Pro Display | Bold (700) | 22pt | 28pt | Card titles, sheet headers |
| **Title 3** | SF Pro Display | Semibold (600) | 20pt | 25pt | Sub-section titles |
| **Headline** | SF Pro Text | Semibold (600) | 17pt | 22pt | List item headers |
| **Body** | SF Pro Text | Regular (400) | 17pt | 22pt | Primary body text |
| **Callout** | SF Pro Text | Regular (400) | 16pt | 21pt | Secondary body, captions |
| **Subheadline** | SF Pro Text | Regular (400) | 15pt | 20pt | Supporting text |
| **Footnote** | SF Pro Text | Regular (400) | 13pt | 18pt | Metadata, timestamps |
| **Caption 1** | SF Pro Text | Regular (400) | 12pt | 16pt | Labels, tags |
| **Caption 2** | SF Pro Text | Regular (400) | 11pt | 13pt | Micro labels |

### 3.2 Type Scale — Android (Google Sans / Roboto)

Same scale, mapped to Android equivalents. SF Pro replaced by:
- Display: Google Sans Display
- Body: Google Sans Text / Roboto

### 3.3 Type Scale — Web / macOS

- Primary: `-apple-system, BlinkMacSystemFont, "SF Pro Display", "SF Pro Text"`
- Fallback: `"Helvetica Neue", Helvetica, Arial, sans-serif`

### 3.4 Numeric Typography

All KPI numbers, financial figures, and data values use:
- **SF Pro Rounded** (iOS) or `font-variant-numeric: tabular-nums`
- This ensures consistent column alignment and clean data presentation

| Value Type | Style | Example |
|-----------|-------|---------|
| Large KPI | Title 1, Bold | `$142,840` |
| Medium KPI | Title 3, Semibold | `89%` |
| Table figure | Body, Tabular | `1,284` |
| Trend delta | Caption 1 | `▲ 12%` |

### 3.5 Dynamic Type

PRV fully supports iOS Dynamic Type. All type sizes scale with the user's system font size setting.

| Accessibility | Size Multiplier |
|--------------|----------------|
| xSmall | 0.82× |
| Small | 0.88× |
| Medium (default) | 1.0× |
| Large | 1.12× |
| xLarge | 1.24× |
| xxLarge | 1.35× |
| xxxLarge | 1.47× |
| Accessibility L1–L5 | 1.59× – 1.94× |

Layout must remain functional at all Dynamic Type sizes. No truncation of critical information.

### 3.6 Text Hierarchy via Opacity

In Liquid Glass interfaces, text hierarchy is expressed through **opacity** — not color, not weight alone.

| Hierarchy | Opacity | Usage |
|-----------|---------|-------|
| Primary | 95% | Titles, key information |
| Secondary | 65% | Supporting text, descriptions |
| Tertiary | 35% | Metadata, timestamps, labels |
| Disabled | 15% | Unavailable actions, placeholders |

---

## 4. MOTION SYSTEM

### 4.1 Motion Philosophy

Every motion in PRV must feel **physical and natural** — as if glass surfaces have mass, momentum, and elasticity.

Three principles govern all motion:
1. **Springs** — never linear, never cubic-bezier without spring physics
2. **Continuity** — motion tells a story about where elements come from and go to
3. **Purpose** — every animation communicates state, hierarchy, or action

### 4.2 Easing Curves

| Curve Name | CSS Value | Usage |
|-----------|-----------|-------|
| **Spring (Bouncy)** | `cubic-bezier(0.34, 1.56, 0.64, 1)` | Sheets rising, cards expanding, FAB appearing |
| **Spring (Natural)** | `cubic-bezier(0.25, 1.25, 0.50, 1)` | Tab bar selection, menu items |
| **Smooth** | `cubic-bezier(0.4, 0.0, 0.2, 1)` | Standard transitions (Material 3 compatible) |
| **Ease Out** | `cubic-bezier(0.0, 0.0, 0.2, 1)` | Elements entering the screen |
| **Ease In** | `cubic-bezier(0.4, 0.0, 1.0, 1)` | Elements leaving the screen |
| **Linear** | `linear` | Progress bars ONLY. Never for UI elements. |

### 4.3 Duration Scale

| Duration | Value | Usage |
|----------|-------|-------|
| **Instant** | `0ms` | State changes with no visible transition |
| **Micro** | `100ms` | Tap feedback, opacity flickers |
| **Fast** | `180ms` | Button press, selection highlights |
| **Standard** | `280ms` | Navigation transitions, card expansions |
| **Slow** | `400ms` | Bottom sheets, modal appearances |
| **Deliberate** | `550ms` | Full-screen transitions, complex layouts |

### 4.4 Motion Patterns by Component

#### Bottom Sheet — Appearance
```
Enter:  translateY(100%) → translateY(0)
        opacity: 0 → 1
        Duration: 400ms
        Easing: Spring (Bouncy)

Dismiss: translateY(0) → translateY(110%)
         opacity: 1 → 0
         Duration: 300ms
         Easing: Ease In

Scrim:  opacity: 0 → 0.5 (enter) | 0.5 → 0 (dismiss)
        Duration: 300ms
        Easing: Smooth
```

#### Modal — Appearance
```
Enter:  scale(0.92) + translateY(40px) → scale(1.0) + translateY(0)
        opacity: 0 → 1
        blur: 0 → target blur
        Duration: 350ms
        Easing: Spring (Bouncy)

Dismiss: scale(1.0) → scale(0.96) + translateY(20px)
         opacity: 1 → 0
         Duration: 250ms
         Easing: Ease In
```

#### Command Palette — Appearance
```
Enter:  scale(0.96) + translateY(-20px) → scale(1.0) + translateY(0)
        opacity: 0 → 1
        blur: 0 → 80px (background scrim)
        Duration: 280ms
        Easing: Spring (Natural)
```

#### Toast Notification — Appearance
```
Enter:  translateY(120px) + opacity(0) → translateY(0) + opacity(1)
        Duration: 350ms
        Easing: Spring (Bouncy)
        Origin: bottom center

Auto-dismiss: opacity(1) → opacity(0)
              Duration: 250ms
              Delay: 3000ms (standard) | 5000ms (important)
```

#### Tab Bar — Selection
```
Active indicator: scale(0) → scale(1)
                 Duration: 280ms
                 Easing: Spring (Bouncy)

Icon: translateY(0) → translateY(-2px)
      Duration: 180ms
      Easing: Spring (Natural)
```

#### Card Expansion
```
Expand: height(collapsed) → height(expanded)
        opacity(hidden content): 0 → 1
        Duration: 350ms
        Easing: Spring (Natural)
        Content fades in with 80ms delay
```

#### Page Transition (Navigation)
```
Push: new screen slides from right (trailing edge)
      translateX(100%) → translateX(0)
      Duration: 400ms, Easing: Smooth

Pop:  current screen slides to right
      new (previous) screen slides from left partial position
      Standard iOS push/pop behavior
```

### 4.5 Reduced Motion

When the user has **Reduce Motion** enabled:
- All spring animations → instant or `opacity` only
- Translations removed, only `opacity` transitions remain
- Duration capped at `200ms`
- No scale transforms
- No blur transitions

---

## 5. NAVIGATION DESIGN SYSTEM

### 5.1 Floating Tab Bar Design

The primary navigation element. Never solid, never full-width.

```
Anatomy:
┌──────────────────────────────────────────┐
│  ●  Tab 1  │  ●  Tab 2  │  ●  Tab 3     │  ← Glass pill, floating
│             ↑ Active indicator           │
└──────────────────────────────────────────┘

Dimensions:
  Height:         64px (iPhone) | 72px (iPad)
  Width:          Content-hugging with 24px horizontal padding
  Bottom margin:  8px above Home Indicator / bottom safe area
  Corner radius:  100px (pill)
  Horizontal pos: Centered

Material:         Glass 2 (rgba(255,255,255,0.10) + blur(48px))
Border:           1px solid rgba(255,255,255,0.12)
Shadow:           E2 (floating)
Specular:         Top edge highlight

Active State:
  Icon color:     white 95%
  Label:          white 95%, Caption 1, Semibold
  Indicator:      white pill behind icon+label (scale in with spring)

Inactive State:
  Icon color:     white 35%
  Label:          hidden (icon only when >4 tabs)
```

### 5.2 Floating Search Bar Design

```
Anatomy:
┌─────────────────────────────────────────────────────┐
│  🔍  Search...                              ⌘K  ╳   │
└─────────────────────────────────────────────────────┘

Dimensions:
  Height:         52px
  Width:          Screen width - 32px margin (16px each side)
  Corner radius:  100px (pill)
  Top margin:     8px below status bar / top safe area

Material:         Glass 2
Border:           1px solid rgba(255,255,255,0.12)
Shadow:           E2

States:
  Idle:     Placeholder text at 35% opacity
  Focused:  Blur background (scrim 40%), expand height, show suggestions
  Active:   Results below, cancel button appears
```

### 5.3 Dashboard Header Design

```
Anatomy:
┌─────────────────────────────────────────────────────┐
│  Tuesday · 3 June         [Avatar]  [🔔]  [⌘K]     │
│  Good morning, Ion ←role badge→     [Company ▾]     │
└─────────────────────────────────────────────────────┘

Behavior:
  Scrolls away on scroll-down
  Re-appears on scroll-up (with spring)
  Never static/sticky (dynamic show/hide)

Material: Transparent until scroll → Glass 1 on scroll
```

### 5.4 Breadcrumb Design (Web / iPad / macOS)

```
Dashboard  >  Projects  >  Project Omega  >  Documents

Style:
  Separator:    ">" at 35% opacity
  Inactive crumbs: 65% opacity, tappable
  Active (last): 95% opacity, not tappable
  Truncation:   Middle truncate long project names, never truncate first/last
  Font:         Caption 1, Regular
```

### 5.5 Sidebar Design (iPad / Web / macOS)

```
Width:
  Collapsed:    80px (icon only)
  Expanded:     280px (icon + label)
  iPad full:    320px

Material:       Glass 1 (blurs the content area to the right)
Border-right:   1px solid rgba(255,255,255,0.08)

Section Groups:
  Group header: Caption 2, 35% opacity, uppercase, letter-spacing 0.5px
  Items:        Headline, icon + label
  Active item:  Glass 2 background, white 95%
  Hover item:   Glass 1 background, white 65%
```

---

## 6. COMPONENT DESIGN SYSTEM

### 6.1 Glass Cards

The foundational content container.

```
Standard Card:
  Background:    Glass 1 (rgba(255,255,255,0.06) + blur(32px))
  Border:        1px solid rgba(255,255,255,0.12)
  Border-radius: 20px (Card)
  Specular:      Top edge highlight
  Shadow:        E0 (resting, no shadow)
  Padding:       20px
  
Elevated Card (hover / focused):
  Background:    Glass 2 (rgba(255,255,255,0.10))
  Shadow:        E1
  Transition:    180ms Smooth

Interactive Card (tappable):
  Pressed state: scale(0.98), opacity(0.85)
  Duration:      100ms
  Haptic:        Selection feedback
```

### 6.2 Glass Bottom Sheet

```
Anatomy:
  ┌─────────────────────────────────────────┐
  │              ─── (grabber)              │
  │  Title                          ╳ Close │
  │─────────────────────────────────────────│
  │                                         │
  │  Content Area                           │
  │                                         │
  │─────────────────────────────────────────│
  │  [Primary Action]  [Secondary]          │
  └─────────────────────────────────────────┘

Sizes:
  Small:   30% screen height
  Medium:  50% screen height
  Large:   85% screen height (default)
  Full:    100% - status bar

Material:  Glass 3 (rgba(255,255,255,0.16) + blur(64px))
Radius:    32px top corners only
Grabber:   4×40px, white 25%, rounded, centered, top 12px
Shadow:    E3
Specular:  Top edge

Scrim:     rgba(0,0,0,0.50) behind sheet
           Tap scrim → dismiss

Dismiss:   Swipe down >40% of sheet height → spring dismiss
           Or swipe velocity >500px/s regardless of distance

Safe Area: Bottom padding = home indicator height (34px) + 16px
```

### 6.3 Glass Context Menu

```
Anatomy:
  ┌─────────────────────────────┐
  │  Preview (optional)          │  ← Peek preview on top
  │─────────────────────────────│
  │  ○  Action 1                │
  │─────────────────────────────│
  │  ○  Action 2                │
  │─────────────────────────────│
  │  ○  Action 3 (destructive)  │  ← Red text (or 35% opacity B&W)
  └─────────────────────────────┘

Trigger:   Long press (500ms)
Material:  Glass 3
Width:     240px (iPhone) | 280px (iPad)
Radius:    16px
Shadow:    E4

Appearance:
  scale(0.85) + opacity(0) → scale(1.0) + opacity(1)
  Duration: 280ms, Spring (Bouncy)
  Origin:   From long-press point
```

### 6.4 Glass Toast Notification

```
Anatomy:
  ┌──────────────────────────────────────┐
  │  ○  Title text               [Action]│
  │     Supporting message               │
  └──────────────────────────────────────┘

Variants:
  Success:      ✓ icon, white 95%
  Warning:      △ icon, white 75%
  Error:        ✕ icon, white 95% (urgent)
  Information:  ℹ icon, white 55%

Position:    Bottom center, above tab bar (24px gap)
Material:    Glass 3
Radius:      16px
Shadow:      E3
Width:       Screen width - 32px
Auto-dismiss: 3 seconds (info) | 5 seconds (error)
Haptic:      See Haptic System (§9)

Swipe up → dismiss early (spring animation)
```

### 6.5 Glass Command Palette

```
Anatomy:
  ┌──────────────────────────────────────────────────┐
  │  ⌘K  Search commands...                    [ESC] │
  │──────────────────────────────────────────────────│
  │  RECENT                                          │
  │  ○  Go to Project Omega                          │
  │  ○  Create Task                                  │
  │──────────────────────────────────────────────────│
  │  ACTIONS                                         │
  │  ○  Approve Leave Request                        │
  │  ○  Check Attendance Report                      │
  │──────────────────────────────────────────────────│
  │  AI  Ask PRV AI...                               │
  └──────────────────────────────────────────────────┘

Trigger:      ⌘K (Web/macOS) | Long press search (iPhone)
Material:     Glass 4 (rgba(255,255,255,0.22) + blur(80px))
Radius:       24px
Shadow:       E4
Width:        620px (Web) | full-width minus 32px (mobile)
Max height:   70vh

Background:   Scrim + blur of entire screen behind palette
Appearance:   scale(0.96) + opacity(0) → scale(1) + opacity(1)
              Duration: 280ms, Spring (Natural)

Navigation:   ↑↓ arrow keys | Swipe (mobile)
Confirm:      Enter | Tap
Dismiss:      ESC | Tap outside | Swipe down
```

### 6.6 Glass Modals

```
Anatomy:
  ┌──────────────────────────────────────────┐
  │  Title                          ╳ Close  │
  │──────────────────────────────────────────│
  │                                          │
  │  Content                                 │
  │                                          │
  │──────────────────────────────────────────│
  │  [Cancel]              [Confirm]         │
  └──────────────────────────────────────────┘

Material:   Glass 3
Radius:     32px
Shadow:     E4
Scrim:      rgba(0,0,0,0.60)
Max width:  520px (Web) | Screen - 48px (mobile)

Appearance: scale(0.92) + opacity(0) → scale(1) + opacity(1)
            Duration: 350ms, Spring (Bouncy)
```

### 6.7 Glass Quick Preview Sheet (Peek)

```
Trigger:    Long press on any record (project, product, employee)
Size:       50% screen height (Medium sheet)
Content:    Read-only preview of record
Actions:    "Open Full" button + quick actions at bottom
Material:   Glass 3
Dismiss:    Swipe down OR tap outside

No navigation occurs — user stays in current context.
```

### 6.8 Expandable Glass Cards

```
Collapsed:
  Height: 72px
  Shows:  Icon + Title + primary KPI

Expanded:
  Height: Auto (content)
  Shows:  Full card content, additional KPIs, actions

Tap header to toggle.
Animation: height expand with spring (350ms), content fades in (80ms delay)
```

### 6.9 Glass Input Fields

```
Standard Input:
  Background:    rgba(255,255,255,0.06)
  Border:        1px solid rgba(255,255,255,0.12)
  Border-radius: 12px
  Height:        52px
  Padding:       0 16px
  Font:          Body, Regular

Focused State:
  Border:        2px solid rgba(255,255,255,0.60)
  Background:    rgba(255,255,255,0.10)
  Label:         floats up, Caption 1, 65% opacity

Error State:
  Border:        2px solid rgba(255,255,255,0.90) (bright white = alert)
  Icon:          ✕ at right, 95% opacity
  Message:       Error text below, Caption 1, 95% opacity

Disabled State:
  Background:    rgba(255,255,255,0.03)
  Border:        1px solid rgba(255,255,255,0.06)
  Text:          15% opacity
```

### 6.10 Glass Buttons

```
Primary (CTA):
  Background:    rgba(255,255,255,1.0) — white solid
  Text:          rgba(0,0,0,0.90) — near black (inverted)
  Height:        52px
  Radius:        100px (pill)
  Font:          Headline, Semibold
  Shadow:        E1

Pressed:  scale(0.96), opacity(0.85), Duration: 100ms
Haptic:   Impact (Medium)

Secondary:
  Background:    Glass 2 (rgba(255,255,255,0.10))
  Border:        1px solid rgba(255,255,255,0.20)
  Text:          white 95%
  Height:        52px
  Radius:        100px

Tertiary (Ghost):
  Background:    transparent
  Text:          white 65%
  Height:        44px
  No border

Destructive:
  Background:    Glass 2
  Text:          white 95% (no red — monochrome system)
  Border:        1px solid rgba(255,255,255,0.30) (slightly brighter = warning)

Disabled:
  Opacity:       0.30 on entire button
  No interaction
```

### 6.11 Glass Floating Action Button (FAB)

```
Standard FAB:
  Shape:      Circle, 56px diameter
  Material:   Glass 2
  Border:     1px solid rgba(255,255,255,0.20)
  Shadow:     E2
  Icon:       24px, white 95%
  Position:   Bottom right, 24px from edge, above tab bar

Extended FAB (with label):
  Shape:      Pill
  Size:       56px height, auto width
  Content:    Icon + Label

Appearance:  scale(0) → scale(1), Spring (Bouncy), 350ms
Disappear:   scale(1) → scale(0), Ease In, 200ms
             (hides on scroll down, returns on scroll up)

Long press FAB → expand to Quick Actions radial menu
```

### 6.12 Glass Skeleton Loaders

Never use generic spinners. Every loading state has a skeleton that mirrors the actual content layout.

```
Skeleton Card:
  Layout matches final card exactly
  Elements:   Glass 1 background with shimmer overlay
  Shimmer:    Gradient animation left→right, 1.5s loop
              rgba(255,255,255,0.03) → rgba(255,255,255,0.12) → rgba(255,255,255,0.03)
  Radius:     Matches final element radius
  Duration:   Until content loads

Skeleton Types:
  - Skeleton Card (1×1 to 2×4)
  - Skeleton List Item (full width, 2-line)
  - Skeleton Dashboard (full zone layout)
  - Skeleton Chart (rectangle with shimmer)
  - Skeleton Avatar (circle with shimmer)
```

### 6.13 Empty States

Never display a blank screen.

```
Empty State Structure:
  ┌────────────────────────────────┐
  │                                │
  │         [SF Symbol Icon]       │  ← 72pt, white 25%
  │                                │
  │        Primary Message         │  ← Title 3, white 65%
  │    Supporting description      │  ← Body, white 35%
  │                                │
  │      [Primary Action CTA]      │  ← Standard white button
  │                                │
  └────────────────────────────────┘

Rules:
  Icon must relate to the empty content type
  Message must explain WHY it's empty (not just "No items")
  CTA must offer a clear next action
  Glass card as container (Glass 1)

Examples:
  No tasks:    "All clear" + "No tasks assigned today" + [View Schedule]
  No projects: "Nothing active" + "No projects assigned" + [Contact Manager]
  No orders:   "Quiet today" + "No orders yet" + [View Product Catalog]
```

### 6.14 Glass Status Badges

```
Standard Badge:
  Background:  rgba(255,255,255,0.12)
  Text:        white 95%, Caption 1, Semibold
  Radius:      100px
  Padding:     4px 10px
  Border:      1px solid rgba(255,255,255,0.20)

Severity variants (B&W system):
  Critical:    Background rgba(255,255,255,0.20), bold border
  High:        Background rgba(255,255,255,0.14)
  Medium:      Background rgba(255,255,255,0.08)
  Low:         Background rgba(255,255,255,0.04)
```

### 6.15 Glass Navigation — Sticky Headers

Section headers that remain visible during scroll.

```
Behavior:
  Normal: part of scroll flow
  On scroll past: sticks to top (behind floating search bar)
  Background: Glass 1 + blur(32px) — blurs content scrolling below
  Height: 44px
  Text: Headline, Semibold, white 95%
  Border-bottom: 1px solid rgba(255,255,255,0.08) (appears on stick)
```

### 6.16 Entity Quick Preview Sheet

The primary visual component of the Universal Entity Preview Engine. Extends the Medium Bottom Sheet spec (§6.2) with entity-specific layout zones.

```
Entity Quick Preview Sheet:
  Material:     Glass 3 — rgba(255,255,255,0.16) + blur(64px) + saturate(220%)
  Corner:       32pt top-left, top-right
  Grabber:      36×4pt, rgba(255,255,255,0.22), centered, 12pt from top
  Shadow:       0 -8px 40px rgba(0,0,0,0.5)

  ── HEADER ZONE ──────────────────────────────
  Avatar / Thumbnail:  56pt circle, glass border 1pt rgba(255,255,255,0.20)
  Name:                Title 2, SF Pro, weight 700, white 95%
  Subtitle:            Subhead, weight 400, white 65%
  Status badge:        Glass badge (§6.14), trailing
  Presence dot:        10pt, bottom-right on avatar (person entities only)
  Social icons:        28pt row, SF Symbol style, white 65%, max 5

  ── METRICS ZONE ─────────────────────────────
  Layout:       2×2 glass stat cards (or 1×4 horizontal chips for ≤4 items)
  Stat card:    Glass 1, radius 12pt, padding 12pt
  Value:        Title 3, weight 700, white 95%
  Label:        Caption 1, weight 400, white 35%

  ── CONTENT ZONE ─────────────────────────────
  Section title:  Footnote, weight 600, white 35%, uppercase
  Field row:      Icon (SF Symbol, 16pt) + label (white 65%) + value (white 95%)
  Divider:        1pt rgba(255,255,255,0.06)

  ── ACTION STRIP ─────────────────────────────
  Layout:       Horizontal scroll row, gap 8pt
  Button:       Glass pill, 36pt height, radius 100pt
  Icon:         SF Symbol, 16pt, leading, white 95%
  Label:        Footnote, weight 600, white 95%
  Max visible:  4 buttons (overflow via scroll)

  ── FOOTER ───────────────────────────────────
  "Open Full [Entity] →"
  Height:       52pt
  Background:   Glass 1, full-width
  Separator:    1pt rgba(255,255,255,0.08) above
  Icon:         arrow.up.right SF Symbol, trailing, white 65%
  Text:         Subhead, weight 600, white 95%
```

### 6.17 Apple Contact Card

Person-type entities (Employee, Client, Supplier) use a richer profile card layout inspired by Apple Contacts. Used in the full profile screen header, not the preview sheet.

```
Contact Card Header (full profile screen):
  ┌──────────────────────────────────────────┐
  │  [Blurred avatar as background wallpaper]│
  │  ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░│
  │  ┌────────────────────────────────────┐  │
  │  │  [Avatar 80pt circle]              │  │
  │  │  Full Name (Large Title)           │  │
  │  │  Job Title · Department (Body)     │  │
  │  │  [Status pill]  [Presence label]   │  │
  │  │                                    │  │
  │  │  [Call] [Message] [Email] [More]   │  │ ← Action row
  │  │                                    │  │
  │  │  [LinkedIn][X][Instagram][Website] │  │ ← Social row
  │  └────────────────────────────────────┘  │
  └──────────────────────────────────────────┘
  Blur wallpaper:  avatar image, blur(40px), saturation(60%), darkened 50%
  Card:            Glass 2, radius 24pt, top specular
  Avatar border:   2pt white, shadow 0 4px 16px rgba(0,0,0,0.5)
  Action buttons:  Glass pill, 52×52pt, icon 22pt centered
  Social icons:    32pt, SF Symbol style (see §6.18), white 65%, gap 16pt
```

### 6.18 Social Profile Icons

Social profile icons follow the SF Symbol style (stroke-width 1.6, round caps/joins, outline by default, filled on active state). All icons are monochrome white.

```
Icon sizing:
  In preview sheet:    28pt, white 65%
  In contact card:     32pt, white 65%
  In list row:         20pt, white 35%

Networks and SF-style representations:
  LinkedIn:        Custom SVG SF-style (rectangle + letter mark)
  Facebook:        Custom SVG SF-style (circle + f mark)
  Instagram:       Custom SVG SF-style (rounded square + circle + dot)
  X (Twitter):     Custom SVG SF-style (X letterform)
  TikTok:          Custom SVG SF-style (music note variant)
  Website:         globe (SF Symbol — globe)
  WhatsApp:        Custom SVG SF-style (speech bubble + phone)

Tap behavior:
  → iOS: tries native app first, falls back to Safari
  → Web/Android: opens in new tab / system browser
  → Requires permission: social_profiles.view

GDPR indicator:
  Consent-given:   Normal opacity (white 65%)
  No consent:      Icon hidden entirely
  Pending consent: Icon grayed with lock.fill overlay (white 20%)
```

### 6.19 Presence Indicator

```
Sizes:
  Large (preview header):  12pt circle
  Standard (list row):      8pt circle
  Small (compact row):      6pt circle

Styles (B&W monochrome):
  Available:    Solid fill, white 95%
  Busy:         Half-fill (right half), white 65%
  In Meeting:   calendar.badge.clock icon, 10pt, white 65%
  On Site:      location.fill icon, 10pt, white 65%
  Offline:      Ring only (no fill), white 20%

Placement:
  On avatar:    Bottom-right, 2pt white border between dot and avatar
  In list row:  Leading, before avatar, or trailing name
  In widget:    Trailing the name, 6pt

Animation:
  Available:    Subtle pulse (scale 1→1.2→1, 2s loop, opacity 0.5→1→0.5)
  Status change: Cross-fade 300ms
```

### 6.20 Digital Business Card

```
Digital Business Card layout:
  Size:          343×194pt (aspect 16:9 landscape), or full-width sheet
  Material:      Glass 2 + top specular
  Radius:        20pt

  Top row:       [Company logo 32pt] ─────── [QR code 56×56pt]
  Avatar:        80pt circle, centered-left, glass border
  Name:          Title 2, weight 700, white 95%
  Title:         Subhead, weight 400, white 65%

  Contact row:
    phone.fill   +40 xxx xxx xxx
    envelope     email@company.com
    globe        website.com

  Social row:    [LinkedIn] [X] [Instagram] (28pt icons, white 65%)

  Footer:        [Share]   [Save to Contacts]
                 Glass pills, 36pt, full-width split

QR Code:
  Content:       vCard 4.0 (name, title, org, phone, email, url)
  Style:         White modules on transparent (Glass bg shows through)
  Size:          56pt in card, 200pt in full-screen share view

Sharing:
  "Share" → iOS Share Sheet (exports PNG + .vcf)
  "Save to Contacts" → CNContactStore (iOS) / native handler (Android/Web)
  "Copy Link" → /card/:userId (role-gated public URL, 30-day expiry)
```

---

## 7. DYNAMIC ISLAND DESIGN SYSTEM

### 7.1 Dynamic Island States

The Dynamic Island adapts to role-specific content. Three states:

| State | Size | Usage |
|-------|------|-------|
| **Minimal** | 37×12px | Background activity indicator only |
| **Compact** | 120×37px | Single piece of critical data |
| **Expanded** | 350×160px | Rich contextual information, live updating |

### 7.2 Design Rules

- Background: Always dark (`rgba(0,0,0,0.92)`) — matches hardware
- Text: White only (monochrome rule applies)
- Icons: SF Symbols, white
- Data: Updates smoothly without layout shifts (cross-fade between values)
- Transition: Compact → Expanded via spring (280ms, bouncy)

### 7.3 Role-Specific Dynamic Island Content

#### WORKER
```
Compact:
  Left:    ⏱ shift timer ("04:32h")
  Right:   ✓ tasks done ("3/8")

Expanded:
  Header:  "SHIFT ACTIVE" · Current site name
  Left:    Time elapsed | Right: Tasks completed
  Bottom:  Next task title (truncated)
  Tap:     → Attendance Bottom Sheet
```

#### TEAM LEADER
```
Compact:
  Left:    👥 team present count ("8/10")
  Right:   ⚠ open issues count ("2")

Expanded:
  Header:  "TEAM STATUS" · Team name
  Left:    Attendance breakdown
  Right:   Top open issue preview
  Tap:     → Team Dashboard
```

#### OMS / AREA SUPERVISOR
```
Compact:
  Left:    📍 active sites count
  Right:   % productivity overall

Expanded:
  Header:  "OPERATIONS" · Region/area name
  Left:    Sites: active/total
  Center:  Productivity meter
  Right:   Open issues
  Tap:     → OMS Command Center
```

#### PROJECT WORKER
```
Compact:
  Left:    🏗 project code (truncated)
  Right:   Task count remaining

Expanded:
  Header:  "PROJECT ACTIVE" · Project name
  Content: Current task + phase name
  Bottom:  Next milestone (days remaining)
```

#### PROJECT DIRECTOR
```
Compact:
  Left:    📊 portfolio health indicator
  Right:   Critical issues count

Expanded:
  Header:  "PORTFOLIO" · Active project count
  Left:    On schedule / delayed
  Right:   Budget status
  Bottom:  Next deadline
```

#### STORE MANAGER
```
Compact:
  Left:    💰 today's revenue
  Right:   📦 orders to process

Expanded:
  Header:  "STORE LIVE" · Store name
  Left:    Revenue vs target %
  Right:   Orders: pending/fulfilled
  Bottom:  Top low-stock alert
```

#### CASHIER
```
Compact:
  Left:    🧾 transactions count
  Right:   ⏰ shift end time

Expanded:
  Header:  "REGISTER OPEN" · Register number
  Content: Today's transactions | Average value
  Tap:     → Register view
```

#### CEO
```
Compact:
  Left:    💰 today's revenue (live)
  Right:   🔴 critical alert count

Expanded:
  Header:  "COMPANY LIVE" · Company name
  Row 1:   Revenue today | Profit MTD
  Row 2:   Active projects | Workforce %
  Bottom:  Top critical alert (if any)
  Tap:     → Executive Cockpit
```

#### SHOP DIRECTOR
```
Compact:
  Left:    🏪 network revenue
  Right:   🔴 store alerts

Expanded:
  Header:  "NETWORK LIVE" · Store count
  Content: Total revenue | Best store
  Bottom:  Top stock alert
```

#### HR / PAYROLL
```
Compact:
  Left:    👥 attendance rate %
  Right:   📋 pending approvals

Expanded:
  Header:  "WORKFORCE" · Date
  Left:    Present/Absent/Leave counts
  Right:   Leave requests pending
```

#### FINANCE MANAGER
```
Compact:
  Left:    💳 cashflow indicator (▲/▼)
  Right:   📅 invoices due today

Expanded:
  Header:  "FINANCE LIVE"
  Left:    Cash position
  Right:   Receivables overdue
  Bottom:  Payroll date (if within 7 days)
```

#### SYSTEM ADMINISTRATOR
```
Compact:
  Left:    🔒 security score
  Right:   ⚡ system health %

Expanded:
  Header:  "SYSTEM STATUS"
  Left:    Security events (24h)
  Right:   Platform uptime
  Bottom:  Pending security alerts
```

### 7.4 Dynamic Island Interaction

| Gesture | Result |
|---------|--------|
| Tap compact | Expand to expanded state |
| Tap expanded | Open relevant Bottom Sheet |
| Long press expanded | Options menu (settings, disable) |
| Swipe away | Minimize to minimal |

---

## 8. WIDGET DESIGN SYSTEM

### 8.1 Home Screen Widgets

All widgets follow the Liquid Glass design system adapted to the widget context.

```
Widget Family Sizes:
  Small:   2×2 (iOS grid units) — 155×155pt
  Medium:  4×2 — 329×155pt
  Large:   4×4 — 329×345pt
  ExtraLarge (iPad): 4×4 scaled

Widget Design Rules:
  Background:    Glass surface (adapts to wallpaper)
  Corner radius: 22px (iOS enforced)
  Padding:       16px
  No interactivity beyond tap → deep link
```

#### Small Widget — KPI

```
┌────────────────────┐
│ Icon               │
│                    │
│ 142,840            │← Large Title, bold
│ Revenue Today      │← Caption 1, 35% opacity
│ ▲ 12% vs yesterday│← Caption 2, 65% opacity
└────────────────────┘
```

#### Medium Widget — KPI Summary

```
┌────────────────────────────────┐
│ PRV                  06:45 AM  │← Caption 1, 35%
│                                │
│ Revenue    Profit    Projects  │← 3-column KPI grid
│ $142k      $38k      12       │← Title 3, bold
│ ▲ 12%      ▲ 8%      2 delayed│← Caption 1
└────────────────────────────────┘
```

#### Large Widget — My Day

```
┌────────────────────────────────┐
│ Good morning, Ion        ⏰    │
│ Tuesday, 3 June                │
│────────────────────────────────│
│ TODAY'S SCHEDULE               │
│ ● 08:00  Site A inspection     │
│ ● 10:30  Team briefing         │
│ ● 14:00  Material delivery     │
│────────────────────────────────│
│ 3 tasks · 2 approvals pending  │
└────────────────────────────────┘
```

### 8.2 Lock Screen Widgets

Minimal information, maximum legibility.

```
Circular Widget (icon + value):
  Shift timer: ⏱ 04:32
  Tasks done:  ✓ 3/8
  Revenue:     $ 142k

Rectangular Widget (icon + label + value):
  [🏗] Project Omega  →  Phase 2 · 68%
  [👥] Team Alpha     →  Present 8/10
  [💰] Revenue Today  →  $142,840
```

### 8.3 Dashboard Widgets

In-app dashboard widgets follow the full Glass Card specification.

```
Micro (1×1):
  Single metric + trend arrow
  Glass 1 background

Small (1×2):
  Metric + sparkline chart
  Glass 1 + E0 shadow

Medium (2×2):
  Metric + chart + breakdown
  Glass 1 + E0

Large (2×4):
  Full KPI card: history + comparisons + targets
  Glass 1 + E0

Widget States: Loading (skeleton) | Active | Stale | Error | No Data | Alert
```

---

## 9. HAPTIC SYSTEM

### 9.1 Philosophy

Every significant interaction in PRV produces haptic feedback. Haptics are not decorative — they confirm actions, signal errors, and provide tactile rhythm to the interface.

### 9.2 Haptic Patterns

| Pattern | iOS API | Usage |
|---------|---------|-------|
| **Impact Light** | `UIImpactFeedbackGenerator(.light)` | Tap on list item, card selection |
| **Impact Medium** | `UIImpactFeedbackGenerator(.medium)` | Button press, tab selection |
| **Impact Heavy** | `UIImpactFeedbackGenerator(.heavy)` | FAB tap, modal open, significant action |
| **Impact Rigid** | `UIImpactFeedbackGenerator(.rigid)` | Critical action confirmation |
| **Impact Soft** | `UIImpactFeedbackGenerator(.soft)` | Drag handle interaction, sheet grab |
| **Selection** | `UISelectionFeedbackGenerator()` | Scrolling through lists, picker changes |
| **Success** | `UINotificationFeedbackGenerator(.success)` | Task completed, approval granted, check-in success |
| **Warning** | `UINotificationFeedbackGenerator(.warning)` | Alert raised, validation warning |
| **Error** | `UINotificationFeedbackGenerator(.error)` | Action failed, authentication error |

### 9.3 Haptic Trigger Map

| Interaction | Haptic |
|-------------|--------|
| Tap list item | Impact Light |
| Tap button (primary) | Impact Medium |
| Tap FAB | Impact Heavy |
| Tab bar selection | Impact Medium |
| Bottom sheet grab | Impact Soft |
| Bottom sheet spring dismiss | Impact Light |
| Card expand | Impact Light |
| Context menu appear | Impact Heavy |
| Long press trigger | Impact Medium (at trigger point) |
| Check-in success | Success |
| Approval granted | Success |
| Task completed | Success |
| Error message shown | Error |
| Authentication failed | Error (double pulse) |
| Warning alert appears | Warning |
| Scroll through picker | Selection |
| Drag card | Impact Soft (continuous) |
| Command palette open | Impact Rigid |
| Command palette execute | Success |

### 9.4 Haptic Rules

- Never repeat haptic feedback for the same continuous gesture
- Maximum one haptic per 100ms
- Respect user's **Haptics** setting in iOS Accessibility
- If Reduce Motion is enabled → still use haptics (they are separate settings)
- Android: use `HapticFeedbackConstants` equivalents

---

## 10. APPLE EXPERIENCE BLUEPRINT

### 10.1 The Standard

PRV must feel closer to:

| Reference | What PRV Borrows |
|-----------|-----------------|
| **Apple Business Manager** | Clean enterprise data, role clarity |
| **Apple Wallet** | Card-based UI, glass surfaces, haptics |
| **Apple Home** | Status at a glance, live data, widgets |
| **Things 3** | Task elegance, whitespace, typography |
| **Linear** | Speed, command palette, keyboard-first |
| **Notion** | Information hierarchy, flexible blocks |

PRV must **not** feel like:

| Anti-reference | What to Avoid |
|--------------|--------------|
| SAP | Dense grids, colorful status bars, no whitespace |
| Oracle ERP | Tabbed forms, modal-heavy, non-touch |
| Old admin panels | Sidebar-heavy, flat design, generic icons |
| Traditional CRM | Cluttered dashboards, data overload |

### 10.2 The Apple Test

Before any screen or component is shipped, it must pass The Apple Test:

1. **Would this look at home in iOS 26?** — If not, redesign.
2. **Is every surface glass?** — If not, apply glass material.
3. **Does every element float?** — If not, add proper elevation.
4. **Is every animation spring-based?** — If not, replace.
5. **Is the design monochrome?** — If a color accent exists, remove it.
6. **Is there max 3-level navigation depth?** — If not, flatten.
7. **Does the screen have an empty state?** — If not, add one.
8. **Do all loading states use skeletons?** — If spinners exist, replace.

### 10.3 Information Density — Apple Standard

PRV uses **medium density** — enough information without overwhelming.

| Screen Type | Density Rule |
|------------|-------------|
| Dashboard | 3–5 KPI widgets visible, not 20 |
| List views | Single-line items with expand on tap |
| Detail views | Chunked sections with glass cards |
| Forms | One concept per section, generous spacing |
| Data tables | Max 5 columns on iPhone, scrollable |

### 10.4 Gesture Vocabulary

All gestures follow iOS HIG standards:

| Gesture | Action |
|---------|--------|
| Tap | Primary action |
| Long press | Context menu / Peek preview |
| Swipe left | Reveal actions (delete, archive) |
| Swipe right | Reveal secondary actions |
| Swipe down | Dismiss sheet / Close overlay |
| Swipe up (from bottom) | Home / Background |
| Pull down (from list top) | Refresh |
| Pinch | Zoom (maps, images, PDFs) |
| Drag | Reorder items (with haptic) |
| Two-finger scroll | Scroll in nested views |

### 10.5 Accessibility — Non-Negotiable

| Requirement | Standard |
|------------|---------|
| Contrast | WCAG 2.1 AA (4.5:1 text, 3:1 UI) |
| Touch targets | Minimum 44×44pt |
| VoiceOver | All elements labeled |
| Dynamic Type | All layouts adapt to all sizes |
| Reduce Motion | All animations have non-motion alternative |
| Reduce Transparency | Glass → solid equivalent for high opacity |
| Smart Invert | Images excluded from inversion |
| Keyboard navigation | Full keyboard support (Web + macOS + iPad) |

### 10.6 Cross-Platform Consistency Rules

| Element | iPhone | iPad | Web | Android | macOS |
|---------|--------|------|-----|---------|-------|
| Glass surfaces | ✓ | ✓ | ✓ | ✓ | ✓ |
| Tab bar style | Floating pill | Sidebar | Top nav | Bottom nav pill | Sidebar |
| Bottom sheets | ✓ | ✓ | Drawer from right | ✓ | Panel |
| Command Palette | Long-press search | ⌘K | ⌘K | Search overlay | ⌘K |
| Dynamic Island | ✓ (iPhone 14+) | — | — | Notification chip | — |
| Haptics | Full | Full | — | Full | Limited |
| Spring animations | Native UIKit | Native UIKit | CSS cubic-bezier | Android spring | SwiftUI spring |

### 10.7 Design Review Checklist

Before every screen is considered complete:

**Visual**
- [ ] All surfaces are glass (no solid cards)
- [ ] Correct glass material level (1–4) for elevation
- [ ] Top specular highlight on all glass surfaces
- [ ] Correct corner radius from the scale
- [ ] Monochrome — no color accents
- [ ] Text hierarchy via opacity (95/65/35/15%)
- [ ] SF Pro typography on iOS/macOS
- [ ] Floating navigation elements (not solid, not full-width)
- [ ] All icons are SF Symbol style — when in doubt between custom and SF Symbol, SF Symbol wins

**Interaction**
- [ ] All overlays have spring animations
- [ ] Bottom sheets have grabber + spring dismiss
- [ ] Context menus on long-press where appropriate
- [ ] FAB present with role-correct action
- [ ] Empty state defined
- [ ] Skeleton loader defined
- [ ] Haptics assigned to all significant interactions

**Content**
- [ ] Max 3-level navigation depth
- [ ] Role-appropriate information only
- [ ] Permission-filtered data
- [ ] Audit log triggered on all write actions
- [ ] Notification generated for all significant events

---

## APPENDIX A — DESIGN TOKEN REFERENCE

### Color Tokens
```
--glass-1:         rgba(255, 255, 255, 0.06)
--glass-2:         rgba(255, 255, 255, 0.10)
--glass-3:         rgba(255, 255, 255, 0.16)
--glass-4:         rgba(255, 255, 255, 0.22)
--border:          rgba(255, 255, 255, 0.12)
--border-strong:   rgba(255, 255, 255, 0.20)
--border-subtle:   rgba(255, 255, 255, 0.06)
--specular:        rgba(255, 255, 255, 0.32)
--text-primary:    rgba(255, 255, 255, 0.95)
--text-secondary:  rgba(255, 255, 255, 0.65)
--text-tertiary:   rgba(255, 255, 255, 0.35)
--text-disabled:   rgba(255, 255, 255, 0.15)
--scrim:           rgba(0, 0, 0, 0.50)
--background:      #000000
```

### Blur Tokens
```
--blur-1: blur(32px)   /* Cards, Panels */
--blur-2: blur(48px)   /* Menus, Sheets */
--blur-3: blur(64px)   /* Modals, Overlays */
--blur-4: blur(80px)   /* Command Palette, Critical */
```

### Radius Tokens
```
--radius-micro:    4px
--radius-small:    8px
--radius-medium:   12px
--radius-standard: 16px
--radius-card:     20px
--radius-panel:    24px
--radius-sheet:    32px
--radius-frame:    44px
--radius-pill:     100px
```

### Motion Tokens
```
--spring-bouncy:  cubic-bezier(0.34, 1.56, 0.64, 1)
--spring-natural: cubic-bezier(0.25, 1.25, 0.50, 1)
--smooth:         cubic-bezier(0.40, 0.00, 0.20, 1)
--ease-out:       cubic-bezier(0.00, 0.00, 0.20, 1)
--ease-in:        cubic-bezier(0.40, 0.00, 1.00, 1)

--duration-micro:     100ms
--duration-fast:      180ms
--duration-standard:  280ms
--duration-slow:      400ms
--duration-deliberate: 550ms
```

### Spacing Tokens
```
--space-1:  4px
--space-2:  8px
--space-3:  12px
--space-4:  16px
--space-5:  20px
--space-6:  24px
--space-8:  32px
--space-10: 40px
--space-12: 48px
--space-16: 64px
```

---

## APPENDIX B — WHAT NEVER APPEARS IN PRV

| Forbidden Element | Why |
|------------------|-----|
| Solid colored cards | Violates glass law |
| Full-width solid navigation bars | Violates floating law |
| Color accents (blue, green, red fills) | Violates monochrome law |
| Generic loading spinners | Use skeleton loaders |
| Blank/empty screens without state | Always show empty state |
| Linear/cubic-bezier animations (non-spring) | Violates motion law |
| Hard card shadows (thick, colored) | Use elevation system |
| Thick borders (2px+, opaque) | Use glass border system |
| Traditional table UIs (rows, alternating colors) | Use glass list items |
| Dense form layouts (multiple fields per row) | One concept per section |
| Hamburger menus | Use floating tab bar or sidebar |
| Breadcrumbs on iPhone | iPhone uses navigation stack |
| Custom icons when an SF Symbol equivalent exists | SF Symbols always win — if in doubt, use SF Symbol style |
| Generic icons (non-SF Symbols) | SF Symbols on Apple platforms |
| Abrupt appearances/disappearances | Always animate in/out |

---

*PRV Liquid Glass Design System · Pasul 8 · Source of Truth*  
*Mandatory across all platforms · All components · All roles*  
*Do not deviate without approval from Lead Product Designer.*
