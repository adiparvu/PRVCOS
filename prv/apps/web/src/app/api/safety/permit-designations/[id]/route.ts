import { withGates } from "@/lib/with-gates"
import { NextRequest, NextResponse } from "next/server"
import type { GateContext } from "@prv/auth"
import { writeAuditLog } from "@prv/auth"
import { db } from "@prv/db"
import { permitDesignations } from "@prv/db/schema"
import { and, eq } from "drizzle-orm"

export const dynamic = "force-dynamic"
export const runtime = "nodejs"

const MANAGE_ROLES = new Set(["group_ceo", "ceo", "co_ceo", "system_administrator"])

// DELETE /api/safety/permit-designations/[id] — retract a designation (owner-level).
export const DELETE = withGates(
  { action: "safety.write", endpointClass: "api_write" },
  async (req: NextRequest, ctx: GateContext): Promise<NextResponse> => {
    const { companyId, userId, role } = ctx.session
    if (!MANAGE_ROLES.has(role))
      return NextResponse.json({ error: "Not authorized to manage designations" }, { status: 403 })

    const id = req.nextUrl.pathname.split("/").pop() ?? ""
    const [existing] = await db
      .select({ id: permitDesignations.id })
      .from(permitDesignations)
      .where(and(eq(permitDesignations.id, id), eq(permitDesignations.companyId, companyId)))
      .limit(1)
    if (!existing) return NextResponse.json({ error: "Not found" }, { status: 404 })

    await db
      .delete(permitDesignations)
      .where(and(eq(permitDesignations.id, id), eq(permitDesignations.companyId, companyId)))

    void writeAuditLog({
      companyId,
      actorId: userId,
      sessionId: ctx.session.sessionId,
      action: "safety.permit_designation.delete",
      entityType: "permit_designation",
      entityId: id,
      payload: {},
      method: "DELETE",
      path: `/api/safety/permit-designations/${id}`,
      ipAddress: ctx.ipAddress,
      userAgent: ctx.userAgent,
    })

    return new NextResponse(null, { status: 204 })
  }
)
