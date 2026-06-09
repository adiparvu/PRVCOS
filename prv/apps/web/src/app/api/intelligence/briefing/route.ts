import { withGates } from "@/lib/with-gates"
import { NextRequest, NextResponse } from "next/server"
import { cacheMemo } from "@prv/cache"
import type { GateContext } from "@prv/auth"
import { db } from "@prv/db"
import { users, projects, invoices, orders, attendanceRecords } from "@prv/db/schema"
import { aiInsights } from "@prv/db/schema"
import { and, count, desc, eq, gte, isNotNull, isNull, lte, sum } from "drizzle-orm"

export const dynamic = "force-dynamic"
export const runtime = "nodejs"

const TZ = "Europe/Bucharest"

function getGreeting(): string {
  const h = new Date().getHours()
  if (h < 12) return "Good morning"
  if (h < 18) return "Good afternoon"
  return "Good evening"
}

function fmtAmount(n: number): string {
  if (n >= 1_000_000) return `€${(n / 1_000_000).toFixed(1)}M`
  if (n >= 1_000) return `€${(n / 1_000).toFixed(1)}K`
  return `€${Math.round(n)}`
}

function todayStr(): string {
  return new Intl.DateTimeFormat("sv-SE", { timeZone: TZ }).format(new Date())
}

function thisMonthStart(): Date {
  const d = new Date()
  d.setDate(1)
  d.setHours(0, 0, 0, 0)
  return d
}

function prevMonthBounds(): { start: Date; end: Date } {
  const start = new Date()
  start.setMonth(start.getMonth() - 1)
  start.setDate(1)
  start.setHours(0, 0, 0, 0)
  const end = new Date()
  end.setDate(0)
  end.setHours(23, 59, 59, 999)
  return { start, end }
}

// ── GET ───────────────────────────────────────────────────────────────────────

export const GET = withGates(
  { action: "intelligence.briefing.read", endpointClass: "api_read" },
  async (_req: NextRequest, ctx: GateContext): Promise<NextResponse> => {
    const { companyId } = ctx.session

    const data = await cacheMemo(
      "ai_briefing",
      companyId,
      async () => {
        const today = todayStr()
        const monthStart = thisMonthStart()
        const { start: prevStart, end: prevEnd } = prevMonthBounds()

        const [
          [revenueThisMonth],
          [revenueLastMonth],
          [staffCountRow],
          [staffInRow],
          [activeJobsRow],
          overdueInvoices,
          alertInsights,
        ] = await Promise.all([
          db
            .select({ total: sum(orders.total) })
            .from(orders)
            .where(
              and(
                eq(orders.companyId, companyId),
                gte(orders.createdAt, monthStart),
                isNull(orders.deletedAt)
              )
            ),

          db
            .select({ total: sum(orders.total) })
            .from(orders)
            .where(
              and(
                eq(orders.companyId, companyId),
                gte(orders.createdAt, prevStart),
                lte(orders.createdAt, prevEnd),
                isNull(orders.deletedAt)
              )
            ),

          db
            .select({ cnt: count() })
            .from(users)
            .where(
              and(eq(users.companyId, companyId), eq(users.isActive, true), isNull(users.deletedAt))
            ),

          db
            .select({ cnt: count() })
            .from(attendanceRecords)
            .where(
              and(
                eq(attendanceRecords.companyId, companyId),
                eq(attendanceRecords.date, today),
                isNotNull(attendanceRecords.clockIn)
              )
            ),

          db
            .select({ cnt: count() })
            .from(projects)
            .where(
              and(
                eq(projects.companyId, companyId),
                eq(projects.status, "active"),
                isNull(projects.deletedAt)
              )
            ),

          db
            .select({
              id: invoices.id,
              total: invoices.total,
              invoiceNumber: invoices.invoiceNumber,
            })
            .from(invoices)
            .where(
              and(
                eq(invoices.companyId, companyId),
                eq(invoices.status, "overdue"),
                isNull(invoices.deletedAt)
              )
            )
            .limit(3),

          db
            .select({ id: aiInsights.id, title: aiInsights.title })
            .from(aiInsights)
            .where(
              and(
                eq(aiInsights.companyId, companyId),
                eq(aiInsights.status, "new"),
                isNull(aiInsights.deletedAt)
              )
            )
            .orderBy(desc(aiInsights.createdAt))
            .limit(3),
        ])

        const thisRev = Number(revenueThisMonth?.total ?? 0)
        const prevRev = Number(revenueLastMonth?.total ?? 0)
        const revTrend =
          prevRev > 0
            ? `${thisRev >= prevRev ? "+" : ""}${(((thisRev - prevRev) / prevRev) * 100).toFixed(1)}%`
            : "—"

        const staffTotal = staffCountRow?.cnt ?? 0
        const staffIn = staffInRow?.cnt ?? 0
        const absent = staffTotal - staffIn

        const alerts: Array<{ type: string; title: string; description: string; href: string }> = []

        if (overdueInvoices.length > 0) {
          const overdueTotal = overdueInvoices.reduce((a, i) => a + Number(i.total ?? 0), 0)
          alerts.push({
            type: "error",
            title: `${overdueInvoices.length} invoice${overdueInvoices.length > 1 ? "s" : ""} overdue`,
            description: `€${Math.round(overdueTotal).toLocaleString()} outstanding`,
            href: "/finance/invoices",
          })
        }

        for (const ins of alertInsights.slice(0, 2)) {
          alerts.push({
            type: "warning",
            title: ins.title,
            description: "AI alert — review recommended",
            href: "/intelligence",
          })
        }

        return {
          kpis: {
            revenue: {
              value: fmtAmount(thisRev),
              trend: revTrend,
              dir: thisRev >= prevRev ? "up" : "down",
            },
            profit: { value: "—", trend: "—", dir: "flat" },
            staffIn: {
              value: staffIn,
              trend: absent > 0 ? `${absent} absent` : "All present",
              dir: "flat",
            },
            activeJobs: { value: activeJobsRow?.cnt ?? 0, trend: "—", dir: "flat" },
          },
          alerts,
          recommendation: null,
        }
      },
      { ttl: 120 }
    )

    return NextResponse.json({
      greeting: getGreeting(),
      timestamp: new Date().toISOString(),
      ...data,
    })
  }
)
