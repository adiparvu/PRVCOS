import { withGates } from "@/lib/with-gates"
import { NextRequest, NextResponse } from "next/server"
import type { GateContext } from "@prv/auth"

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

const MOCK_STORES: Store[] = [
  {
    id: "cluj-main",
    name: "Cluj · Main",
    city: "Cluj",
    status: "online",
    revenueTodayLabel: "€34,200",
    marginPct: 39,
    ordersToday: 28,
    hasAlert: false,
    alertMessage: null,
  },
  {
    id: "bucuresti-floreasca",
    name: "București · Floreasca",
    city: "București",
    status: "online",
    revenueTodayLabel: "€28,900",
    marginPct: 34,
    ordersToday: 22,
    hasAlert: false,
    alertMessage: null,
  },
  {
    id: "timisoara-iulius",
    name: "Timișoara · Iulius",
    city: "Timișoara",
    status: "online",
    revenueTodayLabel: "€21,400",
    marginPct: 31,
    ordersToday: 18,
    hasAlert: false,
    alertMessage: null,
  },
  {
    id: "brasov-coresi",
    name: "Brașov · Coresi",
    city: "Brașov",
    status: "away",
    revenueTodayLabel: "€18,600",
    marginPct: 29,
    ordersToday: 14,
    hasAlert: false,
    alertMessage: null,
  },
  {
    id: "iasi-palas",
    name: "Iași · Palas",
    city: "Iași",
    status: "busy",
    revenueTodayLabel: "€15,200",
    marginPct: 27,
    ordersToday: 11,
    hasAlert: true,
    alertMessage: "Stoc redus · 3 SKU-uri",
  },
]

const MOCK_TASKS: Task[] = [
  {
    id: "t1",
    title: "Reaprovizionare rafturi",
    storeId: "brasov-coresi",
    storeName: "Brașov · Coresi",
    priority: "urgent",
    status: "todo",
    assigneeInitials: "AR",
  },
  {
    id: "t2",
    title: "Mentenanță HVAC",
    storeId: "iasi-palas",
    storeName: "Iași · Palas",
    priority: "medium",
    status: "todo",
    assigneeInitials: "MP",
  },
  {
    id: "t3",
    title: "Training personal",
    storeId: "timisoara-iulius",
    storeName: "Timișoara · Iulius",
    priority: "low",
    status: "todo",
    assigneeInitials: "RC",
  },
  {
    id: "t4",
    title: "Audit inventar — în curs",
    storeId: "cluj-main",
    storeName: "Cluj · Main",
    priority: "urgent",
    status: "in_progress",
    assigneeInitials: "EP",
  },
  {
    id: "t5",
    title: "Actualizare POS — toate magazinele",
    storeId: "all",
    storeName: "Toate Magazinele",
    priority: "medium",
    status: "in_progress",
    assigneeInitials: "DM",
  },
  {
    id: "t6",
    title: "Renovare vitrină",
    storeId: "bucuresti-floreasca",
    storeName: "București · Floreasca",
    priority: "low",
    status: "done",
    assigneeInitials: "LG",
  },
  {
    id: "t7",
    title: "Inspecție ieșiri urgență",
    storeId: "iasi-palas",
    storeName: "Iași · Palas",
    priority: "urgent",
    status: "done",
    assigneeInitials: "TN",
  },
  {
    id: "t8",
    title: "Raport deșeuri lunar",
    storeId: "cluj-main",
    storeName: "Cluj · Main",
    priority: "low",
    status: "done",
    assigneeInitials: "IA",
  },
]

const MOCK_ORDERS: Order[] = [
  {
    id: "ord-4821",
    ref: "#ORD-4821",
    storeId: "cluj-main",
    storeName: "Cluj",
    customer: "Mihai Popescu",
    amountLabel: "€298",
    status: "paid",
    timeAgo: "acum 12 min",
  },
  {
    id: "ord-4820",
    ref: "#ORD-4820",
    storeId: "bucuresti-floreasca",
    storeName: "București",
    customer: "Ana Ionescu",
    amountLabel: "€540",
    status: "shipped",
    timeAgo: "acum 28 min",
  },
  {
    id: "ord-4819",
    ref: "#ORD-4819",
    storeId: "timisoara-iulius",
    storeName: "Timișoara",
    customer: "Radu Dima",
    amountLabel: "€120",
    status: "pending",
    timeAgo: "acum 44 min",
  },
  {
    id: "ord-4818",
    ref: "#ORD-4818",
    storeId: "brasov-coresi",
    storeName: "Brașov",
    customer: "Elena Marin",
    amountLabel: "€76",
    status: "paid",
    timeAgo: "acum 1h 10min",
  },
  {
    id: "ord-4817",
    ref: "#ORD-4817",
    storeId: "cluj-main",
    storeName: "Cluj",
    customer: "Vlad Nicu",
    amountLabel: "€1,200",
    status: "shipped",
    timeAgo: "acum 1h 20min",
  },
]

const MOCK_ALERTS: Alert[] = [
  {
    id: "a1",
    storeId: "iasi-palas",
    storeName: "Iași · Palas",
    message: "3 SKU-uri sub pragul de reaprovizionare",
  },
]

function computeMeta(stores: Store[], tasks: Task[]): OperationsMeta {
  return {
    totalStores: 18,
    activeTaskCount: tasks.filter((t) => t.status === "todo" || t.status === "in_progress").length,
    ordersToday: 142,
    alertCount: stores
      .filter((s) => s.hasAlert)
      .reduce((acc, s) => acc + (s.alertMessage ? 3 : 0), 0),
  }
}

export const GET = withGates(
  { action: "operations.read", endpointClass: "api_read" },
  async (req: NextRequest, _ctx: GateContext): Promise<NextResponse> => {
    const storeStatus = req.nextUrl.searchParams.get("status")
    const taskStatus = req.nextUrl.searchParams.get("taskStatus")
    const orderStatus = req.nextUrl.searchParams.get("orderStatus")

    let stores = MOCK_STORES
    let tasks = MOCK_TASKS
    let orders = MOCK_ORDERS

    if (storeStatus) stores = stores.filter((s) => s.status === storeStatus)
    if (taskStatus) tasks = tasks.filter((t) => t.status === taskStatus)
    if (orderStatus) orders = orders.filter((o) => o.status === orderStatus)

    const meta = computeMeta(MOCK_STORES, MOCK_TASKS)
    return NextResponse.json({ stores, tasks, orders, meta, alerts: MOCK_ALERTS })
  }
)
