import { describe, it, expect, beforeEach, vi } from "vitest"
import { getSessionTTL, SessionTTL, CacheTTL, cacheKey } from "../client"
import type { SecurityLevel } from "../client"

describe("getSessionTTL", () => {
  it("returns 15 minutes for L5 (CEO-level)", () => {
    expect(getSessionTTL("L5")).toBe(900)
  })

  it("returns 30 minutes for L4 (Director-level)", () => {
    expect(getSessionTTL("L4")).toBe(1_800)
  })

  it("returns 4 hours for L3 (Manager-level)", () => {
    expect(getSessionTTL("L3")).toBe(14_400)
  })

  it("returns 8 hours for L2 (Worker-level)", () => {
    expect(getSessionTTL("L2")).toBe(28_800)
  })

  it("L5 TTL is strictly less than L2 TTL (higher security = shorter session)", () => {
    expect(SessionTTL.L5).toBeLessThan(SessionTTL.L2)
  })
})

describe("CacheTTL", () => {
  it("QUERY_SHORT < QUERY_MEDIUM < QUERY_LONG", () => {
    expect(CacheTTL.QUERY_SHORT).toBeLessThan(CacheTTL.QUERY_MEDIUM)
    expect(CacheTTL.QUERY_MEDIUM).toBeLessThan(CacheTTL.QUERY_LONG)
  })

  it("all values are positive integers", () => {
    for (const [, v] of Object.entries(CacheTTL)) {
      expect(v).toBeGreaterThan(0)
      expect(Number.isInteger(v)).toBe(true)
    }
  })
})

describe("cacheKey builders", () => {
  it("session key is stable", () => {
    const id = "abc-123"
    expect(cacheKey.session(id)).toBe(`session:${id}`)
  })

  it("userSessions key is stable", () => {
    const uid = "user-456"
    expect(cacheKey.userSessions(uid)).toBe(`user_sessions:${uid}`)
  })

  it("rateLimit key embeds all three parts", () => {
    const key = cacheKey.rateLimit("auth", "company-1", 1_700_000_000)
    expect(key).toContain("auth")
    expect(key).toContain("company-1")
    expect(key).toContain("1700000000")
  })

  it("different namespaces produce distinct query keys", () => {
    const k1 = cacheKey.query("users", "hash1")
    const k2 = cacheKey.query("products", "hash1")
    expect(k1).not.toBe(k2)
  })

  it("typesenseKey embeds companyId", () => {
    const key = cacheKey.typesenseKey("company-99")
    expect(key).toContain("company-99")
  })
})
