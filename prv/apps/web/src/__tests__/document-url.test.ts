import { describe, it, expect, vi, beforeEach } from "vitest"

const getSignedUrl = vi.fn()
vi.mock("@prv/db/storage", () => ({
  StorageBucket: { DOCUMENTS: "documents" },
  getSignedUrl: (...args: unknown[]) => getSignedUrl(...args),
}))

const { storagePathOf, resolveDocumentUrl, resolveDocumentUrls } =
  await import("../lib/document-url")

const STORED_URL =
  "https://ancnxpdhovgltasnxcha.supabase.co/storage/v1/object/public/documents/x.pdf"
const SIGNED_URL = "https://ancnxpdhovgltasnxcha.supabase.co/storage/v1/object/sign/documents/x.pdf"

beforeEach(() => {
  getSignedUrl.mockReset()
  getSignedUrl.mockResolvedValue(SIGNED_URL)
})

describe("storagePathOf", () => {
  it("reads the path recorded at upload time", () => {
    expect(storagePathOf({ storagePath: "co-1/documents/d-1/file.pdf" })).toBe(
      "co-1/documents/d-1/file.pdf"
    )
  })

  it("returns null for rows with no storage provenance", () => {
    expect(storagePathOf({})).toBeNull()
    expect(storagePathOf(null)).toBeNull()
    expect(storagePathOf(undefined)).toBeNull()
    expect(storagePathOf("co-1/x.pdf")).toBeNull()
    expect(storagePathOf({ storagePath: "" })).toBeNull()
    expect(storagePathOf({ storagePath: 42 })).toBeNull()
  })
})

describe("resolveDocumentUrl", () => {
  it("signs objects we stored ourselves — the public URL is dead on a private bucket", async () => {
    const url = await resolveDocumentUrl(STORED_URL, { storagePath: "co-1/documents/d-1/x.pdf" })

    expect(url).toBe(SIGNED_URL)
    expect(getSignedUrl).toHaveBeenCalledWith("documents", "co-1/documents/d-1/x.pdf", 900)
  })

  it("passes legacy staff rows through — an external URL is not ours to sign", async () => {
    const external = "https://storage.example.com/doc.pdf"

    expect(await resolveDocumentUrl(external, {})).toBe(external)
    expect(getSignedUrl).not.toHaveBeenCalled()
  })

  it("degrades to the stored URL when signing fails rather than breaking the page", async () => {
    getSignedUrl.mockRejectedValue(new Error("Storage signed URL error: object not found"))
    const spy = vi.spyOn(console, "error").mockImplementation(() => {})

    expect(await resolveDocumentUrl(STORED_URL, { storagePath: "co-1/x.pdf" })).toBe(STORED_URL)

    spy.mockRestore()
  })
})

describe("resolveDocumentUrls", () => {
  it("preserves row order across mixed signed and external rows", async () => {
    getSignedUrl.mockImplementation(async (_b: string, p: string) => `signed:${p}`)

    const urls = await resolveDocumentUrls([
      { fileUrl: "a", metadata: { storagePath: "p-a" } },
      { fileUrl: "https://external/b.pdf", metadata: {} },
      { fileUrl: "c", metadata: { storagePath: "p-c" } },
    ])

    expect(urls).toEqual(["signed:p-a", "https://external/b.pdf", "signed:p-c"])
  })
})
