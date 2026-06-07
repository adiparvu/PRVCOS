import { withGates } from "@/lib/with-gates"
import { NextRequest, NextResponse } from "next/server"
import type { GateContext } from "@prv/auth"

export const dynamic = "force-dynamic"
export const runtime = "nodejs"

export type SupplierStatus = "active" | "pending" | "at_risk" | "inactive"

export interface SupplierSummary {
  id: string
  initials: string
  name: string
  category: string
  status: SupplierStatus
  trustScore: number
  onTimeDelivery: number
  rating: number
  orders: number
  annualSpend: number
  contractExpiry: string
  paymentTerms: string
  lastOrder: string
  lastOrderAmount: number
}

const MOCK_SUPPLIERS: SupplierSummary[] = [
  {
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
  },
  {
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
  },
  {
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
  },
  {
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
  },
  {
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
  },
  {
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
  },
  {
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
  },
]

export const GET = withGates(
  { action: "suppliers.read", endpointClass: "api_read" },
  async (req: NextRequest, _ctx: GateContext): Promise<NextResponse> => {
    const { searchParams } = new URL(req.url)
    const status = searchParams.get("status") as SupplierStatus | null
    const results = status ? MOCK_SUPPLIERS.filter((s) => s.status === status) : MOCK_SUPPLIERS
    return NextResponse.json({ suppliers: results, count: results.length })
  }
)
