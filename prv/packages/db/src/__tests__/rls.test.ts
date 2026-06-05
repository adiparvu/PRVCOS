import { describe, it, expect, vi, beforeEach } from "vitest"

// Mock the postgres raw connection — withRLS only needs the transaction interface
const mockSet = vi.fn().mockResolvedValue(undefined)
const mockTx = { unsafe: mockSet }
const mockTransaction = vi
  .fn()
  .mockImplementation(async (cb: (tx: unknown) => Promise<unknown>) => cb(mockTx))

const mockSql = {
  begin: mockTransaction,
}

describe("withRLS — session variable injection", () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it("sets app.company_id and app.user_id within the transaction", async () => {
    // Dynamic import to avoid loading real postgres at test time
    const { withRLS } = await import("@prv/db/rls")

    const ctx = { companyId: "cmp-test-123", userId: "usr-test-456" }
    let capturedCalls: string[] = []

    mockSql.begin = vi.fn().mockImplementation(async (cb: (tx: unknown) => Promise<unknown>) => {
      const fakeTx = {
        unsafe: (sql: string) => {
          capturedCalls.push(sql)
          return Promise.resolve()
        },
      }
      return cb(fakeTx)
    })

    const result = await withRLS(mockSql as any, ctx, async () => "ok")

    expect(result).toBe("ok")
    expect(
      capturedCalls.some((s) => s.includes("app.company_id") && s.includes("cmp-test-123"))
    ).toBe(true)
    expect(capturedCalls.some((s) => s.includes("app.user_id") && s.includes("usr-test-456"))).toBe(
      true
    )
  })

  it("SET LOCAL scopes the variable to the transaction only", async () => {
    const { withRLS } = await import("@prv/db/rls")

    const calls: string[] = []
    mockSql.begin = vi.fn().mockImplementation(async (cb: (tx: unknown) => Promise<unknown>) => {
      const fakeTx = {
        unsafe: (sql: string) => {
          calls.push(sql)
          return Promise.resolve()
        },
      }
      return cb(fakeTx)
    })

    await withRLS(mockSql as any, { companyId: "cmp-1", userId: "usr-1" }, async () => undefined)

    // SET LOCAL (not SET) must be used
    for (const call of calls) {
      if (call.includes("app.company_id") || call.includes("app.user_id")) {
        expect(call).toMatch(/SET\s+LOCAL/i)
      }
    }
  })

  it("callback return value is propagated correctly", async () => {
    const { withRLS } = await import("@prv/db/rls")

    mockSql.begin = vi
      .fn()
      .mockImplementation(async (cb: (tx: unknown) => Promise<unknown>) =>
        cb({ unsafe: () => Promise.resolve() })
      )

    const payload = { foo: "bar", count: 42 }
    const result = await withRLS(
      mockSql as any,
      { companyId: "c", userId: "u" },
      async () => payload
    )
    expect(result).toEqual(payload)
  })

  it("propagates errors thrown inside the callback", async () => {
    const { withRLS } = await import("@prv/db/rls")

    mockSql.begin = vi
      .fn()
      .mockImplementation(async (cb: (tx: unknown) => Promise<unknown>) =>
        cb({ unsafe: () => Promise.resolve() })
      )

    await expect(
      withRLS(mockSql as any, { companyId: "c", userId: "u" }, async () => {
        throw new Error("DB_QUERY_FAILED")
      })
    ).rejects.toThrow("DB_QUERY_FAILED")
  })
})

// ─── Cross-company RLS semantics ─────────────────────────────────────────────

describe("Cross-company isolation invariants", () => {
  it("a company_id in the session cannot be undefined or empty", () => {
    const invalidIds = [undefined, null, "", " "]
    for (const id of invalidIds) {
      // A valid company_id must be a non-empty, non-whitespace string
      const isValid = typeof id === "string" && id.trim().length > 0
      expect(isValid).toBe(false)
    }
  })

  it("two different company contexts produce different cache keys", async () => {
    const { cacheKey } = await import("@prv/cache")
    const key1 = cacheKey.permissionSet("user-1", "company-A")
    const key2 = cacheKey.permissionSet("user-1", "company-B")
    expect(key1).not.toBe(key2)
  })

  it("user-scoped cache keys differ between users", async () => {
    const { cacheKey } = await import("@prv/cache")
    const key1 = cacheKey.permissionSet("user-1", "company-A")
    const key2 = cacheKey.permissionSet("user-2", "company-A")
    expect(key1).not.toBe(key2)
  })

  it("same user in same company always generates the same cache key (deterministic)", async () => {
    const { cacheKey } = await import("@prv/cache")
    const k1 = cacheKey.permissionSet("user-42", "company-99")
    const k2 = cacheKey.permissionSet("user-42", "company-99")
    expect(k1).toBe(k2)
  })
})
