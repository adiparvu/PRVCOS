// Notification digest grouping (roadmap 14.4). Pure + unit-tested.
//
// Groups a window of notifications by their source module (entityType) into a
// daily-digest shape: per-module buckets, a one-line summary, and severity
// counts — the data a digest email or the in-app digest view renders.

export interface DigestNotificationLike {
  id: string
  type: string // severity: info/warning/error/success/action_required
  title: string
  body: string | null
  actionUrl: string | null
  entityType: string | null // the source module, e.g. "task", "invoice"
  createdAt: string // ISO
}

export interface DigestItem {
  id: string
  type: string
  title: string
  body: string | null
  actionUrl: string | null
  createdAt: string
}

export interface DigestGroup {
  key: string // entityType or "general"
  label: string // human label, pluralized by count
  count: number
  items: DigestItem[]
}

export interface Digest {
  total: number
  actionRequired: number
  groups: DigestGroup[]
  summary: string
}

// Friendly singular labels per known module; unknowns are title-cased.
const MODULE_LABELS: Record<string, string> = {
  task: "task",
  project: "project update",
  invoice: "invoice",
  expense: "expense",
  leave: "leave request",
  order: "order",
  document: "document",
  announcement: "announcement",
  approval: "approval",
  client: "client update",
  lead: "lead",
  general: "notification",
}

function singular(key: string): string {
  if (MODULE_LABELS[key]) return MODULE_LABELS[key]
  return key.replace(/[_-]+/g, " ")
}

function pluralize(label: string, count: number): string {
  if (count === 1) return label
  if (/(update|request)$/.test(label)) return `${label}s`
  if (/s$/.test(label)) return label
  return `${label}s`
}

/** Group a window of notifications into a digest, ordered by group size desc. */
export function buildDigest(items: DigestNotificationLike[]): Digest {
  const byKey = new Map<string, DigestGroup>()
  let actionRequired = 0

  for (const n of items) {
    if (n.type === "action_required") actionRequired += 1
    const key = n.entityType ?? "general"
    let group = byKey.get(key)
    if (!group) {
      group = { key, label: singular(key), count: 0, items: [] }
      byKey.set(key, group)
    }
    group.count += 1
    group.items.push({
      id: n.id,
      type: n.type,
      title: n.title,
      body: n.body,
      actionUrl: n.actionUrl,
      createdAt: n.createdAt,
    })
  }

  const groups = [...byKey.values()].sort((a, b) => b.count - a.count || a.key.localeCompare(b.key))
  for (const g of groups) g.label = pluralize(singular(g.key), g.count)

  const summary =
    groups.length === 0
      ? "You're all caught up."
      : groups.map((g) => `${g.count} ${g.label}`).join(" · ")

  return { total: items.length, actionRequired, groups, summary }
}
