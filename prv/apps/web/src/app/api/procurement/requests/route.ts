import { withGates } from "@/lib/with-gates"
import { NextRequest, NextResponse } from "next/server"
import type { GateContext } from "@prv/auth"
import { writeAuditLog } from "@prv/auth"
import { z } from "zod"
import { db } from "@prv/db"
import { purchaseRequests, users } from "@prv/db/schema"
import { and, count, desc, eq, isNull, lt, sql } from "drizzle-orm"

export const dynamic = "force-dynamic"
export const runtime = "nodejs"

const LIMIT = 50

export type PRStatus = "draft" | "submitted" | "approved" | "rejected" | "converted"

export interface PurchaseRequestSummary {
  id: string
  itemDescription: string
  category: string
  quantity: number
  unit: string
  estimatedCost: number
  currency: string
  urgency: string
  department: string | null
  status: PRStatus
  requestedByName: string | null
  createdAt: string
  updatedAt: string
}

export interface PurchaseRequestMeta {
  totalCount: number
  submittedCount: number
  approvedCount: number
  pendingValue: number
}

// ── GET /api/procurement/requests ────────────────────────────────────────────

export const GET = withGates(
  { action: "procurement.read", endpointClass: "api_read" },
  async (req: NextRequest, ctx: GateContext): Promise<NextResponse> => {
    const { searchParams } = req.nextUrl
    const statusFilter = searchParams.get("status") as PRStatus | null
    const userFilter = searchParams.get("userId")
    const cursor = searchParams.get("cursor")
    const { companyId } = ctx.session

    const conditions = [
      eq(purchaseRequests.companyId, companyId),
      isNull(purchaseRequests.deletedAt),
    ]

    if (statusFilter) conditions.push(eq(purchaseRequests.status, statusFilter))
    if (userFilter) conditions.push(eq(purchaseRequests.requestedByUserId, userFilter))
    if (cursor) conditions.push(lt(purchaseRequests.createdAt, new Date(cursor)))

    const [rows, countRows] = await Promise.all([
      db
        .select({
          id: purchaseRequests.id,
          itemDescription: purchaseRequests.itemDescription,
          category: purchaseRequests.category,
          quantity: purchaseRequests.quantity,
          unit: purchaseRequests.unit,
          estimatedCost: purchaseRequests.estimatedCost,
          currency: purchaseRequests.currency,
          urgency: purchaseRequests.urgency,
          department: purchaseRequests.department,
          status: purchaseRequests.status,
          createdAt: purchaseRequests.createdAt,
          updatedAt: purchaseRequests.updatedAt,
          requestedByFirstName: users.firstName,
          requestedByLastName: users.lastName,
        })
        .from(purchaseRequests)
        .leftJoin(users, eq(purchaseRequests.requestedByUserId, users.id))
        .where(and(...conditions))
        .orderBy(desc(purchaseRequests.createdAt))
        .limit(LIMIT + 1),

      db
        .select({
          total: count(),
          submitted: sql<number>`count(*) filter (where ${purchaseRequests.status} = 'submitted')`,
          approved: sql<number>`count(*) filter (where ${purchaseRequests.status} = 'approved')`,
          pendingValue: sql<number>`coalesce(sum(case when ${purchaseRequests.status} in ('draft','submitted','approved') then ${purchaseRequests.estimatedCost}::numeric else 0 end), 0)`,
        })
        .from(purchaseRequests)
        .where(and(eq(purchaseRequests.companyId, companyId), isNull(purchaseRequests.deletedAt))),
    ])

    const hasMore = rows.length > LIMIT
    const pageRows = hasMore ? rows.slice(0, LIMIT) : rows
    const nextCursor =
      hasMore && pageRows.length > 0 ? pageRows[pageRows.length - 1]!.createdAt.toISOString() : null

    const metaRow = countRows[0]

    const requests: PurchaseRequestSummary[] = pageRows.map((r) => ({
      id: r.id,
      itemDescription: r.itemDescription,
      category: r.category,
      quantity: Number(r.quantity),
      unit: r.unit,
      estimatedCost: Number(r.estimatedCost),
      currency: r.currency,
      urgency: r.urgency,
      department: r.department ?? null,
      status: r.status as PRStatus,
      requestedByName:
        r.requestedByFirstName && r.requestedByLastName
          ? r.requestedByFirstName + " " + r.requestedByLastName
          : null,
      createdAt: r.createdAt.toISOString(),
      updatedAt: r.updatedAt.toISOString(),
    }))

    const meta: PurchaseRequestMeta = {
      totalCount: Number(metaRow?.total ?? 0),
      submittedCount: Number(metaRow?.submitted ?? 0),
      approvedCount: Number(metaRow?.approved ?? 0),
      pendingValue: Number(metaRow?.pendingValue ?? 0),
    }

    return NextResponse.json({
      requests,
      count: requests.length,
      nextCursor,
      meta,
    })
  }
)

// ── POST /api/procurement/requests ───────────────────────────────────────────

const createRequestSchema = z.object({
  itemDescription: z.string().min(1).max(500),
  category: z.enum(["materials", "tools", "equipment", "services", "other"]).optional(),
  quantity: z.number().positive().optional(),
  unit: z.string().max(50).optional(),
  estimatedCost: z.number().nonnegative().optional(),
  currency: z.string().length(3).optional(),
  urgency: z.enum(["standard", "urgent", "emergency"]).optional(),
  department: z.string().max(255).optional(),
  justification: z.string().optional(),
  projectId: z.string().uuid().optional(),
})

export const POST = withGates(
  { action: "procurement.create", endpointClass: "api_write" },
  async (req: NextRequest, ctx: GateContext): Promise<NextResponse> => {
    const { companyId, userId } = ctx.session

    let body: unknown
    try {
      body = await req.json()
    } catch {
      return NextResponse.json({ error: "Invalid JSON" }, { status: 400 })
    }

    const parsed = createRequestSchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid payload", issues: parsed.error.issues },
        { status: 422 }
      )
    }

    // Generate sequential ref PR-{year}-{4-digit sequence}
    const year = new Date().getFullYear()
    const [countRow] = await db
      .select({ n: count() })
      .from(purchaseRequests)
      .where(eq(purchaseRequests.companyId, companyId))

    const seq = (Number(countRow?.n ?? 0) + 1).toString().padStart(4, "0")
    const ref = "PR-" + year + "-" + seq

    const d = parsed.data
    const [record] = await db
      .insert(purchaseRequests)
      .values({
        companyId,
        requestedByUserId: userId,
        itemDescription: d.itemDescription,
        category: d.category ?? "materials",
        quantity: d.quantity !== undefined ? String(d.quantity) : "1",
        unit: d.unit ?? "buc",
        estimatedCost: d.estimatedCost !== undefined ? String(d.estimatedCost) : "0",
        currency: d.currency ?? "RON",
        urgency: d.urgency ?? "standard",
        department: d.department,
        justification: d.justification,
        projectId: d.projectId,
        status: "draft",
      })
      .returning({ id: purchaseRequests.id })

    if (!record) return NextResponse.json({ error: "Insert failed" }, { status: 500 })

    void writeAuditLog({
      companyId,
      actorId: userId,
      sessionId: ctx.session.sessionId,
      action: "procurement.create",
      entityType: "purchase_request",
      entityId: record.id,
      payload: { ref, ...d },
      method: "POST",
      path: "/api/procurement/requests",
      ipAddress: ctx.ipAddress,
      userAgent: ctx.userAgent,
    })

    return NextResponse.json({ id: record.id, ref }, { status: 201 })
  }
)
