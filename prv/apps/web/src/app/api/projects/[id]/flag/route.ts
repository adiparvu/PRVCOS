import { withGates } from "@/lib/with-gates"
import { NextRequest, NextResponse } from "next/server"
import { z } from "zod"
import type { GateContext } from "@prv/auth"
import { writeAuditLog } from "@prv/auth"

export const dynamic = "force-dynamic"
export const runtime = "nodejs"

const bodySchema = z.object({
  type: z.enum(["budget_risk", "delay", "quality"]),
  severity: z.enum(["low", "medium", "high"]),
  note: z.string().max(500),
})

export const POST = withGates(
  { action: "projects.flag.write", endpointClass: "api_write" },
  async (req: NextRequest, ctx: GateContext): Promise<NextResponse> => {
    const id = req.nextUrl.pathname.split("/").slice(-3, -2)[0]
    if (!id) return NextResponse.json({ error: "Missing id" }, { status: 400 })

    const raw = await req.json().catch(() => ({}))
    const parsed = bodySchema.safeParse(raw)
    if (!parsed.success) return NextResponse.json({ error: "Invalid request" }, { status: 400 })

    const { type, severity, note } = parsed.data

    await writeAuditLog({
      actorId: ctx.session.userId,
      companyId: ctx.session.companyId,
      action: `projects.flag.${type}`,
      entityType: "project",
      entityId: id,
      payload: { type, severity, note },
      ipAddress: req.headers.get("x-forwarded-for") ?? "unknown",
      userAgent: req.headers.get("user-agent") ?? "unknown",
    })

    return NextResponse.json({ success: true, id, type, severity })
  }
)
