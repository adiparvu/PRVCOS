import { withGates } from "@/lib/with-gates"
import { NextRequest, NextResponse } from "next/server"
import type { GateContext } from "@prv/auth"
import type { QuoteSummary } from "../route"

export const dynamic = "force-dynamic"
export const runtime = "nodejs"

export type ApprovalStepStatus = "approved" | "pending" | "waiting" | "rejected"
export type QuoteActivityType =
  | "created"
  | "updated"
  | "sent"
  | "approved"
  | "rejected"
  | "accepted"
  | "converted"

export interface QuoteLineItem {
  id: string
  description: string
  quantity: number
  unit: string
  unitPrice: number
  total: number
}

export interface ApprovalStep {
  id: string
  actorName: string
  actorRole: string
  status: ApprovalStepStatus
  decidedAt: string | null
}

export interface QuoteActivity {
  id: string
  type: QuoteActivityType
  text: string
  timestamp: string
  actor?: string
}

export interface QuoteDetail extends QuoteSummary {
  clientContactName: string
  clientPhone: string
  clientEmail: string
  vatRate: number
  subtotal: number
  vatAmount: number
  lineItems: QuoteLineItem[]
  approvalChain: ApprovalStep[]
  activities: QuoteActivity[]
  notes: string | null
}

const MOCK_DETAIL: Record<string, QuoteDetail> = {
  "q-048": {
    id: "q-048",
    ref: "Q-048",
    clientId: "c2",
    clientName: "Andronic Group SRL",
    clientInitials: "AG",
    clientContactName: "Ion Andronic",
    clientPhone: "+40 744 123 456",
    clientEmail: "office@andronic.ro",
    status: "sent",
    amount: 24400,
    issuedDate: "2026-05-28",
    expiryDate: "2026-06-10",
    daysUntilExpiry: 3,
    projectName: "Renovare birouri București",
    version: "v2.1",
    vatRate: 19,
    subtotal: 20504,
    vatAmount: 3895.76,
    notes: "Client a solicitat includerea prize electrice suplimentare în faza 2.",
    lineItems: [
      {
        id: "li1",
        description: "Manoperă renovare generală",
        quantity: 200,
        unit: "ore",
        unitPrice: 55,
        total: 11000,
      },
      {
        id: "li2",
        description: "Materiale construcții",
        quantity: 1,
        unit: "lot",
        unitPrice: 5800,
        total: 5800,
      },
      {
        id: "li3",
        description: "Instalații electrice",
        quantity: 40,
        unit: "ore",
        unitPrice: 52,
        total: 2080,
      },
      {
        id: "li4",
        description: "Project management",
        quantity: 1,
        unit: "lună",
        unitPrice: 1624,
        total: 1624,
      },
    ],
    approvalChain: [
      {
        id: "ap1",
        actorName: "Elena Popescu",
        actorRole: "Project Manager",
        status: "approved",
        decidedAt: "2026-05-27T11:20:00Z",
      },
      {
        id: "ap2",
        actorName: "Mihai Director",
        actorRole: "Director General",
        status: "pending",
        decidedAt: null,
      },
      { id: "ap3", actorName: "Ana CFO", actorRole: "CFO", status: "waiting", decidedAt: null },
    ],
    activities: [
      {
        id: "a4",
        type: "sent",
        text: "Ofertă trimisă clientului — email confirmat",
        timestamp: "2026-05-28T14:30:00Z",
        actor: "Admin",
      },
      {
        id: "a3",
        type: "approved",
        text: "Aprobată de Elena Popescu (PM)",
        timestamp: "2026-05-27T11:20:00Z",
      },
      {
        id: "a2",
        type: "updated",
        text: "Versiunea v2.1 salvată — adăugate 2 articole noi",
        timestamp: "2026-05-26T16:45:00Z",
        actor: "Admin",
      },
      {
        id: "a1",
        type: "created",
        text: "Ofertă Q-048 creată",
        timestamp: "2026-05-25T09:00:00Z",
        actor: "Admin",
      },
    ],
  },
  "q-047": {
    id: "q-047",
    ref: "Q-047",
    clientId: "c4",
    clientName: "Biroul Construct SRL",
    clientInitials: "BC",
    clientContactName: "Pavel Birău",
    clientPhone: "+40 722 987 654",
    clientEmail: "contact@birouconstruct.ro",
    status: "sent",
    amount: 18200,
    issuedDate: "2026-05-24",
    expiryDate: "2026-06-19",
    daysUntilExpiry: 12,
    projectName: "Amenajare spații comerciale",
    version: "v1.0",
    vatRate: 19,
    subtotal: 15294.12,
    vatAmount: 2905.88,
    notes: null,
    lineItems: [
      {
        id: "li1",
        description: "Design interior spații",
        quantity: 1,
        unit: "proiect",
        unitPrice: 2200,
        total: 2200,
      },
      {
        id: "li2",
        description: "Execuție lucrări",
        quantity: 160,
        unit: "ore",
        unitPrice: 48,
        total: 7680,
      },
      {
        id: "li3",
        description: "Materiale finisaje",
        quantity: 1,
        unit: "lot",
        unitPrice: 5414,
        total: 5414,
      },
    ],
    approvalChain: [
      {
        id: "ap1",
        actorName: "Elena Popescu",
        actorRole: "Project Manager",
        status: "approved",
        decidedAt: "2026-05-23T10:00:00Z",
      },
      {
        id: "ap2",
        actorName: "Mihai Director",
        actorRole: "Director General",
        status: "approved",
        decidedAt: "2026-05-23T15:30:00Z",
      },
    ],
    activities: [
      {
        id: "a2",
        type: "sent",
        text: "Ofertă trimisă clientului",
        timestamp: "2026-05-24T09:00:00Z",
        actor: "Admin",
      },
      {
        id: "a1",
        type: "created",
        text: "Ofertă Q-047 creată",
        timestamp: "2026-05-22T14:00:00Z",
        actor: "Admin",
      },
    ],
  },
  "q-044": {
    id: "q-044",
    ref: "Q-044",
    clientId: "c6",
    clientName: "Alfa Business SRL",
    clientInitials: "AB",
    clientContactName: "Marian Alfa",
    clientPhone: "+40 733 456 789",
    clientEmail: "marian@alfabusiness.ro",
    status: "accepted",
    amount: 8700,
    issuedDate: "2026-05-20",
    expiryDate: "2026-06-14",
    daysUntilExpiry: null,
    projectName: "Pardoseli epoxidice hală",
    version: "v1.0",
    vatRate: 19,
    subtotal: 7310.92,
    vatAmount: 1389.08,
    notes: null,
    lineItems: [
      {
        id: "li1",
        description: "Pregătire suprafață beton",
        quantity: 400,
        unit: "mp",
        unitPrice: 8,
        total: 3200,
      },
      {
        id: "li2",
        description: "Aplicare vopsea epoxidică",
        quantity: 400,
        unit: "mp",
        unitPrice: 12,
        total: 4800,
      },
      {
        id: "li3",
        description: "Materiale epoxidice",
        quantity: 1,
        unit: "lot",
        unitPrice: 311,
        total: 311,
      },
    ],
    approvalChain: [
      {
        id: "ap1",
        actorName: "Elena Popescu",
        actorRole: "Project Manager",
        status: "approved",
        decidedAt: "2026-05-19T10:00:00Z",
      },
    ],
    activities: [
      {
        id: "a3",
        type: "accepted",
        text: "Ofertă acceptată de client — Marian Alfa",
        timestamp: "2026-06-03T14:00:00Z",
      },
      {
        id: "a2",
        type: "sent",
        text: "Ofertă trimisă clientului",
        timestamp: "2026-05-20T10:00:00Z",
        actor: "Admin",
      },
      {
        id: "a1",
        type: "created",
        text: "Ofertă Q-044 creată",
        timestamp: "2026-05-19T09:00:00Z",
        actor: "Admin",
      },
    ],
  },
}

export const GET = withGates(
  { action: "crm.quotes.read", endpointClass: "api_read" },
  async (req: NextRequest, _ctx: GateContext): Promise<NextResponse> => {
    const id = req.nextUrl.pathname.split("/").pop()
    if (!id) return NextResponse.json({ error: "Missing id" }, { status: 400 })
    const quote = MOCK_DETAIL[id]
    if (!quote) return NextResponse.json({ error: "Not found" }, { status: 404 })
    return NextResponse.json({ quote })
  }
)
