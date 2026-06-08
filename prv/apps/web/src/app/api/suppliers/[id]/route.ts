import { withGates } from "@/lib/with-gates"
import { NextRequest, NextResponse } from "next/server"
import type { GateContext } from "@prv/auth"
import { db } from "@prv/db"
import { suppliers } from "@prv/db/schema"
import { eq, and, isNull } from "drizzle-orm"
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

type MetaBag = {
  trustScore?: number
  onTimeDelivery?: number
  rating?: number
  orders?: number
  annualSpend?: number
  contractExpiry?: string
  lastOrder?: string
  lastOrderAmount?: number
  qualityScore?: number
  documentationScore?: number
  riskReason?: string
  recentOrders?: LinkedOrder[]
  activities?: SupplierActivity[]
}

function getInitials(name: string): string {
  return name
    .split(/\s+/)
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase() ?? "")
    .join("")
}

export const GET = withGates(
  { action: "suppliers.read", endpointClass: "api_read" },
  async (req: NextRequest, ctx: GateContext): Promise<NextResponse> => {
    const id = req.nextUrl.pathname.split("/").filter(Boolean).pop() ?? ""
    if (!id) return NextResponse.json({ error: "Missing id" }, { status: 400 })

    const [row] = await db
      .select({
        id: suppliers.id,
        name: suppliers.name,
        category: suppliers.category,
        status: suppliers.status,
        contactName: suppliers.contactName,
        email: suppliers.email,
        phone: suppliers.phone,
        city: suppliers.city,
        address: suppliers.address,
        paymentTermsDays: suppliers.paymentTermsDays,
        metadata: suppliers.metadata,
        createdAt: suppliers.createdAt,
      })
      .from(suppliers)
      .where(
        and(
          eq(suppliers.id, id),
          eq(suppliers.companyId, ctx.session.companyId),
          isNull(suppliers.deletedAt)
        )
      )
      .limit(1)

    if (!row) return NextResponse.json({ error: "Not found" }, { status: 404 })

    const m = (row.metadata ?? {}) as MetaBag

    let uiStatus: SupplierSummary["status"] = "active"
    if (row.status === "inactive") uiStatus = "inactive"
    else if (row.status === "pending") uiStatus = "pending"
    else if (row.status === "blacklisted") uiStatus = "at_risk"
    else if (m.trustScore != null && m.trustScore < 50) uiStatus = "at_risk"

    const createdActivity: SupplierActivity = {
      id: "created",
      type: "created",
      text: `Furnizor ${row.name} adăugat`,
      timestamp: row.createdAt.toISOString(),
    }

    const supplier: SupplierDetail = {
      id: row.id,
      initials: getInitials(row.name),
      name: row.name,
      category: row.category ?? "General",
      status: uiStatus,
      trustScore: m.trustScore ?? 0,
      onTimeDelivery: m.onTimeDelivery ?? 0,
      rating: m.rating ?? 0,
      orders: m.orders ?? 0,
      annualSpend: m.annualSpend ?? 0,
      contractExpiry: m.contractExpiry ?? "",
      paymentTerms: row.paymentTermsDays > 0 ? `Net ${row.paymentTermsDays}` : "",
      lastOrder: m.lastOrder ?? "",
      lastOrderAmount: m.lastOrderAmount ?? 0,
      contact: row.contactName ?? "",
      phone: row.phone ?? "",
      email: row.email ?? "",
      address: [row.address, row.city].filter(Boolean).join(", "),
      riskReason: m.riskReason ?? null,
      qualityScore: m.qualityScore ?? 0,
      documentationScore: m.documentationScore ?? 0,
      recentOrders: m.recentOrders ?? [],
      activities: m.activities?.length ? m.activities : [createdActivity],
    }

    return NextResponse.json({ supplier })
  }
)
