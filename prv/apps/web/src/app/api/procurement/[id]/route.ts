import { withGates } from "@/lib/with-gates"
import { NextRequest, NextResponse } from "next/server"
import type { GateContext } from "@prv/auth"
import { db } from "@prv/db"
import { purchaseOrders, users, projects } from "@prv/db/schema"
import { and, eq, isNull } from "drizzle-orm"
import type { POSummary } from "../route"

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
  items: { name: string; ref: string; qty: string; price: number }[]
  activities: POActivity[]
}

function dbStatusToApi(s: string): string {
  const map: Record<string, string> = {
    draft: "Draft",
    pending: "Pending",
    approved: "Approved",
    rejected: "Rejected",
    in_transit: "In Transit",
    received: "Received",
  }
  return map[s] ?? s
}

export const GET = withGates(
  { action: "procurement.read", endpointClass: "api_read" },
  async (req: NextRequest, ctx: GateContext): Promise<NextResponse> => {
    const id = req.nextUrl.pathname.split("/").pop()
    if (!id) return NextResponse.json({ error: "Missing id" }, { status: 400 })

    const { companyId } = ctx.session

    const rows = await db
      .select({
        id: purchaseOrders.id,
        ref: purchaseOrders.ref,
        description: purchaseOrders.description,
        supplierName: purchaseOrders.supplierName,
        supplierId: purchaseOrders.supplierId,
        date: purchaseOrders.date,
        neededBy: purchaseOrders.neededBy,
        amount: purchaseOrders.amount,
        status: purchaseOrders.status,
        notes: purchaseOrders.notes,
        createdAt: purchaseOrders.createdAt,
        projectName: projects.name,
        requestedByFirstName: users.firstName,
        requestedByLastName: users.lastName,
      })
      .from(purchaseOrders)
      .leftJoin(users, eq(purchaseOrders.createdByUserId, users.id))
      .leftJoin(projects, eq(purchaseOrders.projectId, projects.id))
      .where(
        and(
          eq(purchaseOrders.id, id),
          eq(purchaseOrders.companyId, companyId),
          isNull(purchaseOrders.deletedAt)
        )
      )
      .limit(1)

    const row = rows[0]
    if (!row) return NextResponse.json({ error: "Not found" }, { status: 404 })

    const requestedBy = row.requestedByFirstName
      ? `${row.requestedByFirstName} ${row.requestedByLastName}`
      : null

    const activities: POActivity[] = [
      {
        id: "a-created",
        type: "created",
        text: `Comandă ${row.ref} creată${requestedBy ? ` de ${requestedBy}` : ""}`,
        timestamp: row.createdAt.toISOString(),
      },
    ]
    if (row.status === "pending" || row.status === "approved") {
      activities.push({
        id: "a-submitted",
        type: "submitted",
        text: `PO trimis spre aprobare`,
        timestamp: row.createdAt.toISOString(),
      })
    }
    if (row.status === "approved") {
      activities.push({
        id: "a-approved",
        type: "approved",
        text: "Comandă aprobată",
        timestamp: row.createdAt.toISOString(),
      })
    }

    const order: PODetail = {
      id: row.id,
      ref: row.ref,
      description: row.description,
      supplier: row.supplierName ?? "—",
      supplierId: row.supplierId ?? null,
      date: row.date,
      amount: Number(row.amount),
      status: dbStatusToApi(row.status) as import("../route").POStatus,
      project: row.projectName ?? null,
      neededBy: row.neededBy ?? null,
      delivery: null,
      paymentTerms: null,
      requestedBy,
      items: [],
      activities,
    }

    return NextResponse.json({ order })
  }
)
