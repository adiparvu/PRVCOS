// Product variant helpers (roadmap 9.1). Pure + unit-tested.

export interface VariantLike {
  options: Record<string, string>
  price: number | null
}

/**
 * The distinct option axes across a set of variants, e.g.
 * { Colour: ["Red", "Blue"], Size: ["S", "M", "L"] }. Values keep first-seen
 * order and are de-duplicated.
 */
export function variantAxes(
  variants: { options: Record<string, string> }[]
): Record<string, string[]> {
  const axes: Record<string, string[]> = {}
  for (const v of variants) {
    for (const [key, val] of Object.entries(v.options ?? {})) {
      const arr = (axes[key] ??= [])
      if (!arr.includes(val)) arr.push(val)
    }
  }
  return axes
}

/**
 * Price range across variants, using the parent `basePrice` as the fallback for
 * any variant without its own price. Returns null when there are no variants.
 */
export function priceRange(
  variants: VariantLike[],
  basePrice: number
): { min: number; max: number } | null {
  if (variants.length === 0) return null
  const prices = variants.map((v) => (v.price != null ? v.price : basePrice))
  return { min: Math.min(...prices), max: Math.max(...prices) }
}
