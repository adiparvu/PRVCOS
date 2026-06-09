import { withGates } from "@/lib/with-gates"
import { NextRequest, NextResponse } from "next/server"
import type { GateContext } from "@prv/auth"
import { listConversations, createConversation } from "@prv/ai-engine"

export const dynamic = "force-dynamic"
export const runtime = "nodejs"

export const GET = withGates(
  { action: "intelligence.read", endpointClass: "api_read" },
  async (_req: NextRequest, ctx: GateContext): Promise<Response> => {
    const conversations = await listConversations(ctx.session.userId, ctx.session.companyId)
    return NextResponse.json({ conversations })
  }
)

export const POST = withGates(
  { action: "intelligence.chat", endpointClass: "api_write" },
  async (_req: NextRequest, ctx: GateContext): Promise<Response> => {
    const id = await createConversation({
      userId: ctx.session.userId,
      companyId: ctx.session.companyId,
      role: ctx.session.role,
      scopeLevel: 1,
    })
    return NextResponse.json({ id }, { status: 201 })
  }
)
