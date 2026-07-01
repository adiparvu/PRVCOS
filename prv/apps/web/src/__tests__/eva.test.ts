import { describe, it, expect } from "vitest"
import { computeEva } from "@/lib/eva"

describe("computeEva", () => {
  it("computes the full EVA set for an under-running project", () => {
    const r = computeEva({
      bac: 100_000,
      ac: 40_000,
      committed: 10_000,
      percentComplete: 0.5,
      scheduleFraction: 0.5,
      elapsedWeeks: 10,
    })
    expect(r.ev).toBe(50_000)
    expect(r.pv).toBe(50_000)
    expect(r.cpi).toBe(1.25)
    expect(r.spi).toBe(1)
    expect(r.costVariance).toBe(10_000)
    expect(r.scheduleVariance).toBe(0)
    expect(r.etc).toBe(40_000)
    expect(r.eac).toBe(80_000)
    expect(r.vac).toBe(20_000)
    expect(r.burnRate).toBe(4_000)
    expect(r.healthBand).toBe("green")
  })

  it("returns null ratios and no burn rate before any spend", () => {
    const r = computeEva({
      bac: 100_000,
      ac: 0,
      committed: 0,
      percentComplete: 0,
      scheduleFraction: 0,
      elapsedWeeks: 0,
    })
    expect(r.cpi).toBeNull()
    expect(r.spi).toBeNull()
    expect(r.burnRate).toBeNull()
    expect(r.etc).toBe(100_000)
    expect(r.eac).toBe(100_000)
  })

  it("flags red when the forecast overruns the budget", () => {
    const r = computeEva({
      bac: 100_000,
      ac: 80_000,
      committed: 0,
      percentComplete: 0.5,
      scheduleFraction: 0.5,
      elapsedWeeks: 8,
    })
    expect(r.cpi).toBe(0.63)
    expect(r.eac).toBe(160_000)
    expect(r.healthBand).toBe("red")
  })

  it("clamps progress + schedule fractions and guards NaN", () => {
    const r = computeEva({
      bac: 50_000,
      ac: 10_000,
      committed: 0,
      percentComplete: 1.8,
      scheduleFraction: -0.5,
      elapsedWeeks: 2,
    })
    expect(r.ev).toBe(50_000) // percentComplete clamped to 1
    expect(r.pv).toBe(0) // scheduleFraction clamped to 0
    expect(r.spi).toBeNull() // pv = 0
  })
})
