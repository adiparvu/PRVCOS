import { NextRequest, NextResponse } from "next/server"
import { withGates } from "@/lib/with-gates"
import type { GateContext } from "@prv/auth"
import { writeAuditLog } from "@prv/auth"
import { db } from "@prv/db"
import { orderReturns } from "@prv/db/schema"
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
      .select({ status: orderReturns.status })
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
