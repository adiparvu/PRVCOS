import { withGates } from "@/lib/with-gates"
import { NextRequest, NextResponse } from "next/server"
import type { GateContext } from "@prv/auth"
import { writeAuditLog } from "@prv/auth"
import { z } from "zod"
import { db } from "@prv/db"
import { suppliers } from "@prv/db/schema"
import { eq, and, gt, isNull, desc } from "drizzle-orm"

export const dynamic = "force-dynamic"
export const runtime = "nodejs"

const LIMIT = 50

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

function getInitials(name: string): string {
  return name
    .split(/\s+/)
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase() ?? "")
    .join("")
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
}

function mapRow(row: {
  id: string
  name: string
  category: string | null
  status: string
  paymentTermsDays: number
  metadata: unknown
  createdAt: Date
}): SupplierSummary {
  const m = (row.metadata ?? {}) as MetaBag

  // Map DB status to UI status — DB has "blacklisted" which maps to "at_risk" for UI
  let uiStatus: SupplierStatus = "active"
  if (row.status === "inactive") uiStatus = "inactive"
  else if (row.status === "pending") uiStatus = "pending"
  else if (row.status === "blacklisted") uiStatus = "at_risk"
  else if (m.trustScore != null && m.trustScore < 50) uiStatus = "at_risk"

  return {
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
  }
}

export const GET = withGates(
  { action: "suppliers.read", endpointClass: "api_read" },
  async (req: NextRequest, ctx: GateContext): Promise<NextResponse> => {
    const { searchParams } = new URL(req.url)
    const statusFilter = searchParams.get("status") as SupplierStatus | null
    const cursor = searchParams.get("cursor")

    const rows = await db
      .select({
        id: suppliers.id,
        name: suppliers.name,
        category: suppliers.category,
        status: suppliers.status,
        paymentTermsDays: suppliers.paymentTermsDays,
        metadata: suppliers.metadata,
        createdAt: suppliers.createdAt,
      })
      .from(suppliers)
      .where(and(eq(suppliers.companyId, ctx.session.companyId), isNull(suppliers.deletedAt), cursor ? gt(suppliers.id, cursor) : undefined))
      .orderBy(desc(suppliers.createdAt))
      .limit(LIMIT + 1)

    const hasMore = rows.length > LIMIT
    const page = hasMore ? rows.slice(0, LIMIT) : rows
    const nextCursor = hasMore ? (page[page.length - 1]?.id ?? null) : null

    let results = page.map(mapRow)

    if (statusFilter) {
      results = results.filter((s) => s.status === statusFilter)
    }

    return NextResponse.json({ suppliers: results, count: results.length, nextCursor })
  }
)

// ─── POST /api/suppliers ──────────────────────────────────────────────────────

const createSupplierSchema = z.object({
  name: z.string().min(1).max(255),
  category: z.string().max(100).optional(),
  contactName: z.string().max(255).optional(),
  email: z.string().email().optional(),
  phone: z.string().max(32).optional(),
  city: z.string().max(100).optional(),
  address: z.string().optional(),
  vatNumber: z.string().max(50).optional(),
  paymentTermsDays: z.number().int().positive().optional(),
  notes: z.string().optional(),
})

export const POST = withGates(
  { action: "suppliers.create", endpointClass: "api_write" },
  async (req: NextRequest, ctx: GateContext): Promise<NextResponse> => {
    const { companyId, userId } = ctx.session

    let body: unknown
    try {
      body = await req.json()
    } catch {
      return NextResponse.json({ error: "Invalid JSON" }, { status: 400 })
    }

    const parsed = createSupplierSchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json({ error: "Invalid payload", issues: parsed.error.issues }, { status: 422 })
    }

    const [record] = await db
      .insert(suppliers)
      .values({ companyId, ...parsed.data })
      .returning({ id: suppliers.id, name: suppliers.name })

    if (!record) return NextResponse.json({ error: "Insert failed" }, { status: 500 })

    void writeAuditLog({
      companyId,
      actorId: userId,
      sessionId: ctx.session.sessionId,
      action: "suppliers.create",
      entityType: "supplier",
      entityId: record.id,
      payload: parsed.data,
      method: "POST",
      path: "/api/suppliers",
      ipAddress: ctx.ipAddress,
      userAgent: ctx.userAgent,
    })

    return NextResponse.json({ id: record.id, name: record.name }, { status: 201 })
  }
)
