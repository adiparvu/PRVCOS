import { NextRequest, NextResponse } from "next/server"
import { withMobileAuth } from "@/lib/mobile/auth"
import { db } from "@prv/db"
import { aiConversations, aiMessages } from "@prv/db/schema"
import { and, asc, desc, eq, isNull } from "drizzle-orm"
import {
  AGENT_SYSTEM_PROMPTS,
  CHAT_MODEL,
  embedQuery,
  isEmbeddingConfigured,
  streamChatWithHistory,
  logUsage,
  titleFromMessage,
  type AgentType,
  type ConversationMessage,
} from "@prv/ai-engine"
import { searchChunks } from "@/lib/rag"

export const dynamic = "force-dynamic"
export const runtime = "nodejs"

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

  if (!process.env.ANTHROPIC_API_KEY) {
    return NextResponse.json({ reply: "AI chat is not configured.", messageId: null })
  }

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

  // RAG: same grounding as the web chat route — retrieval trouble must never
  // take chat down, so this whole block fails open.
  let retrievedContext: string | undefined
  if (isEmbeddingConfigured()) {
    try {
      const queryEmbedding = await embedQuery(userMessage)
      const chunks = await searchChunks(companyId, queryEmbedding, {
        k: 4,
        sourceType: "knowledge_article",
      })
      // Below ~0.3 cosine similarity the "context" is noise that misleads
      // more than it grounds.
      const relevant = chunks.filter((c) => c.similarity >= 0.3)
      if (relevant.length > 0) {
        retrievedContext = relevant.map((c, i) => `[Excerpt ${i + 1}]\n${c.content}`).join("\n\n")
      }
    } catch (err) {
      console.error("[mobile.intelligence.chat] retrieval failed, continuing without context:", err)
    }
  }

  // Collect streaming response into a string
  let reply = "Unable to get a response. Please try again."
  try {
    const stream = streamChatWithHistory(
      userMessage,
      history,
      { userId, companyId, role: ctx.role, agentType },
      agentType,
      retrievedContext
    )
    const reader = stream.getReader()
    const dec = new TextDecoder()
    const chunks: string[] = []
    while (true) {
      const { done, value } = await reader.read()
      if (done) break
      chunks.push(dec.decode(value))
    }
    reply = chunks.join("")
  } catch {
    return NextResponse.json({ reply, messageId: null })
  }

  // Persist user then assistant message
  await db.insert(aiMessages).values({ conversationId, role: "user", content: userMessage })

  const [inserted] = await db
    .insert(aiMessages)
    .values({ conversationId, role: "assistant", content: reply })
    .returning({ id: aiMessages.id })

  const messageId = inserted?.id ?? null

  // Update conversation timestamp
  await db
    .update(aiConversations)
    .set({ updatedAt: new Date() })
    .where(eq(aiConversations.id, conversationId))

  // Log usage (approximate: output token count by word)
  const outputTokens = Math.ceil(reply.split(/\s+/).length * 1.3)
  void logUsage({
    companyId,
    userId,
    conversationId,
    agentType,
    model: CHAT_MODEL,
    inputTokens: 0,
    outputTokens,
  })

  return NextResponse.json({ reply, messageId })
})
