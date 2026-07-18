// Sprint 03: Core company & user tables
export * from "./migration-history"
export * from "./companies"
export * from "./users"
// Sprint 05: Audit log chain + security events
export * from "./audit-logs"
// Sprint 05: Appearance & Personalization System
export * from "./user-preferences"
// Phase 5.7: Universal Favorites — cross-module, device-synced favorites
export * from "./user-favorites"
// Sprint 06: CRM & Supplier Management
export * from "./clients"
export * from "./suppliers"
// Sprint 06: Project Management
export * from "./projects"
// Phase 6.3: Project Resource Allocations — employee % allocation + utilization
export * from "./project-allocations"
// Phase 6.4: Project Budgets — category breakdown + Earned Value Analysis
export * from "./project-budgets"
// Phase 6.2: Project Tasks — Kanban lifecycle, subtasks, dependencies, hours
export * from "./project-tasks"
// Phase 6.6: Project Risk Register — impact × probability severity matrix
export * from "./project-risks"
// Phase 6.7: Project Activity Log — per-project event timeline + comments
export * from "./project-activity"
// Sprint 06: Finance (Products, Orders, Invoices)
export * from "./finance"
// Phase 9.2: Inventory — multi-location stock levels + movement log
export * from "./inventory"
// Phase 9.5: Promotions — discount rules + coupon codes
export * from "./promotions"
// Phase 9.1: Product Variants — option axes, per-variant SKU/price/stock
export * from "./product-variants"
// Phase 9.4: Product↔Supplier links — sourcing, cost, lead time, preferred
export * from "./product-suppliers"
// Phase 9.3: Order Returns — returns/refunds workflow + return items
export * from "./returns"
// Phase 10.4: CRM Activities — calls/meetings/tasks timeline per lead/customer
export * from "./crm-activities"
// Phase 11.6: Accounts Payable — supplier invoices + aging
export * from "./supplier-invoices"
// Phase 12.3: Document Sharing — internal/external share links + access log
export * from "./document-shares"
// Sprint 06: Document Management
export * from "./documents"
// Sprint 06: Fleet & Tool Management
export * from "./fleet"
// Sprint 06: Notification Center
export * from "./notifications"
// Sprint 06: Social Profiles, Presence, Digital Business Cards
export * from "./social"
// Sprint 06: JIT Sysadmin Access, GDPR Erasure, API Keys
export * from "./auth"
// Sprint 07: Multi-Company Architecture — settings, profiles, memberships
export * from "./multi-tenancy"
// Sprint 11: RBAC — roles, permissions, role assignments, temp grants, auth lockouts, backup codes
export * from "./rbac"
// Sprint 11: Group Architecture — company groups, memberships, KPI snapshots
export * from "./groups"
// Sprint 12: Workforce — attendance, leave, shifts, payroll, tasks
export * from "./workforce"
// Phase 8.2: Payroll line items — per-employee payslips feeding run totals
export * from "./payroll-items"
// Phase 7.6: Equipment Assignments — lightweight employee↔equipment tracking
export * from "./equipment"
// Phase 7.5: Performance — manager ratings feeding the metrics dashboard
export * from "./performance"
// Phase 7.3: Public Holidays — per-company non-working-day calendar
export * from "./holidays"
// Phase 8.1: Employment Contracts — lifecycle, versioning, expiry
export * from "./employment"
// Phase 8.3: Recruitment — job requisitions + candidate pipeline
export * from "./recruitment"
// Phase 8.4: Performance Reviews — cycles + self/manager/HR/signoff workflow
export * from "./reviews"
// Phase 8.5: HR Compliance — typed employee documents + expiry tracking
export * from "./compliance"
// Sprint 12: Procurement — purchase orders
export * from "./procurement"
// Sprint 12: Approvals — cross-module approval requests
export * from "./approvals"
// Sprint 12: Knowledge Base — articles, read progress
export * from "./knowledge"
// Sprint 12: Learning — courses, enrollments, achievements
export * from "./learning"
// Sprint 12: Intelligence — AI insights, reports, anomalies, forecast series
// Phase 17: agent types, token tracking, message feedback, usage logs
export * from "./intelligence"
// Sprint 13: Shop platform — reviews, wishlist, comparisons
export * from "./shop"
// Sprint 33: Portal Platform — external portal accounts, magic tokens, sessions
export * from "./portal"
// Phase 7.5: Renovation Services Platform — projects, phases, tasks, estimates, contracts, site reports
export * from "./renovation"
// Phase 13: Communication Center — channels, DMs, announcements
export * from "./communications"
// Phase 15: Analytics Platform — events, KPI snapshots, alerts
export * from "./analytics"
// Phase 18: Safety Center — incidents, inspections, briefings, training records
export * from "./safety"
export * from "./maintenance"
// Phase 21: Procurement completion — purchase requests, GRNs
export {
  purchaseRequestStatusEnum,
  purchaseRequests,
  purchaseRequestsRelations,
  grnStatusEnum,
  grnItemConditionEnum,
  goodsReceiptNotes,
  goodsReceiptNotesRelations,
  grnItems,
  grnItemsRelations,
} from "./procurement"
