# PRV — Database Blueprint Part 3
**Version:** 1.0
**Status:** APPROVED ARCHITECTURE
**Date:** 2026-06-03
**Scope:** Notifications · Analytics · AI Data Structures · Audit Logs · Webhooks & API · Knowledge Base · Learning Center · Safety Center · System Tables

---

## Table of Contents

- Section 19: Notification Center
- Section 20: Analytics
- Section 21: AI Data Structures
- Section 22: Audit Logs
- Section 23: Webhooks & External API
- Section 24: Knowledge Base
- Section 25: Learning Center
- Section 26: Safety Center
- Section 27: System Tables
- Appendix A: Complete Entity Count
- Appendix B: Partition Strategy
- Appendix C: Index Strategy Summary
- Appendix D: RLS Pattern Assignment (All Sections)

---

## Section 19 — Notification Center (Module 11)

The Notification Center is a universal notification delivery system. Every module routes through it. Supports push, in-app, email, SMS, and webhook delivery channels. The system distinguishes notification templates (design-time) from notification instances (runtime).

---

### Table: notification_templates

**Purpose:** Reusable templates for notification content. Version-controlled. Supports multi-channel rendering with role-based visibility rules.
**RLS Pattern:** Pattern 5 (global system + company override)

| Column | Type | Null | Description |
|--------|------|------|-------------|
| id | UUID | NOT NULL | Primary key |
| company_id | UUID | NULL | NULL = system-wide default; NOT NULL = company override |
| template_key | TEXT | NOT NULL | Unique identifier e.g. `project.task.assigned` |
| module | TEXT | NOT NULL | projects / attendance / renovation / shop / finance / etc. |
| event_type | TEXT | NOT NULL | Entity and action e.g. `task.created` |
| name | TEXT | NOT NULL | Human name for template management UI |
| description | TEXT | NULL | |
| channels | TEXT[] | NOT NULL | Default '{}' — in_app / push / email / sms / webhook |
| priority | TEXT | NOT NULL | critical / high / normal / low |
| title_template | TEXT | NOT NULL | Handlebars-style e.g. `"New task: {{task_title}}"` |
| body_template | TEXT | NOT NULL | Short body |
| email_subject_template | TEXT | NULL | |
| email_body_html_template | TEXT | NULL | Full HTML email |
| sms_template | TEXT | NULL | Max 160 chars |
| push_action | TEXT | NULL | deeplink route |
| push_image_url | TEXT | NULL | |
| is_active | BOOLEAN | NOT NULL | Default true |
| requires_role | TEXT[] | NOT NULL | Default '{}' — if not empty, only these roles receive |
| suppression_window_minutes | INTEGER | NULL | De-duplicate within window |
| version | INTEGER | NOT NULL | Default 1 |
| metadata | JSONB | NOT NULL | Default '{}' |
| created_at | TIMESTAMPTZ | NOT NULL | Default now() |
| updated_at | TIMESTAMPTZ | NOT NULL | Default now() |
| created_by | UUID | NOT NULL | FK → users.id |

**Indexes:**
- `(template_key, company_id)` UNIQUE — allows per-company overrides
- `(module, event_type)` — lookup by event
- `(is_active)` partial — WHERE is_active = true

---

### Table: notification_preferences

**Purpose:** Per-user, per-template preferences. Users can opt-out of non-critical channels.
**RLS Pattern:** Pattern 1

| Column | Type | Null | Description |
|--------|------|------|-------------|
| id | UUID | NOT NULL | Primary key |
| company_id | UUID | NOT NULL | FK → companies.id |
| user_id | UUID | NOT NULL | FK → users.id |
| template_id | UUID | NOT NULL | FK → notification_templates.id |
| in_app_enabled | BOOLEAN | NOT NULL | Default true |
| push_enabled | BOOLEAN | NOT NULL | Default true |
| email_enabled | BOOLEAN | NOT NULL | Default true |
| sms_enabled | BOOLEAN | NOT NULL | Default false |
| quiet_hours_start | TIME | NULL | e.g. 22:00 |
| quiet_hours_end | TIME | NULL | e.g. 08:00 |
| updated_at | TIMESTAMPTZ | NOT NULL | Default now() |

**Indexes:**
- `(user_id, template_id)` UNIQUE
- `(company_id, user_id)` — load all prefs for user

---

### Table: notifications

**Purpose:** Every notification instance sent to a user. The in-app inbox table. High volume — partitioned.
**RLS Pattern:** Pattern 1

| Column | Type | Null | Description |
|--------|------|------|-------------|
| id | UUID | NOT NULL | Primary key |
| company_id | UUID | NOT NULL | FK → companies.id |
| recipient_id | UUID | NOT NULL | FK → users.id |
| template_id | UUID | NULL | FK → notification_templates.id |
| template_key | TEXT | NOT NULL | Snapshot at send time |
| module | TEXT | NOT NULL | Source module |
| event_type | TEXT | NOT NULL | |
| priority | TEXT | NOT NULL | critical / high / normal / low |
| title | TEXT | NOT NULL | Rendered title |
| body | TEXT | NOT NULL | Rendered body |
| action_url | TEXT | NULL | Deeplink / route |
| action_label | TEXT | NULL | CTA button text |
| image_url | TEXT | NULL | |
| is_read | BOOLEAN | NOT NULL | Default false |
| read_at | TIMESTAMPTZ | NULL | |
| is_actioned | BOOLEAN | NOT NULL | Default false |
| actioned_at | TIMESTAMPTZ | NULL | |
| is_archived | BOOLEAN | NOT NULL | Default false |
| archived_at | TIMESTAMPTZ | NULL | |
| linked_entity_type | TEXT | NULL | task / project / invoice / etc. |
| linked_entity_id | UUID | NULL | |
| actor_id | UUID | NULL | FK → users.id — who triggered event |
| metadata | JSONB | NOT NULL | Default '{}' |
| expires_at | TIMESTAMPTZ | NULL | Auto-archive date |
| created_at | TIMESTAMPTZ | NOT NULL | Default now() |

**Indexes:**
- `(recipient_id, is_read, created_at DESC)` — inbox unread feed
- `(recipient_id, company_id, created_at DESC)` — full inbox
- `(company_id, created_at DESC)` — admin view
- `(linked_entity_type, linked_entity_id)` — notifications per entity
- Partitioned by `created_at` month — high insert volume

---

### Table: notification_deliveries

**Purpose:** Delivery status tracking per channel. One row per channel per notification instance.
**RLS Pattern:** Pattern 4 (managers/admin read-only)

| Column | Type | Null | Description |
|--------|------|------|-------------|
| id | UUID | NOT NULL | Primary key |
| company_id | UUID | NOT NULL | FK → companies.id |
| notification_id | UUID | NOT NULL | FK → notifications.id |
| channel | TEXT | NOT NULL | push / email / sms / webhook |
| status | TEXT | NOT NULL | queued / sending / delivered / failed / bounced / suppressed |
| provider | TEXT | NULL | fcm / apns / sendgrid / twilio / etc. |
| provider_message_id | TEXT | NULL | External delivery ID |
| attempted_at | TIMESTAMPTZ | NULL | |
| delivered_at | TIMESTAMPTZ | NULL | |
| failed_at | TIMESTAMPTZ | NULL | |
| failure_reason | TEXT | NULL | |
| retry_count | INTEGER | NOT NULL | Default 0 |
| next_retry_at | TIMESTAMPTZ | NULL | |
| created_at | TIMESTAMPTZ | NOT NULL | Default now() |

**Indexes:**
- `(notification_id, channel)` UNIQUE
- `(status, next_retry_at)` — retry queue
- `(company_id, channel, status, created_at DESC)` — delivery analytics

---

### Table: notification_batches

**Purpose:** Groups of notifications sent in bulk (announcements, system events, scheduled digests).
**RLS Pattern:** Pattern 4

| Column | Type | Null | Description |
|--------|------|------|-------------|
| id | UUID | NOT NULL | Primary key |
| company_id | UUID | NOT NULL | FK → companies.id |
| batch_type | TEXT | NOT NULL | announcement / digest / system_event / campaign |
| title | TEXT | NOT NULL | |
| target_roles | TEXT[] | NOT NULL | Default '{}' — empty = all users |
| target_department_ids | UUID[] | NOT NULL | Default '{}' |
| total_recipients | INTEGER | NOT NULL | Default 0 |
| delivered_count | INTEGER | NOT NULL | Default 0 |
| failed_count | INTEGER | NOT NULL | Default 0 |
| status | TEXT | NOT NULL | pending / processing / completed / failed |
| scheduled_at | TIMESTAMPTZ | NULL | |
| started_at | TIMESTAMPTZ | NULL | |
| completed_at | TIMESTAMPTZ | NULL | |
| created_by | UUID | NOT NULL | FK → users.id |
| created_at | TIMESTAMPTZ | NOT NULL | Default now() |
| updated_at | TIMESTAMPTZ | NOT NULL | Default now() |

