import { describe, it, expect } from "vitest"
import {
  normalizeChecklistItems,
  computeInspectionScore,
  missingRequiredPhotos,
  isChecklistResult,
} from "@/lib/inspection-checklist"

describe("normalizeChecklistItems", () => {
  it("keeps labelled items and coerces weight/flags", () => {
    expect(
      normalizeChecklistItems([
        { label: "  Guardrails  ", weight: 3, critical: true, requirePhoto: true },
        { label: "Signage", weight: 0 },
      ])
    ).toEqual([
      { label: "Guardrails", weight: 3, requirePhoto: true, critical: true },
      { label: "Signage", weight: 1, requirePhoto: false, critical: false },
    ])
  })
  it("drops untitled items and non-arrays", () => {
    expect(normalizeChecklistItems([{ weight: 2 }, "x", null])).toEqual([])
    expect(normalizeChecklistItems("nope")).toEqual([])
  })
  it("clamps an absurd weight", () => {
    expect(normalizeChecklistItems([{ label: "A", weight: 9999 }])[0]!.weight).toBe(100)
  })
})

describe("computeInspectionScore", () => {
  it("excludes na from the denominator and sums pass weight", () => {
    const s = computeInspectionScore([
      { weight: 2, critical: false, result: "pass" },
      { weight: 3, critical: true, result: "fail" },
      { weight: 5, critical: false, result: "na" },
      { weight: 1, critical: false, result: "pass" },
    ])
    expect(s.score).toBe(3) // 2 + 1
    expect(s.maxScore).toBe(6) // 2 + 3 + 1 (na excluded)
    expect(s.passRate).toBe(50)
    expect(s.failedItems).toBe(1)
    expect(s.failedCritical).toBe(true)
  })
  it("is 0% with all-na (no scorable items)", () => {
    const s = computeInspectionScore([{ weight: 2, critical: false, result: "na" }])
    expect(s.maxScore).toBe(0)
    expect(s.passRate).toBe(0)
    expect(s.failedCritical).toBe(false)
  })
})

describe("missingRequiredPhotos", () => {
  it("flags failed items that require a photo but have none", () => {
    expect(
      missingRequiredPhotos([
        { requirePhoto: true, result: "fail", photoUrl: null, label: "Scaffold" },
        { requirePhoto: true, result: "fail", photoUrl: "u", label: "Ladder" },
        { requirePhoto: true, result: "pass", photoUrl: null, label: "Helmet" },
        { requirePhoto: false, result: "fail", photoUrl: null, label: "Sign" },
      ])
    ).toEqual(["Scaffold"])
  })
})

describe("isChecklistResult", () => {
  it("guards known results", () => {
    expect(isChecklistResult("pass")).toBe(true)
    expect(isChecklistResult("maybe")).toBe(false)
  })
})
