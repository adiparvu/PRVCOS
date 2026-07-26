import { describe, it, expect, vi, beforeEach } from "vitest"
import { NextRequest } from "next/server"

vi.mock("@/lib/with-gates", () => ({
  withGates: (_opts: unknown, handler: unknown) => handler,
}))

const embedQueryMock = vi.fn()
const isConfiguredMock = vi.fn()
vi.mock("@prv/ai-engine", () => ({
  embedQuery: (...a: unknown[]) => embedQueryMock(...a),
  isEmbeddingConfigured: () => isConfiguredMock(),
}))

const searchChunksMock = vi.fn()
vi.mock("@/lib/rag", () => ({
  searchChunks: (...a: unknown[]) => searchChunksMock(...a),
}))

const mockDb = {
  select: vi.fn().mockReturnThis(),
  from: vi.fn().mockReturnThis(),
  where: vi.fn().mockResolvedValue([{ id: "art-1", title: "Safety manual" }]),
}
vi.mock("@prv/db", () => ({ db: mockDb }))
vi.mock("@prv/db/schema", () => ({ knowledgeArticles: {} }))
vi.mock("drizzle-orm", async (importOriginal) => {
  const actual = await importOriginal<typeof import("drizzle-orm")>()
  return { ...actual, inArray: vi.fn() }
})

const ctx = {
  session: { companyId: "company-1", userId: "user-1", sessionId: "s1" },
  ipAddress: "127.0.0.1",
  userAgent: "test",
}

function makeReq(body: unknown): NextRequest {
  return {
    method: "POST",
    nextUrl: { pathname: "/api/knowledge/semantic-search" },
    headers: { get: () => null },
    json: async () => body,
  } as unknown as NextRequest
}

beforeEach(() => {
  vi.clearAllMocks()
  mockDb.select.mockReturnThis()
  mockDb.from.mockReturnThis()
  mockDb.where.mockResolvedValue([{ id: "art-1", title: "Safety manual" }])
  isConfiguredMock.mockReturnValue(true)
  embedQueryMock.mockResolvedValue([0.1, 0.2])
  searchChunksMock.mockResolvedValue([
    { sourceId: "art-1", chunkIndex: 0, content: "Wear a helmet on site.", similarity: 0.91 },
  ])
})

describe("POST /api/knowledge/semantic-search", () => {
  it("answers 200 with reason not_configured when embeddings are unprovisioned", async () => {
    isConfiguredMock.mockReturnValue(false)
    const { POST } = await import("@/app/api/knowledge/semantic-search/route")
    const res = await POST(makeReq({ query: "helmet rules" }), ctx)
    expect(res.status).toBe(200)
    expect(await res.json()).toEqual({ results: [], reason: "not_configured" })
    expect(embedQueryMock).not.toHaveBeenCalled()
  })

  it("searches company-scoped and joins article titles", async () => {
    const { POST } = await import("@/app/api/knowledge/semantic-search/route")
    const res = await POST(makeReq({ query: "helmet rules", limit: 3 }), ctx)
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.results[0]).toMatchObject({
      articleId: "art-1",
      articleTitle: "Safety manual",
      similarity: 0.91,
    })
    expect(searchChunksMock).toHaveBeenCalledWith("company-1", [0.1, 0.2], {
      k: 3,
      sourceType: "knowledge_article",
    })
  })

  it("rejects a too-short query with 422", async () => {
    const { POST } = await import("@/app/api/knowledge/semantic-search/route")
    const res = await POST(makeReq({ query: "a" }), ctx)
    expect(res.status).toBe(422)
  })
})
