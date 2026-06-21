import { withGates } from "@/lib/with-gates"
import { NextRequest, NextResponse } from "next/server"
import type { GateContext } from "@prv/auth"
import { z } from "zod"
import { buildReportQuery } from "@prv/ai-engine"

export const dynamic = "force-dynamic"
export const runtime = "nodejs"

const bodySchema = z.object({
  description: z.string().min(3).max(500),
})

export const POST = withGates(
  { action: "intelligence.read", endpointClass: "api_write" },
  async (req: NextRequest, ctx: GateContext): Promise<Response> => {
    const raw = await req.json().catch(() => ({}))
    const parsed = bodySchema.safeParse(raw)
    if (!parsed.success) {
      return NextResponse.json({ error: "Invalid request" }, { status: 400 })
    }
    const { description } = parsed.data
    const result = await buildReportQuery(description, {
      userId: ctx.session.userId,
      companyId: ctx.session.companyId,
      role: ctx.session.role,
    })
    return NextResponse.json(result)
  }
)
