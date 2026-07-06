import { describe, it, expect } from "vitest"
import { composeDailyBriefing, type BriefingInput } from "@/lib/daily-briefing"

const nominal: BriefingInput = {
  healthScore: 85,
  revenueDeltaPct: 0,
  portfolioProfit: 214000,
  marginPct: 22.1,
  activeProjects: 12,
  lossMakingProjects: 0,
  attendanceRatePct: 96,
  attendanceWatch: 0,
  openSafety: 0,
  safetyInjuries: 0,
  stockoutRisk: 0,
  criticalAlerts: 0,
}

function section(b: ReturnType<typeof composeDailyBriefing>, title: string) {
  return b.sections.find((s) => s.title === title)
}

describe("composeDailyBriefing", () => {
  it("gives a reassuring headline and nominal risk line when all is well", () => {
    const b = composeDailyBriefing(nominal)
    expect(b.posture).toBe("healthy")
    expect(b.headline).toContain("all systems nominal")
    expect(section(b, "Risk")!.lines[0]).toContain("No critical alerts")
  })

  it("reports revenue direction and portfolio profit in Money", () => {
    const up = composeDailyBriefing({ ...nominal, revenueDeltaPct: 6.4 })
    expect(section(up, "Money")!.lines[0]).toBe("Revenue is up 6% versus the previous period.")
    const money = section(up, "Money")!.lines
    expect(money.some((l) => l.includes("€214.0k") && l.includes("22.1% margin"))).toBe(true)
  })

  it("omits the revenue line when there is no comparison", () => {
    const b = composeDailyBriefing({ ...nominal, revenueDeltaPct: null })
    expect(section(b, "Money")!.lines.some((l) => l.includes("Revenue"))).toBe(false)
  })

  it("escalates posture to attention on low health, critical alerts or open safety", () => {
    expect(composeDailyBriefing({ ...nominal, healthScore: 45 }).posture).toBe("attention")
    expect(composeDailyBriefing({ ...nominal, criticalAlerts: 1 }).posture).toBe("attention")
    expect(composeDailyBriefing({ ...nominal, openSafety: 1 }).posture).toBe("attention")
  })

  it("uses watch posture for softer signals", () => {
    expect(composeDailyBriefing({ ...nominal, stockoutRisk: 2 }).posture).toBe("watch")
    expect(composeDailyBriefing({ ...nominal, healthScore: 64 }).posture).toBe("watch")
  })

  it("summarises risk with singular/plural and injuries", () => {
    const b = composeDailyBriefing({
      ...nominal,
      criticalAlerts: 1,
      openSafety: 2,
      safetyInjuries: 1,
      stockoutRisk: 3,
    })
    const risk = section(b, "Risk")!.lines
    expect(risk).toContain("1 critical alert needs triage.")
    expect(risk).toContain("2 open safety incidents with 1 recorded injury.")
    expect(risk).toContain("3 products are at stockout risk.")
  })

  it("flags loss-making projects only when present", () => {
    expect(section(composeDailyBriefing(nominal), "Operations")!.lines).toHaveLength(1)
    const b = composeDailyBriefing({ ...nominal, lossMakingProjects: 2 })
    expect(section(b, "Operations")!.lines[1]).toBe("2 projects are currently loss-making.")
  })

  it("drops the People section entirely when there is no attendance data", () => {
    const b = composeDailyBriefing({ ...nominal, attendanceRatePct: null, attendanceWatch: 0 })
    expect(section(b, "People")).toBeUndefined()
  })
})
