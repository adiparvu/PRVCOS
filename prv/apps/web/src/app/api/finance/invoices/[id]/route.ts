import { withGates } from "@/lib/with-gates"
import { NextRequest, NextResponse } from "next/server"
import type { GateContext } from "@prv/auth"
import type { InvoiceSummary } from "../route"

export const dynamic = "force-dynamic"
export const runtime = "nodejs"

export type InvoicePaymentMethod = "bank_transfer" | "cash" | "card"
export type InvoiceActivityType = "created" | "sent" | "reminder" | "payment" | "overdue" | "voided"

export interface InvoiceLineItem {
  id: string
  description: string
  quantity: number
  unit: string
  unitPrice: number
  total: number
}

export interface InvoiceActivity {
  id: string
  type: InvoiceActivityType
  text: string
  timestamp: string
  actor?: string
}

export interface InvoiceDetail extends InvoiceSummary {
  clientContactName: string
  clientPhone: string
  clientCif: string
  series: string
  vatRate: number
  subtotal: number
  vatAmount: number
  lineItems: InvoiceLineItem[]
  activities: InvoiceActivity[]
}

const MOCK_DETAIL: Record<string, InvoiceDetail> = {
  "inv-208": {
    id: "inv-208",
    ref: "INV-208",
    clientId: "c1",
    clientName: "Andronic Group SRL",
    clientInitials: "AG",
    clientContactName: "Ion Andronic",
    clientPhone: "+40 744 123 456",
    clientCif: "RO12345678",
    status: "overdue",
    series: "PRV-2026",
    amount: 2100,
    amountPaid: 0,
    vatRate: 19,
    subtotal: 1764,
    vatAmount: 335.16,
    dueDate: "2026-05-28",
    issuedDate: "2026-05-14",
    projectName: "Renovare Apartament Floreasca",
    daysOverdue: 10,
    lineItems: [
      {
        id: "li1",
        description: "Manoperă electrică",
        quantity: 20,
        unit: "ore",
        unitPrice: 42,
        total: 840,
      },
      {
        id: "li2",
        description: "Materiale electrice",
        quantity: 1,
        unit: "lot",
        unitPrice: 420,
        total: 420,
      },
      {
        id: "li3",
        description: "Instalații sanitare",
        quantity: 12,
        unit: "ore",
        unitPrice: 38,
        total: 456,
      },
      {
        id: "li4",
        description: "Materiale sanitare",
        quantity: 1,
        unit: "lot",
        unitPrice: 48,
        total: 48,
      },
    ],
    activities: [
      {
        id: "a4",
        type: "overdue",
        text: "Factură restantă — client notificat automat",
        timestamp: "2026-06-04T09:00:00Z",
      },
      {
        id: "a3",
        type: "reminder",
        text: "Reminder trimis către Ion Andronic",
        timestamp: "2026-05-28T08:30:00Z",
        actor: "System",
      },
      {
        id: "a2",
        type: "sent",
        text: "Factură transmisă clientului",
        timestamp: "2026-05-14T14:20:00Z",
        actor: "Admin",
      },
      {
        id: "a1",
        type: "created",
        text: "Factură INV-208 creată",
        timestamp: "2026-05-14T11:05:00Z",
        actor: "Admin",
      },
    ],
  },
  "inv-207": {
    id: "inv-207",
    ref: "INV-207",
    clientId: "c2",
    clientName: "Biroul Construct SRL",
    clientInitials: "BC",
    clientContactName: "Pavel Birău",
    clientPhone: "+40 722 987 654",
    clientCif: "RO23456789",
    status: "overdue",
    series: "PRV-2026",
    amount: 1140,
    amountPaid: 0,
    vatRate: 19,
    subtotal: 957.98,
    vatAmount: 182.02,
    dueDate: "2026-05-30",
    issuedDate: "2026-05-16",
    projectName: "Baie Modernă Cluj",
    daysOverdue: 8,
    lineItems: [
      {
        id: "li1",
        description: "Finisaje baie",
        quantity: 8,
        unit: "ore",
        unitPrice: 45,
        total: 360,
      },
      {
        id: "li2",
        description: "Accesorii sanitare",
        quantity: 1,
        unit: "lot",
        unitPrice: 598,
        total: 598,
      },
    ],
    activities: [
      {
        id: "a3",
        type: "overdue",
        text: "Factură restantă — client notificat",
        timestamp: "2026-06-02T09:00:00Z",
      },
      {
        id: "a2",
        type: "sent",
        text: "Factură transmisă clientului",
        timestamp: "2026-05-16T10:00:00Z",
        actor: "Admin",
      },
      {
        id: "a1",
        type: "created",
        text: "Factură INV-207 creată",
        timestamp: "2026-05-16T09:45:00Z",
        actor: "Admin",
      },
    ],
  },
  "inv-209": {
    id: "inv-209",
    ref: "INV-209",
    clientId: "c1",
    clientName: "Andronic Group SRL",
    clientInitials: "AG",
    clientContactName: "Ion Andronic",
    clientPhone: "+40 744 123 456",
    clientCif: "RO12345678",
    status: "due",
    series: "PRV-2026",
    amount: 7800,
    amountPaid: 0,
    vatRate: 19,
    subtotal: 6554.62,
    vatAmount: 1245.38,
    dueDate: "2026-06-10",
    issuedDate: "2026-05-27",
    projectName: "Pardoseli Comerciale Brașov",
    daysOverdue: null,
    lineItems: [
      {
        id: "li1",
        description: "Montaj pardoseli comerciale",
        quantity: 180,
        unit: "mp",
        unitPrice: 28,
        total: 5040,
      },
      {
        id: "li2",
        description: "Materiale pardoseli",
        quantity: 1,
        unit: "lot",
        unitPrice: 1515,
        total: 1515,
      },
    ],
    activities: [
      {
        id: "a2",
        type: "sent",
        text: "Factură transmisă clientului",
        timestamp: "2026-05-27T15:30:00Z",
        actor: "Admin",
      },
      {
        id: "a1",
        type: "created",
        text: "Factură INV-209 creată",
        timestamp: "2026-05-27T14:00:00Z",
        actor: "Admin",
      },
    ],
  },
  "inv-204": {
    id: "inv-204",
    ref: "INV-204",
    clientId: "c1",
    clientName: "Andronic Group SRL",
    clientInitials: "AG",
    clientContactName: "Ion Andronic",
    clientPhone: "+40 744 123 456",
    clientCif: "RO12345678",
    status: "paid",
    series: "PRV-2026",
    amount: 12400,
    amountPaid: 12400,
    vatRate: 19,
    subtotal: 10420.17,
    vatAmount: 1979.83,
    dueDate: "2026-06-02",
    issuedDate: "2026-05-10",
    projectName: "Renovare Apartament Floreasca",
    daysOverdue: null,
    lineItems: [
      {
        id: "li1",
        description: "Manoperă renovare generală",
        quantity: 120,
        unit: "ore",
        unitPrice: 45,
        total: 5400,
      },
      {
        id: "li2",
        description: "Materiale construcții",
        quantity: 1,
        unit: "lot",
        unitPrice: 3200,
        total: 3200,
      },
      {
        id: "li3",
        description: "Echipamente și scule",
        quantity: 1,
        unit: "lot",
        unitPrice: 820,
        total: 820,
      },
      {
        id: "li4",
        description: "Transport și logistică",
        quantity: 1,
        unit: "lot",
        unitPrice: 1000,
        total: 1000,
      },
    ],
    activities: [
      {
        id: "a3",
        type: "payment",
        text: "Plată de €12,400 înregistrată — Transfer bancar",
        timestamp: "2026-06-02T11:20:00Z",
        actor: "Admin",
      },
      {
        id: "a2",
        type: "sent",
        text: "Factură transmisă clientului",
        timestamp: "2026-05-10T12:00:00Z",
        actor: "Admin",
      },
      {
        id: "a1",
        type: "created",
        text: "Factură INV-204 creată",
        timestamp: "2026-05-10T10:30:00Z",
        actor: "Admin",
      },
    ],
  },
}

export const GET = withGates(
  { action: "finance.invoices.read", endpointClass: "api_read" },
  async (req: NextRequest, _ctx: GateContext): Promise<NextResponse> => {
    const id = req.nextUrl.pathname.split("/").pop()
    if (!id) return NextResponse.json({ error: "Missing id" }, { status: 400 })
    const invoice = MOCK_DETAIL[id]
    if (!invoice) return NextResponse.json({ error: "Not found" }, { status: 404 })
    return NextResponse.json({ invoice })
  }
)
