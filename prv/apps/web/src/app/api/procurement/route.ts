import { withGates } from "@/lib/with-gates"
import { NextRequest, NextResponse } from "next/server"
import type { GateContext } from "@prv/auth"
import { db } from "@prv/db"
import { purchaseOrders, suppliers, projects } from "@prv/db/schema"
import { and, desc, eq, isNull, lt, sum } from "drizzle-orm"

export const dynamic = "force-dynamic"
export const runtime = "nodejs"

export type POStatus = "Pending" | "Approved" | "Draft" | "Rejected" | "In Transit"

export interface LineItem {
  name: string
  ref: string
  qty: string
  price: number
}

export interface POSummary {
  id: string
  ref: string
  description: string
  supplier: string
  supplierId: string | null
  date: string
  amount: number
  status: POStatus
  project: string | null
  neededBy: string | null
}

export interface ProcurementMeta {
  pending: number
  inTransit: number
  totalSpend: number
  budget: number
  budgetUsed: number
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function dbStatusToApi(dbStatus: string): POStatus {
  switch (dbStatus) {
    case "pending":
      return "Pending"
    case "approved":
      return "Approved"
    case "draft":
      return "Draft"
    case "rejected":
      return "Rejected"
    case "in_transit":
      return "In Transit"
    default:
      return "Draft"
  }
}

// ── GET ───────────────────────────────────────────────────────────────────────

export const GET = withGates(
  { action: "procurement.read", endpointClass: "api_read" },
  async (req: NextRequest, ctx: GateContext): Promise<NextResponse> => {
    const { searchParams } = new URL(req.url)
    const statusFilter = searchParams.get("status") as POStatus | null
    const cursor = searchParams.get("cursor")
    const limit = Math.min(parseInt(searchParams.get("limit") ?? "50", 10), 200)
    const { companyId } = ctx.session

    const poConditions = [
      eq(purchaseOrders.companyId, companyId),
      isNull(purchaseOrders.deletedAt),
    ]
    if (cursor) poConditions.push(lt(purchaseOrders.createdAt, new Date(cursor)))

    const rawRows = await db
      .select({
        id: purchaseOrders.id,
        ref: purchaseOrders.ref,
        description: purchaseOrders.description,
        supplierId: purchaseOrders.supplierId,
        supplierName: purchaseOrders.supplierName,
        supplierDbName: suppliers.name,
        date: purchaseOrders.date,
        neededBy: purchaseOrders.neededBy,
        amount: purchaseOrders.amount,
        status: purchaseOrders.status,
        projectName: projects.name,
        createdAt: purchaseOrders.createdAt,
      })
      .from(purchaseOrders)
      .leftJoin(suppliers, eq(purchaseOrders.supplierId, suppliers.id))
      .leftJoin(projects, eq(purchaseOrders.projectId, projects.id))
      .where(and(...poConditions))
      .orderBy(desc(purchaseOrders.createdAt))
      .limit(limit + 1)

    const hasMore = rawRows.length > limit
    const rows = hasMore ? rawRows.slice(0, limit) : rawRows
    const nextCursor =
      hasMore && rows.length > 0 ? rows[rows.length - 1]!.createdAt.toISOString() : null

    const all: POSummary[] = rows.map((r) => ({
      id: r.id,
      ref: r.ref,
      description: r.description,
      supplier: r.supplierDbName ?? r.supplierName ?? "—",
      supplierId: r.supplierId ?? null,
      date: r.date,
      amount: Number(r.amount),
      status: dbStatusToApi(r.status),
      project: r.projectName ?? null,
      neededBy: r.neededBy ?? null,
    }))

    const filtered = statusFilter ? all.filter((o) => o.status === statusFilter) : all

    const totalSpend = all.reduce((s, o) => s + o.amount, 0)

    const meta: ProcurementMeta = {
      pending: all.filter((o) => o.status === "Pending").length,
      inTransit: all.filter((o) => o.status === "In Transit").length,
      totalSpend,
      budget: 0,
      budgetUsed: totalSpend,
    }

    return NextResponse.json({ orders: filtered, count: filtered.length, meta, nextCursor })
  }
)
