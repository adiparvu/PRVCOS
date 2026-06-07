import { withGates } from "@/lib/with-gates"
import { NextRequest, NextResponse } from "next/server"
import { z } from "zod"
import type { GateContext } from "@prv/auth"
import { writeAuditLog } from "@prv/auth"

export const dynamic = "force-dynamic"
export const runtime = "nodejs"

const bodySchema = z.object({
  projectName: z.string().min(1).max(200).optional(),
  note: z.string().max(500).optional(),
})

export const POST = withGates(
  { action: "crm.quotes.convert.write", endpointClass: "api_write" },
  async (req: NextRequest, ctx: GateContext): Promise<NextResponse> => {
    const id = req.nextUrl.pathname.split("/").slice(-3, -2)[0]
    if (!id) return NextResponse.json({ error: "Missing id" }, { status: 400 })

    const raw = await req.json().catch(() => ({}))
    const parsed = bodySchema.safeParse(raw)
    if (!parsed.success) return NextResponse.json({ error: "Invalid request" }, { status: 400 })

    const { projectName, note } = parsed.data

    await writeAuditLog({
      actorId: ctx.session.userId,
      companyId: ctx.session.companyId,
      action: "crm.quote.converted",
      resourceType: "quote",
      resourceId: id,
      metadata: { projectName: projectName ?? null, note: note ?? null },
      ipAddress: req.headers.get("x-forwarded-for") ?? "unknown",
      userAgent: req.headers.get("user-agent") ?? "unknown",
    })

    return NextResponse.json({ success: true, id, projectName })
  }
)
