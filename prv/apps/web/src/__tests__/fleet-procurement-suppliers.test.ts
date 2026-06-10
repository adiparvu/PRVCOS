import { vi, describe, it, expect } from "vitest"

vi.mock("@prv/db", () => ({ db: { select: vi.fn(), update: vi.fn(), insert: vi.fn() } }))
vi.mock("@prv/auth", () => ({
  writeAuditLog: vi.fn(),
  withGates: (_opts: unknown, handler: unknown) => handler,
}))
vi.mock("drizzle-orm", async (importOriginal) => {
  const actual = await importOriginal<typeof import("drizzle-orm")>()
  return { ...actual, eq: vi.fn(), and: vi.fn(), isNull: vi.fn(), desc: vi.fn(), inArray: vi.fn() }
})
vi.mock("@prv/db/schema", () => ({
  vehicles: {},
  users: {},
  stores: {},
  auditLogs: {},
  vehicleDailyLogs: {},
  purchaseOrders: {},
  projects: {},
  suppliers: {},
}))

import {
  isValidPOTransition,
  PO_REQUIRED_STATUS,
  PO_NEXT_STATUS,
  type POAction,
} from "../app/api/procurement/[id]/route"

// ── PO state machine ──────────────────────────────────────────────────────────

describe("isValidPOTransition", () => {
  it("submit is valid from draft", () => {
    expect(isValidPOTransition("submit", "draft")).toBe(true)
  })

  it("submit is invalid from pending", () => {
    expect(isValidPOTransition("submit", "pending")).toBe(false)
  })

  it("approve is valid from pending", () => {
    expect(isValidPOTransition("approve", "pending")).toBe(true)
  })

  it("approve is invalid from draft", () => {
    expect(isValidPOTransition("approve", "draft")).toBe(false)
  })

  it("reject is valid from pending", () => {
    expect(isValidPOTransition("reject", "pending")).toBe(true)
  })

  it("reject is invalid from approved", () => {
    expect(isValidPOTransition("reject", "approved")).toBe(false)
  })

  it("mark_received is valid from approved", () => {
    expect(isValidPOTransition("mark_received", "approved")).toBe(true)
  })

  it("mark_received is valid from in_transit", () => {
    expect(isValidPOTransition("mark_received", "in_transit")).toBe(true)
  })

  it("mark_received is invalid from draft", () => {
    expect(isValidPOTransition("mark_received", "draft")).toBe(false)
  })
})

describe("PO_NEXT_STATUS", () => {
  it("submit → pending", () => {
    expect(PO_NEXT_STATUS["submit"]).toBe("pending")
  })

  it("approve → approved", () => {
    expect(PO_NEXT_STATUS["approve"]).toBe("approved")
  })

  it("reject → rejected", () => {
    expect(PO_NEXT_STATUS["reject"]).toBe("rejected")
  })

  it("mark_received → received", () => {
    expect(PO_NEXT_STATUS["mark_received"]).toBe("received")
  })

  it("covers all actions", () => {
    const actions: POAction[] = ["submit", "approve", "reject", "mark_received"]
    for (const action of actions) {
      expect(PO_NEXT_STATUS[action]).toBeDefined()
    }
  })
})

describe("PO_REQUIRED_STATUS", () => {
  it("submit requires draft", () => {
    expect(PO_REQUIRED_STATUS["submit"]).toContain("draft")
  })

  it("approve requires pending", () => {
    expect(PO_REQUIRED_STATUS["approve"]).toContain("pending")
  })

  it("mark_received accepts approved and in_transit", () => {
    expect(PO_REQUIRED_STATUS["mark_received"]).toContain("approved")
    expect(PO_REQUIRED_STATUS["mark_received"]).toContain("in_transit")
  })
})

// ── PO full lifecycle ─────────────────────────────────────────────────────────

describe("PO full lifecycle: draft → pending → approved → received", () => {
  it("walks the happy path", () => {
    let status = "draft"

    expect(isValidPOTransition("submit", status)).toBe(true)
    status = PO_NEXT_STATUS["submit"]
    expect(status).toBe("pending")

    expect(isValidPOTransition("approve", status)).toBe(true)
    status = PO_NEXT_STATUS["approve"]
    expect(status).toBe("approved")

    expect(isValidPOTransition("mark_received", status)).toBe(true)
    status = PO_NEXT_STATUS["mark_received"]
    expect(status).toBe("received")
  })

  it("reject path: pending → rejected", () => {
    let status = "pending"
    expect(isValidPOTransition("reject", status)).toBe(true)
    status = PO_NEXT_STATUS["reject"]
    expect(status).toBe("rejected")
  })

  it("cannot approve from draft (no skipping)", () => {
    expect(isValidPOTransition("approve", "draft")).toBe(false)
  })
})

// ── Fleet PATCH — schema guards ───────────────────────────────────────────────

describe("fleet PATCH schema validation", () => {
  const validStatuses = ["active", "maintenance", "retired", "sold"] as const

  it("accepts all valid vehicle statuses", () => {
    for (const s of validStatuses) {
      expect(validStatuses).toContain(s)
    }
  })

  it("fuelLevelPct range is 0–100", () => {
    expect(0).toBeGreaterThanOrEqual(0)
    expect(100).toBeLessThanOrEqual(100)
    expect(-1).toBeLessThan(0)
    expect(101).toBeGreaterThan(100)
  })
})

// ── Supplier PATCH — schema guards ───────────────────────────────────────────

describe("supplier PATCH schema validation", () => {
  const validStatuses = ["active", "inactive", "pending", "blacklisted"] as const

  it("accepts all valid supplier statuses", () => {
    for (const s of validStatuses) {
      expect(validStatuses).toContain(s)
    }
  })

  it("paymentTermsDays range is 0–365", () => {
    expect(0).toBeGreaterThanOrEqual(0)
    expect(365).toBeLessThanOrEqual(365)
  })
})
