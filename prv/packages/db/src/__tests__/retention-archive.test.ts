import { describe, it, expect } from "vitest"
import {
  effectiveExpiryISO,
  daysUntilExpiry,
  isRetentionArchiveDue,
  type RetentionArchiveDoc,
} from "../queries/retention-archive"

const NOW = new Date("2026-07-20T12:00:00.000Z")

function doc(over: Partial<RetentionArchiveDoc> = {}): RetentionArchiveDoc {
  return {
    createdAt: new Date("2020-01-01T00:00:00.000Z"),
    expiresAt: null,
    status: "published",
    legalHold: false,
    ...over,
  }
}

describe("effectiveExpiryISO", () => {
  it("uses explicit expiresAt when present (date only)", () => {
    expect(effectiveExpiryISO(new Date("2020-01-01Z"), new Date("2026-03-15T09:00:00Z"), 60)).toBe(
      "2026-03-15"
    )
  })
  it("derives createdAt + retentionMonths when no expiresAt", () => {
    expect(effectiveExpiryISO(new Date("2020-01-10T00:00:00Z"), null, 12)).toBe("2021-01-10")
  })
})

describe("daysUntilExpiry", () => {
  it("negative once the effective expiry is past", () => {
    // created 2020-01-01 + 12 months = 2021-01-10-ish; well before NOW
    expect(daysUntilExpiry(doc({ createdAt: new Date("2020-01-01Z") }), 12, NOW)).toBeLessThan(0)
  })
  it("positive when expiry is in the future", () => {
    expect(daysUntilExpiry(doc({ expiresAt: new Date("2027-01-01Z") }), 60, NOW)).toBeGreaterThan(0)
  })
})

describe("isRetentionArchiveDue", () => {
  it("archives a long-expired, unheld, unarchived document", () => {
    expect(isRetentionArchiveDue(doc({ createdAt: new Date("2020-01-01Z") }), 12, NOW)).toBe(true)
  })
  it("never archives a legal-hold document, even if long expired", () => {
    expect(isRetentionArchiveDue(doc({ legalHold: true }), 12, NOW)).toBe(false)
  })
  it("skips an already-archived document (idempotent)", () => {
    expect(isRetentionArchiveDue(doc({ status: "archived" }), 12, NOW)).toBe(false)
  })
  it("does not archive before the effective expiry", () => {
    expect(isRetentionArchiveDue(doc({ expiresAt: new Date("2027-01-01Z") }), 60, NOW)).toBe(false)
  })
  it("respects explicit expiresAt over the derived one", () => {
    // created recently but explicit expiry in the past -> due
    expect(
      isRetentionArchiveDue(
        doc({ createdAt: new Date("2026-07-01Z"), expiresAt: new Date("2026-07-10Z") }),
        120,
        NOW
      )
    ).toBe(true)
  })
})
