import { withGates } from "@/lib/with-gates"
import { NextRequest, NextResponse } from "next/server"
import type { GateContext } from "@prv/auth"
import { db } from "@prv/db"
import { stores } from "@prv/db/schema"
import { orders } from "@prv/db/schema"
import { tasks } from "@prv/db/schema"
import { users } from "@prv/db/schema"
import { and, count, eq, gte, isNull, ne, sum } from "drizzle-orm"

export const dynamic = "force-dynamic"
export const runtime = "nodejs"

export interface StoreTask {
  id: string
  title: string
  status: string
  priority: string
  assigneeInitials?: string
}

export interface StoreOrder {
  id: string
  ref: string
  status: string
  total: number
  timeAgo?: string
  customer?: string
  amountLabel?: string
}

export interface StoreDetail {
  id: string
  name: string
  city: string | null
  address: string | null
  phone: string | null
  email: string | null
  revenueTodayLabel: string
  activeTasks: number
  staffCount: number
  status?: string
  hasAlert?: boolean
  alertMessage?: string
  hours?: string
  managerName?: string
  revenueTrend?: string
  marginPct?: number
  marginTrend?: string
  ordersToday?: number | string
  pendingOrders?: number
  shift?: string
  tasks: StoreTask[]
  orders: StoreOrder[]
}

function fmtAmount(n: number): string {
  if (n >= 1_000_000) return `€${(n / 1_000_000).toFixed(1)}M`
  if (n >= 1_000) return `€${(n / 1_000).toFixed(1)}K`
  return `€${Math.round(n)}`
}

export const GET = withGates(
  { action: "operations.read", endpointClass: "api_read" },
  async (req: NextRequest, ctx: GateContext): Promise<NextResponse> => {
    const id = req.nextUrl.pathname.split("/").pop()
    if (!id) return NextResponse.json({ error: "Missing id" }, { status: 400 })

    const companyId = ctx.session.companyId

    const todayStart = new Date()
    todayStart.setHours(0, 0, 0, 0)

    const [storeRows, todayRevenueRows, taskCountRows, staffCountRows] = await Promise.all([
      db
        .select({
          id: stores.id,
          name: stores.name,
          city: stores.city,
          address: stores.address,
          phone: stores.phone,
          email: stores.email,
        })
        .from(stores)
        .where(and(eq(stores.id, id), eq(stores.companyId, companyId)))
        .limit(1),

      db
        .select({ total: sum(orders.total) })
        .from(orders)
        .where(
          and(eq(orders.storeId, id), gte(orders.createdAt, todayStart), isNull(orders.deletedAt))
        ),

      db
        .select({ cnt: count() })
        .from(tasks)
        .where(
          and(eq(tasks.storeId, id), ne(tasks.status, "done"), eq(tasks.companyId, companyId))
        ),

      db
        .select({ cnt: count() })
        .from(users)
        .where(
          and(eq(users.companyId, companyId), eq(users.isActive, true), isNull(users.deletedAt))
        ),
    ])

    const storeRow = storeRows[0]
    if (!storeRow) return NextResponse.json({ error: "Not found" }, { status: 404 })

    const todayRevenue = Number(todayRevenueRows[0]?.total ?? 0)
    const taskCount = taskCountRows[0]?.cnt ?? 0
    const staffCount = staffCountRows[0]?.cnt ?? 0

    return NextResponse.json({
      store: {
        id: storeRow.id,
        name: storeRow.name,
        city: storeRow.city ?? null,
        address: storeRow.address ?? null,
        phone: storeRow.phone ?? null,
        email: storeRow.email ?? null,
        revenueTodayLabel: fmtAmount(todayRevenue),
        activeTasks: taskCount,
        staffCount: staffCount,
        tasks: [],
        orders: [],
      } satisfies StoreDetail,
    })
  }
)
