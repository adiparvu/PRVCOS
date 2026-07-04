// Chat message edit / delete / reaction helpers (Phase 13.1). Pure + tested.

export type ReactionMap = Record<string, number>
export type ReactionOp = "add" | "remove"

/**
 * Apply a reaction op to an emoji counter map, returning a NEW map. Counts never
 * go below zero and emojis at zero are dropped so the map stays clean.
 */
export function applyReaction(map: ReactionMap, emoji: string, op: ReactionOp): ReactionMap {
  const next: ReactionMap = { ...map }
  const current = Math.max(0, next[emoji] ?? 0)
  const updated = op === "add" ? current + 1 : current - 1
  if (updated > 0) next[emoji] = updated
  else delete next[emoji]
  return next
}

/** Total reactions across all emojis. */
export function reactionTotal(map: ReactionMap): number {
  return Object.values(map).reduce((s, n) => s + Math.max(0, n), 0)
}

// The placeholder content a tombstoned (deleted) message shows in its place.
export const TOMBSTONE_CONTENT = "[message deleted]"

export interface EditableLike {
  authorId: string | null
  deletedAt: string | null
}

/** Only the author may edit/delete, and never a message already tombstoned. */
export function canModifyMessage(msg: EditableLike, userId: string): boolean {
  if (msg.deletedAt) return false
  return msg.authorId === userId
}
