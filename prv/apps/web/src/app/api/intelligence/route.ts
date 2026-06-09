import { withGates } from "@/lib/with-gates"
import { NextRequest, NextResponse } from "next/server"
import type { GateContext } from "@prv/auth"
import { db } from "@prv/db"
import { aiInsights, generatedReports } from "@prv/db/schema"
import { orders, stores, expenses } from "@prv/db/schema"
import { and, asc, count, desc, eq, gte, isNull, lt, lte, sql, sum } from "drizzle-orm"

export const dynamic = "force-dynamic"
export const runtime = "nodejs"

export type InsightType = "recommendation" | "alert" | "forecast" | "report"
export type InsightPriority = "urgent" | "medium" | "low"
export type InsightStatus = "new" | "reviewed" | "actioned" | "dismissed"
export type ReportType = "monthly" | "inventory" | "forecast" | "performance"
export type ReportStatus = "ready" | "pending" | "scheduled"

export interface Insight {
  id: string
  type: InsightType
  priority: InsightPriority
  status: InsightStatus
  title: string
  summary: string
  affectedCount: number
  affectedLabel: string
  confidenceLabel: string
  timeAgo: string
}

export interface Report {
  id: string
  title: string
  type: ReportType
  status: ReportStatus
  statusLabel: string
  pages: number
  generatedDate: string
}

export interface StoreKpi {
  storeId: string
  storeName: string
  revenueTodayLabel: string
  revenueBarPct: number
  marginPct: number
}

export interface IntelligenceMeta {
  totalRevenueLabel: string
  revenueTrend: string
  avgMarginPct: number
  marginTrend: string
  ordersToday: number
  activeAlerts: number
}

// ── Helpers ───────────────────────────────────────────────────────────────────

const MONTH_LABELS = [
  "Ian",
  "Feb",
  "Mar",
  "Apr",
  "Mai",
  "Iun",
  "Iul",
  "Aug",
  "Sep",
  "Oct",
  "Nov",
  "Dec",
] as const

function fmtAmount(n: number): string {
  if (n >= 1_000_000) return `€${(n / 1_000_000).toFixed(1)}M`
  if (n >= 1_000) return `€${(n / 1_000).toFixed(1)}K`
  return `€${Math.round(n)}`
}

function relativeTime(date: Date): string {
  const diffMin = Math.floor((Date.now() - date.getTime()) / 60_000)
  if (diffMin < 1) return "acum"
  if (diffMin < 60) return `acum ${diffMin} min`
  const h = Math.floor(diffMin / 60)
  if (h < 24) return `acum ${h}h`
  if (h < 48) return "ieri"
  return `acum ${Math.floor(h / 24)} zile`
}

function fmtDate(d: Date): string {
  return `${d.getDate()} ${MONTH_LABELS[d.getMonth()]} ${d.getFullYear()}`
}

function reportStatusLabel(type: ReportType, status: ReportStatus): string {
  if (status === "scheduled") return "Programat"
  if (status === "pending") return "Generare..."
  if (type === "monthly") return "Finalizat"
  if (type === "forecast") return "AI"
  return "Revizuiește"
}

// ── GET ───────────────────────────────────────────────────────────────────────

