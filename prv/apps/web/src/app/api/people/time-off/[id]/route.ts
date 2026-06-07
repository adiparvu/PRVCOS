import { withGates } from "@/lib/with-gates"
import { NextRequest, NextResponse } from "next/server"
import { z } from "zod"
import type { GateContext } from "@prv/auth"
import { writeAuditLog } from "@prv/auth"

export const dynamic = "force-dynamic"
export const runtime = "nodejs"

const bodySchema = z.object({
  action: z.enum(["approve", "decline"]),
  reason: z.string().max(500).optional(),
})

export const POST = withGates(
  { action: "hr.time_off.approve", endpointClass: "api_write" },
  async (req: NextRequest, ctx: GateContext): Promise<NextResponse> => {
    const id = req.nextUrl.pathname.split("/").slice(-2, -1)[0]
    if (!id) return NextResponse.json({ error: "Missing id" }, { status: 400 })

    const raw = await req.json().catch(() => ({}))
    const parsed = bodySchema.safeParse(raw)
    if (!parsed.success) {
      return NextResponse.json({ error: "Invalid request" }, { status: 400 })
    }

    const { action, reason } = parsed.data

    await writeAuditLog({
      actorId: ctx.session.userId,
      companyId: ctx.session.companyId,
      action: `hr.time_off.${action}`,
      entityType: "time_off_request",
      entityId: id,
      payload: { reason: reason ?? null },
      ipAddress: req.headers.get("x-forwarded-for") ?? "unknown",
      userAgent: req.headers.get("user-agent") ?? "unknown",
    })

    return NextResponse.json({ success: true, id, action })
  }
)
