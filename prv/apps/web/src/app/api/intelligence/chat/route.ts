import { withGates } from "@/lib/with-gates"
import { NextRequest, NextResponse } from "next/server"
import type { GateContext } from "@prv/auth"
import { z } from "zod"
import {
  streamChatWithHistory,
  createConversation,
  appendMessage,
  getConversationHistory,
  titleFromMessage,
} from "@prv/ai-engine"

export const dynamic = "force-dynamic"
export const runtime = "nodejs"

const bodySchema = z.object({
  message: z.string().min(1).max(2000),
  conversationId: z.string().uuid().optional(),
  agentType: z
    .enum(["general", "finance", "hr", "project", "renovation", "report_builder"])
    .default("general"),
})

export const POST = withGates(
  { action: "intelligence.chat", endpointClass: "api_write" },
  async (req: NextRequest, ctx: GateContext): Promise<Response> => {
    const raw = await req.json().catch(() => ({}))
    const parsed = bodySchema.safeParse(raw)
    if (!parsed.success) {
      return NextResponse.json({ error: "Invalid request" }, { status: 400 })
    }

    const { message, conversationId: existingConvId, agentType } = parsed.data

    // Create or reuse conversation
    const convId =
      existingConvId ??
      (await createConversation(
        {
          userId: ctx.session.userId,
          companyId: ctx.session.companyId,
          role: ctx.session.role,
          scopeLevel: 1,
        },
        titleFromMessage(message)
      ))

    // Persist user message and fetch history in parallel
    const [, history] = await Promise.all([
      appendMessage(convId, "user", message),
      getConversationHistory(convId),
    ])

    // Remove the message we just appended (it's already the last one)
    const priorHistory = history.slice(0, -1)

    // Build a stream that tees to client + collects full response for persistence
    const enc = new TextEncoder()
    let fullResponse = ""

    const aiStream = streamChatWithHistory(message, priorHistory, {
      userId: ctx.session.userId,
      companyId: ctx.session.companyId,
      role: ctx.session.role,
    })

    const { readable, writable } = new TransformStream<Uint8Array, Uint8Array>()
    const writer = writable.getWriter()

    ;(async () => {
      const reader = aiStream.getReader()
      try {
        while (true) {
          const { done, value } = await reader.read()
          if (done) break
          const text = new TextDecoder().decode(value)
          fullResponse += text
          await writer.write(enc.encode(text))
        }
        await writer.close()
      } catch (err) {
        await writer.abort(err)
      } finally {
        appendMessage(convId, "assistant", fullResponse).catch(() => {})
      }
    })()

    return new Response(readable, {
      headers: {
        "Content-Type": "text/plain; charset=utf-8",
        "Transfer-Encoding": "chunked",
        "X-Content-Type-Options": "nosniff",
        "X-Conversation-Id": convId,
      },
    })
  }
)
