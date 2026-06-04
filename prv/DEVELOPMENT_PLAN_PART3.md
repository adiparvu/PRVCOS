# PRV — Development Plan · Part 3 of 3
## Sprint Plan: Phases 12–25 (Sprints 37–65)
## + Dependency Matrix · Definition of Done · Team Structure · Risk Register

*Continues from DEVELOPMENT_PLAN_PART2.md (Sprint 36, end of Phase 11)*
*Part 1 covers: Epic Catalog, Milestone Definitions, Dependency Graph (Sprints 1–12)*
*Part 2 covers: Sprint Plan Phases 0–11 (Sprints 1–36)*

---

## SPRINT PLAN — PHASE 12: Finance & Document Center
**Weeks 73–84 · Epics 13 & 14 · Sprints 37–42**
**Milestone Target: M9 — Finance & Documents Live (Week 84)**

---

### Sprint 37 — Finance Core: Invoices & Payments
**Weeks 73–74 · Epic 13 · 52 story points**

**Goal:** Invoicing engine is operational — create, send, track, and reconcile invoices with multi-currency and tax support.

**Epic:** 13 — Finance Management

**Key Deliverables:**
- Invoice create/edit screens (line items, tax, discounts)
- Invoice PDF generation (branded, multi-language)
- Payment recording and allocation engine
- Invoice status state machine (draft → sent → viewed → paid → overdue)
- AR aging report

**Stories:**
| ID | Story | Points |
|----|-------|--------|
| F13-S37-01 | Invoice list with filters (status, date, client, amount) | 3 |
| F13-S37-02 | Invoice create form — line items, quantities, unit prices | 5 |
| F13-S37-03 | Tax engine — VAT rates per product, per region, tax summary | 5 |
| F13-S37-04 | Discount logic — line-level, invoice-level, percentage/fixed | 3 |
| F13-S37-05 | Invoice PDF generation — branded header, QR code | 5 |
| F13-S37-06 | Invoice send flow — email, WhatsApp, in-app | 3 |
| F13-S37-07 | Payment recording — amount, date, method, reference | 3 |
| F13-S37-08 | Partial payment allocation — multiple payments per invoice | 5 |
| F13-S37-09 | Invoice status tracker with timeline | 3 |
| F13-S37-10 | AR aging dashboard (0-30, 31-60, 61-90, 90+ days) | 5 |
| F13-S37-11 | Overdue invoice auto-escalation rules | 3 |
| F13-S37-12 | Multi-currency support — live exchange rates | 5 |
| F13-S37-13 | Currency conversion history and locked-rate invoices | 3 |
| F13-S37-14 | Invoice duplication and recurring invoice setup | 3 |
| F13-S37-15 | Sprint regression: CRM quote-to-invoice conversion | 3 |

**Acceptance Criteria:**
- Invoice PDF renders correctly in 3 languages (RO, EN, DE)
- Multi-currency invoice with locked exchange rate
- Partial payment allocation updates invoice balance correctly
- AR aging report groups correctly across all buckets
- Scope enforcement: Finance Manager sees own-company invoices only

---

### Sprint 38 — e-Factura ANAF Integration
**Weeks 75–76 · Epic 13 · 50 story points**

**Goal:** Full Romanian e-Factura compliance — generate, sign, submit, and retrieve status from ANAF RO e-Factura system.

**Epic:** 13 — Finance Management

**Key Deliverables:**
- e-Factura XML generation (UBL 2.1 format)
- ANAF OAuth token management and renewal
- Invoice submission and status polling
- Error handling and correction flow
- e-Factura status timeline in invoice UI

**Stories:**
| ID | Story | Points |
|----|-------|--------|
| F13-S38-01 | ANAF OAuth 2.0 client credentials flow | 5 |
| F13-S38-02 | e-Factura UBL 2.1 XML schema generation | 8 |
| F13-S38-03 | XML digital signature (XAdES-BES) | 8 |
| F13-S38-04 | Submit invoice to ANAF sandbox endpoint | 5 |
| F13-S38-05 | Poll ANAF status — pending, processed, rejected | 5 |
| F13-S38-06 | ANAF rejection parser — extract error codes, display human-readable message | 5 |
| F13-S38-07 | Invoice correction flow (storno + corrected invoice) | 5 |
| F13-S38-08 | e-Factura badge on invoice list (sent / confirmed / rejected) | 2 |
| F13-S38-09 | e-Factura timeline in invoice detail screen | 3 |
| F13-S38-10 | Background job: retry failed ANAF submissions (Inngest) | 3 |
| F13-S38-11 | ANAF submission audit log entry | 2 |
| F13-S38-12 | Production ANAF endpoint switch and credential management | 3 |

**Acceptance Criteria:**
- Valid UBL 2.1 XML accepted by ANAF sandbox
- Rejected invoice shows human-readable error with correction guidance
- Retry logic handles ANAF outages without data loss
- All ANAF interactions captured in audit log

---

### Sprint 39 — Expense Claims & Budgets
**Weeks 77–78 · Epic 13 · 48 story points**

**Goal:** Employee expense claim lifecycle and budget management with cost center allocation.

**Epic:** 13 — Finance Management

**Key Deliverables:**
- Expense claim create/submit/approve flow
- Receipt photo capture and OCR extraction
- Budget definition per cost center per period
- Budget vs. actual dashboard
- Approval Engine integration for expense claims

**Stories:**
| ID | Story | Points |
|----|-------|--------|
| F13-S39-01 | Expense claim create — category, amount, date, description | 3 |
| F13-S39-02 | Receipt photo capture with OCR auto-fill (amount, merchant, date) | 8 |
| F13-S39-03 | Multi-line expense claim with mixed categories | 3 |
| F13-S39-04 | Expense claim submit → approval chain (Manager → Finance Manager) | 5 |
| F13-S39-05 | Finance Manager approve/reject with comment | 3 |
| F13-S39-06 | Expense claim payment recording (bank transfer / petty cash) | 3 |
| F13-S39-07 | Budget definition — cost center, period, category, cap amount | 5 |
| F13-S39-08 | Budget vs. actual — real-time spend tracking | 5 |
| F13-S39-09 | Budget alert at 80% threshold — notification + Dynamic Island | 3 |
| F13-S39-10 | Cost center drill-down — expenses grouped by category | 3 |
| F13-S39-11 | Expense report export (CSV, PDF) | 3 |
| F13-S39-12 | Per diem rules — automatic daily allowance calculation | 3 |

**Acceptance Criteria:**
- OCR extraction pre-fills ≥3 fields on 80% of receipts
- Budget alert fires when spend crosses 80% of cap
- Expense claim cannot be approved by the submitter
- Cost center scope enforced — Manager sees own department only

---

### Sprint 40 — Document Center: Upload, Version, Sign
**Weeks 79–80 · Epic 14 · 52 story points**

**Goal:** Full document management lifecycle — upload, organize, version, share, and collect e-signatures.

**Epic:** 14 — Document Center

**Key Deliverables:**
- Document folder structure with permission inheritance
- File upload with virus scan and format validation
- Version control — compare, restore, promote
- E-signature flow (in-app and email link)
- Document share link with expiry and watermark

**Stories:**
| ID | Story | Points |
|----|-------|--------|
| F14-S40-01 | Folder tree UI — create, rename, move, delete folders | 5 |
| F14-S40-02 | Folder permission inheritance — viewer / editor / owner per role | 5 |
| F14-S40-03 | File upload — drag-and-drop, multi-file, 500MB limit | 3 |
| F14-S40-04 | Virus scan pipeline on upload (ClamAV integration) | 5 |
| F14-S40-05 | Format validation — allowed types per folder template | 3 |
| F14-S40-06 | Document metadata — tags, description, expiry date, owner | 3 |
| F14-S40-07 | Version history — view all versions, timestamps, diff summary | 5 |
| F14-S40-08 | Version restore — promote older version to current | 3 |
| F14-S40-09 | Document preview in-app (PDF, images, Office via converter) | 5 |
| F14-S40-10 | E-signature request — select signers, field placement, order | 8 |
| F14-S40-11 | Signer email link — sign in browser, no login required | 5 |
| F14-S40-12 | Signed document audit trail (signer IP, timestamp, device) | 3 |
| F14-S40-13 | Share link — expiry date, password-protect, view/download only | 3 |
| F14-S40-14 | Watermark generation on shared PDF exports | 3 |

**Acceptance Criteria:**
- Virus scan blocks malicious uploads with user-facing error
- Version restore creates new version (never overwrites history)
- E-signature audit trail embedded in final PDF
- Share link respects expiry — expired links return 410 Gone

---

### Sprint 41 — Finance Reporting & Cash Flow
**Weeks 81–82 · Epic 13 · 48 story points**

**Goal:** Executive-grade financial reporting — P&L, cash flow forecast, and cross-company consolidation.

**Epic:** 13 — Finance Management

**Key Deliverables:**
- Profit & Loss statement (month / quarter / YTD)
- Cash flow statement and 90-day forecast
- Balance sheet summary
- Cross-company financial consolidation (Group CEO view)
- Finance dashboard with drill-down

**Stories:**
| ID | Story | Points |
|----|-------|--------|
| F13-S41-01 | P&L engine — revenue, COGS, gross profit, OpEx, net | 8 |
| F13-S41-02 | P&L period selector — month / quarter / half-year / YTD / custom | 3 |
| F13-S41-03 | P&L comparison — current vs. prior period, vs. budget | 5 |
| F13-S41-04 | Cash flow statement — operating, investing, financing | 5 |
| F13-S41-05 | 90-day cash flow forecast — based on open invoices + commitments | 8 |
| F13-S41-06 | Balance sheet summary — assets, liabilities, equity | 5 |
| F13-S41-07 | Cross-company consolidation — Group CEO aggregated view | 5 |
| F13-S41-08 | Intercompany elimination rules | 3 |
| F13-S41-09 | Finance dashboard — 8 KPI tiles, sparklines, variance indicators | 5 |
| F13-S41-10 | Finance report export — PDF, XLSX | 3 |

**Acceptance Criteria:**
- P&L numbers reconcile with invoice and payment data
- 90-day forecast reflects real open AR/AP positions
- Group CEO consolidation correctly eliminates intercompany
- Report export matches on-screen totals exactly