---

## Section 20 — Analytics (Module 12)

Analytics captures raw events, computes aggregations, and stores pre-computed metric snapshots. The platform uses a three-layer approach: raw events → daily rollups → dashboard snapshots.

---

### Table: analytics_events

**Purpose:** Raw event stream. Every user action, module event, and system event logged here. Immutable. Partitioned by day.
**RLS Pattern:** Pattern 4 (no user writes; system-only inserts)

| Column | Type | Null | Description |
|--------|------|------|-------------|
| id | UUID | NOT NULL | Primary key |
| company_id | UUID | NOT NULL | FK → companies.id |
| session_id | UUID | NULL | FK → active_sessions.id |
| user_id | UUID | NULL | FK → users.id (NULL for anonymous) |
| user_role | TEXT | NULL | Role snapshot at event time |
| event_category | TEXT | NOT NULL | navigation / action / system / error / performance / business |
| event_name | TEXT | NOT NULL | e.g. `project.task.completed`, `shop.order.placed` |
| module | TEXT | NOT NULL | Source module |
| entity_type | TEXT | NULL | task / order / invoice / etc. |
| entity_id | UUID | NULL | |
| properties | JSONB | NOT NULL | Default '{}' — event-specific payload |
| device_type | TEXT | NULL | mobile / tablet / desktop |
| platform | TEXT | NULL | ios / android / web / macos |
| app_version | TEXT | NULL | |
| ip_address | INET | NULL | |
| country_code | CHAR(2) | NULL | GeoIP resolved |
| duration_ms | INTEGER | NULL | For timed events |
| occurred_at | TIMESTAMPTZ | NOT NULL | Default now() |

**Indexes:**
- `(company_id, event_name, occurred_at DESC)` — event frequency
- `(company_id, module, occurred_at DESC)` — module analytics
- `(user_id, occurred_at DESC)` — user behavior
- `(company_id, occurred_at DESC)` — time-series base
- Partitioned by `occurred_at` DAY — very high insert volume (potential millions/day)

---

### Table: analytics_daily_rollups

**Purpose:** Pre-aggregated daily metrics per company per module. Computed nightly by background job.
**RLS Pattern:** Pattern 3

| Column | Type | Null | Description |
|--------|------|------|-------------|
| id | UUID | NOT NULL | Primary key |
| company_id | UUID | NOT NULL | FK → companies.id |
| rollup_date | DATE | NOT NULL | |
| module | TEXT | NOT NULL | |
| metric_name | TEXT | NOT NULL | e.g. `tasks_completed`, `revenue_total`, `orders_placed` |
| dimension_key | TEXT | NULL | Optional drill-down: department_id, project_id, user_id |
| dimension_value | TEXT | NULL | Value for the dimension key |
| metric_value | NUMERIC(19,4) | NOT NULL | |
| count | BIGINT | NOT NULL | Default 0 |
| metadata | JSONB | NOT NULL | Default '{}' |
| computed_at | TIMESTAMPTZ | NOT NULL | Default now() |

**Indexes:**
- `(company_id, rollup_date, module, metric_name)` UNIQUE — one row per metric per day
- `(company_id, module, rollup_date DESC)` — chart data
- `(rollup_date)` — cleanup old rollups

---

### Table: analytics_metric_definitions

**Purpose:** Registry of all tracked metrics — their formula, source, display properties.
**RLS Pattern:** Pattern 5

| Column | Type | Null | Description |
|--------|------|------|-------------|
| id | UUID | NOT NULL | Primary key |
| metric_key | TEXT | NOT NULL | Unique e.g. `finance.revenue.monthly` |
| module | TEXT | NOT NULL | |
| category | TEXT | NOT NULL | revenue / operations / people / performance / quality |
| display_name | TEXT | NOT NULL | |
| description | TEXT | NULL | |
| unit | TEXT | NULL | currency / count / percentage / hours / km |
| currency_field | BOOLEAN | NOT NULL | Default false |
| aggregation_type | TEXT | NOT NULL | sum / avg / count / max / min / last |
| source_table | TEXT | NULL | Primary source for this metric |
| source_column | TEXT | NULL | |
| filter_condition | TEXT | NULL | SQL fragment for WHERE clause |
| is_active | BOOLEAN | NOT NULL | Default true |
| available_from_phase | INTEGER | NOT NULL | Which implementation phase enables this metric |
| created_at | TIMESTAMPTZ | NOT NULL | Default now() |

**Indexes:**
- `(metric_key)` UNIQUE
- `(module, category, is_active)`

---

### Table: dashboard_widget_configs

**Purpose:** Per-user, per-role dashboard widget layout and configuration.
**RLS Pattern:** Pattern 1

| Column | Type | Null | Description |
|--------|------|------|-------------|
| id | UUID | NOT NULL | Primary key |
| company_id | UUID | NOT NULL | FK → companies.id |
| user_id | UUID | NOT NULL | FK → users.id |
| dashboard_zone | TEXT | NOT NULL | command / operations / people / finance / intelligence |
| widget_type | TEXT | NOT NULL | kpi_card / chart_bar / chart_line / chart_donut / table / map / ai_insight / list |
| widget_key | TEXT | NOT NULL | Identifier for widget component |
| metric_key | TEXT | NULL | FK reference to analytics_metric_definitions.metric_key |
| title_override | TEXT | NULL | |
| position_x | INTEGER | NOT NULL | Grid column |
| position_y | INTEGER | NOT NULL | Grid row |
| width | INTEGER | NOT NULL | Grid column span |
| height | INTEGER | NOT NULL | Grid row span |
| config | JSONB | NOT NULL | Default '{}' — chart type, filters, color, period |
| is_visible | BOOLEAN | NOT NULL | Default true |
| updated_at | TIMESTAMPTZ | NOT NULL | Default now() |

**Indexes:**
- `(user_id, dashboard_zone)` — load user's layout
- `(company_id, widget_key)` — widget analytics

---

### Table: report_definitions

**Purpose:** Saved report configurations that can be executed on demand or scheduled.
**RLS Pattern:** Pattern 3

| Column | Type | Null | Description |
|--------|------|------|-------------|
| id | UUID | NOT NULL | Primary key |
| company_id | UUID | NOT NULL | FK → companies.id |
| name | TEXT | NOT NULL | |
| description | TEXT | NULL | |
| module | TEXT | NOT NULL | |
| report_type | TEXT | NOT NULL | tabular / chart / mixed / export |
| query_definition | JSONB | NOT NULL | Filters, columns, grouping, sorting |
| is_public | BOOLEAN | NOT NULL | Default false — share with team |
| schedule_cron | TEXT | NULL | Cron expression for auto-run |
| schedule_recipients | UUID[] | NOT NULL | Default '{}' |
| last_run_at | TIMESTAMPTZ | NULL | |
| owner_id | UUID | NOT NULL | FK → users.id |
| is_deleted | BOOLEAN | NOT NULL | Default false |
| deleted_at | TIMESTAMPTZ | NULL | |
| created_at | TIMESTAMPTZ | NOT NULL | Default now() |
| updated_at | TIMESTAMPTZ | NOT NULL | Default now() |

---

### Table: report_runs

**Purpose:** Execution history for each report. Stores the output reference.
**RLS Pattern:** Pattern 3

| Column | Type | Null | Description |
|--------|------|------|-------------|
| id | UUID | NOT NULL | Primary key |
| company_id | UUID | NOT NULL | FK → companies.id |
| report_id | UUID | NOT NULL | FK → report_definitions.id |
| run_type | TEXT | NOT NULL | manual / scheduled |
| status | TEXT | NOT NULL | queued / running / completed / failed |
| parameters | JSONB | NOT NULL | Filters at run time |
| row_count | INTEGER | NULL | |
| execution_ms | INTEGER | NULL | |
| output_document_id | UUID | NULL | FK → documents.id (PDF/CSV export) |
| error_message | TEXT | NULL | |
| run_by | UUID | NULL | FK → users.id (NULL if scheduled) |
| started_at | TIMESTAMPTZ | NULL | |
| completed_at | TIMESTAMPTZ | NULL | |
| created_at | TIMESTAMPTZ | NOT NULL | Default now() |

---

## Section 21 — AI Data Structures (Module 13 + cross-module)

The AI Center is built on a layered data architecture: prompts → conversations → messages → tool calls → knowledge extractions → model outputs. All AI actions are permission-governed and audited.

---

### Table: ai_conversations

**Purpose:** Top-level container for an AI session. Every AI interaction is scoped to a conversation.
**RLS Pattern:** Pattern 1 (own) + Pattern 3 (managers for audit)

