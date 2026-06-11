import { describe, it, expect, vi, beforeEach } from "vitest"

vi.mock("@/lib/with-gates", () => ({
  withGates: (_opts: unknown, handler: unknown) => handler,
}))

vi.mock("@prv/auth", () => ({
  writeAuditLog: vi.fn(),
  RoleSets: { admin: [], management: [] },
  hasScope: vi.fn().mockReturnValue(true),
}))

const mockDb = {
  select: vi.fn().mockReturnThis(),
  insert: vi.fn().mockReturnThis(),
  update: vi.fn().mockReturnThis(),
  delete: vi.fn().mockReturnThis(),
  from: vi.fn().mockReturnThis(),
  where: vi.fn().mockReturnThis(),
  limit: vi.fn().mockResolvedValue([]),
  values: vi.fn().mockReturnThis(),
  set: vi.fn().mockReturnThis(),
  returning: vi.fn().mockResolvedValue([]),
  onConflictDoUpdate: vi.fn().mockReturnThis(),
  onConflictDoNothing: vi.fn().mockReturnThis(),
}

vi.mock("@prv/db", () => ({ db: mockDb }))

vi.mock("@prv/db/schema", () => ({
  notificationPreferences: {},
  productReviews: {},
}))

vi.mock("drizzle-orm", async (importOriginal) => {
  const actual = await importOriginal<typeof import("drizzle-orm")>()
  return {
    ...actual,
    eq: vi.fn(),
    and: vi.fn(),
    isNull: vi.fn(),
    sql: vi.fn().mockReturnValue({}),
  }
})

const webCtx = {
  session: {
    companyId: "company-1",
    userId: "user-1",
    sessionId: "session-1",
    role: "admin",
    scopeLevel: 9,
  },
  ipAddress: "127.0.0.1",
  userAgent: "test",
}

function makeReq(path: string, method = "GET", body: Record<string, unknown> = {}): Request {
  return {
    method,
    url: `http://localhost${path}`,
    nextUrl: { pathname: path },
    headers: { get: () => null },
    json: async () => body,
    signal: { addEventListener: vi.fn() },
  } as unknown as Request
}

function resetMocks() {
  vi.clearAllMocks()
  mockDb.select.mockReturnThis()
  mockDb.insert.mockReturnThis()
  mockDb.update.mockReturnThis()
  mockDb.delete.mockReturnThis()
  mockDb.from.mockReturnThis()
  mockDb.where.mockReturnThis()
  mockDb.limit.mockResolvedValue([])
  mockDb.values.mockReturnThis()
  mockDb.set.mockReturnThis()
  mockDb.returning.mockResolvedValue([])
  mockDb.onConflictDoUpdate.mockReturnThis()
  mockDb.onConflictDoNothing.mockReturnThis()
}

// ─── Notification Preferences ────────────────────────────────────────────────

describe("GET /api/notifications/preferences", () => {
  beforeEach(resetMocks)

  it("returns DB row when preferences exist", async () => {
    const now = new Date()
    mockDb.limit.mockResolvedValueOnce([
      {
        inApp: true,
        push: false,
        email: true,
        sms: false,
        quietHoursStart: "22:00",
        quietHoursEnd: "07:00",
        updatedAt: now,
      },
    ])

    const { GET } = await import("@/app/api/notifications/preferences/route")
    const res = await GET(makeReq("/api/notifications/preferences"), webCtx as never)
    const data = await res.json()

    expect(res.status).toBe(200)
    expect(data.preferences.push).toBe(false)
    expect(data.preferences.quietHoursStart).toBe("22:00")
    expect(data.preferences.quietHoursEnd).toBe("07:00")
  })

  it("returns default preferences when no row exists", async () => {
    // mockDb.limit already returns [] by default
    const { GET } = await import("@/app/api/notifications/preferences/route")
    const res = await GET(makeReq("/api/notifications/preferences"), webCtx as never)
    const data = await res.json()

    expect(res.status).toBe(200)
    expect(data.preferences.inApp).toBe(true)
    expect(data.preferences.email).toBe(true)
    expect(data.preferences.sms).toBe(false)
    expect(data.preferences.quietHoursStart).toBeNull()
  })
})

