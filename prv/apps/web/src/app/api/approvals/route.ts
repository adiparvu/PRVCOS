import { withGates } from "@/lib/with-gates"
import { NextRequest, NextResponse } from "next/server"
import type { GateContext } from "@prv/auth"

export const dynamic = "force-dynamic"
export const runtime = "nodejs"

export type ApprovalType = "purchase" | "leave" | "expense" | "contract" | "overtime"
export type ApprovalStatus = "Pending" | "Urgent" | "Expired"

export interface ApprovalSummary {
  id: string
  type: ApprovalType
  ref: string
  title: string
  requestedBy: string
  description: string
  value: number | null
  deadline: string
  daysUntilDeadline: number | null
  status: ApprovalStatus
}

export interface ApprovalsMeta {
  pending: number
  urgent: number
  expired: number
  approvedToday: number
}

const MOCK_APPROVALS: ApprovalSummary[] = [
  {
    id: "a1",
    type: "purchase",
    ref: "PO-0195",
    title: "Scânduri grinzi 14×14 cm",
    requestedBy: "Ion Crișan",
    description: "Materiale construcții · Proiect A4 Brașov",
    value: 1850,
    deadline: "8 Iun 2026",
    daysUntilDeadline: 1,
    status: "Urgent",
  },
  {
    id: "a2",
    type: "leave",
    ref: "CO-0042",
    title: "Radu Dima — 7 zile concediu",
    requestedBy: "Radu Dima",
    description: "10–17 Iun · Concediu anual",
    value: null,
    deadline: "4 Iun 2026",
    daysUntilDeadline: -3,
    status: "Expired",
  },
  {
    id: "a3",
    type: "expense",
    ref: "CH-0188",
    title: "Diurnă deplasare Brașov",
    requestedBy: "Sorin Florea",
    description: "3–5 Iun · Combustibil + cazare",
    value: 420,
    deadline: "5 Iun 2026",
    daysUntilDeadline: -2,
    status: "Expired",
  },
  {
    id: "a4",
    type: "purchase",
    ref: "PO-0196",
    title: "Vopsea lavabilă 20L × 8",
    requestedBy: "Elena Marin",
    description: "Materiale finisaj · Cluj Mănăștur",
    value: 640,
    deadline: "12 Iun 2026",
    daysUntilDeadline: 5,
    status: "Pending",
  },
  {
    id: "a5",
    type: "contract",
    ref: "CT-0031",
    title: "Contract Renovare — Bloc A4",
    requestedBy: "Elena Marin",
    description: "Lucrări complete · 90 zile · Brașov",
    value: 48000,
    deadline: "10 Iun 2026",
    daysUntilDeadline: 3,
    status: "Pending",
  },
  {
    id: "a6",
    type: "leave",
    ref: "CO-0043",
    title: "Ana Stoica — 5 zile concediu",
    requestedBy: "Ana Stoica",
    description: "1–5 Iul · Concediu anual",
    value: null,
    deadline: "12 Iun 2026",
    daysUntilDeadline: 5,
    status: "Pending",
  },
  {
    id: "a7",
    type: "expense",
    ref: "CH-0189",
    title: "Combustibil + autostradă",
    requestedBy: "Radu Dima",
    description: "Deplasare Cluj–Brașov",
    value: 185,
    deadline: "9 Iun 2026",
    daysUntilDeadline: 2,
    status: "Pending",
  },
  {
    id: "a8",
    type: "overtime",
    ref: "OR-0077",
    title: "Ore suplimentare — 12h",
    requestedBy: "Liviu Toma",
    description: "Weekend · șantier Cluj Mănăștur",
    value: null,
    deadline: "9 Iun 2026",
    daysUntilDeadline: 2,
    status: "Pending",
  },
]

function computeMeta(approvals: ApprovalSummary[]): ApprovalsMeta {
  const pending = approvals.length
  const urgent = approvals.filter((a) => a.status === "Urgent").length
  const expired = approvals.filter((a) => a.status === "Expired").length
  return { pending, urgent, expired, approvedToday: 14 }
}

export const GET = withGates(
  { action: "approvals.read", endpointClass: "api_read" },
  async (req: NextRequest, _ctx: GateContext): Promise<NextResponse> => {
    const type = req.nextUrl.searchParams.get("type")
    const results = type ? MOCK_APPROVALS.filter((a) => a.type === type) : MOCK_APPROVALS
    const meta = computeMeta(MOCK_APPROVALS)
    return NextResponse.json({ approvals: results, count: results.length, meta })
  }
)
