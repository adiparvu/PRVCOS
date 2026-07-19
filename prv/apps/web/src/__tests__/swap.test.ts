import { describe, it, expect } from "vitest"
import { canDecideSwap, swapDecisionStatus, type SwapStatus } from "@/lib/swap"

describe("canDecideSwap", () => {
  it("allows deciding only a pending swap", () => {
    expect(canDecideSwap("pending")).toBe(true)
    for (const s of ["approved", "rejected", "cancelled"] as SwapStatus[]) {
      expect(canDecideSwap(s), s).toBe(false)
    }
  })
})

describe("swapDecisionStatus", () => {
  it("maps a decision to the resulting status", () => {
    expect(swapDecisionStatus("approve")).toBe("approved")
    expect(swapDecisionStatus("reject")).toBe("rejected")
  })
})
