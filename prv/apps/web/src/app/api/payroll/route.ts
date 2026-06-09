import { withGates } from "@/lib/with-gates"
import { NextRequest, NextResponse } from "next/server"
import type { GateContext } from "@prv/auth"
import { db } from "@prv/db"
import { payrollRuns, users } from "@prv/db/schema"
import { and, count, desc, eq, gte, lt, lte, sum } from "drizzle-orm"

export const dynamic = "force-dynamic"
export const runtime = "nodejs"

export type PayrollRunStatus = "processing" | "done" | "pending"
export type PayrollRunType = "weekly" | "monthly" | "special"

export interface PayrollRun {
  id: string
  title: string
  subtitle: string
  period: string
  employeeCount: number
  totalGross: number
  netPaid: number
  status: PayrollRunStatus
  type: PayrollRunType
  ref: string
}

export interface PayrollMeta {
  currentRunAmount: number
  totalEmployees: number
  pendingCount: number
  ytdCost: number
  monthLabel: string
  growthPct: number
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

function currentMonthLabel(): string {
  const now = new Date()
  return `${MONTH_LABELS[now.getMonth()]} ${now.getFullYear()}`
}

function buildSubtitle(run: {
  employeeCount: number
  periodStart: string
  periodEnd: string
}): string {
  const fmt = (d: string) => {
    const dt = new Date(d + "T12:00:00Z")
    return `${dt.getUTCDate()} ${MONTH_LABELS[dt.getUTCMonth()]}`
  }
  return `${run.employeeCount} angajați · ${fmt(run.periodStart)}–${fmt(run.periodEnd)}`
}

function buildPeriod(periodStart: string, periodEnd: string): string {
  const fmt = (d: string) => {
    const dt = new Date(d + "T12:00:00Z")
    return `${dt.getUTCDate()} ${MONTH_LABELS[dt.getUTCMonth()]} ${dt.getUTCFullYear()}`
  }
  return `${fmt(periodStart)}–${fmt(periodEnd)}`
}

// ── GET ───────────────────────────────────────────────────────────────────────

export const GET = withGates(
  { action: "payroll.read", endpointClass: "api_read" },
  async (req: NextRequest, ctx: GateContext): Promise<NextResponse> => {
    const typeFilter = req.nextUrl.searchParams.get("type") as PayrollRunType | null
    const cursor = req.nextUrl.searchParams.get("cursor")
    const limit = Math.min(parseInt(req.nextUrl.searchParams.get("limit") ?? "50", 10), 200)
    const { companyId } = ctx.session

    const now = new Date()
    const thisMonthStartStr = `${now.getUTCFullYear()}-${String(now.getUTCMonth() + 1).padStart(2, "0")}-01`
    const lastMonthDate = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - 1, 1))
    const lastMonthStartStr = `${lastMonthDate.getUTCFullYear()}-${String(lastMonthDate.getUTCMonth() + 1).padStart(2, "0")}-01`
    const todayStr = now.toISOString().slice(0, 10)

    const runConditions = [eq(payrollRuns.companyId, companyId)]
    if (typeFilter) runConditions.push(eq(payrollRuns.type, typeFilter))
    if (cursor) runConditions.push(lt(payrollRuns.createdAt, new Date(cursor)))
    const whereClause = and(...runConditions)

    // 1. Fetch runs + active employee count + month totals + all-runs meta in parallel
    const [rows, [employeeRow], [thisMonthPayRow], [lastMonthPayRow], allRunsMeta] =
      await Promise.all([
      db
        .select({
          id: payrollRuns.id,
          ref: payrollRuns.ref,
          title: payrollRuns.title,
          periodStart: payrollRuns.periodStart,
          periodEnd: payrollRuns.periodEnd,
          employeeCount: payrollRuns.employeeCount,
          totalGross: payrollRuns.totalGross,
          netPaid: payrollRuns.netPaid,
          status: payrollRuns.status,
          type: payrollRuns.type,
          createdAt: payrollRuns.createdAt,
        })
        .from(payrollRuns)
        .where(whereClause)
        .orderBy(desc(payrollRuns.createdAt))
        .limit(limit + 1),

      db
        .select({ cnt: count() })
        .from(users)
        .where(and(eq(users.companyId, companyId), eq(users.isActive, true))),

      db
        .select({ total: sum(payrollRuns.totalGross) })
        .from(payrollRuns)
        .where(
          and(
            eq(payrollRuns.companyId, companyId),
            eq(payrollRuns.status, "done"),
            gte(payrollRuns.periodEnd, thisMonthStartStr),
            lte(payrollRuns.periodEnd, todayStr)
          )
        ),

      db
        .select({ total: sum(payrollRuns.totalGross) })
        .from(payrollRuns)
        .where(
          and(
            eq(payrollRuns.companyId, companyId),
            eq(payrollRuns.status, "done"),
            gte(payrollRuns.periodEnd, lastMonthStartStr),
            lt(payrollRuns.periodEnd, thisMonthStartStr)
          )
        ),

      db
        .select({ status: payrollRuns.status, totalGross: payrollRuns.totalGross })
        .from(payrollRuns)
        .where(eq(payrollRuns.companyId, companyId)),
    ])

    const hasMore = rows.length > limit
    const pageRows = hasMore ? rows.slice(0, limit) : rows
    const nextCursor =
      hasMore && pageRows.length > 0
        ? pageRows[pageRows.length - 1]!.createdAt.toISOString()
        : null

    const result: PayrollRun[] = pageRows.map((r) => ({
      id: r.id,
      ref: r.ref,
      title: r.title,
      subtitle: buildSubtitle({
        employeeCount: r.employeeCount,
        periodStart: r.periodStart,
        periodEnd: r.periodEnd,
      }),
      period: buildPeriod(r.periodStart, r.periodEnd),
      employeeCount: r.employeeCount,
      totalGross: Number(r.totalGross),
      netPaid: Number(r.netPaid),
      status: r.status as PayrollRunStatus,
      type: r.type as PayrollRunType,
    }))

    // 2. Compute meta from all runs (unfiltered, unpaginated)
    const processingRun = pageRows.find((r) => r.status === "processing")
    const pendingCount = allRunsMeta.filter((r) => r.status === "pending").length
    const ytdCost = allRunsMeta.reduce((s, r) => s + Number(r.totalGross), 0)

    const thisMonthPay = Number(thisMonthPayRow?.total ?? 0)
    const lastMonthPay = Number(lastMonthPayRow?.total ?? 0)
    const growthPct =
      lastMonthPay > 0 ? Math.round(((thisMonthPay - lastMonthPay) / lastMonthPay) * 1000) / 10 : 0

    const meta: PayrollMeta = {
      currentRunAmount: processingRun ? Number(processingRun.totalGross) : 0,
      totalEmployees: employeeRow?.cnt ?? 0,
      pendingCount,
      ytdCost,
      monthLabel: currentMonthLabel(),
      growthPct,
    }

    return NextResponse.json({ runs: result, count: result.length, meta, nextCursor })
  }
)
