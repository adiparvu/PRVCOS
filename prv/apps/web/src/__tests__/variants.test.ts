import { describe, it, expect } from "vitest"
import { variantAxes, priceRange } from "@/lib/variants"

describe("variant helpers", () => {
  it("collects distinct option axes in first-seen order", () => {
    const axes = variantAxes([
      { options: { Colour: "Black", Size: "M" } },
      { options: { Colour: "Hi-vis", Size: "M" } },
      { options: { Colour: "Black", Size: "L" } },
    ])
    expect(axes).toEqual({ Colour: ["Black", "Hi-vis"], Size: ["M", "L"] })
  })

  it("computes a price range using base price as fallback", () => {
    expect(
      priceRange(
        [
          { options: {}, price: 45 },
          { options: {}, price: 52 },
          { options: {}, price: null },
        ],
        48
      )
    ).toEqual({ min: 45, max: 52 })
    expect(priceRange([], 48)).toBeNull()
  })
})
