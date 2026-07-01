import type { CommandEntry } from "./types"

const CEO_ROLES = new Set(["ROLE_SUPERADMIN", "ROLE_COMPANY_OWNER", "ROLE_CEO"])

const MANAGER_ROLES = new Set([...CEO_ROLES, "ROLE_REGIONAL_MANAGER", "ROLE_STORE_MANAGER"])

const FINANCE_ROLES = new Set([...CEO_ROLES, "ROLE_FINANCE_MANAGER", "ROLE_ACCOUNTANT"])

const BASE: CommandEntry[] = [
  {
    id: "nav.dashboard",
    label: "Go to Dashboard",
    section: "Navigation",
    shortcut: "⌘1",
    keywords: ["home", "command", "kpis"],
    href: "/dashboard",
  },
  {
    id: "nav.notifications",
    label: "Notifications",
    section: "Navigation",
    shortcut: "⌘N",
    keywords: ["alerts", "inbox"],
    href: "/notifications",
  },
  {
    id: "nav.projects",
    label: "Projects",
    section: "Navigation",
    keywords: ["renovation", "work"],
    href: "/projects",
  },
  {
    id: "nav.people",
    label: "People & HR",
    section: "Navigation",
    keywords: ["employees", "team", "hr"],
    href: "/people",
  },
  {
    id: "nav.schedule",
    label: "Schedule",
    section: "Navigation",
    keywords: ["shifts", "calendar", "rota"],
    href: "/people/schedule",
  },
  {
    id: "nav.operations",
    label: "Operations",
    section: "Navigation",
    keywords: ["stores", "inventory", "tasks"],
    href: "/operations",
  },
  {
    id: "nav.commerce",
    label: "Commerce",
    section: "Navigation",
    keywords: ["shop", "products", "orders", "store", "wishlist", "catalog"],
    href: "/commerce",
  },
  {
    id: "nav.intelligence",
    label: "Intelligence & Analytics",
    section: "Navigation",
    keywords: ["reports", "ai", "data"],
    href: "/intelligence",
  },
  {
    id: "nav.knowledge",
    label: "Knowledge Base",
    section: "Navigation",
    keywords: ["docs", "wiki", "help"],
    href: "/knowledge",
  },
  {
    id: "nav.crm",
    label: "CRM & Leads",
    section: "Navigation",
    keywords: ["crm", "leads", "pipeline", "sales", "contacts", "deals"],
    href: "/crm",
  },
  {
    id: "nav.clients",
    label: "Clients",
    section: "Navigation",
    keywords: ["clients", "customers", "accounts"],
    href: "/clients",
  },
  {
    id: "nav.attendance",
    label: "Attendance",
    section: "Navigation",
    keywords: ["attendance", "clock", "presence", "time", "check-in"],
    href: "/attendance",
  },
  {
    id: "nav.approvals",
    label: "Approvals",
    section: "Navigation",
    keywords: ["approvals", "requests", "sign-off", "authorize"],
    href: "/approvals",
  },
]

const MANAGER_CMDS: CommandEntry[] = [
  {
    id: "people.schedule",
    label: "Manage Schedules",
    section: "People",
    keywords: ["shifts", "rota"],
    href: "/people/schedule",
  },
  {
    id: "people.timeoff",
    label: "Approve Time-Off",
    section: "People",
    badge: "3",
    keywords: ["leave", "vacation"],
    href: "/people/time-off",
  },
  {
    id: "people.org",
    label: "View Org Chart",
    section: "People",
    keywords: ["organization", "hierarchy"],
    href: "/people/org",
  },
  {
    id: "ops.tasks",
    label: "Pending Tasks",
    section: "Operations",
    keywords: ["todo", "queue"],
    href: "/operations/tasks",
  },
  {
    id: "ops.inventory",
    label: "Inventory Check",
    section: "Operations",
    keywords: ["stock", "warehouse"],
    href: "/operations/inventory",
  },
]

const FINANCE_CMDS: CommandEntry[] = [
  {
    id: "finance.report",
    label: "Monthly Report",
    section: "Finance",
    shortcut: "⌘R",
    keywords: ["revenue", "profit"],
    href: "/finance/reports",
  },
  {
    id: "finance.expenses",
    label: "Approve Expenses",
    section: "Finance",
    badge: "12",
    keywords: ["costs", "reimburse"],
    href: "/finance/expenses",
  },
  {
    id: "finance.invoices",
    label: "Invoices",
    section: "Finance",
    keywords: ["billing", "payment"],
    href: "/finance/invoices",
  },
  {
    id: "finance.payroll",
    label: "Payroll",
    section: "Finance",
    keywords: ["salary", "wages"],
    href: "/finance/payroll",
  },
]

const CEO_CMDS: CommandEntry[] = [
  {
    id: "ceo.kpis",
    label: "View All KPIs",
    section: "CEO Dashboard",
    shortcut: "⌘1",
    keywords: ["metrics", "overview", "revenue"],
    href: "/dashboard",
  },
  {
    id: "ceo.overview",
    label: "Company Overview",
    section: "CEO Dashboard",
    shortcut: "⌘2",
    keywords: ["companies", "entities"],
    href: "/dashboard/overview",
  },
  {
    id: "ceo.group",
    label: "Group Rollup",
    section: "CEO Dashboard",
    keywords: ["companies", "rollup", "consolidated", "holding", "group", "multi-company"],
    href: "/groups",
  },
  {
    id: "ceo.group.manage",
    label: "Manage Group",
    section: "CEO Dashboard",
    keywords: ["group", "companies", "add", "remove", "rename", "members", "administration"],
    href: "/groups/manage",
  },
  {
    id: "ceo.group.create",
    label: "Create Group",
    section: "CEO Dashboard",
    keywords: ["group", "new", "create", "holding", "company group"],
    href: "/groups?new=1",
  },
  {
    id: "ceo.ai",
    label: "AI Briefing",
    section: "CEO Dashboard",
    shortcut: "⌘B",
    keywords: ["intelligence", "summary", "insights"],
    href: "/intelligence/ai",
  },
]

export function getCommandsForRole(role: string): CommandEntry[] {
  const cmds = [...BASE]
  if (MANAGER_ROLES.has(role)) cmds.push(...MANAGER_CMDS)
  if (FINANCE_ROLES.has(role)) cmds.push(...FINANCE_CMDS)
  if (CEO_ROLES.has(role)) cmds.push(...CEO_CMDS)
  return cmds
}
