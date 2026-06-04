import { describe, it, expect } from "vitest"
import {
  paginationSchema,
  paginatedResult,
  cursorPaginationSchema,
  MAX_PAGE_SIZE,
} from "../pagination"

describe("paginationSchema", () => {
  it("defaults to page 1, limit 20", () => {
    const result = paginationSchema.parse({})
    expect(result).toEqual({ page: 1, limit: 20 })
  })

  it("coerces string inputs", () => {
    const result = paginationSchema.parse({ page: "3", limit: "50" })
    expect(result).toEqual({ page: 3, limit: 50 })
  })

  it("rejects page < 1", () => {
    expect(paginationSchema.safeParse({ page: 0 }).success).toBe(false)
  })

  it(`rejects limit > ${MAX_PAGE_SIZE}`, () => {
    expect(paginationSchema.safeParse({ limit: MAX_PAGE_SIZE + 1 }).success).toBe(false)
  })

  it("accepts limit equal to MAX_PAGE_SIZE", () => {
    expect(paginationSchema.safeParse({ limit: MAX_PAGE_SIZE }).success).toBe(true)
  })
})

describe("paginatedResult", () => {
  it("computes totalPages correctly", () => {
    const result = paginatedResult([1, 2, 3], 25, 1, 10)
    expect(result.totalPages).toBe(3)
  })

  it("hasNextPage is true when not on last page", () => {
    const result = paginatedResult([], 100, 1, 10)
    expect(result.hasNextPage).toBe(true)
  })

  it("hasNextPage is false on last page", () => {
    const result = paginatedResult([], 100, 10, 10)
    expect(result.hasNextPage).toBe(false)
  })

  it("hasPrevPage is false on first page", () => {
    const result = paginatedResult([], 50, 1, 10)
    expect(result.hasPrevPage).toBe(false)
  })

  it("hasPrevPage is true on page > 1", () => {
    const result = paginatedResult([], 50, 2, 10)
    expect(result.hasPrevPage).toBe(true)
  })

  it("handles exact division without extra page", () => {
    const result = paginatedResult([], 20, 2, 10)
    expect(result.totalPages).toBe(2)
    expect(result.hasNextPage).toBe(false)
  })

  it("returns passed items array unchanged", () => {
    const items = [{ id: 1 }, { id: 2 }]
    const result = paginatedResult(items, 2, 1, 10)
    expect(result.items).toBe(items)
  })
})

describe("cursorPaginationSchema", () => {
  it("defaults to limit 20, direction forward, no cursor", () => {
    const result = cursorPaginationSchema.parse({})
    expect(result).toEqual({ limit: 20, direction: "forward", cursor: undefined })
  })

  it("accepts backward direction", () => {
    const result = cursorPaginationSchema.parse({ direction: "backward" })
    expect(result.direction).toBe("backward")
  })
})
