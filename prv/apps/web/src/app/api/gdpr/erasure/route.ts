import { withGates } from "@/lib/with-gates"
import { NextRequest, NextResponse } from "next/server"
import { db } from "@prv/db"
import { dataErasureRequests } from "@prv/db/schema"
import { writeAuditLog } from "@prv/auth"
import { RoleSets } from "@prv/auth"
import { z } from "zod"
import type { GateContext } from "@prv/auth"

export const dynamic = "force-dynamic"
export const runtime = "nodejs"

const createSchema = z.object({
  targetUserId: z.string().uuid(),
  requestReason: z.string().min(20, "Request reason must be at least 20 characters"),
  gdprBasis: z
    .enum(["right_to_erasure", "withdrawal_of_consent", "unlawful_processing", "legal_obligation"])
    .optional()
    .default("right_to_erasure"),
})

export const POST = withGates(
  {
    action: "gdpr.erasure.request",
    endpointClass: "api_write",
    requiredRoles: RoleSets.admin,
    requiredScope: "SCOPE_COMPANY",
    requireMfa: true,
  },
  async (req: NextRequest, ctx: GateContext): Promise<NextResponse> => {
    let body: unknown
    try {
      body = await req.json()
    } catch {
      return NextResponse.json({ error: "Invalid JSON" }, { status: 400 })
    }

    const parsed = createSchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid payload", issues: parsed.error.issues },
        { status: 422 }
      )
    }

    const [request] = await db
      .insert(dataErasureRequests)
      .values({
        companyId: ctx.session.companyId,
        requestedBy: ctx.session.userId,
        targetUserId: parsed.data.targetUserId,
        requestReason: parsed.data.requestReason,
        gdprBasis: parsed.data.gdprBasis,
      })
      .returning({
        id: dataErasureRequests.id,
        status: dataErasureRequests.status,
      })

    void writeAuditLog({
      companyId: ctx.session.companyId,
      actorId: ctx.session.userId,
      sessionId: ctx.session.sessionId,
      action: "gdpr.erasure.request",
      entityType: "data_erasure_request",
      entityId: request!.id,
      payload: { targetUserId: parsed.data.targetUserId, basis: parsed.data.gdprBasis },
      method: "POST",
      path: "/api/gdpr/erasure",
      ipAddress: ctx.ipAddress,
      userAgent: ctx.userAgent,
    })

    return NextResponse.json({ id: request!.id, status: request!.status }, { status: 201 })
  }
)