| Column | Type | Null | Description |
|--------|------|------|-------------|
| id | UUID | NOT NULL | Primary key |
| company_id | UUID | NOT NULL | FK → companies.id |
| user_id | UUID | NOT NULL | FK → users.id |
| title | TEXT | NULL | Auto-generated or user-named |
| ai_agent_type | TEXT | NOT NULL | general / project_assistant / finance_analyst / hr_advisor / renovation_planner / report_builder |
| module_context | TEXT | NULL | Which module the conversation is anchored in |
| linked_entity_type | TEXT | NULL | project / renovation_project / invoice / etc. |
| linked_entity_id | UUID | NULL | |
| model_id | TEXT | NOT NULL | LLM model used e.g. `gpt-4o`, `claude-3-5-sonnet` |
| status | TEXT | NOT NULL | active / archived / deleted |
| message_count | INTEGER | NOT NULL | Default 0 |
| total_input_tokens | BIGINT | NOT NULL | Default 0 |
| total_output_tokens | BIGINT | NOT NULL | Default 0 |
| total_cost_usd | NUMERIC(12,6) | NOT NULL | Default 0 |
| is_deleted | BOOLEAN | NOT NULL | Default false |
| deleted_at | TIMESTAMPTZ | NULL | |
| created_at | TIMESTAMPTZ | NOT NULL | Default now() |
| updated_at | TIMESTAMPTZ | NOT NULL | Default now() |

**Indexes:**
- `(user_id, company_id, created_at DESC)` — user conversation history
- `(company_id, ai_agent_type, created_at DESC)` — usage by agent type
- `(linked_entity_type, linked_entity_id)` — entity-attached conversations

---

### Table: ai_messages

**Purpose:** Individual turns in an AI conversation. Includes user messages, assistant responses, and system messages.
**RLS Pattern:** Pattern 1

| Column | Type | Null | Description |
|--------|------|------|-------------|
| id | UUID | NOT NULL | Primary key |
| company_id | UUID | NOT NULL | FK → companies.id |
| conversation_id | UUID | NOT NULL | FK → ai_conversations.id |
| role | TEXT | NOT NULL | user / assistant / system / tool |
| content | TEXT | NULL | Text content |
| content_parts | JSONB | NULL | Multi-part content (text + images + tool calls) |
| input_tokens | INTEGER | NULL | For assistant messages |
| output_tokens | INTEGER | NULL | |
| model_id | TEXT | NULL | Snapshot of model at message time |
| finish_reason | TEXT | NULL | stop / length / tool_calls / content_filter |
| latency_ms | INTEGER | NULL | |
| is_deleted | BOOLEAN | NOT NULL | Default false |
| created_at | TIMESTAMPTZ | NOT NULL | Default now() |

**Indexes:**
- `(conversation_id, created_at ASC)` — load conversation thread
- `(company_id, created_at DESC)` — usage monitoring
- Partitioned by `created_at` month

---

### Table: ai_tool_calls

**Purpose:** Every tool invocation made by the AI model during a conversation turn. Enforces AI Tool Permission Manifest.
**RLS Pattern:** Pattern 4 (admin/security read-only)

| Column | Type | Null | Description |
|--------|------|------|-------------|
| id | UUID | NOT NULL | Primary key |
| company_id | UUID | NOT NULL | FK → companies.id |
| conversation_id | UUID | NOT NULL | FK → ai_conversations.id |
| message_id | UUID | NOT NULL | FK → ai_messages.id |
| user_id | UUID | NOT NULL | FK → users.id — who triggered |
| tool_name | TEXT | NOT NULL | e.g. `get_project_summary`, `list_employees` |
| tool_category | TEXT | NOT NULL | read / write / search / compute / external |
| parameters | JSONB | NOT NULL | Input parameters (sanitized — no PII) |
| result_summary | TEXT | NULL | Non-sensitive result summary |
| rows_accessed | INTEGER | NULL | Count of records accessed |
| permission_check_passed | BOOLEAN | NOT NULL | Did Gate 4 pass? |
| permission_denial_reason | TEXT | NULL | If denied: why |
| execution_ms | INTEGER | NULL | |
| created_at | TIMESTAMPTZ | NOT NULL | Default now() |

**Indexes:**
- `(conversation_id, created_at ASC)` — tool calls per conversation
- `(company_id, tool_name, created_at DESC)` — tool usage analytics
- `(user_id, tool_name)` — user tool access audit
- `(permission_check_passed)` partial — WHERE passed = false (security review)

---

### Table: ai_prompt_templates

**Purpose:** Reusable system prompt templates for each AI agent type. Version-controlled.
**RLS Pattern:** Pattern 5

| Column | Type | Null | Description |
|--------|------|------|-------------|
| id | UUID | NOT NULL | Primary key |
| company_id | UUID | NULL | NULL = global default; NOT NULL = company override |
| agent_type | TEXT | NOT NULL | Matches ai_conversations.ai_agent_type |
| version | INTEGER | NOT NULL | Default 1 |
| is_active | BOOLEAN | NOT NULL | Default true |
| system_prompt | TEXT | NOT NULL | Full system prompt with role injection placeholders |
| allowed_tools | TEXT[] | NOT NULL | Default '{}' — whitelisted tool names |
| max_tokens | INTEGER | NOT NULL | Default 4096 |
| temperature | NUMERIC(3,2) | NOT NULL | Default 0.7 |
| notes | TEXT | NULL | |
| created_by | UUID | NOT NULL | FK → users.id |
| created_at | TIMESTAMPTZ | NOT NULL | Default now() |
| updated_at | TIMESTAMPTZ | NOT NULL | Default now() |

**Indexes:**
- `(agent_type, company_id, is_active)` — load active template
- `(agent_type, version)` — version history

---

### Table: ai_context_injections

**Purpose:** Structured business data injected into AI prompts at runtime. Scoped by user role.
**RLS Pattern:** Pattern 4

| Column | Type | Null | Description |
|--------|------|------|-------------|
| id | UUID | NOT NULL | Primary key |
| company_id | UUID | NOT NULL | FK → companies.id |
| conversation_id | UUID | NOT NULL | FK → ai_conversations.id |
| injection_type | TEXT | NOT NULL | user_profile / role_summary / entity_context / kpi_snapshot / permission_summary |
| context_label | TEXT | NOT NULL | Human label for debugging |
| data_snapshot | JSONB | NOT NULL | The injected data (sanitized per role) |
| token_count | INTEGER | NULL | Approximate tokens consumed |
| injected_at | TIMESTAMPTZ | NOT NULL | Default now() |

---

### Table: ai_insights

**Purpose:** AI-generated insights stored for dashboard surfacing and persistence. Generated proactively by background AI jobs.
**RLS Pattern:** Pattern 3

| Column | Type | Null | Description |
|--------|------|------|-------------|
| id | UUID | NOT NULL | Primary key |
| company_id | UUID | NOT NULL | FK → companies.id |
| insight_type | TEXT | NOT NULL | anomaly / recommendation / forecast / summary / alert / pattern |
| module | TEXT | NOT NULL | Source module |
| title | TEXT | NOT NULL | |
| body | TEXT | NOT NULL | |
| severity | TEXT | NOT NULL | info / warning / critical |
| entity_type | TEXT | NULL | Optional linked entity |
| entity_id | UUID | NULL | |
| metric_key | TEXT | NULL | Related metric |
| metric_value | NUMERIC(19,4) | NULL | Value that triggered insight |
| confidence_score | NUMERIC(4,3) | NULL | 0.000–1.000 |
| is_dismissed | BOOLEAN | NOT NULL | Default false |
| dismissed_by | UUID | NULL | FK → users.id |
| dismissed_at | TIMESTAMPTZ | NULL | |
| expires_at | TIMESTAMPTZ | NULL | |
| model_id | TEXT | NOT NULL | Model used to generate |
| generated_at | TIMESTAMPTZ | NOT NULL | Default now() |
| created_at | TIMESTAMPTZ | NOT NULL | Default now() |

**Indexes:**
- `(company_id, is_dismissed, severity, generated_at DESC)` — insight feed
- `(company_id, module, insight_type, generated_at DESC)` — module insights
- `(entity_type, entity_id)` — entity-attached insights
- `(expires_at)` partial — WHERE expires_at IS NOT NULL (cleanup job)

---

### Table: ai_knowledge_extractions

**Purpose:** Facts and structured knowledge extracted from documents, conversations, and business data by AI. Feeds the contextual AI assistant.
**RLS Pattern:** Pattern 3

| Column | Type | Null | Description |
|--------|------|------|-------------|
| id | UUID | NOT NULL | Primary key |
| company_id | UUID | NOT NULL | FK → companies.id |
| source_type | TEXT | NOT NULL | document / conversation / report / manual |
| source_id | UUID | NULL | FK to source entity |
| extraction_type | TEXT | NOT NULL | fact / rule / entity_relationship / procedure / faq |
| subject | TEXT | NOT NULL | What the knowledge is about |
| content | TEXT | NOT NULL | The extracted knowledge |
| confidence | NUMERIC(4,3) | NULL | 0.000–1.000 |
| vector_embedding | VECTOR(1536) | NULL | For semantic search (pgvector) |
| tags | TEXT[] | NOT NULL | Default '{}' |
| is_verified | BOOLEAN | NOT NULL | Default false |
| verified_by | UUID | NULL | FK → users.id |
| expires_at | TIMESTAMPTZ | NULL | |
| model_id | TEXT | NULL | Model used to extract |
| is_deleted | BOOLEAN | NOT NULL | Default false |
| deleted_at | TIMESTAMPTZ | NULL | |
| created_at | TIMESTAMPTZ | NOT NULL | Default now() |
| updated_at | TIMESTAMPTZ | NOT NULL | Default now() |

