import { withGates } from "@/lib/with-gates"
import { NextRequest, NextResponse } from "next/server"
import type { GateContext } from "@prv/auth"
import type { POSummary, LineItem } from "../route"

export const dynamic = "force-dynamic"
export const runtime = "nodejs"

export type POActivityType =
  | "created"
  | "submitted"
  | "approved"
  | "rejected"
  | "in_transit"
  | "delivered"
  | "note"

export interface POActivity {
  id: string
  type: POActivityType
  text: string
  timestamp: string
}

export interface PODetail extends POSummary {
  delivery: string | null
  paymentTerms: string | null
  requestedBy: string | null
  items: LineItem[]
  activities: POActivity[]
}

const MOCK_DETAIL: Record<string, PODetail> = {
  "po-0194": {
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
    delivery: "Depozit Cluj",
    paymentTerms: "Net 30",
    requestedBy: "Andrei Popescu",
    items: [
      { name: "Porcelain Tile 60×60cm", ref: "White Gloss · REF-4412", qty: "120 m²", price: 7200 },
      { name: "Tile Adhesive Pro", ref: "25kg bags · REF-0821", qty: "40 saci", price: 1960 },
      { name: "Grout White Fine", ref: "5kg bags · REF-3307", qty: "24 saci", price: 840 },
      { name: "Tile Spacers 3mm", ref: "500pcs · REF-1102", qty: "10 packs", price: 2400 },
    ],
    activities: [
      {
        id: "a2",
        type: "submitted",
        text: "PO trimis spre aprobare de Andrei Popescu",
        timestamp: "2026-06-08T09:00:00Z",
      },
      {
        id: "a1",
        type: "created",
        text: "Comandă PO-2026-0194 creată",
        timestamp: "2026-06-07T16:30:00Z",
      },
    ],
  },
  "po-0193": {
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
    delivery: "Depozit Timișoara",
    paymentTerms: "Net 15",
    requestedBy: "Elena Marin",
    items: [
      { name: "Cable NYY 3×2.5mm²", ref: "100m roll · REF-E210", qty: "5 rulouri", price: 4250 },
      { name: "Circuit Breaker 16A", ref: "REF-CB16", qty: "20 buc", price: 2800 },
      { name: "Junction Box IP65", ref: "REF-JB65", qty: "30 buc", price: 1700 },
    ],
    activities: [
      {
        id: "a3",
        type: "approved",
        text: "Comandă aprobată de Maria Ionescu",
        timestamp: "2026-06-06T14:00:00Z",
      },
      {
        id: "a2",
        type: "submitted",
        text: "PO trimis spre aprobare de Elena Marin",
        timestamp: "2026-06-06T10:00:00Z",
      },
      {
        id: "a1",
        type: "created",
        text: "Comandă PO-2026-0193 creată",
        timestamp: "2026-06-05T17:00:00Z",
      },
    ],
  },
  "po-0192": {
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
    delivery: "Șantier Cluj",
    paymentTerms: "Net 30",
    requestedBy: "Cosmin Neagu",
    items: [
      { name: "Interior Wall Paint White", ref: "15L · REF-P001", qty: "10 buc", price: 2400 },
      { name: "Primer Universal", ref: "10L · REF-PR10", qty: "8 buc", price: 1200 },
      { name: "Roller Set Pro", ref: "REF-R22", qty: "12 seturi", price: 600 },
    ],
    activities: [
      {
        id: "a4",
        type: "in_transit",
        text: "Comanda a plecat din depozit ColorPro",
        timestamp: "2026-06-06T08:00:00Z",
      },
      {
        id: "a3",
        type: "approved",
        text: "Comandă aprobată de Maria Ionescu",
        timestamp: "2026-06-05T15:30:00Z",
      },
      {
        id: "a2",
        type: "submitted",
        text: "PO trimis spre aprobare de Cosmin Neagu",
        timestamp: "2026-06-05T11:00:00Z",
      },
      {
        id: "a1",
        type: "created",
        text: "Comandă PO-2026-0192 creată",
        timestamp: "2026-06-04T14:00:00Z",
      },
    ],
  },
  "po-0191": {
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
    delivery: "Depozit Cluj",
    paymentTerms: "Net 30",
    requestedBy: "Maria Ionescu",
    items: [
      { name: "Thermostatic Shower Set", ref: "REF-S440", qty: "6 seturi", price: 3600 },
      { name: "Wash Basin 60cm", ref: "REF-WB60", qty: "4 buc", price: 1600 },
      { name: "Toilet Suite Close Coupled", ref: "REF-TC1", qty: "3 buc", price: 900 },
    ],
    activities: [
      {
        id: "a1",
        type: "created",
        text: "Comandă PO-2026-0191 creată ca draft",
        timestamp: "2026-06-05T09:00:00Z",
      },
    ],
  },
  "po-0190": {
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
    delivery: "Depozit Cluj",
    paymentTerms: "Immediate",
    requestedBy: "Maria Ionescu",
    items: [
      { name: "Safety Helmets EN397", ref: "REF-SH1", qty: "20 buc", price: 980 },
      { name: "Hi-Vis Vest Class 2", ref: "REF-HV2", qty: "20 buc", price: 600 },
      { name: "Safety Boots S3", ref: "REF-SB3", qty: "10 perechi", price: 1400 },
    ],
    activities: [
      {
        id: "a3",
        type: "approved",
        text: "Comandă aprobată de Andrei Popescu",
        timestamp: "2026-06-04T14:00:00Z",
      },
      {
        id: "a2",
        type: "submitted",
        text: "PO trimis spre aprobare de Maria Ionescu",
        timestamp: "2026-06-04T10:00:00Z",
      },
      {
        id: "a1",
        type: "created",
        text: "Comandă PO-2026-0190 creată",
        timestamp: "2026-06-03T16:00:00Z",
      },
    ],
  },
}

export const GET = withGates(
  { action: "procurement.read", endpointClass: "api_read" },
  async (req: NextRequest, _ctx: GateContext): Promise<NextResponse> => {
    const id = req.nextUrl.pathname.split("/").pop()
    if (!id) return NextResponse.json({ error: "Missing id" }, { status: 400 })
    const order = MOCK_DETAIL[id]
    if (!order) return NextResponse.json({ error: "Not found" }, { status: 404 })
    return NextResponse.json({ order })
  }
)
