import { withGates } from "@/lib/with-gates"
import { NextRequest, NextResponse } from "next/server"
import type { GateContext } from "@prv/auth"
import { db } from "@prv/db"
import { payrollRuns } from "@prv/db/schema"
import { and, eq } from "drizzle-orm"
import type { PayrollRunStatus, PayrollRunType } from "../route"

export const dynamic = "force-dynamic"
export const runtime = "nodejs"

export interface CostEntry {
  label: string
  amount: number
  color: string | null
  isTotal: boolean
}

export interface TopEmployee {
  id: string
  initials: string
  name: string
  role: string
  net: number
  hasOT: boolean
  avatarBg: string
  avatarColor: string
}

export interface PayrollRunDetail {
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
  breakdown: CostEntry[]
  topEmployees: TopEmployee[]
  initiatedBy: string
  processingDate: string
  estimatedPayDate: string
  paymentMethod: string
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
    const { companyId } = ctx.session
    const id = req.nextUrl.pathname.split("/").pop()
    if (!id) return NextResponse.json({ error: "Missing id" }, { status: 400 })

    const [row] = await db
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
        notes: payrollRuns.notes,
      })
      .from(payrollRuns)
      .where(and(eq(payrollRuns.id, id), eq(payrollRuns.companyId, companyId)))
      .limit(1)

    if (!row) return NextResponse.json({ error: "Not found" }, { status: 404 })

    const periodStart = String(row.periodStart).slice(0, 10)
    const periodEnd = String(row.periodEnd).slice(0, 10)

    return NextResponse.json({
      run: {
        id: row.id,
        ref: row.ref,
        title: row.title,
        subtitle: buildSubtitle({ employeeCount: row.employeeCount ?? 0, periodStart, periodEnd }),
        period: buildPeriod(periodStart, periodEnd),
        employeeCount: row.employeeCount ?? 0,
        totalGross: row.totalGross ? Number(row.totalGross) : 0,
        netPaid: row.netPaid ? Number(row.netPaid) : 0,
        status: row.status as PayrollRunStatus,
        type: row.type as PayrollRunType,
        notes: row.notes ?? null,
      },
    })
  }
)