**Indexes:**
- `(company_id, extraction_type, is_verified)` — knowledge base queries
- `(company_id, tags)` GIN — tag filtering
- HNSW index on `vector_embedding` — semantic similarity search

---

### Table: ai_usage_costs

**Purpose:** Daily aggregated AI usage and cost tracking per company, model, and agent type. For cost governance and billing.
**RLS Pattern:** Pattern 4

| Column | Type | Null | Description |
|--------|------|------|-------------|
| id | UUID | NOT NULL | Primary key |
| company_id | UUID | NOT NULL | FK → companies.id |
| usage_date | DATE | NOT NULL | |
| model_id | TEXT | NOT NULL | |
| agent_type | TEXT | NULL | |
| module | TEXT | NULL | |
| conversation_count | INTEGER | NOT NULL | Default 0 |
| message_count | INTEGER | NOT NULL | Default 0 |
| tool_call_count | INTEGER | NOT NULL | Default 0 |
| total_input_tokens | BIGINT | NOT NULL | Default 0 |
| total_output_tokens | BIGINT | NOT NULL | Default 0 |
| estimated_cost_usd | NUMERIC(12,6) | NOT NULL | Default 0 |
| computed_at | TIMESTAMPTZ | NOT NULL | Default now() |

**Indexes:**
- `(company_id, usage_date, model_id, agent_type)` UNIQUE
- `(company_id, usage_date DESC)` — cost dashboard

---

### Table: ai_feedback

**Purpose:** User thumbs-up/thumbs-down feedback on AI responses. Used for model quality improvement.
**RLS Pattern:** Pattern 1

| Column | Type | Null | Description |
|--------|------|------|-------------|
| id | UUID | NOT NULL | Primary key |
| company_id | UUID | NOT NULL | FK → companies.id |
| conversation_id | UUID | NOT NULL | FK → ai_conversations.id |
| message_id | UUID | NOT NULL | FK → ai_messages.id |
| user_id | UUID | NOT NULL | FK → users.id |
| rating | TEXT | NOT NULL | positive / negative / neutral |
| reason | TEXT | NULL | Optional free-text |
| created_at | TIMESTAMPTZ | NOT NULL | Default now() |

**Indexes:**
- `(message_id, user_id)` UNIQUE — one feedback per message
- `(company_id, rating, created_at DESC)` — quality monitoring

---

## Section 22 — Audit Logs

Audit logs are the immutable, append-only record of every state-changing action in the system. The design follows the SHA-256 chained integrity pattern from the Security Architecture: each row hashes its predecessor, enabling tamper detection.

---

### Table: audit_logs

**Purpose:** Master audit ledger. Every CREATE / UPDATE / DELETE / LOGIN / PERMISSION CHANGE / EXPORT flows through here. Partitioned by month.
**RLS Pattern:** Pattern 4 (no user writes, elevated read requires justification)

| Column | Type | Null | Description |
|--------|------|------|-------------|
| id | UUID | NOT NULL | Primary key |
| company_id | UUID | NOT NULL | FK → companies.id |
| sequence_number | BIGINT | NOT NULL | Monotonically increasing per company |
| event_category | TEXT | NOT NULL | auth / data / permission / approval / ai / export / system / security |
| event_type | TEXT | NOT NULL | e.g. `task.created`, `user.login`, `role.assigned`, `document.exported` |
| module | TEXT | NOT NULL | Source module |
| actor_type | TEXT | NOT NULL | user / system / ai / sysadmin / api_key |
| actor_id | UUID | NULL | FK → users.id (NULL for system events) |
| actor_role_snapshot | TEXT | NULL | Role at time of action |
| actor_ip | INET | NULL | |
| actor_device_id | UUID | NULL | FK → devices.id |
| impersonated_by | UUID | NULL | FK → users.id — for sysadmin JIT |
| entity_type | TEXT | NOT NULL | Table name affected |
| entity_id | UUID | NULL | Primary key of affected record |
| entity_label | TEXT | NULL | Human-readable snapshot e.g. "Task: Fix bathroom tiles" |
| action | TEXT | NOT NULL | create / read / update / delete / export / login / logout / approve / reject |
| old_values | JSONB | NULL | Before state (non-PII fields only per GDPR) |
| new_values | JSONB | NULL | After state (non-PII fields only) |
| changed_fields | TEXT[] | NOT NULL | Default '{}' — which fields changed |
| metadata | JSONB | NOT NULL | Default '{}' — additional context |
| integrity_hash | TEXT | NOT NULL | SHA-256(sequence_number + company_id + event_type + actor_id + entity_id + old_values_hash + new_values_hash + prev_hash) |
| prev_hash | TEXT | NULL | Hash of (sequence_number - 1) for this company |
| chain_verified | BOOLEAN | NOT NULL | Default true — set false if chain breaks |
| occurred_at | TIMESTAMPTZ | NOT NULL | Default now() |

**Indexes:**
- `(company_id, sequence_number)` UNIQUE — chain integrity
- `(company_id, actor_id, occurred_at DESC)` — user activity trail
- `(company_id, entity_type, entity_id, occurred_at DESC)` — entity history
- `(company_id, event_category, occurred_at DESC)` — category filtering
- `(company_id, occurred_at DESC)` — time-series audit view
- Partitioned by `occurred_at` MONTH — retention and performance

**GDPR Compliance:**
- `old_values` and `new_values` contain only non-personal fields (name, email, phone, CNP excluded by application layer)
- `entity_label` stores a snapshot description — when user is anonymized, label is replaced with `[Anonymized User]`
- `actor_id` FK is preserved; display name is resolved at query time
- `integrity_hash` remains valid after anonymization because it was computed on non-PII fields

---

### Table: audit_log_access_requests

**Purpose:** Tracks who requested access to audit logs and why. Elevated audit access itself is audited (meta-audit).
**RLS Pattern:** Pattern 4

| Column | Type | Null | Description |
|--------|------|------|-------------|
| id | UUID | NOT NULL | Primary key |
| company_id | UUID | NOT NULL | FK → companies.id |
| requester_id | UUID | NOT NULL | FK → users.id |
| justification | TEXT | NOT NULL | Required for elevated access |
| access_type | TEXT | NOT NULL | read / export / chain_verify |
| filter_applied | JSONB | NOT NULL | What was queried (date range, user, entity) |
| approved_by | UUID | NULL | FK → users.id (for export requests) |
| approved_at | TIMESTAMPTZ | NULL | |
| rows_accessed | INTEGER | NULL | |
| created_at | TIMESTAMPTZ | NOT NULL | Default now() |

---

### Table: data_erasure_requests

**Purpose:** GDPR Right to Erasure requests. Tracks the full lifecycle from request to verification.
**RLS Pattern:** Pattern 4

| Column | Type | Null | Description |
|--------|------|------|-------------|
| id | UUID | NOT NULL | Primary key |
| company_id | UUID | NOT NULL | FK → companies.id |
| target_user_id | UUID | NOT NULL | FK → users.id — whose data |
| requested_by | UUID | NOT NULL | FK → users.id — who requested |
| request_type | TEXT | NOT NULL | erasure / rectification / restriction / portability |
| status | TEXT | NOT NULL | pending / approved / in_progress / completed / rejected |
| legal_basis_override | TEXT | NULL | If data must be retained for legal reasons |
| approved_by | UUID | NULL | FK → users.id |
| approved_at | TIMESTAMPTZ | NULL | |
| execution_started_at | TIMESTAMPTZ | NULL | |
| execution_completed_at | TIMESTAMPTZ | NULL | |
| tables_processed | JSONB | NOT NULL | Default '{}' — per-table status |
| verification_hash | TEXT | NULL | Proof of completion |
| notes | TEXT | NULL | |
| created_at | TIMESTAMPTZ | NOT NULL | Default now() |
| updated_at | TIMESTAMPTZ | NOT NULL | Default now() |

---

### Table: security_events

**Purpose:** High-priority security events that require immediate review. Subset of audit_logs focused on security signals.
**RLS Pattern:** Pattern 4

