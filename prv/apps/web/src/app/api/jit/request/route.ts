import { withGates } from "@/lib/with-gates"
import { NextRequest, NextResponse } from "next/server"
import { db } from "@prv/db"
import { sysadminAccessSessions } from "@prv/db/schema"
import { writeAuditLog } from "@prv/auth"
import { RoleSets } from "@prv/auth"
import { z } from "zod"
import type { GateContext } from "@prv/auth"

export const dynamic = "force-dynamic"
export const runtime = "nodejs"

const requestSchema = z.object({
  justification: z.string().min(20, "Justification must be at least 20 characters"),
  targetCompanyId: z.string().uuid().optional(),
})

export const POST = withGates(
  {
    action: "jit.request",
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

    const parsed = requestSchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid payload", issues: parsed.error.issues },
        { status: 422 }
      )
    }

    const [session] = await db
      .insert(sysadminAccessSessions)
      .values({
        requestedBy: ctx.session.userId,
        companyId: parsed.data.targetCompanyId ?? ctx.session.companyId,
        justification: parsed.data.justification,
      })
      .returning({ id: sysadminAccessSessions.id, status: sysadminAccessSessions.status })

    void writeAuditLog({
      companyId: ctx.session.companyId,
      actorId: ctx.session.userId,
      sessionId: ctx.session.sessionId,
      action: "jit.request",
      entityType: "sysadmin_access_session",
      entityId: session!.id,
      method: "POST",
      path: "/api/jit/request",
      ipAddress: ctx.ipAddress,
      userAgent: ctx.userAgent,
    })

    return NextResponse.json({ id: session!.id, status: session!.status }, { status: 201 })
  }
)
