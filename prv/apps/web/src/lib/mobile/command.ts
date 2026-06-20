import { db } from "@prv/db"
import { users, projects, orders, invoices, notifications, alerts } from "@prv/db/schema"
import { eq, and, gte, lt, inArray, not, count, isNull, desc, sql, ne } from "drizzle-orm"
import type { MobileContext } from "./auth"
import type { CommandData, KPIItem, AlertItem, InboxItem, QuickAction } from "./types"

// ─── Formatters ───────────────────────────────────────────────────────────────

function formatCurrency(amount: number): string {
  if (amount >= 1_000_000) return `€${(amount / 1_000_000).toFixed(1)}M`
  if (amount >= 1_000) return `€${Math.round(amount / 1_000)}k`
  return `€${Math.round(amount)}`
}

function formatDelta(current: number, previous: number, period = "vs last week"): string | null {
  if (previous === 0) return null
  const pct = Math.round(((current - previous) / previous) * 100)
  if (pct === 0) return "No change"
  return pct > 0 ? `↑ ${pct}% ${period}` : `↓ ${Math.abs(pct)}% ${period}`
}

function deltaType(current: number, previous: number): "up" | "down" | "neutral" {
  if (previous === 0 || current === previous) return "neutral"
  return current > previous ? "up" : "down"
}

function timeAgo(date: Date | null): string {
  if (!date) return ""
  const seconds = Math.floor((Date.now() - date.getTime()) / 1000)
  if (seconds < 60) return "Just now"
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`
  if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`
  return `${Math.floor(seconds / 86400)}d ago`
}

function notifInitials(title: string): string {
  return title
    .split(" ")
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase() ?? "")
    .join("")
}

// ─── Role display ─────────────────────────────────────────────────────────────

const ROLE_DISPLAY: Record<string, string> = {
  group_ceo: "Group CEO",
  ceo: "CEO",
  co_ceo: "Co-CEO",
  system_administrator: "Sysadmin",
  store_manager: "Store Manager",
  shop_director: "Shop Director",
  operations_manager: "Operations Manager",
  department_head: "Department Head",
  team_leader: "Team Leader",
  worker: "Worker",
  seller: "Seller",
  project_director: "Project Director",
  hr_payroll: "HR & Payroll",
  data_analyst: "Data Analyst",
}

// ─── Quick actions by role ────────────────────────────────────────────────────

const QUICK_ACTIONS: Record<string, QuickAction[]> = {
  group_ceo: [
    { id: "reports", icon: "≡", label: "Reports", route: "/(tabs)/intelligence" },
    { id: "intel", icon: "✦", label: "AI Intel", route: "/(tabs)/intelligence" },
    { id: "invoice", icon: "⟁", label: "New Invoice", route: "/(tabs)/finance" },
    { id: "projects", icon: "⊞", label: "Projects", route: "/(tabs)/operations" },
  ],
  ceo: [
    { id: "reports", icon: "≡", label: "Reports", route: "/(tabs)/intelligence" },
    { id: "intel", icon: "✦", label: "AI Intel", route: "/(tabs)/intelligence" },
    { id: "invoice", icon: "⟁", label: "New Invoice", route: "/(tabs)/finance" },
    { id: "projects", icon: "⊞", label: "Projects", route: "/(tabs)/operations" },
  ],
  store_manager: [
    { id: "task", icon: "＋", label: "New Task", route: "/(tabs)/operations" },
    { id: "schedule", icon: "⋯", label: "Schedule", route: "/(tabs)/people" },
    { id: "inventory", icon: "⬡", label: "Inventory", route: "/(tabs)/operations" },
    { id: "team", icon: "◎", label: "My Team", route: "/(tabs)/people" },
  ],
}

const DEFAULT_QUICK_ACTIONS: QuickAction[] = [
  { id: "task", icon: "＋", label: "New Task", route: "/(tabs)/operations" },
  { id: "people", icon: "◎", label: "People", route: "/(tabs)/people" },
  { id: "finance", icon: "⟁", label: "Finance", route: "/(tabs)/finance" },
  { id: "reports", icon: "≡", label: "Reports", route: "/(tabs)/intelligence" },
]

// ─── AI Briefing ──────────────────────────────────────────────────────────────

