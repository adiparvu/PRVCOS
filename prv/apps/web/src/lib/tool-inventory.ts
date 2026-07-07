// Tool inventory / availability — Tool Management analytics (roadmap Phase 21).
// Pure + unit-tested.
//
// Rolls the tool asset register into an availability view: the status mix, a
// utilization rate (how much of the operable stock is currently out), the
// lost-asset count, warranty exposure, and a per-category breakdown so a
// manager sees what is available, what is out, and what is at risk.

export type ToolStatus = "available" | "in_use" | "maintenance" | "retired" | "lost"

export interface ToolInput {
  status: ToolStatus
  category: string | null
  warrantyExpiresAt: string | null // ISO
}

export interface CategoryBucket {
  category: string
  total: number
  inUse: number
}

export interface ToolInventory {
  total: number
  available: number
  inUse: number
  maintenance: number
  lost: number
  retired: number
  operable: number // available + in_use
  utilizationPct: number | null // in_use / operable
  warrantyExpiring: number // within 30 days, not expired
  warrantyExpired: number
  byCategory: CategoryBucket[] // largest first
}

const WARRANTY_SOON_DAYS = 30

function round1(n: number): number {
  return Math.round(n * 10) / 10
}

/** Roll up the tool register into an availability view as of `nowMs`. */
export function computeToolInventory(tools: ToolInput[], nowMs: number): ToolInventory {
  let available = 0
  let inUse = 0
  let maintenance = 0
  let lost = 0
  let retired = 0
  let warrantyExpiring = 0
  let warrantyExpired = 0
  const catMap = new Map<string, { total: number; inUse: number }>()

  for (const t of tools) {
    switch (t.status) {
      case "available":
        available += 1
        break
      case "in_use":
        inUse += 1
        break
      case "maintenance":
        maintenance += 1
        break
      case "retired":
        retired += 1
        break
      case "lost":
        lost += 1
        break
    }

    // Warranty exposure ignores tools already out of service.
    if (t.warrantyExpiresAt && t.status !== "retired" && t.status !== "lost") {
      const exp = Date.parse(t.warrantyExpiresAt)
      if (Number.isFinite(exp)) {
        const days = Math.floor((exp - nowMs) / 86_400_000)
        if (days < 0) warrantyExpired += 1
        else if (days <= WARRANTY_SOON_DAYS) warrantyExpiring += 1
      }
    }

    const cat = t.category?.trim() ? t.category.trim() : "Uncategorised"
    const c = catMap.get(cat) ?? { total: 0, inUse: 0 }
    c.total += 1
    if (t.status === "in_use") c.inUse += 1
    catMap.set(cat, c)
  }

  const operable = available + inUse
  const byCategory: CategoryBucket[] = [...catMap.entries()]
    .map(([category, c]) => ({ category, total: c.total, inUse: c.inUse }))
    .sort((a, b) => b.total - a.total || a.category.localeCompare(b.category))

  return {
    total: tools.length,
    available,
    inUse,
    maintenance,
    lost,
    retired,
    operable,
    utilizationPct: operable > 0 ? round1((inUse / operable) * 100) : null,
    warrantyExpiring,
    warrantyExpired,
    byCategory,
  }
}
