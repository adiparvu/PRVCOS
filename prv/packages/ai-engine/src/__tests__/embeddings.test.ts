import { describe, it, expect, vi, beforeEach, afterEach } from "vitest"
import { chunkText, embedTexts, isEmbeddingConfigured, EMBEDDING_DIM } from "../embeddings"

const fetchMock = vi.fn()

beforeEach(() => {
  vi.stubGlobal("fetch", fetchMock)
  vi.stubEnv("OPENAI_API_KEY", "sk-test")
  fetchMock.mockReset()
})
afterEach(() => {
  vi.unstubAllGlobals()
  vi.unstubAllEnvs()
})

function okResponse(vectors: number[][]) {
  return {
    ok: true,
    json: async () => ({ data: vectors.map((embedding, index) => ({ index, embedding })) }),
  }
}

const VEC = () => new Array(EMBEDDING_DIM).fill(0.1)

describe("chunkText", () => {
  it("returns a single chunk for short text", () => {
    expect(chunkText("Hello world")).toEqual([{ index: 0, content: "Hello world" }])
  })

  it("returns nothing for empty/whitespace input", () => {
    expect(chunkText("   \n\n  ")).toEqual([])
  })

  it("splits long text on paragraph boundaries with overlap", () => {
    const para = "a".repeat(900)
    const text = [para, para, para, para].join("\n\n")
    const chunks = chunkText(text, 2000, 100)
    expect(chunks.length).toBeGreaterThan(1)
    // overlap: the tail of chunk 0 reappears at the head of chunk 1
    const tail = chunks[0]!.content.slice(-50)
    expect(chunks[1]!.content).toContain(tail)
    expect(chunks.map((c) => c.index)).toEqual(chunks.map((_, i) => i))
  })

  it("hard-splits a single paragraph longer than maxChars", () => {
    const chunks = chunkText("x".repeat(5000), 1800, 200)
    expect(chunks.length).toBeGreaterThanOrEqual(3)
    for (const c of chunks) expect(c.content.length).toBeLessThanOrEqual(1800 + 200 + 2)
  })
})

describe("embedTexts", () => {
  it("throws when the provider is not configured", async () => {
    vi.stubEnv("OPENAI_API_KEY", "")
    expect(isEmbeddingConfigured()).toBe(false)
    await expect(embedTexts(["hi"])).rejects.toThrow(/not configured/)
    expect(fetchMock).not.toHaveBeenCalled()
  })

  it("redacts PII before the text leaves for the API", async () => {
    fetchMock.mockResolvedValue(okResponse([VEC()]))
    await embedTexts(["Contact maria@example.com for access"])
    const body = JSON.parse(fetchMock.mock.calls[0]![1].body as string)
    expect(body.input[0]).not.toContain("maria@example.com")
  })

  it("returns vectors in order and batches large inputs", async () => {
    const texts = Array.from({ length: 70 }, (_, i) => `text-${i}`)
    fetchMock.mockImplementation(async (_url, init) => {
      const batch = JSON.parse((init as RequestInit).body as string).input as string[]
      return okResponse(batch.map(() => VEC()))
    })
    const vectors = await embedTexts(texts)
    expect(vectors).toHaveLength(70)
    expect(fetchMock).toHaveBeenCalledTimes(2) // 64 + 6
  })

  it("throws with status detail on a non-2xx answer", async () => {
    fetchMock.mockResolvedValue({ ok: false, status: 429, text: async () => "rate limited" })
    await expect(embedTexts(["hi"])).rejects.toThrow(/429/)
  })

  it("rejects a wrong-dimension vector instead of writing it", async () => {
    fetchMock.mockResolvedValue(okResponse([[0.1, 0.2]]))
    await expect(embedTexts(["hi"])).rejects.toThrow(/dimension mismatch/)
  })
})
