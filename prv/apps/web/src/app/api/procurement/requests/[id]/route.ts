import { withGates } from "@/lib/with-gates"
import { NextRequest, NextResponse } from "next/server"
import type { GateContext } from "@prv/auth"
import { writeAuditLog } from "@prv/auth"
import { z } from "zod"
import { db } from "@prv/db"
import { purchaseRequests, purchaseOrders, users, notifications } from "@prv/db/schema"
import { and, count, eq, isNull } from "drizzle-orm"

export const dynamic = "force-dynamic"
export const runtime = "nodejs"

function prId(req: NextRequest): string {
  return req.nextUrl.pathname.split("/").at(-1) ?? ""
}

// ── GET /api/procurement/requests/[id] ───────────────────────────────────────

export const GET = withGates(
  { action: "procurement.read", endpointClass: "api_read" },
  async (req: NextRequest, ctx: GateContext): Promise<NextResponse> => {
    const id = prId(req)
    if (!id) return NextResponse.json({ error: "Missing id" }, { status: 400 })

    const { companyId } = ctx.session

    const [row] = await db
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
        justification: purchaseRequests.justification,
        status: purchaseRequests.status,
        rejectionReason: purchaseRequests.rejectionReason,
        purchaseOrderId: purchaseRequests.purchaseOrderId,
        projectId: purchaseRequests.projectId,
        createdAt: purchaseRequests.createdAt,
        updatedAt: purchaseRequests.updatedAt,
        requestedByFirstName: users.firstName,
        requestedByLastName: users.lastName,
      })
      .from(purchaseRequests)
      .leftJoin(users, eq(purchaseRequests.requestedByUserId, users.id))
      .where(
        and(
          eq(purchaseRequests.id, id),
          eq(purchaseRequests.companyId, companyId),
          isNull(purchaseRequests.deletedAt)
        )
      )
      .limit(1)

    if (!row) return NextResponse.json({ error: "Not found" }, { status: 404 })

    return NextResponse.json({
      request: {
        id: row.id,
        itemDescription: row.itemDescription,
        category: row.category,
        quantity: Number(row.quantity),
        unit: row.unit,
        estimatedCost: Number(row.estimatedCost),
        currency: row.currency,
        urgency: row.urgency,
        department: row.department ?? null,
        justification: row.justification ?? null,
        status: row.status,
        rejectionReason: row.rejectionReason ?? null,
        purchaseOrderId: row.purchaseOrderId ?? null,
        projectId: row.projectId ?? null,
        requestedByName:
          row.requestedByFirstName && row.requestedByLastName
            ? row.requestedByFirstName + " " + row.requestedByLastName
            : null,
        createdAt: row.createdAt.toISOString(),
        updatedAt: row.updatedAt.toISOString(),
      },
    })
  }
)

// ── PATCH /api/procurement/requests/[id] ─────────────────────────────────────

const patchSchema = z.discriminatedUnion("action", [
  z.object({ action: z.literal("submit") }),
  z.object({ action: z.literal("approve") }),
  z.object({
    action: z.literal("reject"),
    rejectionReason: z.string().min(1).max(1000),
  }),
  z.object({ action: z.literal("convert") }),
])

type PRAction = "submit" | "approve" | "reject" | "convert"

const PR_REQUIRED_STATUS: Record<PRAction, string[]> = {
  submit: ["draft"],
  approve: ["submitted"],
  reject: ["submitted"],
  convert: ["approved"],
}

const PR_NEXT_STATUS: Record<PRAction, "submitted" | "approved" | "rejected" | "converted"> = {
  submit: "submitted",
  approve: "approved",
  reject: "rejected",
  convert: "converted",
}

