// AI Engine — Shared library for all AI features in PRV
// Full implementation in Epic 19 (AI Platform, Sprints 54–57)
// Stub functions return safe no-op values — they do NOT throw, to prevent accidental 500s.

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
