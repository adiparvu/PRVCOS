import { db } from "@prv/db"
import { orders, invoices, projects, projectMilestones } from "@prv/db/schema"
import { eq, and, gte, lt, inArray, not, count, isNull, desc, sql } from "drizzle-orm"
import type { MobileContext } from "./auth"
import type {
  IntelligenceData,
  IntelligenceWeek,
  IntelligenceForecastDriver,
  DayRevenue,
} from "./types"

// ─── Formatters ───────────────────────────────────────────────────────────────

function formatCurrency(amount: number, currency = "RON"): string {
  const eur = currency === "EUR"
  const prefix = eur ? "€" : ""
  const suffix = eur ? "" : " RON"
  if (amount >= 1_000_000) return `${prefix}${(amount / 1_000_000).toFixed(1)}M${suffix}`
  if (amount >= 1_000) return `${prefix}${Math.round(amount / 1_000)}k${suffix}`
  return `${prefix}${Math.round(amount)}${suffix}`
}

function parseMoney(v: string | null | undefined): number {
  return parseFloat(v ?? "0") || 0
}

function daysOverdue(dueDate: string | null): number {
  if (!dueDate) return 0
  return Math.max(0, Math.floor((Date.now() - new Date(dueDate).getTime()) / 86_400_000))
}

function relativeTime(date: Date | string | null): string {
  if (!date) return ""
  const d = typeof date === "string" ? new Date(date) : date
  const diff = Date.now() - d.getTime()
  const mins = Math.floor(diff / 60_000)
  if (mins < 60) return `${mins}m ago`
  const hours = Math.floor(mins / 60)
  if (hours < 24) return `${hours}h ago`
  return `${Math.floor(hours / 24)}d ago`
}

// ─── AI briefing ─────────────────────────────────────────────────────────────

function buildBriefing(
  thisMonth: number,
  lastMonth: number,
  overdueCount: number,
  activeProjects: number,
  collectionRate: number
): { summary: string; insights: string[] } | null {
  const delta = lastMonth > 0 ? Math.round(((thisMonth - lastMonth) / lastMonth) * 100) : null

  const parts: string[] = []
  if (delta !== null) {
    parts.push(
      delta >= 0
        ? `Revenue is tracking ${delta}% above last month`
        : `Revenue is ${Math.abs(delta)}% below last month`
    )
  } else if (thisMonth > 0) {
    parts.push(`Revenue this month is ${formatCurrency(thisMonth)}`)
  }
  if (overdueCount > 0) {
    parts.push(
      `${overdueCount} overdue invoice${overdueCount > 1 ? "s" : ""} require${overdueCount === 1 ? "s" : ""} immediate attention`
    )
  }
  if (parts.length === 0) return null

  const insights: string[] = []
  if (delta !== null && delta >= 10)
    insights.push(`Revenue up ${delta}% — strong growth trajectory this month`)
  if (delta !== null && delta < -5)
    insights.push(
      `Revenue down ${Math.abs(delta)}% — review pipeline and accelerate project closures`
    )
  if (collectionRate > 0 && collectionRate < 70)
    insights.push(
      `Collection rate at ${collectionRate}% — prioritise follow-ups on outstanding invoices`
    )
  if (collectionRate >= 85)
    insights.push(`Collection rate is ${collectionRate}% — cash flow is healthy`)
  if (overdueCount >= 2)
    insights.push(`${overdueCount} invoices are overdue — follow up this week to recover revenue`)
  if (activeProjects >= 5)
    insights.push(
      `${activeProjects} active projects in pipeline — plan resources for upcoming deliveries`
    )

  return { summary: parts.join(". ") + ".", insights: insights.slice(0, 3) }
}

// ─── Main assembly ────────────────────────────────────────────────────────────

