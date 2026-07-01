// Universal Recents (roadmap 5.7) — the last entities a user viewed, per module.
//
// Privacy by design: recents are stored ONLY in the browser (localStorage) and
// are never synced to the server. This is the deliberate counterpart to
// Favorites, which ARE persisted server-side. A "Clear recents" affordance
// (settings / command palette) simply wipes this local store.

export interface RecentEntity {
  entityType: string
  entityId: string
  label: string
  href: string
  /** Module bucket — recents are capped per module. */
  module: string
  /** Epoch ms of the most recent view; used for ordering. */
  viewedAt: number
}

const STORAGE_KEY = "prv:recents:v1"
const MAX_PER_MODULE = 20

type RecentInput = Omit<RecentEntity, "viewedAt">

function hasStorage(): boolean {
  return typeof window !== "undefined" && !!window.localStorage
}

function read(): RecentEntity[] {
  if (!hasStorage()) return []
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY)
    if (!raw) return []
    const parsed = JSON.parse(raw) as unknown
    if (!Array.isArray(parsed)) return []
    return parsed.filter(
      (r): r is RecentEntity =>
        !!r &&
        typeof r === "object" &&
        typeof (r as RecentEntity).entityId === "string" &&
        typeof (r as RecentEntity).module === "string"
    )
  } catch {
    return []
  }
}

function write(list: RecentEntity[]): void {
  if (!hasStorage()) return
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(list))
  } catch {
    // Quota or serialization failure — recents are best-effort, so swallow.
  }
}

/**
 * Records that the user just viewed an entity. De-dupes by (entityType,
 * entityId) so re-viewing bumps it to the front, and caps each module's bucket
 * at the newest {@link MAX_PER_MODULE} entries. `at` is injectable for testing.
 */
export function recordRecent(input: RecentInput, at: number = Date.now()): void {
  const entry: RecentEntity = { ...input, viewedAt: at }

  const rest = read().filter(
    (r) => !(r.entityType === entry.entityType && r.entityId === entry.entityId)
  )
  const next = [entry, ...rest]

  // Cap per module (newest-first order is preserved by the unshift above).
  const perModuleCount = new Map<string, number>()
  const capped: RecentEntity[] = []
  for (const r of next) {
    const n = (perModuleCount.get(r.module) ?? 0) + 1
    perModuleCount.set(r.module, n)
    if (n <= MAX_PER_MODULE) capped.push(r)
  }

  write(capped)
}

/**
 * Returns recents newest-first. Optionally filtered to a single module, and/or
 * limited to the first `limit` entries.
 */
export function getRecents(opts?: { module?: string; limit?: number }): RecentEntity[] {
  let list = read().sort((a, b) => b.viewedAt - a.viewedAt)
  if (opts?.module) list = list.filter((r) => r.module === opts.module)
  if (opts?.limit != null) list = list.slice(0, opts.limit)
  return list
}

/** Clears recents — all of them, or just one module's bucket. */
export function clearRecents(module?: string): void {
  if (!module) {
    if (hasStorage()) window.localStorage.removeItem(STORAGE_KEY)
    return
  }
  write(read().filter((r) => r.module !== module))
}

export const RECENTS_MAX_PER_MODULE = MAX_PER_MODULE
export const RECENTS_STORAGE_KEY = STORAGE_KEY
