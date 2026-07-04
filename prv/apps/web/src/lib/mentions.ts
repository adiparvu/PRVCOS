// @mention parsing + mention-log helpers (Phase 13.3). Pure + unit-tested.

// A handle is the text after "@": letters, digits, dot, underscore, hyphen.
const MENTION_RE = /(^|[^\w@])@([a-z0-9._-]{2,40})/gi

/** Extract unique, lowercased mention handles from message text (no leading @). */
export function extractMentionHandles(text: string): string[] {
  const out = new Set<string>()
  for (const m of text.matchAll(MENTION_RE)) {
    const handle = m[2]?.toLowerCase()
    if (handle) out.add(handle)
  }
  return [...out]
}

export interface DirectoryEntry {
  userId: string
  handle: string // lowercased, no @
}

/**
 * Resolve mention handles found in `text` to user ids using a member directory.
 * Returns unique ids in first-seen order; unmatched handles are ignored.
 */
export function resolveMentions(text: string, directory: DirectoryEntry[]): string[] {
  const byHandle = new Map(directory.map((d) => [d.handle.toLowerCase(), d.userId]))
  const ids: string[] = []
  const seen = new Set<string>()
  for (const handle of extractMentionHandles(text)) {
    const id = byHandle.get(handle)
    if (id && !seen.has(id)) {
      seen.add(id)
      ids.push(id)
    }
  }
  return ids
}

/** Highlight ranges of `@handle` spans for rendering (start/end offsets). */
export interface MentionSpan {
  start: number
  end: number
  handle: string
}

export function mentionSpans(text: string): MentionSpan[] {
  const spans: MentionSpan[] = []
  for (const m of text.matchAll(MENTION_RE)) {
    const lead = m[1] ?? ""
    const at = (m.index ?? 0) + lead.length
    spans.push({ start: at, end: at + 1 + (m[2]?.length ?? 0), handle: (m[2] ?? "").toLowerCase() })
  }
  return spans
}

export interface MentionSummary {
  total: number
  today: number
  week: number
}

const DAY = 86_400_000

/** Bucket mention timestamps into total / today / last-7-days counts. */
export function summarizeMentions(items: { createdAt: string }[], nowMs: number): MentionSummary {
  const dayStart = new Date(nowMs).setUTCHours(0, 0, 0, 0)
  const weekStart = nowMs - 7 * DAY
  let today = 0
  let week = 0
  for (const it of items) {
    const t = Date.parse(it.createdAt)
    if (!Number.isFinite(t)) continue
    if (t >= dayStart) today += 1
    if (t >= weekStart) week += 1
  }
  return { total: items.length, today, week }
}