describe("PATCH /api/notifications/preferences", () => {
  beforeEach(resetMocks)

  it("upserts and returns updated preferences", async () => {
    const now = new Date()
    mockDb.returning.mockResolvedValueOnce([
      {
        id: "pref-1",
        inApp: true,
        push: false,
        email: true,
        sms: false,
        quietHoursStart: "23:00",
        quietHoursEnd: "08:00",
        updatedAt: now,
      },
    ])

    const { PATCH } = await import("@/app/api/notifications/preferences/route")
    const res = await PATCH(
      makeReq("/api/notifications/preferences", "PATCH", {
        push: false,
        quietHoursStart: "23:00",
        quietHoursEnd: "08:00",
      }),
      webCtx as never
    )
    const data = await res.json()

    expect(res.status).toBe(200)
    expect(data.preferences.push).toBe(false)
    expect(data.preferences.quietHoursStart).toBe("23:00")

    const { writeAuditLog } = await import("@prv/auth")
    expect(writeAuditLog).toHaveBeenCalledWith(
      expect.objectContaining({ action: "notifications.preferences.update" })
    )
  })

  it("returns 400 for invalid quietHoursStart format", async () => {
    const { PATCH } = await import("@/app/api/notifications/preferences/route")
    const res = await PATCH(
      makeReq("/api/notifications/preferences", "PATCH", { quietHoursStart: "25:99" }),
      webCtx as never
    )
    expect(res.status).toBe(400)
    const data = await res.json()
    expect(data.error).toMatch(/quietHoursStart/)
  })

  it("returns 400 for invalid quietHoursEnd format", async () => {
    const { PATCH } = await import("@/app/api/notifications/preferences/route")
    const res = await PATCH(
      makeReq("/api/notifications/preferences", "PATCH", { quietHoursEnd: "7am" }),
      webCtx as never
    )
    expect(res.status).toBe(400)
    const data = await res.json()
    expect(data.error).toMatch(/quietHoursEnd/)
  })

  it("accepts null to clear quiet hours", async () => {
    const now = new Date()
    mockDb.returning.mockResolvedValueOnce([
      {
        id: "pref-1",
        inApp: true,
        push: true,
        email: true,
        sms: false,
        quietHoursStart: null,
        quietHoursEnd: null,
        updatedAt: now,
      },
    ])

    const { PATCH } = await import("@/app/api/notifications/preferences/route")
    const res = await PATCH(
      makeReq("/api/notifications/preferences", "PATCH", {
        quietHoursStart: null,
        quietHoursEnd: null,
      }),
      webCtx as never
    )
    const data = await res.json()

    expect(res.status).toBe(200)
    expect(data.preferences.quietHoursStart).toBeNull()
    expect(data.preferences.quietHoursEnd).toBeNull()
  })

  it("returns 500 on DB failure", async () => {
    mockDb.returning.mockResolvedValueOnce([]) // upsert returns nothing

    const { PATCH } = await import("@/app/api/notifications/preferences/route")
    const res = await PATCH(
      makeReq("/api/notifications/preferences", "PATCH", { email: false }),
      webCtx as never
    )
    expect(res.status).toBe(500)
  })
})

// ─── Review Helpful Vote ──────────────────────────────────────────────────────

describe("PATCH /api/shop/reviews/[id]/helpful", () => {
  beforeEach(resetMocks)

  it("increments helpfulCount and returns updated value", async () => {
    mockDb.returning.mockResolvedValueOnce([{ id: "rev-1", helpfulCount: 7 }])

    const { PATCH } = await import("@/app/api/shop/reviews/[id]/helpful/route")
    const res = await PATCH(makeReq("/api/shop/reviews/rev-1/helpful", "PATCH"), webCtx as never)
    const data = await res.json()

    expect(res.status).toBe(200)
    expect(data.helpfulCount).toBe(7)

    const { writeAuditLog } = await import("@prv/auth")
    expect(writeAuditLog).toHaveBeenCalledWith(
      expect.objectContaining({
        action: "shop.reviews.helpful",
        entityType: "product_review",
        entityId: "rev-1",
      })
    )
  })

  it("returns 404 when review id resolves to a non-existent entity", async () => {
    // In production Next.js enforces non-empty [id]; here the DB update matches nothing
    mockDb.returning.mockResolvedValueOnce([])
    const { PATCH } = await import("@/app/api/shop/reviews/[id]/helpful/route")
    const res = await PATCH(
      makeReq("/api/shop/reviews/does-not-exist/helpful", "PATCH"),
      webCtx as never
    )
    expect(res.status).toBe(404)
  })

  it("returns 404 when review not found or not approved", async () => {
    mockDb.returning.mockResolvedValueOnce([]) // update matched nothing

    const { PATCH } = await import("@/app/api/shop/reviews/[id]/helpful/route")
    const res = await PATCH(
      makeReq("/api/shop/reviews/rev-ghost/helpful", "PATCH"),
      webCtx as never
    )
    expect(res.status).toBe(404)
  })
})
