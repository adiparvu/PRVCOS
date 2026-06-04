import { withGates } from "@/lib/with-gates"
import { NextRequest, NextResponse } from "next/server"
import { eq, and, ne } from "drizzle-orm"
import { db } from "@prv/db"
import { dataErasureRequests } from "@prv/db/schema"
import { writeAuditLog } from "@prv/auth"
import { RoleSets } from "@prv/auth"
import { z } from "zod"
import type { GateContext } from "@prv/auth"

export const dynamic = "force-dynamic"
export const runtime = "nodejs"

const approveSchema = z.discriminatedUnion("approved", [
  z.object({ approved: z.literal(true) }),
  z.object({ approved: z.literal(false), rejectionReason: z.string().min(10) }),
])

function makeHandler(
  config: Parameters<typeof withGates>[0],
  handler: (
    req: NextRequest,
    ctx: GateContext,
    params: Record<string, string>
  ) => Promise<NextResponse>
) {
  return (req: NextRequest, { params }: { params: Promise<Record<string, string>> }) =>
    withGates(config, async (r, ctx) => {
      const p = await params
      return handler(r as NextRequest, ctx, p)
    })(req)
}

export const POST = makeHandler(
  {
    action: "gdpr.erasure.approve",
    endpointClass: "api_write",
    requiredRoles: RoleSets.admin,
    requiredScope: "SCOPE_COMPANY",
    requireMfa: true,
  },
  async (req, ctx, { id }) => {
    let body: unknown
    try {
      body = await req.json()
    } catch {
      return NextResponse.json({ error: "Invalid JSON" }, { status: 400 })
    }

    const parsed = approveSchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid payload", issues: parsed.error.issues },
        { status: 422 }
      )
    }

    const [existing] = await db
      .select()
      .from(dataErasureRequests)
      .where(
        and(
          eq(dataErasureRequests.id, id!),
          eq(dataErasureRequests.companyId, ctx.session.companyId)
        )
      )
      .limit(1)

    if (!existing) {
      return NextResponse.json({ error: "Erasure request not found" }, { status: 404 })
    }

    if (existing.status !== "pending") {
      return NextResponse.json(
        { error: `Cannot approve request in status: ${existing.status}` },
        { status: 409 }
      )
    }

    if (existing.requestedBy === ctx.session.userId) {
      return NextResponse.json(
        { error: "Cannot approve your own erasure request" },
        { status: 403 }
      )
    }

    const now = new Date()

    if (parsed.data.approved) {
      await db
        .update(dataErasureRequests)
        .set({
          status: "approved",
          approvedBy: ctx.session.userId,
          approvedAt: now,
          updatedAt: now,
        })
        .where(
          and(
            eq(dataErasureRequests.id, id!),
            eq(dataErasureRequests.status, "pending"),
            ne(dataErasureRequests.requestedBy, ctx.session.userId)
          )
        )

      void writeAuditLog({
        companyId: ctx.session.companyId,
        actorId: ctx.session.userId,
        sessionId: ctx.session.sessionId,
        action: "gdpr.erasure.approved",
        entityType: "data_erasure_request",
        entityId: id,
        payload: { targetUserId: existing.targetUserId },
        method: "POST",
        path: `/api/gdpr/erasure/${id}/approve`,
        ipAddress: ctx.ipAddress,
        userAgent: ctx.userAgent,
      })

      return NextResponse.json({ status: "approved" })
    } else {
      await db
        .update(dataErasureRequests)
        .set({
          status: "rejected",
          rejectedBy: ctx.session.userId,
          rejectedAt: now,
          rejectionReason: parsed.data.rejectionReason,
          updatedAt: now,
        })
        .where(eq(dataErasureRequests.id, id!))

      void writeAuditLog({
        companyId: ctx.session.companyId,
        actorId: ctx.session.userId,
        sessionId: ctx.session.sessionId,
        action: "gdpr.erasure.rejected",
        entityType: "data_erasure_request",
        entityId: id,
        payload: { reason: parsed.data.rejectionReason },
        method: "POST",
        path: `/api/gdpr/erasure/${id}/approve`,
        ipAddress: ctx.ipAddress,
        userAgent: ctx.userAgent,
      })

      return NextResponse.json({ status: "rejected" })
    }
  }
)
