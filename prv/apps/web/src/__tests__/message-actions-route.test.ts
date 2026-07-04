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
  where: vi.fn().mockReturnThis(),
  limit: vi.fn().mockReturnThis(),
  update: vi.fn().mockReturnThis(),
  set: vi.fn().mockReturnThis(),
  returning: vi.fn().mockReturnThis(),
  then: (resolve: (v: unknown[]) => void) => resolve(nextResult()),
}
vi.mock("@prv/db", () => ({ db: mockDb }))
vi.mock("@prv/db/schema", () => {
  const col = () => new Proxy({}, { get: () => ({}) })
  return { channelMessages: col() }
})
vi.mock("drizzle-orm", async (importOriginal) => {
  const actual = await importOriginal<typeof import("drizzle-orm")>()
  return { ...actual, and: vi.fn(), eq: vi.fn() }
})

const ctx = {
  session: { companyId: "company-1", userId: "author-1", sessionId: "s1" },
  ipAddress: "127.0.0.1",
  userAgent: "test",
}
const CH = "cccccccc-cccc-cccc-cccc-cccccccccccc"
const MSG = "dddddddd-dddd-dddd-dddd-dddddddddddd"
function rq(method = "PATCH", body?: unknown) {
  const u = new URL(`http://localhost/api/communications/channels/${CH}/messages/${MSG}`)
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
  for (const m of ["select", "from", "where", "limit", "update", "set", "returning"] as const)
    mockDb[m].mockReturnThis()
}

describe("PATCH channel message", () => {
  beforeEach(reset)

  it("edits when the caller is the author", async () => {
    queue.push([{ id: MSG, userId: "author-1", reactions: {}, deletedAt: null }]) // load
    queue.push([{ id: MSG }]) // update returning
    const { PATCH } =
      await import("@/app/api/communications/channels/[id]/messages/[messageId]/route")
    const res = await PATCH(rq("PATCH", { action: "edit", content: "fixed text" }), ctx)
    expect(res.status).toBe(200)
    expect((await res.json()).edited).toBe(true)
    expect(auditSpy).toHaveBeenCalledTimes(1)
  })

  it("403s when a non-author tries to edit", async () => {
    queue.push([{ id: MSG, userId: "someone-else", reactions: {}, deletedAt: null }])
    const { PATCH } =
      await import("@/app/api/communications/channels/[id]/messages/[messageId]/route")
    const res = await PATCH(rq("PATCH", { action: "edit", content: "hack" }), ctx)
    expect(res.status).toBe(403)
    expect(mockDb.update).not.toHaveBeenCalled()
  })

  it("404s when the message is missing", async () => {
    queue.push([]) // load → none
    const { PATCH } =
      await import("@/app/api/communications/channels/[id]/messages/[messageId]/route")
    expect((await PATCH(rq("PATCH", { action: "edit", content: "x" }), ctx)).status).toBe(404)
  })

  it("409s when editing a deleted message", async () => {
    queue.push([{ id: MSG, userId: "author-1", reactions: {}, deletedAt: new Date() }])
    const { PATCH } =
      await import("@/app/api/communications/channels/[id]/messages/[messageId]/route")
    expect((await PATCH(rq("PATCH", { action: "edit", content: "x" }), ctx)).status).toBe(409)
  })

  it("reacts (any member) and returns the updated map", async () => {
    queue.push([{ id: MSG, userId: "someone-else", reactions: { "👍": 1 }, deletedAt: null }])
    queue.push([{ id: MSG }]) // update returning
    const { PATCH } =
      await import("@/app/api/communications/channels/[id]/messages/[messageId]/route")
    const res = await PATCH(rq("PATCH", { action: "react", emoji: "👍", op: "add" }), ctx)
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.reactions).toEqual({ "👍": 2 })
    // reactions map is passed to the update set
    const setArg = mockDb.set.mock.calls[0]![0] as { reactions: Record<string, number> }
    expect(setArg.reactions).toEqual({ "👍": 2 })
  })

  it("422s on an invalid action", async () => {
    const { PATCH } =
      await import("@/app/api/communications/channels/[id]/messages/[messageId]/route")
    expect((await PATCH(rq("PATCH", { action: "bogus" }), ctx)).status).toBe(422)
  })
})

describe("DELETE channel message", () => {
  beforeEach(reset)

  it("tombstones when the caller is the author", async () => {
    queue.push([{ id: MSG, userId: "author-1", reactions: {}, deletedAt: null }])
    queue.push([{ id: MSG }])
    const { DELETE } =
      await import("@/app/api/communications/channels/[id]/messages/[messageId]/route")
    const res = await DELETE(rq("DELETE"), ctx)
    expect(res.status).toBe(200)
    expect((await res.json()).deleted).toBe(true)
    const setArg = mockDb.set.mock.calls[0]![0] as { deletedAt: Date; content: string }
    expect(setArg.content).toBe("[message deleted]")
    expect(auditSpy).toHaveBeenCalledTimes(1)
  })

  it("403s for a non-author", async () => {
    queue.push([{ id: MSG, userId: "someone-else", reactions: {}, deletedAt: null }])
    const { DELETE } =
      await import("@/app/api/communications/channels/[id]/messages/[messageId]/route")
    expect((await DELETE(rq("DELETE"), ctx)).status).toBe(403)
    expect(mockDb.update).not.toHaveBeenCalled()
  })
})
