import { withGates } from "@/lib/with-gates"
import { NextRequest, NextResponse } from "next/server"
import type { GateContext } from "@prv/auth"
import { db } from "@prv/db"
import { stores, orders, clients, tasks, users } from "@prv/db/schema"
import { and, asc, count, desc, eq, gte, isNull } from "drizzle-orm"

export const dynamic = "force-dynamic"
export const runtime = "nodejs"

export type StoreStatus = "online" | "away" | "busy"
export type TaskPriority = "urgent" | "medium" | "low"
export type TaskStatus = "todo" | "in_progress" | "done"
export type OrderStatus = "paid" | "pending" | "shipped"

export interface Store {
  id: string
  name: string
  city: string
  status: StoreStatus
  revenueTodayLabel: string
  marginPct: number
  ordersToday: number
  hasAlert: boolean
  alertMessage: string | null
}

export interface Task {
  id: string
  title: string
  storeId: string
  storeName: string
  priority: TaskPriority
  status: TaskStatus
  assigneeInitials: string
}

export interface Order {
  id: string
  ref: string
  storeId: string
  storeName: string
  customer: string
  amountLabel: string
  status: OrderStatus
  timeAgo: string
}

export interface Alert {
  id: string
  storeId: string
  storeName: string
  message: string
}

export interface OperationsMeta {
  totalStores: number
  activeTaskCount: number
  ordersToday: number
  alertCount: number
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function fmtAmount(n: number): string {
  if (n >= 1_000_000) return `€${(n / 1_000_000).toFixed(1)}M`
  if (n >= 1_000) return `€${(n / 1_000).toFixed(1)}K`
  return `€${Math.round(n)}`
}

function dbOrderStatusToApi(dbStatus: string): OrderStatus {
  if (dbStatus === "delivered") return "paid"
  if (dbStatus === "shipped") return "shipped"
  return "pending"
}

function relativeTime(date: Date): string {
  const diffMin = Math.floor((Date.now() - date.getTime()) / 60_000)
  if (diffMin < 1) return "just now"
  if (diffMin < 60) return `${diffMin} min ago`
  const h = Math.floor(diffMin / 60)
  if (h < 24) return `${h}h ago`
  return `${Math.floor(h / 24)}d`
}

// ── GET ───────────────────────────────────────────────────────────────────────

export const GET = withGates(
  { action: "operations.read", endpointClass: "api_read" },
  async (req: NextRequest, ctx: GateContext): Promise<NextResponse> => {
    const { searchParams } = req.nextUrl
    const storeStatusFilter = searchParams.get("status") as StoreStatus | null
    const taskStatusFilter = searchParams.get("taskStatus") as TaskStatus | null
    const orderStatusFilter = searchParams.get("orderStatus") as OrderStatus | null

    const todayStart = new Date()
    todayStart.setHours(0, 0, 0, 0)

    // 1. Fetch stores, orders, and tasks in parallel
    const [storeRows, orderRows, orderCountRows, taskRows] = await Promise.all([
      db
        .select({ id: stores.id, name: stores.name, city: stores.city, isActive: stores.isActive })
        .from(stores)
        .where(eq(stores.companyId, ctx.session.companyId))
        .orderBy(asc(stores.name)),

      // Recent orders today with client name
      db
        .select({
          id: orders.id,
          orderNumber: orders.orderNumber,
          storeId: orders.storeId,
          status: orders.status,
          total: orders.total,
          createdAt: orders.createdAt,
          clientName: clients.name,
        })
        .from(orders)
        .leftJoin(clients, eq(orders.clientId, clients.id))
        .where(
          and(
            eq(orders.companyId, ctx.session.companyId),
            gte(orders.createdAt, todayStart),
            isNull(orders.deletedAt)
          )
        )
        .orderBy(desc(orders.createdAt))
        .limit(50),

      // Order count per store today (for KPI strip)
      db
        .select({ storeId: orders.storeId, cnt: count() })
        .from(orders)
        .where(
          and(
            eq(orders.companyId, ctx.session.companyId),
            gte(orders.createdAt, todayStart),
            isNull(orders.deletedAt)
          )
        )
        .groupBy(orders.storeId),

      // Tasks with assignee initials and store name
      db
        .select({
          id: tasks.id,
          title: tasks.title,
          storeId: tasks.storeId,
          isAllStores: tasks.isAllStores,
          priority: tasks.priority,
          status: tasks.status,
          assigneeFirstName: users.firstName,
          assigneeLastName: users.lastName,
          storeName: stores.name,
          storeCity: stores.city,
        })
        .from(tasks)
        .leftJoin(users, eq(tasks.assigneeUserId, users.id))
        .leftJoin(stores, eq(tasks.storeId, stores.id))
        .where(and(eq(tasks.companyId, ctx.session.companyId), isNull(tasks.deletedAt)))
        .orderBy(asc(tasks.status), asc(tasks.priority)),
    ])

    // 2. Aggregate revenue + order counts per store from today's orders
    const revenueByStore = new Map<string, number>()
    const orderCountByStore = new Map<string, number>()
    for (const row of orderCountRows) {
      if (row.storeId) orderCountByStore.set(row.storeId, row.cnt)
    }
    for (const ord of orderRows) {
      if (!ord.storeId) continue
      revenueByStore.set(
        ord.storeId,
        (revenueByStore.get(ord.storeId) ?? 0) + Number(ord.total ?? 0)
      )
    }

    // 3. Build store name lookup
    const storeNameById = new Map(storeRows.map((s) => [s.id, s.name]))

    // 4. Assemble stores
    let storeList: Store[] = storeRows.map((s) => ({
      id: s.id,
      name: s.name,
      city: s.city ?? "",
      status: (s.isActive ? "online" : "away") as StoreStatus,
      revenueTodayLabel: fmtAmount(revenueByStore.get(s.id) ?? 0),
      marginPct: 0,
      ordersToday: orderCountByStore.get(s.id) ?? 0,
      hasAlert: false,
      alertMessage: null,
    }))

    // 5. Assemble orders
    let orderList: Order[] = orderRows.map((ord) => ({
      id: ord.id,
      ref: `#${ord.orderNumber}`,
      storeId: ord.storeId ?? "",
      storeName: storeNameById.get(ord.storeId ?? "") ?? "—",
      customer: ord.clientName ?? "—",
      amountLabel: fmtAmount(Number(ord.total ?? 0)),
      status: dbOrderStatusToApi(ord.status),
      timeAgo: relativeTime(ord.createdAt),
    }))

    // 6. Assemble tasks
    let taskList: Task[] = taskRows.map((t) => {
      const initials =
        t.assigneeFirstName && t.assigneeLastName
          ? ((t.assigneeFirstName[0] ?? "") + (t.assigneeLastName[0] ?? "")).toUpperCase()
          : "—"
      const storeName = t.isAllStores ? "Toate Magazinele" : (t.storeCity ?? t.storeName ?? "—")
      return {
        id: t.id,
        title: t.title,
        storeId: t.isAllStores ? "all" : (t.storeId ?? ""),
        storeName,
        priority: t.priority as TaskPriority,
        status: t.status as TaskStatus,
        assigneeInitials: initials,
      }
    })

    // 7. Apply filters
    if (storeStatusFilter) storeList = storeList.filter((s) => s.status === storeStatusFilter)
    if (orderStatusFilter) orderList = orderList.filter((o) => o.status === orderStatusFilter)
    if (taskStatusFilter) taskList = taskList.filter((t) => t.status === taskStatusFilter)

    const activeTasks = taskRows.filter(
      (t) => t.status === "todo" || t.status === "in_progress"
    ).length

    const meta: OperationsMeta = {
      totalStores: storeRows.length,
      activeTaskCount: activeTasks,
      ordersToday: orderRows.length,
      alertCount: 0,
    }

    return NextResponse.json({
      stores: storeList,
      tasks: taskList,
      orders: orderList,
      meta,
      alerts: [],
      nextCursor: null,
    })
  }
)
