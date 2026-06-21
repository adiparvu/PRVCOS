import { withGates } from "@/lib/with-gates"
import { NextRequest, NextResponse } from "next/server"
import type { GateContext } from "@prv/auth"
import { z } from "zod"
import { addMessageFeedback } from "@prv/ai-engine"

export const dynamic = "force-dynamic"
export const runtime = "nodejs"

const bodySchema = z.object({
  messageId: z.string().uuid(),
  rating: z.enum(["up", "down"]),
})

export const POST = withGates(
  { action: "intelligence.chat", endpointClass: "api_write" },
  async (req: NextRequest, ctx: GateContext): Promise<Response> => {
    const raw = await req.json().catch(() => ({}))
    const parsed = bodySchema.safeParse(raw)
    if (!parsed.success) {
      return NextResponse.json({ error: "Invalid request" }, { status: 400 })
    }
    const { messageId, rating } = parsed.data
    await addMessageFeedback(messageId, ctx.session.userId, rating)
    return NextResponse.json({ ok: true })
  }
)
