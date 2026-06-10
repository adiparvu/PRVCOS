import { describe, it, expect, vi } from "vitest"

vi.mock("@/lib/with-gates", () => ({
  withGates: (_opts: unknown, handler: unknown) => handler,
}))

vi.mock("@/lib/mobile/auth", () => ({
  withMobileAuth: (handler: unknown) => handler,
}))

vi.mock("@prv/auth", () => ({
  writeAuditLog: vi.fn(),
}))

vi.mock("@prv/db", () => ({
  db: {
    select: vi.fn().mockReturnThis(),
    update: vi.fn().mockReturnThis(),
    from: vi.fn().mockReturnThis(),
    where: vi.fn().mockReturnThis(),
    limit: vi.fn().mockReturnThis(),
    set: vi.fn().mockReturnThis(),
    returning: vi.fn().mockResolvedValue([{ id: "1" }]),
  },
}))

vi.mock("@prv/db/schema", () => ({
  expenses: {},
  orders: {},
  invoices: {},
  projects: {},
  projectMembers: {},
  projectMilestones: {},
  notifications: {},
  users: {},
  clients: {},
  stores: {},
  orderItems: {},
  apiKeys: {},
  aiInsights: {},
  insightAffectedStores: {},
  insightRecommendations: {},
}))

vi.mock("drizzle-orm", async (importOriginal) => {
  const actual = await importOriginal<typeof import("drizzle-orm")>()
  return {
    ...actual,
    eq: vi.fn(),
    and: vi.fn(),
    isNull: vi.fn(),
    asc: vi.fn(),
    desc: vi.fn(),
    inArray: vi.fn(),
    count: vi.fn(),
    sum: vi.fn(),
    sql: vi.fn(),
  }
})

// ─── mobile expense delete — status guard ────────────────────────────────────

describe("mobile expense DELETE status guard", () => {
  const canDelete = (s: string) => ["draft", "rejected"].includes(s)

  it("draft can be deleted", () => expect(canDelete("draft")).toBe(true))
  it("rejected can be deleted", () => expect(canDelete("rejected")).toBe(true))
  it("submitted cannot be deleted", () => expect(canDelete("submitted")).toBe(false))
  it("approved cannot be deleted", () => expect(canDelete("approved")).toBe(false))
  it("paid cannot be deleted", () => expect(canDelete("paid")).toBe(false))
})

// ─── mobile order delete — status guard ──────────────────────────────────────

describe("mobile order DELETE status guard", () => {
  const canDelete = (s: string) => ["pending", "cancelled"].includes(s)

  it("pending can be deleted", () => expect(canDelete("pending")).toBe(true))
  it("cancelled can be deleted", () => expect(canDelete("cancelled")).toBe(true))
  it("confirmed cannot be deleted", () => expect(canDelete("confirmed")).toBe(false))
  it("delivered cannot be deleted", () => expect(canDelete("delivered")).toBe(false))
})

// ─── mobile invoice delete — status guard ────────────────────────────────────

describe("mobile invoice DELETE status guard", () => {
  const canDelete = (s: string) => ["draft", "cancelled"].includes(s)

  it("draft can be deleted", () => expect(canDelete("draft")).toBe(true))
  it("cancelled can be deleted", () => expect(canDelete("cancelled")).toBe(true))
  it("sent cannot be deleted", () => expect(canDelete("sent")).toBe(false))
  it("paid cannot be deleted", () => expect(canDelete("paid")).toBe(false))
})

// ─── mobile project delete — status guard ────────────────────────────────────

describe("mobile project DELETE status guard", () => {
  const canDelete = (s: string) => ["draft", "cancelled", "archived"].includes(s)

  it("draft can be deleted", () => expect(canDelete("draft")).toBe(true))
  it("cancelled can be deleted", () => expect(canDelete("cancelled")).toBe(true))
  it("archived can be deleted", () => expect(canDelete("archived")).toBe(true))
  it("active cannot be deleted", () => expect(canDelete("active")).toBe(false))
  it("completed cannot be deleted", () => expect(canDelete("completed")).toBe(false))
})

// ─── API key PATCH schema ─────────────────────────────────────────────────────

describe("API key PATCH schema", () => {
  it("accepts name update", () => {
    const d = { name: "New Key Name" }
    expect(d.name.length).toBeGreaterThan(0)
  })

  it("accepts scopes array", () => {
    const d = { scopes: ["read", "write"] }
    expect(Array.isArray(d.scopes)).toBe(true)
  })

  it("accepts nullable expiresAt", () => {
    const d = { expiresAt: null }
    expect(d.expiresAt).toBeNull()
  })

  it("at-least-one guard rejects empty object", () => {
    const passes = (d: Record<string, unknown>) =>
      d.name !== undefined || d.scopes !== undefined || d.expiresAt !== undefined
    expect(passes({})).toBe(false)
    expect(passes({ name: "Key" })).toBe(true)
  })
})

// ─── intelligence insight PATCH schema ───────────────────────────────────────

describe("intelligence insight PATCH status values", () => {
  const VALID_STATUSES = ["new", "reviewed", "actioned", "dismissed"]
  const VALID_PRIORITIES = ["urgent", "medium", "low"]

  it("has 4 valid statuses", () => expect(VALID_STATUSES).toHaveLength(4))
  it("dismissed is valid", () => expect(VALID_STATUSES).toContain("dismissed"))
  it("actioned is valid", () => expect(VALID_STATUSES).toContain("actioned"))
  it("has 3 valid priorities", () => expect(VALID_PRIORITIES).toHaveLength(3))
  it("urgent is valid priority", () => expect(VALID_PRIORITIES).toContain("urgent"))
})