---

### Sprint 42 — Finance & Document Epic Close
**Weeks 83–84 · Epics 13 & 14 · 48 story points**

**Goal:** Complete Finance and Document epics — AP/supplier invoice matching, document compliance tracking, and milestone sign-off.

**Epic:** 13 & 14

**Key Deliverables:**
- AP aging and supplier invoice management
- 3-way matching verification screen (Finance side)
- Document compliance tracker (contracts, certifications, expirations)
- Finance + Document regression test suite
- M9 milestone acceptance

**Stories:**
| ID | Story | Points |
|----|-------|--------|
| F13-S42-01 | AP aging dashboard (0-30, 31-60, 61-90, 90+ days) | 5 |
| F13-S42-02 | Supplier invoice list with matching status | 3 |
| F13-S42-03 | 3-way match verification — PO / GR / Supplier Invoice | 5 |
| F13-S42-04 | Payment batch processing — select multiple invoices, schedule batch | 5 |
| F14-S42-05 | Document compliance tracker — expiring docs alert (30 / 7 / 1 day) | 5 |
| F14-S42-06 | Compliance dashboard — red/amber/green by document category | 3 |
| F14-S42-07 | Document retention policy engine — auto-archive after N years | 5 |
| F13-S42-08 | Finance permission audit — scope enforcement regression | 3 |
| F14-S42-09 | Document permission audit — folder ACL regression | 3 |
| F13-S42-10 | Epic 13 full regression test suite | 5 |
| F14-S42-11 | Epic 14 full regression test suite | 3 |
| MILESTONE | M9 sign-off — Finance & Documents Live (Week 84) | 2 |

**Acceptance Criteria:**
- 3-way match flags discrepancies > 0.01 NUMERIC tolerance
- Document expiry alert fires exactly 30 / 7 / 1 day before expiry
- Retention policy archives (not deletes) documents correctly
- All Finance and Document scope rules pass regression suite

---

## SPRINT PLAN — PHASE 13: Communication Center
**Weeks 83–90 · Epic 15 · Sprints 40–44 (partial overlap with Phase 12)**

---

### Sprint 43 — Communication: Channels & Messaging
**Weeks 85–86 · Epic 15 · 52 story points**

**Goal:** Real-time team communication — channels, direct messages, threads, and reactions.

**Epic:** 15 — Communication Center

**Key Deliverables:**
- Channel create / manage / archive
- Direct message and group DM
- Thread replies and message reactions
- Real-time delivery (Redis pub/sub)
- Message search (Typesense)

**Stories:**
| ID | Story | Points |
|----|-------|--------|
| F15-S43-01 | Channel list with unread counts and mute toggle | 3 |
| F15-S43-02 | Channel create — name, description, type (public/private/announcement) | 3 |
| F15-S43-03 | Channel member management — add, remove, role (owner/member) | 3 |
| F15-S43-04 | Message composer — rich text, emoji, @mention, #channel-link | 5 |
| F15-S43-05 | File attachment in message (max 100MB) | 3 |
| F15-S43-06 | Thread reply — inline expand, separate thread view | 5 |
| F15-S43-07 | Message reactions — emoji picker, reaction counts, reactors list | 3 |
| F15-S43-08 | Direct message — 1:1 conversation | 3 |
| F15-S43-09 | Group DM — up to 20 participants | 3 |
| F15-S43-10 | Real-time delivery — Redis pub/sub, optimistic UI | 8 |
| F15-S43-11 | Message read receipts — delivered, seen | 3 |
| F15-S43-12 | Typesense message search — full-text, scoped to accessible channels | 5 |
| F15-S43-13 | Message edit and delete (with edit history) | 3 |
| F15-S43-14 | Channel scope enforcement — company_id isolation | 5 |

**Acceptance Criteria:**
- Message appears in recipient UI within 300ms (Redis path)
- Channel scope: User cannot join channels outside own company
- Message search results exclude channels user is not a member of
- Message delete creates tombstone record (never truly deleted)

---

### Sprint 44 — Communication: Media, Calls & Retention
**Weeks 87–88 · Epic 15 · 50 story points**

**Goal:** Voice notes, image messages, video call initiation, and data retention policies.

**Epic:** 15 — Communication Center

**Key Deliverables:**
- Voice note recording and playback
- Image / video message with preview
- Video call initiation (external link or WebRTC)
- Message retention policy (configurable per channel)
- Communication audit log for compliance

**Stories:**
| ID | Story | Points |
|----|-------|--------|
| F15-S44-01 | Voice note recording — hold-to-record, waveform preview | 8 |
| F15-S44-02 | Voice note playback — speed control (1x, 1.5x, 2x) | 3 |
| F15-S44-03 | Image message — camera capture, gallery select, compressed upload | 5 |
| F15-S44-04 | Video message — record up to 60s, thumbnail preview | 5 |
| F15-S44-05 | Video call initiation — generate meeting link (Daily.co / Jitsi) | 5 |
| F15-S44-06 | Message retention policy — set per channel (30d / 90d / 1yr / forever) | 5 |
| F15-S44-07 | Retention enforcement job — Inngest daily sweep, soft-delete expired | 3 |
| F15-S44-08 | Compliance export — export channel history (legal hold) | 5 |
| F15-S44-09 | DLP policy — flag messages with keywords (configurable per company) | 5 |
| F15-S44-10 | Message pinning — pin important messages to channel | 2 |
| F15-S44-11 | Mention notifications — @username → push notification | 3 |
| F15-S44-12 | Epic 15 regression test suite | 3 |

**Acceptance Criteria:**
- Voice note upload completes within 3s on 4G connection
- Retention sweep correctly soft-deletes expired messages
- Legal hold export produces chronological JSON with metadata
- DLP keyword flag creates security_event record (no user-facing alert)

---

## SPRINT PLAN — PHASE 14: Notification Center
**Weeks 87–94 · Epic 16 · Sprints 44–48**

---

### Sprint 45 — Notification Engine: Templates & Routing
**Weeks 89–90 · Epic 16 · 50 story points**

**Goal:** Notification engine is operational — template system, channel routing, user preferences, and delivery tracking.

**Epic:** 16 — Notification Center

**Key Deliverables:**
- Notification template editor (push / email / SMS / in-app)
- Variable substitution engine
- Channel routing rules per notification type
- User notification preferences UI
- Delivery status tracking per channel

**Stories:**
| ID | Story | Points |
|----|-------|--------|
| F16-S45-01 | Notification template CRUD — name, type, subject, body, variables | 5 |
| F16-S45-02 | Variable substitution engine — {{user.name}}, {{entity.title}}, etc. | 5 |
| F16-S45-03 | Push notification delivery (APNs + FCM via Expo) | 5 |
| F16-S45-04 | Email notification delivery (SendGrid / Resend) with tracking | 5 |
| F16-S45-05 | SMS notification delivery (Twilio) with cost tracking | 5 |
| F16-S45-06 | In-app notification bell with unread count | 3 |
| F16-S45-07 | Notification center screen — list, filter, mark read/unread | 3 |
| F16-S45-08 | Channel routing rules — priority matrix per notification type | 5 |
| F16-S45-09 | User preference screen — per-type on/off, quiet hours | 5 |
| F16-S45-10 | Delivery tracking — sent, delivered, opened, failed | 5 |
| F16-S45-11 | Notification batch grouping (anti-flood — max 3 per 10 min) | 3 |
| F16-S45-12 | Notification delivery dashboard (admin view) | 3 |

**Acceptance Criteria:**
- Push notification arrives within 5s of trigger event
- Email opens tracked via 1x1 pixel tracking pixel
- Quiet hours correctly suppress notifications (no send, queued for morning)
- Batch grouping prevents more than 3 push notifications per 10 minutes per user

---

### Sprint 46 — Dynamic Island, Widgets & Live Activities
**Weeks 91–92 · Epic 16 · 52 story points**

**Goal:** Dynamic Island live activities, home screen and lock screen widgets fully operational for all role types.

**Epic:** 16 — Notification Center

**Key Deliverables:**
- Dynamic Island Live Activity implementation (all role types)
- Lock Screen widgets (4 widget sizes per role)
- Home Screen widgets
- Standby mode (iPad / always-on)
- Widget data refresh architecture (background refresh)

**Stories:**
| ID | Story | Points |
|----|-------|--------|
| F16-S46-01 | Live Activity: Clock-in timer (Worker, Field Supervisor) | 8 |
| F16-S46-02 | Live Activity: Approval pending counter (Manager, Finance) | 5 |
| F16-S46-03 | Live Activity: Active delivery / trip (Fleet Manager, Driver) | 5 |
| F16-S46-04 | Live Activity: Project task in-progress (Project Manager, Team Lead) | 5 |
| F16-S46-05 | Lock Screen widget: Daily revenue (CEO, Store Manager) | 3 |
| F16-S46-06 | Lock Screen widget: Attendance live count (HR, Store Manager) | 3 |
| F16-S46-07 | Lock Screen widget: Open approvals count (Manager hierarchy) | 3 |
| F16-S46-08 | Home Screen widget: KPI summary 2x2 grid | 5 |
| F16-S46-09 | Home Screen widget: Task list 2x4 | 3 |
| F16-S46-10 | Standby mode layout — large KPI clock face | 3 |
| F16-S46-11 | Widget background refresh — 15-min interval, battery-aware | 5 |
| F16-S46-12 | Widget deep link routing — tap → correct app screen | 3 |

**Acceptance Criteria:**
- Live Activity updates propagate within 10s of trigger event
- Widget refreshes consume < 5% additional battery in 8h test
- Widget deep link navigates to correct screen without full re-auth
- Live Activity dismissed automatically when underlying event resolves

---

### Sprint 47 — Notification Intelligence & Analytics
**Weeks 93–94 · Epic 16 · 46 story points**

**Goal:** AI-powered notification prioritization, notification analytics, and Epic 16 completion.

**Epic:** 16 — Notification Center

**Key Deliverables:**
- Notification priority scoring (AI-assisted)
- Notification analytics dashboard
- A/B test framework for notification content
- Platform Admin notification management console
- Epic 16 regression and milestone prep

