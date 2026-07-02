import { describe, it, expect, vi, beforeEach } from "vitest"

vi.mock("@/lib/with-gates", () => ({
  withGates: (_opts: unknown, handler: unknown) => handler,
}))
const auditSpy = vi.fn().mockResolvedValue(undefined)
vi.mock("@prv/auth", () => ({ writeAuditLog: auditSpy, RoleSets: { admin: [] } }))

const queue: unknown[][] = []
const nextResult = () => (queue.length ? (queue.shift() ?? []) : [])
const mockDb = {
  select: vi.fn().mockReturnThis(),
  from: vi.fn().mockReturnThis(),
  leftJoin: vi.fn().mockReturnThis(),
  where: vi.fn().mockReturnThis(),
  orderBy: vi.fn().mockReturnThis(),
  limit: vi.fn().mockReturnThis(),
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
  for (const t of ["crmActivities", "clients", "users"]) mod[t] = col()
  return mod
})
vi.mock("drizzle-orm", async (importOriginal) => {
  const actual = await importOriginal<typeof import("drizzle-orm")>()
  return { ...actual, eq: vi.fn(), and: vi.fn(), desc: vi.fn() }
})

const ctx = {
  session: { companyId: "company-1", userId: "actor-1", sessionId: "s1" },
  ipAddress: "127.0.0.1",
  userAgent: "test",
}
const CLIENT = "11111111-1111-1111-1111-111111111111"
const ACT = "22222222-2222-2222-2222-222222222222"

function rq(url: string, method = "GET", body?: unknown) {
  const u = new URL(`http://localhost${url}`)
  return {
    method,
    nextUrl: { pathname: u.pathname, searchParams: u.searchParams },
    url: u.toString(),
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
    "limit",
    "insert",
    "values",
    "returning",
    "update",
    "set",
    "delete",
  ] as const)
    mockDb[m].mockReturnThis()
}

describe("crm activities collection", () => {
  beforeEach(reset)

  it("GET returns a grouped timeline with an open/overdue/done summary", async () => {
    const past = new Date("2026-01-01T00:00:00Z")
    const future = new Date("2100-01-01T00:00:00Z")
    queue.push([
      {
        id: "a1",
        clientId: CLIENT,
        clientName: "Popescu SRL",
        type: "call",
        subject: "Overdue call",
        notes: null,
        outcome: null,
        dueAt: past,
        completedAt: null,
        actorFirstName: "Ana",
        actorLastName: "Pop",
        createdAt: past,
      },
      {
        id: "a2",
        clientId: CLIENT,
        clientName: "Popescu SRL",
        type: "note",
        subject: "Logged note",
        notes: null,
        outcome: "Spoke with owner",
        dueAt: null,
        completedAt: past,
        actorFirstName: null,
        actorLastName: null,
        createdAt: past,
      },
      {
        id: "a3",
        clientId: CLIENT,
        clientName: "Popescu SRL",
        type: "meeting",
        subject: "Future meeting",
        notes: null,
        outcome: null,
        dueAt: future,
        completedAt: null,
        actorFirstName: null,
        actorLastName: null,
        createdAt: past,
      },
    ])
    const { GET } = await import("@/app/api/crm/activities/route")
    const res = await GET(rq("/api/crm/activities"), ctx)
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.meta).toMatchObject({ total: 3, open: 2, overdue: 1, done: 1 })
    // overdue sorts first, done last
    expect(body.activities[0].id).toBe("a1")
    expect(body.activities[body.activities.length - 1].id).toBe("a2")
    expect(body.activities[0].actor).toBe("Ana Pop")
  })

  it("POST creates an activity after verifying the client and audits", async () => {
    queue.push([{ id: CLIENT }]) // client lookup
    queue.push([{ id: ACT }]) // insert returning
    const { POST } = await import("@/app/api/crm/activities/route")
    const res = await POST(
      rq("/api/crm/activities", "POST", {
        clientId: CLIENT,
        type: "call",
        subject: "Follow up on quote",
      }),
      ctx
    )
    expect(res.status).toBe(201)
    expect((await res.json()).id).toBe(ACT)
    expect(mockDb.insert).toHaveBeenCalledTimes(1)
    expect(auditSpy).toHaveBeenCalledTimes(1)
  })

  it("POST 404s for a client outside the company", async () => {
    queue.push([]) // client lookup → none
    const { POST } = await import("@/app/api/crm/activities/route")
    const res = await POST(
      rq("/api/crm/activities", "POST", { clientId: CLIENT, type: "note", subject: "x" }),
      ctx
    )
    expect(res.status).toBe(404)
    expect(mockDb.insert).not.toHaveBeenCalled()
  })

  it("POST 422s on a missing subject", async () => {
    const { POST } = await import("@/app/api/crm/activities/route")
    const res = await POST(
      rq("/api/crm/activities", "POST", { clientId: CLIENT, type: "note" }),
      ctx
    )
    expect(res.status).toBe(422)
  })
})

describe("crm activity item", () => {
  beforeEach(reset)

  it("PATCH completes an activity and audits", async () => {
    queue.push([{ id: ACT, completedAt: new Date("2026-07-02T00:00:00Z") }])
    const { PATCH } = await import("@/app/api/crm/activities/[id]/route")
    const res = await PATCH(
      rq(`/api/crm/activities/${ACT}`, "PATCH", { completed: true, outcome: "Done" }),
      ctx
    )
    expect(res.status).toBe(200)
    expect(mockDb.update).toHaveBeenCalledTimes(1)
    expect(auditSpy).toHaveBeenCalledTimes(1)
  })

  it("PATCH 404s when the activity is missing", async () => {
    queue.push([]) // update returning → none
    const { PATCH } = await import("@/app/api/crm/activities/[id]/route")
    const res = await PATCH(rq(`/api/crm/activities/${ACT}`, "PATCH", { completed: true }), ctx)
    expect(res.status).toBe(404)
  })

  it("DELETE removes an activity and 404s when missing", async () => {
    queue.push([{ id: ACT }])
    const { DELETE } = await import("@/app/api/crm/activities/[id]/route")
    const ok = await DELETE(rq(`/api/crm/activities/${ACT}`, "DELETE"), ctx)
    expect(ok.status).toBe(200)

    reset()
    queue.push([])
    const { DELETE: D2 } = await import("@/app/api/crm/activities/[id]/route")
    const miss = await D2(rq(`/api/crm/activities/${ACT}`, "DELETE"), ctx)
    expect(miss.status).toBe(404)
  })
})