| Column | Type | Null | Description |
|--------|------|------|-------------|
| id | UUID | NOT NULL | Primary key |
| company_id | UUID | NULL | NULL = platform-wide event |
| event_type | TEXT | NOT NULL | failed_login / brute_force / suspicious_ip / privilege_escalation / data_exfiltration / unauthorized_access / audit_chain_break |
| severity | TEXT | NOT NULL | low / medium / high / critical |
| actor_id | UUID | NULL | FK → users.id |
| actor_ip | INET | NULL | |
| target_entity_type | TEXT | NULL | |
| target_entity_id | UUID | NULL | |
| description | TEXT | NOT NULL | |
| metadata | JSONB | NOT NULL | Default '{}' |
| is_resolved | BOOLEAN | NOT NULL | Default false |
| resolved_by | UUID | NULL | FK → users.id |
| resolved_at | TIMESTAMPTZ | NULL | |
| resolution_notes | TEXT | NULL | |
| occurred_at | TIMESTAMPTZ | NOT NULL | Default now() |

**Indexes:**
- `(company_id, severity, is_resolved, occurred_at DESC)` — security dashboard
- `(actor_id, occurred_at DESC)` — actor investigation
- `(event_type, occurred_at DESC)` — event pattern analysis

---

## Section 23 — Webhooks & External API

Outbound webhook delivery (PRV → external) and inbound API token management (external → PRV).

---

### Table: webhook_endpoints

**Purpose:** Registered outbound webhook destinations. Companies can register external URLs to receive PRV events.
**RLS Pattern:** Pattern 3

| Column | Type | Null | Description |
|--------|------|------|-------------|
| id | UUID | NOT NULL | Primary key |
| company_id | UUID | NOT NULL | FK → companies.id |
| name | TEXT | NOT NULL | |
| url | TEXT | NOT NULL | HTTPS only |
| secret_hash | TEXT | NOT NULL | Bcrypt of signing secret — used for HMAC-SHA256 |
| status | TEXT | NOT NULL | active / paused / failed |
| event_subscriptions | TEXT[] | NOT NULL | e.g. ['order.placed', 'invoice.issued'] |
| api_version | TEXT | NOT NULL | Default 'v1' |
| retry_policy | JSONB | NOT NULL | {max_attempts: 5, backoff: 'exponential'} |
| headers | JSONB | NOT NULL | Default '{}' — custom headers |
| last_triggered_at | TIMESTAMPTZ | NULL | |
| last_success_at | TIMESTAMPTZ | NULL | |
| last_failure_at | TIMESTAMPTZ | NULL | |
| failure_count | INTEGER | NOT NULL | Default 0 |
| is_deleted | BOOLEAN | NOT NULL | Default false |
| deleted_at | TIMESTAMPTZ | NULL | |
| created_at | TIMESTAMPTZ | NOT NULL | Default now() |
| updated_at | TIMESTAMPTZ | NOT NULL | Default now() |
| created_by | UUID | NOT NULL | FK → users.id |

**Indexes:**
- `(company_id, status)` — active endpoints
- `(company_id, event_subscriptions)` GIN — event routing

---

### Table: webhook_deliveries

**Purpose:** Immutable delivery attempt log per event per endpoint.
**RLS Pattern:** Pattern 4

| Column | Type | Null | Description |
|--------|------|------|-------------|
| id | UUID | NOT NULL | Primary key |
| company_id | UUID | NOT NULL | FK → companies.id |
| endpoint_id | UUID | NOT NULL | FK → webhook_endpoints.id |
| event_type | TEXT | NOT NULL | |
| event_id | UUID | NOT NULL | Unique event identifier |
| payload | JSONB | NOT NULL | The webhook payload sent |
| signature | TEXT | NOT NULL | HMAC-SHA256 signature |
| attempt_number | INTEGER | NOT NULL | Default 1 |
| status | TEXT | NOT NULL | queued / sending / delivered / failed |
| http_status_code | INTEGER | NULL | Response code from endpoint |
| response_body | TEXT | NULL | First 1024 chars |
| latency_ms | INTEGER | NULL | |
| next_retry_at | TIMESTAMPTZ | NULL | |
| delivered_at | TIMESTAMPTZ | NULL | |
| failed_at | TIMESTAMPTZ | NULL | |
| created_at | TIMESTAMPTZ | NOT NULL | Default now() |

**Indexes:**
- `(endpoint_id, created_at DESC)` — endpoint delivery history
- `(event_id, attempt_number)` UNIQUE — deduplication
- `(status, next_retry_at)` — retry queue
- Partitioned by `created_at` month

---

### Table: api_keys

**Purpose:** External API credentials for third-party integrations and internal automation. Never store raw key — store hash only.
**RLS Pattern:** Pattern 3

| Column | Type | Null | Description |
|--------|------|------|-------------|
| id | UUID | NOT NULL | Primary key |
| company_id | UUID | NOT NULL | FK → companies.id |
| name | TEXT | NOT NULL | Label e.g. "Zapier Integration" |
| key_prefix | TEXT | NOT NULL | First 8 chars for identification (e.g. `prv_live_`) |
| key_hash | TEXT | NOT NULL | SHA-256 hash — raw key shown once at creation |
| scopes | TEXT[] | NOT NULL | API permission scopes |
| allowed_ips | INET[] | NOT NULL | Default '{}' — empty = any IP |
| rate_limit_per_minute | INTEGER | NOT NULL | Default 60 |
| status | TEXT | NOT NULL | active / revoked / expired |
| expires_at | TIMESTAMPTZ | NULL | |
| last_used_at | TIMESTAMPTZ | NULL | |
| revoked_at | TIMESTAMPTZ | NULL | |
| revoked_by | UUID | NULL | FK → users.id |
| created_by | UUID | NOT NULL | FK → users.id |
| created_at | TIMESTAMPTZ | NOT NULL | Default now() |
| updated_at | TIMESTAMPTZ | NOT NULL | Default now() |

**Indexes:**
- `(key_hash)` UNIQUE — lookup on auth
- `(company_id, status)` — key management
- `(expires_at)` partial — WHERE status = 'active' (expiry sweep)

---

### Table: api_request_log

**Purpose:** Per-request log for external API calls. Truncated after 30 days for performance.
**RLS Pattern:** Pattern 4

| Column | Type | Null | Description |
|--------|------|------|-------------|
| id | UUID | NOT NULL | Primary key |
| company_id | UUID | NOT NULL | FK → companies.id |
| api_key_id | UUID | NULL | FK → api_keys.id |
| endpoint | TEXT | NOT NULL | API route |
| method | TEXT | NOT NULL | GET / POST / PATCH / DELETE |
| status_code | INTEGER | NOT NULL | |
| ip_address | INET | NULL | |
| user_agent | TEXT | NULL | |
| latency_ms | INTEGER | NULL | |
| error_message | TEXT | NULL | |
| created_at | TIMESTAMPTZ | NOT NULL | Default now() |

**Indexes:**
- `(company_id, created_at DESC)` — API usage dashboard
- `(api_key_id, created_at DESC)` — per-key analytics
- Partitioned by `created_at` day — high volume, short retention

---

## Section 24 — Knowledge Base (Module 18)

Internal company knowledge repository. Structured articles, searchable, version-controlled, with AI-enhanced suggestions.

---

### Table: kb_spaces

**Purpose:** Top-level groupings for knowledge (e.g., HR Policies, Technical Docs, Renovation Guides).
**RLS Pattern:** Pattern 3

| Column | Type | Null | Description |
|--------|------|------|-------------|
| id | UUID | NOT NULL | Primary key |
| company_id | UUID | NOT NULL | FK → companies.id |
| name | TEXT | NOT NULL | |
| description | TEXT | NULL | |
| icon | TEXT | NULL | |
| visibility | TEXT | NOT NULL | company / department / team |
| department_id | UUID | NULL | FK → departments.id |
| is_active | BOOLEAN | NOT NULL | Default true |
| lexorank | TEXT | NOT NULL | |
| created_by | UUID | NOT NULL | FK → users.id |
| created_at | TIMESTAMPTZ | NOT NULL | Default now() |
| updated_at | TIMESTAMPTZ | NOT NULL | Default now() |

---

### Table: kb_articles

**Purpose:** Knowledge articles. Supports rich text / MDX content with versioning.
**RLS Pattern:** Pattern 3

| Column | Type | Null | Description |
|--------|------|------|-------------|
| id | UUID | NOT NULL | Primary key |
| company_id | UUID | NOT NULL | FK → companies.id |
| space_id | UUID | NOT NULL | FK → kb_spaces.id |
| parent_id | UUID | NULL | FK → kb_articles.id — nested articles |
| title | TEXT | NOT NULL | |
| slug | TEXT | NOT NULL | |
| status | TEXT | NOT NULL | draft / review / published / archived |
| content | TEXT | NULL | MDX/rich text source |
| content_html | TEXT | NULL | Rendered HTML |
| excerpt | TEXT | NULL | |
| author_id | UUID | NOT NULL | FK → users.id |
| last_edited_by | UUID | NULL | FK → users.id |
| published_at | TIMESTAMPTZ | NULL | |
| view_count | INTEGER | NOT NULL | Default 0 |
| helpful_count | INTEGER | NOT NULL | Default 0 |
| not_helpful_count | INTEGER | NOT NULL | Default 0 |
| tags | TEXT[] | NOT NULL | Default '{}' |
| search_vector | TSVECTOR | NULL | Full-text search |
| ai_summary | TEXT | NULL | AI-generated summary |
| ai_tags | TEXT[] | NOT NULL | Default '{}' — AI-suggested tags |
| lexorank | TEXT | NOT NULL | Sibling ordering |
| is_deleted | BOOLEAN | NOT NULL | Default false |
| deleted_at | TIMESTAMPTZ | NULL | |
| created_at | TIMESTAMPTZ | NOT NULL | Default now() |
| updated_at | TIMESTAMPTZ | NOT NULL | Default now() |