**Stories:**
| ID | Story | Points |
|----|-------|--------|
| F16-S47-01 | Notification priority scoring — urgency × role × time-of-day | 5 |
| F16-S47-02 | Smart bundling — group related notifications by topic | 5 |
| F16-S47-03 | Notification open-rate analytics — per template, per role | 5 |
| F16-S47-04 | Opt-out tracking — reason collection, compliance | 3 |
| F16-S47-05 | A/B test framework — alternate templates, measure open rate | 5 |
| F16-S47-06 | Platform Admin console — view delivery stats, block abusive senders | 5 |
| F16-S47-07 | Cost dashboard — SMS/email spend per company | 3 |
| F16-S47-08 | Notification DLP — block notifications containing PII fields | 5 |
| F16-S47-09 | Epic 16 regression test suite | 5 |
| F16-S47-10 | Epic 16 documentation freeze | 2 |

**Acceptance Criteria:**
- Priority scoring reorders notification queue correctly
- A/B test framework randomizes with consistent seed per user
- DLP blocks PII in notification bodies before delivery
- SMS cost tracked per company with monthly cap enforcement

---

## SPRINT PLAN — PHASE 15: Analytics Platform
**Weeks 95–102 · Epic 17 · Sprints 48–51**

---

### Sprint 48 — Analytics: Event Collection & Rollups
**Weeks 95–96 · Epic 17 · 52 story points**

**Goal:** Analytics infrastructure operational — event collection pipeline, daily rollups, and metric definitions.

**Epic:** 17 — Analytics

**Key Deliverables:**
- Client-side event tracking SDK (web + mobile)
- Server-side event emission pipeline
- Daily rollup jobs (Inngest)
- Metric definition registry
- Company-scoped analytics isolation

**Stories:**
| ID | Story | Points |
|----|-------|--------|
| F17-S48-01 | Analytics event schema — event_name, entity_type, entity_id, actor, properties | 5 |
| F17-S48-02 | Client event emitter — web SDK, fire-and-forget, non-blocking | 5 |
| F17-S48-03 | Mobile event emitter — offline queue, flush on reconnect | 5 |
| F17-S48-04 | Server-side event emission — triggered from API handlers | 3 |
| F17-S48-05 | Event ingestion API — validate, enrich (company_id, session), write to partition | 5 |
| F17-S48-06 | Daily rollup job — aggregate to analytics_daily_rollups | 5 |
| F17-S48-07 | Weekly and monthly rollup jobs | 3 |
| F17-S48-08 | Metric definition registry — slug, formula, unit, rollup_fn | 5 |
| F17-S48-09 | Company-scoped analytics — RLS on analytics_events | 5 |
| F17-S48-10 | Analytics event explorer (admin) — raw event table, filters | 5 |
| F17-S48-11 | Data retention enforcement — delete partitions past retention date | 3 |
| F17-S48-12 | Analytics schema version migration (forward-compatible) | 3 |

**Acceptance Criteria:**
- Event emission adds < 5ms latency to any API call
- Daily rollup completes in < 2 minutes for 1M events
- Analytics data is company-scoped — no cross-company leakage
- Offline mobile events flush successfully after reconnect

---

### Sprint 49 — Analytics: Dashboards & Report Builder
**Weeks 97–98 · Epic 17 · 52 story points**

**Goal:** Dynamic dashboard builder and self-service report generator available to authorized roles.

**Epic:** 17 — Analytics

**Key Deliverables:**
- Dashboard widget configuration UI
- Drag-and-drop dashboard layout editor
- Report builder — filter, group, aggregate, visualize
- Scheduled report delivery (email / in-app)
- Dashboard sharing and embed

**Stories:**
| ID | Story | Points |
|----|-------|--------|
| F17-S49-01 | Dashboard layout editor — 12-col grid, drag-and-drop widgets | 8 |
| F17-S49-02 | Widget type library — KPI tile, line chart, bar chart, pie, table, map | 5 |
| F17-S49-03 | Widget configuration panel — metric, filters, time range, goal line | 5 |
| F17-S49-04 | Dashboard save / clone / share | 3 |
| F17-S49-05 | Report builder — select dimensions, metrics, filters, date range | 8 |
| F17-S49-06 | Report pivot table view | 5 |
| F17-S49-07 | Report chart view — auto-suggest chart type based on dimensions | 3 |
| F17-S49-08 | Report schedule — daily / weekly / monthly delivery to email | 5 |
| F17-S49-09 | Report export — PDF, XLSX, CSV | 3 |
| F17-S49-10 | Dashboard embed token — iFrame embed for external portals | 3 |
| F17-S49-11 | Dashboard permission — viewer / editor / owner | 3 |
| F17-S49-12 | Mobile dashboard view — read-only, optimized for small screen | 3 |

**Acceptance Criteria:**
- Dashboard loads in < 2s with up to 20 widgets
- Report builder query executes in < 5s for 1M row datasets
- Scheduled report email received within 5 min of scheduled time
- Embedded dashboard respects company_id scope in embed token

---

### Sprint 50 — Analytics: Funnel, Cohort & Retention
**Weeks 99–100 · Epic 17 · 48 story points**

**Goal:** Advanced analytics — funnel analysis, cohort retention, and anomaly detection alerts.

**Epic:** 17 — Analytics

**Key Deliverables:**
- Funnel analysis builder
- Cohort retention grid
- Anomaly detection (Z-score based alerts)
- Goal tracking with progress ring
- Epic 17 completion prep

**Stories:**
| ID | Story | Points |
|----|-------|--------|
| F17-S50-01 | Funnel builder — define steps, measure drop-off, segment | 8 |
| F17-S50-02 | Funnel visualization — step-by-step conversion bars | 3 |
| F17-S50-03 | Cohort retention grid — weekly cohorts, % retained per period | 8 |
| F17-S50-04 | Cohort configuration — define cohort event, retention event | 3 |
| F17-S50-05 | Z-score anomaly detection — alert when metric deviates > 2σ | 8 |
| F17-S50-06 | Anomaly alert notification — in-app + push to dashboard owner | 3 |
| F17-S50-07 | Goal tracking — set target per metric, progress ring widget | 5 |
| F17-S50-08 | Goal achievement notification | 2 |
| F17-S50-09 | Analytics API — read-only REST endpoints for external consumers | 5 |
| F17-S50-10 | Epic 17 regression test suite | 3 |

**Acceptance Criteria:**
- Funnel query executes in < 3s for 6-step funnel on 500K events
- Anomaly alert triggers within 1 hour of metric deviation exceeding threshold
- Analytics API returns correct company-scoped data only
- Goal progress updates within 15 minutes of event ingestion

---

## SPRINT PLAN — PHASE 16: Command Center
**Weeks 101–106 · Epic 18 · Sprints 51–53**

---

### Sprint 51 — Command Center: CEO & Executive Dashboard
**Weeks 101–102 · Epic 18 · 50 story points**

**Goal:** Command Center operational — consolidated executive dashboard with cross-module KPIs and real-time intelligence feed.

**Epic:** 18 — Command Center

**Key Deliverables:**
- CEO Command Center home screen
- Cross-module KPI aggregation layer
- Real-time intelligence feed (SSE)
- 60-second rule compliance (all critical KPIs visible within 60s)
- Group CEO multi-company view

**Stories:**
| ID | Story | Points |
|----|-------|--------|
| F18-S51-01 | Command Center home — 8 KPI zones, live data | 8 |
| F18-S51-02 | KPI aggregation layer — normalized metric across all modules | 8 |
| F18-S51-03 | Real-time intelligence feed — SSE stream, 5 event types | 5 |
| F18-S51-04 | Feed item card — icon, title, delta, time, drill-down action | 3 |
| F18-S51-05 | Cross-module drill-down — KPI tile → source module detail | 5 |
| F18-S51-06 | 60-second rule audit — measure time-to-insight for 10 critical KPIs | 3 |
| F18-S51-07 | Group CEO multi-company switcher with consolidated KPIs | 5 |
| F18-S51-08 | Company comparison view — side-by-side KPIs across entities | 5 |
| F18-S51-09 | Executive report — auto-generated weekly summary (AI-assisted) | 5 |
| F18-S51-10 | Personalization — CEO can pin/reorder KPI zones | 3 |

**Acceptance Criteria:**
- All 10 critical KPIs visible within 60 seconds of app open (60-second rule)
- SSE feed delivers updates within 5s of triggering event
- Multi-company view correctly aggregates without cross-company leakage
- Weekly AI summary generated and delivered by 08:00 Monday

---

### Sprint 52 — Command Center: Approvals Inbox & Decision Engine
**Weeks 103–104 · Epic 18 · 52 story points**

**Goal:** Unified approvals inbox — all pending decisions aggregated from all modules with one-tap actions.

**Epic:** 18 — Command Center

**Key Deliverables:**
- Unified approval inbox (all module types)
- Batch approval action (approve all / reject all with reason)
- Approval delegation from Command Center
- Approval SLA tracking and breach alerts
- Decision audit trail

**Stories:**
| ID | Story | Points |
|----|-------|--------|
| F18-S52-01 | Unified approval inbox — all pending approvals from all modules | 5 |
| F18-S52-02 | Approval filter — by module, priority, age, amount | 3 |
| F18-S52-03 | Approval detail sheet — full context from source module | 5 |
| F18-S52-04 | One-tap approve / reject with optional comment | 5 |
| F18-S52-05 | Batch approval — select multiple, bulk action | 5 |
| F18-S52-06 | Delegation flow — delegate approval authority (date range, scope) | 8 |
| F18-S52-07 | SLA tracking — show age of each pending approval | 3 |
| F18-S52-08 | SLA breach alert — escalate after N hours | 5 |
| F18-S52-09 | Decision audit log — every approval/rejection recorded | 5 |
| F18-S52-10 | Approval analytics — average time-to-decision per role per module | 5 |
| F18-S52-11 | Dynamic Island: pending approval count live | 3 |

**Acceptance Criteria:**
- Unified inbox shows approvals from all 23 modules
- Batch approval processes up to 50 items atomically
- SLA breach alert fires exactly at configured threshold
- Decision audit log tamper-proof (chained hash)

