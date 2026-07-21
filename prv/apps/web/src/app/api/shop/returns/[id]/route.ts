import { NextRequest, NextResponse } from "next/server"
import { withGates } from "@/lib/with-gates"
import type { GateContext } from "@prv/auth"
import { writeAuditLog } from "@prv/auth"
import { db } from "@prv/db"
import { orderReturns, notifications } from "@prv/db/schema"
import { and, eq } from "drizzle-orm"
import { z } from "zod"
import { isValidReturnTransition } from "@/lib/returns"

export const dynamic = "force-dynamic"
export const runtime = "nodejs"

function id(req: NextRequest): string {
  return req.nextUrl.pathname.split("/").at(-1) ?? ""
}

// PATCH /api/shop/returns/[id] — advance the return status through the workflow
// (requested → approved → received → refunded, or rejected).
const patchSchema = z.object({
  status: z.enum(["approved", "received", "refunded", "rejected"]),
})

export const PATCH = withGates(
  { action: "shop.orders.update", endpointClass: "api_write" },
  async (req: NextRequest, ctx: GateContext): Promise<NextResponse> => {
    const rowId = id(req)
    if (!rowId) return NextResponse.json({ error: "Missing id" }, { status: 400 })

    const { companyId, userId: actorId, sessionId } = ctx.session

    let raw: unknown
    try {
      raw = await req.json()
    } catch {
      return NextResponse.json({ error: "Invalid JSON" }, { status: 400 })
    }

    const parsed = patchSchema.safeParse(raw)
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.flatten() }, { status: 422 })
    }

    const [current] = await db
      .select({
        status: orderReturns.status,
        createdById: orderReturns.createdById,
        returnNumber: orderReturns.returnNumber,
      })
      .from(orderReturns)
      .where(and(eq(orderReturns.id, rowId), eq(orderReturns.companyId, companyId)))
      .limit(1)
    if (!current) return NextResponse.json({ error: "Return not found" }, { status: 404 })

    if (!isValidReturnTransition(current.status, parsed.data.status)) {
      return NextResponse.json(
        {
          error: `Cannot move a ${current.status} return to ${parsed.data.status}`,
          code: "INVALID_TRANSITION",
        },
        { status: 409 }
      )
    }

    const [updated] = await db
      .update(orderReturns)
      .set({ status: parsed.data.status, updatedAt: new Date() })
      .where(and(eq(orderReturns.id, rowId), eq(orderReturns.companyId, companyId)))
      .returning({ id: orderReturns.id, status: orderReturns.status })

    // Notify the filing user of the decision on their return. The recipient is
    // the unambiguous creator; skipped when they performed the transition
    // themselves and when no creator is recorded.
    if (current.createdById && current.createdById !== actorId) {
      const rn = current.returnNumber
      const notice =
        parsed.data.status === "approved"
          ? {
              type: "success" as const,
              title: "Retur aprobat",
              body: `Returul ${rn} a fost aprobat.`,
            }
          : parsed.data.status === "received"
            ? {
                type: "info" as const,
                title: "Retur recepționat",
                body: `Returul ${rn} a fost recepționat.`,
              }
            : parsed.data.status === "refunded"
              ? {
                  type: "success" as const,
                  title: "Retur rambursat",
                  body: `Returul ${rn} a fost rambursat.`,
                }
              : {
                  type: "warning" as const,
                  title: "Retur respins",
                  body: `Returul ${rn} a fost respins.`,
                }

      await db.insert(notifications).values({
        userId: current.createdById,
        companyId,
        type: notice.type,
        channel: "in_app",
        title: notice.title.slice(0, 500),
        body: notice.body,
        entityType: "order_return",
        entityId: rowId,
        actionUrl: "/commerce/returns",
        deliveredAt: new Date(),
      })
    }

    void writeAuditLog({
      companyId,
      actorId,
      sessionId,
      action: "shop.orders.return.transition",
      entityType: "order_return",
      entityId: rowId,
      payload: { from: current.status, to: parsed.data.status },
      method: "PATCH",
      path: `/api/shop/returns/${rowId}`,
      ipAddress: ctx.ipAddress,
      userAgent: ctx.userAgent,
    })

    return NextResponse.json({ id: updated?.id, status: updated?.status })
  }
)
