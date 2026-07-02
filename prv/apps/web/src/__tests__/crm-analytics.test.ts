import { describe, it, expect } from "vitest"
import { computeCrmAnalytics, STAGE_PROBABILITY, type LeadRecord } from "@/lib/crm-analytics"

// Fixed reference clock: Monday 2026-06-29 (velocity window is deterministic).
const NOW = Date.parse("2026-06-29T12:00:00Z")
const DAY = 86_400_000

function lead(p: Partial<LeadRecord>): LeadRecord {
  return {
    stage: "new",
    source: "website",
    estimatedValue: 1000,
    rep: "Rep A",
    createdAt: "2026-06-01T00:00:00Z",
    updatedAt: "2026-06-10T00:00:00Z",
    ...p,
  }
}

describe("computeCrmAnalytics", () => {
  it("returns zeroed metrics with full stage/source scaffolding for no leads", () => {
    const a = computeCrmAnalytics([], NOW)
    expect(a.totalLeads).toBe(0)
    expect(a.winRate).toBe(0)
    expect(a.pipelineValue).toBe(0)
    expect(a.byStage).toHaveLength(7)
    expect(a.bySource).toHaveLength(6)
    expect(a.topReps).toEqual([])
    expect(a.velocity).toHaveLength(8)
  })

  it("computes win rate from decided (won + lost) leads only, ignoring open", () => {
    const a = computeCrmAnalytics(
      [
        lead({ stage: "won" }),
        lead({ stage: "won" }),
        lead({ stage: "won" }),
        lead({ stage: "lost" }),
        lead({ stage: "qualified" }), // open — excluded from win rate
      ],
      NOW
    )
    expect(a.wonCount).toBe(3)
    expect(a.lostCount).toBe(1)
    expect(a.winRate).toBe(75) // 3 / 4
    expect(a.activeLeads).toBe(1)
  })

  it("sums only open-stage value into the pipeline and weights it by probability", () => {
    const a = computeCrmAnalytics(
      [
        lead({ stage: "qualified", estimatedValue: 1000 }),
        lead({ stage: "negotiation", estimatedValue: 2000 }),
        lead({ stage: "won", estimatedValue: 5000 }), // terminal — not in pipeline
      ],
      NOW
    )
    expect(a.pipelineValue).toBe(3000) // 1000 + 2000, won excluded
    expect(a.weightedPipelineValue).toBe(
      1000 * STAGE_PROBABILITY.qualified + 2000 * STAGE_PROBABILITY.negotiation
    )
  })

  it("averages deal size and sales-cycle days over closed leads", () => {
    const a = computeCrmAnalytics(
      [
        lead({
          stage: "won",
          estimatedValue: 4000,
          createdAt: "2026-06-01T00:00:00Z",
          updatedAt: "2026-06-11T00:00:00Z", // 10 days
        }),
        lead({
          stage: "won",
          estimatedValue: 6000,
          createdAt: "2026-06-01T00:00:00Z",
          updatedAt: "2026-06-21T00:00:00Z", // 20 days
        }),
      ],
      NOW
    )
    expect(a.avgDealSize).toBe(5000)
    expect(a.avgSalesCycleDays).toBe(15)
  })

  it("attributes won value to source and ranks top reps by won value", () => {
    const a = computeCrmAnalytics(
      [
        lead({ stage: "won", source: "referral", estimatedValue: 3000, rep: "Ana" }),
        lead({ stage: "won", source: "referral", estimatedValue: 2000, rep: "Bo" }),
        lead({ stage: "won", source: "website", estimatedValue: 4000, rep: "Ana" }),
        lead({ stage: "qualified", source: "referral", estimatedValue: 9000, rep: "Bo" }), // open, no won credit
      ],
      NOW
    )
    const referral = a.bySource.find((s) => s.source === "referral")!
    expect(referral.won).toBe(5000) // 3000 + 2000, the open 9000 excluded
    expect(referral.count).toBe(3)
    expect(a.topReps[0]).toEqual({ rep: "Ana", wonCount: 2, wonValue: 7000 })
    expect(a.topReps[1]).toEqual({ rep: "Bo", wonCount: 1, wonValue: 2000 })
  })

  it("buckets new leads into the trailing 8 ISO weeks by created date", () => {
    const a = computeCrmAnalytics(
      [
        lead({ createdAt: new Date(NOW).toISOString() }), // current week
        lead({ createdAt: new Date(NOW - 7 * DAY).toISOString() }), // last week
        lead({ createdAt: new Date(NOW - 7 * DAY).toISOString() }),
        lead({ createdAt: new Date(NOW - 200 * DAY).toISOString() }), // outside window
      ],
      NOW
    )
    expect(a.velocity).toHaveLength(8)
    expect(a.velocity[7]!.count).toBe(1) // current week
    expect(a.velocity[6]!.count).toBe(2) // previous week
    const totalInWindow = a.velocity.reduce((s, b) => s + b.count, 0)
    expect(totalInWindow).toBe(3) // the 200-day-old lead is excluded
  })

  it("clamps negative estimated values to zero", () => {
    const a = computeCrmAnalytics([lead({ stage: "qualified", estimatedValue: -500 })], NOW)
    expect(a.pipelineValue).toBe(0)
  })
})
