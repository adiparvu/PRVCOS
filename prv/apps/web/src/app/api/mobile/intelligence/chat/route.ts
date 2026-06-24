import { NextRequest, NextResponse } from "next/server"
import { withMobileAuth } from "@/lib/mobile/auth"
import { db } from "@prv/db"
import { aiConversations, aiMessages } from "@prv/db/schema"
import { and, asc, desc, eq, isNull } from "drizzle-orm"
import Anthropic from "@anthropic-ai/sdk"
import {
  AGENT_SYSTEM_PROMPTS,
  buildAnthropicMessages,
  logUsage,
  titleFromMessage,
  type AgentType,
  type ConversationMessage,
} from "@prv/ai-engine"

export const dynamic = "force-dynamic"
export const runtime = "nodejs"

const MODEL = "claude-sonnet-4-6"
const MAX_HISTORY = 20

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

  const userMessage = body.message?.trim()
  if (!userMessage) {
    return NextResponse.json({ error: "Missing message" }, { status: 400 })
  }

  const agentType: AgentType = MOBILE_AGENT_MAP[body.agentType ?? "General"] ?? "general"
  const systemPrompt = AGENT_SYSTEM_PROMPTS[agentType]

  // Find or create a conversation for this user + agentType
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

  if (existing.length > 0) {
    conversationId = existing[0]!.id
  } else {
    const [conv] = await db
      .insert(aiConversations)
      .values({
        userId,
        companyId,
        agentType,
        title: titleFromMessage(userMessage),
      })
      .returning({ id: aiConversations.id })
    conversationId = conv!.id
  }

  // Load history
  const historyRows = await db
    .select({ role: aiMessages.role, content: aiMessages.content })
    .from(aiMessages)
    .where(eq(aiMessages.conversationId, conversationId))
    .orderBy(asc(aiMessages.createdAt))
    .limit(MAX_HISTORY)

  const history: ConversationMessage[] = historyRows.map((r) => ({
    role: r.role as "user" | "assistant",
    content: r.content,
  }))

  const apiKey = process.env.ANTHROPIC_API_KEY
  if (!apiKey) {
    return NextResponse.json({ reply: "AI chat is not configured.", messageId: null })
  }

  const client = new Anthropic({ apiKey })
  const messages = buildAnthropicMessages(history, userMessage)

  let reply = "Unable to get a response. Please try again."
  let inputTokens = 0
  let outputTokens = 0

  try {
    const response = await client.messages.create({
      model: MODEL,
      max_tokens: 1024,
      system: systemPrompt,
      messages,
    })
    reply = response.content[0]?.type === "text" ? response.content[0].text : reply
    inputTokens = response.usage.input_tokens
    outputTokens = response.usage.output_tokens
  } catch {
    return NextResponse.json({ reply, messageId: null })
  }

  // Persist user message
  await db.insert(aiMessages).values({
    conversationId,
    role: "user",
    content: userMessage,
    inputTokens,
  })

  // Persist assistant message and get its ID
  const [inserted] = await db
    .insert(aiMessages)
    .values({
      conversationId,
      role: "assistant",
      content: reply,
      outputTokens,
    })
    .returning({ id: aiMessages.id })

  const messageId = inserted?.id ?? null

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

  return NextResponse.json({ reply, messageId })
})