function buildAIBriefing(
  overdueCount: number,
  overdueAmount: number,
  onHoldProjects: number,
  alertCount: number
): CommandData["aiBriefing"] {
  const insights: string[] = []

  if (overdueCount > 0) {
    insights.push(
      `${overdueCount} invoice${overdueCount > 1 ? "s" : ""} overdue — ${formatCurrency(overdueAmount)} pending collection.`
    )
  }
  if (onHoldProjects > 0) {
    insights.push(
      `${onHoldProjects} project${onHoldProjects > 1 ? "s" : ""} on hold. Review blockers to keep timelines on track.`
    )
  }
  if (alertCount > 0) {
    insights.push(`${alertCount} unread alert${alertCount > 1 ? "s" : ""} require your attention.`)
  }

  if (insights.length === 0) {
    insights.push("All metrics are on track. No critical issues detected today.")
  }

  const n = insights.length
  const summary =
    n === 1
      ? "1 thing needs your attention today."
      : n > 1
        ? `${n} things need your attention today.`
        : "Everything looks good today."

  return { summary, insights }
}

// ─── Main assembly ────────────────────────────────────────────────────────────

export async function assembleCommand(ctx: MobileContext): Promise<CommandData> {
  const now = new Date()
  const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)
  const twoWeeksAgo = new Date(now.getTime() - 14 * 24 * 60 * 60 * 1000)
  const oneHourAgo = new Date(now.getTime() - 60 * 60 * 1000)

  const cancelledStatuses = ["cancelled", "refunded"] as const

  const [
    userRow,
    thisWeekRevRow,
    lastWeekRevRow,
    projectCounts,
    onlineRow,
    alertRow,
    overdueInvoiceRow,
    inboxItems,
  ] = await Promise.all([
    // User profile
    db
      .select({ firstName: users.firstName, storeId: users.storeId })
      .from(users)
      .where(eq(users.id, ctx.userId))
      .limit(1),

    // Revenue this week
    db
      .select({ total: sql<string>`COALESCE(SUM(${orders.total}), '0')` })
      .from(orders)
      .where(
        and(
          eq(orders.companyId, ctx.companyId),
          gte(orders.createdAt, weekAgo),
          not(inArray(orders.status, [...cancelledStatuses]))
        )
      ),

    // Revenue last week (for delta)
    db
      .select({ total: sql<string>`COALESCE(SUM(${orders.total}), '0')` })
      .from(orders)
      .where(
        and(
          eq(orders.companyId, ctx.companyId),
          gte(orders.createdAt, twoWeeksAgo),
          lt(orders.createdAt, weekAgo),
          not(inArray(orders.status, [...cancelledStatuses]))
        )
      ),

    // Project counts by status
    db
      .select({ status: projects.status, count: count() })
      .from(projects)
      .where(eq(projects.companyId, ctx.companyId))
      .groupBy(projects.status),

    // Team online (active in last hour)
    db
      .select({ total: count() })
      .from(users)
      .where(
        and(
          eq(users.companyId, ctx.companyId),
          eq(users.isActive, true),
          gte(users.lastLoginAt, oneHourAgo)
        )
      ),

    // Unread warning/error notifications for user
    db
      .select({ total: count() })
      .from(notifications)
      .where(
        and(
          eq(notifications.userId, ctx.userId),
          eq(notifications.isDismissed, false),
          eq(notifications.isRead, false),
          inArray(notifications.type, ["warning", "error"])
        )
      ),

    // Overdue invoices
    db
      .select({
        count: count(),
        total: sql<string>`COALESCE(SUM(${invoices.total}), '0')`,
      })
      .from(invoices)
      .where(and(eq(invoices.companyId, ctx.companyId), eq(invoices.status, "overdue"))),

    // Inbox: latest 3 non-dismissed notifications
    db
      .select({
        id: notifications.id,
        title: notifications.title,
        body: notifications.body,
        isRead: notifications.isRead,
        type: notifications.type,
        createdAt: notifications.createdAt,
      })
      .from(notifications)
      .where(and(eq(notifications.userId, ctx.userId), eq(notifications.isDismissed, false)))
      .orderBy(desc(notifications.createdAt))
      .limit(3),
  ])

  // ── Derive values ──────────────────────────────────────────────────────────

  const thisRevenue = parseFloat(thisWeekRevRow[0]?.total ?? "0")
  const lastRevenue = parseFloat(lastWeekRevRow[0]?.total ?? "0")
  const profitEstimate = thisRevenue * 0.25
  const lastProfitEstimate = lastRevenue * 0.25

  const activeProjects = projectCounts.find((r) => r.status === "active")?.count ?? 0
  const onHoldProjects = projectCounts.find((r) => r.status === "on_hold")?.count ?? 0
  const totalActiveOrOnHold = activeProjects + onHoldProjects

  const onlineCount = onlineRow[0]?.total ?? 0
  const alertCount = alertRow[0]?.total ?? 0
  const overdueCount = overdueInvoiceRow[0]?.count ?? 0
  const overdueAmount = parseFloat(overdueInvoiceRow[0]?.total ?? "0")

  const firstName = userRow[0]?.firstName ?? "there"
  const roleDisplay = ROLE_DISPLAY[ctx.role] ?? ctx.role
  const scopeName = "PRV Group"

  // ── KPIs ──────────────────────────────────────────────────────────────────

  const kpis: KPIItem[] = [
    {
      value: formatCurrency(thisRevenue),
      label: "Revenue",
      delta: formatDelta(thisRevenue, lastRevenue),
      deltaType: deltaType(thisRevenue, lastRevenue),
    },
    {
      value: formatCurrency(profitEstimate),
      label: "Profit",
      delta: formatDelta(profitEstimate, lastProfitEstimate),
      deltaType: deltaType(profitEstimate, lastProfitEstimate),
      valueColor: "#30d158",
    },
    {
      value: String(totalActiveOrOnHold),
      label: "Active Projects",
      delta: onHoldProjects > 0 ? `${onHoldProjects} on hold` : null,
      deltaType: "neutral",
    },
    {
      value: String(onlineCount),
      label: "Team Online",
      delta: null,
      deltaType: "neutral",
    },
  ]

  // ── Secondary strip ────────────────────────────────────────────────────────

  const secondary = [
    {
      label: "Alerts",
      value: String(alertCount),
      valueColor: alertCount > 0 ? "#ff453a" : undefined,
    },
    {
      label: "Overdue Inv.",
      value: overdueCount > 0 ? formatCurrency(overdueAmount) : "—",
      valueColor: overdueCount > 0 ? "#ff9f0a" : undefined,
    },
    {
      label: "Projects",
      value: String(totalActiveOrOnHold),
    },
  ]

  // ── Alerts — merge DB alerts with synthetic derived alerts ────────────────

  const dbAlerts = await db
    .select({
      id: alerts.id,
      severity: alerts.severity,
      title: alerts.title,
      description: alerts.description,
      createdAt: alerts.createdAt,
    })
    .from(alerts)
    .where(and(eq(alerts.companyId, ctx.companyId), ne(alerts.status, "resolved")))
    .orderBy(desc(alerts.createdAt))
    .limit(8)

  const alertItems: AlertItem[] = dbAlerts.map((a) => ({
    id: a.id,
    severity:
      a.severity === "l3_critical" || a.severity === "l4_emergency" || a.severity === "l5_crisis"
        ? "red"
        : "amber",
    title: a.title,
    subtitle: a.description ?? "",
    timeAgo: timeAgo(a.createdAt),
  }))

  // Append synthetic derived alerts only if no DB alert covers the same topic
  const hasSyntheticOverdue = !dbAlerts.some(
    (a) => a.title.toLowerCase().includes("overdue") || a.title.toLowerCase().includes("invoice")
  )
  if (overdueCount > 0 && hasSyntheticOverdue) {
    alertItems.push({
      id: "overdue-invoices",
      severity: "red",
      title: `${overdueCount} overdue invoice${overdueCount > 1 ? "s" : ""}`,
      subtitle: `${formatCurrency(overdueAmount)} pending collection`,
      timeAgo: "Now",
    })
  }
  const hasSyntheticOnHold = !dbAlerts.some((a) => a.title.toLowerCase().includes("on hold"))
  if (onHoldProjects > 0 && hasSyntheticOnHold) {
    alertItems.push({
      id: "on-hold-projects",
      severity: "amber",
      title: `${onHoldProjects} project${onHoldProjects > 1 ? "s" : ""} on hold`,
      subtitle: "Review blockers to unblock progress",
      timeAgo: "Now",
    })
  }

  // ── Inbox ──────────────────────────────────────────────────────────────────

  const inbox: InboxItem[] = inboxItems.map((n) => ({
    id: n.id,
    initials: notifInitials(n.title),
    sender: n.title,
    preview: n.body ?? "",
    timeAgo: timeAgo(n.createdAt),
    unread: !n.isRead,
  }))

  return {
    user: { firstName, role: roleDisplay, scopeName },
    kpis,
    secondary,
    aiBriefing: buildAIBriefing(overdueCount, overdueAmount, onHoldProjects, alertCount),
    alerts: alertItems,
    quickActions: QUICK_ACTIONS[ctx.role] ?? DEFAULT_QUICK_ACTIONS,
    inbox,
  }
}
