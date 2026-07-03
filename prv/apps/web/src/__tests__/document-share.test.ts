import { describe, it, expect } from "vitest"
import { shareStatus, isShareUsable, permissionAllows, summarizeShares } from "@/lib/document-share"

const NOW = Date.parse("2026-07-02T12:00:00Z")

describe("shareStatus", () => {
  it("revoked wins over everything", () => {
    expect(
      shareStatus({ revokedAt: "2026-07-01T00:00:00Z", expiresAt: "2030-01-01T00:00:00Z" }, NOW)
    ).toBe("revoked")
  })
  it("is expired when past expiry and not revoked", () => {
    expect(shareStatus({ revokedAt: null, expiresAt: "2026-06-01T00:00:00Z" }, NOW)).toBe("expired")
  })
  it("is active when future expiry or no expiry", () => {
    expect(shareStatus({ revokedAt: null, expiresAt: "2030-01-01T00:00:00Z" }, NOW)).toBe("active")
    expect(shareStatus({ revokedAt: null, expiresAt: null }, NOW)).toBe("active")
    expect(isShareUsable({ revokedAt: null, expiresAt: null }, NOW)).toBe(true)
    expect(isShareUsable({ revokedAt: "x", expiresAt: null }, NOW)).toBe(false)
  })
})

describe("permissionAllows", () => {
  it("higher permission grants everything below", () => {
    expect(permissionAllows("manage", "view")).toBe(true)
    expect(permissionAllows("download", "download")).toBe(true)
    expect(permissionAllows("view", "download")).toBe(false)
    expect(permissionAllows("edit", "manage")).toBe(false)
  })
})

describe("summarizeShares", () => {
  it("counts by status and external scope", () => {
    const s = summarizeShares(
      [
        { scope: "internal", revokedAt: null, expiresAt: null }, // active
        { scope: "external", revokedAt: null, expiresAt: "2030-01-01T00:00:00Z" }, // active external
        { scope: "external", revokedAt: null, expiresAt: "2026-06-01T00:00:00Z" }, // expired external
        { scope: "internal", revokedAt: "2026-06-15T00:00:00Z", expiresAt: null }, // revoked
      ],
      NOW
    )
    expect(s.total).toBe(4)
    expect(s.active).toBe(2)
    expect(s.external).toBe(2)
    expect(s.expired).toBe(1)
    expect(s.revoked).toBe(1)
  })
})
