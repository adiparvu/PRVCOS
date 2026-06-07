import { withGates } from "@/lib/with-gates"
import { NextRequest, NextResponse } from "next/server"
import type { GateContext } from "@prv/auth"
import type { SupplierSummary } from "../route"

export const dynamic = "force-dynamic"
export const runtime = "nodejs"

export type SupplierActivityType =
  | "order_placed"
  | "order_delivered"
  | "order_partial"
  | "invoice_paid"
  | "contract_renewed"
  | "late_delivery"
  | "note"
  | "created"

export type OrderStatus = "ordered" | "delivered" | "partial" | "cancelled" | "pending"

export interface LinkedOrder {
  id: string
  ref: string
  projectName: string
  amount: number
  status: OrderStatus
  date: string
}

export interface SupplierActivity {
  id: string
  type: SupplierActivityType
  text: string
  timestamp: string
}

export interface SupplierDetail extends SupplierSummary {
  contact: string
  phone: string
  email: string
  address: string
  riskReason: string | null
  qualityScore: number
  documentationScore: number
  recentOrders: LinkedOrder[]
  activities: SupplierActivity[]
}

const MOCK_DETAIL: Record<string, SupplierDetail> = {
  s1: {
    id: "s1",
    initials: "MG",
    name: "Materiale Grigore SRL",
    category: "Building Materials",
    status: "active",
    trustScore: 88,
    onTimeDelivery: 94,
    rating: 4.2,
    orders: 38,
    annualSpend: 84000,
    contractExpiry: "2026-12-31",
    paymentTerms: "Net 30",
    lastOrder: "2026-06-04",
    lastOrderAmount: 4200,
    contact: "Grigore Matei",
    phone: "+40 721 000 111",
    email: "grigore@materialegrigore.ro",
    address: "Str. Industrială 14, Cluj-Napoca",
    riskReason: null,
    qualityScore: 89,
    documentationScore: 85,
    recentOrders: [
      {
        id: "po-001",
        ref: "PO-2026-041",
        projectName: "Renovare Apartament Floreasca",
        amount: 4200,
        status: "delivered",
        date: "2026-06-04",
      },
      {
        id: "po-002",
        ref: "PO-2026-033",
        projectName: "Spațiu Comercial București",
        amount: 6800,
        status: "delivered",
        date: "2026-05-18",
      },
      {
        id: "po-003",
        ref: "PO-2026-044",
        projectName: "Pardoseli Comerciale Brașov",
        amount: 3100,
        status: "ordered",
        date: "2026-06-06",
      },
    ],
    activities: [
      {
        id: "a4",
        type: "order_delivered",
        text: "Comandă PO-2026-041 livrată — €4,200",
        timestamp: "2026-06-04T10:00:00Z",
      },
      {
        id: "a3",
        type: "order_placed",
        text: "Comandă PO-2026-044 plasată — €3,100",
        timestamp: "2026-06-06T09:00:00Z",
      },
      {
        id: "a2",
        type: "invoice_paid",
        text: "Factură INV-S-031 achitată — €6,800",
        timestamp: "2026-05-25T14:00:00Z",
      },
      {
        id: "a1",
        type: "created",
        text: "Furnizor Materiale Grigore SRL adăugat",
        timestamp: "2024-01-10T08:00:00Z",
      },
    ],
  },
  s2: {
    id: "s2",
    initials: "RC",
    name: "Radu Construct SRL",
    category: "Steel & Concrete",
    status: "active",
    trustScore: 96,
    onTimeDelivery: 98,
    rating: 4.8,
    orders: 24,
    annualSpend: 62000,
    contractExpiry: "2027-03-31",
    paymentTerms: "Net 15",
    lastOrder: "2026-06-02",
    lastOrderAmount: 7600,
    contact: "Radu Ionescu",
    phone: "+40 722 111 222",
    email: "office@raduconstruct.ro",
    address: "Bd. Industriilor 8, Brașov",
    riskReason: null,
    qualityScore: 95,
    documentationScore: 92,
    recentOrders: [
      {
        id: "po-011",
        ref: "PO-2026-040",
        projectName: "Spațiu Comercial București",
        amount: 7600,
        status: "delivered",
        date: "2026-06-02",
      },
      {
        id: "po-012",
        ref: "PO-2026-029",
        projectName: "Renovare Apartament Floreasca",
        amount: 5200,
        status: "delivered",
        date: "2026-05-14",
      },
      {
        id: "po-013",
        ref: "PO-2026-045",
        projectName: "Fundație Bloc D · Timișoara",
        amount: 9100,
        status: "ordered",
        date: "2026-06-05",
      },
    ],
    activities: [
      {
        id: "a5",
        type: "order_placed",
        text: "Comandă PO-2026-045 plasată — €9,100",
        timestamp: "2026-06-05T09:00:00Z",
      },
      {
        id: "a4",
        type: "order_delivered",
        text: "Comandă PO-2026-040 livrată — €7,600",
        timestamp: "2026-06-02T11:00:00Z",
      },
      {
        id: "a3",
        type: "invoice_paid",
        text: "Factură INV-S-044 achitată — €5,200",
        timestamp: "2026-05-28T14:00:00Z",
      },
      {
        id: "a2",
        type: "contract_renewed",
        text: "Contract reînnoit până Mar 2027",
        timestamp: "2026-03-25T10:00:00Z",
      },
      {
        id: "a1",
        type: "created",
        text: "Furnizor Radu Construct SRL adăugat",
        timestamp: "2024-02-01T08:00:00Z",
      },
    ],
  },
  s3: {
    id: "s3",
    initials: "TC",
    name: "Tehno Construct SA",
    category: "Tools & Equipment",
    status: "at_risk",
    trustScore: 42,
    onTimeDelivery: 61,
    rating: 2.3,
    orders: 12,
    annualSpend: 28000,
    contractExpiry: "2026-06-30",
    paymentTerms: "Net 45",
    lastOrder: "2026-05-20",
    lastOrderAmount: 1800,
    contact: "Tudor Marin",
    phone: "+40 723 222 333",
    email: "tudor@tehnoconstruct.ro",
    address: "Str. Meșteșugarilor 3, Timișoara",
    riskReason: "3 livrări întârziate · contract expiră Jun 30",
    qualityScore: 65,
    documentationScore: 58,
    recentOrders: [
      {
        id: "po-021",
        ref: "PO-2026-028",
        projectName: "Dotare atelier Cluj",
        amount: 1800,
        status: "partial",
        date: "2026-05-20",
      },
      {
        id: "po-022",
        ref: "PO-2026-019",
        projectName: "Echipamente site Brașov",
        amount: 3400,
        status: "delivered",
        date: "2026-04-15",
      },
    ],
    activities: [
      {
        id: "a4",
        type: "late_delivery",
        text: "Livrare PO-2026-028 întârziată cu 8 zile",
        timestamp: "2026-05-28T09:00:00Z",
      },
      {
        id: "a3",
        type: "order_partial",
        text: "Comandă PO-2026-028 livrată parțial — 60%",
        timestamp: "2026-05-20T11:00:00Z",
      },
      {
        id: "a2",
        type: "order_delivered",
        text: "Comandă PO-2026-019 livrată — €3,400",
        timestamp: "2026-04-15T14:00:00Z",
      },
      {
        id: "a1",
        type: "late_delivery",
        text: "Livrare PO-2026-012 întârziată cu 12 zile",
        timestamp: "2026-03-22T09:00:00Z",
      },
    ],
  },
  s4: {
    id: "s4",
    initials: "EL",
    name: "ElectroLux Instalații SRL",
    category: "Electrical",
    status: "pending",
    trustScore: 0,
    onTimeDelivery: 0,
    rating: 0,
    orders: 0,
    annualSpend: 0,
    contractExpiry: "",
    paymentTerms: "",
    lastOrder: "",
    lastOrderAmount: 0,
    contact: "Elena Lupu",
    phone: "+40 724 333 444",
    email: "elena@electrolux-instalatii.ro",
    address: "Str. Electricienilor 7, București",
    riskReason: null,
    qualityScore: 0,
    documentationScore: 0,
    recentOrders: [],
    activities: [
      {
        id: "a1",
        type: "created",
        text: "Furnizor ElectroLux Instalații SRL adăugat · onboarding în curs",
        timestamp: "2026-05-30T10:00:00Z",
      },
    ],
  },
  s5: {
    id: "s5",
    initials: "FP",
    name: "Faianță & Pardoseli SRL",
    category: "Tiles & Flooring",
    status: "active",
    trustScore: 80,
    onTimeDelivery: 91,
    rating: 4.0,
    orders: 19,
    annualSpend: 41000,
    contractExpiry: "2026-09-30",
    paymentTerms: "Net 30",
    lastOrder: "2026-05-30",
    lastOrderAmount: 3200,
    contact: "Florin Popa",
    phone: "+40 725 444 555",
    email: "florin@faianta-pardoseli.ro",
    address: "Str. Comercianților 21, Iași",
    riskReason: null,
    qualityScore: 87,
    documentationScore: 82,
    recentOrders: [
      {
        id: "po-031",
        ref: "PO-2026-038",
        projectName: "Pardoseli Comerciale Brașov",
        amount: 3200,
        status: "delivered",
        date: "2026-05-30",
      },
      {
        id: "po-032",
        ref: "PO-2026-026",
        projectName: "Baie Modernă Cluj",
        amount: 2800,
        status: "delivered",
        date: "2026-05-05",
      },
    ],
    activities: [
      {
        id: "a3",
        type: "order_delivered",
        text: "Comandă PO-2026-038 livrată — €3,200",
        timestamp: "2026-05-30T10:00:00Z",
      },
      {
        id: "a2",
        type: "invoice_paid",
        text: "Factură INV-S-028 achitată — €2,800",
        timestamp: "2026-05-20T14:00:00Z",
      },
      {
        id: "a1",
        type: "created",
        text: "Furnizor Faianță & Pardoseli SRL adăugat",
        timestamp: "2024-03-15T08:00:00Z",
      },
    ],
  },
  s6: {
    id: "s6",
    initials: "AS",
    name: "AquaSan Instalații SRL",
    category: "Plumbing",
    status: "active",
    trustScore: 84,
    onTimeDelivery: 93,
    rating: 4.5,
    orders: 15,
    annualSpend: 32000,
    contractExpiry: "2026-11-30",
    paymentTerms: "Net 30",
    lastOrder: "2026-06-01",
    lastOrderAmount: 2900,
    contact: "Adrian Stan",
    phone: "+40 726 555 666",
    email: "office@aquasan.ro",
    address: "Str. Sanitară 4, Cluj-Napoca",
    riskReason: null,
    qualityScore: 90,
    documentationScore: 88,
    recentOrders: [
      {
        id: "po-041",
        ref: "PO-2026-039",
        projectName: "Baie master etaj 2",
        amount: 2900,
        status: "delivered",
        date: "2026-06-01",
      },
      {
        id: "po-042",
        ref: "PO-2026-031",
        projectName: "Renovare Apartament Floreasca",
        amount: 4100,
        status: "delivered",
        date: "2026-05-10",
      },
    ],
    activities: [
      {
        id: "a3",
        type: "order_delivered",
        text: "Comandă PO-2026-039 livrată — €2,900",
        timestamp: "2026-06-01T10:00:00Z",
      },
      {
        id: "a2",
        type: "invoice_paid",
        text: "Factură INV-S-036 achitată — €4,100",
        timestamp: "2026-05-22T14:00:00Z",
      },
      {
        id: "a1",
        type: "created",
        text: "Furnizor AquaSan Instalații SRL adăugat",
        timestamp: "2024-06-01T08:00:00Z",
      },
    ],
  },
  s7: {
    id: "s7",
    initials: "VP",
    name: "Vopsele & Protecție SA",
    category: "Paints & Coatings",
    status: "active",
    trustScore: 82,
    onTimeDelivery: 89,
    rating: 4.1,
    orders: 22,
    annualSpend: 38000,
    contractExpiry: "2027-02-28",
    paymentTerms: "Net 30",
    lastOrder: "2026-06-03",
    lastOrderAmount: 5100,
    contact: "Vasile Pop",
    phone: "+40 727 666 777",
    email: "vasile@vopsele-protectie.ro",
    address: "Str. Vopselelor 9, București",
    riskReason: null,
    qualityScore: 83,
    documentationScore: 80,
    recentOrders: [
      {
        id: "po-051",
        ref: "PO-2026-042",
        projectName: "Spațiu Comercial București",
        amount: 5100,
        status: "ordered",
        date: "2026-06-03",
      },
      {
        id: "po-052",
        ref: "PO-2026-035",
        projectName: "Renovare birou etaj 1",
        amount: 3600,
        status: "delivered",
        date: "2026-05-22",
      },
    ],
    activities: [
      {
        id: "a3",
        type: "order_placed",
        text: "Comandă PO-2026-042 plasată — €5,100",
        timestamp: "2026-06-03T09:00:00Z",
      },
      {
        id: "a2",
        type: "order_delivered",
        text: "Comandă PO-2026-035 livrată — €3,600",
        timestamp: "2026-05-22T10:00:00Z",
      },
      {
        id: "a1",
        type: "created",
        text: "Furnizor Vopsele & Protecție SA adăugat",
        timestamp: "2024-04-01T08:00:00Z",
      },
    ],
  },
}

export const GET = withGates(
  { action: "suppliers.read", endpointClass: "api_read" },
  async (req: NextRequest, _ctx: GateContext): Promise<NextResponse> => {
    const id = req.nextUrl.pathname.split("/").pop()
    if (!id) return NextResponse.json({ error: "Missing id" }, { status: 400 })
    const supplier = MOCK_DETAIL[id]
    if (!supplier) return NextResponse.json({ error: "Not found" }, { status: 404 })
    return NextResponse.json({ supplier })
  }
)