export const PATCH = withGates(
  { action: "procurement.approve", endpointClass: "api_write" },
  async (req: NextRequest, ctx: GateContext): Promise<NextResponse> => {
    const id = prId(req)
    if (!id) return NextResponse.json({ error: "Missing id" }, { status: 400 })

    const { companyId, userId } = ctx.session

    const raw = await req.json().catch(() => ({}))
    const parsed = patchSchema.safeParse(raw)
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid payload", issues: parsed.error.issues },
        { status: 422 }
      )
    }

    const [existing] = await db
      .select({
        id: purchaseRequests.id,
        status: purchaseRequests.status,
        itemDescription: purchaseRequests.itemDescription,
        estimatedCost: purchaseRequests.estimatedCost,
        currency: purchaseRequests.currency,
        requestedByUserId: purchaseRequests.requestedByUserId,
      })
      .from(purchaseRequests)
      .where(
        and(
          eq(purchaseRequests.id, id),
          eq(purchaseRequests.companyId, companyId),
          isNull(purchaseRequests.deletedAt)
        )
      )
      .limit(1)

    if (!existing) return NextResponse.json({ error: "Not found" }, { status: 404 })

    const { action } = parsed.data

    if (!PR_REQUIRED_STATUS[action].includes(existing.status)) {
      return NextResponse.json(
        { error: "Cannot '" + action + "' — current status is '" + existing.status + "'" },
        { status: 409 }
      )
    }

    const nextStatus = PR_NEXT_STATUS[action]
    let createdPoId: string | null = null

    if (action === "convert") {
      // Create a draft PO from this request
      const year = new Date().getFullYear()
      const [countRow] = await db
        .select({ n: count() })
        .from(purchaseOrders)
        .where(eq(purchaseOrders.companyId, companyId))

      const seq = (Number(countRow?.n ?? 0) + 1).toString().padStart(4, "0")
      const poRef = "PO-" + year + "-" + seq
      const today = new Date().toISOString().slice(0, 10)

      const [newPO] = await db
        .insert(purchaseOrders)
        .values({
          companyId,
          createdByUserId: userId,
          ref: poRef,
          description: existing.itemDescription,
          date: today,
          amount: existing.estimatedCost,
          status: "draft",
        })
        .returning({ id: purchaseOrders.id })

      if (!newPO) return NextResponse.json({ error: "Failed to create PO" }, { status: 500 })
      createdPoId = newPO.id

      await db
        .update(purchaseRequests)
        .set({
          status: nextStatus,
          purchaseOrderId: createdPoId,
          updatedAt: new Date(),
        })
        .where(and(eq(purchaseRequests.id, id), eq(purchaseRequests.companyId, companyId)))
    } else if (action === "approve") {
      await db
        .update(purchaseRequests)
        .set({ status: nextStatus, approvedByUserId: userId, updatedAt: new Date() })
        .where(and(eq(purchaseRequests.id, id), eq(purchaseRequests.companyId, companyId)))
    } else if (action === "reject" && parsed.data.action === "reject") {
      await db
        .update(purchaseRequests)
        .set({
          status: nextStatus,
          rejectionReason: parsed.data.rejectionReason,
          updatedAt: new Date(),
        })
        .where(and(eq(purchaseRequests.id, id), eq(purchaseRequests.companyId, companyId)))
    } else {
      await db
        .update(purchaseRequests)
        .set({ status: nextStatus, updatedAt: new Date() })
        .where(and(eq(purchaseRequests.id, id), eq(purchaseRequests.companyId, companyId)))
    }

    // Notify the requester of the decision on their purchase request. The
    // recipient is the unambiguous submitter; skipped when they performed the
    // action themselves (e.g. self-submit) and when no requester is recorded.
    // 'submit' is the requester's own step, so it raises no notification.
    if (
      action !== "submit" &&
      existing.requestedByUserId &&
      existing.requestedByUserId !== userId
    ) {
      const item = existing.itemDescription
      const notice =
        action === "approve"
          ? {
              type: "success" as const,
              title: "Cerere de achiziție aprobată",
              body: `Cererea „${item}" a fost aprobată.`,
            }
          : action === "reject"
            ? {
                type: "warning" as const,
                title: "Cerere de achiziție respinsă",
                body: `Cererea „${item}" a fost respinsă. Motiv: ${
                  parsed.data.action === "reject" ? parsed.data.rejectionReason : "—"
                }`,
              }
            : {
                type: "info" as const,
                title: "Cerere convertită în comandă",
                body: `Cererea „${item}" a fost convertită în comandă de achiziție.`,
              }

      await db.insert(notifications).values({
        userId: existing.requestedByUserId,
        companyId,
        type: notice.type,
        channel: "in_app",
        title: notice.title.slice(0, 500),
        body: notice.body,
        entityType: "purchase_request",
        entityId: id,
        actionUrl: `/procurement/requests/${id}`,
        deliveredAt: new Date(),
      })
    }

    void writeAuditLog({
      companyId,
      actorId: userId,
      sessionId: ctx.session.sessionId,
      action: "procurement.approve",
      entityType: "purchase_request",
      entityId: id,
      payload: {
        action,
        from: existing.status,
        to: nextStatus,
        ...(createdPoId ? { createdPoId } : {}),
      },
      method: "PATCH",
      path: "/api/procurement/requests/" + id,
      ipAddress: ctx.ipAddress,
      userAgent: ctx.userAgent,
    })

    return NextResponse.json({ id, status: nextStatus, purchaseOrderId: createdPoId })
  }
)
