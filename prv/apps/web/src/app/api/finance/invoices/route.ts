import { withGates } from "@/lib/with-gates"
import { NextRequest, NextResponse } from "next/server"
import type { GateContext } from "@prv/auth"

export const dynamic = "force-dynamic"
export const runtime = "nodejs"

export type InvoiceStatus = "overdue" | "due" | "partial" | "paid" | "draft" | "void"

export interface InvoiceSummary {
  id: string
  ref: string
  clientId: string
  clientName: string
  clientInitials: string
  status: InvoiceStatus
  amount: number
  amountPaid: number
  dueDate: string
  issuedDate: string
  projectName: string
  daysOverdue: number | null
}

const MOCK_INVOICES: InvoiceSummary[] = [
  {
    id: "inv-208",
    ref: "INV-208",
    clientId: "c1",
    clientName: "Andronic Group SRL",
    clientInitials: "AG",
    status: "overdue",
    amount: 2100,
    amountPaid: 0,
    dueDate: "2026-05-28",
    issuedDate: "2026-05-14",
    projectName: "Renovare Apartament Floreasca",
    daysOverdue: 10,
  },
  {
    id: "inv-207",
    ref: "INV-207",
    clientId: "c2",
    clientName: "Biroul Construct SRL",
    clientInitials: "BC",
    status: "overdue",
    amount: 1140,
    amountPaid: 0,
    dueDate: "2026-05-30",
    issuedDate: "2026-05-16",
    projectName: "Baie Modernă Cluj",
    daysOverdue: 8,
  },
  {
    id: "inv-205",
    ref: "INV-205",
    clientId: "c3",
    clientName: "Radu Construct SRL",
    clientInitials: "RC",
    status: "overdue",
    amount: 5100,
    amountPaid: 0,
    dueDate: "2026-05-20",
    issuedDate: "2026-05-06",
    projectName: "Bucătărie Integrată Timișoara",
    daysOverdue: 18,
  },
  {
    id: "inv-209",
    ref: "INV-209",
    clientId: "c1",
    clientName: "Andronic Group SRL",
    clientInitials: "AG",
    status: "due",
    amount: 7800,
    amountPaid: 0,
    dueDate: "2026-06-10",
    issuedDate: "2026-05-27",
    projectName: "Pardoseli Comerciale Brașov",
    daysOverdue: null,
  },
  {
    id: "inv-206",
    ref: "INV-206",
    clientId: "c4",
    clientName: "Prima Biroul SRL",
    clientInitials: "PB",
    status: "partial",
    amount: 3200,
    amountPaid: 1600,
    dueDate: "2026-06-15",
    issuedDate: "2026-05-20",
    projectName: "Renovare Spații Comerciale",
    daysOverdue: null,
  },
  {
    id: "inv-204",
    ref: "INV-204",
    clientId: "c1",
    clientName: "Andronic Group SRL",
    clientInitials: "AG",
    status: "paid",
    amount: 12400,
    amountPaid: 12400,
    dueDate: "2026-06-02",
    issuedDate: "2026-05-10",
    projectName: "Renovare Apartament Floreasca",
    daysOverdue: null,
  },
  {
    id: "inv-203",
    ref: "INV-203",
    clientId: "c5",
    clientName: "Alfa Business SRL",
    clientInitials: "AB",
    status: "paid",
    amount: 4800,
    amountPaid: 4800,
    dueDate: "2026-05-25",
    issuedDate: "2026-05-01",
    projectName: "Vopsitorie Birouri",
    daysOverdue: null,
  },
  {
    id: "inv-210",
    ref: "INV-210",
    clientId: "c2",
    clientName: "Biroul Construct SRL",
    clientInitials: "BC",
    status: "draft",
    amount: 9600,
    amountPaid: 0,
    dueDate: "2026-06-30",
    issuedDate: "2026-06-07",
    projectName: "Baie Modernă Cluj",
    daysOverdue: null,
  },
]

export const GET = withGates(
  { action: "finance.invoices.read", endpointClass: "api_read" },
  async (req: NextRequest, _ctx: GateContext): Promise<NextResponse> => {
    const { searchParams } = new URL(req.url)
    const status = searchParams.get("status")
    const results = status ? MOCK_INVOICES.filter((i) => i.status === status) : MOCK_INVOICES
    return NextResponse.json({ invoices: results, count: results.length })
  }
)
