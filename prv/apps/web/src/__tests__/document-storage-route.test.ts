import { describe, it, expect, vi, beforeEach } from "vitest"

vi.mock("@/lib/with-gates", () => ({
  withGates: (_opts: unknown, handler: unknown) => handler,
}))
vi.mock("@prv/auth", () => ({ writeAuditLog: vi.fn(), RoleSets: { admin: [] } }))

const queue: unknown[][] = []
const nextResult = () => (queue.length ? (queue.shift() ?? []) : [])
const mockDb = {
  select: vi.fn().mockReturnThis(),
  from: vi.fn().mockReturnThis(),
  where: vi.fn((..._a: unknown[]) => Promise.resolve(nextResult())),
}
vi.mock("@prv/db", () => ({ db: mockDb }))
vi.mock("@prv/db/schema", () => {
  const col = () => new Proxy({}, { get: () => ({}) })
  return { documents: col() }
})
vi.mock("drizzle-orm", async (importOriginal) => {
  const actual = await importOriginal<typeof import("drizzle-orm")>()
  return { ...actual, and: vi.fn(), eq: vi.fn(), isNull: vi.fn() }
})

const ctx = {
  session: { companyId: "company-1", userId: "user-9", sessionId: "s1" },
  ipAddress: "127.0.0.1",
  userAgent: "test",
}
function rq() {
  return {
    method: "GET",
    url: "http://localhost/api/analytics/document-storage",
    nextUrl: { pathname: "/api/analytics/document-storage" },
    headers: { get: () => null },
  } as unknown as Request
}
function reset() {
  vi.clearAllMocks()
  queue.length = 0
  for (const m of ["select", "from"] as const) mockDb[m].mockReturnThis()
  mockDb.where.mockImplementation(() => Promise.resolve(nextResult()))
}

describe("GET /api/analytics/document-storage", () => {
  beforeEach(reset)

  it("aggregates the document library into a storage view", async () => {
    queue.push([
      {
        type: "contract",
        status: "signed",
        fileSizeBytes: "1000",
        legalHold: true,
        isPublic: false,
      },
      {
        type: "photo",
        status: "published",
        fileSizeBytes: "500",
        legalHold: false,
        isPublic: true,
      },
      {
        type: "photo",
        status: "published",
        fileSizeBytes: "700",
        legalHold: false,
        isPublic: false,
      },
    ])
    const { GET } = await import("@/app/api/analytics/document-storage/route")
    const res = await GET(rq(), ctx)
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.total).toBe(3)
    expect(body.totalBytes).toBe(2200)
    expect(body.legalHold).toBe(1)
    expect(body.publicCount).toBe(1)
    expect(body.byType[0].type).toBe("photo") // 2 photos
    expect(body.byType[0].bytes).toBe(1200)
  })

  it("handles an empty library", async () => {
    queue.push([])
    const { GET } = await import("@/app/api/analytics/document-storage/route")
    const body = await (await GET(rq(), ctx)).json()
    expect(body.total).toBe(0)
    expect(body.avgBytes).toBe(0)
  })
})
