/**
 * Shell configuration — maps every SystemRole to its 5-tab navigation,
 * Dynamic Island label, and search scope list.
 *
 * Route strategy: tabs point to currently-built routes where available.
 * Tabs for not-yet-built modules point to /dashboard until the module lands.
 */

import type { SystemRole } from "@prv/auth"
import type { ReactNode } from "react"
import React from "react"

// ── Icon primitives (SF Symbol style, stroke 1.6, round caps) ─────────────

const ic = (d: string | ReactNode, extra?: string) => (
  <svg
    width="22"
    height="22"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="1.6"
    strokeLinecap="round"
    strokeLinejoin="round"
    className={extra}
  >
    {typeof d === "string" ? <path d={d} /> : d}
  </svg>
)

const CommandIcon = () =>
  ic(
    <>
      <rect x="9" y="9" width="6" height="6" rx="1" />
      <path d="M9 9V6a3 3 0 1 0-3 3h3" />
      <path d="M15 9h3a3 3 0 1 0-3-3v3" />
      <path d="M9 15H6a3 3 0 1 0 3 3v-3" />
      <path d="M15 15v3a3 3 0 1 0 3-3h-3" />
    </>
  )

const TodayIcon = () =>
  ic(
    <>
      <rect x="3" y="4" width="18" height="17" rx="3" />
      <path d="M3 9h18" />
      <path d="M8 2v4M16 2v4" />
      <circle cx="12" cy="14" r="1.5" fill="currentColor" />
    </>
  )

const TasksIcon = () =>
  ic(
    <>
      <path d="M9 11l2 2 4-4" />
      <rect x="3" y="3" width="18" height="18" rx="3" />
    </>
  )

const ScheduleIcon = () =>
  ic(
    <>
      <rect x="3" y="4" width="18" height="17" rx="3" />
      <path d="M3 9h18M8 2v4M16 2v4" />
      <path d="M8 13h2M8 17h4" />
    </>
  )

const InboxIcon = () =>
  ic(
    <>
      <path d="M3 14h3l2 3h8l2-3h3" />
      <rect x="3" y="5" width="18" height="14" rx="2" />
      <path d="M3 9l9 5 9-5" />
    </>
  )

const MeIcon = () =>
  ic(
    <>
      <circle cx="12" cy="7" r="4" />
      <path d="M4 20c0-4 3.6-7 8-7s8 3 8 7" />
    </>
  )

const CompaniesIcon = () =>
  ic(
    <>
      <rect x="3" y="7" width="7" height="13" rx="1" />
      <rect x="14" y="3" width="7" height="17" rx="1" />
      <path d="M10 10h4" />
    </>
  )

const IntelligenceIcon = () =>
  ic(
    <>
      <path d="M12 2a6 6 0 0 1 6 6c0 2.5-1.5 4.7-3.7 5.7L14 16H10l-.3-2.3A6 6 0 0 1 6 8a6 6 0 0 1 6-6z" />
      <path d="M10 19h4M11 22h2" />
    </>
  )

const FinanceIcon = () =>
  ic(
    <>
      <path d="M3 20h18M5 20V10l4-4 4 4 4-6v16" />
    </>
  )

const OperationsIcon = () =>
  ic(
    <>
      <rect x="3" y="3" width="7" height="7" rx="1" />
      <rect x="14" y="3" width="7" height="7" rx="1" />
      <rect x="3" y="14" width="7" height="7" rx="1" />
      <rect x="14" y="14" width="7" height="7" rx="1" />
    </>
  )

const TeamIcon = () =>
  ic(
    <>
      <circle cx="9" cy="7" r="3" />
      <path d="M3 20v-1a6 6 0 0 1 6-6" />
      <circle cx="17" cy="9" r="2.5" />
      <path d="M13 20v-1a4 4 0 0 1 8 0v1" />
    </>
  )

const ReportsIcon = () =>
  ic(
    <>
      <rect x="3" y="3" width="18" height="18" rx="2" />
      <path d="M8 17V13M12 17v-5M16 17V9" />
    </>
  )

const ProjectsIcon = () =>
  ic(
    <>
      <path d="M3 7h3l2-4h8l2 4h3v14H3z" />
      <path d="M3 11h18M9 11v10M15 11v10" />
    </>
  )

