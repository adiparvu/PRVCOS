import type { SystemRole } from "@prv/auth"

export interface QuickAction {
  label: string
  icon: string // SVG path d attribute
  href?: string
}

const EXECUTIVE_ACTIONS: QuickAction[] = [
  { label: "New Project", icon: "M12 5v14M5 12h14", href: "/projects" },
  {
    label: "Add Employee",
    icon: "M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2M12 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8ZM19 8v6M22 11h-6",
    href: "/people",
  },
  {
    label: "Create Invoice",
    icon: "M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8ZM14 2v6h6M16 13H8M16 17H8M10 9H8",
    href: "/finance",
  },
  {
    label: "New Order",
    icon: "M6 2 3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4ZM3 6h18M16 10a4 4 0 0 1-8 0",
    href: "/operations",
  },
  {
    label: "Safety",
    icon: "M12 2l-9 4v5c0 5.25 3.75 10.14 9 11.25C17.25 21.14 21 16.25 21 11V6l-9-4zM9 12l2 2 4-4",
    href: "/safety",
  },
  { label: "View Reports", icon: "M3 3v18h18M18 17V9M13 17V5M8 17v-3", href: "/intelligence" },
  {
    label: "Procurement",
    icon: "M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6",
    href: "/procurement",
  },
  {
    label: "Fleet",
    icon: "M5 17H3a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v9a2 2 0 0 1-2 2h-2M14 17a2 2 0 1 0 4 0 2 2 0 0 0-4 0M5 17a2 2 0 1 0 4 0 2 2 0 0 0-4 0",
    href: "/fleet",
  },
]

const MANAGER_ACTIONS: QuickAction[] = [
  { label: "Add Task", icon: "M12 5v14M5 12h14", href: "/operations" },
  {
    label: "View Staff",
    icon: "M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2M9 7a4 4 0 1 0 0-8 4 4 0 0 0 0 8Z",
    href: "/people",
  },
  { label: "Reports", icon: "M3 3v18h18M18 17V9M13 17V5M8 17v-3", href: "/intelligence" },
  {
    label: "Approvals",
    icon: "M22 11.08V12a10 10 0 1 1-5.93-9.14M22 4 12 14.01l-3-3",
    href: "/approvals",
  },
  {
    label: "Safety",
    icon: "M12 2l-9 4v5c0 5.25 3.75 10.14 9 11.25C17.25 21.14 21 16.25 21 11V6l-9-4zM9 12l2 2 4-4",
    href: "/safety",
  },
  {
    label: "Knowledge",
    icon: "M4 19.5v-15A2.5 2.5 0 0 1 6.5 2H20v20H6.5a2.5 2.5 0 0 1 0-5H20",
    href: "/knowledge",
  },
]

const WORKER_ACTIONS: QuickAction[] = [
  {
    label: "My Schedule",
    icon: "M8 2v4M16 2v4M3 10h18M3 6a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V6Z",
    href: "/schedule",
  },
  {
    label: "Attendance",
    icon: "M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2M9 7a4 4 0 1 0 0-8 4 4 0 0 0 0 8ZM23 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75",
    href: "/attendance",
  },
  {
    label: "Inbox",
    icon: "M3 8l7.89 5.26a2 2 0 0 0 2.22 0L21 8M5 19h14a2 2 0 0 0 2-2V7a2 2 0 0 0-2-2H5a2 2 0 0 0-2 2v10a2 2 0 0 0 2 2Z",
    href: "/notifications",
  },
  {
    label: "Documents",
    icon: "M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8Z",
    href: "/documents",
  },
]

const PROJECT_WORKER_ACTIONS: QuickAction[] = [
  { label: "My Projects", icon: "M3 7h3l2-4h8l2 4h3v14H3z", href: "/projects" },
  {
    label: "Tasks",
    icon: "M9 11l2 2 4-4M3 6a3 3 0 0 1 3-3h12a3 3 0 0 1 3 3v12a3 3 0 0 1-3 3H6a3 3 0 0 1-3-3V6Z",
    href: "/schedule",
  },
  {
    label: "Chat",
    icon: "M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z",
    href: "/notifications",
  },
  {
    label: "Documents",
    icon: "M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8Z",
    href: "/documents",
  },
]

