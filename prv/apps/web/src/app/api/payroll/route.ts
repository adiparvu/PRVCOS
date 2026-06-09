import { withGates } from "@/lib/with-gates"
import { NextRequest, NextResponse } from "next/server"
import type { GateContext } from "@prv/auth"
import { db } from "@prv/db"
import { payrollRuns, users } from "@prv/db/schema"
import { and, count, desc, eq, sum } from "drizzle-orm"

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
    const { companyId } = ctx.session

    const whereClause = typeFilter
      ? and(eq(payrollRuns.companyId, companyId), eq(payrollRuns.type, typeFilter))
      : eq(payrollRuns.companyId, companyId)

    // 1. Fetch runs + active employee count in parallel
    const [rows, [employeeRow]] = await Promise.all([
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
        })
        .from(payrollRuns)
        .where(whereClause)
        .orderBy(desc(payrollRuns.createdAt)),

      db
        .select({ cnt: count() })
        .from(users)
        .where(and(eq(users.companyId, companyId), eq(users.isActive, true))),
    ])

    const result: PayrollRun[] = rows.map((r) => ({
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

    // 2. Compute meta from all runs (unfiltered)
    const allRows = typeFilter
      ? await db
          .select({
            status: payrollRuns.status,
            totalGross: payrollRuns.totalGross,
          })
          .from(payrollRuns)
          .where(eq(payrollRuns.companyId, companyId))
      : rows.map((r) => ({ status: r.status, totalGross: r.totalGross }))

    const processingRun = rows.find((r) => r.status === "processing")
    const pendingCount = allRows.filter((r) => r.status === "pending").length
    const ytdCost = allRows.reduce((s, r) => s + Number(r.totalGross), 0)

    const meta: PayrollMeta = {
      currentRunAmount: processingRun ? Number(processingRun.totalGross) : 0,
      totalEmployees: employeeRow?.cnt ?? 0,
      pendingCount,
      ytdCost,
      monthLabel: currentMonthLabel(),
      growthPct: 0,
    }

    return NextResponse.json({ runs: result, count: result.length, meta })
  }
)