const RenovationIcon = () =>
  ic(
    <>
      <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
      <path d="M9 22V12h6v10" />
      <path d="M12 7v2" />
    </>
  )

const ChatIcon = () =>
  ic(
    <>
      <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
    </>
  )

const PeopleIcon = () =>
  ic(
    <>
      <circle cx="9" cy="7" r="3" />
      <path d="M3 20v-1a6 6 0 0 1 6-6" />
      <circle cx="17" cy="9" r="2.5" />
      <path d="M13 20v-1a4 4 0 0 1 4-4h0a4 4 0 0 1 4 4v1" />
    </>
  )

const PayrollIcon = () =>
  ic(
    <>
      <rect x="2" y="5" width="20" height="14" rx="2" />
      <circle cx="12" cy="12" r="3" />
      <path d="M2 10h3M19 10h3M2 14h3M19 14h3" />
    </>
  )

const DocumentsIcon = () =>
  ic(
    <>
      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
      <path d="M14 2v6h6M16 13H8M16 17H8M10 9H8" />
    </>
  )

const StoreIcon = () =>
  ic(
    <>
      <path d="M2 3h20l-2 8H4z" />
      <path d="M4 11v10h16V11" />
      <path d="M9 15h6v6H9z" />
    </>
  )

const InventoryIcon = () =>
  ic(
    <>
      <rect x="3" y="3" width="18" height="18" rx="2" />
      <path d="M3 9h18M9 21V9M15 21V9" />
    </>
  )

const ProcurementIcon = () =>
  ic(
    <>
      <path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6" />
      <circle cx="10" cy="21" r="1" />
      <circle cx="21" cy="21" r="1" />
    </>
  )

const POSIcon = () =>
  ic(
    <>
      <rect x="2" y="4" width="20" height="16" rx="2" />
      <path d="M2 10h20" />
      <path d="M7 15h1M12 15h1M17 15h1M7 19h1M12 19h1" />
    </>
  )

const SystemIcon = () =>
  ic(
    <>
      <circle cx="12" cy="12" r="3" />
      <path d="M12 2v3M12 19v3M4.2 4.2l2.1 2.1M17.7 17.7l2.1 2.1M2 12h3M19 12h3M4.2 19.8l2.1-2.1M17.7 6.3l2.1-2.1" />
    </>
  )

const UsersIcon = () =>
  ic(
    <>
      <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
      <circle cx="9" cy="7" r="4" />
      <path d="M23 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75" />
    </>
  )

const SecurityIcon = () =>
  ic(
    <>
      <path d="M12 2l-9 4v5c0 5.25 3.75 10.14 9 11.25C17.25 21.14 21 16.25 21 11V6l-9-4z" />
      <path d="M9 12l2 2 4-4" />
    </>
  )

const AuditIcon = () =>
  ic(
    <>
      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
      <path d="M14 2v6h6M8 13h8M8 17h5" />
    </>
  )

const IntegrationsIcon = () =>
  ic(
    <>
      <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71" />
      <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71" />
    </>
  )

const TicketsIcon = () =>
  ic(
    <>
      <path d="M2 9a3 3 0 0 1 0 6v2a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2v-2a3 3 0 0 1 0-6V7a2 2 0 0 0-2-2H4a2 2 0 0 0-2 2v2z" />
      <line x1="9" y1="12" x2="15" y2="12" />
    </>
  )

const BugsIcon = () =>
  ic(
    <>
      <circle cx="12" cy="13" r="4" />
      <path d="M12 9V5M5 9l2.5 2M19 9l-2.5 2M4 13H2M22 13h-2M5 20l2-2M19 20l-2-2" />
    </>
  )

const AnalyticsIcon = () =>
  ic(
    <>
      <path d="M3 3v18h18" />
      <path d="M7 12l4-5 4 3 4-5" />
    </>
  )

const ExploreIcon = () =>
  ic(
    <>
      <circle cx="11" cy="11" r="8" />
      <path d="m21 21-4.35-4.35" />
    </>
  )

const ExportsIcon = () =>
  ic(
    <>
      <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
      <polyline points="7 10 12 15 17 10" />
      <line x1="12" y1="15" x2="12" y2="3" />
    </>
  )

