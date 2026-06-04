import { withGates } from "@/lib/with-gates"
import { NextRequest, NextResponse } from "next/server"
import { eq, and } from "drizzle-orm"
import { db } from "@prv/db"
import {
  dataErasureRequests,
  users,
  userMfaMethods,
  userDevices,
  userAuditLog,
} from "@prv/db/schema"
import { writeAuditLog, sha256hex } from "@prv/auth"
import { RoleSets } from "@prv/auth"
import type { GateContext } from "@prv/auth"

export const dynamic = "force-dynamic"
export const runtime = "nodejs"

interface TableErasureRecord {
  table: string
  action: "anonymized" | "deleted"
  rowsAffected: number
}

async function runErasurePipeline(
  targetUserId: string,
  companyId: string
): Promise<TableErasureRecord[]> {
  const log: TableErasureRecord[] = []
  const erasedEmail = `erased-${targetUserId}@gdpr.erased.prv`
  const now = new Date()

  const userResult = await db
    .update(users)
    .set({
      email: erasedEmail,
      phone: null,
      firstName: "ERASED",
      lastName: "ERASED",
      bio: null,
      avatarUrl: null,
      employeeId: null,
      isActive: false,
      deletedAt: now,
      updatedAt: now,
    })
    .where(and(eq(users.id, targetUserId), eq(users.companyId, companyId)))
    .returning({ id: users.id })

  log.push({ table: "users", action: "anonymized", rowsAffected: userResult.length })

  const mfaResult = await db
    .delete(userMfaMethods)
    .where(eq(userMfaMethods.userId, targetUserId))
    .returning({ id: userMfaMethods.id })

  log.push({ table: "user_mfa_methods", action: "deleted", rowsAffected: mfaResult.length })

  const devicesResult = await db
    .delete(userDevices)
    .where(eq(userDevices.userId, targetUserId))
    .returning({ id: userDevices.id })

  log.push({ table: "user_devices", action: "deleted", rowsAffected: devicesResult.length })

  const auditResult = await db
    .update(userAuditLog)
    .set({ ipAddress: null, userAgent: null })
    .where(eq(userAuditLog.targetUserId, targetUserId))
    .returning({ id: userAuditLog.id })

  log.push({ table: "user_audit_log", action: "anonymized", rowsAffected: auditResult.length })

  return log
}

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
    action: "gdpr.erasure.execute",
    endpointClass: "api_write",
    requiredRoles: RoleSets.admin,
    requiredScope: "SCOPE_COMPANY",
    requireMfa: true,
    requireReauth: true,
  },
  async (_req, ctx, { id }) => {
    const [request] = await db
      .select()
      .from(dataErasureRequests)
      .where(
        and(
          eq(dataErasureRequests.id, id!),
          eq(dataErasureRequests.companyId, ctx.session.companyId)
        )
      )
      .limit(1)

    if (!request) {
      return NextResponse.json({ error: "Erasure request not found" }, { status: 404 })
    }

    if (request.status !== "approved") {
      return NextResponse.json(
        { error: `Cannot execute request in status: ${request.status}` },
        { status: 409 }
      )
    }

    const locked = await db
      .update(dataErasureRequests)
      .set({ status: "executing", executedAt: new Date(), updatedAt: new Date() })
      .where(and(eq(dataErasureRequests.id, id!), eq(dataErasureRequests.status, "approved")))
      .returning({ id: dataErasureRequests.id })

    if (locked.length === 0) {
      return NextResponse.json({ error: "Erasure already executing or completed" }, { status: 409 })
    }

    try {
      const erasureLog = await runErasurePipeline(request.targetUserId, ctx.session.companyId)

      const completedAt = new Date()
      const verificationInput = [
        request.targetUserId,
        completedAt.toISOString(),
        JSON.stringify(erasureLog),
      ].join("|")
      const verificationHash = await sha256hex(verificationInput)

      await db
        .update(dataErasureRequests)
        .set({
          status: "completed",
          completedAt,
          verificationHash,
          erasureLog: erasureLog as unknown as Record<string, unknown>,
          updatedAt: completedAt,
        })
        .where(eq(dataErasureRequests.id, id!))

      void writeAuditLog({
        companyId: ctx.session.companyId,
        actorId: ctx.session.userId,
        sessionId: ctx.session.sessionId,
        action: "gdpr.erasure.completed",
        entityType: "data_erasure_request",
        entityId: id,
        payload: { targetUserId: request.targetUserId, verificationHash, tables: erasureLog },
        method: "POST",
        path: `/api/gdpr/erasure/${id}/execute`,
        ipAddress: ctx.ipAddress,
        userAgent: ctx.userAgent,
      })

      return NextResponse.json({
        verificationHash,
        completedAt: completedAt.toISOString(),
        erasureLog,
      })
    } catch (err) {
      await db
        .update(dataErasureRequests)
        .set({ status: "failed", updatedAt: new Date() })
        .where(eq(dataErasureRequests.id, id!))

      return NextResponse.json(
        {
          error: "Erasure pipeline failed",
          detail: err instanceof Error ? err.message : String(err),
        },
        { status: 500 }
      )
    }
  }
)
