import { withGates } from "@/lib/with-gates"
import { NextRequest, NextResponse } from "next/server"
import type { GateContext } from "@prv/auth"

export const dynamic = "force-dynamic"
export const runtime = "nodejs"

export type POStatus = "Pending" | "Approved" | "Draft" | "Rejected" | "In Transit"

export interface LineItem {
  name: string
  ref: string
  qty: string
  price: number
}

export interface POSummary {
  id: string
  ref: string
  description: string
  supplier: string
  supplierId: string | null
  date: string
  amount: number
  status: POStatus
  project: string | null
  neededBy: string | null
}

export interface ProcurementMeta {
  pending: number
  inTransit: number
  totalSpend: number
  budget: number
  budgetUsed: number
}

const MOCK_ORDERS: POSummary[] = [
  {
    id: "po-0194",
    ref: "PO-2026-0194",
    description: "Ceramic Tiles",
    supplier: "Suppliers SRL",
    supplierId: null,
    date: "2026-06-08",
    amount: 12400,
    status: "Pending",
    project: "Renovare Cluj #14",
    neededBy: "2026-06-13",
  },
  {
    id: "po-0193",
    ref: "PO-2026-0193",
    description: "Electrical Components",
    supplier: "ElectroMax",
    supplierId: "s4",
    date: "2026-06-06",
    amount: 8750,
    status: "Approved",
    project: "Renovare Timișoara #7",
    neededBy: "2026-06-10",
  },
  {
    id: "po-0192",
    ref: "PO-2026-0192",
    description: "Paint & Primers",
    supplier: "ColorPro",
    supplierId: null,
    date: "2026-06-05",
    amount: 4200,
    status: "In Transit",
    project: "Renovare Cluj #12",
    neededBy: "2026-06-08",
  },
  {
    id: "po-0191",
    ref: "PO-2026-0191",
    description: "Plumbing Fixtures",
    supplier: "AquaFit",
    supplierId: "s6",
    date: "2026-06-05",
    amount: 6100,
    status: "Draft",
    project: "Renovare Cluj #15",
    neededBy: "2026-06-18",
  },
  {
    id: "po-0190",
    ref: "PO-2026-0190",
    description: "Safety Equipment",
    supplier: "SafeWork",
    supplierId: null,
    date: "2026-06-04",
    amount: 2980,
    status: "Approved",
    project: "All Sites",
    neededBy: "2026-06-07",
  },
]

export const GET = withGates(
  { action: "procurement.read", endpointClass: "api_read" },
  async (req: NextRequest, _ctx: GateContext): Promise<NextResponse> => {
    const { searchParams } = new URL(req.url)
    const status = searchParams.get("status") as POStatus | null
    const results = status ? MOCK_ORDERS.filter((o) => o.status === status) : MOCK_ORDERS

    const meta: ProcurementMeta = {
      pending: MOCK_ORDERS.filter((o) => o.status === "Pending").length,
      inTransit: MOCK_ORDERS.filter((o) => o.status === "In Transit").length,
      totalSpend: MOCK_ORDERS.reduce((s, o) => s + o.amount, 0),
      budget: 90000,
      budgetUsed: 84200,
    }

    return NextResponse.json({ orders: results, count: results.length, meta })
  }
)