**Indexes:**
- `(company_id, space_id, status)` — article browser
- `(company_id, slug)` UNIQUE
- GIN index on `search_vector`
- `(company_id, tags)` GIN

---

### Table: kb_article_versions

**Purpose:** Version history for knowledge articles.
**RLS Pattern:** Pattern 3

| Column | Type | Null | Description |
|--------|------|------|-------------|
| id | UUID | NOT NULL | Primary key |
| company_id | UUID | NOT NULL | FK → companies.id |
| article_id | UUID | NOT NULL | FK → kb_articles.id |
| version_number | INTEGER | NOT NULL | |
| title_snapshot | TEXT | NOT NULL | |
| content_snapshot | TEXT | NOT NULL | |
| edited_by | UUID | NOT NULL | FK → users.id |
| edit_summary | TEXT | NULL | |
| created_at | TIMESTAMPTZ | NOT NULL | Default now() |

---

### Table: kb_article_feedback

**Purpose:** User feedback on article usefulness.
**RLS Pattern:** Pattern 1

| Column | Type | Null | Description |
|--------|------|------|-------------|
| id | UUID | NOT NULL | Primary key |
| company_id | UUID | NOT NULL | FK → companies.id |
| article_id | UUID | NOT NULL | FK → kb_articles.id |
| user_id | UUID | NOT NULL | FK → users.id |
| is_helpful | BOOLEAN | NOT NULL | |
| comment | TEXT | NULL | |
| created_at | TIMESTAMPTZ | NOT NULL | Default now() |

**Indexes:**
- `(article_id, user_id)` UNIQUE
- `(article_id, is_helpful)` — helpfulness score

---

## Section 25 — Learning Center (Module 19)

Structured learning: courses, lessons, quizzes, enrollments, progress tracking, and certifications.

---

### Table: learning_courses

**Purpose:** Top-level course record. Can be mandatory (assigned by HR) or self-serve.
**RLS Pattern:** Pattern 3

| Column | Type | Null | Description |
|--------|------|------|-------------|
| id | UUID | NOT NULL | Primary key |
| company_id | UUID | NOT NULL | FK → companies.id |
| title | TEXT | NOT NULL | |
| description | TEXT | NULL | |
| category | TEXT | NOT NULL | onboarding / compliance / technical / soft_skills / safety / product |
| difficulty | TEXT | NOT NULL | beginner / intermediate / advanced |
| status | TEXT | NOT NULL | draft / published / archived |
| duration_minutes | INTEGER | NULL | Estimated completion time |
| passing_score | INTEGER | NOT NULL | Default 70 — percentage |
| is_mandatory | BOOLEAN | NOT NULL | Default false |
| mandatory_for_roles | TEXT[] | NOT NULL | Default '{}' |
| certificate_enabled | BOOLEAN | NOT NULL | Default false |
| certificate_validity_days | INTEGER | NULL | NULL = no expiry |
| created_by | UUID | NOT NULL | FK → users.id |
| thumbnail_url | TEXT | NULL | |
| is_deleted | BOOLEAN | NOT NULL | Default false |
| deleted_at | TIMESTAMPTZ | NULL | |
| created_at | TIMESTAMPTZ | NOT NULL | Default now() |
| updated_at | TIMESTAMPTZ | NOT NULL | Default now() |

---

### Table: learning_lessons

**Purpose:** Individual lessons within a course.
**RLS Pattern:** Pattern 3

| Column | Type | Null | Description |
|--------|------|------|-------------|
| id | UUID | NOT NULL | Primary key |
| company_id | UUID | NOT NULL | FK → companies.id |
| course_id | UUID | NOT NULL | FK → learning_courses.id |
| title | TEXT | NOT NULL | |
| lesson_type | TEXT | NOT NULL | video / article / quiz / document / interactive |
| content | TEXT | NULL | For article type |
| video_url | TEXT | NULL | |
| document_id | UUID | NULL | FK → documents.id |
| duration_minutes | INTEGER | NULL | |
| is_required | BOOLEAN | NOT NULL | Default true |
| lexorank | TEXT | NOT NULL | |
| is_deleted | BOOLEAN | NOT NULL | Default false |
| deleted_at | TIMESTAMPTZ | NULL | |
| created_at | TIMESTAMPTZ | NOT NULL | Default now() |
| updated_at | TIMESTAMPTZ | NOT NULL | Default now() |

---

### Table: learning_enrollments

**Purpose:** Records when a user is enrolled in a course (manual, automatic, or mandatory).
**RLS Pattern:** Pattern 1 (own) + Pattern 3 (managers)

| Column | Type | Null | Description |
|--------|------|------|-------------|
| id | UUID | NOT NULL | Primary key |
| company_id | UUID | NOT NULL | FK → companies.id |
| course_id | UUID | NOT NULL | FK → learning_courses.id |
| user_id | UUID | NOT NULL | FK → users.id |
| enrollment_type | TEXT | NOT NULL | self / assigned / mandatory |
| assigned_by | UUID | NULL | FK → users.id |
| status | TEXT | NOT NULL | enrolled / in_progress / completed / failed / expired |
| progress_percentage | INTEGER | NOT NULL | Default 0 |
| started_at | TIMESTAMPTZ | NULL | |
| completed_at | TIMESTAMPTZ | NULL | |
| due_date | DATE | NULL | |
| final_score | INTEGER | NULL | |
| certificate_issued_at | TIMESTAMPTZ | NULL | |
| certificate_expires_at | TIMESTAMPTZ | NULL | |
| certificate_document_id | UUID | NULL | FK → documents.id |
| created_at | TIMESTAMPTZ | NOT NULL | Default now() |
| updated_at | TIMESTAMPTZ | NOT NULL | Default now() |

**Indexes:**
- `(company_id, user_id, status)` — employee training dashboard
- `(company_id, course_id, status)` — course completion rates
- `(certificate_expires_at)` partial — WHERE status = 'completed' (renewal reminders)

---

### Table: learning_lesson_progress

**Purpose:** Per-lesson completion tracking per user enrollment.
**RLS Pattern:** Pattern 1

| Column | Type | Null | Description |
|--------|------|------|-------------|
| id | UUID | NOT NULL | Primary key |
| company_id | UUID | NOT NULL | FK → companies.id |
| enrollment_id | UUID | NOT NULL | FK → learning_enrollments.id |
| lesson_id | UUID | NOT NULL | FK → learning_lessons.id |
| status | TEXT | NOT NULL | not_started / in_progress / completed |
| progress_percentage | INTEGER | NOT NULL | Default 0 |
| time_spent_seconds | INTEGER | NOT NULL | Default 0 |
| completed_at | TIMESTAMPTZ | NULL | |
| last_accessed_at | TIMESTAMPTZ | NULL | |

**Indexes:**
- `(enrollment_id, lesson_id)` UNIQUE

---

### Table: learning_quiz_attempts

**Purpose:** Quiz attempt records per lesson per user.
**RLS Pattern:** Pattern 1/3

| Column | Type | Null | Description |
|--------|------|------|-------------|
| id | UUID | NOT NULL | Primary key |
| company_id | UUID | NOT NULL | FK → companies.id |
| enrollment_id | UUID | NOT NULL | FK → learning_enrollments.id |
| lesson_id | UUID | NOT NULL | FK → learning_lessons.id |
| attempt_number | INTEGER | NOT NULL | |
| score | INTEGER | NOT NULL | Percentage |
| passed | BOOLEAN | NOT NULL | |
| answers | JSONB | NOT NULL | Question ID → answer snapshot |
| started_at | TIMESTAMPTZ | NOT NULL | |
| completed_at | TIMESTAMPTZ | NULL | |

---

## Section 26 — Safety Center (Module 20)

Manages workplace safety: incidents, inspections, safety briefings, and compliance tracking. Integrated with projects, workforce, and renovation.

---

### Table: safety_incidents

**Purpose:** Reports of workplace safety incidents, accidents, or near-misses.
**RLS Pattern:** Pattern 3

