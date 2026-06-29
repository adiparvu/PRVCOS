import { withGates } from "@/lib/with-gates"
import { NextRequest, NextResponse } from "next/server"
import { and, eq, isNull } from "drizzle-orm"
import { db } from "@prv/db"
import { users, stores } from "@prv/db/schema"
import type { GateContext } from "@prv/auth"

export const dynamic = "force-dynamic"
export const runtime = "nodejs"

export interface PayrollEmployeeRow {
  id: string
  initials: string
  name: string
  role: string
  location: string
  weeklyGross: number
}

// Derive a weekly gross figure from the stored pay basis.
function toWeeklyGross(payType: string | null, payRate: string | null): number {
  if (!payType || payRate == null) return 0
  const r = Number(payRate)
  if (Number.isNaN(r)) return 0
  if (payType === "hourly") return Math.round(r * 40)
  if (payType === "monthly") return Math.round((r * 12) / 52)
  if (payType === "annual") return Math.round(r / 52)
  return 0
}

// GET /api/payroll/employees — active employees with their weekly gross pay.
// Compensation is sensitive, so this is gated with the payroll read permission.
export const GET = withGates(
  { action: "payroll.read", endpointClass: "api_read" },
  async (_req: NextRequest, ctx: GateContext): Promise<NextResponse> => {
    const rows = await db
      .select({
        id: users.id,
        firstName: users.firstName,
        lastName: users.lastName,
        jobTitle: users.jobTitle,
        payType: users.payType,
        payRate: users.payRate,
        storeName: stores.name,
        storeCity: stores.city,
      })
      .from(users)
      .leftJoin(stores, eq(users.storeId, stores.id))
      .where(
        and(
          eq(users.companyId, ctx.session.companyId),
          eq(users.isActive, true),
          isNull(users.deletedAt)
        )
      )
      .orderBy(users.firstName)

    const employees: PayrollEmployeeRow[] = rows.map((r) => ({
      id: r.id,
      initials: `${r.firstName.charAt(0)}${r.lastName.charAt(0)}`.toUpperCase(),
      name: `${r.firstName} ${r.lastName}`,
      role: r.jobTitle ?? "—",
      location: r.storeCity ?? r.storeName ?? "—",
      weeklyGross: toWeeklyGross(r.payType, r.payRate),
    }))

    return NextResponse.json({ employees })
  }
)
