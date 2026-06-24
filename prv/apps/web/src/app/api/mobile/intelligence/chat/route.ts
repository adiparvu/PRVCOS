import { NextRequest, NextResponse } from "next/server"
import { withMobileAuth } from "@/lib/mobile/auth"
import { db } from "@prv/db"
import { aiConversations, aiMessages } from "@prv/db/schema"
import {
  AGENT_SYSTEM_PROMPTS,
  buildAnthropicMessages,
  getConversationHistory,
  logUsage,
  titleFromMessage,
  type AgentType,
} from "@prv/ai-engine"
import { and, desc, eq, isNull } from "drizzle-orm"
import Anthropic from "@anthropic-ai/sdk"

export const dynamic = "force-dynamic"
export const runtime = "nodejs"

const MODEL = "claude-sonnet-4-6"

const MOBILE_AGENT_MAP: Record<string, AgentType> = {
  General: "general",
  Finance: "finance",
  HR: "hr",
  Projects: "project",
  Renovation: "renovation",
  "Report Builder": "report_builder",
}

export const POST = withMobileAuth(async (req: NextRequest, ctx) => {
  const { userId, companyId } = ctx

  const body = (await req.json().catch(() => ({}))) as {
    message?: string
    agentType?: string
  }

  const message = (body.message ?? "").trim()
  if (!message) {
    return NextResponse.json({ error: "Missing message" }, { status: 400 })
  }

  const agentType: AgentType = MOBILE_AGENT_MAP[body.agentType ?? ""] ?? "general"
  const systemPrompt = AGENT_SYSTEM_PROMPTS[agentType]

  // Find or create conversation for this user + agent type
  const existing = await db
    .select({ id: aiConversations.id })
    .from(aiConversations)
    .where(
      and(
        eq(aiConversations.userId, userId),
        eq(aiConversations.companyId, companyId),
        eq(aiConversations.agentType, agentType),
        isNull(aiConversations.deletedAt)
      )
    )
    .orderBy(desc(aiConversations.updatedAt))
    .limit(1)

  let conversationId: string
  if (existing[0]) {
    conversationId = existing[0].id
  } else {
    const [conv] = await db
      .insert(aiConversations)
      .values({
        userId,
        companyId,
        agentType,
        title: titleFromMessage(message),
      })
      .returning({ id: aiConversations.id })
    conversationId = conv!.id
  }

  // Get history and build messages for Anthropic
  const history = await getConversationHistory(conversationId)
  const anthropicMessages = buildAnthropicMessages(history, message)

  const apiKey = process.env.ANTHROPIC_API_KEY
  if (!apiKey) {
    return NextResponse.json({ error: "AI not configured" }, { status: 503 })
  }

  const client = new Anthropic({ apiKey })

  let reply = "Unable to get a response. Please try again."
  let inputTokens = 0
  let outputTokens = 0

  try {
    const response = await client.messages.create({
      model: MODEL,
      max_tokens: 1024,
      system: systemPrompt,
      messages: anthropicMessages,
    })

    reply = response.content[0]?.type === "text" ? response.content[0].text : reply
    inputTokens = response.usage.input_tokens
    outputTokens = response.usage.output_tokens
  } catch {
    // return error reply below
  }

  // Persist user message
  await db.insert(aiMessages).values({
    conversationId,
    role: "user",
    content: message,
    inputTokens,
  })

  // Persist assistant reply and capture message ID
  const [inserted] = await db
    .insert(aiMessages)
    .values({
      conversationId,
      role: "assistant",
      content: reply,
      outputTokens,
    })
    .returning({ id: aiMessages.id })

  // Update conversation timestamp
  await db
    .update(aiConversations)
    .set({ updatedAt: new Date() })
    .where(eq(aiConversations.id, conversationId))

  // Log usage (non-blocking)
  void logUsage({
    companyId,
    userId,
    conversationId,
    agentType,
    model: MODEL,
    inputTokens,
    outputTokens,
  })

  return NextResponse.json({ reply, messageId: inserted?.id ?? null })
})
