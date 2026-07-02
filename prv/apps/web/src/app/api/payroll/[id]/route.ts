import { withGates } from "@/lib/with-gates"
import { NextRequest, NextResponse } from "next/server"
import type { GateContext } from "@prv/auth"
import { writeAuditLog } from "@prv/auth"
import { db } from "@prv/db"
import { payrollRuns, payrollItems, users } from "@prv/db/schema"
import { and, eq, desc } from "drizzle-orm"
import { z } from "zod"
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
  return `${run.employeeCount} employees · ${fmt(run.periodStart)}–${fmt(run.periodEnd)}`
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

    // Line items drive the cost breakdown + the top-earner list.
    const itemRows = await db
      .select({
        userId: payrollItems.userId,
        baseAmount: payrollItems.baseAmount,
        overtimeAmount: payrollItems.overtimeAmount,
        bonusAmount: payrollItems.bonusAmount,
        allowanceAmount: payrollItems.allowanceAmount,
        deductionAmount: payrollItems.deductionAmount,
        netAmount: payrollItems.netAmount,
        firstName: users.firstName,
        lastName: users.lastName,
        jobTitle: users.jobTitle,
      })
      .from(payrollItems)
      .leftJoin(users, eq(payrollItems.userId, users.id))
      .where(eq(payrollItems.runId, id))
      .orderBy(desc(payrollItems.netAmount))

    const num = (v: string | null) => {
      const x = Number(v ?? 0)
      return Number.isFinite(x) ? x : 0
    }
    const sum = (pick: (r: (typeof itemRows)[number]) => string | null) =>
      Math.round(itemRows.reduce((a, r) => a + num(pick(r)), 0) * 100) / 100

    const breakdown: CostEntry[] = itemRows.length
      ? [
          { label: "Base", amount: sum((r) => r.baseAmount), color: null, isTotal: false },
          { label: "Overtime", amount: sum((r) => r.overtimeAmount), color: null, isTotal: false },
          { label: "Bonuses", amount: sum((r) => r.bonusAmount), color: null, isTotal: false },
          {
            label: "Allowances",
            amount: sum((r) => r.allowanceAmount),
            color: null,
            isTotal: false,
          },
          {
            label: "Deductions",
            amount: -sum((r) => r.deductionAmount),
            color: null,
            isTotal: false,
          },
          { label: "Net pay", amount: sum((r) => r.netAmount), color: null, isTotal: true },
        ]
      : []

    const topEmployees: TopEmployee[] = itemRows.slice(0, 5).map((r) => {
      const name = r.firstName ? `${r.firstName} ${r.lastName}`.trim() : "—"
      const parts = name.split(/\s+/)
      return {
        id: r.userId,
        initials: ((parts[0]?.[0] ?? "") + (parts[1]?.[0] ?? "")).toUpperCase() || "?",
        name,
        role: r.jobTitle ?? "",
        net: num(r.netAmount),
        hasOT: num(r.overtimeAmount) > 0,
        avatarBg: "var(--prv-g2)",
        avatarColor: "var(--prv-text-1)",
      }
    })

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
        breakdown,
        topEmployees,
      },
    })
  }
)

// ─── Exported pure helpers ────────────────────────────────────────────────────

export type PayrollAction = "start_processing" | "mark_done"

export const PAYROLL_REQUIRED_STATUS: Record<PayrollAction, string> = {
  start_processing: "pending",
  mark_done: "processing",
}

export const PAYROLL_NEXT_STATUS: Record<PayrollAction, string> = {
  start_processing: "processing",
  mark_done: "done",
}

export function isValidPayrollTransition(action: PayrollAction, currentStatus: string): boolean {
  return PAYROLL_REQUIRED_STATUS[action] === currentStatus
}

// ─── PATCH /api/payroll/[id] ──────────────────────────────────────────────────

const patchSchema = z.discriminatedUnion("action", [
  z.object({ action: z.literal("start_processing"), notes: z.string().max(500).optional() }),
  z.object({ action: z.literal("mark_done"), notes: z.string().max(500).optional() }),
])

export const PATCH = withGates(
  { action: "payroll.approve", endpointClass: "api_write" },
  async (req: NextRequest, ctx: GateContext): Promise<NextResponse> => {
    const { companyId } = ctx.session
    const id = req.nextUrl.pathname.split("/").pop()
    if (!id) return NextResponse.json({ error: "Missing id" }, { status: 400 })

    const raw = await req.json().catch(() => ({}))
    const parsed = patchSchema.safeParse(raw)
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid payload", issues: parsed.error.issues },
        { status: 422 }
      )
    }

    const [existing] = await db
      .select({ id: payrollRuns.id, status: payrollRuns.status, ref: payrollRuns.ref })
      .from(payrollRuns)
      .where(and(eq(payrollRuns.id, id), eq(payrollRuns.companyId, companyId)))
      .limit(1)

    if (!existing) return NextResponse.json({ error: "Not found" }, { status: 404 })

    if (!isValidPayrollTransition(parsed.data.action, existing.status)) {
      return NextResponse.json(
        { error: `Cannot apply '${parsed.data.action}' — current status is '${existing.status}'` },
        { status: 409 }
      )
    }

    const nextStatus = PAYROLL_NEXT_STATUS[parsed.data.action] as "processing" | "done" | "pending"

    const [updated] = await db
      .update(payrollRuns)
      .set({
        status: nextStatus,
        ...(parsed.data.notes !== undefined ? { notes: parsed.data.notes } : {}),
        updatedAt: new Date(),
      })
      .where(and(eq(payrollRuns.id, id), eq(payrollRuns.companyId, companyId)))
      .returning({ id: payrollRuns.id, status: payrollRuns.status })

    void writeAuditLog({
      companyId,
      actorId: ctx.session.userId,
      sessionId: ctx.session.sessionId,
      action: "payroll.approve",
      entityType: "payroll_run",
      entityId: id,
      payload: { ref: existing.ref, from: existing.status, to: nextStatus, op: parsed.data.action },
      method: "PATCH",
      path: `/api/payroll/${id}`,
      ipAddress: ctx.ipAddress,
      userAgent: ctx.userAgent,
    })

    return NextResponse.json(updated)
  }
)
