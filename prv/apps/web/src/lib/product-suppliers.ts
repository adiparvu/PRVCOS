// Product sourcing helpers (roadmap 9.4). Pure + unit-tested.

export interface SupplierLinkLike {
  id: string
  isPreferred: boolean
  cost: number | null
}

/**
 * The best supplier link for a product: the one flagged preferred, else the
 * lowest-cost link (nulls last), else null.
 */
export function pickPreferredSupplier<T extends SupplierLinkLike>(links: T[]): T | null {
  if (links.length === 0) return null
  const preferred = links.find((l) => l.isPreferred)
  if (preferred) return preferred
  const withCost = links.filter((l) => l.cost != null) as (T & { cost: number })[]
  if (withCost.length === 0) return links[0] ?? null
  return withCost.reduce((best, l) => (l.cost < best.cost ? l : best))
}
