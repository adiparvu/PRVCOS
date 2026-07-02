import { NextRequest, NextResponse } from "next/server"
import { withGates } from "@/lib/with-gates"
import type { GateContext } from "@prv/auth"
import { writeAuditLog } from "@prv/auth"
import { db } from "@prv/db"
import { leaveBalances, users } from "@prv/db/schema"
import { and, eq } from "drizzle-orm"
import { z } from "zod"
import { computeLeaveBalance } from "@/lib/leave-balance"

export const dynamic = "force-dynamic"
export const runtime = "nodejs"

const TYPES = ["annual", "medical", "unpaid", "other"] as const

export interface LeaveBalanceSummary {
  id: string
  userId: string
  userName: string | null
  type: (typeof TYPES)[number]
  year: number
  entitlementDays: number
  carriedOverDays: number
  accrualDaysPerMonth: number | null
  usedDays: number
  pendingDays: number
  entitlementTotal: number
  available: number
  accruedToDate: number | null
}

function num(v: string | null): number {
  const n = Number(v ?? 0)
  return Number.isFinite(n) ? n : 0
}
function currentYear(): number {
  return new Date().getUTCFullYear()
}
function monthsElapsed(year: number): number {
  const now = new Date()
  if (now.getUTCFullYear() > year) return 12
  if (now.getUTCFullYear() < year) return 0
  return now.getUTCMonth() + 1
}

// GET /api/workforce/leave/balances?userId=&year= — leave balances (per type)
// for a user, with computed available + accrued-to-date. Defaults to the
// current year; userId defaults to the caller.
export const GET = withGates(
  { action: "workforce.read", endpointClass: "api_read" },
  async (req: NextRequest, ctx: GateContext): Promise<NextResponse> => {
    const sp = req.nextUrl.searchParams
    const userId = sp.get("userId") || ctx.session.userId
    const yearRaw = sp.get("year")
    const year = yearRaw && /^\d{4}$/.test(yearRaw) ? Number(yearRaw) : currentYear()

    const rows = await db
      .select({
        id: leaveBalances.id,
        userId: leaveBalances.userId,
        type: leaveBalances.type,
        year: leaveBalances.year,
        entitlementDays: leaveBalances.entitlementDays,
        carriedOverDays: leaveBalances.carriedOverDays,
        accrualDaysPerMonth: leaveBalances.accrualDaysPerMonth,
        usedDays: leaveBalances.usedDays,
        pendingDays: leaveBalances.pendingDays,
        firstName: users.firstName,
        lastName: users.lastName,
      })
      .from(leaveBalances)
      .leftJoin(users, eq(leaveBalances.userId, users.id))
      .where(
        and(
          eq(leaveBalances.companyId, ctx.session.companyId),
          eq(leaveBalances.userId, userId),
          eq(leaveBalances.year, year)
        )
      )

    const months = monthsElapsed(year)
    const balances: LeaveBalanceSummary[] = rows.map((r) => {
      const entitlementDays = num(r.entitlementDays)
      const carriedOverDays = num(r.carriedOverDays)
      const usedDays = num(r.usedDays)
      const pendingDays = num(r.pendingDays)
      const accrualDaysPerMonth = r.accrualDaysPerMonth == null ? null : num(r.accrualDaysPerMonth)
      const computed = computeLeaveBalance({
        entitlementDays,
        carriedOverDays,
        usedDays,
        pendingDays,
        accrualDaysPerMonth,
        monthsElapsed: months,
      })
      return {
        id: r.id,
        userId: r.userId,
        userName: r.firstName ? `${r.firstName} ${r.lastName}`.trim() : null,
        type: r.type as (typeof TYPES)[number],
        year: r.year,
        entitlementDays,
        carriedOverDays,
        accrualDaysPerMonth,
        usedDays,
        pendingDays,
        entitlementTotal: computed.entitlementTotal,
        available: computed.available,
        accruedToDate: computed.accruedToDate,
      }
    })

    balances.sort((a, b) => TYPES.indexOf(a.type) - TYPES.indexOf(b.type))
    return NextResponse.json({ balances, year })
  }
)

// POST /api/workforce/leave/balances — upsert a user's balance for a type/year
// (manager action: set entitlement / carried-over / accrual).
const postSchema = z.object({
  userId: z.string().uuid(),
  type: z.enum(TYPES),
  year: z.number().int().min(2000).max(2100),
  entitlementDays: z.number().min(0).max(400),
  carriedOverDays: z.number().min(0).max(400).optional(),
  accrualDaysPerMonth: z.number().min(0).max(31).nullable().optional(),
})

export const POST = withGates(
  { action: "workforce.write", endpointClass: "api_write" },
  async (req: NextRequest, ctx: GateContext): Promise<NextResponse> => {
    const { companyId, userId: actorId, sessionId } = ctx.session

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

    const [record] = await db
      .insert(leaveBalances)
      .values({
        companyId,
        userId: d.userId,
        type: d.type,
        year: d.year,
        entitlementDays: d.entitlementDays.toFixed(2),
        carriedOverDays: (d.carriedOverDays ?? 0).toFixed(2),
        accrualDaysPerMonth:
          d.accrualDaysPerMonth != null ? d.accrualDaysPerMonth.toFixed(2) : null,
      })
      .onConflictDoUpdate({
        target: [leaveBalances.userId, leaveBalances.type, leaveBalances.year],
        set: {
          entitlementDays: d.entitlementDays.toFixed(2),
          carriedOverDays: (d.carriedOverDays ?? 0).toFixed(2),
          accrualDaysPerMonth:
            d.accrualDaysPerMonth != null ? d.accrualDaysPerMonth.toFixed(2) : null,
          updatedAt: new Date(),
        },
      })
      .returning({ id: leaveBalances.id })

    void writeAuditLog({
      companyId,
      actorId,
      sessionId,
      action: "workforce.leave.balance.upsert",
      entityType: "leave_balance",
      entityId: record?.id ?? d.userId,
      payload: { userId: d.userId, type: d.type, year: d.year },
      method: "POST",
      path: "/api/workforce/leave/balances",
      ipAddress: ctx.ipAddress,
      userAgent: ctx.userAgent,
    })

    return NextResponse.json({ id: record?.id }, { status: 201 })
  }
)
