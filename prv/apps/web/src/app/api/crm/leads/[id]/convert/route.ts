import { NextRequest, NextResponse } from "next/server"
import { withGates } from "@/lib/with-gates"
import type { GateContext } from "@prv/auth"
import { writeAuditLog } from "@prv/auth"
import { db } from "@prv/db"
import { clients } from "@prv/db/schema"
import { and, eq, isNull } from "drizzle-orm"

export const dynamic = "force-dynamic"
export const runtime = "nodejs"

function leadId(req: NextRequest): string {
  // /api/crm/leads/[id]/convert → id is the second-to-last segment
  return req.nextUrl.pathname.split("/").at(-2) ?? ""
}

// POST /api/crm/leads/[id]/convert — promote a lead to a customer. The lead and
// the customer are the same `clients` row: we flip status prospect → active and
// stamp the pipeline as won with a close date, preserving all history in place.
export const POST = withGates(
  { action: "crm.leads.update", endpointClass: "api_write" },
  async (req: NextRequest, ctx: GateContext): Promise<NextResponse> => {
    const id = leadId(req)
    if (!id) return NextResponse.json({ error: "Missing id" }, { status: 400 })

    const { companyId, userId: actorId, sessionId } = ctx.session

    const [existing] = await db
      .select({ metadata: clients.metadata, name: clients.name })
      .from(clients)
      .where(
        and(
          eq(clients.id, id),
          eq(clients.companyId, companyId),
          eq(clients.status, "prospect"),
          isNull(clients.deletedAt)
        )
      )
      .limit(1)
    if (!existing) return NextResponse.json({ error: "Lead not found" }, { status: 404 })

    const currentMeta = (existing.metadata ?? {}) as Record<string, unknown>
    const newMeta = {
      ...currentMeta,
      stage: "won",
      actualCloseDate: new Date().toISOString().slice(0, 10),
      convertedAt: new Date().toISOString(),
    }

    const [updated] = await db
      .update(clients)
      .set({ status: "active", metadata: newMeta, updatedAt: new Date() })
      .where(
        and(
          eq(clients.id, id),
          eq(clients.companyId, companyId),
          eq(clients.status, "prospect"),
          isNull(clients.deletedAt)
        )
      )
      .returning({ id: clients.id, name: clients.name })
    if (!updated) return NextResponse.json({ error: "Lead not found" }, { status: 404 })

    void writeAuditLog({
      companyId,
      actorId,
      sessionId,
      action: "crm.leads.convert",
      entityType: "client",
      entityId: id,
      payload: { name: updated.name },
      method: "POST",
      path: `/api/crm/leads/${id}/convert`,
      ipAddress: ctx.ipAddress,
      userAgent: ctx.userAgent,
    })

    return NextResponse.json({ id: updated.id, name: updated.name })
  }
)
