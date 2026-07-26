import { describe, it, expect, vi, beforeEach } from "vitest"
import { NextRequest } from "next/server"

vi.mock("@/lib/with-gates", () => ({
  withGates: (_opts: unknown, handler: unknown) => handler,
}))

vi.mock("@/lib/mobile/auth", () => ({
  withMobileAuth: (handler: unknown) => handler,
}))
vi.mock("@prv/auth", () => ({ writeAuditLog: vi.fn() }))

const isConfiguredMock = vi.fn()
vi.mock("@prv/ai-engine", () => ({
  isEmbeddingConfigured: () => isConfiguredMock(),
}))

const searchSemanticMock = vi.fn()
vi.mock("@/lib/rag", () => ({
  searchKnowledgeSemantic: (...a: unknown[]) => searchSemanticMock(...a),
}))

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

const RESULT = {
  articleId: "art-1",
  articleTitle: "Safety manual",
  chunkIndex: 0,
  excerpt: "Wear a helmet on site.",
  similarity: 0.91,
}

beforeEach(() => {
  vi.clearAllMocks()
  isConfiguredMock.mockReturnValue(true)
  searchSemanticMock.mockResolvedValue([RESULT])
})

describe("POST /api/knowledge/semantic-search", () => {
  it("answers 200 with reason not_configured when embeddings are unprovisioned", async () => {
    isConfiguredMock.mockReturnValue(false)
    const { POST } = await import("@/app/api/knowledge/semantic-search/route")
    const res = await POST(makeReq({ query: "helmet rules" }), ctx)
    expect(res.status).toBe(200)
    expect(await res.json()).toEqual({ results: [], reason: "not_configured" })
    expect(searchSemanticMock).not.toHaveBeenCalled()
  })

  it("delegates company-scoped to the shared handler", async () => {
    const { POST } = await import("@/app/api/knowledge/semantic-search/route")
    const res = await POST(makeReq({ query: "helmet rules", limit: 3 }), ctx)
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.results[0]).toMatchObject({ articleId: "art-1", articleTitle: "Safety manual" })
    expect(searchSemanticMock).toHaveBeenCalledWith("company-1", "helmet rules", 3)
  })

  it("rejects a too-short query with 422", async () => {
    const { POST } = await import("@/app/api/knowledge/semantic-search/route")
    const res = await POST(makeReq({ query: "a" }), ctx)
    expect(res.status).toBe(422)
  })
})

describe("POST /api/mobile/knowledge/semantic-search (mobile twin)", () => {
  const mobileCtx = { companyId: "company-1", userId: "user-1", sessionId: "s1" }

  it("uses the same shared handler with the mobile auth context", async () => {
    const { POST } = await import("@/app/api/mobile/knowledge/semantic-search/route")
    const res = await POST(makeReq({ query: "helmet rules" }), mobileCtx)
    expect(res.status).toBe(200)
    expect((await res.json()).results[0].articleId).toBe("art-1")
    expect(searchSemanticMock).toHaveBeenCalledWith("company-1", "helmet rules", 5)
  })

  it("reports not_configured without touching the handler", async () => {
    isConfiguredMock.mockReturnValue(false)
    const { POST } = await import("@/app/api/mobile/knowledge/semantic-search/route")
    const res = await POST(makeReq({ query: "helmet rules" }), mobileCtx)
    expect(await res.json()).toEqual({ results: [], reason: "not_configured" })
    expect(searchSemanticMock).not.toHaveBeenCalled()
  })

  it("audits the search", async () => {
    const { writeAuditLog } = await import("@prv/auth")
    const { POST } = await import("@/app/api/mobile/knowledge/semantic-search/route")
    await POST(makeReq({ query: "helmet rules" }), mobileCtx)
    expect(writeAuditLog).toHaveBeenCalledWith(
      expect.objectContaining({ action: "mobile.knowledge.semantic_search" })
    )
  })
})