---

### Sprint 53 — Command Center: Maps, Search & Epic Close
**Weeks 105–106 · Epic 18 · 46 story points**

**Goal:** Operational map view, global search, and Command Center epic completion.

**Epic:** 18 — Command Center

**Key Deliverables:**
- Live operational map (people, vehicles, sites)
- Global Typesense search across all modules
- Search result grouping by module
- Command Center Epic 18 complete
- M10 milestone prep

**Stories:**
| ID | Story | Points |
|----|-------|--------|
| F18-S53-01 | Live operational map — MapKit / Mapbox base | 5 |
| F18-S53-02 | Map layer: clocked-in workers (last GPS ping < 15 min) | 5 |
| F18-S53-03 | Map layer: active vehicles (real-time from Fleet module) | 5 |
| F18-S53-04 | Map layer: active renovation sites (phase status color) | 3 |
| F18-S53-05 | Map cluster — merge overlapping pins at zoom levels | 5 |
| F18-S53-06 | Global Typesense search — all modules, cross-entity | 5 |
| F18-S53-07 | Search result groups — Projects / People / Invoices / Documents | 3 |
| F18-S53-08 | Scope-limited search — results filtered by user's permission scope | 5 |
| F18-S53-09 | Epic 18 regression test suite | 5 |
| MILESTONE | M10 sign-off — Command Center Live (Week 106) | 2 |

**Acceptance Criteria:**
- Map loads within 3s with up to 500 concurrent pins
- Search returns results in < 300ms for indexed entities
- Scope enforcement verified: Field Supervisor search returns own-scope only
- Map layer data respects company_id — no cross-company visibility

---

## SPRINT PLAN — PHASE 17: AI Platform
**Weeks 105–114 · Epic 19 · Sprints 53–57 (partial overlap)**

---

### Sprint 54 — AI Platform: Core Infrastructure
**Weeks 107–108 · Epic 19 · 52 story points**

**Goal:** AI platform infrastructure — conversation engine, tool calling framework, prompt templates, and cost management.

**Epic:** 19 — AI Platform

**Key Deliverables:**
- AI conversation engine (Claude API integration)
- Tool calling framework with permission gate (Gate 4)
- Prompt template management system
- AI usage cost tracking per company per user
- Context injection architecture

**Stories:**
| ID | Story | Points |
|----|-------|--------|
| F19-S54-01 | Claude API integration — streaming, retry, timeout handling | 8 |
| F19-S54-02 | Conversation history management — token budget, summarization | 5 |
| F19-S54-03 | Tool calling framework — register tools, validate inputs, execute | 8 |
| F19-S54-04 | Gate 4 on tool calls — permission check before execution | 5 |
| F19-S54-05 | Prompt template CRUD — variables, role-specific system prompts | 5 |
| F19-S54-06 | Context injection — inject relevant entity data per conversation type | 5 |
| F19-S54-07 | AI usage cost tracking — tokens in/out, cost per request, per company | 5 |
| F19-S54-08 | Company AI budget cap — alert at 80%, block at 100% | 3 |
| F19-S54-09 | AI Tool Permission Manifest — role-to-tool access mapping | 5 |
| F19-S54-10 | AI audit log — every tool call logged with input/output hash | 3 |

**Acceptance Criteria:**
- Tool call blocked if Gate 4 denies permission (no data returned)
- Workers cannot access CEO-scoped data through any AI tool
- Cost tracking accurate to < $0.001 per request
- Company budget cap blocks requests at exactly 100% — no overrun

---

### Sprint 55 — AI Assistants: Role-Specific Agents
**Weeks 109–110 · Epic 19 · 52 story points**

**Goal:** Role-specific AI assistants deployed — Finance AI, HR AI, Project AI, Operations AI.

**Epic:** 19 — AI Platform

**Key Deliverables:**
- Finance AI — invoice drafting, expense analysis, cash flow narrative
- HR AI — contract drafting, performance review assistance, payroll anomaly detection
- Project AI — task planning, risk identification, blockers summary
- Operations AI — attendance anomaly, site report summarization

**Stories:**
| ID | Story | Points |
|----|-------|--------|
| F19-S55-01 | Finance AI: invoice draft from verbal description | 5 |
| F19-S55-02 | Finance AI: cash flow narrative — explain forecast in plain language | 5 |
| F19-S55-03 | Finance AI: expense anomaly detection — flag outliers vs. team avg | 5 |
| F19-S55-04 | HR AI: contract draft from template + employee data | 8 |
| F19-S55-05 | HR AI: performance review — generate structured assessment | 5 |
| F19-S55-06 | HR AI: payroll anomaly — flag hours / deductions outside normal range | 5 |
| F19-S55-07 | Project AI: task decomposition — break epic into sprint tasks | 5 |
| F19-S55-08 | Project AI: risk identification — analyze blockers, suggest mitigations | 5 |
| F19-S55-09 | Operations AI: attendance anomaly — who is late / absent today | 3 |
| F19-S55-10 | Operations AI: site report summarization — daily digest | 3 |
| F19-S55-11 | AI feedback collection — thumbs up/down, correction input | 3 |

**Acceptance Criteria:**
- Finance AI invoice draft pre-fills ≥ 80% of fields correctly
- HR AI contract draft passes legal template validation
- Project AI risk identification suggests ≥ 3 mitigations per identified risk
- All AI assistant outputs logged and auditable

---

### Sprint 56 — AI Knowledge Base & Semantic Search
**Weeks 111–112 · Epic 19 · 50 story points**

**Goal:** AI-powered knowledge extraction and semantic search across all company documents and communications.

**Epic:** 19 — AI Platform

**Key Deliverables:**
- Knowledge extraction pipeline (documents → embeddings)
- pgvector HNSW index on ai_knowledge_extractions
- Semantic search UI — "find similar to this" across docs
- AI insight generation from data patterns
- Knowledge base RAG (Retrieval Augmented Generation)

**Stories:**
| ID | Story | Points |
|----|-------|--------|
| F19-S56-01 | Document ingestion pipeline — chunk, embed, store in ai_knowledge_extractions | 8 |
| F19-S56-02 | pgvector HNSW index creation and tuning | 5 |
| F19-S56-03 | Semantic search endpoint — query → HNSW → top-k results | 5 |
| F19-S56-04 | Semantic search UI — plain language query, ranked results | 5 |
| F19-S56-05 | RAG pipeline — inject top-k excerpts into AI context | 5 |
| F19-S56-06 | Knowledge extraction scope enforcement — user only sees own-company embeddings | 5 |
| F19-S56-07 | AI insight engine — detect patterns, generate periodic insights | 8 |
| F19-S56-08 | Insight card UI — insight, evidence, action suggestions | 3 |
| F19-S56-09 | Insight delivery — push notification + Command Center feed | 3 |
| F19-S56-10 | Embedding cost tracking — per document, per company | 3 |

**Acceptance Criteria:**
- Semantic search returns ranked results in < 500ms for 100K embeddings
- RAG context injection stays within 8K token context window budget
- Scope enforcement verified: embeddings from other companies not reachable
- Insight engine generates ≥ 1 insight per company per week on active data

---

### Sprint 57 — AI Platform: Epic Close & Milestone
**Weeks 113–114 · Epic 19 · 46 story points**

**Goal:** AI Platform epic complete — executive AI briefing, AI governance, and M11 milestone sign-off.

**Epic:** 19 — AI Platform

**Key Deliverables:**
- Executive AI daily briefing (auto-generated)
- AI governance dashboard (Platform Admin)
- PII redaction in AI inputs
- Epic 19 regression suite
- M11 milestone acceptance

**Stories:**
| ID | Story | Points |
|----|-------|--------|
| F19-S57-01 | Executive AI briefing — auto-generated nightly, delivered at 06:00 | 5 |
| F19-S57-02 | Briefing sections: revenue, attendance, approvals, alerts, weather | 5 |
| F19-S57-03 | AI governance dashboard — usage by company, by user, cost breakdown | 5 |
| F19-S57-04 | PII redaction in AI inputs — strip identified PII before send to LLM | 8 |
| F19-S57-05 | PII redaction audit log — what was stripped, for which request | 3 |
| F19-S57-06 | AI model version management — rollback capability | 3 |
| F19-S57-07 | AI Platform A/B testing — compare model versions on same prompts | 5 |
| F19-S57-08 | Epic 19 regression test suite | 5 |
| MILESTONE | M11 sign-off — AI Platform Live (Week 114) | 5 |

**Acceptance Criteria:**
- Executive briefing delivered at 06:00 ± 5 minutes
- PII redaction removes GDPR personal data categories from LLM inputs
- AI governance dashboard accurate to last 24h
- M11 acceptance: all Epics 13–19 pass regression suite

---

## SPRINT PLAN — PHASE 18: Safety Center
**Weeks 115–120 · Epic 20 · Sprints 58–60**

---

### Sprint 58 — Safety: Incidents & Inspections
**Weeks 115–116 · Epic 20 · 50 story points**

**Goal:** Safety incident reporting and inspection workflow operational.

**Epic:** 20 — Safety Center

**Key Deliverables:**
- Safety incident report (mobile-first, offline-capable)
- Incident severity classification engine
- Inspection checklist builder
- Inspection assignment and scheduling
- Incident escalation to authorities (template)

**Stories:**
| ID | Story | Points |
|----|-------|--------|
| F20-S58-01 | Incident report form — type, severity, location, description, witnesses | 5 |
| F20-S58-02 | Photo / video attachment on incident | 3 |
| F20-S58-03 | Incident severity auto-classification — Near Miss / Minor / Major / Critical | 5 |
| F20-S58-04 | Incident escalation chain — critical → immediate manager + HR + CEO | 5 |
| F20-S58-05 | Incident investigation workflow — assign investigator, due date | 5 |
| F20-S58-06 | Authority notification template — OSHA / ITM compatible export | 5 |
| F20-S58-07 | Inspection checklist builder — sections, items, photo required toggle | 5 |
| F20-S58-08 | Inspection assignment — assign to inspector, due date, location | 3 |
| F20-S58-09 | Inspection submission — complete checklist, photos, sign-off | 5 |
| F20-S58-10 | Inspection result — pass / partial / fail with findings list | 3 |
| F20-S58-11 | Offline-first incident report — sync on reconnect | 5 |
| F20-S58-12 | Safety dashboard — incident rate, open inspections, overdue actions | 3 |

