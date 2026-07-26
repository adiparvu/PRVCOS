import { NextRequest, NextResponse } from "next/server"
import { withMobileAuth } from "@/lib/mobile/auth"
import { db } from "@prv/db"
import { users } from "@prv/db/schema"
import { and, eq } from "drizzle-orm"
import { writeAuditLog } from "@prv/auth"
import { runErasurePipeline } from "@/lib/gdpr-erasure"

export const dynamic = "force-dynamic"
export const runtime = "nodejs"

// ─── DELETE /api/mobile/account — self-service account deletion ──────────────
//
// Mobile counterpart of DELETE /api/me. Required by Apple App Store Guideline
// 5.1.1(v): an app offering account creation must let the user delete their
// account from within the app. Keyed strictly to the caller's own token — no
// target id is accepted — and runs the shared anonymization pipeline so the
// scrub is identical to the web and admin GDPR paths.
export const DELETE = withMobileAuth(async (req: NextRequest, ctx) => {
  const ipAddress =
    req.headers.get("x-real-ip") ??
    req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ??
    "unknown"

  const [existing] = await db
    .select({ id: users.id, deletedAt: users.deletedAt })
    .from(users)
    .where(and(eq(users.id, ctx.userId), eq(users.companyId, ctx.companyId)))
    .limit(1)

  if (!existing) return NextResponse.json({ error: "Not found" }, { status: 404 })
  if (existing.deletedAt)
    return NextResponse.json({ error: "Account already deleted" }, { status: 409 })

  const erasureLog = await runErasurePipeline(ctx.userId, ctx.companyId)

  void writeAuditLog({
    companyId: ctx.companyId,
    actorId: ctx.userId,
    sessionId: ctx.sessionId,
    action: "user.account.self_delete",
    entityType: "user",
    entityId: ctx.userId,
    method: "DELETE",
    path: "/api/mobile/account",
    ipAddress,
    userAgent: req.headers.get("user-agent") ?? "",
    payload: { erasureLog },
  })

  return new NextResponse(null, { status: 204 })
})