const TestingIcon = () =>
  ic(
    <>
      <path d="M14.5 2v11.29c1.84 1 3 3.04 3 5.21C17.5 21.08 15.08 23.5 12 23.5S6.5 21.08 6.5 18.5c0-2.17 1.16-4.21 3-5.21V2h5z" />
      <path d="M8.5 2h7" />
    </>
  )

const CoverageIcon = () =>
  ic(
    <>
      <circle cx="12" cy="12" r="10" />
      <path d="m9 12 2 2 4-4" />
    </>
  )

const SafetyIcon = () =>
  ic(
    <>
      <path d="M12 2L3 7v5c0 5.25 3.75 10.14 9 11.25C17.25 22.14 21 17.25 21 12V7l-9-5z" />
      <path d="m9 12 2 2 4-4" />
    </>
  )

const FleetIcon = () =>
  ic(
    <>
      <rect x="1" y="10" width="22" height="9" rx="2" />
      <path d="M4 19v2M20 19v2" />
      <circle cx="7" cy="19" r="2" />
      <circle cx="17" cy="19" r="2" />
      <path d="M1 13h22M5 10V7a1 1 0 0 1 1-1h4l3-4 3 4h2a1 1 0 0 1 1 1v3" />
    </>
  )

const ToolsIcon = () =>
  ic(
    <>
      <path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z" />
    </>
  )

const SuppliersIcon = () =>
  ic(
    <>
      <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
      <polyline points="9 22 9 12 15 12 15 22" />
    </>
  )

const KnowledgeIcon = () =>
  ic(
    <>
      <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20" />
      <path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z" />
      <path d="M8 7h8M8 11h6" />
    </>
  )

const LearningIcon = () =>
  ic(
    <>
      <path d="M22 10v6M2 10l10-5 10 5-10 5z" />
      <path d="M6 12v5c3 3 9 3 12 0v-5" />
    </>
  )

// ── Tab definition ─────────────────────────────────────────────────────────

export interface ShellTab {
  id: string
  label: string
  href: string
  icon: ReactNode
}

export interface ShellConfig {
  tabs: ShellTab[]
  /** Compact Dynamic Island label for this role */
  diLabel: string
  /** Typesense search scope IDs available to this role */
  searchScopes: string[]
}

// ── Shell definitions ──────────────────────────────────────────────────────

