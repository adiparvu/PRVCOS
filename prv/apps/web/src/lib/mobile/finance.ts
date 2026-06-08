import { db } from "@prv/db"
import { orders, invoices, clients } from "@prv/db/schema"
import { eq, and, gte, lt, inArray, not, count, isNull, desc, sql, avg } from "drizzle-orm"
import type { MobileContext } from "./auth"
import type { FinanceData, FinanceOrderItem, FinanceInvoiceItem, DayRevenue } from "./types"

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

// ─── Main assembly ────────────────────────────────────────────────────────────

export async function assembleFinance(ctx: MobileContext): Promise<FinanceData> {
  const now = new Date()
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1)
  const lastMonthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1)
  const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)

  const cancelledStatuses = ["cancelled", "refunded"] as const

  const [
    thisMonthRevRow,
    lastMonthRevRow,
    thisMonthCountRow,
    thisMonthAvgRow,
    dailyRevenueRows,
    recentOrderRows,
    outstandingRow,
    overdueRow,
    paidMtdRow,
    draftCountRow,
    invoiceRows,
  ] = await Promise.all([
    // Revenue this month
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

    // Revenue last month (for delta)
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

    // Orders count this month
    db
      .select({ total: count() })
      .from(orders)
      .where(
        and(
          eq(orders.companyId, ctx.companyId),
          gte(orders.createdAt, monthStart),
          not(inArray(orders.status, [...cancelledStatuses])),
          isNull(orders.deletedAt)
        )
      ),

    // Average order value this month
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

    // Daily revenue last 7 days
    db
      .select({
        day: sql<string>`DATE(${orders.createdAt})`,
        revenue: sql<string>`COALESCE(SUM(${orders.total}), '0')`,
      })
      .from(orders)
      .where(
        and(
          eq(orders.companyId, ctx.companyId),
          gte(orders.createdAt, sevenDaysAgo),
          not(inArray(orders.status, [...cancelledStatuses])),
          isNull(orders.deletedAt)
        )
      )
      .groupBy(sql`DATE(${orders.createdAt})`)
      .orderBy(sql`DATE(${orders.createdAt}) ASC`),

    // Recent orders (last 8)
    db
      .select({
        id: orders.id,
        orderNumber: orders.orderNumber,
        status: orders.status,
        total: orders.total,
        currency: orders.currency,
        createdAt: orders.createdAt,
      })
      .from(orders)
      .where(and(eq(orders.companyId, ctx.companyId), isNull(orders.deletedAt)))
      .orderBy(desc(orders.createdAt))
      .limit(8),

    // Outstanding invoices (sent + overdue)
    db
      .select({ total: sql<string>`COALESCE(SUM(${invoices.total}), '0')` })
      .from(invoices)
      .where(
        and(
          eq(invoices.companyId, ctx.companyId),
          inArray(invoices.status, ["sent", "overdue"]),
          isNull(invoices.deletedAt)
        )
      ),

    // Overdue invoices count + amount
    db
      .select({
        cnt: count(),
        total: sql<string>`COALESCE(SUM(${invoices.total}), '0')`,
      })
      .from(invoices)
      .where(
        and(
          eq(invoices.companyId, ctx.companyId),
          eq(invoices.status, "overdue"),
          isNull(invoices.deletedAt)
        )
      ),

    // Paid this month amount
    db
      .select({ total: sql<string>`COALESCE(SUM(${invoices.total}), '0')` })
      .from(invoices)
      .where(
        and(
          eq(invoices.companyId, ctx.companyId),
          eq(invoices.status, "paid"),
          gte(invoices.paidAt, monthStart),
          isNull(invoices.deletedAt)
        )
      ),

    // Draft invoices count
    db
      .select({ total: count() })
      .from(invoices)
      .where(
        and(
          eq(invoices.companyId, ctx.companyId),
          eq(invoices.status, "draft"),
          isNull(invoices.deletedAt)
        )
      ),

    // Invoice list (newest first, overdue priority)
    db
      .select({
        id: invoices.id,
        invoiceNumber: invoices.invoiceNumber,
        clientName: clients.name,
        status: invoices.status,
        total: invoices.total,
        currency: invoices.currency,
        dueDate: invoices.dueDate,
        paidAt: invoices.paidAt,
      })
      .from(invoices)
      .leftJoin(clients, eq(invoices.clientId, clients.id))
      .where(and(eq(invoices.companyId, ctx.companyId), isNull(invoices.deletedAt)))
      .orderBy(
        sql`CASE
          WHEN ${invoices.status} = 'overdue' THEN 1
          WHEN ${invoices.status} = 'sent' THEN 2
          WHEN ${invoices.status} = 'draft' THEN 3
          WHEN ${invoices.status} = 'paid' THEN 4
          ELSE 5
        END`,
        invoices.dueDate
      )
      .limit(12),
  ])

  // ── Revenue KPIs ────────────────────────────────────────────────────────────

  const thisMonth = parseMoney(thisMonthRevRow[0]?.total)
  const lastMonth = parseMoney(lastMonthRevRow[0]?.total)
  const deltaPercent =
    lastMonth > 0 ? Math.round(((thisMonth - lastMonth) / lastMonth) * 100) : null
  const profitEstimate = thisMonth * 0.25
  const ordersCount = thisMonthCountRow[0]?.total ?? 0
  const avgOrderValue = parseMoney(thisMonthAvgRow[0]?.avg)

  // ── Daily revenue (fill missing days) ──────────────────────────────────────

  const dailyMap = new Map(dailyRevenueRows.map((r) => [r.day, parseMoney(r.revenue)]))
  const dailyRevenue: DayRevenue[] = []
  for (let i = 6; i >= 0; i--) {
    const d = new Date(now)
    d.setDate(d.getDate() - i)
    const dateStr = d.toISOString().slice(0, 10)
    dailyRevenue.push({ date: dateStr, total: dailyMap.get(dateStr) ?? 0 })
  }

  // ── Recent orders ───────────────────────────────────────────────────────────

  const recentOrders: FinanceOrderItem[] = recentOrderRows.map((o) => ({
    id: o.id,
    orderNumber: o.orderNumber,
    status: o.status,
    amount: formatCurrency(parseMoney(String(o.total)), o.currency),
    createdAt: o.createdAt?.toISOString() ?? new Date().toISOString(),
  }))

  // ── Invoice KPIs ─────────────────────────────────────────────────────────────

  const outstanding = parseMoney(outstandingRow[0]?.total)
  const overdueCount = overdueRow[0]?.cnt ?? 0
  const overdueAmount = parseMoney(overdueRow[0]?.total)
  const paidMtd = parseMoney(paidMtdRow[0]?.total)
  const draftCount = draftCountRow[0]?.total ?? 0

  // ── Invoice list ─────────────────────────────────────────────────────────────

  const invoiceList: FinanceInvoiceItem[] = invoiceRows.map((inv) => ({
    id: inv.id,
    invoiceNumber: inv.invoiceNumber,
    clientName: inv.clientName ?? null,
    status: inv.status,
    amount: formatCurrency(parseMoney(String(inv.total)), inv.currency),
    currency: inv.currency,
    dueDate: inv.dueDate ?? null,
    paidAt: inv.paidAt ? inv.paidAt.toISOString() : null,
  }))

  return {
    revenueKpi: {
      thisMonth: formatCurrency(thisMonth),
      profitEstimate: formatCurrency(profitEstimate),
      ordersCount,
      avgOrderValue: formatCurrency(avgOrderValue),
      deltaPercent,
    },
    dailyRevenue,
    recentOrders,
    invoicesKpi: {
      outstanding: formatCurrency(outstanding),
      overdueCount,
      overdueAmount: formatCurrency(overdueAmount),
      paidMtd: formatCurrency(paidMtd),
      draftCount,
    },
    invoices: invoiceList,
  }
}
