import { describe, it, expect } from "vitest"
import { computeDocumentStorage } from "@/lib/document-storage"

function doc(
  type: string,
  status: string,
  fileSizeBytes: string | null,
  opts: { legalHold?: boolean; isPublic?: boolean } = {}
) {
  return {
    type: type as never,
    status: status as never,
    fileSizeBytes,
    legalHold: opts.legalHold ?? false,
    isPublic: opts.isPublic ?? false,
  }
}

describe("computeDocumentStorage", () => {
  it("returns zeros for an empty library", () => {
    const s = computeDocumentStorage([])
    expect(s.total).toBe(0)
    expect(s.totalBytes).toBe(0)
    expect(s.avgBytes).toBe(0)
    expect(s.byType).toEqual([])
  })

  it("totals count and bytes and computes the average", () => {
    const s = computeDocumentStorage([
      doc("contract", "signed", "1000"),
      doc("report", "published", "3000"),
    ])
    expect(s.total).toBe(2)
    expect(s.totalBytes).toBe(4000)
    expect(s.avgBytes).toBe(2000)
  })

  it("parses invalid/null sizes as zero", () => {
    const s = computeDocumentStorage([
      doc("other", "draft", null),
      doc("other", "draft", "not-a-number"),
    ])
    expect(s.totalBytes).toBe(0)
  })

  it("breaks down by type with count and bytes, largest first", () => {
    const s = computeDocumentStorage([
      doc("photo", "published", "500"),
      doc("photo", "published", "700"),
      doc("contract", "signed", "2000"),
    ])
    expect(s.byType[0]).toEqual({ type: "photo", count: 2, bytes: 1200 })
    expect(s.byType[1]).toEqual({ type: "contract", count: 1, bytes: 2000 })
  })

  it("counts the status mix, legal holds and public docs", () => {
    const s = computeDocumentStorage([
      doc("contract", "signed", "10", { legalHold: true }),
      doc("report", "archived", "10", { isPublic: true }),
      doc("report", "draft", "10"),
    ])
    expect(s.byStatus.signed).toBe(1)
    expect(s.byStatus.archived).toBe(1)
    expect(s.byStatus.draft).toBe(1)
    expect(s.legalHold).toBe(1)
    expect(s.publicCount).toBe(1)
    expect(s.archived).toBe(1)
  })
})