**Acceptance Criteria:**
- Incident report submittable offline, syncs within 60s of reconnect
- Critical incident notification delivered to CEO within 60s
- Authority export template passes ITM format validation
- Inspection checklist enforces required photos before submission

---

### Sprint 59 — Safety: Briefings, Training & Epic Close
**Weeks 117–118 · Epic 20 · 48 story points**

**Goal:** Safety briefings, toolbox talk acknowledgments, and Epic 20 completion.

**Epic:** 20 — Safety Center

**Key Deliverables:**
- Safety briefing creation and distribution
- Digital acknowledgment (signature or biometric confirm)
- Toolbox talk module
- Safety KPI dashboard
- Epic 20 regression suite

**Stories:**
| ID | Story | Points |
|----|-------|--------|
| F20-S59-01 | Safety briefing create — title, content, target roles, effective date | 5 |
| F20-S59-02 | Briefing distribution — push to all applicable workers | 3 |
| F20-S59-03 | Digital acknowledgment — in-app signature, biometric confirm | 8 |
| F20-S59-04 | Acknowledgment tracking — who signed, when, location | 3 |
| F20-S59-05 | Overdue acknowledgment escalation — remind after 24h | 3 |
| F20-S59-06 | Toolbox talk session — group briefing, QR code check-in | 5 |
| F20-S59-07 | Safety KPI dashboard — LTIR, near-miss rate, training completion % | 5 |
| F20-S59-08 | Safety report export — monthly safety report PDF | 3 |
| F20-S59-09 | Safety module GDPR review — PII in incident reports | 5 |
| F20-S59-10 | Epic 20 regression test suite | 5 |
| F20-S59-11 | Safety module audit log verification | 3 |

**Acceptance Criteria:**
- Acknowledgment with biometric confirm accepted on iOS Face ID and Android fingerprint
- 100% acknowledgment required before next briefing can be sent to same group
- Safety KPI calculations verified against industry standard formulas
- GDPR review: PII fields in incidents flagged for erasure compliance

---

## SPRINT PLAN — PHASE 19: Knowledge Base
**Weeks 117–122 · Epic 21 · Sprints 59–61 (partial overlap)**

---

### Sprint 60 — Knowledge Base: Articles & Navigation
**Weeks 119–120 · Epic 21 · 48 story points**

**Goal:** Knowledge base system operational — spaces, articles, rich editor, and role-based access.

**Epic:** 21 — Knowledge Base

**Key Deliverables:**
- Knowledge Base space management
- Rich text article editor (Tiptap / ProseMirror)
- Article versioning and rollback
- Full-text search (Typesense)
- Role-based article visibility

**Stories:**
| ID | Story | Points |
|----|-------|--------|
| F21-S60-01 | KB space create — name, description, color, icon | 3 |
| F21-S60-02 | KB space permission — viewer / editor / publisher roles | 5 |
| F21-S60-03 | Article create — rich text editor with headings, lists, tables, embeds | 8 |
| F21-S60-04 | Article publish workflow — draft → review → published | 3 |
| F21-S60-05 | Article versioning — history, diff view, rollback | 5 |
| F21-S60-06 | Article tagging and categorization | 3 |
| F21-S60-07 | Typesense full-text search across KB | 5 |
| F21-S60-08 | Article feedback — helpful / not helpful + comment | 3 |
| F21-S60-09 | Article analytics — views, avg time on page, bounce | 3 |
| F21-S60-10 | Role-based article visibility — specific articles for specific roles | 5 |
| F21-S60-11 | KB embed in module help panels (contextual help) | 5 |

**Acceptance Criteria:**
- Article publish workflow enforces reviewer approval
- Versioning rollback creates new version (immutable history)
- Search results exclude articles the user's role cannot view
- Contextual help panel shows ≥ 1 relevant article for each module screen

---

## SPRINT PLAN — PHASE 20: Learning Center
**Weeks 121–126 · Epic 22 · Sprints 61–63**

---

### Sprint 61 — Learning Center: Courses & Lessons
**Weeks 121–122 · Epic 22 · 50 story points**

**Goal:** Learning Center operational — course authoring, lesson delivery, and enrollment management.

**Epic:** 22 — Learning Center

**Key Deliverables:**
- Course and lesson authoring tool
- Video lesson player (HLS streaming)
- Quiz engine with scoring
- Enrollment and progress tracking
- Certificate generation

**Stories:**
| ID | Story | Points |
|----|-------|--------|
| F22-S61-01 | Course create — title, description, thumbnail, target roles | 3 |
| F22-S61-02 | Lesson create — type (video / text / quiz / interactive) | 3 |
| F22-S61-03 | Video upload and HLS transcoding pipeline | 8 |
| F22-S61-04 | Video player — progress tracking, resume, subtitles | 5 |
| F22-S61-05 | Text lesson — rich content, code blocks, image embeds | 3 |
| F22-S61-06 | Quiz engine — multiple choice, true/false, short answer | 5 |
| F22-S61-07 | Quiz scoring — pass threshold, attempts limit, review mode | 5 |
| F22-S61-08 | Course enrollment — manual assign, role-based auto-enroll | 5 |
| F22-S61-09 | Progress tracking — lesson completion %, quiz scores | 3 |
| F22-S61-10 | Certificate generation — PDF with completion date and score | 5 |
| F22-S61-11 | Learning path — ordered sequence of courses | 3 |
| F22-S61-12 | Learning dashboard — enrolled courses, progress rings | 3 |

**Acceptance Criteria:**
- HLS video transcoding completes within 3x video duration
- Quiz results persisted atomically — no partial score saves
- Certificate PDF signed with document timestamp
- Learning path enforces sequential completion

---

### Sprint 62 — Learning Center: Compliance Training & Epic Close
**Weeks 123–124 · Epic 22 · 46 story points**

**Goal:** Compliance training management, mandatory training enforcement, and Epic 22 completion.

**Epic:** 22 — Learning Center

**Key Deliverables:**
- Mandatory training assignment rules
- Training compliance dashboard
- Training expiry and re-enrollment
- Learning analytics
- Epic 22 regression

**Stories:**
| ID | Story | Points |
|----|-------|--------|
| F22-S62-01 | Mandatory training rules — course + role + deadline | 5 |
| F22-S62-02 | Compliance dashboard — % complete per team / department | 5 |
| F22-S62-03 | Overdue training escalation — remind → manager alert → HR alert | 5 |
| F22-S62-04 | Training expiry — set expiry period, auto-re-enroll | 3 |
| F22-S62-05 | Learning analytics — completion rates, quiz scores, time spent | 5 |
| F22-S62-06 | Course feedback — star rating + comment | 2 |
| F22-S62-07 | External training record — log off-platform certifications | 3 |
| F22-S62-08 | Training report export — team compliance PDF | 3 |
| F22-S62-09 | Epic 22 regression test suite | 5 |
| F22-S62-10 | Learning Center GDPR — quiz scores as personal data | 5 |
| F22-S62-11 | Cross-module: HR contract compliance training trigger | 5 |

**Acceptance Criteria:**
- Mandatory training deadline enforced with escalation at T-7, T-1, T+1
- Compliance dashboard accurate to last 15 minutes
- Training expiry re-enrollment triggers exactly at expiry date
- GDPR: quiz scores erasable as part of data erasure request

---

## SPRINT PLAN — PHASE 21: Procurement & Supplier Management
**Weeks 119–128 · Epics 23 & 24 · Sprints 60–65 (overlap)**

---

### Sprint 63 — Procurement: Purchase Orders & 3-Way Match
**Weeks 125–126 · Epic 23 · 52 story points**

**Goal:** Full procurement cycle operational — RFQ through PO through goods receipt through supplier invoice matching.

**Epic:** 23 — Procurement

**Key Deliverables:**
- Purchase requisition create and approval
- Purchase order generate from approved requisition
- Goods receipt creation against PO
- 3-way matching engine (PO ↔ GR ↔ SI)
- Procurement dashboard with open POs

**Stories:**
| ID | Story | Points |
|----|-------|--------|
| F23-S63-01 | Purchase requisition create — items, quantities, justification | 5 |
| F23-S63-02 | Requisition approval chain — Procurement Officer → Manager → Finance | 5 |
| F23-S63-03 | PO generate from approved requisition | 5 |
| F23-S63-04 | PO line editing — adjust quantity, price, delivery date | 3 |
| F23-S63-05 | PO PDF and email to supplier | 3 |
| F23-S63-06 | Goods receipt create — reference PO, record actual quantities | 5 |
| F23-S63-07 | Partial receipt — receive partial quantities, leave PO open | 3 |
| F23-S63-08 | 3-way match engine — compare PO / GR / SI quantities and amounts | 8 |
| F23-S63-09 | Match result — full match / partial match / discrepancy flags | 5 |
| F23-S63-10 | Discrepancy resolution workflow — Finance Manager approves variance | 5 |
| F23-S63-11 | Procurement dashboard — open POs, overdue deliveries, pending matches | 5 |

**Acceptance Criteria:**
- 3-way match correctly flags quantity variance > 0 units
- 3-way match correctly flags amount variance > 0.01 (NUMERIC tolerance)
- Discrepancy approval creates audit entry with approver and reason
- Partial receipt keeps PO open until 100% received or manually closed

---

### Sprint 64 — Supplier Management: Profiles, Evaluations & Portal
**Weeks 127–128 · Epic 24 · 52 story points**

**Goal:** Supplier management complete — supplier profiles, evaluations, price lists, and supplier portal access.

**Epic:** 24 — Supplier Management

**Key Deliverables:**
- Supplier profile management
- Supplier evaluation framework
- Supplier price list management
- Supplier portal role — limited-scope access
- Supplier document compliance tracking

