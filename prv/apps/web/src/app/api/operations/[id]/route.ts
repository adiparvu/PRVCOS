import { withGates } from "@/lib/with-gates"
import { NextRequest, NextResponse } from "next/server"
import type { GateContext } from "@prv/auth"
import type { StoreStatus, TaskPriority, TaskStatus, OrderStatus } from "../route"

export const dynamic = "force-dynamic"
export const runtime = "nodejs"

export interface StoreTask {
  id: string
  title: string
  status: TaskStatus
  priority: TaskPriority
  assigneeInitials: string
}

export interface StoreOrder {
  id: string
  ref: string
  customer: string
  amountLabel: string
  status: OrderStatus
  timeAgo: string
}

export interface StoreDetail {
  id: string
  name: string
  city: string
  status: StoreStatus
  revenueTodayLabel: string
  revenueTrend: string
  marginPct: number
  marginTrend: string
  ordersToday: number
  pendingOrders: number
  staffCount: number
  shift: string
  hasAlert: boolean
  alertMessage: string | null
  address: string
  hours: string
  managerName: string
  tasks: StoreTask[]
  orders: StoreOrder[]
}

const MOCK_DETAILS: Record<string, StoreDetail> = {
  "cluj-main": {
    id: "cluj-main",
    name: "Cluj · Main",
    city: "Cluj",
    status: "online",
    revenueTodayLabel: "€34,200",
    revenueTrend: "+12% vs ieri",
    marginPct: 39,
    marginTrend: "+2pp vs luna tr.",
    ordersToday: 28,
    pendingOrders: 3,
    staffCount: 12,
    shift: "09:00–17:00",
    hasAlert: false,
    alertMessage: null,
    address: "Strada Memorandumului 28",
    hours: "Deschis 09:00–21:00",
    managerName: "Elena Popescu",
    tasks: [
      {
        id: "t4",
        title: "Audit inventar",
        status: "in_progress",
        priority: "urgent",
        assigneeInitials: "EP",
      },
      {
        id: "t8",
        title: "Curățenie generală post-tură",
        status: "todo",
        priority: "low",
        assigneeInitials: "RC",
      },
    ],
    orders: [
      {
        id: "ord-4821",
        ref: "#ORD-4821",
        customer: "Mihai Popescu",
        amountLabel: "€298",
        status: "paid",
        timeAgo: "acum 12 min",
      },
      {
        id: "ord-4817",
        ref: "#ORD-4817",
        customer: "Vlad Nicu",
        amountLabel: "€1,200",
        status: "shipped",
        timeAgo: "acum 1h 20min",
      },
      {
        id: "ord-4812",
        ref: "#ORD-4812",
        customer: "Alina Stan",
        amountLabel: "€87",
        status: "pending",
        timeAgo: "acum 2h 10min",
      },
    ],
  },
  "bucuresti-floreasca": {
    id: "bucuresti-floreasca",
    name: "București · Floreasca",
    city: "București",
    status: "online",
    revenueTodayLabel: "€28,900",
    revenueTrend: "+8% vs ieri",
    marginPct: 34,
    marginTrend: "+1pp vs luna tr.",
    ordersToday: 22,
    pendingOrders: 2,
    staffCount: 10,
    shift: "09:00–17:00",
    hasAlert: false,
    alertMessage: null,
    address: "Calea Floreasca 246B",
    hours: "Deschis 09:00–21:00",
    managerName: "Andrei Marin",
    tasks: [
      {
        id: "t5",
        title: "Actualizare POS",
        status: "in_progress",
        priority: "medium",
        assigneeInitials: "DM",
      },
      {
        id: "t6",
        title: "Renovare vitrină",
        status: "done",
        priority: "low",
        assigneeInitials: "LG",
      },
    ],
    orders: [
      {
        id: "ord-4820",
        ref: "#ORD-4820",
        customer: "Ana Ionescu",
        amountLabel: "€540",
        status: "shipped",
        timeAgo: "acum 28 min",
      },
      {
        id: "ord-4815",
        ref: "#ORD-4815",
        customer: "Dan Gheorghe",
        amountLabel: "€210",
        status: "paid",
        timeAgo: "acum 1h 45min",
      },
      {
        id: "ord-4810",
        ref: "#ORD-4810",
        customer: "Maria Radu",
        amountLabel: "€340",
        status: "pending",
        timeAgo: "acum 3h",
      },
    ],
  },
  "timisoara-iulius": {
    id: "timisoara-iulius",
    name: "Timișoara · Iulius",
    city: "Timișoara",
    status: "online",
    revenueTodayLabel: "€21,400",
    revenueTrend: "+5% vs ieri",
    marginPct: 31,
    marginTrend: "0pp vs luna tr.",
    ordersToday: 18,
    pendingOrders: 4,
    staffCount: 9,
    shift: "09:00–17:00",
    hasAlert: false,
    alertMessage: null,
    address: "Bulevardul Iuliu Maniu 1",
    hours: "Deschis 10:00–22:00",
    managerName: "Roxana Constantin",
    tasks: [
      {
        id: "t3",
        title: "Training personal",
        status: "todo",
        priority: "low",
        assigneeInitials: "RC",
      },
      {
        id: "t5",
        title: "Actualizare POS",
        status: "in_progress",
        priority: "medium",
        assigneeInitials: "DM",
      },
    ],
    orders: [
      {
        id: "ord-4819",
        ref: "#ORD-4819",
        customer: "Radu Dima",
        amountLabel: "€120",
        status: "pending",
        timeAgo: "acum 44 min",
      },
      {
        id: "ord-4814",
        ref: "#ORD-4814",
        customer: "Ioana Pop",
        amountLabel: "€88",
        status: "paid",
        timeAgo: "acum 2h",
      },
      {
        id: "ord-4809",
        ref: "#ORD-4809",
        customer: "Mircea Stan",
        amountLabel: "€450",
        status: "shipped",
        timeAgo: "acum 4h",
      },
    ],
  },
  "brasov-coresi": {
    id: "brasov-coresi",
    name: "Brașov · Coresi",
    city: "Brașov",
    status: "away",
    revenueTodayLabel: "€18,600",
    revenueTrend: "-3% vs ieri",
    marginPct: 29,
    marginTrend: "-1pp vs luna tr.",
    ordersToday: 14,
    pendingOrders: 1,
    staffCount: 8,
    shift: "09:00–17:00",
    hasAlert: false,
    alertMessage: null,
    address: "Calea București 1",
    hours: "Deschis 10:00–22:00",
    managerName: "Bogdan Ionescu",
    tasks: [
      {
        id: "t1",
        title: "Reaprovizionare rafturi",
        status: "todo",
        priority: "urgent",
        assigneeInitials: "AR",
      },
      {
        id: "t5",
        title: "Actualizare POS",
        status: "in_progress",
        priority: "medium",
        assigneeInitials: "DM",
      },
    ],
    orders: [
      {
        id: "ord-4818",
        ref: "#ORD-4818",
        customer: "Elena Marin",
        amountLabel: "€76",
        status: "paid",
        timeAgo: "acum 1h 10min",
      },
      {
        id: "ord-4813",
        ref: "#ORD-4813",
        customer: "Sorin Florea",
        amountLabel: "€195",
        status: "shipped",
        timeAgo: "acum 2h 30min",
      },
    ],
  },
  "iasi-palas": {
    id: "iasi-palas",
    name: "Iași · Palas",
    city: "Iași",
    status: "busy",
    revenueTodayLabel: "€15,200",
    revenueTrend: "-8% vs ieri",
    marginPct: 27,
    marginTrend: "-3pp vs luna tr.",
    ordersToday: 11,
    pendingOrders: 2,
    staffCount: 7,
    shift: "09:00–17:00",
    hasAlert: true,
    alertMessage: "Stoc redus detectat — 3 SKU-uri sub pragul de reaprovizionare",
    address: "Strada Palas 7A",
    hours: "Deschis 10:00–22:00",
    managerName: "Tudor Nicu",
    tasks: [
      {
        id: "t2",
        title: "Mentenanță HVAC",
        status: "todo",
        priority: "medium",
        assigneeInitials: "MP",
      },
      {
        id: "t7",
        title: "Inspecție ieșiri urgență",
        status: "done",
        priority: "urgent",
        assigneeInitials: "TN",
      },
    ],
    orders: [
      {
        id: "ord-4816",
        ref: "#ORD-4816",
        customer: "Cristina Luca",
        amountLabel: "€165",
        status: "paid",
        timeAgo: "acum 55 min",
      },
      {
        id: "ord-4811",
        ref: "#ORD-4811",
        customer: "Paul Dobre",
        amountLabel: "€310",
        status: "pending",
        timeAgo: "acum 3h 20min",
      },
    ],
  },
}

function fallbackDetail(id: string): StoreDetail {
  return {
    id,
    name: id,
    city: "—",
    status: "online",
    revenueTodayLabel: "—",
    revenueTrend: "—",
    marginPct: 0,
    marginTrend: "—",
    ordersToday: 0,
    pendingOrders: 0,
    staffCount: 0,
    shift: "—",
    hasAlert: false,
    alertMessage: null,
    address: "—",
    hours: "—",
    managerName: "—",
    tasks: [],
    orders: [],
  }
}

export const GET = withGates(
  { action: "operations.read", endpointClass: "api_read" },
  async (req: NextRequest, _ctx: GateContext): Promise<NextResponse> => {
    const id = req.nextUrl.pathname.split("/").pop()
    if (!id) return NextResponse.json({ error: "Missing id" }, { status: 400 })
    const detail = MOCK_DETAILS[id] ?? fallbackDetail(id)
    return NextResponse.json(detail)
  }
)
