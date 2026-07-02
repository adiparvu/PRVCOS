import { NextRequest, NextResponse } from "next/server"
import { withGates } from "@/lib/with-gates"
import type { GateContext } from "@prv/auth"
import { writeAuditLog } from "@prv/auth"
import { db } from "@prv/db"
import { payrollRuns, payrollItems, users } from "@prv/db/schema"
import { and, eq } from "drizzle-orm"
import { z } from "zod"
import { computePayslip } from "@/lib/payslip"
import { recomputeRunTotals } from "@/lib/payroll-recompute"

export const dynamic = "force-dynamic"
export const runtime = "nodejs"

export interface PayrollItem {
  id: string
  userId: string
  userName: string | null
  jobTitle: string | null
  baseAmount: number
  overtimeHours: number
  overtimeAmount: number
  bonusAmount: number
  allowanceAmount: number
  deductionAmount: number
  grossAmount: number
  netAmount: number
  currency: string
}

export interface PayrollItemsTotals {
  employeeCount: number
  totalBase: number
  totalOvertime: number
  totalBonus: number
  totalAllowance: number
  totalDeduction: number
  totalGross: number
  totalNet: number
}

function runId(req: NextRequest): string {
  return req.nextUrl.pathname.split("/").at(-2) ?? ""
}
function n(v: string | null): number {
  const x = Number(v ?? 0)
  return Number.isFinite(x) ? x : 0
}

async function verifyRun(id: string, companyId: string) {
  const [row] = await db
    .select({ id: payrollRuns.id })
    .from(payrollRuns)
    .where(and(eq(payrollRuns.id, id), eq(payrollRuns.companyId, companyId)))
    .limit(1)
  return row ?? null
}

// GET /api/payroll/[id]/items — the run's payslip register (one line per
// employee) with a totals summary.
export const GET = withGates(
  { action: "payroll.read", endpointClass: "api_read" },
  async (req: NextRequest, ctx: GateContext): Promise<NextResponse> => {
    const id = runId(req)
    if (!id) return NextResponse.json({ error: "Missing id" }, { status: 400 })

    const run = await verifyRun(id, ctx.session.companyId)
    if (!run) return NextResponse.json({ error: "Run not found" }, { status: 404 })

    const rows = await db
      .select({
        id: payrollItems.id,
        userId: payrollItems.userId,
        baseAmount: payrollItems.baseAmount,
        overtimeHours: payrollItems.overtimeHours,
        overtimeAmount: payrollItems.overtimeAmount,
        bonusAmount: payrollItems.bonusAmount,
        allowanceAmount: payrollItems.allowanceAmount,
        deductionAmount: payrollItems.deductionAmount,
        grossAmount: payrollItems.grossAmount,
        netAmount: payrollItems.netAmount,
        currency: payrollItems.currency,
        firstName: users.firstName,
        lastName: users.lastName,
        jobTitle: users.jobTitle,
      })
      .from(payrollItems)
      .leftJoin(users, eq(payrollItems.userId, users.id))
      .where(eq(payrollItems.runId, id))

    const items: PayrollItem[] = rows.map((r) => ({
      id: r.id,
      userId: r.userId,
      userName: r.firstName ? `${r.firstName} ${r.lastName}`.trim() : null,
      jobTitle: r.jobTitle,
      baseAmount: n(r.baseAmount),
      overtimeHours: n(r.overtimeHours),
      overtimeAmount: n(r.overtimeAmount),
      bonusAmount: n(r.bonusAmount),
      allowanceAmount: n(r.allowanceAmount),
      deductionAmount: n(r.deductionAmount),
      grossAmount: n(r.grossAmount),
      netAmount: n(r.netAmount),
      currency: r.currency,
    }))
    items.sort((a, b) => b.netAmount - a.netAmount)

    const totals: PayrollItemsTotals = {
      employeeCount: items.length,
      totalBase: round(items.reduce((s, i) => s + i.baseAmount, 0)),
      totalOvertime: round(items.reduce((s, i) => s + i.overtimeAmount, 0)),
      totalBonus: round(items.reduce((s, i) => s + i.bonusAmount, 0)),
      totalAllowance: round(items.reduce((s, i) => s + i.allowanceAmount, 0)),
      totalDeduction: round(items.reduce((s, i) => s + i.deductionAmount, 0)),
      totalGross: round(items.reduce((s, i) => s + i.grossAmount, 0)),
      totalNet: round(items.reduce((s, i) => s + i.netAmount, 0)),
    }

    return NextResponse.json({ items, totals })
  }
)

