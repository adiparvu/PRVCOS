import { describe, it, expect } from "vitest"
import { pickPreferredSupplier } from "@/lib/product-suppliers"

describe("pickPreferredSupplier", () => {
  it("returns the flagged preferred link", () => {
    const links = [
      { id: "a", isPreferred: false, cost: 5 },
      { id: "b", isPreferred: true, cost: 8 },
    ]
    expect(pickPreferredSupplier(links)?.id).toBe("b")
  })

  it("falls back to the lowest cost", () => {
    const links = [
      { id: "a", isPreferred: false, cost: 6.2 },
      { id: "b", isPreferred: false, cost: 5.95 },
      { id: "c", isPreferred: false, cost: null },
    ]
    expect(pickPreferredSupplier(links)?.id).toBe("b")
  })

  it("handles empty + all-null-cost", () => {
    expect(pickPreferredSupplier([])).toBeNull()
    expect(pickPreferredSupplier([{ id: "a", isPreferred: false, cost: null }])?.id).toBe("a")
  })
})
