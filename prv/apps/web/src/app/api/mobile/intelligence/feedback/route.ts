import { NextRequest, NextResponse } from "next/server"
import { withMobileAuth } from "@/lib/mobile/auth"
import { addMessageFeedback } from "@prv/ai-engine"

export const dynamic = "force-dynamic"
export const runtime = "nodejs"

export const POST = withMobileAuth(async (req: NextRequest, ctx) => {
  const body = (await req.json().catch(() => ({}))) as {
    messageId?: string
    rating?: "up" | "down"
  }

  if (!body.messageId || !body.rating) {
    return NextResponse.json({ error: "Missing messageId or rating" }, { status: 400 })
  }

  if (body.rating !== "up" && body.rating !== "down") {
    return NextResponse.json({ error: "Invalid rating" }, { status: 400 })
  }

  await addMessageFeedback(body.messageId, ctx.userId, body.rating)

  return NextResponse.json({ ok: true })
})
