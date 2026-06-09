import { withGates } from "@/lib/with-gates"
import { NextRequest, NextResponse } from "next/server"
import type { GateContext } from "@prv/auth"
import { getConversationHistory, deleteConversation } from "@prv/ai-engine"

export const dynamic = "force-dynamic"
export const runtime = "nodejs"

export const GET = withGates(
  { action: "intelligence.read", endpointClass: "api_read" },
  async (
    _req: NextRequest,
    ctx: GateContext,
    { params }: { params: { id: string } }
  ): Promise<Response> => {
    const messages = await getConversationHistory(params.id)
    return NextResponse.json({ messages })
  }
)

export const DELETE = withGates(
  { action: "intelligence.chat", endpointClass: "api_write" },
  async (
    _req: NextRequest,
    ctx: GateContext,
    { params }: { params: { id: string } }
  ): Promise<Response> => {
    const deleted = await deleteConversation(params.id, ctx.session.userId)
    if (!deleted) {
      return NextResponse.json({ error: "Not found" }, { status: 404 })
    }
    return new NextResponse(null, { status: 204 })
  }
)
