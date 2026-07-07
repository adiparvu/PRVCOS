import { describe, it, expect } from "vitest"
import { computeRecruitmentFunnel } from "@/lib/recruitment-funnel"

function cand(stage: string, source: string | null = "LinkedIn") {
  return { stage: stage as never, source }
}

describe("computeRecruitmentFunnel", () => {
  it("returns an all-zero funnel for no candidates", () => {
    const f = computeRecruitmentFunnel([])
    expect(f.total).toBe(0)
    expect(f.overallConversionPct).toBeNull()
    expect(f.funnel).toHaveLength(7)
    expect(f.funnel.every((s) => s.count === 0)).toBe(true)
  })

  it("counts a candidate as having reached its stage and all earlier stages", () => {
    const f = computeRecruitmentFunnel([cand("interview")])
    const byStage = Object.fromEntries(f.funnel.map((s) => [s.stage, s.count]))
    expect(byStage.sourcing).toBe(1)
    expect(byStage.screening).toBe(1)
    expect(byStage.phone_screen).toBe(1)
    expect(byStage.interview).toBe(1)
    expect(byStage.assessment).toBe(0)
    expect(byStage.hired).toBe(0)
  })

  it("produces a descending funnel across candidates at different stages", () => {
    const f = computeRecruitmentFunnel([
      cand("sourcing"),
      cand("screening"),
      cand("interview"),
      cand("offer"),
      cand("hired"),
    ])
    const counts = f.funnel.map((s) => s.count)
    expect(counts).toEqual([5, 4, 3, 3, 2, 2, 1])
    // each stage <= previous
    for (let i = 1; i < counts.length; i++) expect(counts[i]!).toBeLessThanOrEqual(counts[i - 1]!)
  })

  it("excludes rejected from the funnel but reports them", () => {
    const f = computeRecruitmentFunnel([cand("hired"), cand("rejected"), cand("rejected")])
    expect(f.rejected).toBe(2)
    expect(f.funnel[0]!.count).toBe(1) // only the hired candidate entered
    expect(f.total).toBe(3)
  })

  it("computes overall conversion and stage-to-stage conversion", () => {
    const f = computeRecruitmentFunnel([
      cand("screening"),
      cand("screening"),
      cand("interview"),
      cand("hired"),
    ])
    // entered = 4 (sourcing reached by all), hired = 1 → 25%
    expect(f.overallConversionPct).toBe(25)
    // screening reached by 4, sourcing by 4 → 100% conversion into screening
    expect(f.funnel[1]!.conversionFromPrevPct).toBe(100)
    // interview reached by 2, phone_screen by 2 → 100
    expect(f.funnel[3]!.count).toBe(2)
  })

  it("breaks candidates down by source, largest first, bucketing null as Unknown", () => {
    const f = computeRecruitmentFunnel([
      cand("sourcing", "LinkedIn"),
      cand("screening", "LinkedIn"),
      cand("sourcing", "Referral"),
      cand("sourcing", null),
    ])
    expect(f.bySource[0]).toEqual({ source: "LinkedIn", count: 2 })
    expect(f.bySource.find((s) => s.source === "Unknown")!.count).toBe(1)
  })

  it("reports active as entered minus hired", () => {
    const f = computeRecruitmentFunnel([
      cand("interview"),
      cand("offer"),
      cand("hired"),
      cand("rejected"),
    ])
    expect(f.hired).toBe(1)
    expect(f.active).toBe(2) // interview + offer
  })
})
