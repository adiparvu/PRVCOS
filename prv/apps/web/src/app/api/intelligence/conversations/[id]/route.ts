import { withGates } from "@/lib/with-gates"
import { NextRequest, NextResponse } from "next/server"
import type { GateContext } from "@prv/auth"
import { getConversationHistory, deleteConversation } from "@prv/ai-engine"

export const dynamic = "force-dynamic"
export const runtime = "nodejs"

export const GET = withGates(
  { action: "intelligence.read", endpointClass: "api_read" },
  async (req: NextRequest, _ctx: GateContext): Promise<Response> => {
    const id = req.nextUrl.pathname.split("/").pop()!
    const messages = await getConversationHistory(id)
    return NextResponse.json({ messages })
  }
)

export const DELETE = withGates(
  { action: "intelligence.chat", endpointClass: "api_write" },
  async (req: NextRequest, ctx: GateContext): Promise<Response> => {
    const id = req.nextUrl.pathname.split("/").pop()!
    const deleted = await deleteConversation(id, ctx.session.userId)
    if (!deleted) {
      return NextResponse.json({ error: "Not found" }, { status: 404 })
    }
    return new NextResponse(null, { status: 204 })
  }
)
