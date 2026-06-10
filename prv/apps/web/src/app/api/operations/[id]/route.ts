import { withGates } from "@/lib/with-gates"
import { NextRequest, NextResponse } from "next/server"
import type { GateContext } from "@prv/auth"
import { writeAuditLog } from "@prv/auth"
import { db } from "@prv/db"
import { stores } from "@prv/db/schema"
import { orders } from "@prv/db/schema"
import { tasks } from "@prv/db/schema"
import { users } from "@prv/db/schema"
import { and, count, eq, gte, isNull, ne, sum } from "drizzle-orm"
import { z } from "zod"

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

// ─── PATCH /api/operations/[id] ──────────────────────────────────────────────

const operationsPatchSchema = z
  .object({
    name: z.string().min(1).max(255).optional(),
    phone: z.string().max(32).optional(),
    email: z.string().email().max(254).optional(),
    address: z.string().max(500).optional(),
    city: z.string().max(100).optional(),
    region: z.string().max(100).optional(),
  })
  .refine(
    (d) =>
      d.name !== undefined ||
      d.phone !== undefined ||
      d.email !== undefined ||
      d.address !== undefined ||
      d.city !== undefined ||
      d.region !== undefined,
    { message: "At least one field required" }
  )

export const PATCH = withGates(
  { action: "operations.update", endpointClass: "api_write" },
  async (req: NextRequest, ctx: GateContext): Promise<NextResponse> => {
    const { companyId, userId } = ctx.session
    const id = req.nextUrl.pathname.split("/").pop() ?? ""
    if (!id) return NextResponse.json({ error: "Missing id" }, { status: 400 })

    const raw = await req.json().catch(() => ({}))
    const parsed = operationsPatchSchema.safeParse(raw)
    if (!parsed.success)
      return NextResponse.json(
        { error: "Invalid payload", issues: parsed.error.issues },
        { status: 422 }
      )

    const [existing] = await db
      .select({ id: stores.id, name: stores.name })
      .from(stores)
      .where(and(eq(stores.id, id), eq(stores.companyId, companyId)))
      .limit(1)
    if (!existing) return NextResponse.json({ error: "Not found" }, { status: 404 })

    const d = parsed.data
    const [updated] = await db
      .update(stores)
      .set({
        ...(d.name !== undefined && { name: d.name }),
        ...(d.phone !== undefined && { phone: d.phone }),
        ...(d.email !== undefined && { email: d.email }),
        ...(d.address !== undefined && { address: d.address }),
        ...(d.city !== undefined && { city: d.city }),
        ...(d.region !== undefined && { region: d.region }),
        updatedAt: new Date(),
      })
      .where(and(eq(stores.id, id), eq(stores.companyId, companyId)))
      .returning({ id: stores.id, name: stores.name })

    void writeAuditLog({
      companyId,
      actorId: userId,
      sessionId: ctx.session.sessionId,
      action: "operations.update",
      entityType: "store",
      entityId: id,
      payload: { name: existing.name, changes: d },
      method: "PATCH",
      path: `/api/operations/${id}`,
      ipAddress: ctx.ipAddress,
      userAgent: ctx.userAgent,
    })

    return NextResponse.json(updated)
  }
)

// ─── DELETE /api/operations/[id] ─────────────────────────────────────────────

export const DELETE = withGates(
  { action: "operations.delete", endpointClass: "api_write" },
  async (req: NextRequest, ctx: GateContext): Promise<NextResponse> => {
    const { companyId, userId } = ctx.session
    const id = req.nextUrl.pathname.split("/").pop() ?? ""
    if (!id) return NextResponse.json({ error: "Missing id" }, { status: 400 })

    const [existing] = await db
      .select({ id: stores.id, name: stores.name, isActive: stores.isActive })
      .from(stores)
      .where(and(eq(stores.id, id), eq(stores.companyId, companyId)))
      .limit(1)
    if (!existing) return NextResponse.json({ error: "Not found" }, { status: 404 })

    await db
      .update(stores)
      .set({ isActive: false, updatedAt: new Date() })
      .where(and(eq(stores.id, id), eq(stores.companyId, companyId)))

    void writeAuditLog({
      companyId,
      actorId: userId,
      sessionId: ctx.session.sessionId,
      action: "operations.delete",
      entityType: "store",
      entityId: id,
      payload: { name: existing.name },
      method: "DELETE",
      path: `/api/operations/${id}`,
      ipAddress: ctx.ipAddress,
      userAgent: ctx.userAgent,
    })

    return new NextResponse(null, { status: 204 })
  }
)