| Column | Type | Null | Description |
|--------|------|------|-------------|
| id | UUID | NOT NULL | Primary key |
| company_id | UUID | NOT NULL | FK → companies.id |
| incident_number | TEXT | NOT NULL | e.g. SAF-2026-0041 |
| incident_type | TEXT | NOT NULL | accident / near_miss / property_damage / environmental / illness |
| severity | TEXT | NOT NULL | minor / moderate / serious / critical / fatal |
| status | TEXT | NOT NULL | reported / under_investigation / closed / submitted_to_authorities |
| occurred_at | TIMESTAMPTZ | NOT NULL | |
| reported_at | TIMESTAMPTZ | NOT NULL | Default now() |
| reported_by | UUID | NOT NULL | FK → users.id |
| location_description | TEXT | NOT NULL | |
| renovation_project_id | UUID | NULL | FK → renovation_projects.id |
| department_id | UUID | NULL | FK → departments.id |
| description | TEXT | NOT NULL | What happened |
| immediate_actions | TEXT | NULL | Actions taken at scene |
| root_cause | TEXT | NULL | |
| corrective_actions | TEXT | NULL | |
| persons_involved | JSONB | NOT NULL | Default '[]' — [{user_id, role, injury_type}] |
| witnesses | JSONB | NOT NULL | Default '[]' |
| regulatory_reporting_required | BOOLEAN | NOT NULL | Default false |
| regulatory_submitted_at | TIMESTAMPTZ | NULL | |
| investigation_completed_at | TIMESTAMPTZ | NULL | |
| investigator_id | UUID | NULL | FK → users.id |
| documents | UUID[] | NOT NULL | Default '{}' — document IDs |
| is_deleted | BOOLEAN | NOT NULL | Default false |
| deleted_at | TIMESTAMPTZ | NULL | |
| created_at | TIMESTAMPTZ | NOT NULL | Default now() |
| updated_at | TIMESTAMPTZ | NOT NULL | Default now() |
| created_by | UUID | NOT NULL | FK → users.id |

**Indexes:**
- `(company_id, severity, occurred_at DESC)` — safety dashboard
- `(renovation_project_id)` — project safety record
- `(company_id, status, occurred_at DESC)`

---

### Table: safety_inspections

**Purpose:** Scheduled and ad-hoc safety inspections of sites, equipment, or procedures.
**RLS Pattern:** Pattern 3

| Column | Type | Null | Description |
|--------|------|------|-------------|
| id | UUID | NOT NULL | Primary key |
| company_id | UUID | NOT NULL | FK → companies.id |
| inspection_number | TEXT | NOT NULL | |
| inspection_type | TEXT | NOT NULL | site / equipment / procedure / ppe / fire_safety |
| status | TEXT | NOT NULL | scheduled / in_progress / completed / failed |
| scheduled_date | DATE | NOT NULL | |
| completed_date | DATE | NULL | |
| inspector_id | UUID | NOT NULL | FK → users.id |
| renovation_project_id | UUID | NULL | FK → renovation_projects.id |
| location | TEXT | NULL | |
| overall_result | TEXT | NULL | pass / fail / conditional |
| items_checked | INTEGER | NULL | |
| items_passed | INTEGER | NULL | |
| items_failed | INTEGER | NULL | |
| checklist | JSONB | NOT NULL | Default '[]' — [{item, result, notes}] |
| corrective_actions_required | BOOLEAN | NOT NULL | Default false |
| notes | TEXT | NULL | |
| document_id | UUID | NULL | FK → documents.id |
| is_deleted | BOOLEAN | NOT NULL | Default false |
| deleted_at | TIMESTAMPTZ | NULL | |
| created_at | TIMESTAMPTZ | NOT NULL | Default now() |
| updated_at | TIMESTAMPTZ | NOT NULL | Default now() |

---

### Table: safety_briefings

**Purpose:** Safety briefing records — confirmation that workers received and acknowledged safety instructions.
**RLS Pattern:** Pattern 3

| Column | Type | Null | Description |
|--------|------|------|-------------|
| id | UUID | NOT NULL | Primary key |
| company_id | UUID | NOT NULL | FK → companies.id |
| title | TEXT | NOT NULL | |
| briefing_type | TEXT | NOT NULL | site_induction / toolbox_talk / emergency_procedure / ppe_usage |
| delivered_by | UUID | NOT NULL | FK → users.id |
| delivered_at | TIMESTAMPTZ | NOT NULL | |
| renovation_project_id | UUID | NULL | FK → renovation_projects.id |
| content_summary | TEXT | NULL | |
| document_id | UUID | NULL | FK → documents.id |
| created_at | TIMESTAMPTZ | NOT NULL | Default now() |

**Relationships:**
- ← safety_briefing_acknowledgments (one-to-many)

---

### Table: safety_briefing_acknowledgments

**Purpose:** Individual worker sign-offs on a safety briefing.
**RLS Pattern:** Pattern 1/3

| Column | Type | Null | Description |
|--------|------|------|-------------|
| id | UUID | NOT NULL | Primary key |
| company_id | UUID | NOT NULL | FK → companies.id |
| briefing_id | UUID | NOT NULL | FK → safety_briefings.id |
| user_id | UUID | NOT NULL | FK → users.id |
| acknowledged_at | TIMESTAMPTZ | NOT NULL | Default now() |
| signature_type | TEXT | NOT NULL | digital / manual |
| notes | TEXT | NULL | |

**Indexes:**
- `(briefing_id, user_id)` UNIQUE

---

## Section 27 — System Tables

System tables manage platform-level operations: feature flags, background job queues, scheduled tasks, rate limiting state, and system health.

---

### Table: feature_flags

**Purpose:** Runtime feature toggles per company. Enables safe rollouts and per-client feature control.
**RLS Pattern:** Pattern 5

| Column | Type | Null | Description |
|--------|------|------|-------------|
| id | UUID | NOT NULL | Primary key |
| company_id | UUID | NULL | NULL = global; NOT NULL = company-specific |
| flag_key | TEXT | NOT NULL | e.g. `ai.project_assistant.enabled` |
| is_enabled | BOOLEAN | NOT NULL | Default false |
| rollout_percentage | INTEGER | NOT NULL | Default 100 — percentage of users |
| allowed_roles | TEXT[] | NOT NULL | Default '{}' — empty = all roles |
| metadata | JSONB | NOT NULL | Default '{}' |
| expires_at | TIMESTAMPTZ | NULL | |
| created_by | UUID | NOT NULL | FK → users.id |
| created_at | TIMESTAMPTZ | NOT NULL | Default now() |
| updated_at | TIMESTAMPTZ | NOT NULL | Default now() |

**Indexes:**
- `(flag_key, company_id)` UNIQUE
- `(company_id, is_enabled)` — load active flags

---

### Table: background_jobs

**Purpose:** Persistent job queue state. Used alongside Inngest for stateful job tracking.
**RLS Pattern:** Pattern 5 (system only)

| Column | Type | Null | Description |
|--------|------|------|-------------|
| id | UUID | NOT NULL | Primary key |
| company_id | UUID | NULL | NULL = system job |
| job_type | TEXT | NOT NULL | Inngest event name |
| priority | TEXT | NOT NULL | critical / high / normal / low / background |
| status | TEXT | NOT NULL | queued / running / completed / failed / cancelled |
| payload | JSONB | NOT NULL | |
| result | JSONB | NULL | |
| error_message | TEXT | NULL | |
| attempt_count | INTEGER | NOT NULL | Default 0 |
| max_attempts | INTEGER | NOT NULL | Default 3 |
| scheduled_at | TIMESTAMPTZ | NULL | |
| started_at | TIMESTAMPTZ | NULL | |
| completed_at | TIMESTAMPTZ | NULL | |
| next_retry_at | TIMESTAMPTZ | NULL | |
| inngest_run_id | TEXT | NULL | External Inngest run reference |
| created_at | TIMESTAMPTZ | NOT NULL | Default now() |
| updated_at | TIMESTAMPTZ | NOT NULL | Default now() |

**Indexes:**
- `(status, priority, next_retry_at)` — job dispatch
- `(company_id, status, created_at DESC)` — per-company job monitor
- `(job_type, status)` — job type health

---

### Table: rate_limit_counters

**Purpose:** Sliding-window rate limit state stored in DB (Redis is primary; DB is fallback + audit).
**RLS Pattern:** Pattern 5

| Column | Type | Null | Description |
|--------|------|------|-------------|
| id | UUID | NOT NULL | Primary key |
| identifier | TEXT | NOT NULL | user_id / api_key_id / ip_address |
| identifier_type | TEXT | NOT NULL | user / api_key / ip |
| endpoint | TEXT | NOT NULL | Route or action being rate limited |
| window_start | TIMESTAMPTZ | NOT NULL | |
| window_end | TIMESTAMPTZ | NOT NULL | |
| request_count | INTEGER | NOT NULL | Default 0 |
| limit | INTEGER | NOT NULL | Max allowed in window |
| is_blocked | BOOLEAN | NOT NULL | Default false |
| created_at | TIMESTAMPTZ | NOT NULL | Default now() |
| updated_at | TIMESTAMPTZ | NOT NULL | Default now() |

