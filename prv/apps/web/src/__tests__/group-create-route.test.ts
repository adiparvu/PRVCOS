import { describe, it, expect, vi, beforeEach } from "vitest"
import { slugify } from "@/app/(authenticated)/groups/CreateGroupSheet"

vi.mock("@/lib/with-gates", () => ({
  withGates: (_opts: unknown, handler: unknown) => handler,
}))

vi.mock("@prv/auth", () => ({
  writeAuditLog: vi.fn().mockResolvedValue(undefined),
  logSecurityEvent: vi.fn().mockResolvedValue(undefined),
  RoleSets: { admin: [] },
  hasScope: () => true,
}))

const queue: unknown[][] = []
const nextResult = () => (queue.length ? (queue.shift() ?? []) : [])
const mockDb = {
  insert: vi.fn().mockReturnThis(),
  values: vi.fn().mockReturnThis(),
  returning: vi.fn(() => Promise.resolve(nextResult())),
}
vi.mock("@prv/db/queries/group-kpis", () => ({ queryGroupKpis: vi.fn(async () => ({})) }))
vi.mock("@prv/db", () => ({ db: mockDb }))
vi.mock("@prv/db/schema", () => {
  const col = () => new Proxy({}, { get: () => ({}) })
  const mod: Record<string, unknown> = {}
  for (const t of ["companyGroups", "groupMemberships", "companies"]) mod[t] = col()
  return mod
})

const ctx = {
  session: { companyId: "company-1", userId: "user-1", sessionId: "session-1" },
  ipAddress: "127.0.0.1",
  userAgent: "test",
}
function postReq(body: unknown) {
  return {
    method: "POST",
    nextUrl: { pathname: "/api/groups", searchParams: new URLSearchParams() },
    url: "http://localhost/api/groups",
    headers: { get: () => null },
    json: async () => body,
  } as unknown as Request
}

describe("slugify", () => {
  it("lowercases, hyphenates and strips to the slug charset", () => {
    expect(slugify("PRV Group")).toBe("prv-group")
    expect(slugify("  Hello,  World!! ")).toBe("hello-world")
    expect(slugify("already-ok_1")).toBe("already-ok_1")
    expect(slugify("--Trim--Me--")).toBe("trim-me")
  })
})

describe("POST /api/groups", () => {
  beforeEach(() => {
    vi.clearAllMocks()
    queue.length = 0
    mockDb.insert.mockReturnThis()
    mockDb.values.mockReturnThis()
    mockDb.returning.mockImplementation(() => Promise.resolve(nextResult()))
  })

  it("returns 422 when name/slug are missing", async () => {
    const { POST } = await import("@/app/api/groups/route")
    const res = await POST(postReq({}), ctx)
    expect(res.status).toBe(422)
  })

  it("returns 422 for an invalid slug", async () => {
    const { POST } = await import("@/app/api/groups/route")
    const res = await POST(postReq({ name: "PRV Group", slug: "Bad Slug!" }), ctx)
    expect(res.status).toBe(422)
  })

  it("creates the group and returns 201 with id + slug", async () => {
    queue.push([{ id: "g1", slug: "prv-group" }])
    const { POST } = await import("@/app/api/groups/route")
    const res = await POST(postReq({ name: "PRV Group", slug: "prv-group" }), ctx)
    expect(res.status).toBe(201)
    const body = await res.json()
    expect(body).toEqual({ groupId: "g1", slug: "prv-group" })
  })
})
