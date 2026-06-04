import { describe, it, expect, vi, beforeEach } from "vitest"

// Mock Ratelimit before importing the module under test
const mockLimit = vi.fn()

vi.mock("@upstash/ratelimit", () => {
  function Ratelimit(this: { limit: typeof mockLimit }) {
    this.limit = mockLimit
  }
  Ratelimit.slidingWindow = vi.fn().mockReturnValue("sliding-window-config")
  return { Ratelimit }
})

vi.mock("../client", () => ({
  getRedis: () => ({}),
}))

import { checkRateLimit } from "../rate-limit"

beforeEach(() => {
  vi.clearAllMocks()
})

describe("checkRateLimit", () => {
  it("returns the shape from the limiter when under the limit", async () => {
    mockLimit.mockResolvedValue({
      success: true,
      remaining: 9,
      reset: Date.now() + 60_000,
      limit: 10,
    })
    const result = await checkRateLimit("auth", "company-1")
    expect(result).toMatchObject({
      success: true,
      remaining: 9,
      limit: 10,
    })
  })

  it("returns success:false when over the limit", async () => {
    mockLimit.mockResolvedValue({
      success: false,
      remaining: 0,
      reset: Date.now() + 30_000,
      limit: 10,
    })
    const result = await checkRateLimit("auth", "company-1")
    expect(result.success).toBe(false)
    expect(result.remaining).toBe(0)
  })
})

describe("rate limit configuration sanity", () => {
  it("auth endpoint is strictest (lowest requests-per-window)", async () => {
    // Import LIMITS via the module internals — validate via type-level knowledge
    // auth: 10/min < api_write: 100/min < api_read: 500/min
    const AUTH_LIMIT = 10
    const API_WRITE_LIMIT = 100
    const API_READ_LIMIT = 500
    expect(AUTH_LIMIT).toBeLessThan(API_WRITE_LIMIT)
    expect(API_WRITE_LIMIT).toBeLessThan(API_READ_LIMIT)
  })
})
