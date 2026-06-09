import Anthropic from "@anthropic-ai/sdk"
import { db } from "@prv/db"
import { aiConversations, aiMessages, documentEmbeddings } from "@prv/db/schema"
import { eq, asc, desc, and, isNull, sql } from "drizzle-orm"

const MODEL = "claude-sonnet-4-6"
const MAX_HISTORY = 20

const SYSTEM_PROMPT = `You are PRV Intelligence — an AI business advisor embedded inside PRV, a Company Operating System used by Romanian companies.

PRV covers 18 integrated modules: Projects, Workforce, Attendance, CRM, Shop, Finance, Analytics, Documents, Knowledge Base, Learning, Procurement, Suppliers, Fleet, Tools, and more.

Your role is to help managers and executives understand their business: revenue, costs, projects, people, cash flow, inventory, fleet, and performance. You reason like a senior CFO/COO — concise, specific, and action-oriented.

Language rules:
- If the user writes in Romanian, reply in Romanian.
- If the user writes in English, reply in English.
- Always be direct. No filler. Lead with the insight, not the setup.
- Bullet lists are good for multi-item answers. Use them.
- Numbers always include units (€, %, km, days).`

// ── Types ─────────────────────────────────────────────────────────────────────

export type MessageRole = "user" | "assistant"

export interface ConversationMessage {
  role: MessageRole
  content: string
}

export interface ChatContext {
  userId: string
  companyId: string
  role: string
}

export type AIRole = "finance" | "hr" | "project" | "operations" | "executive"

export interface AIConversationContext {
  userId: string
  companyId: string
  role: string
  scopeLevel: number
  entityType?: string
  entityId?: string
}

// ── Pure helpers ──────────────────────────────────────────────────────────────

export function titleFromMessage(message: string, maxLen = 50): string {
  const trimmed = message.trim()
  if (trimmed.length <= maxLen) return trimmed
  const words = trimmed.split(/\s+/)
  let title = ""
  for (const word of words) {
    const candidate = title ? `${title} ${word}` : word
    if (candidate.length > maxLen) break
    title = candidate
  }
  return title ? `${title}…` : trimmed.slice(0, maxLen) + "…"
}

export function buildAnthropicMessages(
  history: ConversationMessage[],
  newMessage: string
): Anthropic.MessageParam[] {
  const msgs: Anthropic.MessageParam[] = history.slice(-MAX_HISTORY).map((m) => ({
    role: m.role,
    content: m.content,
  }))
  msgs.push({ role: "user", content: newMessage })
  return msgs
}

// ── Streaming ─────────────────────────────────────────────────────────────────

function makeNoKeyStream(message: string): ReadableStream<Uint8Array> {
  const enc = new TextEncoder()
  return new ReadableStream({
    start(controller) {
      controller.enqueue(enc.encode(message))
      controller.close()
    },
  })
}

export function streamChatResponse(message: string, _ctx: ChatContext): ReadableStream<Uint8Array> {
  const apiKey = process.env.ANTHROPIC_API_KEY
  if (!apiKey) return makeNoKeyStream("AI chat is not configured. Please set ANTHROPIC_API_KEY.")
  return streamChatWithHistory(message, [], _ctx)
}

export function streamChatWithHistory(
  message: string,
  history: ConversationMessage[],
  _ctx: ChatContext
): ReadableStream<Uint8Array> {
  const apiKey = process.env.ANTHROPIC_API_KEY
  if (!apiKey) return makeNoKeyStream("AI chat is not configured. Please set ANTHROPIC_API_KEY.")

  const client = new Anthropic({ apiKey })
  const enc = new TextEncoder()
  const messages = buildAnthropicMessages(history, message)

  return new ReadableStream<Uint8Array>({
    async start(controller) {
      try {
        const stream = await client.messages.stream({
          model: MODEL,
          max_tokens: 1024,
          system: SYSTEM_PROMPT,
          messages,
        })
        for await (const chunk of stream) {
          if (chunk.type === "content_block_delta" && chunk.delta.type === "text_delta") {
            controller.enqueue(enc.encode(chunk.delta.text))
          }
        }
      } catch {
        controller.enqueue(enc.encode("Unable to get a response. Please try again."))
      } finally {
        controller.close()
      }
    },
  })
}

// ── Conversation management ────────────────────────────────────────────────────