**Stories:**
| ID | Story | Points |
|----|-------|--------|
| F24-S64-01 | Supplier profile — company info, contacts, certifications, categories | 5 |
| F24-S64-02 | Supplier contact management — multiple contacts per supplier | 3 |
| F24-S64-03 | Supplier evaluation form — quality, delivery, price, support (1-5 scale) | 5 |
| F24-S64-04 | Evaluation history — timeline of all evaluations per supplier | 3 |
| F24-S64-05 | Supplier score — weighted average of evaluation criteria | 5 |
| F24-S64-06 | Supplier tier classification — Preferred / Approved / Probation / Blocked | 3 |
| F24-S64-07 | Price list import — CSV upload, effective date, currency | 5 |
| F24-S64-08 | Price list comparison — multiple suppliers for same item | 5 |
| F24-S64-09 | Supplier portal — view POs, submit invoices, upload documents | 8 |
| F24-S64-10 | Supplier portal scope — supplier_id isolation, no cross-company data | 5 |
| F24-S64-11 | Supplier document tracker — cert expiry alerts | 3 |
| F24-S64-12 | Epic 23 + 24 regression test suite | 3 |

**Acceptance Criteria:**
- Supplier portal users cannot see other suppliers' data
- Price list import validates currency code and future effective date
- Evaluation score calculated as weighted average matching configured weights
- Blocked supplier cannot be selected on new PO (hard block)

---

## SPRINT PLAN — PHASE 22: Tools & Fleet Management
**Weeks 121–128 · Epics 25 & 26 · Sprints 61–65 (overlap)**

---

### Sprint 65 — Tools, Fleet & Public Launch Prep
**Weeks 127–128 · Epics 25, 26 & Public · 54 story points**

**Goal:** Tools and Fleet management complete; public app and launch readiness verified.

**Epics:** 25 (Tools), 26 (Fleet), Public App & Launch

**Key Deliverables:**
- Tool inventory management with QR assignment
- Vehicle fleet management with trip logging
- Fleet maintenance scheduling
- Public marketing app screens
- Launch readiness checklist

**Stories:**
| ID | Story | Points |
|----|-------|--------|
| F25-S65-01 | Tool inventory — categories, tools, serial numbers, status | 5 |
| F25-S65-02 | Tool QR code assignment — generate, print, scan-to-assign | 5 |
| F25-S65-03 | Tool assignment to worker / project / site | 3 |
| F25-S65-04 | Tool return and condition check | 3 |
| F25-S65-05 | Tool maintenance schedule — service interval, due date | 3 |
| F26-S65-06 | Vehicle profile — make, model, plate, docs, insurance | 3 |
| F26-S65-07 | Vehicle assignment to driver / trip | 3 |
| F26-S65-08 | Trip log — start/end odometer, fuel, route, purpose | 5 |
| F26-S65-09 | Fuel log — liters, cost, odometer, station | 3 |
| F26-S65-10 | Fleet maintenance — service record, next service due | 3 |
| F26-S65-11 | Vehicle document tracker — insurance, ITP, vignette expiry | 3 |
| F26-S65-12 | Public App — marketing screens, features overview | 3 |
| F26-S65-13 | Launch readiness checklist — all epics green | 5 |
| F26-S65-14 | App Store submission prep — screenshots, description, ratings | 3 |
| MILESTONE | M12 — Public Launch (Week 128) | 3 |

**Acceptance Criteria:**
- QR scan assigns tool within 2 seconds
- Fleet maintenance due-date alert fires 30 days before service due
- Vehicle document expiry alert fires 30 days before
- All 26 epics regression-green before M12 sign-off

---

## PART 3 — DEPENDENCY MATRIX

### Cross-Epic Dependency Table

| Epic | Name | Requires (Blocking) | Required By (Downstream) |
|------|------|---------------------|--------------------------|
| E01 | Platform Foundation | — | All other epics |
| E02 | Authentication & Security | E01 | All other epics |
| E03 | Multi-Company Architecture | E01, E02 | E04, E05, E06, all domain epics |
| E04 | Roles & Permissions | E03 | All domain epics |
| E05 | Design System | E02 | All UI epics |
| E06 | Shared Services | E03, E04 | E07–E26 |
| E07 | Project Management | E04, E06 | E08 (Attendance) |
| E08 | Attendance & Workforce | E04, E06 | E09 (HR), E20 (Safety) |
| E09 | Human Resources | E08 | E13 (Finance - payroll) |
| E10 | Renovation Services | E06, E07 | E23 (Procurement) |
| E11 | Shop & Inventory | E06 | E12 (CRM), E23 (Procurement) |
| E12 | CRM | E11 | E13 (Finance - invoicing) |
| E13 | Finance | E09, E12 | E18 (Command Center) |
| E14 | Document Center | E04 | E13 (contracts), E20 (safety docs) |
| E15 | Communication | E04, E05 | E18 (Command Center) |
| E16 | Notification | E04, E06 | All epics (cross-cutting) |
| E17 | Analytics | E06, E16 | E18 (Command Center), E19 (AI) |
| E18 | Command Center | E13, E15, E17 | — |
| E19 | AI Platform | E06, E17 | E18 (AI briefing) |
| E20 | Safety | E08, E14 | — |
| E21 | Knowledge Base | E04, E05 | E22 (Learning) |
| E22 | Learning Center | E21 | — |
| E23 | Procurement | E11, E24 | E13 (Finance - AP) |
| E24 | Supplier Management | E04 | E23 |
| E25 | Tools Management | E06, E08 | — |
| E26 | Fleet Management | E06, E08 | — |

---

### Feature-Level Critical Path Dependencies

```
CRITICAL PATH (126 weeks):

E01 ─► E02 ─► E03 ─► E04 ─► E07 ─► E08 ─► E09
                  └─► E05      │              │
                  └─► E06      └─► E10        └─► E13 ─► E18
                               └─► E11             │
                                   └─► E12 ─────── ┘
                                                   │
E16 (cross-cutting, enabled at E06) ───────────────┤
E17 (enabled at E06+E16) ───────────────────────── ┘─► E19

PARALLEL OPPORTUNITIES:
┌─ E09 HR ──────────────────────────────────────────┐
├─ E10 Renovation ──────────────────────────────────┤ All parallel
├─ E14 Documents ───────────────────────────────────┤ from Week 13
├─ E15 Communication ───────────────────────────────┤ (E01-E06
└─ E20 Safety ──────────────────────────────────────┘  complete)

LATE-STAGE PARALLEL:
┌─ E20 Safety ──────────────── Week 115
├─ E21 Knowledge Base ─────── Week 119
├─ E22 Learning ─────────────  Week 121
├─ E23 Procurement ──────────  Week 125
└─ E24–E26 (Tools/Fleet) ─── Week 121
```

---

### Module Integration Matrix

Cross-module data flows that create implicit dependencies:

| Source Module | Data Flow | Target Module | Integration Type |
|---------------|-----------|---------------|-----------------|
| HR (E09) | Employee master data | Attendance (E08) | Shared entities |
| HR (E09) | Payroll data | Finance (E13) | API call |
| HR (E09) | Onboarding task | Project (E07) | Task creation |
| Attendance (E08) | Clock-in events | Payroll (E09/E13) | Analytics event |
| CRM (E12) | Quote accepted | Finance (E13) | Invoice creation trigger |
| CRM (E12) | Client record | Communication (E15) | Message context |
| Finance (E13) | Invoice created | Notification (E16) | Notification trigger |
| Procurement (E23) | Supplier Invoice | Finance (E13) | 3-way match |
| Procurement (E23) | Approved PO | Shop Inventory (E11) | Inventory receipt |
| Renovation (E10) | Material Request | Procurement (E23) | PO creation trigger |
| Fleet (E26) | Trip log | Finance (E13) | Expense record |
| Safety (E20) | Incident | HR (E09) | Employee record link |
| AI (E19) | Insights | Command Center (E18) | Feed injection |
| Analytics (E17) | Event stream | AI (E19) | Training data |
| KB (E21) | Articles | All modules | Contextual help |

---

## DEFINITION OF DONE

### Universal Definition of Done (All Work Items)

Every story, task, or feature is DONE only when ALL of the following are true:

**Code Quality:**
- [ ] Code reviewed by ≥ 1 peer (≥ 2 peers for security-sensitive code)
- [ ] TypeScript: zero type errors (`tsc --noEmit` passes)
- [ ] ESLint: zero lint errors or warnings
- [ ] No `console.log` statements in production code
- [ ] No hardcoded secrets, credentials, or environment-specific values

**Security:**
- [ ] Zero Trust 10-gate chain verified for all new endpoints
- [ ] company_id scope enforcement tested (cross-company access blocked)
- [ ] All user inputs validated and sanitized at API boundary
- [ ] SQL queries use parameterized statements (no string interpolation)
- [ ] Rate limiting applied to all public-facing endpoints

**Testing:**
- [ ] Unit tests written for all pure functions and business logic
- [ ] Integration test covers the happy path end-to-end
- [ ] Edge cases and error paths have test coverage
- [ ] Test suite passes: `pnpm test` green
- [ ] No test skips or `xit` / `describe.skip` left in place

**Database:**
- [ ] New migrations tested locally: `pnpm db:migrate:dev`
- [ ] RLS policies in place and verified for all new tables
- [ ] Indexes created for all foreign keys and common filter columns
- [ ] Soft delete pattern applied (deleted_at, not hard delete)
- [ ] Audit log entry emitted for all write operations

**API:**
- [ ] API route documented in OpenAPI spec
- [ ] Response schema matches documented spec
- [ ] 401, 403, 404, 422, 429 responses implemented and tested
- [ ] Pagination implemented for all list endpoints

**UI / UX:**
- [ ] Matches design spec (spacing, colors, typography from Liquid Glass system)
- [ ] Accessible: WCAG 2.1 AA — contrast ratios verified, VoiceOver/TalkBack tested
- [ ] Responsive: tested on iPhone SE (small), iPhone 15 Pro Max (large), iPad Pro
- [ ] Loading states implemented (skeleton, spinner, or progress bar)
- [ ] Empty states designed and implemented
- [ ] Error states with user-facing messages (no technical jargon)
- [ ] Offline behavior tested — graceful degradation or queue-and-sync

