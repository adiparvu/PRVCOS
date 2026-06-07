import { withGates } from "@/lib/with-gates"
import { NextRequest, NextResponse } from "next/server"
import type { GateContext } from "@prv/auth"
import type { ExpenseCategory, ExpenseStatus } from "../route"

export const dynamic = "force-dynamic"
export const runtime = "nodejs"

export interface ApprovalStep {
  id: string
  role: string
  name: string
  avatar: string
  status: "approved" | "pending" | "locked"
  approvedAt: string
  note: string
}

export interface ExpenseLineItem {
  id: string
  description: string
  quantity: number
  unitPriceLabel: string
  totalLabel: string
}

export interface ExpenseDetail {
  id: string
  category: ExpenseCategory
  status: ExpenseStatus
  title: string
  amount: number
  amountLabel: string
  baseAmount: number
  baseAmountLabel: string
  vatAmount: number
  vatLabel: string
  vatPct: number
  vendorName: string
  vendorId: string
  vendorAddress: string
  vendorCui: string
  date: string
  dueDate: string
  description: string
  approvalStage: number
  approvalSteps: ApprovalStep[]
  lineItems: ExpenseLineItem[]
}

const MOCK_DETAILS: Record<string, ExpenseDetail> = {
  "exp-001": {
    id: "exp-001",
    category: "materiale",
    status: "pending",
    title: "Materiale construcție lot 3/2026",
    amount: 8740,
    amountLabel: "€8,740",
    baseAmount: 7345,
    baseAmountLabel: "€7,345",
    vatAmount: 1395,
    vatLabel: "€1,395",
    vatPct: 19,
    vendorName: "Materiale Building SRL",
    vendorId: "v-001",
    vendorAddress: "Str. Industriei 14, Cluj-Napoca",
    vendorCui: "RO12345678",
    date: "2026-06-05",
    dueDate: "2026-06-20",
    description:
      "Achiziție materiale de construcție pentru șantierele active din lotul 3/2026: Cluj, Timișoara și Brașov.",
    approvalStage: 2,
    approvalSteps: [
      {
        id: "step-1",
        role: "Manager Regional",
        name: "Ion Popescu",
        avatar: "IP",
        status: "approved",
        approvedAt: "acum 2h",
        note: "Verificat cu șeful de șantier. Prețuri corecte.",
      },
      {
        id: "step-2",
        role: "Director Financiar",
        name: "Maria Ionescu",
        avatar: "MI",
        status: "pending",
        approvedAt: "",
        note: "",
      },
      {
        id: "step-3",
        role: "CEO",
        name: "Adrian Pârvulescu",
        avatar: "AP",
        status: "locked",
        approvedAt: "",
        note: "",
      },
    ],
    lineItems: [
      {
        id: "li-1",
        description: "Ciment Portland 42.5N (25kg)",
        quantity: 80,
        unitPriceLabel: "€16.00",
        totalLabel: "€1,280",
      },
      {
        id: "li-2",
        description: "Polistiren EPS 10cm (m²)",
        quantity: 120,
        unitPriceLabel: "€20.00",
        totalLabel: "€2,400",
      },
      {
        id: "li-3",
        description: "Vopsea lavabilă interior (15L)",
        quantity: 30,
        unitPriceLabel: "€44.00",
        totalLabel: "€1,320",
      },
      {
        id: "li-4",
        description: "Primer siliconic (5L)",
        quantity: 24,
        unitPriceLabel: "€24.00",
        totalLabel: "€576",
      },
      {
        id: "li-5",
        description: "Hârtie renovare (rolă 50m)",
        quantity: 40,
        unitPriceLabel: "€7.50",
        totalLabel: "€300",
      },
      {
        id: "li-6",
        description: "Plasă fibră sticlă (m²)",
        quantity: 150,
        unitPriceLabel: "€3.00",
        totalLabel: "€450",
      },
      {
        id: "li-7",
        description: "Diverse consumabile",
        quantity: 1,
        unitPriceLabel: "€1,019",
        totalLabel: "€1,019",
      },
    ],
  },
  "exp-006": {
    id: "exp-006",
    category: "logistica",
    status: "pending",
    title: "Leasing utilaje Q2 2026",
    amount: 12800,
    amountLabel: "€12,800",
    baseAmount: 10756,
    baseAmountLabel: "€10,756",
    vatAmount: 2044,
    vatLabel: "€2,044",
    vatPct: 19,
    vendorName: "UniCredit Leasing",
    vendorId: "v-002",
    vendorAddress: "Calea Victoriei 161, București",
    vendorCui: "RO87654321",
    date: "2026-06-01",
    dueDate: "2026-06-15",
    description:
      "Rată lunară leasing excavator Caterpillar 320 și compactor Dynapac CA2500 pentru șantierele active.",
    approvalStage: 1,
    approvalSteps: [
      {
        id: "step-1",
        role: "Manager Regional",
        name: "Ion Popescu",
        avatar: "IP",
        status: "pending",
        approvedAt: "",
        note: "",
      },
      {
        id: "step-2",
        role: "Director Financiar",
        name: "Maria Ionescu",
        avatar: "MI",
        status: "locked",
        approvedAt: "",
        note: "",
      },
      {
        id: "step-3",
        role: "CEO",
        name: "Adrian Pârvulescu",
        avatar: "AP",
        status: "locked",
        approvedAt: "",
        note: "",
      },
    ],
    lineItems: [
      {
        id: "li-1",
        description: "Leasing excavator Caterpillar 320",
        quantity: 1,
        unitPriceLabel: "€7,200",
        totalLabel: "€7,200",
      },
      {
        id: "li-2",
        description: "Leasing compactor Dynapac CA2500",
        quantity: 1,
        unitPriceLabel: "€3,556",
        totalLabel: "€3,556",
      },
    ],
  },
}

function fallbackDetail(id: string): ExpenseDetail {
  return {
    id,
    category: "altele",
    status: "draft",
    title: id,
    amount: 0,
    amountLabel: "—",
    baseAmount: 0,
    baseAmountLabel: "—",
    vatAmount: 0,
    vatLabel: "—",
    vatPct: 19,
    vendorName: "—",
    vendorId: "—",
    vendorAddress: "—",
    vendorCui: "—",
    date: "—",
    dueDate: "—",
    description: "—",
    approvalStage: 0,
    approvalSteps: [],
    lineItems: [],
  }
}

export const GET = withGates(
  { action: "finance.expenses.read", endpointClass: "api_read" },
  async (req: NextRequest, _ctx: GateContext): Promise<NextResponse> => {
    const id = req.nextUrl.pathname.split("/").pop()
    if (!id) return NextResponse.json({ error: "Missing id" }, { status: 400 })
    const detail = MOCK_DETAILS[id] ?? fallbackDetail(id)
    return NextResponse.json(detail)
  }
)