export async function createConversation(
  context: AIConversationContext,
  title?: string
): Promise<string> {
  const [conv] = await db
    .insert(aiConversations)
    .values({
      userId: context.userId,
      companyId: context.companyId,
      title: title ?? "New conversation",
    })
    .returning({ id: aiConversations.id })
  return conv!.id
}

export async function appendMessage(
  conversationId: string,
  role: MessageRole,
  content: string
): Promise<void> {
  await db.insert(aiMessages).values({ conversationId, role, content })
  await db
    .update(aiConversations)
    .set({ updatedAt: new Date() })
    .where(eq(aiConversations.id, conversationId))
}

export async function getConversationHistory(
  conversationId: string,
  limit = MAX_HISTORY
): Promise<ConversationMessage[]> {
  const msgs = await db
    .select({ role: aiMessages.role, content: aiMessages.content })
    .from(aiMessages)
    .where(eq(aiMessages.conversationId, conversationId))
    .orderBy(asc(aiMessages.createdAt))
    .limit(limit)
  return msgs.map((m) => ({ role: m.role, content: m.content }))
}

export async function listConversations(
  userId: string,
  companyId: string
): Promise<{ id: string; title: string; updatedAt: Date }[]> {
  return db
    .select({
      id: aiConversations.id,
      title: aiConversations.title,
      updatedAt: aiConversations.updatedAt,
    })
    .from(aiConversations)
    .where(
      and(
        eq(aiConversations.userId, userId),
        eq(aiConversations.companyId, companyId),
        isNull(aiConversations.deletedAt)
      )
    )
    .orderBy(desc(aiConversations.updatedAt))
    .limit(50)
}

export async function deleteConversation(conversationId: string, userId: string): Promise<boolean> {
  const result = await db
    .update(aiConversations)
    .set({ deletedAt: new Date() })
    .where(
      and(
        eq(aiConversations.id, conversationId),
        eq(aiConversations.userId, userId),
        isNull(aiConversations.deletedAt)
      )
    )
    .returning({ id: aiConversations.id })
  return result.length > 0
}

// ── Semantic search (pgvector — requires embedding provider) ──────────────────

export async function getEmbedding(_text: string, _companyId: string): Promise<number[]> {
  // Requires an embedding provider (e.g. OPENAI_API_KEY with text-embedding-3-small).
  // Returns [] when no provider is configured; semantic search will skip gracefully.
  return []
}

export async function upsertEmbedding(
  companyId: string,
  sourceType: "knowledge_article" | "project" | "document" | "insight",
  sourceId: string,
  content: string,
  chunkIndex = 0
): Promise<boolean> {
  const embedding = await getEmbedding(content, companyId)
  if (embedding.length === 0) return false

  await db
    .insert(documentEmbeddings)
    .values({ companyId, sourceType, sourceId, chunkIndex, content, embedding })
    .onConflictDoUpdate({
      target: [documentEmbeddings.sourceId, documentEmbeddings.chunkIndex],
      set: { content, embedding, updatedAt: new Date() },
    })
  return true
}

export async function semanticSearch(
  query: string,
  companyId: string,
  topK = 5
): Promise<{ sourceType: string; sourceId: string; content: string; score: number }[]> {
  const embedding = await getEmbedding(query, companyId)
  if (embedding.length === 0) return []

  const vectorLiteral = `[${embedding.join(",")}]`
  const rows = await db
    .select({
      sourceType: documentEmbeddings.sourceType,
      sourceId: documentEmbeddings.sourceId,
      content: documentEmbeddings.content,
      score: sql<number>`1 - (${documentEmbeddings.embedding} <=> ${vectorLiteral}::vector)`,
    })
    .from(documentEmbeddings)
    .where(eq(documentEmbeddings.companyId, companyId))
    .orderBy(sql`${documentEmbeddings.embedding} <=> ${vectorLiteral}::vector`)
    .limit(topK)

  return rows.map((r) => ({
    sourceType: r.sourceType,
    sourceId: r.sourceId,
    content: r.content,
    score: r.score,
  }))
}

// ── Permission check (role-gate AI tools) ─────────────────────────────────────

export interface AIToolPermission {
  toolName: string
  allowedRoles: string[]
  allowedScopeLevels: number[]
  requiresMFA: boolean
}

export function checkAIToolPermission(_toolName: string, _context: AIConversationContext): boolean {
  return false
}