**Performance:**
- [ ] Page/screen first load < 2s on 4G connection
- [ ] List rendering: 1000 items renders without jank (windowed/virtualized)
- [ ] Database query execution time < 100ms for p95 in staging
- [ ] No memory leaks (profiled in React DevTools / Instruments)

**Compliance:**
- [ ] GDPR: PII fields documented and erasure path confirmed
- [ ] Audit log: all write operations produce immutable audit entry
- [ ] Data retention: new data types have retention policy assigned

**Deployment:**
- [ ] Environment variables updated in staging .env
- [ ] Feature flag created if needed (gradual rollout)
- [ ] Deployed to staging and smoke-tested
- [ ] No regressions in existing test suite

---

### Definition of Done — By Artifact Type

#### Epic Done
All features in epic are Done. All sprint acceptance criteria met. Epic regression test suite passes. Scope enforcement audited. Performance benchmarks met. Documentation frozen. Milestone sign-off (if applicable).

#### Sprint Done
All committed stories are Done. Velocity documented. Sprint demo completed. Backlog groomed for next sprint. Retrospective held. Blockers documented and routed.

#### Milestone Done
All epics in milestone scope are Done. Cross-epic integration tested. Security review passed. Performance benchmarks met. Stakeholder sign-off received. Release notes drafted.

#### Database Migration Done
Migration tested on production clone. Rollback migration written and tested. Index impact analysis complete. RLS policies verified. No breaking changes to existing API contracts.

#### API Endpoint Done
OpenAPI spec updated. Auth chain tested (all 10 gates). Rate limit configured. Monitoring / alerting set up. Load tested at 10× expected peak.

#### UI Screen Done
Design QA passed with designer. Accessibility audit passed. Device matrix tested (3 phones, 1 tablet). Analytics events emitted on key interactions. Deep link routing verified.

---

## TEAM STRUCTURE RECOMMENDATION

### Recommended Team Configuration (Full Scale)

#### Squad Model: Feature Squads + Platform Guild

```
┌─────────────────────────────────────────────────────────────┐
│                    PLATFORM GUILD                           │
│  Platform Lead + 2 Backend Engineers + 1 DevOps            │
│  Owns: E01 (Infrastructure), E02 (Auth), E03 (Multi-co),   │
│        E04 (Permissions), E16 (Notifications), Security    │
└─────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────┐
│                  DESIGN SYSTEM GUILD                        │
│  Design Lead + 1 Frontend Engineer + 1 Designer            │
│  Owns: E05 (Design System), Liquid Glass components,       │
│        Accessibility standards, Widget library             │
└─────────────────────────────────────────────────────────────┘

┌──────────────────┐  ┌──────────────────┐  ┌──────────────────┐
│  OPERATIONS      │  │  COMMERCE        │  │  INTELLIGENCE    │
│  SQUAD           │  │  SQUAD           │  │  SQUAD           │
│                  │  │                  │  │                  │
│ 2 Full-Stack     │  │ 2 Full-Stack     │  │ 2 Full-Stack     │
│ 1 Mobile         │  │ 1 Mobile         │  │ 1 ML Engineer    │
│ 1 Designer       │  │ 1 Designer       │  │ 1 Designer       │
│                  │  │                  │  │                  │
│ Owns:            │  │ Owns:            │  │ Owns:            │
│ E07 Projects     │  │ E11 Shop         │  │ E17 Analytics    │
│ E08 Attendance   │  │ E12 CRM          │  │ E18 Command Ctr  │
│ E09 HR           │  │ E13 Finance      │  │ E19 AI Platform  │
│ E10 Renovation   │  │ E14 Documents    │  │ E21 KB           │
│ E25 Tools        │  │ E15 Comm         │  │ E22 Learning     │
│ E26 Fleet        │  │ E23 Procurement  │  │                  │
│ E20 Safety       │  │ E24 Suppliers    │  │                  │
└──────────────────┘  └──────────────────┘  └──────────────────┘
```

---

### Roles & Responsibilities

| Role | Count | Responsibilities |
|------|-------|-----------------|
| Lead Architect | 1 | Architecture decisions, cross-squad technical alignment, security review |
| Product Owner | 1 | Backlog priority, acceptance, stakeholder communication |
| Platform Lead | 1 | Platform Guild ownership, infra, auth, multi-tenancy |
| Squad Lead (×3) | 3 | Squad coordination, technical decisions within squad, code review |
| Full-Stack Engineer | 6 | Feature implementation, API + UI, unit + integration tests |
| Mobile Engineer | 3 | iOS + Android (React Native / Expo), platform-specific features |
| ML Engineer | 1 | AI integrations, embeddings, pgvector optimization |
| DevOps Engineer | 1 | CI/CD, Supabase, infra-as-code, monitoring |
| Lead Designer | 1 | Design system ownership, Liquid Glass, screen-level UX decisions |
| Product Designer | 3 | Squad-embedded design: wireframes, prototypes, design QA |
| QA Engineer | 2 | Test strategy, regression automation, security test scenarios |
| Security Engineer | 1 | Penetration testing, audit log verification, compliance reviews |

**Total: ~24 people**

---

### Minimum Viable Team (MVP Phase, Weeks 1–30)

For the first 6 epics (Platform Foundation through Shared Services):

| Role | Count |
|------|-------|
| Lead Architect / Tech Lead | 1 |
| Backend Engineer | 2 |
| Full-Stack Engineer | 2 |
| Mobile Engineer | 1 |
| Designer | 1 |
| DevOps | 1 |
| **Total** | **8 people** |

Scale to full team at M3 (Week 22) when domain modules begin.

---

### Sprint Ceremonies

| Ceremony | Frequency | Duration | Attendees |
|----------|-----------|----------|-----------|
| Sprint Planning | Every 2 weeks | 2 hours | All squads |
| Daily Stand-up | Daily | 15 min | Per squad |
| Cross-Squad Sync | Weekly | 30 min | Squad Leads + Architect |
| Sprint Review | Every 2 weeks | 1 hour | All + stakeholders |
| Retrospective | Every 2 weeks | 1 hour | Per squad |
| Architecture Review | Monthly | 2 hours | Leads + Architect |
| Security Review | Per milestone | 3 hours | Architect + Security |

---

## RISK REGISTER

### Risk Classification Scale
- **Probability:** L (Low < 20%) · M (Medium 20–60%) · H (High > 60%)
- **Impact:** L (Low — < 1 sprint delay) · M (Medium — 2–4 sprint delay) · H (High — milestone at risk) · C (Critical — project at risk)
- **Risk Score:** P × I → Low / Medium / High / Critical

---

### R01 — ANAF e-Factura API Instability
| Field | Value |
|-------|-------|
| **Category** | External Dependency |
| **Probability** | H |
| **Impact** | M |
| **Score** | High |
| **Description** | ANAF RO production API has documented downtime windows and breaking changes without advance notice. Romanian digital infrastructure has historically been unreliable. |
| **Mitigation** | Build submission queue (Inngest) with exponential retry. Cache last submission status. Implement manual fallback (PDF export for manual submission). Design correction workflow from day 1. |
| **Contingency** | If ANAF is down > 72h, activate manual PDF submission mode. Legal holds submissions as pending (legally valid per Romanian fiscal law). |
| **Owner** | Finance Squad Lead |
| **Review** | Sprint 38 |

---

### R02 — Scope Creep — Feature Additions During Development
| Field | Value |
|-------|-------|
| **Category** | Project Management |
| **Probability** | H |
| **Impact** | M |
| **Score** | High |
| **Description** | With 23 modules and 20 roles, stakeholders will identify additional features during development. Each addition threatens sprint velocity and milestone dates. |
| **Mitigation** | All feature additions go to a parking lot backlog. Strict change control: new features require Product Owner approval and impact assessment before entering any sprint. Freeze feature scope at M3. |
| **Contingency** | Feature triage every 4 weeks. Cut lowest-priority features from late phases if milestone is at risk. |
| **Owner** | Product Owner |
| **Review** | Monthly |

---

### R03 — React Native / Expo Breaking Changes
| Field | Value |
|-------|-------|
| **Category** | Technical |
| **Probability** | M |
| **Impact** | M |
| **Score** | Medium |
| **Description** | Expo SDK and React Native release major versions during a 126-week project. Upgrade cycles can consume 1–2 sprints per major version. |
| **Mitigation** | Pin Expo SDK version at project start. Evaluate major upgrades only at milestone boundaries. Maintain a separate "upgrade spike" budget (1 sprint per year). |
| **Contingency** | If upgrade breaks > 20 features, defer to next milestone. Maintain parallel branch for upgrade testing. |
| **Owner** | Platform Lead |
| **Review** | Quarterly |

---

### R04 — Next.js 16+ Breaking Changes (params Promise)
| Field | Value |
|-------|-------|
| **Category** | Technical |
| **Probability** | H |
| **Impact** | L |
| **Score** | Medium |
| **Description** | Next.js 16.2.7 breaking change: params is a Promise. Codebase must adopt async params pattern from Sprint 1. Failure to standardize causes runtime errors and inconsistent behavior. |
| **Mitigation** | ESLint rule to enforce `await params` pattern. Code review checklist item. Dedicated E01 feature for Next.js 16 patterns documentation. |
| **Contingency** | Codemods available from Next.js team. Budget 0.5 sprint for codemod if adoption is incomplete. |
| **Owner** | Platform Lead |
| **Review** | Sprint 01 |

---

### R05 — Multi-Tenant RLS Performance Degradation
| Field | Value |
|-------|-------|
| **Category** | Performance |
| **Probability** | M |
| **Impact** | H |
| **Score** | High |
| **Description** | Row-Level Security policies add per-query overhead. At scale (1000+ companies, millions of rows), RLS policy evaluation may cause p95 query times to exceed 100ms SLA. |
| **Mitigation** | Benchmark RLS policies at Sprint 07 with synthetic load (1000 companies, 1M rows per table). Tune indexes on company_id + common filter columns. Use policy-bypass service role for background jobs. |
| **Contingency** | If RLS overhead > 20ms per query, consider denormalization of tenant_id into query paths. Engage Supabase support for policy optimization. |
| **Owner** | Lead Architect |
| **Review** | Sprint 07, Sprint 20 |

