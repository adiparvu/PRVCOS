// AI Engine — Shared library for all AI features in PRV
// Full implementation in Epic 19 (AI Platform, Sprints 54–57)

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

// Gate 4: Permission check before any AI tool call
export function checkAIToolPermission(_toolName: string, _context: AIConversationContext): boolean {
  throw new Error("Not implemented — Epic 19, Sprint 54")
}

export function createConversation(_context: AIConversationContext): Promise<string> {
  throw new Error("Not implemented — Epic 19, Sprint 54")
}

export function sendMessage(_conversationId: string, _message: string): Promise<string> {
  throw new Error("Not implemented — Epic 19, Sprint 54")
}

export function getEmbedding(_text: string, _companyId: string): Promise<number[]> {
  throw new Error("Not implemented — Epic 19, Sprint 56")
}

export function semanticSearch(
  _query: string,
  _companyId: string,
  _topK: number
): Promise<unknown[]> {
  throw new Error("Not implemented — Epic 19, Sprint 56")
}
