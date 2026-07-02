import { describe, it, expect, vi, beforeEach } from "vitest"

vi.mock("@/lib/with-gates", () => ({
  withGates: (_opts: unknown, handler: unknown) => handler,
}))
const auditSpy = vi.fn().mockResolvedValue(undefined)
vi.mock("@prv/auth", () => ({ writeAuditLog: auditSpy, RoleSets: { admin: [] } }))
// alias() is imported from drizzle-orm/pg-core by the list route; stub it.
vi.mock("drizzle-orm/pg-core", () => ({ alias: (t: unknown) => t }))

const queue: unknown[][] = []
const nextResult = () => (queue.length ? (queue.shift() ?? []) : [])
const mockDb = {
  select: vi.fn().mockReturnThis(),
  from: vi.fn().mockReturnThis(),
  leftJoin: vi.fn().mockReturnThis(),
  where: vi.fn().mockReturnThis(),
  orderBy: vi.fn().mockReturnThis(),
  insert: vi.fn().mockReturnThis(),
  values: vi.fn().mockReturnThis(),
  returning: vi.fn().mockReturnThis(),
  update: vi.fn().mockReturnThis(),
  set: vi.fn().mockReturnThis(),
  delete: vi.fn().mockReturnThis(),
  then: (resolve: (v: unknown[]) => void) => resolve(nextResult()),
}
vi.mock("@prv/db", () => ({ db: mockDb }))
vi.mock("@prv/db/schema", () => {
  const col = () => new Proxy({}, { get: () => ({}) })
  const mod: Record<string, unknown> = {}
  for (const t of ["equipmentAssignments", "users"]) mod[t] = col()
  return mod
})
vi.mock("drizzle-orm", async (importOriginal) => {
  const actual = await importOriginal<typeof import("drizzle-orm")>()
  return { ...actual, eq: vi.fn(), and: vi.fn(), desc: vi.fn() }
})

const ctx = {
  session: { companyId: "company-1", userId: "user-1", sessionId: "s1" },
  ipAddress: "127.0.0.1",
  userAgent: "test",
}
function listReq(qs = "") {
  return {
    method: "GET",
    nextUrl: { pathname: "/api/workforce/equipment", searchParams: new URLSearchParams(qs) },
    url: `http://localhost/api/workforce/equipment?${qs}`,
    headers: { get: () => null },
  } as unknown as Request
}
function postReq(body: unknown) {
  return {
    method: "POST",
    nextUrl: { pathname: "/api/workforce/equipment", searchParams: new URLSearchParams() },
    url: "http://localhost/api/workforce/equipment",
    json: async () => body,
    headers: { get: () => null },
  } as unknown as Request
}
function patchReq(id: string, body: unknown) {
  return {
    method: "PATCH",
    nextUrl: { pathname: `/api/workforce/equipment/${id}`, searchParams: new URLSearchParams() },
    url: `http://localhost/api/workforce/equipment/${id}`,
    json: async () => body,
    headers: { get: () => null },
  } as unknown as Request
}
function reset() {
  vi.clearAllMocks()
  queue.length = 0
  for (const m of [
    "select",
    "from",
    "leftJoin",
    "where",
    "orderBy",
    "insert",
    "values",
    "returning",
    "update",
    "set",
    "delete",
  ] as const)
    mockDb[m].mockReturnThis()
}

describe("/api/workforce/equipment", () => {
  beforeEach(reset)

  it("GET flags overdue items and summarizes the register", async () => {
    queue.push([
      {
        id: "e1",
        userId: "u1",
        equipmentType: "Hammer drill",
        label: "Hilti TE 6",
        serialNumber: "4471-A22",
        assignedDate: "2020-06-12",
        expectedReturnDate: "2020-06-30", // long past → overdue
        returnedDate: null,
        condition: "good",
        returnCondition: null,
        status: "assigned",
        notes: null,
        firstName: "Andrei",
        lastName: "Dinu",
        assignerFirst: "Maria",
        assignerLast: "Pop",
      },
      {
        id: "e2",
        userId: "u2",
        equipmentType: "Saw",
        label: null,
        serialNumber: null,
        assignedDate: "2020-04-10",
        expectedReturnDate: null,
        returnedDate: "2020-05-28",
        condition: "good",
        returnCondition: "fair",
        status: "returned",
        notes: null,
        firstName: "Radu",
        lastName: "Gheorghe",
        assignerFirst: null,
        assignerLast: null,
      },
    ])
    const { GET } = await import("@/app/api/workforce/equipment/route")
    const res = await GET(listReq(), ctx)
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.items[0]).toMatchObject({
      id: "e1",
      overdue: true,
      userName: "Andrei Dinu",
      assignedByName: "Maria Pop",
    })
    expect(body.items[1].overdue).toBe(false)
    expect(body.meta).toEqual({ total: 2, assigned: 1, overdue: 1, returned: 1 })
  })

  it("POST assigns equipment and audit-logs it", async () => {
    queue.push([{ id: "e-new" }])
    const { POST } = await import("@/app/api/workforce/equipment/route")
    const res = await POST(
      postReq({
        userId: "11111111-1111-1111-1111-111111111111",
        equipmentType: "Laptop",
        assignedDate: "2026-07-01",
      }),
      ctx
    )
    expect(res.status).toBe(201)
    expect(auditSpy).toHaveBeenCalledTimes(1)
  })

  it("POST rejects a missing equipment type with 422", async () => {
    const { POST } = await import("@/app/api/workforce/equipment/route")
    const res = await POST(
      postReq({ userId: "11111111-1111-1111-1111-111111111111", assignedDate: "2026-07-01" }),
      ctx
    )
    expect(res.status).toBe(422)
    expect(mockDb.insert).not.toHaveBeenCalled()
  })

  it("PATCH marks an item returned", async () => {
    queue.push([{ id: "e1", status: "returned" }])
    const { PATCH } = await import("@/app/api/workforce/equipment/[id]/route")
    const res = await PATCH(patchReq("e1", { status: "returned" }), ctx)
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.status).toBe("returned")
    expect(mockDb.update).toHaveBeenCalledTimes(1)
  })

  it("PATCH 404s for an unknown assignment", async () => {
    queue.push([]) // update returning → none
    const { PATCH } = await import("@/app/api/workforce/equipment/[id]/route")
    const res = await PATCH(patchReq("missing", { status: "lost" }), ctx)
    expect(res.status).toBe(404)
  })
})
