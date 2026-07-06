import { describe, it, expect } from "vitest"
import { scoreLabel, cockpitPosture, cockpitBriefing } from "@/lib/command-center"

describe("scoreLabel", () => {
  it("maps scores to Phase 16.2 executive labels + tones", () => {
    expect(scoreLabel(95)).toEqual({ label: "Excellent", tone: "good" })
    expect(scoreLabel(78)).toEqual({ label: "Good", tone: "good" })
    expect(scoreLabel(58)).toEqual({ label: "Attention needed", tone: "amber" })
    expect(scoreLabel(30)).toEqual({ label: "Critical", tone: "red" })
  })

  it("treats non-finite scores as zero (critical)", () => {
    expect(scoreLabel(Number.NaN).tone).toBe("red")
  })
})

const base = {
  healthScore: 85,
  criticalAlerts: 0,
  openSafetyCritical: false,
  stockoutRisk: 0,
  attendanceWatch: 0,
}

describe("cockpitPosture", () => {
  it("is healthy when everything is nominal", () => {
    expect(cockpitPosture(base)).toEqual({ label: "Healthy", tone: "good" })
  })

  it("escalates to red on a critical alert or open critical safety", () => {
    expect(cockpitPosture({ ...base, criticalAlerts: 1 }).tone).toBe("red")
    expect(cockpitPosture({ ...base, openSafetyCritical: true }).tone).toBe("red")
  })

  it("escalates to amber on stockout risk or attendance watch", () => {
    expect(cockpitPosture({ ...base, stockoutRisk: 2 })).toEqual({ label: "Watch", tone: "amber" })
    expect(cockpitPosture({ ...base, attendanceWatch: 3 }).tone).toBe("amber")
  })

  it("takes the worst signal — a low health score dominates", () => {
    expect(cockpitPosture({ ...base, healthScore: 40 }).tone).toBe("red")
  })

  it("red wins over amber when both are present", () => {
    expect(cockpitPosture({ ...base, criticalAlerts: 1, stockoutRisk: 5 }).tone).toBe("red")
  })
})

describe("cockpitBriefing", () => {
  it("reports all-nominal when nothing needs attention", () => {
    expect(cockpitBriefing(base)).toBe("Company health 85/100 — all systems nominal.")
  })

  it("summarises only the signals that need attention, grammatically", () => {
    expect(
      cockpitBriefing({
        healthScore: 78.4,
        criticalAlerts: 1,
        openSafetyCritical: false,
        stockoutRisk: 2,
        attendanceWatch: 0,
      })
    ).toBe("Company health 78/100, with 1 critical alert and 2 stockout risks.")
  })

  it("uses singular/plural correctly and joins three items with commas + and", () => {
    expect(
      cockpitBriefing({
        healthScore: 60,
        criticalAlerts: 2,
        openSafetyCritical: true,
        stockoutRisk: 1,
        attendanceWatch: 1,
      })
    ).toBe(
      "Company health 60/100, with 2 critical alerts, an open critical safety incident, 1 stockout risk and 1 employee below target."
    )
  })
})