function round(x: number): number {
  return Math.round(x * 100) / 100
}

// POST /api/payroll/[id]/items — upsert an employee's payslip line. Gross/net
// are computed; run header totals are recomputed afterwards.
const postSchema = z.object({
  userId: z.string().uuid(),
  baseAmount: z.number().min(0).max(100_000_000).default(0),
  overtimeHours: z.number().min(0).max(1000).default(0),
  overtimeAmount: z.number().min(0).max(100_000_000).default(0),
  bonusAmount: z.number().min(0).max(100_000_000).default(0),
  allowanceAmount: z.number().min(0).max(100_000_000).default(0),
  deductionAmount: z.number().min(0).max(100_000_000).default(0),
  currency: z.string().min(3).max(3).default("RON"),
  notes: z.string().max(2000).nullable().optional(),
})

export const POST = withGates(
  { action: "payroll.runs.create", endpointClass: "api_write" },
  async (req: NextRequest, ctx: GateContext): Promise<NextResponse> => {
    const id = runId(req)
    if (!id) return NextResponse.json({ error: "Missing id" }, { status: 400 })

    const { companyId, userId: actorId, sessionId } = ctx.session
    const run = await verifyRun(id, companyId)
    if (!run) return NextResponse.json({ error: "Run not found" }, { status: 404 })

    let raw: unknown
    try {
      raw = await req.json()
    } catch {
      return NextResponse.json({ error: "Invalid JSON" }, { status: 400 })
    }

    const parsed = postSchema.safeParse(raw)
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.flatten() }, { status: 422 })
    }
    const d = parsed.data
    const { gross, net } = computePayslip(d)

    const [record] = await db
      .insert(payrollItems)
      .values({
        companyId,
        runId: id,
        userId: d.userId,
        baseAmount: d.baseAmount.toFixed(2),
        overtimeHours: d.overtimeHours.toFixed(2),
        overtimeAmount: d.overtimeAmount.toFixed(2),
        bonusAmount: d.bonusAmount.toFixed(2),
        allowanceAmount: d.allowanceAmount.toFixed(2),
        deductionAmount: d.deductionAmount.toFixed(2),
        grossAmount: gross.toFixed(2),
        netAmount: net.toFixed(2),
        currency: d.currency,
        notes: d.notes ?? null,
      })
      .onConflictDoUpdate({
        target: [payrollItems.runId, payrollItems.userId],
        set: {
          baseAmount: d.baseAmount.toFixed(2),
          overtimeHours: d.overtimeHours.toFixed(2),
          overtimeAmount: d.overtimeAmount.toFixed(2),
          bonusAmount: d.bonusAmount.toFixed(2),
          allowanceAmount: d.allowanceAmount.toFixed(2),
          deductionAmount: d.deductionAmount.toFixed(2),
          grossAmount: gross.toFixed(2),
          netAmount: net.toFixed(2),
          currency: d.currency,
          notes: d.notes ?? null,
          updatedAt: new Date(),
        },
      })
      .returning({ id: payrollItems.id })

    await recomputeRunTotals(id, companyId)

    void writeAuditLog({
      companyId,
      actorId,
      sessionId,
      action: "payroll.item.upsert",
      entityType: "payroll_item",
      entityId: record?.id ?? d.userId,
      payload: { runId: id, userId: d.userId, gross, net },
      method: "POST",
      path: `/api/payroll/${id}/items`,
      ipAddress: ctx.ipAddress,
      userAgent: ctx.userAgent,
    })

    return NextResponse.json({ id: record?.id, gross, net }, { status: 201 })
  }
)
