import { describe, it, expect } from "vitest"
import {
  evaluateRetention,
  summarizeRetention,
  retentionMonthsFor,
  DEFAULT_RETENTION_MONTHS,
  type DocumentLike,
} from "@/lib/document-retention"

const NOW = Date.parse("2026-07-02T12:00:00Z")

function doc(o: Partial<DocumentLike>): DocumentLike {
  return {
    type: "report",
    createdAt: "2026-01-01T00:00:00Z",
    expiresAt: null,
    status: "published",
    legalHold: false,
    ...o,
  }
}

describe("retentionMonthsFor", () => {
  it("prefers a valid policy over the default", () => {
    expect(retentionMonthsFor("contract", { retentionMonths: 24, autoArchive: true })).toBe(24)
    expect(retentionMonthsFor("contract", undefined)).toBe(DEFAULT_RETENTION_MONTHS.contract)
    expect(retentionMonthsFor("contract", { retentionMonths: 0, autoArchive: true })).toBe(84)
  })
})

describe("evaluateRetention", () => {
  it("derives effective expiry from created + policy months when no explicit expiry", () => {
    const r = evaluateRetention(
      doc({ createdAt: "2026-01-15T00:00:00Z" }),
      { retentionMonths: 6, autoArchive: true },
      NOW
    )
    expect(r.effectiveExpiry).toBe("2026-07-15") // Jan 15 + 6mo
    expect(r.band).toBe("approaching_14") // 13 days out
  })

  it("uses explicit expiresAt over the policy", () => {
    const r = evaluateRetention(doc({ expiresAt: "2026-07-20T00:00:00Z" }), undefined, NOW)
    expect(r.effectiveExpiry).toBe("2026-07-20")
    expect(r.band).toBe("approaching_30")
  })

  it("marks past-due documents expired and eligible for archive + erasure", () => {
    const r = evaluateRetention(
      doc({ expiresAt: "2026-06-01T00:00:00Z", status: "published" }),
      { retentionMonths: 60, autoArchive: true },
      NOW
    )
    expect(r.band).toBe("expired")
    expect(r.daysUntilExpiry).toBeLessThan(0)
    expect(r.autoArchiveEligible).toBe(true)
    expect(r.gdprEraseEligible).toBe(true)
  })

  it("does not auto-archive an already-archived doc", () => {
    const r = evaluateRetention(
      doc({ expiresAt: "2026-06-01T00:00:00Z", status: "archived" }),
      { retentionMonths: 60, autoArchive: true },
      NOW
    )
    expect(r.autoArchiveEligible).toBe(false)
  })

  it("a legal hold overrides expiry — never archived or erased", () => {
    const r = evaluateRetention(
      doc({ expiresAt: "2020-01-01T00:00:00Z", legalHold: true }),
      { retentionMonths: 60, autoArchive: true },
      NOW
    )
    expect(r.band).toBe("on_hold")
    expect(r.autoArchiveEligible).toBe(false)
    expect(r.gdprEraseEligible).toBe(false)
  })

  it("classifies far-future documents as active", () => {
    expect(evaluateRetention(doc({ expiresAt: "2030-01-01T00:00:00Z" }), undefined, NOW).band).toBe(
      "active"
    )
  })
})

describe("summarizeRetention", () => {
  it("counts bands and archive eligibility", () => {
    const results = [
      evaluateRetention(
        doc({ expiresAt: "2026-06-01T00:00:00Z" }),
        { retentionMonths: 60, autoArchive: true },
        NOW
      ),
      evaluateRetention(doc({ expiresAt: "2026-07-10T00:00:00Z" }), undefined, NOW),
      evaluateRetention(
        doc({ expiresAt: "2020-01-01T00:00:00Z", legalHold: true }),
        undefined,
        NOW
      ),
      evaluateRetention(doc({ expiresAt: "2030-01-01T00:00:00Z" }), undefined, NOW),
    ]
    const s = summarizeRetention(results)
    expect(s.total).toBe(4)
    expect(s.expired).toBe(1)
    expect(s.approaching).toBe(1)
    expect(s.onHold).toBe(1)
    expect(s.autoArchiveEligible).toBe(1)
  })
})