const SHELLS: Record<string, ShellConfig> = {
  executive: {
    tabs: [
      { id: "command", label: "Command", href: "/dashboard", icon: <CommandIcon /> },
      { id: "analytics", label: "Analytics", href: "/analytics", icon: <AnalyticsIcon /> },
      { id: "finance", label: "Finance", href: "/finance", icon: <FinanceIcon /> },
      { id: "operations", label: "Operations", href: "/operations", icon: <OperationsIcon /> },
      { id: "people", label: "People", href: "/people", icon: <PeopleIcon /> },
      {
        id: "intelligence",
        label: "Intelligence",
        href: "/intelligence",
        icon: <IntelligenceIcon />,
      },
      { id: "safety", label: "Safety", href: "/safety", icon: <SafetyIcon /> },
      { id: "fleet", label: "Fleet", href: "/fleet", icon: <FleetIcon /> },
      { id: "tools", label: "Tools", href: "/tools", icon: <ToolsIcon /> },
      { id: "suppliers", label: "Suppliers", href: "/suppliers", icon: <SuppliersIcon /> },
      { id: "knowledge", label: "Knowledge", href: "/knowledge", icon: <KnowledgeIcon /> },
      { id: "alerts", label: "Alerts", href: "/alerts", icon: <SecurityIcon /> },
    ],
    diLabel: "Revenue",
    searchScopes: ["all", "employees", "projects", "stores", "finance", "documents", "alerts"],
  },

  sysadmin: {
    tabs: [
      { id: "system", label: "System", href: "/system", icon: <SystemIcon /> },
      { id: "users", label: "Users", href: "/people", icon: <UsersIcon /> },
      { id: "security", label: "Security", href: "/settings/security", icon: <SecurityIcon /> },
      { id: "audit", label: "Audit", href: "/audit", icon: <AuditIcon /> },
      {
        id: "integrations",
        label: "Integrations",
        href: "/integrations",
        icon: <IntegrationsIcon />,
      },
    ],
    diLabel: "System",
    searchScopes: ["all", "users", "audit", "sessions"],
  },

  worker: {
    tabs: [
      { id: "today", label: "Today", href: "/today", icon: <TodayIcon /> },
      { id: "tasks", label: "Tasks", href: "/schedule", icon: <TasksIcon /> },
      { id: "schedule", label: "Schedule", href: "/schedule", icon: <ScheduleIcon /> },
      { id: "learning", label: "Learning", href: "/learning", icon: <LearningIcon /> },
      { id: "knowledge", label: "Knowledge", href: "/knowledge", icon: <KnowledgeIcon /> },
      { id: "inbox", label: "Inbox", href: "/notifications", icon: <InboxIcon /> },
      { id: "me", label: "Me", href: "/people", icon: <MeIcon /> },
    ],
    diLabel: "Shift",
    searchScopes: ["tasks", "schedule", "documents"],
  },

  team_leader: {
    tabs: [
      { id: "command", label: "Command", href: "/dashboard", icon: <CommandIcon /> },
      { id: "team", label: "Team", href: "/people", icon: <TeamIcon /> },
      { id: "tasks", label: "Tasks", href: "/schedule", icon: <TasksIcon /> },
      { id: "schedule", label: "Schedule", href: "/schedule", icon: <ScheduleIcon /> },
      { id: "inbox", label: "Inbox", href: "/notifications", icon: <InboxIcon /> },
    ],
    diLabel: "Team",
    searchScopes: ["team", "tasks", "schedule"],
  },

  dept_head: {
    tabs: [
      { id: "command", label: "Command", href: "/dashboard", icon: <CommandIcon /> },
      { id: "team", label: "Team", href: "/people", icon: <TeamIcon /> },
      { id: "tasks", label: "Tasks", href: "/schedule", icon: <TasksIcon /> },
      { id: "schedule", label: "Schedule", href: "/schedule", icon: <ScheduleIcon /> },
      { id: "inbox", label: "Inbox", href: "/notifications", icon: <InboxIcon /> },
    ],
    diLabel: "Dept",
    searchScopes: ["team", "tasks", "schedule", "documents"],
  },

  oms: {
    tabs: [
      { id: "command", label: "Command", href: "/dashboard", icon: <CommandIcon /> },
      { id: "area", label: "Area", href: "/people", icon: <TeamIcon /> },
      { id: "operations", label: "Operations", href: "/operations", icon: <OperationsIcon /> },
      { id: "reports", label: "Reports", href: "/intelligence", icon: <ReportsIcon /> },
      { id: "inbox", label: "Inbox", href: "/notifications", icon: <InboxIcon /> },
    ],
    diLabel: "Area",
    searchScopes: ["employees", "tasks", "operations"],
  },

  ops_manager: {
    tabs: [
      { id: "command", label: "Command", href: "/dashboard", icon: <CommandIcon /> },
      { id: "operations", label: "Operations", href: "/operations", icon: <OperationsIcon /> },
      { id: "people", label: "People", href: "/people", icon: <PeopleIcon /> },
      { id: "finance", label: "Finance", href: "/finance", icon: <FinanceIcon /> },
      { id: "safety", label: "Safety", href: "/safety", icon: <SafetyIcon /> },
      { id: "fleet", label: "Fleet", href: "/fleet", icon: <FleetIcon /> },
      { id: "tools", label: "Tools", href: "/tools", icon: <ToolsIcon /> },
      { id: "suppliers", label: "Suppliers", href: "/suppliers", icon: <SuppliersIcon /> },
      { id: "alerts", label: "Alerts", href: "/alerts", icon: <SecurityIcon /> },
    ],
    diLabel: "Region",
    searchScopes: ["employees", "operations", "finance", "documents", "alerts"],
  },

  hr: {
    tabs: [
      { id: "command", label: "Command", href: "/dashboard", icon: <CommandIcon /> },
      { id: "people", label: "People", href: "/people", icon: <PeopleIcon /> },
      { id: "payroll", label: "Payroll", href: "/payroll", icon: <PayrollIcon /> },
      { id: "documents", label: "Documents", href: "/documents", icon: <DocumentsIcon /> },
      { id: "learning", label: "Learning", href: "/learning", icon: <LearningIcon /> },
      { id: "knowledge", label: "Knowledge", href: "/knowledge", icon: <KnowledgeIcon /> },
      { id: "inbox", label: "Inbox", href: "/notifications", icon: <InboxIcon /> },
    ],
    diLabel: "Payroll",
    searchScopes: ["employees", "documents", "payroll"],
  },

  project_worker: {
    tabs: [
      { id: "today", label: "Today", href: "/today", icon: <TodayIcon /> },
      { id: "tasks", label: "Tasks", href: "/schedule", icon: <TasksIcon /> },
      { id: "renovation", label: "Renovation", href: "/renovation", icon: <RenovationIcon /> },
      { id: "chat", label: "Chat", href: "/communications", icon: <ChatIcon /> },
      { id: "me", label: "Me", href: "/people", icon: <MeIcon /> },
    ],
    diLabel: "Task",
    searchScopes: ["tasks", "projects", "documents"],
  },

  project_team_leader: {
    tabs: [
      { id: "command", label: "Command", href: "/dashboard", icon: <CommandIcon /> },
      { id: "team", label: "Team", href: "/people", icon: <TeamIcon /> },
      { id: "renovation", label: "Renovation", href: "/renovation", icon: <RenovationIcon /> },
      { id: "chat", label: "Chat", href: "/communications", icon: <ChatIcon /> },
      { id: "inbox", label: "Inbox", href: "/notifications", icon: <InboxIcon /> },
    ],
    diLabel: "Team",
    searchScopes: ["team", "tasks", "projects"],
  },

  project_oms: {
    tabs: [
      { id: "command", label: "Command", href: "/dashboard", icon: <CommandIcon /> },
      { id: "renovation", label: "Renovation", href: "/renovation", icon: <RenovationIcon /> },
      { id: "teams", label: "Teams", href: "/people", icon: <TeamIcon /> },
      { id: "reports", label: "Reports", href: "/intelligence", icon: <ReportsIcon /> },
      { id: "inbox", label: "Inbox", href: "/notifications", icon: <InboxIcon /> },
    ],
    diLabel: "Portfolio",
    searchScopes: ["projects", "teams", "documents"],
  },

  project_ops_manager: {
    tabs: [
      { id: "command", label: "Command", href: "/dashboard", icon: <CommandIcon /> },
      { id: "renovation", label: "Renovation", href: "/renovation", icon: <RenovationIcon /> },
      { id: "people", label: "People", href: "/people", icon: <PeopleIcon /> },
      { id: "finance", label: "Finance", href: "/finance", icon: <FinanceIcon /> },
      { id: "safety", label: "Safety", href: "/safety", icon: <SafetyIcon /> },
      { id: "tools", label: "Tools", href: "/tools", icon: <ToolsIcon /> },
      { id: "suppliers", label: "Suppliers", href: "/suppliers", icon: <SuppliersIcon /> },
      {
        id: "intelligence",
        label: "Intelligence",
        href: "/intelligence",
        icon: <IntelligenceIcon />,
      },
    ],
    diLabel: "Portfolio",
    searchScopes: ["projects", "employees", "finance"],
  },

  project_director: {
    tabs: [
      { id: "command", label: "Command", href: "/dashboard", icon: <CommandIcon /> },
      { id: "renovation", label: "Renovation", href: "/renovation", icon: <RenovationIcon /> },
      { id: "finance", label: "Finance", href: "/finance", icon: <FinanceIcon /> },
      { id: "people", label: "People", href: "/people", icon: <PeopleIcon /> },
      { id: "safety", label: "Safety", href: "/safety", icon: <SafetyIcon /> },
      { id: "tools", label: "Tools", href: "/tools", icon: <ToolsIcon /> },
      { id: "suppliers", label: "Suppliers", href: "/suppliers", icon: <SuppliersIcon /> },
      {
        id: "intelligence",
        label: "Intelligence",
        href: "/intelligence",
        icon: <IntelligenceIcon />,
      },
    ],
    diLabel: "Portfolio",
    searchScopes: ["projects", "employees", "finance", "documents"],
  },

  seller: {
    tabs: [
      { id: "today", label: "Today", href: "/today", icon: <TodayIcon /> },
      { id: "pos", label: "POS", href: "/operations", icon: <POSIcon /> },
      { id: "products", label: "Products", href: "/operations", icon: <InventoryIcon /> },
      { id: "inbox", label: "Inbox", href: "/notifications", icon: <InboxIcon /> },
      { id: "me", label: "Me", href: "/people", icon: <MeIcon /> },
    ],
    diLabel: "Register",
    searchScopes: ["products", "orders"],
  },

  store_manager: {
    tabs: [
      { id: "command", label: "Command", href: "/dashboard", icon: <CommandIcon /> },
      { id: "store", label: "Store", href: "/operations", icon: <StoreIcon /> },
      { id: "staff", label: "Staff", href: "/people", icon: <TeamIcon /> },
      { id: "inventory", label: "Inventory", href: "/operations", icon: <InventoryIcon /> },
      { id: "reports", label: "Reports", href: "/intelligence", icon: <ReportsIcon /> },
    ],
    diLabel: "Store",
    searchScopes: ["employees", "products", "inventory", "orders"],
  },

  shop_director: {
    tabs: [
      { id: "command", label: "Command", href: "/dashboard", icon: <CommandIcon /> },
      { id: "stores", label: "Stores", href: "/operations", icon: <StoreIcon /> },
      { id: "finance", label: "Finance", href: "/finance", icon: <FinanceIcon /> },
      { id: "procurement", label: "Procurement", href: "/procurement", icon: <ProcurementIcon /> },
      {
        id: "intelligence",
        label: "Intelligence",
        href: "/intelligence",
        icon: <IntelligenceIcon />,
      },
    ],
    diLabel: "Network",
    searchScopes: ["stores", "employees", "finance", "products"],
  },

  app_support: {
    tabs: [
      { id: "tickets", label: "Tickets", href: "/tickets", icon: <TicketsIcon /> },
      { id: "investigate", label: "Investigate", href: "/intelligence", icon: <ExploreIcon /> },
      { id: "known_issues", label: "Known Issues", href: "/known-issues", icon: <AuditIcon /> },
      { id: "users", label: "Users", href: "/people", icon: <UsersIcon /> },
      { id: "inbox", label: "Inbox", href: "/notifications", icon: <InboxIcon /> },
    ],
    diLabel: "Tickets",
    searchScopes: ["users", "tickets", "audit"],
  },

  data_analyst: {
    tabs: [
      { id: "analytics", label: "Analytics", href: "/intelligence", icon: <AnalyticsIcon /> },
      { id: "reports", label: "Reports", href: "/intelligence", icon: <ReportsIcon /> },
      { id: "explore", label: "Explore", href: "/intelligence", icon: <ExploreIcon /> },
      { id: "exports", label: "Exports", href: "/intelligence", icon: <ExportsIcon /> },
      { id: "inbox", label: "Inbox", href: "/notifications", icon: <InboxIcon /> },
    ],
    diLabel: "Analytics",
    searchScopes: ["analytics", "reports", "datasets"],
  },

  qa_tester: {
    tabs: [
      { id: "testing", label: "Testing", href: "/testing", icon: <TestingIcon /> },
      { id: "bugs", label: "Bugs", href: "/bugs", icon: <BugsIcon /> },
      { id: "test_cases", label: "Test Cases", href: "/test-cases", icon: <AuditIcon /> },
      { id: "coverage", label: "Coverage", href: "/test-coverage", icon: <CoverageIcon /> },
      { id: "inbox", label: "Inbox", href: "/notifications", icon: <InboxIcon /> },
    ],
    diLabel: "QA",
    searchScopes: ["bugs", "test_cases"],
  },
}

// ── Role → shell key mapping ───────────────────────────────────────────────

const ROLE_TO_SHELL: Record<SystemRole, string> = {
  group_ceo: "executive",
  ceo: "executive",
  co_ceo: "executive",
  system_administrator: "sysadmin",
  worker: "worker",
  team_leader: "team_leader",
  department_head: "dept_head",
  oms: "oms",
  operations_manager: "ops_manager",
  hr_payroll: "hr",
  project_worker: "project_worker",
  project_team_leader: "project_team_leader",
  project_oms: "project_oms",
  project_operations_manager: "project_ops_manager",
  project_director: "project_director",
  seller: "seller",
  store_manager: "store_manager",
  shop_director: "shop_director",
  app_support_specialist: "app_support",
  data_analyst: "data_analyst",
  qa_tester: "qa_tester",
}

export function resolveShell(role: SystemRole): ShellConfig {
  const key = ROLE_TO_SHELL[role] ?? "worker"
  return SHELLS[key]!
}