export async function assembleIntelligence(ctx: MobileContext): Promise<IntelligenceData> {
  const now = new Date()
  const todayStr = now.toISOString().slice(0, 10)
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1)
  const lastMonthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1)
  const twoMonthsAgoStart = new Date(now.getFullYear(), now.getMonth() - 2, 1)
  const fiftySevenDaysAgo = new Date(now.getTime() - 56 * 24 * 60 * 60 * 1000)
  const cancelledStatuses = ["cancelled", "refunded"] as const

  const [
    dailyRows,
    thisMonthRevRow,
    lastMonthRevRow,
    twoMonthsRevRow,
    invoiceStatsRow,
    clientCountRow,
    avgDealRow,
    activeProjectCountRow,
    overdueMilestoneRow,
    overdueInvoiceRows,
    pipelineRow,
  ] = await Promise.all([
    // 1. Daily revenue last 56 days
    db
      .select({
        day: sql<string>`DATE(${orders.createdAt})`,
        revenue: sql<string>`COALESCE(SUM(${orders.total}), '0')`,
      })
      .from(orders)
      .where(
        and(
          eq(orders.companyId, ctx.companyId),
          gte(orders.createdAt, fiftySevenDaysAgo),
          not(inArray(orders.status, [...cancelledStatuses])),
          isNull(orders.deletedAt)
        )
      )
      .groupBy(sql`DATE(${orders.createdAt})`)
      .orderBy(sql`DATE(${orders.createdAt}) ASC`),

    // 2. Revenue this month
    db
      .select({ total: sql<string>`COALESCE(SUM(${orders.total}), '0')` })
      .from(orders)
      .where(
        and(
          eq(orders.companyId, ctx.companyId),
          gte(orders.createdAt, monthStart),
          not(inArray(orders.status, [...cancelledStatuses])),
          isNull(orders.deletedAt)
        )
      ),

    // 3. Revenue last month
    db
      .select({ total: sql<string>`COALESCE(SUM(${orders.total}), '0')` })
      .from(orders)
      .where(
        and(
          eq(orders.companyId, ctx.companyId),
          gte(orders.createdAt, lastMonthStart),
          lt(orders.createdAt, monthStart),
          not(inArray(orders.status, [...cancelledStatuses])),
          isNull(orders.deletedAt)
        )
      ),

    // 4. Revenue 2 months ago
    db
      .select({ total: sql<string>`COALESCE(SUM(${orders.total}), '0')` })
      .from(orders)
      .where(
        and(
          eq(orders.companyId, ctx.companyId),
          gte(orders.createdAt, twoMonthsAgoStart),
          lt(orders.createdAt, lastMonthStart),
          not(inArray(orders.status, [...cancelledStatuses])),
          isNull(orders.deletedAt)
        )
      ),

    // 5. Invoice collection stats (paid vs all non-draft)
    db
      .select({
        paidTotal: sql<string>`COALESCE(SUM(CASE WHEN ${invoices.status} = 'paid' THEN ${invoices.total} ELSE 0 END), '0')`,
        allTotal: sql<string>`COALESCE(SUM(CASE WHEN ${invoices.status} <> 'draft' THEN ${invoices.total} ELSE 0 END), '0')`,
      })
      .from(invoices)
      .where(and(eq(invoices.companyId, ctx.companyId), isNull(invoices.deletedAt))),

    // 6. Distinct active client count
    db
      .select({ cnt: sql<string>`COUNT(DISTINCT ${invoices.clientId})` })
      .from(invoices)
      .where(and(eq(invoices.companyId, ctx.companyId), isNull(invoices.deletedAt))),

    // 7. Avg deal size this month
    db
      .select({ avg: sql<string>`COALESCE(AVG(${orders.total}), '0')` })
      .from(orders)
      .where(
        and(
          eq(orders.companyId, ctx.companyId),
          gte(orders.createdAt, monthStart),
          not(inArray(orders.status, [...cancelledStatuses])),
          isNull(orders.deletedAt)
        )
      ),

    // 8. Active project count
    db
      .select({ cnt: count() })
      .from(projects)
      .where(
        and(
          eq(projects.companyId, ctx.companyId),
          eq(projects.status, "active"),
          isNull(projects.deletedAt)
        )
      ),

    // 9. Overdue milestone count (join to scope by companyId)
    db
      .select({ cnt: count() })
      .from(projectMilestones)
      .innerJoin(projects, eq(projectMilestones.projectId, projects.id))
      .where(
        and(
          eq(projects.companyId, ctx.companyId),
          eq(projectMilestones.isComplete, false),
          lt(projectMilestones.dueDate, todayStr),
          isNull(projectMilestones.deletedAt),
          isNull(projects.deletedAt)
        )
      ),

    // 10. Overdue invoices for alerts
    db
      .select({
        id: invoices.id,
        invoiceNumber: invoices.invoiceNumber,
        dueDate: invoices.dueDate,
      })
      .from(invoices)
      .where(
        and(
          eq(invoices.companyId, ctx.companyId),
          eq(invoices.status, "overdue"),
          isNull(invoices.deletedAt)
        )
      )
      .orderBy(invoices.dueDate)
      .limit(3),

    // 11. Active pipeline value
    db
      .select({ total: sql<string>`COALESCE(SUM(${projects.value}), '0')` })
      .from(projects)
      .where(
        and(
          eq(projects.companyId, ctx.companyId),
          eq(projects.status, "active"),
          isNull(projects.deletedAt)
        )
      ),
  ])

  // ── Parse core values ──────────────────────────────────────────────────────

  const thisMonthRev = parseMoney(thisMonthRevRow[0]?.total)
  const lastMonthRev = parseMoney(lastMonthRevRow[0]?.total)
  const twoMonthsRev = parseMoney(twoMonthsRevRow[0]?.total)
  const paidTotal = parseMoney(invoiceStatsRow[0]?.paidTotal)
  const allTotal = parseMoney(invoiceStatsRow[0]?.allTotal)
  const activeClients = parseInt(String(clientCountRow[0]?.cnt ?? "0"), 10)
  const avgDealSize = parseMoney(avgDealRow[0]?.avg)
  const activeProjects = activeProjectCountRow[0]?.cnt ?? 0
  const overdueMilestones = overdueMilestoneRow[0]?.cnt ?? 0
  const pipeline = parseMoney(pipelineRow[0]?.total)
  const collectionRate = allTotal > 0 ? Math.round((paidTotal / allTotal) * 100) : 0
  const deltaPercent =
    lastMonthRev > 0 ? Math.round(((thisMonthRev - lastMonthRev) / lastMonthRev) * 100) : null

  // ── Daily map ──────────────────────────────────────────────────────────────

  const dailyMap = new Map(dailyRows.map((r) => [r.day, parseMoney(r.revenue)]))

  // ── 30-day chart ───────────────────────────────────────────────────────────

  const dailyRevenue30: DayRevenue[] = []
  for (let i = 29; i >= 0; i--) {
    const d = new Date(now)
    d.setDate(d.getDate() - i)
    const dateStr = d.toISOString().slice(0, 10)
    dailyRevenue30.push({ date: dateStr, total: dailyMap.get(dateStr) ?? 0 })
  }

  // ── Monthly comparison ─────────────────────────────────────────────────────

  const monthlyRevenue = [
    {
      label: new Date(twoMonthsAgoStart).toLocaleString("en", { month: "short" }),
      total: twoMonthsRev,
    },
    {
      label: new Date(lastMonthStart).toLocaleString("en", { month: "short" }),
      total: lastMonthRev,
    },
    {
      label: new Date(monthStart).toLocaleString("en", { month: "short" }),
      total: thisMonthRev,
    },
  ]

  // ── Weekly buckets (last 4 complete 7-day windows) ─────────────────────────

  const weekTotals: number[] = []
  for (let w = 3; w >= 0; w--) {
    let sum = 0
    for (let d = 0; d < 7; d++) {
      const day = new Date(now)
      day.setDate(day.getDate() - (w * 7 + d + 1))
      sum += dailyMap.get(day.toISOString().slice(0, 10)) ?? 0
    }
    weekTotals.push(sum)
  }

  const weekAvg = weekTotals.reduce((s, v) => s + v, 0) / 4
  const recentAvg = (weekTotals[2] + weekTotals[3]) / 2
  const olderAvg = (weekTotals[0] + weekTotals[1]) / 2
  const rawTrend = olderAvg > 0 ? (recentAvg - olderAvg) / olderAvg : 0
  const trend = Math.max(-0.3, Math.min(0.3, rawTrend))

  const weeks: IntelligenceWeek[] = [
    ...weekTotals.map((total, i) => ({ weekLabel: `W${i + 1}`, total, isProjected: false })),
    ...[1, 2, 3, 4].map((n) => ({
      weekLabel: `W${n + 4}`,
      total: Math.round(weekAvg * (1 + (trend * n) / 4)),
      isProjected: true,
    })),
  ]

  // ── Month-end forecast ─────────────────────────────────────────────────────

  const daysElapsed = now.getDate()
  const daysInMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate()
  const monthEndEstimate =
    daysElapsed > 0 ? Math.round((thisMonthRev / daysElapsed) * daysInMonth) : 0
  const confidence = Math.min(94, Math.max(62, 70 + Math.round((daysElapsed / daysInMonth) * 24)))

  // ── Forecast drivers ───────────────────────────────────────────────────────

  const drivers: IntelligenceForecastDriver[] = [
    {
      label: "Active project pipeline",
      amountFormatted: pipeline > 0 ? `+${formatCurrency(Math.round(pipeline * 0.35))}` : "—",
      positive: true,
    },
    {
      label: "4-week revenue run rate",
      amountFormatted: weekAvg > 0 ? `+${formatCurrency(Math.round(weekAvg * 4))}` : "—",
      positive: true,
    },
    ...(overdueInvoiceRows.length > 0
      ? [
          {
            label: `${overdueInvoiceRows.length} overdue invoice${overdueInvoiceRows.length > 1 ? "s" : ""} at risk`,
            amountFormatted: "—",
            positive: false,
          },
        ]
      : []),
  ].slice(0, 3)

  // ── Alerts ─────────────────────────────────────────────────────────────────

  const alerts = [
    ...overdueInvoiceRows.map((inv) => ({
      id: inv.id,
      severity: "red" as const,
      title: `${inv.invoiceNumber} overdue · ${daysOverdue(inv.dueDate)}d`,
      timeAgo: inv.dueDate ? relativeTime(new Date(inv.dueDate)) : "—",
    })),
    ...(overdueMilestones > 0
      ? [
          {
            id: "overdue-milestones",
            severity: "amber" as const,
            title: `${overdueMilestones} task${overdueMilestones > 1 ? "s" : ""} past deadline`,
            timeAgo: "today",
          },
        ]
      : []),
  ]

  // ── AI briefing ────────────────────────────────────────────────────────────

  const aiBriefing = buildBriefing(
    thisMonthRev,
    lastMonthRev,
    overdueInvoiceRows.length,
    activeProjects,
    collectionRate
  )

  return {
    aiBriefing,
    alerts,
    analytics: {
      dailyRevenue30,
      monthlyRevenue,
      collectionRate,
      activeClients,
      avgDealSizeFormatted: formatCurrency(avgDealSize),
      projectsTotal: activeProjects,
      deltaPercent,
    },
    forecast: {
      monthEndFormatted: formatCurrency(monthEndEstimate),
      confidence,
      weeks,
      drivers,
    },
  }
}
