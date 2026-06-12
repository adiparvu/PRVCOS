import { withGates } from "@/lib/with-gates"
import { NextRequest, NextResponse } from "next/server"
import type { GateContext } from "@prv/auth"
import { writeAuditLog } from "@prv/auth"
import { db } from "@prv/db"
import { purchaseOrders, users, projects } from "@prv/db/schema"
import { and, eq, isNull } from "drizzle-orm"
import { z } from "zod"
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
        text: `Order ${row.ref} created${requestedBy ? ` by ${requestedBy}` : ""}`,
        timestamp: row.createdAt.toISOString(),
      },
    ]
    if (row.status === "pending" || row.status === "approved") {
      activities.push({
        id: "a-submitted",
        type: "submitted",
        text: `PO submitted for approval`,
        timestamp: row.createdAt.toISOString(),
      })
    }
    if (row.status === "approved") {
      activities.push({
        id: "a-approved",
        type: "approved",
        text: "Order approved",
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

// ─── Exported state machine helpers ──────────────────────────────────────────

export type POAction = "submit" | "approve" | "reject" | "mark_received"

export const PO_REQUIRED_STATUS: Record<POAction, string[]> = {
  submit: ["draft"],
  approve: ["pending"],
  reject: ["pending"],
  mark_received: ["approved", "in_transit"],
}

export const PO_NEXT_STATUS: Record<POAction, string> = {
  submit: "pending",
  approve: "approved",
  reject: "rejected",
  mark_received: "received",
}

export function isValidPOTransition(action: POAction, currentStatus: string): boolean {
  return PO_REQUIRED_STATUS[action].includes(currentStatus)
}

// ─── PATCH /api/procurement/[id] ─────────────────────────────────────────────

const patchSchema = z.discriminatedUnion("action", [
  z.object({ action: z.literal("submit"), notes: z.string().max(500).optional() }),
  z.object({ action: z.literal("approve"), notes: z.string().max(500).optional() }),
  z.object({ action: z.literal("reject"), notes: z.string().max(500).optional() }),
  z.object({ action: z.literal("mark_received"), notes: z.string().max(500).optional() }),
])

export const PATCH = withGates(
  { action: "procurement.approve", endpointClass: "api_write" },
  async (req: NextRequest, ctx: GateContext): Promise<NextResponse> => {
    const { companyId, userId } = ctx.session
    const id = req.nextUrl.pathname.split("/").pop()
    if (!id) return NextResponse.json({ error: "Missing id" }, { status: 400 })

    const raw = await req.json().catch(() => ({}))
    const parsed = patchSchema.safeParse(raw)
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid payload", issues: parsed.error.issues },
        { status: 422 }
      )
    }

    const [existing] = await db
      .select({ id: purchaseOrders.id, status: purchaseOrders.status, ref: purchaseOrders.ref })
      .from(purchaseOrders)
      .where(
        and(
          eq(purchaseOrders.id, id),
          eq(purchaseOrders.companyId, companyId),
          isNull(purchaseOrders.deletedAt)
        )
      )
      .limit(1)

    if (!existing) return NextResponse.json({ error: "Not found" }, { status: 404 })

    if (!isValidPOTransition(parsed.data.action, existing.status)) {
      return NextResponse.json(
        { error: `Cannot '${parsed.data.action}' — current status is '${existing.status}'` },
        { status: 409 }
      )
    }

    const nextStatus = PO_NEXT_STATUS[parsed.data.action] as
      | "pending"
      | "approved"
      | "rejected"
      | "received"

    const [updated] = await db
      .update(purchaseOrders)
      .set({
        status: nextStatus,
        ...(parsed.data.notes !== undefined ? { notes: parsed.data.notes } : {}),
        updatedAt: new Date(),
      })
      .where(and(eq(purchaseOrders.id, id), eq(purchaseOrders.companyId, companyId)))
      .returning({ id: purchaseOrders.id, status: purchaseOrders.status })

    void writeAuditLog({
      companyId,
      actorId: userId,
      sessionId: ctx.session.sessionId,
      action: "procurement.approve",
      entityType: "purchase_order",
      entityId: id,
      payload: { ref: existing.ref, from: existing.status, to: nextStatus, op: parsed.data.action },
      method: "PATCH",
      path: `/api/procurement/${id}`,
      ipAddress: ctx.ipAddress,
      userAgent: ctx.userAgent,
    })

    return NextResponse.json(updated)
  }
)

// ─── DELETE /api/procurement/[id] ────────────────────────────────────────────

export const DELETE = withGates(
  { action: "procurement.delete", endpointClass: "api_write" },
  async (req: NextRequest, ctx: GateContext): Promise<NextResponse> => {
    const { companyId, userId } = ctx.session
    const id = req.nextUrl.pathname.split("/").pop()
    if (!id) return NextResponse.json({ error: "Missing id" }, { status: 400 })

    const [existing] = await db
      .select({ id: purchaseOrders.id, status: purchaseOrders.status, ref: purchaseOrders.ref })
      .from(purchaseOrders)
      .where(
        and(
          eq(purchaseOrders.id, id),
          eq(purchaseOrders.companyId, companyId),
          isNull(purchaseOrders.deletedAt)
        )
      )
      .limit(1)

    if (!existing) return NextResponse.json({ error: "Not found" }, { status: 404 })

    if (!["draft", "rejected"].includes(existing.status)) {
      return NextResponse.json(
        { error: `Cannot delete a PO with status '${existing.status}'` },
        { status: 409 }
      )
    }

    await db
      .update(purchaseOrders)
      .set({ deletedAt: new Date(), updatedAt: new Date() })
      .where(and(eq(purchaseOrders.id, id), eq(purchaseOrders.companyId, companyId)))

    void writeAuditLog({
      companyId,
      actorId: userId,
      sessionId: ctx.session.sessionId,
      action: "procurement.delete",
      entityType: "purchase_order",
      entityId: id,
      payload: { ref: existing.ref },
      method: "DELETE",
      path: `/api/procurement/${id}`,
      ipAddress: ctx.ipAddress,
      userAgent: ctx.userAgent,
    })

    return new NextResponse(null, { status: 204 })
  }
)