export const GET = withGates(
  { action: "intelligence.read", endpointClass: "api_read" },
  async (req: NextRequest, ctx: GateContext): Promise<NextResponse> => {
    const { companyId } = ctx.session
    const typeFilter = req.nextUrl.searchParams.get("type") as InsightType | null
    const priorityFilter = req.nextUrl.searchParams.get("priority") as InsightPriority | null

    const todayStart = new Date()
    todayStart.setHours(0, 0, 0, 0)
    const yesterdayStart = new Date(todayStart.getTime() - 86_400_000)
    const thisMonthStart = new Date(todayStart.getFullYear(), todayStart.getMonth(), 1)
    const lastMonthStart = new Date(todayStart.getFullYear(), todayStart.getMonth() - 1, 1)
    const thisMonthStartStr = thisMonthStart.toISOString().slice(0, 10)
    const lastMonthStartStr = lastMonthStart.toISOString().slice(0, 10)
    const todayStr = todayStart.toISOString().slice(0, 10)

    const [
      insightRows,
      reportRows,
      storeOrderRows,
      storeRows,
      [yesterdayRevRow],
      [thisMonthRevRow],
      [thisMonthExpRow],
      [lastMonthRevRow],
      [lastMonthExpRow],
    ] = await Promise.all([
      db
        .select({
          id: aiInsights.id,
          type: aiInsights.type,
          priority: aiInsights.priority,
          status: aiInsights.status,
          title: aiInsights.title,
          summary: aiInsights.summary,
          affectedCount: aiInsights.affectedCount,
          affectedLabel: aiInsights.affectedLabel,
          confidenceLabel: aiInsights.confidenceLabel,
          createdAt: aiInsights.createdAt,
        })
        .from(aiInsights)
        .where(and(eq(aiInsights.companyId, companyId), isNull(aiInsights.deletedAt)))
        .orderBy(
          sql`CASE ${aiInsights.priority} WHEN 'urgent' THEN 0 WHEN 'medium' THEN 1 ELSE 2 END`,
          desc(aiInsights.createdAt)
        ),

      db
        .select({
          id: generatedReports.id,
          title: generatedReports.title,
          type: generatedReports.type,
          status: generatedReports.status,
          pages: generatedReports.pages,
          generatedAt: generatedReports.generatedAt,
          createdAt: generatedReports.createdAt,
        })
        .from(generatedReports)
        .where(and(eq(generatedReports.companyId, companyId), isNull(generatedReports.deletedAt)))
        .orderBy(desc(generatedReports.createdAt)),

      db
        .select({ storeId: orders.storeId, revenue: sum(orders.total), cnt: count() })
        .from(orders)
        .where(
          and(
            eq(orders.companyId, companyId),
            gte(orders.createdAt, todayStart),
            isNull(orders.deletedAt)
          )
        )
        .groupBy(orders.storeId),

      db
        .select({ id: stores.id, name: stores.name, city: stores.city })
        .from(stores)
        .where(eq(stores.companyId, companyId))
        .orderBy(asc(stores.name)),

      // Yesterday's order revenue (for revenueTrend)
      db
        .select({ total: sum(orders.total) })
        .from(orders)
        .where(
          and(
            eq(orders.companyId, companyId),
            gte(orders.createdAt, yesterdayStart),
            lt(orders.createdAt, todayStart),
            isNull(orders.deletedAt)
          )
        ),

      // This month's order revenue (for avgMarginPct)
      db
        .select({ total: sum(orders.total) })
        .from(orders)
        .where(
          and(
            eq(orders.companyId, companyId),
            gte(orders.createdAt, thisMonthStart),
            isNull(orders.deletedAt)
          )
        ),

      // This month's approved/paid expenses (for avgMarginPct)
      db
        .select({ total: sum(expenses.amount) })
        .from(expenses)
        .where(
          and(
            eq(expenses.companyId, companyId),
            gte(expenses.date, thisMonthStartStr),
            lte(expenses.date, todayStr),
            isNull(expenses.deletedAt)
          )
        ),

      // Last month's order revenue (for marginTrend)
      db
        .select({ total: sum(orders.total) })
        .from(orders)
        .where(
          and(
            eq(orders.companyId, companyId),
            gte(orders.createdAt, lastMonthStart),
            lt(orders.createdAt, thisMonthStart),
            isNull(orders.deletedAt)
          )
        ),

      // Last month's approved/paid expenses (for marginTrend)
      db
        .select({ total: sum(expenses.amount) })
        .from(expenses)
        .where(
          and(
            eq(expenses.companyId, companyId),
            gte(expenses.date, lastMonthStartStr),
            lt(expenses.date, thisMonthStartStr),
            isNull(expenses.deletedAt)
          )
        ),
    ])

    // Apply query filters to insights
    let insights = insightRows
    if (typeFilter) insights = insights.filter((i) => i.type === typeFilter)
    if (priorityFilter) insights = insights.filter((i) => i.priority === priorityFilter)

    const insightList: Insight[] = insights.map((i) => ({
      id: i.id,
      type: i.type as InsightType,
      priority: i.priority as InsightPriority,
      status: i.status as InsightStatus,
      title: i.title,
      summary: i.summary,
      affectedCount: i.affectedCount,
      affectedLabel: i.affectedLabel,
      confidenceLabel: i.confidenceLabel,
      timeAgo: relativeTime(i.createdAt),
    }))

    const reportList: Report[] = reportRows.map((r) => {
      const type = r.type as ReportType
      const status = r.status as ReportStatus
      return {
        id: r.id,
        title: r.title,
        type,
        status,
        statusLabel: reportStatusLabel(type, status),
        pages: r.pages,
        generatedDate: fmtDate(r.generatedAt ?? r.createdAt),
      }
    })

    // Compute per-store KPIs from today's order aggregates
    const revenueByStore = new Map<string, number>()
    for (const row of storeOrderRows) {
      if (row.storeId) revenueByStore.set(row.storeId, Number(row.revenue ?? 0))
    }
    const maxRev = Math.max(...Array.from(revenueByStore.values()), 1)

    const storeKpis: StoreKpi[] = storeRows.map((s) => ({
      storeId: s.id,
      storeName: s.city ? `${s.name} · ${s.city}` : s.name,
      revenueTodayLabel: fmtAmount(revenueByStore.get(s.id) ?? 0),
      revenueBarPct: Math.round(((revenueByStore.get(s.id) ?? 0) / maxRev) * 100),
      marginPct: 0,
    }))

    // Meta aggregates
    const totalRevToday = Array.from(revenueByStore.values()).reduce((a, b) => a + b, 0)
    const totalOrdersToday = storeOrderRows.reduce((a, r) => a + r.cnt, 0)
    const activeAlerts = insightRows.filter(
      (i) => i.type === "alert" && i.status !== "actioned" && i.status !== "dismissed"
    ).length

    const prevDayRev = Number(yesterdayRevRow?.total ?? 0)
    const revenueTrend =
      prevDayRev > 0
        ? `${totalRevToday >= prevDayRev ? "+" : ""}${(((totalRevToday - prevDayRev) / prevDayRev) * 100).toFixed(1)}%`
        : "—"

    const thisMonthRev = Number(thisMonthRevRow?.total ?? 0)
    const thisMonthExp = Number(thisMonthExpRow?.total ?? 0)
    const avgMarginPct =
      thisMonthRev > 0 ? Math.round(((thisMonthRev - thisMonthExp) / thisMonthRev) * 100) : 0

    const lastMonthRev = Number(lastMonthRevRow?.total ?? 0)
    const lastMonthExp = Number(lastMonthExpRow?.total ?? 0)
    const lastMonthMargin = lastMonthRev > 0 ? (lastMonthRev - lastMonthExp) / lastMonthRev : null
    const thisMonthMargin = thisMonthRev > 0 ? (thisMonthRev - thisMonthExp) / thisMonthRev : null
    const marginTrend =
      lastMonthMargin !== null && thisMonthMargin !== null
        ? `${thisMonthMargin >= lastMonthMargin ? "+" : ""}${((thisMonthMargin - lastMonthMargin) * 100).toFixed(1)} pp`
        : "—"

    const meta: IntelligenceMeta = {
      totalRevenueLabel: fmtAmount(totalRevToday),
      revenueTrend,
      avgMarginPct,
      marginTrend,
      ordersToday: totalOrdersToday,
      activeAlerts,
    }

    return NextResponse.json({ insights: insightList, reports: reportList, storeKpis, meta, nextCursor: null })
  }
)