---

### R06 — Apple App Store Rejection
| Field | Value |
|-------|-------|
| **Category** | External |
| **Probability** | M |
| **Impact** | H |
| **Score** | High |
| **Description** | App Store review may reject the app for: biometric data handling, camera/location permissions, or business logic edge cases. Review cycle is 1–7 days per submission. |
| **Mitigation** | iOS Human Interface Guidelines review at M5. Biometric data stored in Secure Enclave only (never transmitted). Permission usage strings written by legal counsel. Submit for TestFlight review at M10 (12 weeks before launch). |
| **Contingency** | Progressive Web App (PWA) as fallback for iOS users during rejection period. Dedicated Apple Developer Relations contact. |
| **Owner** | Mobile Engineer |
| **Review** | M5, M10 |

---

### R07 — GDPR Enforcement Action
| Field | Value |
|-------|-------|
| **Category** | Compliance / Legal |
| **Probability** | L |
| **Impact** | C |
| **Score** | High |
| **Description** | Processing employee personal data across multiple jurisdictions (Romania, EU) creates GDPR obligations. An enforcement action could require immediate shutdown of data processing. |
| **Mitigation** | DPA (Data Processing Agreement) template from Week 1. DPIA (Data Protection Impact Assessment) completed at M3. Data erasure pipeline tested at every milestone. PII in AI inputs redacted before LLM submission. |
| **Contingency** | Retain GDPR legal counsel on retainer. Maintain 72-hour breach notification capability. Data portability export available on demand. |
| **Owner** | Lead Architect + Legal |
| **Review** | M3, M6, M9 |

---

### R08 — Key Personnel Departure
| Field | Value |
|-------|-------|
| **Category** | People |
| **Probability** | M |
| **Impact** | H |
| **Score** | High |
| **Description** | On a 126-week project, statistical likelihood of 1–2 key person departures is significant. Loss of Lead Architect or Platform Lead could delay critical-path work by 4–8 weeks. |
| **Mitigation** | Architecture decisions documented in DEVELOPMENT_PLAN files (this document). Code review mandatory — no single-person ownership. Pair programming on critical-path features. Cross-squad knowledge sharing sessions monthly. |
| **Contingency** | 4-week handover protocol for critical roles. Pre-qualified backup engineers for key roles on retainer. Contractor network maintained. |
| **Owner** | Product Owner |
| **Review** | Quarterly |

---

### R09 — Supabase Realtime Scalability Limits
| Field | Value |
|-------|-------|
| **Category** | Technical |
| **Probability** | M |
| **Impact** | M |
| **Score** | Medium |
| **Description** | Supabase Realtime has documented limits on concurrent connections. At scale (10,000+ concurrent users across companies), connection limits may be hit. |
| **Mitigation** | 4-tier real-time architecture: Supabase Realtime only for truly critical (attendance, approvals). SSE for dashboards. Redis pub/sub for chat. Polling for low-priority. Load test at M6 with simulated 10,000 connections. |
| **Contingency** | Migrate to dedicated Ably or Pusher if Supabase limits are consistently hit. Architecture is service-abstracted — switchover < 1 sprint. |
| **Owner** | Platform Lead |
| **Review** | M6 |

---

### R10 — AI Cost Overrun
| Field | Value |
|-------|-------|
| **Category** | Financial |
| **Probability** | M |
| **Impact** | M |
| **Score** | Medium |
| **Description** | Uncontrolled AI usage (per-user, per-company) could generate unexpected API costs at scale. A viral adoption scenario could 10× expected AI cost in a single month. |
| **Mitigation** | Company-level AI budget caps enforced in code (not advisory). Per-user daily token limits. Cost tracking dashboard visible to Platform Admin in real time. AI calls batched where possible (e.g., daily briefings, not per-request). |
| **Contingency** | Emergency circuit breaker: Platform Admin can disable AI features per company with zero-downtime toggle (feature flag). |
| **Owner** | Intelligence Squad Lead |
| **Review** | Monthly post-M11 |

---

### R11 — pgvector Performance at Scale
| Field | Value |
|-------|-------|
| **Category** | Performance |
| **Probability** | L |
| **Impact** | M |
| **Score** | Low |
| **Description** | HNSW index for semantic search may degrade as embedding count grows past 10M vectors across all companies. |
| **Mitigation** | Partition embeddings by company_id namespace. HNSW index parameters tuned for balanced recall/speed (ef_construction=200, m=16). Benchmark at 1M, 5M, 10M vectors during M11. |
| **Contingency** | Migrate to dedicated vector database (Pinecone, Weaviate) if pgvector hits limits. Architecture is service-abstracted. |
| **Owner** | ML Engineer |
| **Review** | Sprint 56 |

---

### R12 — Regulatory Change — Romanian Labor Law
| Field | Value |
|-------|-------|
| **Category** | Compliance / Legal |
| **Probability** | M |
| **Impact** | M |
| **Score** | Medium |
| **Description** | Romanian labor law, payroll deduction rules, and REVISAL reporting requirements can change with minimum 30-day notice. Changes may require sprint-priority payroll schema migrations. |
| **Mitigation** | Payroll rules stored as configurable data (not hardcoded). REVISAL export templated (not hard-coded XML). Subscribe to ANAF/Ministerul Muncii regulatory newsletters. |
| **Contingency** | Emergency sprint procedure: regulatory change triggers immediate backlog re-prioritization. Legal review of change within 48h of publication. |
| **Owner** | Operations Squad Lead + Legal |
| **Review** | Monthly |

---

### Risk Summary Dashboard

| ID | Risk | Score | Owner | Next Review |
|----|------|-------|-------|-------------|
| R01 | ANAF API Instability | **High** | Finance Squad | Sprint 38 |
| R02 | Scope Creep | **High** | Product Owner | Monthly |
| R03 | React Native Breaking Changes | **Medium** | Platform Lead | Quarterly |
| R04 | Next.js 16 Params Pattern | **Medium** | Platform Lead | Sprint 01 |
| R05 | RLS Performance | **High** | Lead Architect | Sprint 07 |
| R06 | App Store Rejection | **High** | Mobile Engineer | M5, M10 |
| R07 | GDPR Enforcement | **High** | Architect + Legal | M3, M6, M9 |
| R08 | Key Personnel Departure | **High** | Product Owner | Quarterly |
| R09 | Supabase Realtime Limits | **Medium** | Platform Lead | M6 |
| R10 | AI Cost Overrun | **Medium** | Intelligence Lead | Monthly |
| R11 | pgvector Scale | **Low** | ML Engineer | Sprint 56 |
| R12 | Romanian Labor Law Change | **Medium** | Ops Lead + Legal | Monthly |

---

## MILESTONE SUMMARY (Complete)

| # | Milestone | Target Week | Gate Criteria |
|---|-----------|-------------|---------------|
| M0 | Infrastructure Ready | Week 4 | Monorepo, CI/CD, DB, Auth scaffold live |
| M1 | Auth & Security Complete | Week 12 | All 10 security gates operational, MFA, JIT |
| M2 | Multi-Company + Permissions Live | Week 22 | RLS verified, all 20 roles defined, scope gates |
| M3 | Design System + Shared Services | Week 30 | Design system complete, Approval Engine, Notifications |
| M4 | Project Management Live | Week 38 | Full project lifecycle, Gantt, task management |
| M5 | Attendance & HR Live | Week 52 | Clock-in/out, payroll, contracts, HR workflows |
| M6 | Renovation & Shop Live | Week 64 | Renovation projects, shop inventory, POS |
| M7 | CRM Live | Week 72 | Client lifecycle, quotes, client portal |
| M8 | Communication Center Live | Week 90 | Real-time messaging, voice notes, DLP |
| M9 | Finance & Documents Live | Week 84 | Invoicing, e-Factura, 3-way match, e-signatures |
| M10 | Command Center Live | Week 106 | Unified approvals, live map, global search |
| M11 | AI Platform Live | Week 114 | All AI assistants, semantic search, briefings |
| M12 | Public Launch | Week 128 | All 26 epics green, App Store approved, GDPR compliant |

---

## SPRINT VELOCITY & CAPACITY REFERENCE

### Fibonacci Story Points Scale
| Points | Meaning | Example |
|--------|---------|---------|
| 1 | Trivial change | Config update, typo fix |
| 2 | Simple, well-understood | Add field to existing form |
| 3 | Small feature | Simple CRUD endpoint |
| 5 | Medium feature | Approval workflow step |
| 8 | Large feature | New module screen with state |
| 13 | Very large (split if possible) | Full auth system |
| 21 | Epic-level (must split) | — |

### Capacity Planning
| Team Phase | Engineers | Sprint Capacity | Notes |
|------------|-----------|----------------|-------|
| MVP (Weeks 1–22) | 8 | 40 pts | Platform + Design System focus |
| Scale (Weeks 23–72) | 16 | 80 pts | 3 squads running in parallel |
| Full (Weeks 73–128) | 24 | 110 pts | 3 squads + Intelligence Squad |

### Velocity Buffer
- 20% buffer for regression, bug fixes, and technical debt per sprint
- 1 "hardening sprint" per milestone (not counted in velocity)
- Public holidays: 14 days per year (Romanian calendar) — adjust sprint capacity

---

## TOTAL PROJECT SUMMARY

| Metric | Value |
|--------|-------|
| Total Duration | 126 weeks (~2.5 years) |
| Total Sprints | 65 |
| Total Epics | 26 |
| Total Features | ~280 |
| Total Story Points | ~3,200 |
| Total Milestones | 12 (M0–M12) |
| Total Modules | 23 |
| Total Roles | 20 |
| Total DB Entities | ~165 |
| Total UI Screens | ~340+ |
| Team Size (Peak) | 24 |

---

*End of DEVELOPMENT_PLAN_PART3.md*
*This document is Part 3 of 3 of the PRV Development Plan.*
*Part 1: Epic Catalog, Milestones, Dependency Graph*
*Part 2: Sprint Plan Phases 0–11 (Sprints 1–36)*
*Part 3: Sprint Plan Phases 12–25 (Sprints 37–65) + Dependency Matrix + Definition of Done + Team Structure + Risk Register*
