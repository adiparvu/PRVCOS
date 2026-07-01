import { describe, it, expect } from "vitest"
import { scoreRisk, riskBand } from "@/lib/risk"

describe("risk scoring", () => {
  it("multiplies impact × probability into a 1–25 score", () => {
    expect(scoreRisk(5, 4).score).toBe(20)
    expect(scoreRisk(3, 3).score).toBe(9)
    expect(scoreRisk(1, 1).score).toBe(1)
  })

  it("bands the score into low/medium/high/critical", () => {
    expect(riskBand(3)).toBe("low")
    expect(riskBand(4)).toBe("medium")
    expect(riskBand(8)).toBe("high")
    expect(riskBand(15)).toBe("critical")
    expect(scoreRisk(5, 3).band).toBe("critical") // 15
    expect(scoreRisk(4, 2).band).toBe("high") // 8
    expect(scoreRisk(2, 2).band).toBe("medium") // 4
    expect(scoreRisk(3, 1).band).toBe("low") // 3
  })

  it("clamps impact and probability into the 1–5 range", () => {
    expect(scoreRisk(9, 0).score).toBe(5) // 5 × 1
    expect(scoreRisk(-3, 4).score).toBe(4) // 1 × 4
    expect(scoreRisk(2.6, 2.4).score).toBe(6) // rounds to 3 × 2
  })
})
