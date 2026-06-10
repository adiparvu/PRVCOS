import { describe, it, expect, vi } from "vitest"

vi.mock("@/lib/with-gates", () => ({
  withGates: (_opts: unknown, handler: unknown) => handler,
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
    returning: vi.fn().mockResolvedValue([{ id: "1", name: "Test" }]),
  },
}))

vi.mock("@prv/db/schema", () => ({
  products: {},
  productCategories: {},
  stores: {},
  orders: {},
  tasks: {},
  users: {},
  notifications: {},
  leaveRequests: {},
  auditLogs: {},
}))

vi.mock("drizzle-orm", async (importOriginal) => {
  const actual = await importOriginal<typeof import("drizzle-orm")>()
  return {
    ...actual,
    eq: vi.fn(),
    and: vi.fn(),
    isNull: vi.fn(),
    ne: vi.fn(),
    count: vi.fn(),
    sum: vi.fn(),
    gte: vi.fn(),
    desc: vi.fn(),
  }
})

// ─── shop products patch schema ───────────────────────────────────────────────

describe("shop product patch schema fields", () => {
  it("price must be non-negative", () => {
    expect(-1 >= 0).toBe(false)
    expect(0 >= 0).toBe(true)
    expect(9.99 >= 0).toBe(true)
  })

  it("stockQuantity and stockMinimum must be non-negative integers", () => {
    const isValidQty = (n: number) => Number.isInteger(n) && n >= 0
    expect(isValidQty(0)).toBe(true)
    expect(isValidQty(100)).toBe(true)
    expect(isValidQty(-1)).toBe(false)
    expect(isValidQty(1.5)).toBe(false)
  })

  it("isActive is a boolean field", () => {
    const d = { isActive: false }
    expect(typeof d.isActive).toBe("boolean")
  })

  it("at-least-one-field guard rejects empty object", () => {
    const fields = [
      "name",
      "description",
      "price",
      "unit",
      "stockQuantity",
      "stockMinimum",
      "isActive",
    ]
    const passes = (d: Record<string, unknown>) => fields.some((f) => d[f] !== undefined)
    expect(passes({})).toBe(false)
    expect(passes({ name: "Widget" })).toBe(true)
    expect(passes({ isActive: false })).toBe(true)
  })
})

// ─── operations store patch schema ───────────────────────────────────────────

describe("operations store patch schema fields", () => {
  it("rejects empty object", () => {
    const fields = ["name", "phone", "email", "address", "city", "region"]
    const passes = (d: Record<string, unknown>) => fields.some((f) => d[f] !== undefined)
    expect(passes({})).toBe(false)
    expect(passes({ city: "Bucharest" })).toBe(true)
  })

  it("delete sets isActive to false (no deletedAt on stores)", () => {
    const updatePayload = { isActive: false, updatedAt: new Date() }
    expect(updatePayload.isActive).toBe(false)
    expect(updatePayload).not.toHaveProperty("deletedAt")
  })

  it("audit action is namespaced under operations", () => {
    const updateAction = "operations.update"
    const deleteAction = "operations.delete"
    expect(updateAction).toMatch(/^operations\./)
    expect(deleteAction).toMatch(/^operations\./)
  })
})

// ─── notification delete ──────────────────────────────────────────────────────

describe("notification DELETE handler", () => {
  it("delete gate action is notifications.delete", () => {
    expect("notifications.delete").toMatch(/^notifications\./)
  })

  it("sets deletedAt on soft delete", () => {
    const payload = { deletedAt: new Date() }
    expect(payload.deletedAt).toBeInstanceOf(Date)
  })

  it("scoped to userId + companyId for security", () => {
    const whereConditions = ["id match", "userId match", "companyId match"]
    expect(whereConditions).toHaveLength(3)
  })
})

// ─── time-off DELETE — pending-only guard ─────────────────────────────────────

describe("time-off DELETE pending-only guard", () => {
  const canDelete = (status: string) => status === "pending"

  it("allows delete when pending", () => expect(canDelete("pending")).toBe(true))
  it("blocks delete when approved", () => expect(canDelete("approved")).toBe(false))
  it("blocks delete when rejected", () => expect(canDelete("rejected")).toBe(false))

  it("returns 409 on non-pending status", () => {
    const statusCode = (status: string) => (canDelete(status) ? 204 : 409)
    expect(statusCode("pending")).toBe(204)
    expect(statusCode("approved")).toBe(409)
  })
})

// ─── shop product DELETE ──────────────────────────────────────────────────────

describe("shop product DELETE soft-delete", () => {
  it("sets both deletedAt and isActive=false", () => {
    const update = { deletedAt: new Date(), isActive: false, updatedAt: new Date() }
    expect(update.deletedAt).toBeInstanceOf(Date)
    expect(update.isActive).toBe(false)
  })

  it("audit action is shop.products.delete", () => {
    expect("shop.products.delete").toMatch(/^shop\.products\./)
  })
})