**Indexes:**
- `(identifier, endpoint, window_start)` UNIQUE
- `(is_blocked, window_end)` — cleanup expired blocks

---

### Table: system_configurations

**Purpose:** Key-value store for system-level and company-level configuration. Encrypted for sensitive values.
**RLS Pattern:** Pattern 5

| Column | Type | Null | Description |
|--------|------|------|-------------|
| id | UUID | NOT NULL | Primary key |
| company_id | UUID | NULL | NULL = global platform config |
| config_key | TEXT | NOT NULL | Dotted path e.g. `email.smtp.host` |
| config_value | TEXT | NOT NULL | Plaintext or encrypted value |
| is_encrypted | BOOLEAN | NOT NULL | Default false |
| data_type | TEXT | NOT NULL | string / integer / boolean / json |
| description | TEXT | NULL | |
| updated_by | UUID | NULL | FK → users.id |
| created_at | TIMESTAMPTZ | NOT NULL | Default now() |
| updated_at | TIMESTAMPTZ | NOT NULL | Default now() |

**Indexes:**
- `(config_key, company_id)` UNIQUE

---

### Table: migration_history

**Purpose:** Database migration execution log. Tracks applied migrations and their checksums.
**RLS Pattern:** Pattern 5

| Column | Type | Null | Description |
|--------|------|------|-------------|
| id | UUID | NOT NULL | Primary key |
| migration_name | TEXT | NOT NULL | e.g. `20260603_001_add_group_tables` |
| version | TEXT | NOT NULL | Semver tag |
| checksum | TEXT | NOT NULL | SHA-256 of migration file |
| status | TEXT | NOT NULL | pending / applied / failed / rolled_back |
| applied_at | TIMESTAMPTZ | NULL | |
| rolled_back_at | TIMESTAMPTZ | NULL | |
| duration_ms | INTEGER | NULL | |
| applied_by | TEXT | NOT NULL | CI pipeline / sysadmin / automated |
| notes | TEXT | NULL | |
| created_at | TIMESTAMPTZ | NOT NULL | Default now() |

**Indexes:**
- `(migration_name)` UNIQUE
- `(status, applied_at DESC)`

---

### Table: typesense_sync_log

**Purpose:** Tracks which records have been synced to Typesense search index and when.
**RLS Pattern:** Pattern 5

| Column | Type | Null | Description |
|--------|------|------|-------------|
| id | UUID | NOT NULL | Primary key |
| company_id | UUID | NOT NULL | FK → companies.id |
| entity_type | TEXT | NOT NULL | products / projects / clients / employees / kb_articles |
| entity_id | UUID | NOT NULL | |
| sync_status | TEXT | NOT NULL | pending / synced / failed / deleted |
| synced_at | TIMESTAMPTZ | NULL | |
| failed_at | TIMESTAMPTZ | NULL | |
| error_message | TEXT | NULL | |
| checksum | TEXT | NULL | Hash of synced data to detect changes |
| created_at | TIMESTAMPTZ | NOT NULL | Default now() |
| updated_at | TIMESTAMPTZ | NOT NULL | Default now() |

**Indexes:**
- `(entity_type, entity_id, company_id)` UNIQUE
- `(sync_status, updated_at)` — sync queue

---

---

## Appendix A — Complete Entity Count

| Section | Tables |
|---------|--------|
| Part 1: Foundation + Groups + Roles + Approval Engine | ~20 |
| Part 1: Projects + Attendance + Workforce + HR | ~20 |
| Part 2: Renovation Services | 8 |
| Part 2: Shop + Inventory | 9 |
| Part 2: CRM | 5 |
| Part 2: Finance | 7 |
| Part 2: Document Center | 5 |
| Part 2: Communication Center | 5 |
| Part 2: Supplier Management | 6 |
| Part 2: Procurement | 5 |
| Part 2: Tools Management | 3 |
| Part 2: Fleet Management | 6 |
| Part 3: Notification Center | 4 |
| Part 3: Analytics | 5 |
| Part 3: AI Data Structures | 8 |
| Part 3: Audit Logs | 4 |
| Part 3: Webhooks & API | 4 |
| Part 3: Knowledge Base | 4 |
| Part 3: Learning Center | 6 |
| Part 3: Safety Center | 4 |
| Part 3: System Tables | 7 |
| **TOTAL** | **~165 tables** |

> The original DATABASE_ARCHITECTURE.md specified 151 tables. This blueprint documents ~165 due to explicit addition of: Group Architecture tables (4), AI data structures (8), Webhook delivery (2), Audit log access tracking (2), and expanded Safety and Learning tables.

---

## Appendix B — Partition Strategy

Tables that require partitioning due to high insert volume or large data retention:

| Table | Partition Type | Partition Key | Retention |
|-------|---------------|---------------|-----------|
| audit_logs | RANGE by month | occurred_at | 7 years (legal) |
| analytics_events | RANGE by day | occurred_at | 2 years |
| notifications | RANGE by month | created_at | 1 year |
| notification_deliveries | RANGE by month | created_at | 6 months |
| webhook_deliveries | RANGE by month | created_at | 6 months |
| api_request_log | RANGE by day | created_at | 30 days |
| comm_messages | RANGE by month | created_at | Indefinite |
| ai_messages | RANGE by month | created_at | 1 year |
| vehicle_trips | RANGE by month | started_at | 3 years |
| document_access_log | RANGE by month | accessed_at | 2 years |

All partitioned tables use PostgreSQL native declarative partitioning (`PARTITION BY RANGE`). Partition maintenance (creation of future partitions, archival of old ones) is managed by the `pg_partman` extension or equivalent background job.

---

## Appendix C — Index Strategy Summary

### Index Design Principles

1. **Compound indexes** — always lead with `company_id` for multi-tenant tables; this is the most selective filter for RLS
2. **Partial indexes** — used when query filters have a predictable boolean condition (is_active, is_deleted, status = 'active')
3. **GIN indexes** — used on JSONB columns, text arrays, and full-text search vectors
4. **HNSW indexes** — used on VECTOR columns for semantic AI search (pgvector)
5. **Unique indexes** — enforce business uniqueness at the DB level, not just application layer
6. **Covering indexes** — high-frequency list queries include ORDER BY columns as last entry

### High-Priority Indexes (Always Exists)

```
companies: (id) PK
users: (email) UNIQUE; (id) PK
audit_logs: (company_id, sequence_number) UNIQUE
notifications: (recipient_id, is_read, created_at DESC)
analytics_events: (company_id, event_name, occurred_at DESC)
shop_orders: (company_id, order_number) UNIQUE
invoices: (company_id, invoice_number) UNIQUE
```

---

## Appendix D — RLS Pattern Assignment (Full Reference)

| Pattern | Name | Description |
|---------|------|-------------|
| Pattern 1 | Self-only | User reads/writes own records only |
| Pattern 2 | Company read | All company members can read; managers can write |
| Pattern 3 | Scope-based | Access limited to role scope (company/region/store/department/team) |
| Pattern 4 | Elevated read | Managers and admins can read; nobody except system can write |
| Pattern 5 | System-only | No direct user access; system and sysadmin only |

### Pattern Assignment by Section

| Section | Pattern | Notes |
|---------|---------|-------|
| Foundation (companies, users) | 3 | Company-scoped |
| Group Architecture | 5 | Sysadmin + Group CEO only |
| Roles & Permissions | 3/4 | Role assignment is elevated |
| Approval Engine | 3 | All assigned participants |
| Projects | 3 | Project members + managers |
| Attendance | 1/3 | Own records + managers |
| Workforce | 3 | Department/team scope |
| HR (employees, payroll) | 3 | HR Manager + CEO scope |
| Renovation Services | 3 | Project team + managers |
| Shop | 1/2/3 | Mixed: catalog=2, orders=1/3 |
| CRM | 3 | Sales team + managers |
| Finance | 3 | Finance role + CEO |
| Documents | 3 | Visibility column controls |
| Communication | 1/3 | Own messages + channel members |
| Suppliers | 3 | Procurement team + managers |
| Procurement | 3 | Procurement + Finance |
| Tools | 3 | Asset manager + assigned user |
| Fleet | 3 | Fleet manager + drivers |
| Notifications | 1 | Own inbox only |
| Analytics | 4 | Read-only for managers; system writes |
| AI | 1/3/4 | Own convos + admin audit |
| Audit Logs | 4 | Elevated; requires justification |
| Webhooks | 3/4 | Config=3, delivery log=4 |
| Knowledge Base | 3 | Visibility-scoped |
| Learning | 1/3 | Own progress + managers |
| Safety | 3 | Project/company scope |
| System Tables | 5 | Platform/sysadmin only |

---

*End of DATABASE_BLUEPRINT_PART3.md*

*The complete Database Blueprint spans three parts and documents ~165 tables across 27 sections covering all 23 PRV modules.*

*Next: Implementation — begin with Foundation (Phase 0–1 tables: companies, users, roles, permissions, active_sessions, audit_logs)*
