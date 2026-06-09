// AI Engine — Shared library for all AI features in PRV

import Anthropic from "@anthropic-ai/sdk"

const MODEL = "claude-sonnet-4-6"

const SYSTEM_PROMPT = `You are PRV Intelligence — an AI business advisor embedded inside PRV, a Company Operating System used by Romanian companies.

PRV covers 18 integrated modules: Projects, Workforce, Attendance, CRM, Shop, Finance, Analytics, Documents, Knowledge Base, Learning, Procurement, Suppliers, Fleet, Tools, and more.

Your role is to help managers and executives understand their business: revenue, costs, projects, people, cash flow, inventory, fleet, and performance. You reason like a senior CFO/COO — concise, specific, and action-oriented.

Language rules:
- If the user writes in Romanian, reply in Romanian.
- If the user writes in English, reply in English.
- Always be direct. No filler. Lead with the insight, not the setup.
- Bullet lists are good for multi-item answers. Use them.
- Numbers always include units (€, %, km, days).`

export interface ChatContext {
  userId: string
  companyId: string
  role: string
}

export function streamChatResponse(message: string, _ctx: ChatContext): ReadableStream<Uint8Array> {
  const apiKey = process.env.ANTHROPIC_API_KEY
  if (!apiKey) {
    const fallback = "AI chat is not configured. Please set ANTHROPIC_API_KEY."
    return new ReadableStream({
      start(controller) {
        controller.enqueue(new TextEncoder().encode(fallback))
        controller.close()
      },
    })
  }

  const client = new Anthropic({ apiKey })
  const enc = new TextEncoder()

  return new ReadableStream<Uint8Array>({
    async start(controller) {
      try {
        const stream = await client.messages.stream({
          model: MODEL,
          max_tokens: 1024,
          system: SYSTEM_PROMPT,
          messages: [{ role: "user", content: message }],
        })

        for await (const chunk of stream) {
          if (
            chunk.type === "content_block_delta" &&
            chunk.delta.type === "text_delta"
          ) {
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

export type AIRole = "finance" | "hr" | "project" | "operations" | "executive"

export interface AIToolPermission {
  toolName: string
  allowedRoles: string[]
  allowedScopeLevels: number[]
  requiresMFA: boolean
}

export interface AIConversationContext {
  userId: string
  companyId: string
  role: string
  scopeLevel: number
  entityType?: string
  entityId?: string
}

export function checkAIToolPermission(_toolName: string, _context: AIConversationContext): boolean {
  return false // not implemented — deny by default
}

export function createConversation(_context: AIConversationContext): Promise<string> {
  return Promise.resolve("") // not implemented
}

export function sendMessage(_conversationId: string, _message: string): Promise<string> {
  return Promise.resolve("") // not implemented
}

export function getEmbedding(_text: string, _companyId: string): Promise<number[]> {
  return Promise.resolve([]) // not implemented
}

export function semanticSearch(
  _query: string,
  _companyId: string,
  _topK: number
): Promise<unknown[]> {
  return Promise.resolve([]) // not implemented
}
