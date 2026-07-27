import { describe, it, expect, vi, beforeEach } from "vitest"

const queue: unknown[][] = []
const inserted: unknown[] = []
const mockDb = {
  select: vi.fn().mockReturnThis(),
  from: vi.fn().mockReturnThis(),
  where: vi.fn().mockReturnThis(),
  limit: vi.fn(() => (queue.length ? (queue.shift() ?? []) : [])),
  insert: vi.fn(() => ({ values: (v: unknown) => inserted.push(v) })),
}
vi.mock("@prv/db", () => ({ db: mockDb }))
vi.mock("@prv/db/schema", () => ({ clients: {}, notifications: {} }))
vi.mock("drizzle-orm", async (o) => {
  const actual = await o<typeof import("drizzle-orm")>()
  return { ...actual, eq: vi.fn() }
})

beforeEach(() => {
  vi.clearAllMocks()
  queue.length = 0
  inserted.length = 0
  for (const m of ["select", "from", "where"] as const) mockDb[m].mockReturnThis()
})

describe("notifyAccountManager", () => {
  it("stays silent when the client has no assigned account manager", async () => {
    queue.push([{ assignedUserId: null }])
    const { notifyAccountManager } = await import("@/lib/portal-staff-notify")
    const sent = await notifyAccountManager("co-1", "client-1", {
      title: "T",
      body: "B",
      entityType: "document",
      entityId: "d1",
      actionUrl: "/documents/d1",
    })
    expect(sent).toBe(false)
    expect(mockDb.insert).not.toHaveBeenCalled()
  })

  it("notifies the assigned manager with an in-app row", async () => {
    queue.push([{ assignedUserId: "mgr-1" }])
    const { notifyAccountManager } = await import("@/lib/portal-staff-notify")
    const sent = await notifyAccountManager("co-1", "client-1", {
      title: "Document nou de la client — de verificat",
      body: "B",
      entityType: "document",
      entityId: "d1",
      actionUrl: "/documents/d1",
    })
    expect(sent).toBe(true)
    const row = inserted[0] as Record<string, unknown>
    expect(row["userId"]).toBe("mgr-1")
    expect(row["companyId"]).toBe("co-1")
    expect(row["channel"]).toBe("in_app")
    expect(row["entityId"]).toBe("d1")
  })
})
