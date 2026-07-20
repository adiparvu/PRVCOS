import { describe, it, expect } from "vitest"
import { assessCompetency, competenciesForType } from "@/lib/permit-competency"

const NOW = Date.parse("2026-06-01T00:00:00Z")

describe("competenciesForType", () => {
  it("returns keyword sets per type", () => {
    expect(competenciesForType("hot_work")).toContain("hot work")
    expect(competenciesForType("confined_space")).toContain("confined")
  })
})

describe("assessCompetency", () => {
  it("covered: a matching non-expired training", () => {
    const a = assessCompetency(
      [{ trainingName: "Autorizație lucru la cald", expiresAt: "2027-01-01T00:00:00Z" }],
      "hot_work",
      NOW
    )
    expect(a.status).toBe("covered")
    expect(a.matchedName).toMatch(/cald/i)
  })
  it("covered: a never-expiring match", () => {
    const a = assessCompetency(
      [{ trainingName: "Confined Space Entry", expiresAt: null }],
      "confined_space",
      NOW
    )
    expect(a.status).toBe("covered")
  })
  it("expired: the only matching training has lapsed", () => {
    const a = assessCompetency(
      [{ trainingName: "Hot Work Permit Training", expiresAt: "2025-01-01T00:00:00Z" }],
      "hot_work",
      NOW
    )
    expect(a.status).toBe("expired")
    expect(a.expiresAt).toBe("2025-01-01T00:00:00Z")
  })
  it("missing: no training matches the required keywords", () => {
    const a = assessCompetency([{ trainingName: "First Aid", expiresAt: null }], "excavation", NOW)
    expect(a.status).toBe("missing")
    expect(a.matchedName).toBeNull()
  })
  it("prefers a valid record over an expired one for the same type", () => {
    const a = assessCompetency(
      [
        { trainingName: "Lucru la înălțime", expiresAt: "2024-01-01T00:00:00Z" },
        { trainingName: "Curs înălțime avansat", expiresAt: "2028-01-01T00:00:00Z" },
      ],
      "working_at_height",
      NOW
    )
    expect(a.status).toBe("covered")
    expect(a.expiresAt).toBe("2028-01-01T00:00:00Z")
  })
})