const SELLER_ACTIONS: QuickAction[] = [
  { label: "POS", icon: "M2 4h20v4H2zM4 8v12h16V8M9 12h6M9 16h4", href: "/operations" },
  {
    label: "Products",
    icon: "M20 7H4a2 2 0 0 0-2 2v10a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V9a2 2 0 0 0-2-2Z",
    href: "/operations",
  },
  {
    label: "My Schedule",
    icon: "M8 2v4M16 2v4M3 10h18M3 6a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V6Z",
    href: "/schedule",
  },
  {
    label: "Inbox",
    icon: "M3 8l7.89 5.26a2 2 0 0 0 2.22 0L21 8M5 19h14a2 2 0 0 0 2-2V7a2 2 0 0 0-2-2H5a2 2 0 0 0-2 2v10a2 2 0 0 0 2 2Z",
    href: "/notifications",
  },
]

const ANALYST_ACTIONS: QuickAction[] = [
  { label: "Analytics", icon: "M3 3v18h18M7 12l4-5 4 3 4-5", href: "/intelligence" },
  { label: "Reports", icon: "M3 3v18h18M18 17V9M13 17V5M8 17v-3", href: "/intelligence" },
  {
    label: "Export",
    icon: "M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4M17 8l-5-5-5 5M12 3v12",
    href: "/intelligence",
  },
  {
    label: "Inbox",
    icon: "M3 8l7.89 5.26a2 2 0 0 0 2.22 0L21 8M5 19h14a2 2 0 0 0 2-2V7a2 2 0 0 0-2-2H5a2 2 0 0 0-2 2v10a2 2 0 0 0 2 2Z",
    href: "/notifications",
  },
]

const SYSADMIN_ACTIONS: QuickAction[] = [
  {
    label: "Users",
    icon: "M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2M9 7a4 4 0 1 0 0-8 4 4 0 0 0 0 8ZM23 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75",
    href: "/people",
  },
  {
    label: "Audit Log",
    icon: "M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8ZM14 2v6h6M8 13h8M8 17h5",
    href: "/dashboard",
  },
  {
    label: "Security",
    icon: "M12 2l-9 4v5c0 5.25 3.75 10.14 9 11.25C17.25 21.14 21 16.25 21 11V6l-9-4zM9 12l2 2 4-4",
    href: "/dashboard",
  },
  {
    label: "Inbox",
    icon: "M3 8l7.89 5.26a2 2 0 0 0 2.22 0L21 8M5 19h14a2 2 0 0 0 2-2V7a2 2 0 0 0-2-2H5a2 2 0 0 0-2 2v10a2 2 0 0 0 2 2Z",
    href: "/notifications",
  },
]

const ROLE_ACTIONS: Record<SystemRole, QuickAction[]> = {
  group_ceo: EXECUTIVE_ACTIONS,
  ceo: EXECUTIVE_ACTIONS,
  co_ceo: EXECUTIVE_ACTIONS,
  system_administrator: SYSADMIN_ACTIONS,
  worker: WORKER_ACTIONS,
  team_leader: WORKER_ACTIONS,
  department_head: MANAGER_ACTIONS,
  oms: MANAGER_ACTIONS,
  operations_manager: MANAGER_ACTIONS,
  hr_payroll: MANAGER_ACTIONS,
  project_worker: PROJECT_WORKER_ACTIONS,
  project_team_leader: PROJECT_WORKER_ACTIONS,
  project_oms: MANAGER_ACTIONS,
  project_operations_manager: MANAGER_ACTIONS,
  project_director: MANAGER_ACTIONS,
  seller: SELLER_ACTIONS,
  store_manager: MANAGER_ACTIONS,
  shop_director: EXECUTIVE_ACTIONS,
  app_support_specialist: ANALYST_ACTIONS,
  data_analyst: ANALYST_ACTIONS,
  qa_tester: ANALYST_ACTIONS,
}

export function resolveQuickActions(role: SystemRole): QuickAction[] {
  return ROLE_ACTIONS[role] ?? WORKER_ACTIONS
}
